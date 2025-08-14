import express from "express";
const router = express.Router();

/**
 * TODO: Remove this route in production.
 * Route for testing error handling in the app.
 * Creates an intentional error and passes it to Express's error handler.
 */
router.get("/error", (_req, _res, next) => {
  const err = new Error("Intentional test error");
  err.status = 400; // Set a specific HTTP status code for the error
  next(err); // Pass the error to the next middleware (typically the error handler)
});

export default router;
