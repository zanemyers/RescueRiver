import { differenceInDays } from "date-fns";
import { GoogleGenAI } from "@google/genai";

import { REPORT_DIVIDER } from "../base/enums.js";
import { normalizeUrl } from "../base/scrapingUtils.js";
import { extractDate } from "../base/dateUtils.js";

// Initialize .env variables
const ageLimit = Math.max(1, parseInt(process.env.MAX_REPORT_AGE, 10) || 30);
const filterByRiver = process.env.FILTER_BY_RIVER === "true";
const importantRivers = JSON.parse(process.env.IMPORTANT_RIVERS ?? "[]") || [];
const tokenLimit = Math.max(100, parseInt(process.env.TOKEN_LIMIT, 10) || 5000);
const aiKey = process.env.GEMINI_API_KEY;
const aiModel = process.env.GEMINI_MODEL;

if (!aiKey || !aiModel) {
  throw new Error("Missing GEMINI_API_KEY or GEMINI_MODEL in .env file");
}

/**
 * Normalize URLs for each site and remove duplicates based on normalized URLs.
 *
 * This async function processes an array of site objects, normalizing each site's URL.
 *
 * @param {Array<{url: string, [key: string]: any}>} sites - Array of site objects, each with a `url` property.
 * @returns {Promise<Array>} A Promise resolving to a new array containing site objects with unique, normalized URLs.
 */
async function checkDuplicateSites(sites) {
  const urlsSet = new Set(); // To keep track of normalized URLs already encountered
  const siteList = []; // Array to accumulate unique sites with normalized URLs

  for (const site of sites) {
    const url = await normalizeUrl(site.url);

    if (!urlsSet.has(url)) {
      // If URL not seen before, add it to the set and push the site with normalized URL to the list
      urlsSet.add(url);
      siteList.push({ ...site, url });
    } else {
      console.warn("Duplicate found:", url);
    }
  }
  return siteList;
}

/**
 * Checks if any string from a list of terms appears within a target string, ignoring case.
 *
 * @param {string} target - The string to search within.
 * @param {string[]} terms - An array of strings to look for inside the target.
 * @returns {boolean} Returns `true` if at least one term is found in the target; otherwise, `false`.
 */
