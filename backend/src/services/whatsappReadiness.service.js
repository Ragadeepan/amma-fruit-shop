import { env } from "../config/env.js";

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isLocalHost = (hostname) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1" ||
  hostname.endsWith(".local");

export const getWhatsAppReadiness = () => {
  const issues = [];

  if (!env.whatsappEnabled) {
    issues.push("WHATSAPP_ENABLED must be true.");
  }

  if (!env.whatsappPhoneNumberId) {
    issues.push("WHATSAPP_PHONE_NUMBER_ID is missing.");
  }

  if (!env.whatsappAccessToken) {
    issues.push("WHATSAPP_ACCESS_TOKEN is missing.");
  }

  const publicApiUrl = parseUrl(env.publicApiBaseUrl);

  if (!publicApiUrl) {
    issues.push("PUBLIC_API_BASE_URL is not a valid URL.");
  } else {
    if (publicApiUrl.protocol !== "https:") {
      issues.push("PUBLIC_API_BASE_URL must use https://");
    }

    if (isLocalHost(publicApiUrl.hostname)) {
      issues.push(
        "PUBLIC_API_BASE_URL must be publicly reachable and cannot use localhost/127.0.0.1.",
      );
    }
  }

  return {
    ready: issues.length === 0,
    issues,
    publicApiBaseUrl: env.publicApiBaseUrl,
  };
};
