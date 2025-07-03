import express from "express";

const router = express.Router();
router.get("/report-scraper", (req, res) => {
  res.render("report_scraper", {
    title: "Report Scraper",
    // Add any other context variables you want here
  });
});
router.get("/shop-scraper", (req, res) => {
  res.render("shop_scraper", {
    title: "Shop Scraper",
  });
});

export default router;
