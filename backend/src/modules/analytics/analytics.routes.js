import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/auth.middleware.js";
import {
  getDaySalesDetailsHandler,
  getMonthlySalesDetailsHandler,
  getMostSoldFruitHandler,
  getSummaryHandler,
  getTodayRevenueHandler,
  getTotalCustomersHandler,
  getTotalRevenueHandler,
} from "./analytics.controller.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/summary", getSummaryHandler);
router.get("/day-sales", getDaySalesDetailsHandler);
router.get("/monthly-sales", getMonthlySalesDetailsHandler);
router.get("/today-revenue", getTodayRevenueHandler);
router.get("/total-revenue", getTotalRevenueHandler);
router.get("/most-sold-fruit", getMostSoldFruitHandler);
router.get("/total-customers", getTotalCustomersHandler);

export default router;
