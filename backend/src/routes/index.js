import { Router } from "express";
import legacyOrdersRouter from "./legacyOrders.routes.js";
import v1Router from "./v1/index.js";

const router = Router();

router.use("/orders", legacyOrdersRouter);
router.use("/v1", v1Router);

export default router;
