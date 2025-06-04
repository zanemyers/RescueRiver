import dotenv from "dotenv";
import fs from "fs/promises";
import ora from "ora";
import { getJson } from "serpapi";
import { PromisePool } from "@supercharge/promise-pool";

import { FALLBACK_DETAILS } from "../base/enums.js";
import {
  addShopSelectors,
  buildShopRows,
  loadCachedShops,
} from "./shopUtils.js";
import { normalizeUrl, StealthBrowser } from "../base/scrapingUtils.js";
import { ExcelFileHandler } from "../base/fileUtils.js";

// Load environment variables from .env file
dotenv.config();

// Initialize class variables
const browser = new StealthBrowser({
  headless: process.env.HEADLESS !== "false",
});
const shopWriter = new ExcelFileHandler("resources/xlsx/shop_details.xlsx");
const websiteCache = new Map();

async function main() {
  // Initalize spinner instance
  const spinner = ora();

  try {
    spinner.start("Searching for shops...");
    const shops = await fetchShops();
    spinner.succeed(`Found ${shops.length} shops.`);

    await browser.launch();
    const shopDetails = await getDetails(shops);
    const rows = buildShopRows(shops, shopDetails);

    spinner.start(`Writing shop data to Excel...`);
    shopWriter.write(rows);
    spinner.succeed("Finished!\n");
  } catch (err) {
    spinner.fail(`Error: ${err}`);
  } finally {
    await browser.close();
  }
}

/**
 * Fetches a list of shops near a given location using SerpAPI's Google Maps engine.
 * Falls back to cached results if available and valid.
 *
 * @returns {Promise<object[]>} A list of local shops, or an empty array if none found.
 */
async function fetchShops() {
  const cacheFile = "./assets/exampleFiles/shops.json"; // TODO: Allow user to pass this in
  const meta = {
    query: process.env.SEARCH_QUERY,
    coordinates: process.env.SEARCH_COORDINATES,
  };

  const cached = await loadCachedShops(cacheFile, meta);
  if (cached) return cached;

  const max = parseInt(process.env.MAX_RESULTS, 10) || 100;
  const results = [];

  for (let start = 0; start < max; start += 20) {
    const data = await getJson({
      engine: "google_maps",
      q: meta.query,
      ll: `@${meta.coordinates},10z`,
      start,
      type: "search",
      api_key: process.env.SERP_API_KEY,
    });

    const pageResults = data?.local_results || [];
    results.push(...pageResults);

    if (pageResults.length < 20) break; // Last page reached
  }

  // TODO: Export this to a user so they can import it as their cache file later
  if (results.length > 0) {
    await fs.writeFile(
      cacheFile,
      JSON.stringify({ meta, results }, null, 2),
      "utf-8"
    );
  }

  return results;
}

/**
 * Scrapes additional details from a shops website using Playwright.
 *
 * Each shop is processed in parallel with controlled concurrency to avoid overwhelming
 * system resources or triggering anti-bot protections. Shops without websites are skipped.
 *
 * @param {Array<object>} shops - The list of shops to scrape extra details from.
 * @returns {Promise<Array<object>>} - A list of detail objects (one per shop), with fallback values on failure.
 */
async function getDetails(shops) {
  const total = shops.length;
  const results = new Array(total);
  let completed = 0;

  const messageTemplate = (done) => `Scraping shops (${done}/${total})`;
  const spinner = ora(messageTemplate(completed)).start();

  await PromisePool.withConcurrency(parseInt(process.env.CONCURRENCY, 10) || 5)
    .for(shops)
    .process(async (shop, index) => {
      if (!shop.website) {
        results[index] = FALLBACK_DETAILS.NONE;
      } else {
        const page = await addShopSelectors(await browser.newPage());
        try {
          results[index] = await scrapeWebsite(page, shop.website);
        } catch (err) {
          console.warn(`⚠️ Failed to get details for ${shop.title}`, err);
          results[index] = FALLBACK_DETAILS.ERROR;
        } finally {
          await page.close();
        }
      }

      spinner.text = messageTemplate(++completed);
    });

  spinner.succeed(`Scraping Complete`);

  return results;
}

/**
 * Scrapes useful business-related data from a given website using Playwright.
 *
 * @param {Page} page - A Playwright page instance used to navigate and scrape the website.
 * @param {string} url - The raw URL of the shop’s website to be scraped.
 * @returns {Promise<object>} - An object with extracted details or fallback error values.
 */
async function scrapeWebsite(page, url) {
  const normalizedUrl = normalizeUrl(url);

  // Check for cached results
  if (websiteCache.has(normalizedUrl)) {
    return websiteCache.get(normalizedUrl);
  }

  let details;
  try {
    const response = await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    page.simulateUserInteraction(); // Simulate user interaction to avoid bot detection

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
  } catch (err) {
    details = FALLBACK_DETAILS.TIMEOUT;
  }

  // Cache and return the result
  websiteCache.set(normalizedUrl, details);
  return details;
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
