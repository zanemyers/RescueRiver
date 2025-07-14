import express from "express";
const router = express.Router();

router.get("/error", (_req, _res, next) => {
  const err = new Error("Intentional test error");
  err.status = 400; // or any status code you want
  next(err);
});

export default router;
