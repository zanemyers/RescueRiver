/**
 * Standardized messages used throughout the scraper for consistent error handling and reporting.
 *
 * - Error messages indicate failures during scraping operations, such as timeouts, blocked pages,
 *   or missing data.
 * - "Not found" messages provide default values when expected data is missing on a page.
 */
const MESSAGES = {
  // ERROR MESSAGES
  ERROR_SCROLL_TIMEOUT: (time) =>
    `Scroll Timeout: Reached ${time / 1000} seconds without seeing end-of-list message.`,
  ERROR_BLOCKED_FORBIDDEN: (status) => `Blocked or Forbidden link (HTTP ${status})`,
  ERROR_EMAIL: "Errored while checking for an email",
  ERROR_LOAD_FAILED: "Page load failed",
  ERROR_REPORT: "Errored while checking for reports",
  ERROR_SHOP: "Errored while checking for an online shop",
  ERROR_SOCIAL: "Error while checking for social media",

  // NOT FOUND MESSAGES
  NO_CATEGORY: "No Category",
  NO_EMAIL: "No Email",
  NO_PHONE: "No Phone Number",
  NO_REVIEWS: "No Reviews",
  NO_STARS: "No Stars",
  NO_WEB: "No Website",
};

export { MESSAGES };
