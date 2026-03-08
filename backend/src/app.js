import compression from "compression";
import cors from "cors";
import express from "express";
import hpp from "hpp";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiStatusLoggerMiddleware } from "./middlewares/apiStatus.middleware.js";
import { errorHandlerMiddleware } from "./middlewares/error.middleware.js";
import { inputSanitizerMiddleware } from "./middlewares/inputSanitizer.middleware.js";
import { loggerMiddleware } from "./middlewares/logger.middleware.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import apiRateLimiter from "./middlewares/rateLimiter.middleware.js";
import { requestIdMiddleware } from "./middlewares/requestId.middleware.js";
import apiRouter from "./routes/index.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: env.clientOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(inputSanitizerMiddleware);
app.use(hpp());
app.use(requestIdMiddleware);
app.use(loggerMiddleware);
app.use(apiStatusLoggerMiddleware);
app.use("/api", apiRateLimiter, apiRouter);

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Amma Fruit Shop API is running.",
  });
});

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
