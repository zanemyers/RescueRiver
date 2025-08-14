### Changelog

All notable changes to this project will be documented in this file.

### [v3.0](https://github.com/zanemyers/RescueRiver/compare/v2.3..HEAD) — *14 Aug 2025*

#### **Added**
- `.env`, `.vscode/`, `.idea/`, `.git/`, `.gitignore` entries to `.dockerignore`
- Comments for `.gitignore`, `.prettierignore`, and `.dockerignore`
- **SCSS formatting** via `stylelint` with custom `.stylelintrc`
- Centralized `index` files for simpler imports
- `getBuffer` method in `TXTFileHandler` & `ExcelFileHandler`; `loadBuffer` in `ExcelFileHandler`
- `_setupRequestInterception` in `StealthBrowser`
- Debugging & running ports in `compose.yaml`
- `build_styles` and `start` Just commands
- New dependencies: `bootstrap`, `ejs`, `express`, `express-ejs-layouts`, `tinyqueue`, `ws`
- New dev dependencies: `sass`, `stylelint`, `stylelint-config-standard`, `stylelint-config-standard-scss`, `stylelint-scss`
- New example and image assets in `static/` and `docs/images/`
- `server.js` for Express web server with internal WebSocket support
- Expanded routes (`_apps.js`, `_index.js`, `_partials.js`, `_test.js`, `error.js`)
- WebSocket handlers (`_baseWebSocket.js`, `_cancellationToken.js`, `_reportSocket.js`, `_shopSocket.js`)
- Frontend scripts (`baseFormApp.js`, `fileInput.js`, `map.js`, `navbar.js`, `reportFormApp.js`, `shopFormApp.js`, `tooltip.js`)
- SCSS styles (`_theme.scss`, `style.scss`) and compiled CSS
- EJS views (`index`, `about`, `error`, `report_scraper`, `shop_scraper`) and layouts/partials

#### **Changed**
- Added/updated comments across most files
- Updated `Dockerfile` to expose local port & include run command
- Revised `README` and documentation (`config.md`, `ide.md`, `overview.md`, `setup.md`)
- Renamed all `Util` files to private `_...Utils`
- Moved `base`, `report_scraper`, `shop_scraper`, `site_diff` into `apps/`
- Updated file handlers for in-memory file operations
- Renamed `_customActions` → `_enhancePageLoad`
- Split `enums.js` into multiple constants files (`_messages.js`, `_prompts.js`, `_scrapers.js`, `_shopScraper.js`)
- Moved `example_files/` into `static/`
- Updated ESLint config and `just lint` to also lint SCSS
- Renamed `ResucueRiverLogo.png` → `rr_logo.png` and moved to `docs/images/`
- Updated setup script for simplified `.env`
- Enhanced `shopScraper` and `reportScraper` to accept form input and support cancellation

#### **Removed**
- Deprecated: `getUTCYearMonth`, `getUTCTimeStamp`, `FileHandler`, `loadCachedShops`
- Removed: `report_urls.txt`, `shops.json`, `index.md`, `usage.md`, `assets/`
- Dropped Just commands for running scrapers individually

### [v2.3](https://github.com/zanemyers/RescueRiver/compare/v2.2...2.3) — *30 June 2025*

#### ✨ Added

