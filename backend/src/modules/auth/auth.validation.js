import { body } from "express-validator";

export const adminLoginValidation = [
  body("email").isEmail().withMessage("Valid email is required."),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must contain at least 6 characters."),
];
