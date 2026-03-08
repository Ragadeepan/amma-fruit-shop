import { body, param, query } from "express-validator";

const phoneRegex = /^\+?[1-9]\d{9,14}$/;
const firestoreIdRegex = /^[A-Za-z0-9_-]{6,128}$/;
const normalizePhone = (value = "") => {
  const raw = String(value).trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("+")) {
    return `+${raw.slice(1).replace(/\D/g, "")}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
};

export const createOrderValidation = [
  body("customerName")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Customer name must be between 2 and 80 characters."),
  body().custom((_, { req }) => {
    const rawPhone = req.body.whatsappNumber ?? req.body.phone ?? "";
    const normalizedPhone = normalizePhone(rawPhone);

    if (!phoneRegex.test(normalizedPhone)) {
      throw new Error("WhatsApp number must be valid.");
    }

    req.body.whatsappNumber = normalizedPhone;
    return true;
  }),
  body("paymentType").optional().isIn(["cash", "online"]),
  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one fruit item is required."),
  body("items.*.fruitId")
    .customSanitizer((value) => String(value ?? "").trim())
    .matches(firestoreIdRegex)
    .withMessage("Invalid fruit ID."),
  body("items.*.quantityKg")
    .customSanitizer((value) => Number.parseFloat(value))
    .isFloat({ min: 0.25, max: 200 })
    .withMessage("Quantity must be between 0.25 and 200 kg."),
];

export const listOrdersValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("search").optional().trim().isLength({ min: 1, max: 80 }),
  query("paymentStatus").optional().isIn(["pending", "paid", "failed"]),
];

export const orderIdValidation = [
  param("orderId")
    .isString()
    .matches(firestoreIdRegex)
    .withMessage("Invalid order ID."),
];

export const orderAccessTokenValidation = [
  param("orderId")
    .isString()
    .matches(firestoreIdRegex)
    .withMessage("Invalid order ID."),
  query("token").isString().isLength({ min: 20, max: 500 }),
];

export const confirmPaymentValidation = [
  param("orderId")
    .isString()
    .matches(firestoreIdRegex)
    .withMessage("Invalid order ID."),
  body("paymentReference").optional().trim().isLength({ min: 4, max: 80 }),
];

export const updatePaymentStatusValidation = [
  param("orderId")
    .isString()
    .matches(firestoreIdRegex)
    .withMessage("Invalid order ID."),
  body("status")
    .trim()
    .isIn(["paid", "failed"])
    .withMessage("Status must be either paid or failed."),
  body("paymentReference").optional().trim().isLength({ min: 4, max: 80 }),
  body("failureReason").optional().trim().isLength({ min: 4, max: 160 }),
];
