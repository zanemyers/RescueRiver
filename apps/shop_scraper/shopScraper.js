import "dotenv/config";
import { getJson } from "serpapi";
import { PromisePool } from "@supercharge/promise-pool";

import { FALLBACK_DETAILS } from "../base/constants/index.js";
import { addShopSelectors, buildCacheFileRows, buildShopRows } from "./shopUtils.js";
import { ExcelFileHandler, normalizeUrl, StealthBrowser } from "../base/index.js";

/**
 * Executes the complete shop scraping workflow:
 *
 * 1. Retrieves shop search results from SerpAPI or cached data.
 * 2. Scrapes additional details from each shop's website.
 * 3. Writes the aggregated shop data into an Excel file.
 *
 * @param {Object} searchParams - Configuration and filters for the shop search.
 * @param {Function} progressUpdate - Optional callback function to receive progress/status updates.
 * @param {Function} returnFile - Optional callback to receive the final Excel file buffer.
 * @param {Object} cancelToken - Optional cancellation token with a `throwIfCancelled()` method to abort execution.
 *
 * @returns {Promise<void>} Resolves when scraping completes successfully, is cancelled, or encounters an error.
 */
export async function shopScraper({
  searchParams,
  progressUpdate = () => {},
  returnFile = () => {},
  cancelToken = { throwIfCancelled: () => {} }, // default to no-op if not provided
}) {
  const shopWriter = new ExcelFileHandler("media/xlsx/shop_details.xlsx");
  const browser = new StealthBrowser({
    headless: process.env.RUN_HEADLESS !== "false",
  });

  try {
    cancelToken.throwIfCancelled();
    progressUpdate("Searching for shops...");
    const shops = await fetchShops(searchParams, progressUpdate, returnFile, cancelToken);
    progressUpdate(`STATUS:✅ Found ${shops.length} shops.`);

    cancelToken.throwIfCancelled();
    await browser.launch();
    const shopDetails = await getDetails(browser, shops, progressUpdate, cancelToken);

    cancelToken.throwIfCancelled();
    progressUpdate("📝 Writing shop data to Excel...");
    const rows = buildShopRows(shops, shopDetails);
    await shopWriter.write(rows);
    progressUpdate("STATUS:✅ Excel file created.");
    progressUpdate(`DOWNLOAD:shop_details.xlsx`);
    returnFile(await shopWriter.getBuffer());
  } catch (err) {
    if (err.isCancelled) {
      progressUpdate(err.message);
    } else {
      progressUpdate(`❌ Error: ${err.message || err}`);
    }
  } finally {
    await browser.close();
  }
}

/**
 * Fetches a list of shops near the specified location using SerpAPI's Google Maps engine.
 * If a cached Excel file buffer is provided, loads and returns shops from the cache instead.
 *
 * @param {Object} searchParams - Parameters controlling the search, including:
 *   - query: Search query string for the shop type or name.
 *   - lat: Latitude coordinate for location.
 *   - lng: Longitude coordinate for location.
 *   - maxResults: Maximum number of shop results to fetch.
 *   - fileBuffer: Optional Excel file buffer with cached shop data.
 * @param {Function} progressUpdate - Callback to report progress/status messages.
 * @param {Function} returnFile - Callback to return the cached or generated Excel file buffer.
 * @param {Object} cancelToken - Cancellation token with a `throwIfCancelled()` method to abort execution.
 *
 * @returns {Promise<Object[]>} Resolves to an array of shop result objects, or an empty array if none found.
 */
async function fetchShops(searchParams, progressUpdate, returnFile, cancelToken) {
  const cacheFileHandler = new ExcelFileHandler();

  // If a cached Excel buffer is provided, load and return cached shop data
  if (searchParams?.fileBuffer) {
    await cacheFileHandler.loadBuffer(searchParams.fileBuffer);
    return await cacheFileHandler.read();
  }

  const results = [];

  // Fetch shop results in pages of 20, up to maxResults
  for (let start = 0; start < (+searchParams.maxResults || 100); start += 20) {
    cancelToken.throwIfCancelled();

    const data = await getJson({
      engine: "google_maps",
      q: searchParams.query,
      ll: `@${searchParams.lat},${searchParams.lng},10z`,
      start,
      type: "search",
      api_key: process.env.SERP_API_KEY, // TODO: use searchParams.apiKey instead
    });

    const pageResults = data?.local_results || [];
    results.push(...pageResults);

    // Stop fetching if fewer than 20 results are returned (last page)
    if (pageResults.length < 20) break;
  }

  // If any results found, write them to cache file and provide download
  if (results.length > 0) {
    await cacheFileHandler.write(buildCacheFileRows(results));
    progressUpdate(`DOWNLOAD:simple_shop_details.xlsx`);
    returnFile(await cacheFileHandler.getBuffer());
  }

  return results;
}

