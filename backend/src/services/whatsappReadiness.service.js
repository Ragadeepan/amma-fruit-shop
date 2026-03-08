import { env } from "../config/env.js";

const READINESS_CACHE_TTL_MS = 60 * 1000;
const READINESS_TIMEOUT_MS = 5000;
const readinessCache = new Map();

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const cloneResult = (value) => JSON.parse(JSON.stringify(value));

const isLocalHost = (hostname) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1" ||
  hostname.endsWith(".local");

const createCheckResult = (status, detail) => ({
  status,
  detail,
  checkedAt: new Date().toISOString(),
});

const getSkippedCheckResult = (detail) => ({
  status: "skipped",
  detail,
  checkedAt: null,
});

const fetchWithTimeout = async (url, options = {}, timeoutMs = READINESS_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const verifyWhatsAppToken = async () => {
  const response = await fetchWithTimeout(
    `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}?fields=id`,
    {
      headers: {
        Authorization: `Bearer ${env.whatsappAccessToken}`,
      },
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `Token verification failed with status ${response.status}.`,
    );
  }

  if (!data?.id) {
    throw new Error(
      "Token check succeeded but WhatsApp phone number ID was not returned.",
    );
  }

  return `Token verified for phone number ID ${data.id}.`;
};

const verifyPublicApiBaseUrl = async () => {
  const healthUrl = `${env.publicApiBaseUrl.replace(/\/$/, "")}/health`;
  const response = await fetchWithTimeout(healthUrl);

  if (!response.ok) {
    throw new Error(
      `PUBLIC_API_BASE_URL health check failed (${response.status}) at ${healthUrl}.`,
    );
  }

  return `Public API health check passed at ${healthUrl}.`;
};

export const getStaticWhatsAppReadiness = () => {
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

export const getWhatsAppReadiness = async (options = {}) => {
  const settings = {
    verifyPublicApiBaseUrl: false,
    verifyToken: false,
    forceRefresh: false,
    ...options,
  };

  const cacheKey = JSON.stringify({
    verifyPublicApiBaseUrl: settings.verifyPublicApiBaseUrl,
    verifyToken: settings.verifyToken,
  });
  const now = Date.now();
  const cached = readinessCache.get(cacheKey);

  if (!settings.forceRefresh && cached && cached.expiresAt > now) {
    return cloneResult(cached.result);
  }

  const baseReadiness = getStaticWhatsAppReadiness();
  const result = {
    ...baseReadiness,
    checks: {
      publicApiBaseUrl: settings.verifyPublicApiBaseUrl
        ? getSkippedCheckResult(
            "Skipped until base WhatsApp configuration issues are fixed.",
          )
        : getSkippedCheckResult("Public API verification was not requested."),
      token: settings.verifyToken
        ? getSkippedCheckResult(
            "Skipped until base WhatsApp configuration issues are fixed.",
          )
        : getSkippedCheckResult("Token verification was not requested."),
    },
  };

  if (baseReadiness.ready && settings.verifyPublicApiBaseUrl) {
    try {
      result.checks.publicApiBaseUrl = createCheckResult(
        "passed",
        await verifyPublicApiBaseUrl(),
      );
    } catch (error) {
      const detail =
        error?.cause?.message || error?.message || "Public API verification failed.";
      result.checks.publicApiBaseUrl = createCheckResult("failed", detail);
      result.issues.push(detail);
    }
  }

  if (baseReadiness.ready && settings.verifyToken) {
    try {
      result.checks.token = createCheckResult("passed", await verifyWhatsAppToken());
    } catch (error) {
      const detail =
        error?.cause?.message || error?.message || "WhatsApp token verification failed.";
      result.checks.token = createCheckResult("failed", detail);
      result.issues.push(detail);
    }
  }

  result.ready = result.issues.length === 0;

  readinessCache.set(cacheKey, {
    expiresAt: now + READINESS_CACHE_TTL_MS,
    result: cloneResult(result),
  });

  return result;
};
