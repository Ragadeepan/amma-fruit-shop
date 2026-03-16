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
const supportedMessageModes = new Set(["text", "template"]);

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

const recomputeReadiness = (value) => {
  value.issues = [...value.sendIssues, ...value.webhookIssues];
  value.sendReady = value.sendIssues.length === 0;
  value.webhookReady = value.webhookIssues.length === 0;
  value.ready = value.sendReady && value.webhookReady;

  return value;
};

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

const buildExpectedWebhookUrl = () =>
  `${env.publicApiBaseUrl.replace(/\/$/, "")}/whatsapp/webhook`;

export const getStaticWhatsAppReadiness = () => {
  const sendIssues = [];
  const webhookIssues = [];

  if (!supportedMessageModes.has(env.whatsappMessageMode)) {
    sendIssues.push("WHATSAPP_MESSAGE_MODE must be either text or template.");
  }

  if (!env.whatsappEnabled) {
    sendIssues.push("WHATSAPP_ENABLED must be true.");
  }

  if (!env.whatsappPhoneNumberId) {
    sendIssues.push("WHATSAPP_PHONE_NUMBER_ID is missing.");
  }

  if (!env.whatsappAccessToken) {
    sendIssues.push("WHATSAPP_ACCESS_TOKEN is missing.");
  }

  if (!env.whatsappWebhookVerifyToken) {
    webhookIssues.push("WHATSAPP_WEBHOOK_VERIFY_TOKEN is missing.");
  }

  if (!env.whatsappAppSecret) {
    webhookIssues.push("WHATSAPP_APP_SECRET is missing.");
  }

  if (env.whatsappMessageMode === "template") {
    if (!env.whatsappTemplateOnlineOrderName) {
      sendIssues.push("WHATSAPP_TEMPLATE_ONLINE_ORDER_NAME is missing.");
    }

    if (!env.whatsappTemplateCashOrderName) {
      sendIssues.push("WHATSAPP_TEMPLATE_CASH_ORDER_NAME is missing.");
    }
  }

  const publicApiUrl = parseUrl(env.publicApiBaseUrl);

  if (!publicApiUrl) {
    sendIssues.push("PUBLIC_API_BASE_URL is not a valid URL.");
  } else {
    if (publicApiUrl.protocol !== "https:") {
      sendIssues.push("PUBLIC_API_BASE_URL must use https://");
    }

    if (isLocalHost(publicApiUrl.hostname)) {
      sendIssues.push(
        "PUBLIC_API_BASE_URL must be publicly reachable and cannot use localhost/127.0.0.1.",
      );
    }
  }

  return recomputeReadiness({
    publicApiBaseUrl: env.publicApiBaseUrl,
    messageMode: env.whatsappMessageMode,
    sendIssues,
    webhookIssues,
    expectedWebhookUrl: buildExpectedWebhookUrl(),
    templateNames: {
      online: env.whatsappTemplateOnlineOrderName,
      cash: env.whatsappTemplateCashOrderName,
    },
  });
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
      webhook: getSkippedCheckResult(
        `Configure Meta webhook callback URL as ${buildExpectedWebhookUrl()}.`,
      ),
    },
  };

  if (baseReadiness.sendReady && settings.verifyPublicApiBaseUrl) {
    try {
      result.checks.publicApiBaseUrl = createCheckResult(
        "passed",
        await verifyPublicApiBaseUrl(),
      );
    } catch (error) {
      const detail =
        error?.cause?.message || error?.message || "Public API verification failed.";
      result.checks.publicApiBaseUrl = createCheckResult("failed", detail);
      result.sendIssues.push(detail);
    }
  }

  if (baseReadiness.sendReady && settings.verifyToken) {
    try {
      result.checks.token = createCheckResult("passed", await verifyWhatsAppToken());
    } catch (error) {
      const detail =
        error?.cause?.message || error?.message || "WhatsApp token verification failed.";
      result.checks.token = createCheckResult("failed", detail);
      result.sendIssues.push(detail);
    }
  }

  recomputeReadiness(result);

  readinessCache.set(cacheKey, {
    expiresAt: now + READINESS_CACHE_TTL_MS,
    result: cloneResult(result),
  });

  return result;
};
