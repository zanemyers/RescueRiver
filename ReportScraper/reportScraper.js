import "dotenv/config";
import ora from "ora";
import { PromisePool } from "@supercharge/promise-pool";

import { MERGE_PROMPT, REPORT_DIVIDER, SUMMARY_PROMPT } from "../base/enums.js";
import { ExcelFileHandler, TXTFileHandler } from "../base/fileUtils.js";
import {
  checkDuplicateSites,
  scrapeVisibleText,
  chunkReportText,
  extractAnchors,
  filterReports,
  generateContent,
  getPriority,
  isSameDomain,
} from "./reportScrapingUtils.js";

import { normalizeUrl, StealthBrowser } from "../base/scrapingUtils.js";

// Initialize spinner instance
const spinner = ora();

// Initialize .env variables
const concurrency = Math.max(1, parseInt(process.env.CONCURRENCY, 10) || 5);
const crawlDepth = Math.max(1, parseInt(process.env.CRAWL_DEPTH, 10) || 25);
const runHeadless = process.env.RUN_HEADLESS !== "false";
const debugging = process.env.DEBUGGING === "true";

async function main() {
  try {
    // STEP 1: Read and deduplicate site list
    spinner.start("Reading Sites from file...");
    const sites = ExcelFileHandler.read(); // Load raw site data
    const siteList = await checkDuplicateSites(sites); // Filter out duplicates
    spinner.succeed(`Found ${siteList.length} sites to scrape!`);

    // STEP 2: Scrape fishing reports from each site
    const reports = await scrapeReports(siteList);

    // STEP 3: Filter and compile reports (if any found)
    if (reports.length > 0) {
      spinner.start("Compiling reports...");
      const filteredReports = filterReports(reports); // Filter out old reports
      const compiledReports = filteredReports.join(REPORT_DIVIDER); // Join with section divider
      spinner.succeed("Compiling complete!");

      // STEP 4: Generate a summary using Gemini
      spinner.start("Generating report summary...");
      await generateSummary(compiledReports);
      spinner.succeed("Finished!");
    } else {
      console.log("No reports found."); // Handle empty result set
    }
  } catch (err) {
    spinner.fail(`Error: ${err}`);
  }
}

/**
 * Scrapes report content from a list of sites.
 *
 * For each site, opens a new page in the browser, runs a prioritized crawl to extract
 * visible report-like text, and compiles all results into a flat array.
 *
 * @param {Array<Object>} sites - List of site objects to crawl.
 * @returns {Promise<string[]>} - All collected report texts from the provided sites.
 */
async function scrapeReports(sites) {
  // Initialize the stealth browser (headless unless overridden by env)
  const browser = new StealthBrowser({ headless: runHeadless });

  try {
    await browser.launch(); // Start the browser session

    let completed = 0; // Track how many sites have been processed

    const messageTemplate = (done) =>
      `Scraping sites (${done}/${sites.length}) for reports...`;

    spinner.start(messageTemplate(completed));

    // Run site scraping in parallel
    const { results } = await PromisePool.withConcurrency(concurrency)
      .for(sites)
      .process(async (site) => {
        const page = await browser.newPage(); // Open a new tab for the site
        try {
          const reports = await findReports(page, site); // Crawl and collect reports
          spinner.text = messageTemplate(++completed); // Update progress
          return reports;
        } catch (error) {
          console.error(`Error scraping ${site.url}:`, error);
          return [];
        } finally {
          await page.close(); // Always close the tab to prevent leaks
        }
      });

    // Flatten all site results and remove empty entries
    const reports = results.flat().filter(Boolean);

    spinner.succeed(`Found ${reports.length} total reports!`);

    return reports;
  } catch (err) {
    spinner.fail(`Error: ${err}`);
    return [];
  } finally {
    await browser.close(); // Ensure browser shuts down regardless of success/failure
  }
}

/**
 * Crawls a shop website to extract potential reports.
 *
 * Starting from the provided site URL, this function navigates through internal
 * links—prioritized by relevance until it either exhausts the
 * crawl queue or reaches the maximum crawl depth.
 *
 * @param {import('playwright').Page} page - The Playwright page instance used for navigation.
 * @param {Object} site - An object representing the site to crawl. Includes `url` and optional `selector`.
 * @returns {Promise<string[]>} - A list of strings containing report content and their source URLs.
 */
async function findReports(page, site) {
  const visited = new Set(); // Tracks URLs that have already been visited
  const toVisit = [{ url: site.url, priority: -1 }]; // URLs queued for crawling
  const baseHostname = new URL(site.url).hostname; // Restrict to same domain
  const reports = []; // Collected report texts

  // Crawl loop: continue while there are URLs to visit and we haven't hit the crawl limit
  while (toVisit.length > 0 && visited.size < crawlDepth) {
    const { url } = toVisit.shift(); // Get the next URL
    if (visited.has(url)) continue;
    visited.add(url);

    // Navigate to the page
    try {
      await page.load(url);
    } catch (error) {
      console.error(`Error navigating to ${url}:`, error);
      continue;
    }

    // Scrape visible content from subpages (not the homepage)
    if (url !== site.url) {
      const text = await scrapeVisibleText(page, site.selector);
      if (text) {
        reports.push(`${text}\nSource: ${url}`);
      }
    }

    // Extract all anchor links from the page
    const pageLinks = await extractAnchors(page);

    for (const { href, linkText } of pageLinks) {
      if (!isSameDomain(href, baseHostname)) continue;

      const link = normalizeUrl(href);

      // Avoid revisiting or duplicating queued links
      if (visited.has(link) || toVisit.some((item) => item.url === link))
        continue;

      // Rank link by priority (based on keywords, etc.)
      const priority = getPriority(url, link, linkText, site);

      // Only queue links that are considered valid and useful
      if (priority !== Infinity) {
        toVisit.push({ url: link, priority });
      }
    }

    // Sort queue so high-priority URLs are visited first
    toVisit.sort((a, b) => a.priority - b.priority);
  }

  // Debug output for optimization
  if (debugging) {
    if (visited.size >= crawlDepth) {
      console.log(`Reached crawl depth limit for the site.`);
    }
    console.log("VISITED:", visited);
    console.log("TO VISIT:", toVisit);
  }

  return reports;
}

/**
 * Generates a summarized report using the Gemini AI model.
 *
 * This function takes a string, splits it into bite size chunks, then
 * summarizes each chunk in parallel and writes the output to a text file,
 *
 * @param {string} report - The full text content of the compiled reports.
 */
async function generateSummary(report) {
  try {
    const summaryWriter = new TXTFileHandler("media/txt/report_summary.txt");

    // Split the compiled report into smaller chunks (based on token limits)
    const chunks = chunkReportText(report);

    // Use PromisePool to summarize each chunk concurrently
    const { results, errors } = await PromisePool.withConcurrency(concurrency)
      .for(chunks)
      .process(async (chunk) => {
        return await generateContent(`${chunk}\n\n${SUMMARY_PROMPT}`);
      });

    // Log any failed chunk summaries
    if (errors.length > 0) {
      console.error("Some summaries failed:", errors);
    }

    // If no summaries were successfully generated, skip final merging
    if (results.length === 0) {
      console.warn("No summaries generated. Skipping final summary.");
      return;
    }

    // Merge the individual summaries into a final summary
    const finalResponse = await generateContent(
      `${MERGE_PROMPT}\n\n${results.join("\n\n")}`
    );

    // Write the final summary to the output file
    await summaryWriter.write(finalResponse);
  } catch (err) {
    console.error("Error generating summary:", err);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
