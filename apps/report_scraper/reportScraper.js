import "dotenv/config";
import { PromisePool } from "@supercharge/promise-pool";
import { GoogleGenAI } from "@google/genai";
import TinyQueue from "tinyqueue";

import { REPORT_DIVIDER } from "../base/constants/index.js";
import {
  ExcelFileHandler,
  normalizeUrl,
  sameDomain,
  StealthBrowser,
  TXTFileHandler,
} from "../base/index.js";

import {
  checkDuplicateSites,
  chunkReportText,
  extractAnchors,
  filterReports,
  generateContent,
  getPriority,
  scrapeVisibleText,
} from "./reportUtils.js";

const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY, 10) || 5);

/**
 * Main function to scrape reports from a list of sites, filter, compile, and summarize them.
 *
 * @param {Object} searchParams - Parameters controlling scraping and filtering.
 * @param {Buffer} searchParams.fileBuffer - Excel file buffer containing site data.
 * @param {number} searchParams.crawlDepth - Max crawl depth per site.
 * @param {number} searchParams.maxAge - Max age filter for reports.
 * @param {boolean} searchParams.filterByRivers - Whether to filter by rivers.
 * @param {string[]} searchParams.riverList - List of rivers to filter by.
 * @param {string} searchParams.apiKey - API key for Gemini.
 * @param {string} searchParams.model - AI model to use.
 * @param {string} searchParams.summaryPrompt - Prompt text for summary generation.
 * @param {string} searchParams.mergePrompt - Prompt text for merging summaries.
 * @param {number} searchParams.tokenLimit - Token limit per summary chunk.
 * @param {Function} progressUpdate - Callback to report progress.
 * @param {Function} returnFile - Callback to return the generated summary file buffer.
 * @param {Object} cancelToken - Token with `throwIfCancelled` method to cancel the operation.
 *
 * @returns {Promise<void>}
 */
export async function reportScraper({
  searchParams,
  progressUpdate = () => {},
  returnFile = () => {},
  cancelToken = { throwIfCancelled: () => {} }, // default to no-op if not provided
}) {
  try {
    // STEP 1: Read and deduplicate site list
    progressUpdate("Reading Sites from file...");

    const inputFileHandler = new ExcelFileHandler();
    await inputFileHandler.loadBuffer(searchParams.fileBuffer);
    cancelToken.throwIfCancelled();

    const sites = await inputFileHandler.read(["keywords", "junk-words", "click-phrases"]);
    const siteList = await checkDuplicateSites(sites);
    progressUpdate(`STATUS:✅ Found ${siteList.length} sites to scrape!`);
    cancelToken.throwIfCancelled();

    // STEP 2: Scrape fishing reports from each site
    const { reports, failedDomains } = await scrapeReports(
      siteList,
      searchParams.crawlDepth,
      progressUpdate,
      cancelToken
    );
    cancelToken.throwIfCancelled();

    // STEP 3: Filter and compile reports (if any found)
    if (reports.length > 0) {
      progressUpdate("Compiling reports...");
      const filteredReports = filterReports(
        reports,
        searchParams.maxAge,
        searchParams.filterByRivers,
        searchParams.riverList
      );
      cancelToken.throwIfCancelled();

      const compiledReports = filteredReports.join(REPORT_DIVIDER);
      progressUpdate("STATUS:✅ Compiling complete!");

      // STEP 4: Generate a summary using Gemini
      progressUpdate("Generating report summary...");
      progressUpdate(`DOWNLOAD:report_summary.txt`);
      await generateSummary(
        compiledReports,
        process.env.GEMINI_API_KEY, // TODO: use searchParams.apiKey instead
        searchParams.model,
        searchParams.summaryPrompt,
        searchParams.mergePrompt,
        searchParams.tokenLimit,
        progressUpdate,
        returnFile,
        cancelToken
      );

      if (failedDomains.length) {
        console.warn(`Failed Pages\n${failedDomains.join("\n")}`);
      }

      progressUpdate("STATUS:✅ Finished!");
    }
  } catch (err) {
    if (err.isCancelled) {
      progressUpdate(err.message);
    } else {
      progressUpdate(`❌ Error: ${err.message || err}`);
    }
  }
}

/**
 * Scrapes report content from a list of sites concurrently.
 * For each site, runs a prioritized crawl to extract report-like text,
 * accumulating all results into a flat array.
 *
 * @param {Array<Object>} sites - List of site objects to crawl.
 * @param {number} crawlDepth - Maximum number of pages to visit per site.
 * @param {Function} progressUpdate - Callback function to report progress status.
 * @param {Object} cancelToken - Cancellation token with throwIfCancelled method.
 *
 * @returns {Promise<{reports: string[], failedDomains: string[]}>} - Object containing
 *   collected reports and a list of domains where scraping failed.
 */
