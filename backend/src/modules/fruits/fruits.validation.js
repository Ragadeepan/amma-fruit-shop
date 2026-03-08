import { body, param, query } from "express-validator";
const firestoreIdRegex = /^[A-Za-z0-9_-]{6,128}$/;

export const createFruitValidation = [
  body("name").trim().isLength({ min: 2, max: 80 }),
  body("description").optional().trim().isLength({ max: 500 }),
  body("imageUrl").trim().isURL(),
  body("category").optional().trim().isLength({ min: 2, max: 50 }),
  body("pricePerKg").isFloat({ min: 0 }),
  body("stockKg").isFloat({ min: 0 }),
  body("isAvailable").optional().isBoolean(),
];

export const updateFruitValidation = [
  param("fruitId")
    .isString()
    .matches(firestoreIdRegex)
    .withMessage("Invalid fruit ID."),
  body("name").optional().trim().isLength({ min: 2, max: 80 }),
  body("description").optional().trim().isLength({ max: 500 }),
  body("imageUrl").optional().trim().isURL(),
  body("category").optional().trim().isLength({ min: 2, max: 50 }),
  body("pricePerKg").optional().isFloat({ min: 0 }),
  body("stockKg").optional().isFloat({ min: 0 }),
  body("isAvailable").optional().isBoolean(),
];

export const listFruitsValidation = [
  query("search").optional().trim().isLength({ max: 80 }),
  query("category").optional().trim().isLength({ max: 50 }),
  query("available").optional().isIn(["true", "false"]),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
];

export const fruitIdValidation = [
  param("fruitId")
    .isString()
    .matches(firestoreIdRegex)
    .withMessage("Invalid fruit ID."),
];

export const availabilityValidation = [
  param("fruitId")
    .isString()
    .matches(firestoreIdRegex)
    .withMessage("Invalid fruit ID."),
  body("isAvailable").isBoolean(),
];
