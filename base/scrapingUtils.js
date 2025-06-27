/**
 * Utility functions and classes to enhance Playwright interactions and browsing stealthiness.
 *
 * This module includes:
 *
 * - `StealthBrowser` class: A wrapper around Playwright's Chromium browser to provide stealthy browsing capabilities.
 *   It randomizes user agent, viewport, locale, and timezone, and injects simulated user interactions to
 *   help evade bot detection.
 *
 * - `extendPageSelectors(page)`: Augments the given Playwright `page` object with custom helper methods for
 *   selecting and extracting data from elements more easily.
 *     - getAttByLocator: Gets an attribute from the first matching element.
 *     - getAttByLabel: Gets an attribute from an element by aria-label text.
 *     - getTextContent: Retrieves text content of the first matching element.
 *     - hasElementWithKeyword: Checks for the presence of an element containing specific text.
 *
 * - `normalizeUrl(url)`: Cleans up a URL by removing query strings, hashes, and trailing slashes,
 *   returning a consistent and canonical form.
 *
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { BLOCKED_FORBIDDEN } from "./enums.js";

// Enable plugins
chromium.use(StealthPlugin());

class StealthBrowser {
  /**
   * Creates an instance of StealthBrowser with configurable options.
   * Sets defaults for headless mode, browser args, user agent, locale, and timezone.
   * If userAgent, locale, or timezoneId are not provided, selects a random profile.
   * @param {object} options - Optional config options.
   * @param {boolean} [options.headless=true] - Run browser in headless mode or not.
   * @param {string[]} [options.args] - Chromium launch arguments.
   * @param {string} [options.userAgent] - Override user agent string.
   * @param {string} [options.locale] - Override browser locale (e.g., "en-US").
   * @param {string} [options.timezoneId] - Override browser timezone (e.g., "America/New_York").
   */
  constructor(options = {}) {
    this.headless = options.headless ?? true;
    this.args = options.args ?? ["--start-maximized", "--no-sandbox"];

    // Select random agent profile if not provided
    const agentProfile = this._getAgentProfile();
    this.userAgent = options.userAgent ?? agentProfile.userAgent;
    this.locale = options.locale ?? agentProfile.locale;
    this.timezoneId = options.timezoneId ?? agentProfile.timezoneId;

    this.browser = null;
    this.context = null;
  }

  /**
   * Launches the Chromium browser and creates a new browser context.
   * The context uses the configured viewport, user agent, locale, and timezone.
   * @returns {Promise<this>} Returns the instance for chaining.
   */
  async launch() {
    this.browser = await chromium.launch({
      headless: this.headless,
      args: this.args,
    });

    this.context = await this.browser.newContext({
      viewport: this._getViewport(), // Random viewport size to mimic real user
      userAgent: this.userAgent,
      locale: this.locale,
      timezoneId: this.timezoneId,
    });

    return this;
  }

  /**
   * Adds custom helper functions to a Playwright page object:
   * - simulateUserInteraction: simulates mouse moves and click.
   * - load: navigates to a URL and then simulates user interaction.
   * @param {import('playwright').Page} page - Playwright Page instance.
   */
  async _customActions(page) {
    /**
     * Simulate user interaction with mouse movements and a click.
     * Helps reduce bot detection by mimicking human activity.
     */
    page.simulateUserInteraction = async function () {
      await page.mouse.move(100, 100);
      await page.mouse.move(200, 300);
      await page.mouse.move(50, 175);
    };

    /**
     * Navigates to the given URL with retry support.
     * Waits for the network to become idle, simulates basic user interaction,
     *
     * @param {string} url - The URL to visit.
     * @param {number} [retries=2] - Maximum number of retry attempts.
     * @returns {Promise<import('playwright').Response>} The response object from navigation.
     * @throws {Error} If navigation fails after all retries or receives a blocked status.
     */
    page.load = async function (url, retries = 2) {
      while (retries--) {
        try {
          const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });

          // Don't retry blocked or forbidden sites
          const status = response?.status();
          if ([401, 403, 429].includes(status)) {
            const content = await page.content();
            if (BLOCKED_FORBIDDEN.some((text) => content.includes(text))) {
              throw new Error(`Blocked or forbidden (HTTP ${status})`);
            }
          }

          await page.simulateUserInteraction();
          return response;
        } catch (err) {
          if (retries === 0 || /HTTP (401|403|429)/.test(err.message)) {
            throw new Error(`Failed to load ${url}: ${err.message}`);
          }

          await new Promise((res) => setTimeout(res, 1000)); // delay before retry
        }
      }
    };
  }

  /**
   * Returns a random user agent profile with userAgent string, locale, and timezone.
   * Used for stealth to mimic requests from various browsers and regions.
   * @returns {object} Random user agent profile.
   */
  _getAgentProfile() {
    const agentProfiles = [
      {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        locale: "en-US",
        timezoneId: "America/New_York",
      },
      {
        userAgent: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:114.0) Gecko/20100101 Firefox/114.0",
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

  /**
   * Returns a random viewport size from a list of common screen sizes.
   * Helps simulate different user devices for stealth.
   * @returns {{width: number, height: number}} Viewport size object.
   */
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

  /**
   * Creates a new page in the current browser context and applies custom helpers.
   * @returns {Promise<import('playwright').Page>} The new page with custom actions attached.
   */
  async newPage() {
    const page = await this.context.newPage();
    await this._customActions(page);
    await extendPageSelectors(page);
    return page;
  }

  /**
   * Closes the browser instance if it has been launched.
   * @returns {Promise<void>}
   */
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
    return await page.getAttByLocator(`[aria-label*="${label}"]`, attribute, filter);
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
    return await page.locator(locator, { timeout: 1000 }).filter(filter).first().textContent();
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

    return u.href; // Use href to ensure a consistent absolute URL
  } catch {
    return url; // fallback to original if parsing fails
  }
}

/**
 * Compare two URLs by domain name, ignoring 'www.'
 * @param {string} urlA
 * @param {string} urlB
 * @returns {boolean}
 */
function sameDomain(urlA, urlB) {
  try {
    const domainA = new URL(normalizeUrl(urlA)).hostname.replace(/^www\./, "").toLowerCase();
    const domainB = new URL(normalizeUrl(urlB)).hostname.replace(/^www\./, "").toLowerCase();
    return domainA === domainB;
  } catch {
    return false; // Treat invalid URLs as non-matching
  }
}

export { extendPageSelectors, normalizeUrl, sameDomain, StealthBrowser };
