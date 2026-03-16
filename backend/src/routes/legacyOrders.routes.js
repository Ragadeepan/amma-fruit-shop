import { Router } from "express";
import {
  createAutomationOrderHandler,
} from "../modules/orders/orders.controller.js";
import { createAutomationOrderValidation } from "../modules/orders/orders.validation.js";
import { validate } from "../utils/validator.js";

const legacyOrdersRouter = Router();

legacyOrdersRouter.post(
  "/create",
  validate(createAutomationOrderValidation),
  createAutomationOrderHandler,
);

export default legacyOrdersRouter;