async function scrapeReports(sites, crawlDepth, progressUpdate, cancelToken) {
  const browser = new StealthBrowser({ headless: process.env.RUN_HEADLESS !== "false" });
  let completed = 0;
  const failedDomains = [];
  const messageTemplate = (done) => `Scraping sites (${done}/${sites.length}) for reports...`;

  try {
    await browser.launch();
    progressUpdate(messageTemplate(completed));

    // Run site scraping in parallel with controlled concurrency
    const { results } = await PromisePool.withConcurrency(CONCURRENCY)
      .for(sites)
      .process(async (site) => {
        cancelToken.throwIfCancelled();

        const page = await browser.newPage();
        try {
          const { reports, pageErrors } = await findReports(
            page,
            site,
            crawlDepth,
            progressUpdate,
            cancelToken
          );
          progressUpdate("STATUS:" + messageTemplate(++completed));
          failedDomains.push(...pageErrors);
          return reports;
        } catch (err) {
          if (err.isCancelled) throw err; // Bubble-up
          failedDomains.push(`Error scraping ${site.url}: ${err.message || err}`);
          return [];
        } finally {
          await page.close();
        }
      });

    cancelToken.throwIfCancelled();

    // Flatten nested arrays and remove empty entries
    const reports = (results ?? []).flat().filter(Boolean);
    progressUpdate(`STATUS:✅ Found ${reports.length} total reports!`);

    return { reports, failedDomains };
  } catch (err) {
    if (err.isCancelled) throw err; // Bubble-up
    progressUpdate(`STATUS:❌ Error: ${err}`);
    return { reports: [], failedDomains };
  } finally {
    await browser.close(); // Ensure browser shuts down regardless of success/failure
  }
}

/**
 * Crawls a website to extract potential reports.
 *
 * Starts from the given site URL and traverses internal links prioritized by relevance,
 * until either the crawl queue is empty or the maximum crawl depth is reached.
 *
 * @param {Object} page - Playwright page instance for navigation.
 * @param {Object} site - Object representing the site, including `url` and optional `selector`.
 * @param {number} crawlDepth - Maximum number of pages to visit.
 * @param {Function} progressUpdate - Callback function to report progress status.
 * @param {Object} cancelToken - Token to check if the operation has been cancelled.
 * @returns {Promise<{ reports: string[], pageErrors: string[] }>} - Extracted reports and any navigation errors.
 */
async function findReports(page, site, crawlDepth, progressUpdate, cancelToken) {
  const visited = new Set(); // URLs already visited
  const toVisit = new TinyQueue([], (a, b) => a.priority - b.priority); // Priority queue for URLs to visit
  const reports = []; // Collected report texts
  const pageErrors = []; // Navigation errors encountered

  // Seed with the starting page; lower priority number means higher priority
  toVisit.push({ url: site.url, priority: -1 });
  while (toVisit.length > 0 && visited.size < crawlDepth) {
    cancelToken.throwIfCancelled();

    const { url } = toVisit.pop(); // Get the next highest priority URL
    if (visited.has(url)) continue;
    visited.add(url);

    // Navigate to the page
    try {
      await page.load(url);
    } catch (err) {
      pageErrors.push(`Error navigating to ${url}:: ${err.message || err}`);
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
      if (visited.has(link)) continue;

      const priority = getPriority(url, link, linkText, site);
      if (priority !== Infinity) {
        toVisit.push({ url: link, priority });
      }
    }
  }

  // Refine keywords and junk-words
  if (process.env.DEBUGGING === "true") {
    if (visited.size >= crawlDepth) {
      progressUpdate(`Reached crawl depth limit for the site.`);
    }
    progressUpdate(`VISITED:\n${[...visited].join("\n")}`);
    progressUpdate(`TO VISIT:\n${toVisit.data.map((item) => item.url).join("\n")}`);
  }

  return { reports, pageErrors };
}

/**
 * Generates a summarized report using the Gemini AI model.
 *
 * Splits the full report text into manageable chunks, summarizes each chunk
 * concurrently using the AI model, then merges and writes the final summary
 * to a text file.
 *
 * @param {string} report - The full text content of the compiled reports.
 * @param {string} apiKey - API key for the Gemini AI service.
 * @param {string} model - Model to use for summarization.
 * @param {string} summaryPrompt - Prompt to guide chunk summarization.
 * @param {string} mergePrompt - Prompt to guide merging of chunk summaries.
 * @param {number} tokenLimit - Token limit per chunk.
 * @param {Function} progressUpdate - Callback function to report progress status.
 * @param {Function} returnFile - Callback to return the generated summary file buffer.
 * @param {Object} cancelToken - Token to support cancellation of the operation.
 */
async function generateSummary(
  report,
  apiKey,
  model,
  summaryPrompt,
  mergePrompt,
  tokenLimit,
  progressUpdate,
  returnFile,
  cancelToken
) {
  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const summaryWriter = new TXTFileHandler("media/txt/report_summary.txt");

    // Split report into chunks respecting token limits
    const chunks = chunkReportText(report, tokenLimit);

    // Summarize each chunk concurrently
    const { results, errors } = await PromisePool.withConcurrency(CONCURRENCY)
      .for(chunks)
      .process(async (chunk) => {
        cancelToken.throwIfCancelled();
        return await generateContent(ai, model, `${chunk}\n\n${summaryPrompt}`);
      });

    if (errors.length > 0) {
      console.warn("Some summaries failed:", errors);
    }

    if (results.length === 0) {
      progressUpdate("STATUS:❌ No summaries generated. Skipping final summary.");
      return;
    }

    cancelToken.throwIfCancelled();

    // Merge chunk summaries into a final summary
    const finalResponse = await generateContent(
      ai,
      model,
      `${mergePrompt}\n\n${results.join("\n\n")}`
    );

    // Write to file and return buffer
    await summaryWriter.write(finalResponse);
    returnFile(summaryWriter.getBuffer());
  } catch (err) {
    if (err.isCancelled) throw err; // Bubble-up
    progressUpdate(`STATUS:❌ Error generating summary: ${err}`);
  }
}
