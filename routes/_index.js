import express from "express";
const router = express.Router();

/**
 * Main site routes
 * - "/"       : Render the home page
 * - "/about"  : Render the About page
 */
router.get("/", (req, res) => {
  res.render("index", { title: "The Flybox" }); // Just the name without extension, Express uses the view engine
});

router.get("/about", (req, res) => {
  res.render("about", { title: "About Flybox" }); // Render about.ejs instead of sending HTML file directly
});

export default router;
