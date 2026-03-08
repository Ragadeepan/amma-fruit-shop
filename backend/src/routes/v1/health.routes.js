import { Router } from "express";
import { query } from "express-validator";
import { getHealthStatus } from "../../controllers/health.controller.js";
import { validate } from "../../utils/validator.js";

const router = Router();

router.get(
  "/health",
  validate([query("ping").optional().isString().isLength({ max: 30 })]),
  getHealthStatus,
);

export default router;
