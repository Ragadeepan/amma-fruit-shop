import compression from "compression";
import cors from "cors";
import express from "express";
import hpp from "hpp";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const backendRootPath = path.resolve(currentDirPath, "..");
const monorepoRootPath = path.resolve(backendRootPath, "..");
const frontendDistPath = path.resolve(monorepoRootPath, "frontend", "dist");
const frontendIndexPath = path.resolve(frontendDistPath, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

const DEV_SERVER_CHECK_TTL_MS = 2_000;
const DEV_SERVER_CHECK_TIMEOUT_MS = 250;

let devServerAvailabilityCache = {
  origin: null,
  ok: false,
  checkedAt: 0,
  inflight: null,
};

const getDevFrontendOrigin = () => {
  if (!Array.isArray(env.clientOrigins) || env.clientOrigins.length === 0) {
    return null;
  }

  const loopbackOrigins = env.clientOrigins.filter((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  });

  if (loopbackOrigins.length === 0) {
    return null;
  }

  const viteDefaultOrigin = loopbackOrigins.find((origin) => {
    try {
      return new URL(origin).port === "5173";
    } catch {
      return false;
    }
  });

  return viteDefaultOrigin ?? loopbackOrigins[0];
};

const isLikelyBrowserRequest = (req) =>
  ["GET", "HEAD"].includes(req.method) &&
  String(req.headers.accept ?? "").includes("text/html");

const checkViteDevServerAvailable = async (origin) => {
  if (!origin) {
    return false;
  }

  const now = Date.now();
  const cacheMatches = devServerAvailabilityCache.origin === origin;

  if (cacheMatches) {
    if (devServerAvailabilityCache.inflight) {
      return devServerAvailabilityCache.inflight;
    }

    if (now - devServerAvailabilityCache.checkedAt < DEV_SERVER_CHECK_TTL_MS) {
      return devServerAvailabilityCache.ok;
    }
  }

  const inflight = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      DEV_SERVER_CHECK_TIMEOUT_MS,
    );

    try {
      const response = await fetch(new URL("/@vite/client", origin), {
        method: "GET",
        signal: controller.signal,
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  })();

  devServerAvailabilityCache = {
    origin,
    ok: false,
    checkedAt: now,
    inflight,
  };

  const ok = await inflight;
  devServerAvailabilityCache = {
    origin,
    ok,
    checkedAt: Date.now(),
    inflight: null,
  };

  return ok;
};

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: env.clientOrigins,
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(inputSanitizerMiddleware);
app.use(hpp());
app.use(requestIdMiddleware);
app.use(loggerMiddleware);
app.use(apiStatusLoggerMiddleware);
app.use("/api", apiRateLimiter, apiRouter);

app.use(async (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  if (!isLikelyBrowserRequest(req)) {
    return next();
  }

  const devFrontendOrigin = getDevFrontendOrigin();

  if (
    env.nodeEnv !== "production" &&
    devFrontendOrigin &&
    (await checkViteDevServerAvailable(devFrontendOrigin))
  ) {
    const redirectUrl = new URL(req.originalUrl, devFrontendOrigin);
    return res.redirect(302, redirectUrl.toString());
  }

  if (hasFrontendBuild) {
    return res.sendFile(frontendIndexPath);
  }

  return next();
});

if (hasFrontendBuild) {
  app.use(
    express.static(frontendDistPath, {
      index: false,
    }),
  );
}

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Amma Fruit Shop API is running.",
    frontendDevUrl: getDevFrontendOrigin(),
  });
});

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
