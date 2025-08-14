import { chromium } from "playwright";
import { scrapeGoogleShopUrl, scrapeGoogleShopDetails } from "./shopScaper.js";

async function main() {
  // Open the browser
  const browser = await chromium.launch({ headless: process.env.RUN_HEADLESS });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });

  // Scraping
  const urls = await scrapeGoogleShopUrl(context, process.env.STARTING_URL);
  await scrapeGoogleShopDetails(context, urls);

  // Close the browser
  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
