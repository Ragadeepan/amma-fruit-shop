import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../utils/validator.js";
import { getApiLogsHandler, getApiStatusHandler } from "./system.controller.js";
import { apiLogsValidation } from "./system.validation.js";

const router = Router();

router.use(requireAdminAuth);
router.get("/api-status", getApiStatusHandler);
router.get("/logs", validate(apiLogsValidation), getApiLogsHandler);

export default router;
