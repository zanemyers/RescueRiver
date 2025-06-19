import { differenceInDays } from "date-fns";
import { GoogleGenAI } from "@google/genai";

import { REPORT_DIVIDER } from "../base/enums.js";
import { ExcelFileHandler } from "../base/fileUtils.js";
import { normalizeUrl } from "../base/scrapingUtils.js";
import { extractMostRecentDate } from "../base/dateUtils.js";

/**
 * Reads a CSV file containing shop details and returns a filtered list of shops
 * that publish fishing reports. Each result includes the shop's name and website.
 *
 * The CSV file is expected to have at least the following columns:
 * - "name": Name of the shop
 * - "website": Website URL of the shop
 * - "publishesFishingReport": Boolean string ("true"/"false") indicating if reports are published
 *
 * @returns {Promise<Array<{ name: string, website: string }>>} List of filtered shop info
 */
async function getUrlsFromXLSX() {
  const reader = new ExcelFileHandler("media/xlsx/shop_details.xlsx");

  // Read the Excel file to get URLs for sites that publish fishing reports
  return await reader.read(
    (row) => row["Has Report"] === "true",
    (row) => row["Website"]
  );
}

/**
 * Normalize site URLs and remove duplicates.
 *
 * This function ensures each site object has a normalized URL and
 * that only unique URLs are included in the returned array.
 * Duplicate URLs are detected and logged.
 *
 * @param {Array} sites - Array of site objects with a `url` property.
 * @returns {Array} A new array of site objects with normalized, unique URLs.
 */
async function checkDuplicateUrls(sites) {
  const urlsSet = new Set(); // Track normalized URLs to detect duplicates
  const normalizedSites = []; // Store unique, normalized site objects

  for (const site of sites) {
    const normalized = await normalizeUrl(site.url); // Normalize the URL

    if (!urlsSet.has(normalized)) {
      urlsSet.add(normalized);

      // Add a new site object with the normalized URL
      normalizedSites.push({
        ...site,
        url: normalized,
      });
    } else {
      // Log a warning if the normalized URL was already seen
      console.warn("Duplicate found:", normalized);
    }
  }

  return normalizedSites;
}

/**
 * Checks whether a given URL belongs to the same domain as the base hostname.
 *
 * @param {string} url - The URL to check.
 * @param {string} hostname - The hostname to compare against (e.g., "example.com").
 * @returns {boolean} True if the url's hostname matches the base hostname, false otherwise.
 */
function isSameDomain(url, hostname) {
  try {
    return new URL(url).hostname === hostname;
  } catch {
    return false;
  }
}

/**
 * Checks if any term in the list is included in the target string (case-insensitive).
 *
 * @param {string} target - The string to search in.
 * @param {string[]} terms - List of keywords/phrases/junk words to search for.
 * @returns {boolean} True if any term is found, otherwise false.
 */
