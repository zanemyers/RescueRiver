import express from "express";
import indexRoutes from "./_index.js";
import appRoutes from "./_apps.js";
import partialRoutes from "./_partials.js";
import testRoutes from "./_test.js";

const router = express.Router();

// Mount the main routes
router.use("/", indexRoutes);
router.use("/", appRoutes);
router.use("/partials", partialRoutes);
router.use("/", testRoutes);

// Catch-all for undefined routes – triggers 404 error
// Must be placed at the end after all other route definitions
router.use((req, res, next) => {
  const err = new Error("Page not found");
  err.status = 404;
  next(err);
});

export default router;
