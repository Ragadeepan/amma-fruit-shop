import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { docRef } from "../../services/firestore.service.js";
import {
  collectionRef,
  collections,
  mapDocs,
} from "../../services/firestore.service.js";
import { logExternalApiStatus } from "../../services/apiStatus.service.js";
import { AppError } from "../../utils/AppError.js";

const STATUS_RANK = Object.freeze({
  not_sent: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
});

const normalizeWebhookStatus = (value = "") => {
  const status = String(value ?? "").trim().toLowerCase();

  if (status === "delivered" || status === "read" || status === "failed") {
    return status;
  }

  if (status === "sent") {
    return "sent";
  }

  return "";
};

const extractStatusTimestamp = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return new Date();
  }

  return new Date(parsed * 1000);
};

const extractFailureReason = (statusEntry = {}) => {
  const errorDetail = statusEntry.errors?.[0];
  if (!errorDetail) {
    return "";
  }

  return (
    errorDetail.error_data?.details ||
    errorDetail.title ||
    errorDetail.message ||
    ""
  );
};

const shouldPromoteStatus = (currentStatus, nextStatus) => {
  if (!nextStatus) {
    return false;
  }

  if (nextStatus === "failed") {
    return true;
  }

  return (
    (STATUS_RANK[nextStatus] ?? -1) > (STATUS_RANK[currentStatus] ?? -1)
  );
};

const findOrderByWhatsAppMessageId = async (messageId) => {
  if (!messageId) {
    return null;
  }

  const snapshot = await collectionRef(collections.orders)
    .where("payment.whatsappMessageId", "==", messageId)
    .limit(1)
    .get();

  return mapDocs(snapshot)[0] ?? null;
};

const updateOrderFromStatusEntry = async (statusEntry) => {
  const messageId = String(statusEntry.id ?? "").trim();
  const order = await findOrderByWhatsAppMessageId(messageId);

  if (!order) {
    return false;
  }

  const nextStatus = normalizeWebhookStatus(statusEntry.status);
  if (!shouldPromoteStatus(order.payment?.whatsappStatus, nextStatus)) {
    return false;
  }

  const eventTimestamp = extractStatusTimestamp(statusEntry.timestamp);
  const failureReason =
    nextStatus === "failed" ? extractFailureReason(statusEntry) : "";

  const updates = {
    "payment.whatsappStatus": nextStatus,
    "payment.whatsappConversationId": statusEntry.conversation?.id ?? "",
    "payment.whatsappPricingCategory": statusEntry.pricing?.category ?? "",
    "payment.whatsappLastWebhookAt": eventTimestamp,
    updatedAt: new Date(),
  };

  if (nextStatus === "delivered") {
    updates["payment.whatsappDeliveredAt"] = eventTimestamp;
  }

  if (nextStatus === "read") {
    updates["payment.whatsappReadAt"] = eventTimestamp;
  }

  if (nextStatus === "failed") {
    updates["payment.whatsappFailedAt"] = eventTimestamp;
    updates["payment.whatsappError"] = failureReason;
  }

  await docRef(collections.orders, order._id).update(updates);
  return true;
};

const getWebhookSignature = (headerValue = "") =>
  String(headerValue ?? "").trim().replace(/^sha256=/i, "");

export const verifyWhatsAppWebhookHandshake = ({
  mode,
  verifyToken,
  challenge,
}) => {
  if (mode !== "subscribe") {
    throw new AppError(400, "Invalid webhook mode.");
  }

  if (!env.whatsappWebhookVerifyToken) {
    throw new AppError(500, "WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured.");
  }

  if (verifyToken !== env.whatsappWebhookVerifyToken) {
    throw new AppError(403, "Webhook verify token is invalid.");
  }

  return challenge;
};

export const assertValidWhatsAppWebhookSignature = ({
  signatureHeader,
  rawBody,
}) => {
  if (!env.whatsappAppSecret) {
    return;
  }

  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    throw new AppError(400, "Webhook raw body is missing for signature validation.");
  }

  const providedSignature = getWebhookSignature(signatureHeader);
  if (!providedSignature) {
    throw new AppError(401, "Missing x-hub-signature-256 header.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.whatsappAppSecret)
    .update(rawBody)
    .digest("hex");

  const providedBuffer = Buffer.from(providedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new AppError(401, "Webhook signature validation failed.");
  }
};

export const processWhatsAppWebhookPayload = async (payload = {}) => {
  const statusEntries =
    payload.entry?.flatMap((entry) =>
      entry.changes?.flatMap((change) => change.value?.statuses ?? []) ?? [],
    ) ?? [];

  let updatedOrders = 0;

  for (const statusEntry of statusEntries) {
    if (await updateOrderFromStatusEntry(statusEntry)) {
      updatedOrders += 1;
    }
  }

  logExternalApiStatus({
    service: "whatsapp-webhook",
    success: true,
    detail: `Received ${statusEntries.length} status events, updated ${updatedOrders} orders.`,
  });

  return {
    receivedStatuses: statusEntries.length,
    updatedOrders,
  };
};
