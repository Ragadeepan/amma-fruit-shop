import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getAnalyticsSummary,
  getDaySalesDetails,
  getMonthlySalesDetails,
  getMostSoldFruit,
  getTodayRevenue,
  getTotalCustomers,
  getTotalRevenue,
} from "./analytics.service.js";

export const getSummaryHandler = asyncHandler(async (_req, res) => {
  const data = await getAnalyticsSummary();
  res.status(200).json({ success: true, data });
});

export const getDaySalesDetailsHandler = asyncHandler(async (_req, res) => {
  const daySalesDetails = await getDaySalesDetails();
  res.status(200).json({ success: true, data: { daySalesDetails } });
});

export const getMonthlySalesDetailsHandler = asyncHandler(async (_req, res) => {
  const monthlySalesDetails = await getMonthlySalesDetails();
  res.status(200).json({ success: true, data: { monthlySalesDetails } });
});

export const getTodayRevenueHandler = asyncHandler(async (_req, res) => {
  const todayRevenue = await getTodayRevenue();
  res.status(200).json({ success: true, data: { todayRevenue } });
});

export const getTotalRevenueHandler = asyncHandler(async (_req, res) => {
  const totalRevenue = await getTotalRevenue();
  res.status(200).json({ success: true, data: { totalRevenue } });
});

export const getMostSoldFruitHandler = asyncHandler(async (_req, res) => {
  const mostSoldFruit = await getMostSoldFruit();
  res.status(200).json({ success: true, data: { mostSoldFruit } });
});

export const getTotalCustomersHandler = asyncHandler(async (_req, res) => {
  const totalCustomers = await getTotalCustomers();
  res.status(200).json({ success: true, data: { totalCustomers } });
});
