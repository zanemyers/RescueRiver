/**
 * Constants and utilities used across scraping logic, including patterns for matching data,
 * standardized messages, keyword lists, and known social media mappings.
 */

// Common block/forbidden related keywords used to detect if the site blocked us
const BLOCKED_FORBIDDEN = [
  "Access Denied",
  "Forbidden",
  "Too Many Requests",
  "Error 403",
  "Access Blocked",
  "You have been rate limited",
];

// Regex pattern to match email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

// Common e-commerce-related keywords used to detect if a website is a shop
const SHOP_KEYWORDS = ["shop", "store", "buy", "products", "cart", "checkout"];

// Mapping of domain names to social media platform names
// Includes aliases (e.g., wa.me → WhatsApp, twitter.com → X)
const SOCIAL_MEDIA_MAP = [
  { domain: "facebook.com", name: "Facebook" },
  { domain: "instagram.com", name: "Instagram" },
  { domain: "linkedin.com", name: "LinkedIn" },
  { domain: "tiktok.com", name: "TikTok" },
  { domain: "vimeo.com", name: "Vimeo" },
  { domain: "whatsapp.com", name: "WhatsApp" },
  { domain: "wa.me", name: "WhatsApp" },
  { domain: "x.com", name: "X (Twitter)" },
  { domain: "twitter.com", name: "X (Twitter)" },
  { domain: "youtube.com", name: "YouTube" },
];

// Standardized error and not-found messages for consistency in logging and reporting
const MESSAGES = {
  // ERROR MESSAGES
  ERROR_SCROLL_TIMEOUT: (time) =>
    `Scroll Timeout: Reached ${time / 1000} seconds without seeing end-of-list message.`,
  ERROR_BLOCKED_FORBIDDEN: (status) => `BLOCKED_OR_FORBIDDEN (HTTP ${status})`,
  ERROR_EMAIL: "ERROR_CHECKING_EMAIL",
  ERROR_LOAD_FAILED: "PAGE_LOAD_FAILED",
  ERROR_NAME: "ERROR_CHECKING_NAME",
  ERROR_REPORT: "ERROR_CHECKING_REPORT",
  ERROR_SHOP: "ERROR_CHECKING_SHOP",
  ERROR_SOCIAL: "ERROR_CHECKING_SOCIAL",

  // NOT FOUND MESSAGES
  NO_CATEGORY: "NO_CATEGORY_FOUND",
  NO_EMAIL: "NO_EMAIL_FOUND",
  NO_PHONE: "NO_PHONE_NUMBER_FOUND",
  NO_REVIEWS: "NO_REVIEWS_FOUND",
  NO_STARS: "NO_STARS_FOUND",
  NO_WEB: "NO_WEBSITE",
};

// Fallback details object for shops that do not have any information
const FALLBACK_DETAILS = {
  BLOCKED: (status) => ({
    email: MESSAGES.ERROR_BLOCKED_FORBIDDEN(status),
    sellsOnline: MESSAGES.ERROR_BLOCKED_FORBIDDEN(status),
    fishingReport: MESSAGES.ERROR_BLOCKED_FORBIDDEN(status),
    socialMedia: MESSAGES.ERROR_BLOCKED_FORBIDDEN(status),
  }),
  ERROR: {
    email: MESSAGES.ERROR_EMAIL,
    sellsOnline: MESSAGES.ERROR_SHOP,
    fishingReport: MESSAGES.ERROR_REPORT,
    socialMedia: MESSAGES.ERROR_SOCIAL,
  },
  NONE: {
    email: "",
    sellsOnline: false,
    fishingReport: false,
    socialMedia: "",
  },
  TIMEOUT: {
    email: MESSAGES.ERROR_LOAD_FAILED,
    sellsOnline: MESSAGES.ERROR_LOAD_FAILED,
    fishingReport: MESSAGES.ERROR_LOAD_FAILED,
    socialMedia: MESSAGES.ERROR_LOAD_FAILED,
  },
};

// Divider between individual reports for readability
const REPORT_DIVIDER = "\n" + "-".repeat(50) + "\n";

const SUMMARY_PROMPT = `
  For each river or body of water mentioned, create a bulleted list that follows the template below.
  - If you cannot find information for a bullet, leave it blank.
  - If the body of water is mentioned more than once, summarize the info into a single entry, with each of the 3 most recent dates broken out separately.
  - If a date is in the body of the text and not in the date field, move it to the date field.
  - If an article contains reports for multiple bodies of water, break them into separate entries based on the body of water.
  - If a river has multiple water types, list all of them next to the body of water's name.

  # 1. Madison River (Water Type/s, e.g., river, lake, reservoir, creek, fork)
    * Date: June 19, 2025
      * Fly Patterns: ...
      * Colors: ...
      * Hook Sizes: ...
    * Date: June 13, 2025
      * Fly Patterns: ...
      * Colors: ...
      * Hook Sizes: ...
    * Date: June 12, 2025
      * Fly Patterns: ...
      * Colors: ...
      * Hook Sizes: ...
  # 2. Snake River (river)
    * Date:...
      * Fly Patterns: ...
      * Colors: ...
      * Hook Sizes: ...
  `;

const MERGE_PROMPT = `
  The following are summaries of fishing reports broken into sections.
  Please consolidate the information into a single summary using the same format, listing up to the 3 most recent dates separately for each body of water:
  `;

// Export all constants for use in other modules
export {
  BLOCKED_FORBIDDEN,
  EMAIL_REGEX,
  FALLBACK_DETAILS,
  MERGE_PROMPT,
  MESSAGES,
  REPORT_DIVIDER,
  SHOP_KEYWORDS,
  SOCIAL_MEDIA_MAP,
  SUMMARY_PROMPT,
};
