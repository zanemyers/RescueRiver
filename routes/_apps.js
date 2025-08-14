import express from "express";
import { MERGE_PROMPT, SUMMARY_PROMPT } from "../apps/base/constants/index.js";

/**
 * Defines application routes for rendering scraper pages.
 * - /report-scraper: Report scraping and summarization interface
 * - /shop-scraper: Shop data scraping interface
 */
const router = express.Router();
router.get("/report-scraper", (req, res) => {
  res.render("report_scraper", {
    title: "Report Scraper",
    summaryPrompt: SUMMARY_PROMPT,
    mergePrompt: MERGE_PROMPT,
  });
});
router.get("/shop-scraper", (req, res) => {
  res.render("shop_scraper", {
    title: "Shop Scraper",
  });
});

export default router;