function includesAny(target, terms) {
  // if target isn't a string or terms is not an array return false
  if (typeof target !== "string" || !Array.isArray(terms)) return false;

  const lower = target.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

/**
 * Extract all anchor tags with href and normalized text content from the page.
 *
 * @param {import('playwright').Page} page - The Playwright page object.
 * @returns {Promise<{href: string, text: string}[]>} - Array of objects with href and text.
 */
async function extractAnchors(page) {
  return await page.$$eval("a[href]", (anchors) =>
    anchors.map((a) => ({
      href: a.href,
      text: a.textContent?.toLowerCase().trim() || "",
    }))
  );
}

/**
 * Scrapes only visible text from the first matching wrapper element per selector.
 *
 * @param {object} page - Playwright Page object
 * @param {string} selector - CSS selector to match
 * @returns {Promise<string|null>} - Visible text if found, otherwise null
 */
async function scrapeVisibleText(page, selector) {
  // Find the first element on the page that matches the selector
  const element = await page.$(selector);
  if (!element) return null; // No matching element found

  // Evaluate the matched element in the browser context
  return await element.evaluate((node) => {
    // Get computed styles to determine visibility
    const style = window.getComputedStyle(node);
    const isVisible =
      style.display !== "none" && // not display: none
      style.visibility !== "hidden" && // not visibility: hidden
      node.offsetParent !== null; // not detached or invisible due to layout

    // If visible, return cleaned-up inner text (remove extra blank lines)
    return isVisible
      ? node.innerText.trim().replace(/\n{2,}/g, "\n") // condense multiple newlines
      : null; // otherwise return null
  });
}

/**
 * Determines the priority of a link for scraping based on keywords, junk words, and link text.
 *
 * @param {string} currentUrl - The URL of the current page being scraped.
 * @param {string} link - The href value of the link to evaluate.
 * @param {string} linkText - The visible text of the link.
 * @param {Object} siteInfo - Metadata about the site, including keywords and junk words.
 * @returns {number} A numeric priority (lower is higher priority); Infinity means do not follow.
 */
async function getPriority(currentUrl, link, linkText, siteInfo) {
  const currentUrlHasKeyword = includesAny(currentUrl, siteInfo.keywords); // Does the current URL contain a keyword?
  const hasKeyword = includesAny(link, siteInfo.keywords); // Does the link contain a keyword?
  const hasJunkWord = includesAny(link, siteInfo.junkWords); // Does the link contain any junk words?
  const hasClickPhrase = includesAny(linkText, site.clickPhrases); // Does the link text suggest deeper content?

  let priority = Infinity; // Default: do not queue the link

  if (hasKeyword && !hasJunkWord) {
    priority = 0; // Best case: relevant link with no junk
  } else if (currentUrlHasKeyword && hasClickPhrase) {
    priority = 1; // Next best: current page is relevant and link suggests more info
  } else if (hasKeyword && hasJunkWord) {
    priority = 2; // Link is relevant but possibly misleading or lower value
  }

  return priority;
}

/**
 * Filters fishing reports based on date and keywords,
 * and extracts source URLs into the provided array.
 *
 * @param {string[]} reports - Array of report texts.
 * @returns {string[]} Filtered reports that pass the criteria.
 */
function filterReports(reports) {
  return reports.filter((report) => {
    // Get the most recent date from the report text
    const reportDate = extractMostRecentDate(report);
    const reportAgeLimit = parseInt(process.env.MAX_REPORT_AGE, 10) || 100; // Default to 30 days if not set

    // If no dates found exclude it
    if (!reportDate) return false;

    // Exclude reports older than specified number of days
    const daysDifference = differenceInDays(new Date(), reportDate);
    if (daysDifference > reportAgeLimit) return false;

    // Exclude if no important rivers mentioned
    // if (!includesAny(report, process.env.IMPORTANT_RIVERS)) return false;

    return true;
  });
}

function estimateTokenCount(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3); // ~1.3 tokens per word
}

/**
 * Splits the full report text into smaller chunks that stay under the max token limit.
 *
 * Chunks are formed by grouping sections separated by REPORT_DIVIDER.
 * Each chunk will contain as many full sections as possible without exceeding
 * the TOKEN_LIMIT environment variable.
 *
 * @param {string} text - Full fishing report text to be chunked.
 * @returns {string[]} Array of text chunks, each under the token limit.
 */
function chunkReportText(text) {
  const reports = text.split(REPORT_DIVIDER); // Split the text into individual reports
  const chunks = []; // Array to store the final chunks
  const tokenLimit = parseInt(process.env.TOKEN_LIMIT, 10);

  let currentChunk = ""; // Current chunk being built
  let currentTokens = 0; // Estimated token count for the current chunk

  for (const report of reports) {
    const section = report + REPORT_DIVIDER; // Re-add the divider to each section
    const tokens = estimateTokenCount(section); // Estimate tokens in this section

    if (currentTokens + tokens > tokenLimit) {
      // If adding this section exceeds the token limit, finalize the current chunk
      chunks.push(currentChunk.trim());
      currentChunk = section; // Start a new chunk with this section
      currentTokens = tokens;
    } else {
      // Add the section to the current chunk
      currentChunk += section;
      currentTokens += tokens;
    }
  }

  // Push the final chunk if there's any content left
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Initialize the Google GenAI client with your API key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY, // IMPORTANT: Set in environment variables
});

async function generateContent(prompt) {
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL,
    contents: prompt,
  });
  return response.text.trim();
}

export {
  checkDuplicateUrls,
  chunkReportText,
  estimateTokenCount,
  extractAnchors,
  filterReports,
  generateContent,
  getPriority,
  getUrlsFromXLSX,
  includesAny,
  isSameDomain,
  scrapeVisibleText,
};
