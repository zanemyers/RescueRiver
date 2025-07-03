## 🛒 Shop Scraper

Pulls business data using SerpAPI and associated websites, compiling the results into a structured Excel file.

### 🔍 Features

- Fetches local business listings using SerpAPI's Google Maps engine
- Supports caching of fetched shop data to reduce redundant API usage
- Launches a Playwright browser to extract additional data from each shop's website:
  - Email Address
  - Online Store
  - Fishing Report
  - Social Media
- Writes all results to an Excel (.xlsx) file
- Provides progress indicators in the terminal
- Supports customizations via `.env` settings
- Handles request errors gracefully with fallback data

### 📅 Future Plans

- Add option to choose between SerpAPI and Google’s new Places API (`places:searchText`)
  - The new Places API is currently limited to 20 results per query (see `google-places-api` branch), so it won't be useful until the update the limit or add pagination.

### 🐞 Known Issues

- Email scraping is probably about 70% accurate
- Some business pages are blocked or fail to load
- Requires headless mode in Docker
- Cannot be debugged in Docker

## 📈 Report Scraper (In-Progress)

Parses and summarizes fishing reports from shop websites. Takes an [Excel config file](../example_files/report_scraper_ex.xlsx) that defines how to extract report content (selectors, keywords, etc.) for each site — _see example file_.

### 🧠 Intended Features

- Identify and append missing report URLs from site data to the report file
- Detect and summarize river conditions and activity from fishing reports
- Filter by river name
- Track report freshness based on publication dates

### 🐞 Known Issues

- Must run headless in Docker
- Still under development
