import "dotenv/config";
import fs from "fs";
import ora from "ora";

import { MERGE_PROMPT, REPORT_DIVIDER, SUMMARY_PROMPT } from "../base/enums.js";
import { TXTFileWriter } from "../base/fileUtils.js";
import {
  scrapeVisibleText,
  chunkReportText,
  extractAnchors,
  filterReports,
  generateContent,
  getPriority,
  isSameDomain,
} from "./reportScrapingUtils.js";

import { normalizeUrl } from "../base/scrapingUtils.js";

async function main() {
  // Initalize spinner instance
  const spinner = ora();
  // TODO: we should run this occassionally and use chatGPT to see if there are new urls,
  // check those to see if they've updated recently and add them to the sites list of dictionaries
  // const urls = await getUrlsFromXLSX();

  // If RUN_HEADLESS is not set, default to true, otherwise use the environment variable value
  const runHeadless = (process.env.RUN_HEADLESS ?? "true") === "true";

  //   const normalizedSites = await checkDuplicateUrls(sites);

  //   const browser = await chromium.launch({ headless: false });
  //   const context = await browser.newContext({ ignoreHTTPSErrors: true });

  //   // // await fishingReportScraper(context, urls);
  //   await fishingReportScraper(context, normalizedSites);

  //   browser.close();

  spinner.start("Generating report summary...");
  await makeReportSummary();
  spinner.succeed(`Finished!`);
}

/**
 * Scrapes fishing reports from a list of site objects and writes them to a text file.
 *
 * Each site object should include:
 *   - `url` (string): The base URL of the fishing shop to crawl.
 *   - `selector` (string): The CSS selector to extract the report content.
 *   - `lastUpdated` (string): A human-readable date string for when the report was last confirmed.
 *
 * @param {import('playwright').BrowserContext} context - Playwright browser context to isolate each page.
 * @param {{ url: string, selector: string, lastUpdated: string }[]} sites - List of site objects to crawl.
 * @returns {Promise<void>} - Resolves when all reports are gathered and written.
 */
async function fishingReportScraper(context, sites) {
  const reports = [];

  for (const site of sites) {
    const page = await context.newPage();
    try {
      const siteReports = await findFishingReports(page, site); // returns array of reports
      reports.push(...siteReports);
    } catch (error) {
      console.error(`Error scraping ${site.url}:`, error);
    } finally {
      await page.close();
    }
  }

  await compileFishingReports(reports);
  await makeReportSummary();
}

/**
 * Crawls a fishing shop website starting from a given URL,
 * prioritizing internal links that are more likely to contain fishing reports
 * based on a list of prioritized keywords.
 *
 * Navigates the site up to `maxVisits` pages, collects visible text content,
 * and returns an array of reports with their source URLs.
 *
 * @param {import('playwright').Page} page - The Playwright page object.
 * @param {string} startUrl - The starting URL to begin crawling from.
 * @param {number} maxVisits - Maximum number of pages to visit.
 * @returns {Promise<string[]>} - A list of report texts with source URLs.
 */
async function findFishingReports(page, site, maxVisits = 25) {
  const visited = new Set(); // Keep track of visited URLs
  const toVisit = [{ url: site.url, priority: -1 }]; // Queue of URLs to visit
  const baseHostname = new URL(site.url).hostname; // pull hostname to restrict crawling domains
  const reports = []; // Array to store fishing reports

  // Continue crawling as long as there are URLs to visit and we haven't reached the visit limit
  while (toVisit.length > 0 && visited.size < maxVisits) {
    const { url } = toVisit.shift(); // Take the next URL to visit
    if (visited.has(url)) continue; // Skip if visited
    visited.add(url); // Mark this URL as visited

    // Try to navigate to the page; skip if navigation fails
    try {
      await page.goto(url, { timeout: 10000, waitUntil: "domcontentloaded" });
    } catch (error) {
      console.error(`Error navigating to ${url}:`, error);
      continue;
    }

    // Scrape visible text only if the URL is not the base site URL
    if (url !== site.url) {
      const text = await scrapeVisibleText(page, site.selector);
      if (text) {
        // Store the scraped text with the source URL for reference
        reports.push(`${text}\nSource: ${url}`);
      }
    }

    const pageLinks = await extractAnchors(page); // Extract all anchor links (href + visible text)

    // Process each link on the page to evaluate if it should be queued
    for (const { href, linkText } of pageLinks) {
      if (!isSameDomain(href, baseHostname)) continue; // Ignore links to different domains

      const link = normalizeUrl(href); // normalize for consistent comparison

      // Skip if we've already visited or queued the url
      if (visited.has(link) || toVisit.some((item) => item.url === link))
        continue;

      const priority = getPriority(url, link, linkText, site); // Determine the priority of the link

      // Only add the link to the queue if it has a valid priority
      if (priority !== Infinity) {
        toVisit.push({ url: link, priority });
      }
    }

    // re-sort the queue so that highest priority URLs come first
    toVisit.sort((a, b) => a.priority - b.priority);
  }

  // Log if we stopped crawling because we reached the max visit limit
  if (visited.size >= maxVisits) {
    console.log(`Reached max visits limit for site: ${maxVisits}`);
  }

  // FOR TESTING TO OPTIMIZE SITE KEYWORDS
  // console.log("VISITED:");
  // console.log(visited);
  // console.log("TO VISIT");
  // console.log(toVisit);

  return reports;
}

/**
 * Compiles an array of fishing report texts into a single formatted file.
 *
 * @param {string[]} reports - An array of report texts, each already tagged with a source.
 */
async function compileFishingReports(reports) {
  // Create a TXTFileWriter instance for writing and archiving reports
  const reportWriter = new TXTFileWriter("media/txt/fishing_reports.txt");

  // Filter reports based on date and keywords
  const filteredReports = filterReports(reports);

  // Combine all filtered report entries into a single string
  const compiledReports = filteredReports.join(REPORT_DIVIDER);

  // Write the final compiled content to the file
  await reportWriter.write(compiledReports);
}

/**
 * Summarizes fishing reports from a text file using the Gemini AI model
 * and writes the summary to an output file.
 */
async function makeReportSummary() {
  // Initialize a TXTFileWriter to write the AI-generated summary
  const summaryWriter = new TXTFileWriter("media/txt/report_summary.txt");

  // Read the raw fishing report text
  const fileText = fs.readFileSync("media/txt/fishing_reports.txt", "utf-8");

  const chunks = chunkReportText(fileText); // Split the text into manageable chunks

  const summaries = [];
  for (const chunk of chunks) {
    summaries.push(await generateContent(`${chunk}\n\n${SUMMARY_PROMPT}`));
  }

  const finalResponse = await generateContent(
    `${MERGE_PROMPT}\n\n${summaries.join("\n\n")}`
  );

  // Write the AI-generated summary text to the output file
  await summaryWriter.write(finalResponse);
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
