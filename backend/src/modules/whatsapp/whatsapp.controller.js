import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  assertValidWhatsAppWebhookSignature,
  processWhatsAppWebhookPayload,
  verifyWhatsAppWebhookHandshake,
} from "./whatsapp.service.js";

export const verifyWhatsAppWebhookHandler = asyncHandler(async (req, res) => {
  const challenge = verifyWhatsAppWebhookHandshake({
    mode: req.query["hub.mode"],
    verifyToken: req.query["hub.verify_token"],
    challenge: req.query["hub.challenge"],
  });

  res.status(200).send(challenge);
});

export const receiveWhatsAppWebhookHandler = asyncHandler(async (req, res) => {
  assertValidWhatsAppWebhookSignature({
    signatureHeader: req.headers["x-hub-signature-256"],
    rawBody: req.rawBody,
  });

  await processWhatsAppWebhookPayload(req.body);
  res.status(200).send("EVENT_RECEIVED");
});
