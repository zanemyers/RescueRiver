import fs from "fs/promises";

import { extendPageSelectors } from "../base/scrapingUtils.js";
import {
  MESSAGES,
  EMAIL_REGEX,
  SHOP_KEYWORDS,
  SOCIAL_MEDIA_MAP,
} from "../base/enums.js";

/**
 * Adds custome scraper methods directly on the page instance for convenient use during scraping.
 *
 * @param {import('playwright').Page} page - The Playwright page to extend.
 * @returns {Promise<import('playwright').Page>} - The same page instance with added helper methods.
 */
async function addShopSelectors(page) {
  // Add base scraping utils
  await extendPageSelectors(page);

  /**
   * Checks if the page contains any text matching "fishing reports" or "reports" (case-insensitive).
   *
   * @returns {Promise<boolean>} - `true` if the page contains the text, otherwise `false`.
   */
  page.publishesFishingReport = async function () {
    try {
      return await page.hasElementWithKeyword(
        "a",
        "/fishing reports|reports/i"
      );
    } catch {
      return MESSAGES.ERROR_REPORT;
    }
  };

  /**
   * Retrieves a list of social media platforms linked on the page by checking all anchor (`<a>`) elements
   * for hrefs that match domains defined in the `SOCIAL_MEDIA_MAP`.
   *
   * @returns {Promise<string[]>} - A list of social media platform names found on the page,
   *                               or an empty array if none are found.
   */
  page.getSocialMedia = async function () {
    try {
      const hrefs = await page.$$eval("a", (links) =>
        links.map((link) => link.href.toLowerCase())
      );

      const foundSocials = [];
      for (const { domain, name } of SOCIAL_MEDIA_MAP) {
        if (
          hrefs.some((href) => href.includes(domain)) &&
          !foundSocials.includes(name)
        ) {
          foundSocials.push(name);
        }
      }

      return foundSocials.join(", ");
    } catch {
      return MESSAGES.ERROR_SOCIAL;
    }
  };

  /**
   * Retrieves the `href` attribute of the first anchor (`<a>`) element on the page
   * whose `href` contains the word "contact".
   *
   * @returns {Promise<string|null>} - The contact link URL, or null if not found.
   */
  page.getContactLink = async function () {
    try {
      const contactLink = await page.getAttByLocator(
        'a[href*="contact"]',
        "href"
      );
      return contactLink || null;
    } catch {
      return null;
    }
  };

  /**
   * Retrieves the email address from the first anchor (`<a>`) element
   * on the page that contains a `mailto:` link in its `href` attribute.
   *
   * @returns {Promise<string|null>} - The email address extracted from the `href` attribute,
   *                                    or null if no `mailto:` link is found.
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
   * Retrieves the email text content from the page based on a regular expression pattern.
   *
   * @returns {Promise<string|null>} The email text if found, or null if not.
   */
  page.getEmailFromText = async function () {
    try {
      const bodyText = await page.getTextContent("body");
      const match = bodyText
        .replace(/([a-zA-Z])(?=[A-Z])/g, "$1 ")
        .match(EMAIL_REGEX); // insert spaces between mashed-together words
      return match ? match[0] : null;
    } catch {
      return null;
    }
  };

  /**
   * Attempts to retrieve the email address from the page by first checking for a `mailto:` link,
   * then checking the page text, and finally navigating to a contact page if needed.
   *
   * The function follows this order of attempts:
   * 1. Check for email in the first `mailto:` link.
   * 2. If no email is found, check for email in the page text.
   * 3. If still no email is found and not already on the contact page,
   *    navigate to the contact page and try again.
   *
   * @param {boolean} [onContactPage=false] - Flag to indicate whether the function is already on the contact page.
   * @returns {Promise<string>} - The email address, or a predefined message indicating no email is found.
   */
  page.getEmail = async function (onContactPage = false) {
    try {
      // First try to get email from mailto link
      const emailFromHref = await this.getEmailFromHref();
      if (emailFromHref) return emailFromHref;

      // Then try to get email from text content
      const emailFromText = await this.getEmailFromText();
      if (emailFromText) return emailFromText;

      // If not on contact page yet, try to navigate there
      if (!onContactPage) {
        const contactLink = await this.getContactLink();
        if (contactLink) {
          await page.goAndWiggle(contactLink);
          return await this.getEmail(true); // Try again on contact page
        }
      }

      // If all methods failed, return no email message
      return MESSAGES.NO_EMAIL;
    } catch {
      return MESSAGES.ERROR_EMAIL;
    }
  };

  /**
   * Checks if the page contains links or buttons related to an online shop
   *
   * @returns {Promise<boolean>} - `true` if the page contains a link or button related to an online shop,
   *                               `false` otherwise.
   */
  page.hasOnlineShop = async function () {
    try {
      for (const keyword of SHOP_KEYWORDS) {
        // Check if any anchor link contains the keyword text
        const hasLink = await page.hasElementWithKeyword("a", keyword);

        // Check if any button contains the keyword text
        const hasButton = await page.hasElementWithKeyword("button", keyword);

        // If either a link or a button is found with the keyword, return true
        if (hasLink || hasButton) return true;
      }

      // If no matching links or buttons are found, return false
      return false;
    } catch {
      return MESSAGES.ERROR_SHOP;
    }
  };

  return page;
}

/**
 * Tries to load cached shop data from a file.
 * If the metadata in the file matches the expected metadata, returns the cached results.
 *
 * @param {string} filePath - Path to the cache file.
 * @param {object} expectedMeta - Metadata to validate against the cached data.
 * @returns {Promise<object[]|null>} - Cached shop results if valid, otherwise null.
 */
async function loadCachedShops(filePath, expectedMeta) {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const { meta, results } = JSON.parse(data);

    const isMatch = Object.entries(expectedMeta).every(
      ([key, val]) => meta?.[key] === val
    );

    return isMatch ? results : null;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    return null;
  }
}

/**
 * Converts shops and their corresponding details into exportable row objects.
 *
 * @param {Array<object>} shops - The original list of shop objects.
 * @param {Array<object>} shopDetails - The list of additional detail objects.
 * @returns {Array<object>} - An array of row objects for export.
 */
function buildShopRows(shops, shopDetails) {
  if (shops.length !== shopDetails.length)
    throw new Error(
      `Shop count - ${shops.length} ≠ details count - ${shopDetails.length}`
    );

  return shops.map((shop, i) => {
    return {
      Name: shop.title || "",
      Category: shop.type || "",
      Phone: shop.phone || "",
      Email: shopDetails[i].email,
      "Has Website": !!shop.website,
      Website: shop.website || MESSAGES.NO_WEB,
      "Sells Online": shopDetails[i].sellsOnline,
      Rating: shop.rating != null ? `${shop.rating}/5` : "N/A",
      Reviews: shop.reviews || 0,
      "Has Report": shopDetails[i].fishingReport,
      Socials: shopDetails[i].socialMedia,
    };
  });
}

export { addShopSelectors, buildShopRows, loadCachedShops };
