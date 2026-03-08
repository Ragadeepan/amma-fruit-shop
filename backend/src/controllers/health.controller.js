import { env } from "../config/env.js";
import { isDatabaseConnected } from "../config/database.js";

export const getHealthStatus = (_req, res) => {
  const databaseConnected = isDatabaseConnected();

  res.status(200).json({
    success: true,
    data: {
      service: "Amma Fruit Shop API",
      version: "v1",
      environment: env.nodeEnv,
      database: databaseConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
  });
};
