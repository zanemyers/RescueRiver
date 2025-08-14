import { differenceInDays } from "date-fns";

import { REPORT_DIVIDER } from "../base/constants/index.js";
import { extractDate, normalizeUrl } from "../base/index.js";

/**
 * Normalize URLs for each site and remove duplicates based on the normalized URLs.
 *
 * @param {Array<{url: string, [key: string]: any}>} sites - Array of site objects with a `url` property.
 * @returns {Promise<Array<{url: string, [key: string]: any}>>} Promise resolving to an array of unique sites with normalized URLs.
 */
async function checkDuplicateSites(sites) {
  const urlsSet = new Set(); // Normalized URLs that have been processed
  const siteList = []; // Unique site objects with normalized URLs

  for (const site of sites) {
    const url = normalizeUrl(site.url);

    if (!urlsSet.has(url)) {
      urlsSet.add(url);
      siteList.push({ ...site, url }); // Add a copy of the site object with the normalized URL
    } else {
      console.warn("Duplicate found:", url); // Log duplicate URLs
    }
  }
  return siteList;
}

/**
 * Checks whether the target string contains any of the specified terms, case-insensitively.
 *
 * @param {string} target - The string to search within.
 * @param {string[]} terms - Array of terms to search for in the target string.
 * @returns {boolean} True if any term is found in the target; otherwise false.
 */
