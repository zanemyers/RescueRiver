import express from "express";
import { MERGE_PROMPT, SUMMARY_PROMPT } from "../apps/base/constants/index.js";

const router = express.Router();

/**
 * Routes for serving partial views used in forms and UI components.
 * These routes return EJS partials without the main layout (layout: false).
 */

// Serve the shop form partial
router.get("/shop-form", (req, res) => {
  res.render("partials/shop_form", { layout: false });
});

// Serve the report form partial with prompts for summary and merge
router.get("/report-form", (req, res) => {
  res.render("partials/report_form", {
    layout: false,
    summaryPrompt: SUMMARY_PROMPT,
    mergePrompt: MERGE_PROMPT,
  });
});

// Serve the progress partial for displaying ongoing tasks
router.get("/progress", (req, res) => {
  res.render("partials/progress", { layout: false });
});

export default router;
