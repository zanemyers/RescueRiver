import { MESSAGES } from "./_messages.js";

/**
 * Regular expression pattern to match email addresses in text.
 * Matches standard email formats like "user@example.com".
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;

/**
 * Keywords commonly associated with e-commerce or online shops.
 */
const SHOP_KEYWORDS = ["shop", "store", "buy", "products", "cart", "checkout"];

/**
 * Mapping of known social media domains to human-readable platform names.
 * Includes domain aliases to cover multiple URL variations (e.g., wa.me → WhatsApp, x.com → X/Twitter).
 */
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

/**
 * Standardized fallback detail objects for shops when data cannot be retrieved.
 * Categories include:
 * - BLOCKED: Site blocked or forbidden (with HTTP status), returns error messages for all fields.
 * - ERROR: General errors encountered during scraping.
 * - NONE: Explicitly empty/default values when no data is found.
 * - TIMEOUT: Page load failures.
 */
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

export { EMAIL_REGEX, FALLBACK_DETAILS, SHOP_KEYWORDS, SOCIAL_MEDIA_MAP };
