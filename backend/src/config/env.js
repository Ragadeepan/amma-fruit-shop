import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const backendRootPath = path.resolve(currentDirPath, "..", "..");
const monorepoRootPath = path.resolve(backendRootPath, "..");

dotenv.config({
  path: [
    path.resolve(process.cwd(), ".env"),
    path.resolve(backendRootPath, ".env"),
    path.resolve(monorepoRootPath, ".env"),
  ],
});

const REQUIRED_KEYS = ["JWT_SECRET"];

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toList = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeOrigin = (value) => String(value).trim().replace(/\/+$/, "");

const expandLoopbackOrigins = (origins) => {
  const expanded = new Set(origins.map(normalizeOrigin));

  origins.forEach((origin) => {
    const normalizedOrigin = normalizeOrigin(origin);

    try {
      const parsed = new URL(normalizedOrigin);

      if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
        return;
      }

      const alternateOrigin = new URL(normalizedOrigin);
      alternateOrigin.hostname =
        parsed.hostname === "localhost" ? "127.0.0.1" : "localhost";
      expanded.add(normalizeOrigin(alternateOrigin.toString()));
    } catch {
      expanded.add(normalizedOrigin);
    }
  });

  return Array.from(expanded);
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 5000),
  publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1",
  clientOrigins: expandLoopbackOrigins(
    toList(process.env.CLIENT_ORIGINS, ["http://localhost:5173"]),
  ),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMaxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  orderAccessSecret: process.env.ORDER_ACCESS_SECRET ?? process.env.JWT_SECRET,
  orderAccessExpiresIn: process.env.ORDER_ACCESS_EXPIRES_IN ?? "48h",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@ammafruitshop.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "Admin@12345",
  duplicateWindowMinutes: toNumber(process.env.DUPLICATE_WINDOW_MINUTES, 10),
  upiId: process.env.UPI_ID ?? "ammafruitshop@upi",
  upiPayeeName: process.env.UPI_PAYEE_NAME ?? "Amma Fruit Shop",
  whatsappEnabled: process.env.WHATSAPP_ENABLED === "true",
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION ?? "v20.0",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  whatsappRecipientOverride: process.env.WHATSAPP_RECIPIENT_OVERRIDE,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : "",
  firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL,
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  firebaseServiceAccountPath:
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    "",
});

export const validateEnv = () => {
  const missingKeys = REQUIRED_KEYS.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(", ")}`,
    );
  }
};
