import { ExcelFileHandler } from "../base/fileUtils.js";
import { MESSAGES } from "../base/enums.js";
import { addShopSelectors } from "./shopScrapingUtils.js";
import { normalizeUrl } from "../base/scrapingUtils.js";
import {
  progressBar,
  startSpinner,
  stopSpinner,
} from "../base/terminalUtils.js";

// Initialize CSV file writer
const shop_details = new ExcelFileHandler("resources/csv/shop_details.csv");

/**
 * Scrapes business entries from a given Google Maps URLs.
 *
 * @param {BrowserContext} context - The Playwright browser context used to create a new page.
 * @param {string} url - The URL to scrape for Google Maps links.
 *
 * @returns {Promise<string[]>} - A promise that resolves to an array of unique Google Maps URLs found on the page.
 */
async function scrapeGoogleShopUrl(browserContext, url) {
  const page = await browserContext.newPage();
  let spinner;

  try {
    // Attempt to navigate to the URL
    await page.goto(url);

    spinner = startSpinner("Looking for urls");

    // Wait for the selector to appear (with a timeout)
    await page.waitForSelector('[role="feed"]', { timeout: 10000 });

    let endOfListText = false;
    const scrollStart = Date.now();

    while (!endOfListText) {
      // Throw an error if scrolling takes more than 30 secondes (probably hung)
      if (Date.now() - scrollStart > process.env.MAX_SCROLL_DURATION) {
        throw new Error(
          MESSAGES.ERROR_SCROLL_TIMEOUT(process.env.MAX_SCROLL_DURATION)
        );
      }

      // Scroll to the bottom to load more items
      await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        if (feed) {
          feed.scrollTo(0, feed.scrollHeight);
        }
      });

      // Check if the "end of list" message is present
      try {
        endOfListText = await page.$eval("body", (body) =>
          body.innerText.includes("You've reached the end of the list")
        );
      } catch (error) {
        endOfListText = false;
      }
    }

    // Scrape page for URLs
    const rawUrls = await page.$$eval("a", (links) =>
      links
        .map((link) => link.href)
        .filter((href) => href.startsWith("https://www.google.com/maps/place/"))
    );

    // Remove duplicate URLs using a Set
    const urls = Array.from(new Set(rawUrls));

    stopSpinner(spinner, `Found ${urls.length} URLs!`);
    return urls;
  } catch (error) {
    // Handle any unknown errors that occur during the process
    console.error(`\n ${error}`);
    stopSpinner(spinner, "Stopping the process");

    // Exit the process with a failure code
    process.exit(1); // Exit with status code 1 to indicate an error
  } finally {
    await page.close(); // Close the page regardless of success or failure
  }
}

/**
 * Scrapes shop details from a list of Google Maps URLs using a shared browser context.
 * For each shop, it gathers name, category, phone, website, reviews, and additional data from the shop's website.
 * Failed shops and missing website details are tracked for reporting.
 * A small delay is used between iterations to avoid throttling.
 *
 * @param {BrowserContext} browserContext - The Playwright browser context to use for all pages.
 * @param {string[]} urls - An array of Google Maps URLs representing individual shop pages.
 */
async function scrapeGoogleShopDetails(browserContext, urls) {
  const noWebsite = []; // Shop names with no website information
  const allShopDetails = []; // Shop details collected from scraping
  const failedGoogleShops = []; // Failed Google shop URLs and details

  // Loops over all URLs, processing them in batches
  for (let i = 0; i < urls.length; i += process.env.BATCH_SIZE) {
    const batch = urls.slice(i, i + process.env.BATCH_SIZE); // Get a slice of URLs for the current batch

    // Runs scraping for each URL in the batch using Promise.all
    const results = await Promise.all(
      batch.map(async (url, batchIndex) => {
        const index = i + batchIndex; // Calculates the global index of the current URL
        const page = await browserContext.newPage();
        await addShopSelectors(page); // Add custom selectors

        try {
          // Initialize the progress bar only on the first iteration
          if (index === 0) {
            progressBar(index, urls.length);
          }

          // Navigate to the shop URL
          await page.goto(url);

          // Scrape shop details (name, category, phone, etc.)
          const name = await page.getShopName();
          const category = await page.getShopCategory();
          const phone = await page.getShopPhone();
          const website = await page.getShopWebsite();
          const stars = await page.getShopStars();
          const reviewCount = await page.getShopReviewCount();

          // Default extra details if no website is found
          let extraDetails = {
            email: MESSAGES.NO_WEB,
            sellsOnline: MESSAGES.NO_WEB,
            fishingReport: MESSAGES.NO_WEB,
            socialMedia: MESSAGES.NO_WEB,
          };

          // If a website is found, scrape additional details from it
          if (website === MESSAGES.NO_WEB) {
            noWebsite.push(name); // Add shop name to noWebsite list if no website is available
          } else {
            extraDetails = await scrapeWebsite(page, website); // Scrape details from the shop's website
          }

          // Construct an object to hold all shop details (keys will be used as Excel headers)
          const shopDetails = {
            Index: index + 1,
            Name: name,
            Category: category,
            Phone: phone,
            Email: extraDetails.email,
            "Has Website": website !== MESSAGES.NO_WEB,
            Website: website,
            "Sells Online": extraDetails.sellsOnline,
            Rating: `${stars}/5`,
            Reviews: reviewCount,
            "Has Report": extraDetails.fishingReport,
            Socials: extraDetails.socialMedia,
          };

          // Return successful result with shop details
          return { success: true, shopDetails, index };
        } catch (err) {
          // In case of an error, return failure result with error message
          return { success: false, url, error: err.message };
        } finally {
          // Wait a bit before closing the page to avoid overloading the server
          await page.waitForTimeout(250);
          await page.close(); // Close the browser page after scraping
        }
      })
    );

    // Process each result from the current batch
    for (const result of results) {
      if (result.success) {
        // If scraping succeeded, add the shop details to the allShopDetails array
        allShopDetails.push(result.shopDetails);
        progressBar(result.index + 1, urls.length); // Update the progress bar with the current index
      } else {
        // If scraping failed, log the URL and error message to the failedGoogleShops array
        failedGoogleShops.push({ url: result.url, error: result.error });
      }
    }
  }

  // Write all successfully scraped shop details to a CSV file
  await shop_details.write(allShopDetails);

  // Print out details of shops with missing website or failed to scrape
  printMissingDetails(noWebsite, failedGoogleShops, failedWebsites);
}

