/**
 * Utility functions to enhance Playwright page interactions and normalize URLs.
 *
 * This module includes:
 * - `extendPageSelectors(page)`: Augments the given Playwright `page` object with custom helper methods for
 *   selecting and extracting data from elements more easily.
 *   - getAttByLocator: Gets an attribute from the first matching element.
 *   - getAttByLabel: Gets an attribute from an element by aria-label text.
 *   - getTextContent: Retrieves text content of the first matching element.
 *   - hasElementWithKeyword: Checks for the presence of an element containing specific text.
 *
 * - `normalizeUrl(url)`: Cleans up a URL by removing query strings, hashes, 'www.', and trailing slashes,
 *   returning a consistent and canonical form.
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Enable plugins
chromium.use(StealthPlugin());

class StealthBrowser {
  constructor(options = {}) {
    this.headless = options.headless ?? true;
    this.args = options.args ?? ["--start-maximized", "--no-sandbox"];

    const agentProfile = this._getAgentProfile();
    this.userAgent = options.userAgent ?? agentProfile.userAgent;
    this.locale = options.locale ?? agentProfile.locale;
    this.timezoneId = options.timezoneId ?? agentProfile.timezoneId;

    this.browser = null;
    this.context = null;
  }

  async launch() {
    this.browser = await chromium.launch({
      headless: this.headless,
      args: this.args,
    });

    this.context = await this.browser.newContext({
      viewport: this._getViewport(),
      userAgent: this.userAgent,
      locale: this.locale,
      timezoneId: this.timezoneId,
    });

    return this;
  }

  async _customActions(page) {
    // Simulate user interaction
    page.simulateUserInteraction = async function () {
      await page.mouse.move(100, 100);
      await page.mouse.move(200, 300);
      await page.mouse.click(200, 300);
    };

    // Add goAndWiggle method to page
    page.goAndWiggle = async function (url) {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });
      await page.simulateUserInteraction();
      return response;
    };
  }

  _getAgentProfile() {
    const agentProfiles = [
      {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        locale: "en-US",
        timezoneId: "America/New_York",
      },
      {
        userAgent:
          "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:114.0) Gecko/20100101 Firefox/114.0",
        locale: "de-DE",
        timezoneId: "Europe/Berlin",
      },
      {
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        locale: "en-GB",
        timezoneId: "Europe/London",
      },
      {
        userAgent:
          "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36",
        locale: "en-CA",
        timezoneId: "America/Toronto",
      },
    ];

    return agentProfiles[Math.floor(Math.random() * agentProfiles.length)];
  }

  _getViewport() {
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1920, height: 1080 },
      { width: 1280, height: 800 },
    ];

    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  async newPage() {
    const page = await this.context.newPage();
    await this._customActions(page);
    return page;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function extendPageSelectors(page) {
  /**
   * Retrieves the value of a specified attribute from the first matching element located by the given selector,
   * with optional filtering conditions.
   *
   * @param {string} locator - The selector used to locate the element.
   * @param {string} attribute - The name of the attribute to retrieve.
   * @param {Object} [filter={}] - Optional filter options to narrow down matching elements.
   * @returns {Promise<string|null>} - The value of the attribute, or null if not found.
   */
  page.getAttByLocator = async function (locator, attribute, filter = {}) {
    const value = page
      .locator(locator, { timeout: 1000 })
      .filter(filter)
      .first()
      .getAttribute(attribute, { timeout: 1000 });
    return value || null;
  };

  /**
   * Retrieves the value of a specified attribute from the first element
   * whose `aria-label` contains the given text, with optional filtering conditions.
   *
   * @param {string} label - Partial or full value of the `aria-label` attribute to match.
   * @param {string} attribute - The name of the attribute to retrieve.
   * @param {Object} [filter={}] - Optional filter options to further narrow down matching elements.
   * @returns {Promise<string|null>} - The value of the attribute, or null if not found.
   */
  page.getAttByLabel = async function (label, attribute, filter = {}) {
    return await page.getAttByLocator(
      `[aria-label*="${label}"]`,
      attribute,
      filter
    );
  };

  /**
   * Retrieves the text content of the first element matching the given selector,
   * with optional filtering conditions.
   *
   * @param {string} locator - The selector used to locate the element.
   * @param {Object} [filter={}] - Optional filter options to narrow down matching elements.
   * @returns {Promise<string|null>} - The text content of the element, or null if not found.
   */
  page.getTextContent = async function (locator, filter = {}) {
    return await page
      .locator(locator, { timeout: 1000 })
      .filter(filter)
      .first()
      .textContent();
  };

  /**
   * Checks if an element (e.g., link or button) containing the specified keyword exists on the page.
   *
   * This function searches for the given `element` type (e.g., `a`, `button`) that contains
   * the specified `keyword` text. It returns `true` if at least one matching element is found,
   * and `false` if no matching elements are found or an error occurs during the check.
   *
   * @param {string} element - The type of element to search for (e.g., 'a' for links, 'button' for buttons).
   * @param {string} keyword - The text to search for within the element.
   * @returns {Promise<boolean>} - `true` if an element containing the keyword is found,
   *                               `false` otherwise or if an error occurs.
   */
  page.hasElementWithKeyword = async function (element, keyword) {
    return await page
      .locator(`${element}:has-text("${keyword}")`)
      .count()
      .then((count) => count > 0) // Return true if at least one matching element is found
      .catch(() => false); // Return false in case of any error
  };
}

/**
 * Normalizes a given URL by:
 * - Removing hash fragments and query strings (search parameters).
 * - Handling the root path and ensuring it is empty for root URLs.
 * - Removing the trailing slash from the pathname.
 * - Stripping the 'www.' prefix from the hostname if it exists.
 *
 * If the URL is invalid or cannot be parsed, the function returns the original URL as a fallback.
 *
 * @param {string} url - The URL to normalize.
 * @returns {string} - The normalized URL.
 */
function normalizeUrl(url) {
  try {
    const u = new URL(url);

    // Remove hash and search (query string)
    u.hash = "";
    u.search = "";

    // Handle the root path
    if (u.pathname === "/") u.pathname = "";

    // Remove trailing slash from the path
    if (u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }

    // Remove 'www.' from the hostname if it exists
    // CAN'T always do this :(
    // u.hostname = u.hostname.replace(/^www\./, "");

    return u.href; // Use href to ensure a consistent absolute URL
  } catch {
    return url; // fallback to original if parsing fails
  }
}

export { extendPageSelectors, normalizeUrl, StealthBrowser };
