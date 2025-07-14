import express from "express";

const router = express.Router();

// Serve the shop form partial
router.get("/shop-form", (req, res) => {
  res.render("partials/shop_form", { layout: false });
});

// Serve the progress partial
router.get("/progress", (req, res) => {
  res.render("partials/progress", { layout: false });
});

export default router;
