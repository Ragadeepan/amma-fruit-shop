import { Router } from "express";
import {
  receiveWhatsAppWebhookHandler,
  verifyWhatsAppWebhookHandler,
} from "./whatsapp.controller.js";

const router = Router();

router.get("/webhook", verifyWhatsAppWebhookHandler);
router.post("/webhook", receiveWhatsAppWebhookHandler);

export default router;
