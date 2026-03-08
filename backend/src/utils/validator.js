import { validationResult } from "express-validator";
import { AppError } from "./AppError.js";

export const validate = (rules = []) => [
  ...rules,
  (req, _res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    const fields = errors.array({ onlyFirstError: true }).map((field) => {
      if (field.msg !== "Invalid value") {
        return field;
      }

      if (!field.path) {
        return {
          ...field,
          msg: "Request payload is invalid. Please review your input values.",
        };
      }

      return {
        ...field,
        msg: `${field.path} contains an invalid value.`,
      };
    });

    return next(
      new AppError(422, "Validation failed.", {
        fields,
      }),
    );
  },
];
