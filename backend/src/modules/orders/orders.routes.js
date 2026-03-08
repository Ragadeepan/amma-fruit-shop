import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../utils/validator.js";
import {
  confirmPaymentHandler,
  createOrderHandler,
  downloadOrderInvoiceHandler,
  getCustomerOrderStatusHandler,
  getOrderForAdminHandler,
  getOrderInvoicePreviewHandler,
  getOrderQrHandler,
  listOrdersHandler,
  updatePaymentStatusHandler,
} from "./orders.controller.js";
import {
  confirmPaymentValidation,
  createOrderValidation,
  listOrdersValidation,
  orderAccessTokenValidation,
  orderIdValidation,
  updatePaymentStatusValidation,
} from "./orders.validation.js";

const router = Router();

router.post("/", validate(createOrderValidation), createOrderHandler);
router.get("/:orderId/status", validate(orderAccessTokenValidation), getCustomerOrderStatusHandler);
router.get("/:orderId/invoice-preview", validate(orderAccessTokenValidation), getOrderInvoicePreviewHandler);
router.get("/:orderId/invoice.pdf", validate(orderAccessTokenValidation), downloadOrderInvoiceHandler);
router.get("/:orderId/payment-qr.png", validate(orderAccessTokenValidation), getOrderQrHandler);

router.get("/", requireAdminAuth, validate(listOrdersValidation), listOrdersHandler);
router.get("/:orderId", requireAdminAuth, validate(orderIdValidation), getOrderForAdminHandler);
router.patch(
  "/:orderId/confirm-payment",
  requireAdminAuth,
  validate(confirmPaymentValidation),
  confirmPaymentHandler,
);
router.patch(
  "/:orderId/payment-status",
  requireAdminAuth,
  validate(updatePaymentStatusValidation),
  updatePaymentStatusHandler,
);

export default router;
