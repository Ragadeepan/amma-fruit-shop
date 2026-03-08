import { query } from "express-validator";

export const apiLogsValidation = [
  query("limit").optional().isInt({ min: 1, max: 200 }),
];
