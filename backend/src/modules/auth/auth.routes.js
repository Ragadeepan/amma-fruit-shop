import { Router } from "express";
import { adminLogin } from "./auth.controller.js";
import { adminLoginValidation } from "./auth.validation.js";
import { validate } from "../../utils/validator.js";

const router = Router();

router.post("/login", validate(adminLoginValidation), adminLogin);

export default router;
