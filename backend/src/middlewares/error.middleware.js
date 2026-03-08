import { env } from "../config/env.js";

export const errorHandlerMiddleware = (error, req, res, _next) => {
  let statusCode = error.statusCode ?? 500;
  let message = error.message || "Internal server error.";

  if (error.name === "MulterError") {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Image file size must be 5MB or less."
        : "Invalid image upload request.";
  }

  const response = {
    success: false,
    message,
    requestId: req.requestId,
  };

  if (error.details) {
    response.details = error.details;
  }

  if (env.nodeEnv !== "production" && error.stack) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};