- `.env` variables: `SEARCH_RADIUS`, `CRAWL_DEPTH`
- `siteDiff.js`: compares shop and report Excel files, appends missing sites to the report
- Spinner status messages for report scraper
- Dev dependencies: `@eslint/js`, `eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `globals`, `prettier`
- `just format` and `just lint` commands
- ESLint config file and Prettier config/ignore files
- `ide.md` documentation
- Base `write` method to `FileHandler`
- `read` method for `TXTFileHandler`
- `BLOCKED_FORBIDDEN` keywords to `enums.js`

#### Changed

- Renamed `ShopScraper` & `ReportScraper` to `shop_scraper` & `report_scraper`
- `.env` updates:
  - `SEARCH_COORDINATES` split into `SEARCH_LAT` & `SEARCH_LONG`
  - `GOOGLE_GENAI_API_KEY` & `GOOGLE_GENAI_MODEL` renamed to `GEMINI_API_KEY` & `GEMINI_MODEL`
- `env.js` updated for new `.env` keys
- Report scraper now reads sites from Excel instead of JSON
- Summary generation skipped if no reports found
- Report scraper now uses `StealthBrowser`
- Failed sites are logged for review
- Moved `example_files` out of `assets`
- All URLs in `shops.json` normalized to `https`
- Docs updated: `usage`, `setup`, `overview`, `config`
- Renamed `docker-compose.yaml` to `compose.yaml`
- Improved `page.load` with retry support and skip on block
- Enhanced `ExcelFileHandler.read()` to support list columns
- Updated `ExcelFileHandler.write()` to support appending or archiving
- Refined AI prompts: `SUMMARY_PROMPT`, `MERGE_PROMPT`
- Renamed `extractMostRecentDate` to `extractDate`
- Updated `.gitignore` and `.dockerignore`

#### Removed

- `isSameDomain` from `reportUtils` (replaced by `sameDomain` in `scrapingUtils`)
- Site comparison tool section from README (now part of report scraper)

### [v2.2](https://github.com/zanemyers/RescueRiver/compare/v2.1...v2.2) — *18 June 2025*

#### Added

- Integrated `playwright-extra` and `puppeteer-extra-plugin-stealth` packages.
- Introduced `StealthBrowser` class in `scrapingUtils.js` for more human-like scraping behavior.

#### Changed

- Upgraded `playwright` package.
- Moved `deprecated/` directory into `docs/` for better organization.
- Simplified fishing report detection logic.
- Fixed contact link extraction to resolve full (absolute) URLs.
- Improved email scraping accuracy and robustness.
- Switched shop scraper to use `StealthBrowser` instead of default Playwright browser.

### [v2.1](https://github.com/zanemyers/RescueRiver/compare/v2.0...v2.1) — *2 June 2025*

#### Added

- Added `ora` package for terminal spinner functionality
- Added `.vscode/settings.json` to exclude folders from search results

#### Changed

- Replaced `terminalUtils` spinner and progress bar with `ora`-based implementation
- Updated setup documentation packages to include `ora`
- Updated base deprecation notes for v2.1

#### Removed

- Deprecated `Spinner` class and `progressBar` function from `base/terminalUtils`
- Removed Excel index column from `shop_details.xlsx`

### [v2.0](https://github.com/zanemyers/RescueRiver/compare/v1.1...v2.0) — *2 June 2025*

#### Added

- Added `ShopScraper` application and new packages: `exceljs`, `serpapi`, and `@supercharge/promise-pool`
- Introduced `ExcelFileHandler` class (extends `FileHandler`) with `read` and `write` support
- Added `FALLBACK_DETAILS` to project constants
- Added example files under `assets/`
- Added `loadCachedShops` and `buildShopRows` to `shopUtils`

#### Updated

- Refactored `startSpinner` and `stopSpinner` into unified `Spinner` class
- Renamed `FileWriter` to `FileHandler`; it now uses the file path's base name for archiving
- Renamed `FishingReportScraper` to `ReportScraper`
- Updated ReportScraper to use `.env` variables and `ExcelFileHandler`
- Updated setup script and documentation (setup, config, overview) to reflect scraper changes

#### Removed

- Deprecated `CSVFileWriter`, `CSVFileReader`, and `GoogleMapsShopScraper`
- Removed unnecessary constants and page selectors from `shopUtils`

### [v1.1](https://github.com/zanemyers/RescueRiver/compare/v1.0...v1.1) — *1 June 2025*

#### Added

- Added Changelog
- Added documentation folder
- Added Deprecation folder

#### Updated
- Simplified ReadMe

### [v1.0](https://github.com/zanemyers/RescueRiver/compare/v0.0...v1.0)