function includesAny(target, terms) {
  // Validate inputs: return false if target is not a string or terms is not an array
  if (typeof target !== "string" || !Array.isArray(terms)) return false;

  // Convert the target string to lowercase for case-insensitive matching
  const lower = target.toLowerCase();

  // Check if any term in the list appears in the target string
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

/**
 * Extracts all anchor (`<a>`) elements from the page that have an `href` attribute,
 * and returns an array of objects containing each anchor's href and normalized text content.
 *
 * @param {Object} page - The Playwright page instance to operate on.
 * @returns {Promise<Array<{href: string, text: string}>>} - Promise resolving to an array of objects,
 * each with:
 *   - `href`: The full URL from the anchor's `href` attribute.
 *   - `text`: The anchor's visible text content
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
 * Scrapes only the visible text content from the first element matching the given CSS selector.
 *
 * @param {Object} page - Playwright Page object representing the browser page.
 * @param {string} selector - CSS selector used to find the target element.
 * @returns {Promise<string|null>} - The cleaned visible text if found; otherwise null.
 */
async function scrapeVisibleText(page, selector) {
  // Attempt to find the first element matching the selector on the page
  const element = await page.$(selector);

  // If no element matches the selector, return null immediately
  if (!element) return null;

  // Evaluate the element within the browser context to check visibility and extract text
  return await element.evaluate((node) => {
    // Retrieve computed CSS scss of the element to determine visibility
    const style = window.getComputedStyle(node);
    const isVisible =
      style.display !== "none" && style.visibility !== "hidden" && node.offsetParent !== null;

    // If the element is visible, return its trimmed inner text
    return isVisible ? node.innerText.trim().replace(/\n{2,}/g, "\n") : null;
  });
}

/**
 * Determines the priority of a hyperlink for scraping based on the presence of
 * keywords, junk words, and specific phrases in the link and its text.
 *
 * @param {string} currentUrl - The URL of the page currently being scraped.
 * @param {string} link - The href URL of the candidate link to evaluate.
 * @param {string} linkText - The visible anchor text of the link.
 * @param {Object} siteInfo - Metadata about the site, including arrays for:
 *   - keywords: relevant terms indicating useful content,
 *   - junkWords: terms that suggest irrelevant or low-value content,
 *   - clickPhrases: phrases that encourage deeper exploration (e.g., "read more").
 * @returns {number} Priority score: 0 (highest), 1, 2, or Infinity (do not follow).
 */
function getPriority(currentUrl, link, linkText, siteInfo) {
  const currentUrlHasKeyword = includesAny(currentUrl, siteInfo.keywords); // Check the current URL for relevant keywords
  const hasKeyword = includesAny(link, siteInfo.keywords); // Check the candidate link for relevant keywords
  const hasJunkWord = includesAny(link, siteInfo.junkWords); // Check the candidate link for junk words
  const hasClickPhrase = includesAny(linkText, siteInfo.clickPhrases); // Check the link text for phrases suggesting more content

  // Default priority: do not follow (infinite priority)
  let priority = Infinity;

  // Highest priority: link is relevant and not junk
  if (hasKeyword && !hasJunkWord) {
    priority = 0;
  }
  // Next priority: current page is relevant and link text suggests more content
  else if (currentUrlHasKeyword && hasClickPhrase) {
    priority = 1;
  }
  // Lower priority: link is relevant but also contains junk terms
  else if (hasKeyword && hasJunkWord) {
    priority = 2;
  }

  return priority;
}

/**
 * Filters an array of report texts based on recency and keywords.
 *
 * Criteria applied:
 * - Only includes reports with a detectable date.
 * - Excludes reports older than the configured age limit (in days).
 * - Optionally filters to include only reports mentioning important rivers.
 *
 * @param {string[]} reports - Array of raw report texts.
 * @returns {string[]} Array of reports that meet the filtering criteria.
 */
function filterReports(reports) {
  const today = new Date();

  return reports.filter((report) => {
    // Extract the most recent date found in the report text
    const reportDate = extractDate(report);

    // Skip reports without a valid date
    if (!reportDate) return false;

    // Exclude reports older than the allowed age limit
    if (differenceInDays(today, reportDate) > ageLimit) return false;

    // If filtering by river is enabled, exclude reports that do not mention any important rivers
    if (filterByRiver && !includesAny(report, importantRivers)) return false;

    // If the report passed all filters, include it
    return true;
  });
}

/**
 * Estimates the approximate token count of a given text.
 *
 * This uses a rough heuristic that 1 word ≈ 1.3 tokens.
 *
 * @param {string} text - Input text whose tokens need to be estimated.
 * @returns {number} Estimated number of tokens.
 */
function estimateTokenCount(text) {
  // Count words by splitting on whitespace after trimming
  const words = text?.trim()?.split(/\s+/).length || 0;

  // Multiply by 1.3 and round up
  return Math.ceil(words * 1.3);
}

/**
 * Splits the full report text into smaller chunks, each staying within the token limit.
 *
 * The input text is divided into sections using the REPORT_DIVIDER string.
 * Each chunk will contain as many full sections as possible without exceeding
 * the token limit.
 *
 * @param {string} text - The complete report text to be chunked.
 * @returns {string[]} An array of text chunks, each under the token limit.
 */
function chunkReportText(text) {
  // Split the text on the REPORT_DIVIDER
  const reports = text.split(REPORT_DIVIDER);
  const chunks = []; // Array to store the final text chunks

  let currentChunk = ""; // Accumulates the current chunk's text
  let currentTokens = 0; // Tracks the estimated token count of currentChunk

  for (const report of reports) {
    // Re-add the REPORT_DIVIDER to preserve section separation in each chunk
    const section = report + REPORT_DIVIDER;

    // Estimate the token count for this section of text
    const tokens = estimateTokenCount(section);

    // If adding this section would exceed the token limit,
    // finalize the current chunk and start a new one
    if (currentTokens + tokens > tokenLimit) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = section; // Start a new chunk with the current section
      currentTokens = tokens;
    } else {
      // Otherwise, add this section to the current chunk
      currentChunk += section;
      currentTokens += tokens;
    }
  }

  // Add the last chunk if it contains any content
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Initialize the Google GenAI client with your API key
const ai = new GoogleGenAI({ apiKey: aiKey });

/**
 * Generates content using the Google GenAI model.
 *
 * @param {string} prompt - The input prompt to generate content from.
 * @returns {Promise<string>} The generated text content, or an empty string on failure.
 */
async function generateContent(prompt) {
  try {
    // Send the request to the AI model with the provided prompt
    const response = await ai.models.generateContent({
      model: aiModel,
      contents: prompt,
    });
    // Return the trimmed text response or an empty string if undefined
    return response?.text?.trim() || "";
  } catch (error) {
    console.error("AI content generation failed:", error);
    return "";
  }
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
