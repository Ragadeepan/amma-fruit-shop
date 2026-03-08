import morgan from "morgan";
import { env } from "../config/env.js";

morgan.token("request-id", (req) => req.requestId ?? "n/a");

const format =
  env.nodeEnv === "production"
    ? ':request-id - :remote-addr - ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'
    : ":request-id :method :url :status :response-time ms";

export const loggerMiddleware = morgan(format);
