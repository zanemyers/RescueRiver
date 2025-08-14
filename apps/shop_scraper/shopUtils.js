import { EMAIL_REGEX, MESSAGES, SHOP_KEYWORDS, SOCIAL_MEDIA_MAP } from "../base/constants/index.js";

/**
 * Enhances a Playwright `Page` instance with custom scraping helper methods
 * for extracting specific shop-related data
 *
 * @param {import('playwright').Page} page - The Playwright page instance to extend.
 * @returns {Promise<import('playwright').Page>} - The same page instance with added helper methods.
 */
async function addShopSelectors(page) {
  /**
   * Checks if the page contains a hyperlink (`<a>`) with the keyword "report" (case-insensitive).
   *
   * @returns {Promise<boolean|string>} - `true` if found, `false` if not,
   *                                       or an error message on failure.
   */
  page.publishesFishingReport = async function () {
    try {
      return await page.hasElementWithKeyword("a", "report");
    } catch {
      return MESSAGES.ERROR_REPORT;
    }
  };

  /**
   * Detects linked social media platforms by scanning all `<a>` tags for domains
   * listed in `SOCIAL_MEDIA_MAP`.
   *
   * @returns {Promise<string|string[]>} - A comma-separated list of platforms found,
   *                                       an empty string if none found,
   *                                       or an error message on failure.
   */
  page.getSocialMedia = async function () {
    try {
      const hrefs = await page.$$eval("a", (links) => links.map((link) => link.href.toLowerCase()));

      const foundSocials = [];
      for (const { domain, name } of SOCIAL_MEDIA_MAP) {
        if (hrefs.some((href) => href.includes(domain)) && !foundSocials.includes(name)) {
          foundSocials.push(name);
        }
      }

      return foundSocials.join(", ");
    } catch {
      return MESSAGES.ERROR_SOCIAL;
    }
  };

  /**
   * Finds the first `<a>` element whose `href` contains "contact"
   * and returns its absolute URL.
   *
   * @returns {Promise<string|null>} - The contact page URL or `null` if not found.
   */
  page.getContactLink = async function () {
    try {
      const href = await page.getAttByLocator('a[href*="contact"]', "href");
      if (!href) return null;

      return new URL(href, page.url()).toString();
    } catch {
      return null;
    }
  };

  /**
   * Extracts the email address from the first `mailto:` link found in an `<a>` tag.
   *
   * @returns {Promise<string|null>} - The email address, or `null` if none found.
   */
  page.getEmailFromHref = async function () {
    try {
      const email = await page.getAttByLocator('a[href^="mailto:"]', "href");
      return email ? email.replace("mailto:", "").split("?")[0] : null;
    } catch {
      return null;
    }
  };

  /**
   * Searches the page body text for an email address using `EMAIL_REGEX`.
   *
   * @returns {Promise<string|null>} - The email if found, otherwise `null`.
   */
  page.getEmailFromText = async function () {
    try {
      const fullText = await page.locator("body").innerText();
      const match = fullText.match(EMAIL_REGEX);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  };

  /**
   * Retrieves an email address using a tiered approach:
   * 1. Check for a `mailto:` link.
   * 2. Search page text.
   * 3. If still not found, navigate to the contact page (if available) and retry.
   *
   * @param {boolean} [onContactPage=false] - Prevents infinite recursion when already on contact page.
   * @returns {Promise<string>} - Email address found, or a predefined "no email" or error message.
   */
  page.getEmail = async function (onContactPage = false) {
    try {
      const emailFromHref = await this.getEmailFromHref();
      if (emailFromHref) return emailFromHref;

      const emailFromText = await this.getEmailFromText();
      if (emailFromText) return emailFromText;

      if (!onContactPage) {
        const contactLink = await this.getContactLink();
        if (contactLink) {
          await page.load(contactLink);
          return await this.getEmail(true);
        }
      }

      return MESSAGES.NO_EMAIL;
    } catch {
      return MESSAGES.ERROR_EMAIL;
    }
  };

  /**
   * Checks if the page contains keywords related to an online shop
   * in either `<a>` or `<button>` elements.
   *
   * @returns {Promise<boolean|string>} - `true` if found, `false` if not,
   *                                       or an error message on failure.
   */
  page.hasOnlineShop = async function () {
    try {
      for (const keyword of SHOP_KEYWORDS) {
        const hasLink = await page.hasElementWithKeyword("a", keyword);
        const hasButton = await page.hasElementWithKeyword("button", keyword);

        if (hasLink || hasButton) return true;
      }
      return false;
    } catch {
      return MESSAGES.ERROR_SHOP;
    }
  };

  return page;
}

/**
 * Combines base shop data with scraped details to create a list of export-ready row objects.
 *
 * @param {Array<object>} shops - The base shop data, each containing title, type, phone, etc.
 * @param {Array<object>} shopDetails - The scraped or cached details for each shop.
 * @returns {Array<object>} A new array of objects formatted for export (e.g., to CSV or Excel).
 *
 * @throws {Error} If `shops` and `shopDetails` have mismatched lengths.
 */
function buildShopRows(shops, shopDetails) {
  if (shops.length !== shopDetails.length)
    // ensure both arrays are the same length
    throw new Error(`Shop count - ${shops.length} ≠ details count - ${shopDetails.length}`);

  return shops.map((shop, i) => {
    return {
      Name: shop.title || "",
      Category: shop.type || "",
      Phone: shop.phone || "",
      Address: shop.address || "",
      Email: shopDetails[i]?.email || "",
      "Has Website": !!shop.website,
      Website: shop.website || MESSAGES.NO_WEB,
      "Sells Online": shopDetails[i]?.sellsOnline || "",
      Rating: shop.rating != null ? `${shop.rating}/5` : "N/A",
      Reviews: shop.reviews || 0,
      "Has Report": shopDetails[i]?.fishingReport || "",
      Socials: shopDetails[i]?.socialMedia || [],
    };
  });
}

/**
 * Formats a list of shop objects into simplified row data for the intermediate file.
 *
 * @param {Array<object>} shops - The list of shop objects to format.
 * @returns {Array<object>} A new array of objects formatted for export (e.g., to CSV or Excel).
 */
function buildCacheFileRows(shops) {
  if (shops.length === 0) return [];

  return shops.map((shop) => {
    return {
      Name: shop.title || "",
      Category: shop.type || "",
      Phone: shop.phone || "",
      Address: shop.address || "",
      "Has Website": !!shop.website,
      Website: shop.website || MESSAGES.NO_WEB,
      Rating: shop.rating != null ? `${shop.rating}/5` : "N/A",
      Reviews: shop.reviews || 0,
    };
  });
}

export { addShopSelectors, buildCacheFileRows, buildShopRows };
