import "dotenv/config";
import { PromisePool } from "@supercharge/promise-pool";
import { GoogleGenAI } from "@google/genai";

import { REPORT_DIVIDER } from "../../constants/index.js";
import {
  ExcelFileHandler,
  normalizeUrl,
  sameDomain,
  StealthBrowser,
  TXTFileHandler,
} from "../../utils/index.js";

import {
  checkDuplicateSites,
  chunkReportText,
  extractAnchors,
  filterReports,
  generateContent,
  getPriority,
  scrapeVisibleText,
} from "./reportUtils.js";

export async function reportScraper({
  searchParams,
  progressUpdate = () => {},
  returnFile = () => {},
  cancelToken = { throwIfCancelled: () => {} }, // default to no-op if not provided
}) {
  try {
    let sites;

    // STEP 1: Read and deduplicate site list
    progressUpdate("Reading Sites from file...");

    // Initialize the excel file handler instance with a filepath
    const inputFileHandler = new ExcelFileHandler();
    await inputFileHandler.loadBuffer(searchParams.fileBuffer);
    sites = await inputFileHandler.read(
      ["keywords", "junk-words", "click-phrases"] // listCols
    );

    const siteList = await checkDuplicateSites(sites); // Filter out duplicates
    progressUpdate(`STATUS:✅ Found ${siteList.length} sites to scrape!`);

    // STEP 2: Scrape fishing reports from each site
    const reports = await scrapeReports(progressUpdate, siteList, searchParams.crawlDepth);

    // STEP 3: Filter and compile reports (if any found)
    if (reports.length > 0) {
      progressUpdate("Compiling reports...");
      const filteredReports = filterReports(
        reports,
        searchParams.maxAge,
        searchParams.filterByRivers,
        searchParams.riverList
      );
      const compiledReports = filteredReports.join(REPORT_DIVIDER); // Join with section divider
      progressUpdate("STATUS:✅ Compiling complete!");

      // STEP 4: Generate a summary using Gemini
      progressUpdate("Generating report summary...");
      progressUpdate(`DOWNLOAD:report_summary.txt`);
      await generateSummary(
        returnFile,
        compiledReports,
        searchParams.apiKey,
        searchParams.model,
        searchParams.summaryPrompt,
        searchParams.mergePrompt,
        searchParams.tokenLimit
      );
      progressUpdate("STATUS:✅ Finished!");
    }
  } catch (err) {
    progressUpdate(`❌ Error: ${err.message || err}`);
  }
}

/**
 * Scrapes report content from a list of sites.
 *
 * For each site, opens a new page in the browser, runs a prioritized crawl to extract
 * visible report-like text, and compiles all results into a flat array.
 *
 * @param progressUpdate
 * @param {Array<Object>} sites - List of site objects to crawl.
 * @param crawlDepth
 * @returns {Promise<{reports: *, failedDomains: *[]}>} - A list of reports and sites that failed to load
 */
