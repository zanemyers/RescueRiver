### Changelog

All notable changes to this project will be documented in this file.

### [Unreleased](https://github.com/zanemyers/RescueRiver/compare/v2.0...HEAD)

> (DATE)

#### Added

#### Changed

#### Deprecated

### [v2.2](https://github.com/zanemyers/RescueRiver/compare/v2.1...v2.2)

> 18 June 2025

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

### [v2.1](https://github.com/zanemyers/RescueRiver/compare/v2.0...v2.1)

> 2 June 2025

#### Added

- Added `ora` package for terminal spinner functionality
- Added `.vscode/settings.json` to exclude folders from search results

#### Changed

- Replaced `terminalUtils` spinner and progress bar with `ora`-based implementation
- Updated setup documentation packages to include `ora`
- Updated base deprecation notes for v2.1

#### Deprecated

- Deprecated `Spinner` class and `progressBar` function from `base/terminalUtils`
- Removed Excel index column from `shop_details.xlsx`

### [v2.0](https://github.com/zanemyers/RescueRiver/compare/v1.1...v2.0)

> 2 June 2025

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

#### Deprecated

- Deprecated `CSVFileWriter`, `CSVFileReader`, and `GoogleMapsShopScraper`
- Removed unnecessary constants and page selectors from `shopUtils`

### [v1.1](https://github.com/zanemyers/RescueRiver/compare/v1.0...v1.1)

> 1 June 2025

- Added Changelog
- Added documentation folder
- Simplified ReadMe
- Added Deprecation folder

### [v1.0](https://github.com/zanemyers/RescueRiver/compare/v0.0...v1.0)
