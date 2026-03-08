import { Router } from "express";
import healthRouter from "./health.routes.js";
import modulesRouter from "../../modules/index.js";

const router = Router();

router.use("/", healthRouter);
router.use("/", modulesRouter);

export default router;