/**
 * Scrapes additional business details from each shop's website using Playwright.
 *
 * Shops are processed in parallel with controlled concurrency to avoid overwhelming
 * system resources or triggering anti-bot protections.
 *
 * @param {Object} browser - Playwright browser instance to create new pages.
 * @param {Array<object>} shops - Array of shop objects to process.
 * @param {Function} [progressUpdate] - Optional callback function to send real-time progress updates.
 * @param {Object} cancelToken - Cancellation token with a `throwIfCancelled()` method to support graceful cancellation.
 *
 * @returns {Promise<Array<object>>} Resolves to an array of shop detail objects, one per shop,
 *   with fallback values used when scraping fails or no website is provided.
 */
async function getDetails(browser, shops, progressUpdate = () => {}, cancelToken) {
  const websiteCache = new Map(); // Stores previously scraped website details
  const results = new Array(shops.length);
  let completed = 0;

  const messageTemplate = (done) => `Scraping shops (${done}/${shops.length})`;
  progressUpdate(messageTemplate(completed));

  await PromisePool.withConcurrency(parseInt(process.env.CONCURRENCY, 10) || 5)
    .for(shops)
    .process(async (shop, index) => {
      if (!shop.website) {
        results[index] = FALLBACK_DETAILS.NONE;
      } else {
        cancelToken.throwIfCancelled();
        const page = await addShopSelectors(await browser.newPage());
        try {
          results[index] = await scrapeWebsite(websiteCache, page, shop.website, cancelToken);
        } catch (err) {
          if (!err.isCancelled) {
            console.warn(`⚠️ Failed to get details for ${shop.title}`, err);
            results[index] = FALLBACK_DETAILS.ERROR;
          } else {
            throw err; // Bubble-up
          }
        } finally {
          await page.close(); // Close the page after scraping attempt
        }
      }

      ++completed;
      progressUpdate("STATUS:" + messageTemplate(completed));
    });

  progressUpdate("STATUS:✅ Scraping Complete");

  return results;
}

/**
 * Scrapes useful business-related data from a shop’s website using Playwright.
 *
 * If available, cached results are used to avoid redundant requests.
 * Handles blocked access or errors by returning predefined fallback values.
 *
 * @param {Map<string, object>} websiteCache - Cache map storing scraped results keyed by normalized URL.
 * @param {Page} page - Playwright Page instance for navigating and scraping the website.
 * @param {string} url - Raw URL of the shop’s website to be scraped.
 * @param {Object} cancelToken - Cancellation token with a `throwIfCancelled()` method for graceful cancellation.
 *
 * @returns {Promise<object>} Resolves to a details object containing scraped data or fallback error information.
 */
async function scrapeWebsite(websiteCache, page, url, cancelToken) {
  const normalizedUrl = normalizeUrl(url);

  // Return cached details if available
  if (websiteCache.has(normalizedUrl)) {
    return websiteCache.get(normalizedUrl);
  }

  let details;
  try {
    cancelToken.throwIfCancelled();
    const response = await page.load(normalizedUrl);

    // Check if the request was blocked or rate-limited
    const status = response?.status();
    if ([403, 429].includes(status)) {
      details = FALLBACK_DETAILS.BLOCKED(status);
    } else {
      details = {
        email: await page.getEmail(),
        sellsOnline: await page.hasOnlineShop(),
        fishingReport: await page.publishesFishingReport(),
        socialMedia: await page.getSocialMedia(),
      };
    }
  } catch {
    details = FALLBACK_DETAILS.TIMEOUT;
  }

  websiteCache.set(normalizedUrl, details);

  return details;
}
