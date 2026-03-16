import { Router } from "express";
import analyticsRouter from "./analytics/analytics.routes.js";
import authRouter from "./auth/auth.routes.js";
import fruitsRouter from "./fruits/fruits.routes.js";
import ordersRouter from "./orders/orders.routes.js";
import systemRouter from "./system/system.routes.js";
import whatsappRouter from "./whatsapp/whatsapp.routes.js";

const modulesRouter = Router();

modulesRouter.use("/auth", authRouter);
modulesRouter.use("/fruits", fruitsRouter);
modulesRouter.use("/orders", ordersRouter);
modulesRouter.use("/analytics", analyticsRouter);
modulesRouter.use("/system", systemRouter);
modulesRouter.use("/whatsapp", whatsappRouter);

export default modulesRouter;
