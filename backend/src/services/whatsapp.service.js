import { env } from "../config/env.js";
import { logExternalApiStatus } from "./apiStatus.service.js";
import { getWhatsAppReadiness } from "./whatsappReadiness.service.js";

const hasWhatsAppConfig = () =>
  Boolean(
    env.whatsappEnabled && env.whatsappPhoneNumberId && env.whatsappAccessToken,
  );

const isTemplateMode = () => env.whatsappMessageMode === "template";

const endpoint = () =>
  `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`;

const normalizeRecipient = (phone) =>
  (env.whatsappRecipientOverride || phone).replace(/[^\d]/g, "");

const truncateText = (value, maxLength = 500) => {
  const normalized = String(value ?? "").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
};

const normalizeWhatsAppErrorMessage = (message = "") => {
  const normalizedMessage = String(message ?? "").trim();
  const lowerMessage = normalizedMessage.toLowerCase();

  if (
    normalizedMessage.includes("(#131030)") ||
    lowerMessage.includes("recipient phone number not in allowed list")
  ) {
    return "This customer number is not added in Meta test recipients. Open Meta Developers -> WhatsApp -> API Setup, add the number in the 'To' list, verify OTP, then retry.";
  }

  if (lowerMessage.includes("session has expired")) {
    return "WhatsApp access token expired. Generate a new token in Meta and restart the backend.";
  }

  if (
    lowerMessage.includes("template name") &&
    lowerMessage.includes("does not exist")
  ) {
    return "Configured WhatsApp template name does not exist or is not approved for this business number.";
  }

  if (
    lowerMessage.includes("template") &&
    lowerMessage.includes("parameter")
  ) {
    return "WhatsApp template parameters do not match the approved template definition.";
  }

  return normalizedMessage;
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

const buildItemSummary = (items = []) =>
  truncateText(
    items
      .map((item) => `${item.fruitName} ${item.quantityKg}kg`)
      .join(", "),
    500,
  );

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
    `UPI Link: ${order.payment?.upiIntent ?? ""}`,
    "Please complete payment in your UPI app.",
    "Thank you for purchasing in Amma Fruit Shop.",
  ].join("\n");

const buildPaymentInstruction = ({ order, qrImageUrl }) =>
  order.paymentType === "online"
    ? truncateText(order.payment?.upiIntent || qrImageUrl || `UPI ID: ${env.upiId}`, 500)
    : "Cash at counter";

const getTemplateNameForOrder = (order) => {
  const templateName =
    order.paymentType === "cash"
      ? env.whatsappTemplateCashOrderName
      : env.whatsappTemplateOnlineOrderName;

  if (!templateName) {
    throw new Error(
      order.paymentType === "cash"
        ? "WHATSAPP_TEMPLATE_CASH_ORDER_NAME is missing."
        : "WHATSAPP_TEMPLATE_ONLINE_ORDER_NAME is missing.",
    );
  }

  return templateName;
};

const buildOrderTemplatePayload = ({ order, qrImageUrl, invoiceUrl }) => {
  const recipient = normalizeRecipient(order.whatsappNumber);
  const templateName = getTemplateNameForOrder(order);
  const paymentLabel =
    order.paymentType === "online" ? "Online payment" : "Cash at counter";

  return {
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: env.whatsappTemplateLanguageCode,
      },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: truncateText(order.customerName, 60) },
            { type: "text", text: order.orderCode },
            { type: "text", text: buildItemSummary(order.items) },
            {
              type: "text",
              text: `Rs ${Number(order.totalAmount).toFixed(2)}`,
            },
            { type: "text", text: paymentLabel },
            { type: "text", text: truncateText(invoiceUrl, 500) },
            {
              type: "text",
              text: buildPaymentInstruction({ order, qrImageUrl }),
            },
          ],
        },
      ],
    },
  };
};

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

  return {
    messageId: textResponse?.messages?.[0]?.id ?? "",
    transport: "text",
  };
};

const sendOrderWhatsAppTemplate = async ({ order, qrImageUrl, invoiceUrl }) => {
  const templateResponse = await postWhatsAppMessage(
    buildOrderTemplatePayload({ order, qrImageUrl, invoiceUrl }),
  );

  return {
    messageId: templateResponse?.messages?.[0]?.id ?? "",
    transport: "template",
  };
};

const withReadinessGuard = async ({ sendFn, orderCode }) => {
  const readiness = await getWhatsAppReadiness({
    verifyPublicApiBaseUrl: true,
  });

  if (!hasWhatsAppConfig() || !readiness.sendReady) {
    const reason =
      readiness.sendIssues.join(" ") ||
      readiness.issues.join(" ") ||
      "WhatsApp configuration is missing or disabled.";

    logExternalApiStatus({
      service: "whatsapp",
      success: false,
      detail: reason,
    });

    return {
      sent: false,
      status: "not_sent",
      reason,
      messageId: "",
      transport: isTemplateMode() ? "template" : "text",
      acceptedAt: null,
    };
  }

  try {
    const sendResult = await sendFn();

    logExternalApiStatus({
      service: "whatsapp",
      success: true,
      detail: `Message accepted for ${orderCode} via ${sendResult.transport}.`,
    });

    return {
      sent: true,
      status: "sent",
      reason: "",
      messageId: sendResult.messageId,
      transport: sendResult.transport,
      acceptedAt: new Date(),
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
      transport: isTemplateMode() ? "template" : "text",
      acceptedAt: null,
    };
  }
};

export const sendCashOrderWhatsAppMessage = async ({ order, invoiceUrl }) =>
  withReadinessGuard({
    orderCode: order.orderCode,
    sendFn: () =>
      isTemplateMode()
        ? sendOrderWhatsAppTemplate({
            order,
            qrImageUrl: "",
            invoiceUrl,
          })
        : sendOrderWhatsAppText({
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
    sendFn: () =>
      isTemplateMode()
        ? sendOrderWhatsAppTemplate({
            order,
            qrImageUrl,
            invoiceUrl,
          })
        : sendOrderWhatsAppText({
            order,
            bodyText: buildOnlineOrderMessage({ order, qrImageUrl, invoiceUrl }),
          }),
  });