async function scrapeReports(progressUpdate, sites, crawlDepth) {
  // Initialize the stealth browser (headless unless overridden by env)
  const browser = new StealthBrowser({ headless: process.env.RUN_HEADLESS !== "false" });
  const failedDomains = [];

  try {
    await browser.launch(); // Start the browser session

    let completed = 0; // Track how many sites have been processed

    const messageTemplate = (done) => `Scraping sites (${done}/${sites.length}) for reports...`;

    progressUpdate(messageTemplate(completed));

    // Run site scraping in parallel
    const { results } = await PromisePool.withConcurrency(
      Math.max(1, parseInt(process.env.CONCURRENCY, 10) || 5)
    )
      .for(sites)
      .process(async (site) => {
        const page = await browser.newPage(); // Open a new tab for the site
        try {
          const { reports, pageErrors } = await findReports(page, site, crawlDepth); // Crawl and collect reports
          progressUpdate(messageTemplate(++completed)); // Update progress
          failedDomains.push(...pageErrors);
          return reports;
        } catch (error) {
          failedDomains.push(`Error scraping ${site.url}:`, error);
          return [];
        } finally {
          await page.close(); // Always close the tab to prevent leaks
        }
      });

    // Flatten all site results and remove empty entries
    const reports = results.flat().filter(Boolean);

    progressUpdate(`Found ${reports.length} total reports!`);

    return { reports, failedDomains };
  } catch (err) {
    progressUpdate(`Error: ${err}`);
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
 * @param {Object} page - The Playwright page instance used for navigation.
 * @param {Object} site - An object representing the site to crawl. Includes `url` and optional `selector`.
 * @param crawlDepth
 * @returns {Promise<{ reports: string[], pageErrors: string[] }>} - A list of reports and siteFailures
 */
async function findReports(page, site, crawlDepth) {
  const visited = new Set(); // Tracks URLs that have already been visited
  const toVisit = [{ url: site.url, priority: -1 }]; // URLs queued for crawling
  const reports = []; // Collected report texts
  const pageErrors = [];

  // Crawl loop: continue while there are URLs to visit and we haven't hit the crawl limit
  while (toVisit.length > 0 && visited.size < crawlDepth) {
    const { url } = toVisit.shift(); // Get the next URL
    if (visited.has(url)) continue;
    visited.add(url);

    // Navigate to the page
    try {
      await page.load(url);
    } catch (error) {
      pageErrors.push(`Error navigating to ${url}:`, error);
      continue;
    }

    // Scrape visible content from subpages (not the homepage)
    if (url !== site.url) {
      await page.waitForSelector("body", { timeout: 10000 }).catch(() => {});
      const text = await scrapeVisibleText(page, site.selector);
      if (text) {
        reports.push(`${text}\nSource: ${url}`);
      }
    }

    // Extract all anchor links from the page
    const pageLinks = await extractAnchors(page);

    for (const { href, linkText } of pageLinks) {
      if (!sameDomain(href, site.url)) continue;

      const link = normalizeUrl(href);

      // Avoid revisiting or duplicating queued links
      if (visited.has(link) || toVisit.some((item) => item.url === link)) continue;

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
  if (process.env.DEBUGGING === "true") {
    if (visited.size >= crawlDepth) {
      console.log(`Reached crawl depth limit for the site.`);
    }
    console.log("VISITED:", visited);
    console.log("TO VISIT:", toVisit);
  }

  return { reports, pageErrors };
}

/**
 * Generates a summarized report using the Gemini AI model.
 *
 * This function takes a string, splits it into bite size chunks, then
 * summarizes each chunk in parallel and writes the output to a text file,
 *
 * @param returnFile
 * @param {string} report - The full text content of the compiled reports.
 * @param apiKey
 * @param summaryPrompt
 * @param mergePrompt
 * @param tokenLimit
 */
async function generateSummary(
  returnFile,
  report,
  apiKey,
  model,
  summaryPrompt,
  mergePrompt,
  tokenLimit
) {
  // Initialize the Google GenAI client with your API key
  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const summaryWriter = new TXTFileHandler("media/txt/report_summary.txt");

    // Split the compiled report into smaller chunks (based on token limits)
    const chunks = chunkReportText(report, tokenLimit);

    // Use PromisePool to summarize each chunk concurrently
    const { results, errors } = await PromisePool.withConcurrency(
      Math.max(1, parseInt(process.env.CONCURRENCY, 10) || 5)
    )
      .for(chunks)
      .process(async (chunk) => {
        return await generateContent(ai, model, `${chunk}\n\n${summaryPrompt}`);
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
      ai,
      model,
      `${mergePrompt}\n\n${results.join("\n\n")}`
    );

    // Write the final summary to the output file
    await summaryWriter.write(finalResponse);
    // Send the file to the frontend
    returnFile(summaryWriter.getBuffer());
  } catch (err) {
    console.error("Error generating summary:", err);
  }
}
