import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  confirmOrderPayment,
  createAutomationOrder,
  createOrder,
  getOrderByIdForAdmin,
  getOrderForCustomer,
  getOrderUpiQrBuffer,
  listOrders,
  updateOrderPaymentStatus,
} from "./orders.service.js";
import {
  buildInvoicePreview,
  generateInvoicePdfBuffer,
} from "../../services/invoice.service.js";

export const createOrderHandler = asyncHandler(async (req, res) => {
  const order = await createOrder(req.body);

  res.status(201).json({
    success: true,
    message: "Order placed successfully.",
    data: order,
  });
});

export const createAutomationOrderHandler = asyncHandler(async (req, res) => {
  const result = await createAutomationOrder(req.body);

  res.status(201).json({
    success: true,
    message: "Automation order placed successfully.",
    data: result,
  });
});

export const listOrdersHandler = asyncHandler(async (req, res) => {
  const data = await listOrders(req.query);

  res.status(200).json({
    success: true,
    data,
  });
});

export const confirmPaymentHandler = asyncHandler(async (req, res) => {
  const order = await confirmOrderPayment({
    orderId: req.params.orderId,
    paymentReference: req.body.paymentReference,
    actor: req.user?.email || "admin",
  });

  res.status(200).json({
    success: true,
    message: "Payment confirmed successfully.",
    data: order,
  });
});

export const updatePaymentStatusHandler = asyncHandler(async (req, res) => {
  const order = await updateOrderPaymentStatus({
    orderId: req.params.orderId,
    status: req.body.status,
    paymentReference: req.body.paymentReference,
    failureReason: req.body.failureReason,
    actor: req.user?.email || "admin",
  });

  res.status(200).json({
    success: true,
    message: "Payment status updated successfully.",
    data: order,
  });
});

export const getCustomerOrderStatusHandler = asyncHandler(async (req, res) => {
  const order = await getOrderForCustomer({
    orderId: req.params.orderId,
    token: req.query.token,
  });

  res.status(200).json({
    success: true,
    data: order,
  });
});

export const getOrderInvoicePreviewHandler = asyncHandler(async (req, res) => {
  const order = await getOrderForCustomer({
    orderId: req.params.orderId,
    token: req.query.token,
  });

  res.status(200).json({
    success: true,
    data: buildInvoicePreview(order),
  });
});

export const downloadOrderInvoiceHandler = asyncHandler(async (req, res) => {
  const order = await getOrderForCustomer({
    orderId: req.params.orderId,
    token: req.query.token,
  });

  const pdfBuffer = await generateInvoicePdfBuffer(order);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${order.orderCode}.pdf"`,
  );
  res.status(200).send(pdfBuffer);
});

export const getOrderQrHandler = asyncHandler(async (req, res) => {
  const qrBuffer = await getOrderUpiQrBuffer({
    orderId: req.params.orderId,
    token: req.query.token,
  });

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "private, max-age=300");
  res.status(200).send(qrBuffer);
});

export const getOrderForAdminHandler = asyncHandler(async (req, res) => {
  const order = await getOrderByIdForAdmin(req.params.orderId);

  res.status(200).json({
    success: true,
    data: order,
  });
});
