import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { BLOCKED_OR_FORBIDDEN } from "./constants/index.js";

// Enable plugins
chromium.use(StealthPlugin());

/**
 * StealthBrowser wraps a Playwright Chromium browser with additional features
 * to mimic human browsing behavior and avoid bot detection.
 *
 * Features include:
 * - Randomized user agent, locale, timezone, and viewport size.
 * - Headless or headed mode configuration.
 * - Custom page helpers for element scraping, navigation, and basic user interaction.
 * - Automatic retries for page navigation and detection of blocked/forbidden responses.
 *
 * This class is designed for web scraping workflows where stealth and realistic browsing
 * are required to minimize detection or throttling by target websites.
 */
class StealthBrowser {
  /**
   * Creates an instance of StealthBrowser with configurable options.
   *
   * @param {object} options - Optional configuration.
   * @param {boolean} [options.headless=true] - Run browser in headless mode.
   * @param {string[]} [options.args] - Chromium launch arguments.
   * @param {string} [options.userAgent] - Override default user agent string.
   * @param {string} [options.locale] - Override browser locale (e.g., "en-US").
   * @param {string} [options.timezoneId] - Override browser timezone (e.g., "America/New_York").
   */
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

  /**
   * Launches the Chromium browser and creates a new browser context
   * with the configured viewport, user agent, locale, and timezone.
   *
   * @returns {Promise<this>} Returns the instance for chaining.
   */
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

  /**
   * Adds custom helper functions to a Playwright page object for stealthy navigation.
   *
   * @param {import('playwright').Page} page - Playwright Page instance.
   */
  async _enhancePageLoad(page) {
    /**
     * Simulates basic user interactions such as mouse movements.
     * Helps reduce bot detection.
     */
    page.simulateUserInteraction = async function () {
      await page.mouse.move(100, 100);
      await page.mouse.move(200, 300);
      await page.mouse.move(50, 175);
    };

    /**
     * Navigates to a URL with retry support.
     *
     * @param {string} url - URL to navigate to.
     * @param {number} [retries=2] - Maximum retry attempts.
     * @returns {Promise<import('playwright').Response>} Navigation response.
     * @throws {Error} If navigation fails or site is blocked/forbidden.
     */
    page.load = async function (url, retries = 2) {
      while (retries--) {
        try {
          const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });

          const status = response?.status();
          if ([401, 403, 429].includes(status)) {
            const content = await page.content();
            if (BLOCKED_OR_FORBIDDEN.some((text) => content.includes(text))) {
              throw new Error(`Blocked or forbidden (HTTP ${status})`);
            }
          }

          await page.simulateUserInteraction();
          return response;
        } catch (err) {
          if (retries === 0 || /HTTP (401|403|429)/.test(err.message)) {
            throw new Error(`Failed to load ${url}: ${err.message}`);
          }
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    };
  }

