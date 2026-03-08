import http from "node:http";
import app from "./app.js";
import { configureCloudinary } from "./config/cloudinary.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env, validateEnv } from "./config/env.js";
import { ensureDefaultAdminUser } from "./modules/auth/auth.service.js";
import { seedDefaultFruits } from "./modules/fruits/fruits.service.js";

let server;

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (!server) {
    await disconnectDatabase().catch(() => {});
    process.exit(0);
  }

  server.close(async () => {
    await disconnectDatabase().catch(() => {});
    process.exit(0);
  });
};

const registerProcessListeners = () => {
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    void shutdown("UNHANDLED_REJECTION");
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    void shutdown("UNCAUGHT_EXCEPTION");
  });
};

const startServer = async () => {
  validateEnv();
  await connectDatabase();
  configureCloudinary();
  await ensureDefaultAdminUser();
  await seedDefaultFruits();

  server = http.createServer(app);
  server.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
};

registerProcessListeners();

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
