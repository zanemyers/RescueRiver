import "dotenv/config";
import { chromium } from "playwright";
import { fishingReportScraper, makeReportSummary } from "./reportScrapers.js";
import { getUrlsFromXLSX, checkDuplicateUrls } from "./reportScrapingUtils.js";
import { sites } from "./sites.js";

async function main() {
  // TODO: we should run this occassionally and use chatGPT to see if there are new urls,
  // check those to see if they've updated recently and add them to the sites list of dictionaries
  // const urls = await getUrlsFromCSV();

  //   const normalizedSites = await checkDuplicateUrls(sites);

  //   const browser = await chromium.launch({ headless: false });
  //   const context = await browser.newContext({ ignoreHTTPSErrors: true });

  //   // // await fishingReportScraper(context, urls);
  //   await fishingReportScraper(context, normalizedSites);

  //   browser.close();

  makeReportSummary();
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
