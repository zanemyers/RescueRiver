# 🗒️ Deprecation Notes – Google Maps Shop Scraper (v2.0)

## 🧾 Summary

This tool was designed to scrape business listings directly from a specified Google Maps URL. It:

- Loaded local search results from Google Maps
- Extracted business data directly from those listings
- Visited each shop’s website to gather additional information such as emails, fishing reports, and other contact details

## ❌ Why It Was Deprecated

Directly scraping Google Maps violates [Google's Terms of Service](https://mapsplatform.google.com/terms/). To remain compliant and avoid legal risk, this approach has been fully discontinued.

## 🔄 Replacement

The new **Shop Scraper** tool replaces this functionality by:

- Using [SerpAPI](https://serpapi.com/) to retrieve business listing data in a compliant way
- Reusing much of the website-parsing logic from the original tool (e.g., scraping emails and fishing report links)

## 🕓 Status

This tool was **fully deprecated in v2.0**. It has been removed from the codebase and is no longer maintained.

## 🗂️ Files Worth Preserving

For historical reference or migration purposes, the following logic may still be useful:

- Shop website crawling and parsing logic
- Email detection heuristics
- Fishing report keyword matching

The folder may remain in the repository for archival purposes but should not be updated.
