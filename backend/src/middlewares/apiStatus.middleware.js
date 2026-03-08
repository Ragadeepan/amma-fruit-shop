import { logRequestStatus } from "../services/apiStatus.service.js";

export const apiStatusLoggerMiddleware = (req, res, next) => {
  const start = performance.now();

  res.on("finish", () => {
    const durationMs = Number((performance.now() - start).toFixed(2));

    logRequestStatus({
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
};
