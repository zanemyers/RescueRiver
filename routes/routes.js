import express from "express";
import indexRoutes from "./_index.js"; // your home/index routes
import appRoutes from "./_app.js";
import testRoutes from "./_test.js";

const router = express.Router();

router.use("/", indexRoutes);
router.use("/", appRoutes);
router.use("/", testRoutes);

// Error routes must be at the end
router.use((req, res, next) => {
  const err = new Error("Page not found");
  err.status = 404;
  next(err);
});

export default router;