/**
 * Scrapes data from a given website using a Playwright page instance.
 * Attempts to collect information such as whether the site sells online,
 * publishes fishing reports, links to social media, and displays an email address.
 * Handles partial failures gracefully and records full-page load failures.
 *
 * @param {object} page - The Playwright Page instance used for navigation and scraping.
 * @param {string} url - The URL of the website to scrape.
 * @returns {Promise<object>} - An object containing the scraped data or error messages.
 */
const failedWebsites = [];
const scrapedWebsiteCache = new Map(); // URL => result object
async function scrapeWebsite(page, url) {
  const normalizedUrl = normalizeUrl(url);
  if (scrapedWebsiteCache.has(normalizedUrl)) {
    return scrapedWebsiteCache.get(normalizedUrl); // return cached result
  }

  const details = {};

  try {
    // Navigate to the given URL, with a 12-second timeout
    const response = await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 12000,
    });

    // Check if response is blocked or forbidden and return early
    const status = response?.status();
    if (status === 403 || status === 429) {
      details.email = MESSAGES.ERROR_BLOCKED_FORBIDDEN(status);
      details.sellsOnline = MESSAGES.ERROR_BLOCKED_FORBIDDEN(status);
      details.fishingReport = MESSAGES.ERROR_BLOCKED_FORBIDDEN(status);
      details.socialMedia = MESSAGES.ERROR_BLOCKED_FORBIDDEN(status);
      scrapedWebsiteCache.set(normalizedUrl, details);

      failedWebsites.push({
        normalizedUrl,
        error: MESSAGES.ERROR_BLOCKED_FORBIDDEN(status),
      });
      return details;
    }

    // Wait briefly to allow dynamic content (e.g., JS-loaded) to render
    await page.waitForTimeout(1500);

    // Attempt to scrape details
    details.sellsOnline = await page.hasOnlineShop();
    details.fishingReport = await page.publishesFishingReport();
    details.socialMedia = await page.getSocialMedia();
    details.email = await page.getEmail();
  } catch (err) {
    // Log the failed attempt for further inspection
    details.sellsOnline = MESSAGES.ERROR_LOAD_FAILED;
    details.fishingReport = MESSAGES.ERROR_LOAD_FAILED;
    details.socialMedia = MESSAGES.ERROR_LOAD_FAILED;
    details.email = MESSAGES.ERROR_LOAD_FAILED;

    failedWebsites.push({ normalizedUrl, error: err.message });
  }

  scrapedWebsiteCache.set(normalizedUrl, details); // cache the result
  return details; // Return all collected details (with error messages if applicable)
}

/**
 * Prints a summary of missing or failed website data to the console.
 * It handles three types of issues:
 *  - Shops without a website
 *  - Google URL scraping failures
 *  - Website scraping failures after a successful URL load
 *
 * @param {string[]} noWebsite - List of shop names that do not have websites.
 * @param {{ url: string, error: string }[]} failedGoogleShops - List of shops where the Google URL fetch failed.
 * @param {{ url: string, error: string }[]} failedWebsites - List of websites that failed during detailed scraping.
 */
function printMissingDetails(noWebsite, failedGoogleShops, failedWebsites) {
  // Print shops that had no website at all
  if (noWebsite.length > 0) {
    console.log(`\n${noWebsite.length} Shops without websites`);
    for (const [index, shop] of noWebsite.entries()) {
      console.log(`\t${index + 1}. ${shop}`);
    }
  }

  // Print shops whose URLs couldn't be scraped from Google
  if (failedGoogleShops.length > 0) {
    console.log(`\n${failedGoogleShops.length} Failed Google URLs`);
    for (const { url, error } of failedGoogleShops) {
      console.log(`\tFailed to load ${url}\n\t${error}`);
    }
  }

  // Print shops that had a website but failed during scraping
  if (failedWebsites.length > 0) {
    console.log(`\n${failedWebsites.length} Failed Websites`);
    for (const { url, error } of failedWebsites) {
      console.log(`\tFailed to load ${url}\n\t${error}`);
    }
  }
}

export { scrapeGoogleShopUrl, scrapeGoogleShopDetails };
