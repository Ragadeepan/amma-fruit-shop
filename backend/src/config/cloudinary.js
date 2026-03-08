import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

let configured = false;

const isRealConfigValue = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return false;
  }

  return !/^your[-_]/i.test(normalized);
};

export const configureCloudinary = () => {
  if (configured) {
    return cloudinary;
  }

  if (
    !isRealConfigValue(env.cloudinaryCloudName) ||
    !isRealConfigValue(env.cloudinaryApiKey) ||
    !isRealConfigValue(env.cloudinaryApiSecret)
  ) {
    return null;
  }

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });

  configured = true;

  return cloudinary;
};
