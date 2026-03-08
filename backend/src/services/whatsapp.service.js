import { env } from "../config/env.js";
import { logExternalApiStatus } from "./apiStatus.service.js";
import { getWhatsAppReadiness } from "./whatsappReadiness.service.js";

const hasWhatsAppConfig = () =>
  Boolean(
    env.whatsappEnabled && env.whatsappPhoneNumberId && env.whatsappAccessToken,
  );

const endpoint = () =>
  `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`;

const normalizeRecipient = (phone) =>
  (env.whatsappRecipientOverride || phone).replace(/[^\d]/g, "");

const normalizeWhatsAppErrorMessage = (message = "") => {
  if (
    message.includes("(#131030)") ||
    message.toLowerCase().includes("recipient phone number not in allowed list")
  ) {
    return "This customer number is not added in Meta test recipients. Open Meta Developers -> WhatsApp -> API Setup, add the number in the 'To' list, verify OTP, then retry.";
  }

  if (message.toLowerCase().includes("session has expired")) {
    return "WhatsApp access token expired. Generate a new token in Meta and restart the backend.";
  }

  return message;
};

const postWhatsAppMessage = async (payload) => {
  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.whatsappAccessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      normalizeWhatsAppErrorMessage(
        data?.error?.message ||
        `WhatsApp API request failed with status ${response.status}.`,
      ),
    );
  }

  return data;
};

const buildOrderItemLines = (items = []) =>
  items
    .map(
      (item) =>
        `- ${item.fruitName}: ${item.quantityKg}kg x Rs ${Number(item.pricePerKg).toFixed(2)} = Rs ${Number(item.lineTotal).toFixed(2)}`,
    )
    .join("\n");

const buildBaseMessage = ({ order, invoiceUrl }) =>
  [
    `Invoice: ${order.orderCode}`,
    `Customer: ${order.customerName}`,
    "Items:",
    buildOrderItemLines(order.items),
    `Total: Rs ${Number(order.totalAmount).toFixed(2)}`,
    `Payment type: ${order.paymentType}`,
    `Invoice PDF: ${invoiceUrl}`,
  ].join("\n");

const buildCashOrderMessage = ({ order, invoiceUrl }) =>
  [
    buildBaseMessage({ order, invoiceUrl }),
    "Payment: Cash at counter",
    "Thank you for purchasing in Amma Fruit Shop.",
  ].join("\n");

const buildOnlineOrderMessage = ({ order, qrImageUrl, invoiceUrl }) =>
  [
    buildBaseMessage({ order, invoiceUrl }),
    `UPI ID: ${env.upiId}`,
    `UPI QR: ${qrImageUrl}`,
    "Please complete payment in your UPI app.",
    "Thank you for purchasing in Amma Fruit Shop.",
  ].join("\n");

const sendOrderWhatsAppText = async ({ order, bodyText }) => {
  const recipient = normalizeRecipient(order.whatsappNumber);
  const textResponse = await postWhatsAppMessage({
    messaging_product: "whatsapp",
    to: recipient,
    type: "text",
    text: {
      preview_url: true,
      body: bodyText,
    },
  });

  return textResponse?.messages?.[0]?.id ?? "";
};

const withReadinessGuard = async ({ sendFn, orderCode }) => {
  const readiness = await getWhatsAppReadiness({
    verifyPublicApiBaseUrl: true,
  });

  if (!hasWhatsAppConfig() || !readiness.ready) {
    const reason =
      readiness.issues.join(" ") ||
      "WhatsApp configuration is missing or disabled.";
    const status = hasWhatsAppConfig() ? "failed" : "not_sent";

    logExternalApiStatus({
      service: "whatsapp",
      success: false,
      detail: reason,
    });

    return {
      sent: false,
      status,
      reason,
      messageId: "",
    };
  }

  try {
    const messageId = await sendFn();

    logExternalApiStatus({
      service: "whatsapp",
      success: true,
      detail: `Message sent for ${orderCode}`,
    });

    return {
      sent: true,
      status: "sent",
      reason: "",
      messageId,
    };
  } catch (error) {
    logExternalApiStatus({
      service: "whatsapp",
      success: false,
      detail: error.message,
    });

    return {
      sent: false,
      status: "failed",
      reason: error.message,
      messageId: "",
    };
  }
};

export const sendCashOrderWhatsAppMessage = async ({ order, invoiceUrl }) =>
  withReadinessGuard({
    orderCode: order.orderCode,
    sendFn: () =>
      sendOrderWhatsAppText({
        order,
        bodyText: buildCashOrderMessage({ order, invoiceUrl }),
      }),
  });

export const sendOnlineOrderWhatsAppMessage = async ({
  order,
  qrImageUrl,
  invoiceUrl,
}) =>
  withReadinessGuard({
    orderCode: order.orderCode,
    sendFn: async () => {
      const recipient = normalizeRecipient(order.whatsappNumber);
      await postWhatsAppMessage({
        messaging_product: "whatsapp",
        to: recipient,
        type: "image",
        image: {
          link: qrImageUrl,
          caption: `UPI QR for order ${order.orderCode}`,
        },
      });

      return sendOrderWhatsAppText({
        order,
        bodyText: buildOnlineOrderMessage({ order, qrImageUrl, invoiceUrl }),
      });
    },
  });
