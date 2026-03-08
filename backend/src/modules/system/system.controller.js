import { configureCloudinary } from "../../config/cloudinary.js";
import { isDatabaseConnected } from "../../config/database.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getApiStatusSnapshot,
  getRecentExternalLogs,
  getRecentRequestLogs,
} from "../../services/apiStatus.service.js";
import { getWhatsAppReadiness } from "../../services/whatsappReadiness.service.js";

const getServiceAvailability = () => {
  const whatsappReadiness = getWhatsAppReadiness();
  const cloudinaryClient = configureCloudinary();

  return {
    database: isDatabaseConnected() ? "up" : "down",
    cloudinary: cloudinaryClient ? "configured" : "not_configured",
    whatsapp: whatsappReadiness.ready ? "ready" : "not_ready",
    whatsappReadiness,
  };
};

export const getApiStatusHandler = asyncHandler(async (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      services: getServiceAvailability(),
      logger: getApiStatusSnapshot(),
    },
  });
});

export const getApiLogsHandler = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 40;

  res.status(200).json({
    success: true,
    data: {
      requestLogs: getRecentRequestLogs(limit),
      externalLogs: getRecentExternalLogs(limit),
    },
  });
});
