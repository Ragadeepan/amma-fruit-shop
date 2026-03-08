import QRCode from "qrcode";
import { env } from "../config/env.js";

const encodeParam = (value) => encodeURIComponent(String(value ?? "").trim());

export const buildUpiIntent = ({ amount, orderCode }) => {
  const params = new URLSearchParams({
    pa: env.upiId,
    pn: env.upiPayeeName,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: `Order ${orderCode}`,
  });

  return `upi://pay?${params.toString()}`;
};

export const generateUpiQrBuffer = async (upiIntent) =>
  QRCode.toBuffer(upiIntent, {
    type: "png",
    width: 320,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

export const generateUpiQrDataUrl = async (upiIntent) =>
  QRCode.toDataURL(upiIntent, {
    type: "image/png",
    width: 320,
    margin: 1,
  });

export const buildQrAccessUrl = ({ orderId, token }) =>
  `${env.publicApiBaseUrl}/orders/${encodeParam(orderId)}/payment-qr.png?token=${encodeParam(token)}`;

export const buildInvoiceAccessUrl = ({ orderId, token }) =>
  `${env.publicApiBaseUrl}/orders/${encodeParam(orderId)}/invoice.pdf?token=${encodeParam(token)}`;