function includesAny(target, terms) {
  if (typeof target !== "string" || !Array.isArray(terms)) return false;

  const lower = target.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

/**
 * Retrieves all anchor (`<a>`) elements with an `href` attribute from the page,
 *
 * @param {Object} page - Playwright page instance to extract anchors from.
 * @returns {Promise<Array<{href: string, text: string}>>} Promise resolving to an array of objects where:
 *   - `href`: The full URL of the anchor's `href` attribute.
 *   - `text`: The anchor's visible text content, lowercased and trimmed.
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
 * Scrapes the visible text content from the first element that matches the specified CSS selector.
 *
 * @param {Object} page - Playwright Page instance representing the browser page.
 * @param {string} selector - CSS selector to find the target element.
 * @returns {Promise<string|null>} Promise resolving to the cleaned visible text if found; otherwise, null.
 */
async function scrapeVisibleText(page, selector) {
  const element = await page.$(selector);
  if (!element) return null;

  // Evaluate visibility and extract text within the browser context
  return await element.evaluate((node) => {
    const style = window.getComputedStyle(node);
    const isVisible =
      style.display !== "none" && style.visibility !== "hidden" && node.offsetParent !== null;

    // If visible, return trimmed innerText with consecutive newlines replaced by single newlines
    return isVisible ? node.innerText.trim().replace(/\n{2,}/g, "\n") : null;
  });
}

/**
 * Determines the priority score for a hyperlink to guide scraping order.
 *
 * @param {string} currentUrl - The URL of the page currently being scraped.
 * @param {string} link - The href URL of the candidate link to evaluate.
 * @param {string} linkText - The visible anchor text of the link.
 * @param {Object} siteInfo - Site metadata containing:
 *   - keywords: array of relevant keywords indicating valuable content,
 *   - junkWords: array of terms indicating irrelevant or low-value content,
 *   - clickPhrases: array of phrases that encourage following the link (e.g., "read more").
 * @returns {number} Priority score where:
 *   - 0 means highest priority (follow immediately),
 *   - 1 means medium priority,
 *   - 2 means low priority,
 *   - Infinity means do not follow.
 */
function getPriority(currentUrl, link, linkText, siteInfo) {
  const currentUrlHasKeyword = includesAny(currentUrl, siteInfo.keywords); // Check if current URL contains keywords
  const hasKeyword = includesAny(link, siteInfo.keywords); // Check if link URL contains keywords
  const hasJunkWord = includesAny(link, siteInfo.junkWords); // Check if link URL contains junk words
  const hasClickPhrase = includesAny(linkText, siteInfo.clickPhrases); // Check if anchor text contains click phrases

  let priority = Infinity; // Default: do not follow

  if (hasKeyword && !hasJunkWord) {
    priority = 0; // Highest priority: relevant link without junk words
  } else if (currentUrlHasKeyword && hasClickPhrase) {
    priority = 1; // Medium priority: current URL relevant and link text invites clicking
  } else if (hasKeyword && hasJunkWord) {
    priority = 2; // Low priority: relevant link but contains junk terms
  }

  return priority;
}

/**
 * Filters an array of report texts based on recency and content keywords.
 *
 * Applies the following criteria to each report:
 * - Includes only reports with a valid, detectable date.
 * - Excludes reports older than the specified maximum age (in days).
 * - Optionally filters reports to include only those mentioning rivers from a given list.
 *
 * @param {string[]} reports - Array of raw report text strings to filter.
 * @param {number} maxAge - Maximum allowed age of reports in days.
 * @param {boolean} filterByRivers - Whether to filter reports by river mentions.
 * @param {string[]} riverList - List of river names to match against reports when filtering by rivers.
 * @returns {string[]} Filtered array containing only reports meeting all criteria.
 */
function filterReports(reports, maxAge, filterByRivers, riverList) {
  const today = new Date();

  return reports.filter((report) => {
    const reportDate = extractDate(report);

    if (!reportDate) return false;
    if (differenceInDays(today, reportDate) > maxAge) return false;
    if (filterByRivers && !includesAny(report, riverList)) return false;
    return true;
  });
}

/**
 * Estimates the approximate number of tokens in the given text.
 * - Uses a heuristic that one word corresponds to about 1.3 tokens.
 *
 * @param {string} text - The input text to estimate token count for.
 * @returns {number} Estimated token count based on word count.
 */
function estimateTokenCount(text) {
  // Split the trimmed text into words by whitespace
  const words = text?.trim()?.split(/\s+/).length || 0;
  return Math.ceil(words * 1.3); // Multiply the word count by 1.3 and round up
}

/**
 * Splits the full report text into smaller chunks, each staying within the token limit.
 *
 * The input text is divided into sections using the REPORT_DIVIDER string.
 * Each chunk accumulates as many full sections as possible without exceeding
 * the specified token limit.
 *
 * @param {string} text - The complete report text to be split into chunks.
 * @param {number} tokenLimit - Maximum number of tokens allowed per chunk.
 * @returns {string[]} An array of text chunks, each under the token limit.
 */
function chunkReportText(text, tokenLimit) {
  const reports = text.split(REPORT_DIVIDER);
  const chunks = []; // Array to hold resulting text chunks

  let currentChunk = ""; // Holds the accumulated text for the current chunk
  let currentTokens = 0; // Estimated token count of currentChunk

  for (const report of reports) {
    // Re-add REPORT_DIVIDER to preserve section separation in chunks
    const section = report + REPORT_DIVIDER;
    const tokens = estimateTokenCount(section);

    // If adding this section exceeds token limit, push current chunk and start a new one
    if (currentTokens + tokens > tokenLimit) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = section; // Start new chunk with current section
      currentTokens = tokens;
    } else {
      // Otherwise, append section to current chunk
      currentChunk += section;
      currentTokens += tokens;
    }
  }

  // Add any remaining chunk after loop ends
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generates text content from the Google GenAI model based on the given prompt.
 *
 * @param {GoogleGenAI} ai - Instance of the GoogleGenAI client.
 * @param {string} model - The name or identifier of the AI model to use.
 * @param {string} prompt - The input prompt guiding the content generation.
 * @returns {Promise<string>} Resolves with the generated text, or an empty string if generation fails.
 */
async function generateContent(ai, model, prompt) {
  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
  });

  return response?.text?.trim() || "";
}

export {
  checkDuplicateSites,
  chunkReportText,
  estimateTokenCount,
  extractAnchors,
  filterReports,
  generateContent,
  getPriority,
  includesAny,
  scrapeVisibleText,
};
