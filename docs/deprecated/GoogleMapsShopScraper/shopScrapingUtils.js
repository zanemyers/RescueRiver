import { extendPageSelectors } from "../base/scrapingUtils.js";
import {
  MESSAGES,
  EMAIL_REGEX,
  PHONE_REGEX,
  REVIEW_COUNT_REGEX,
  SHOP_KEYWORDS,
  SOCIAL_MEDIA_MAP,
  STARS_REGEX,
} from "../base/enums.js";

async function addShopSelectors(page) {
  // Add base scraping utils
  await extendPageSelectors(page);

  /**
   * Retrieves the shop name from the page by extracting text content from the header element.
   *
   * @returns {Promise<string|null>} - The shop name text, or null if not found.
   */
  page.getShopName = async function () {
    try {
      const name = await page.getTextContent("h1");
      return name || MESSAGES.ERROR_NAME;
    } catch (err) {
      return MESSAGES.ERROR_NAME;
    }
  };

  /**
   * Retrieves the shop category from the page by extracting text content from the element
   * with a `jsaction` attribute containing "category".
   *
   * @returns {Promise<string|null>} - The shop category text, or null if not found.
   */
  page.getShopCategory = async function () {
    try {
      const category = await page.getTextContent('[jsaction*="category"]');
      return category || MESSAGES.NO_CATEGORY;
    } catch (err) {
      return MESSAGES.NO_CATEGORY;
    }
  };

  /**
   * Retrieves the shop's phone number by extracting the `data-item-id` attribute
   * from an element whose `aria-label` contains "Phone: ", then matching it against a phone number pattern.
   *
   * @returns {Promise<string|null>} - The extracted phone number, or null if not found or invalid.
   */
  page.getShopPhone = async function () {
    try {
      const phoneId = await page.getAttByLabel("Phone: ", "data-item-id");
      const phoneNumber = phoneId ? phoneId.match(PHONE_REGEX) : null;

      return phoneNumber ? phoneNumber[0] : MESSAGES.NO_PHONE;
    } catch (err) {
      return MESSAGES.NO_PHONE;
    }
  };

  /**
   * Retrieves the shop's website URL by locating an element whose `aria-label` starts with "Website: ",
   * and extracting its `href` attribute.
   *
   * @returns {Promise<string|null>} - The website URL, or null if not found.
   */
  page.getShopWebsite = async function () {
    try {
      const website = await page.getAttByLabel("Website: ", "href");
      return website || MESSAGES.NO_WEB;
    } catch (err) {
      return MESSAGES.NO_WEB;
    }
  };

  /**
   * Retrieves the number of stars from the page by extracting text content from a `span` element
   * that matches the provided `STARS_REGEX` pattern.
   *
   * @returns {Promise<number|null>} - The number of stars as a float, or null if not found or invalid.
   */
  page.getShopStars = async function () {
    try {
      const stars = await page.getTextContent("span", { hasText: STARS_REGEX });
      return stars ? parseFloat(stars) : MESSAGES.NO_STARS;
    } catch (err) {
      return MESSAGES.NO_STARS;
    }
  };

  /**
   * Retrieves the number of reviews from the page by extracting the `aria-label` attribute
   * from an element whose `aria-label` contains the word "reviews", then matching it against the `REVIEW_COUNT_REGEX` pattern.
   *
   * @returns {Promise<number|null>} - The number of reviews as an integer, or null if not found or invalid.
   */
  page.getShopReviewCount = async function () {
    try {
      const label = await page.getAttByLabel("reviews", "aria-label");
      const reviewCount = label?.trim().match(REVIEW_COUNT_REGEX);

      return reviewCount ? parseInt(reviewCount[1], 10) : MESSAGES.NO_REVIEWS;
    } catch (err) {
      return MESSAGES.NO_REVIEWS;
    }
  };

  /**
   * Checks if the page contains any text matching "fishing reports" or "reports" (case-insensitive).
   *
   * @returns {Promise<boolean>} - `true` if the page contains the text, otherwise `false`.
   */
  page.publishesFishingReport = async function () {
    try {
      return (
        (await page.locator("text=/fishing reports|reports/i").count()) > 0
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

      return foundSocials;
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
      return email ? email.replace("mailto:", "") : null;
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
      const match = bodyText?.match(EMAIL_REGEX);
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
          await page.goto(contactLink);
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
   * by searching for specific keywords in anchor (`<a>`) and button (`<button>`) elements.
   *
   * The function iterates over the `SHOP_KEYWORDS` list (e.g., "shop", "store", "buy", etc.)
   * and uses the helper function `hasElementWithKeyword` to check if any of the keywords
   * are found in anchor links (`<a>`) or buttons (`<button>`) on the page.
   * If any matching element is found, the function returns `true`, indicating the presence
   * of an online shop on the page. Otherwise, it returns `false`.
   *
   * @returns {Promise<boolean>} - `true` if the page contains a link or button related to an online shop,
   *                               `false` otherwise.
   */
  page.hasOnlineShop = async function () {
    try {
      // Loop through each keyword in the SHOP_KEYWORDS array to check for matching links or buttons
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
}

export { addShopSelectors };
