const MAX_REQUEST_LOGS = 300;
const MAX_EXTERNAL_LOGS = 300;

const requestLogs = [];
const externalLogs = [];

const requestMetrics = {
  total: 0,
  success2xx: 0,
  redirect3xx: 0,
  client4xx: 0,
  server5xx: 0,
};

const externalMetrics = {
  total: 0,
  success: 0,
  failed: 0,
};

const trimLogs = (logs, maxLength) => {
  if (logs.length > maxLength) {
    logs.splice(0, logs.length - maxLength);
  }
};

const incrementRequestBucket = (statusCode) => {
  requestMetrics.total += 1;

  if (statusCode >= 500) {
    requestMetrics.server5xx += 1;
    return;
  }

  if (statusCode >= 400) {
    requestMetrics.client4xx += 1;
    return;
  }

  if (statusCode >= 300) {
    requestMetrics.redirect3xx += 1;
    return;
  }

  requestMetrics.success2xx += 1;
};

export const logRequestStatus = (entry) => {
  incrementRequestBucket(entry.statusCode);
  requestLogs.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  trimLogs(requestLogs, MAX_REQUEST_LOGS);
};

export const logExternalApiStatus = (entry) => {
  externalMetrics.total += 1;
  if (entry.success) {
    externalMetrics.success += 1;
  } else {
    externalMetrics.failed += 1;
  }

  externalLogs.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  trimLogs(externalLogs, MAX_EXTERNAL_LOGS);
};

export const getApiStatusSnapshot = () => ({
  requestMetrics: { ...requestMetrics },
  externalMetrics: { ...externalMetrics },
  lastRequest: requestLogs.at(-1) ?? null,
  lastExternal: externalLogs.at(-1) ?? null,
});

export const getRecentRequestLogs = (limit = 40) =>
  requestLogs.slice(-Math.max(1, Math.min(200, limit))).reverse();

export const getRecentExternalLogs = (limit = 40) =>
  externalLogs.slice(-Math.max(1, Math.min(200, limit))).reverse();