  /**
   * Returns a random user agent profile with userAgent, locale, and timezone.
   * Used for stealth to mimic diverse browsers and regions.
   *
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
   * Returns a random viewport size from common screen resolutions.
   *
   * @returns {{width: number, height: number}} Viewport dimensions.
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
   * Sets up request interception to reduce bandwidth and speed up scraping.
   * Blocks images, fonts, stylesheets, media, and common analytics/ads,
   * but allows scripts, XHR/fetch, and HTML to ensure content loads correctly.
   *
   * @param {import('playwright').Page} page
   */
  async _setupRequestInterception(page) {
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      const url = route.request().url();

      // List of resource types to block
      const blockedTypes = ["image", "font", "stylesheet", "media"];

      // Block analytics / ad URLs (add more patterns as needed)
      const blockedUrls = [
        "google-analytics",
        "doubleclick.net",
        "ads.",
        "googletagmanager.com",
        "facebook.net",
        "tiktok.com/tracker",
      ];

      if (blockedTypes.includes(type) || blockedUrls.some((pattern) => url.includes(pattern))) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  /**
   * Creates a new page in the browser context and applies custom helper methods.
   *
   * @returns {Promise<import('playwright').Page>} New page with stealth helpers.
   */
  async newPage() {
    const page = await this.context.newPage();
    await this._enhancePageLoad(page);
    await extendPageSelectors(page);
    await this._setupRequestInterception(page);
    return page;
  }

  /**
   * Closes the browser instance if it is running.
   *
   * @returns {Promise<void>}
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

/**
 * Extends a Playwright Page instance with custom helper methods for scraping and element inspection.
 *
 * This function adds convenient methods to a page to:
 * - Retrieve attributes by selector or `aria-label`.
 * - Retrieve text content of elements.
 * - Check for the existence of elements containing specific keywords.
 *
 * These helpers simplify common scraping tasks and provide consistent error handling.
 *
 * @param {import('playwright').Page} page - The Playwright Page instance to extend.
 * @returns {Promise<import('playwright').Page>} The same page instance with added helper methods.
 */
async function extendPageSelectors(page) {
  /**
   * Retrieves the value of a specified attribute from the first matching element located by the given selector.
   *
   * @param {string} locator - The CSS selector to locate the element.
   * @param {string} attribute - The attribute name to retrieve (e.g., "href", "src").
   * @param {Object} [filter={}] - Optional filter options to further narrow down matches.
   * @returns {Promise<string|null>} - The attribute value, or null if not found.
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
   * Retrieves the value of a specified attribute from the first element whose `aria-label` contains the given text.
   *
   * @param {string} label - Partial or full `aria-label` value to match.
   * @param {string} attribute - The attribute name to retrieve (e.g., "href", "src")..
   * @param {Object} [filter={}] - Optional filter options to further narrow down matches.
   * @returns {Promise<string|null>} - The attribute value, or null if not found.
   */
  page.getAttByLabel = async function (label, attribute, filter = {}) {
    return await page.getAttByLocator(`[aria-label*="${label}"]`, attribute, filter);
  };

  /**
   * Retrieves the text content of the first element matching the given selector.
   *
   * @param {string} locator - The CSS selector to locate the element.
   * @param {Object} [filter={}] - Optional filter options to further narrow down matches.
   * @returns {Promise<string|null>} - The element's text content, or null if not found.
   */
  page.getTextContent = async function (locator, filter = {}) {
    return await page.locator(locator, { timeout: 1000 }).filter(filter).first().textContent();
  };

  /**
   * Checks if an element of a given type contains the specified keyword text.
   *
   * @param {string} element - The type of element to search for (e.g., 'a', 'button').
   * @param {string} keyword - The text to search for inside the element.
   * @returns {Promise<boolean>} - True if at least one matching element is found; false otherwise.
   */
  page.hasElementWithKeyword = async function (element, keyword) {
    return await page
      .locator(`${element}:has-text("${keyword}")`)
      .count()
      .then((count) => count > 0)
      .catch(() => false);
  };
}

/**
 * Normalizes a URL to a consistent format for comparison or deduplication.
 * If the URL is invalid or cannot be parsed, the original input is returned.
 *
 * @param {string} url - The URL string to normalize.
 * @returns {string} - The normalized URL, suitable for comparison or storage.
 */
function normalizeUrl(url) {
  try {
    const u = new URL(url);

    // Remove hash and query string for a clean, comparable URL
    u.hash = "";
    u.search = "";

    // Convert root path '/' to empty string
    if (u.pathname === "/") u.pathname = "";

    // Remove trailing slash from pathname
    if (u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }

    return u.href; // Return absolute normalized URL
  } catch {
    return url; // Return original URL if parsing fails
  }
}

/**
 * Determines whether two URLs belong to the same domain, ignoring the 'www.' prefix.
 *
 * @param {string} urlA - The first URL to compare.
 * @param {string} urlB - The second URL to compare.
 * @returns {boolean} `true` if both URLs resolve to the same domain (case-insensitive), `false` otherwise.
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
