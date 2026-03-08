import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/auth.middleware.js";
import { uploadSingleFruitImage } from "../../middlewares/upload.middleware.js";
import { validate } from "../../utils/validator.js";
import {
  createFruitHandler,
  deleteFruitHandler,
  getFruits,
  uploadFruitImageHandler,
  toggleAvailabilityHandler,
  updateFruitHandler,
} from "./fruits.controller.js";
import {
  availabilityValidation,
  createFruitValidation,
  fruitIdValidation,
  listFruitsValidation,
  updateFruitValidation,
} from "./fruits.validation.js";

const router = Router();

router.get("/", validate(listFruitsValidation), getFruits);
router.post(
  "/upload-image",
  requireAdminAuth,
  uploadSingleFruitImage,
  uploadFruitImageHandler,
);

router.post(
  "/",
  requireAdminAuth,
  validate(createFruitValidation),
  createFruitHandler,
);

router.put(
  "/:fruitId",
  requireAdminAuth,
  validate(updateFruitValidation),
  updateFruitHandler,
);

router.patch(
  "/:fruitId/availability",
  requireAdminAuth,
  validate(availabilityValidation),
  toggleAvailabilityHandler,
);

router.delete(
  "/:fruitId",
  requireAdminAuth,
  validate(fruitIdValidation),
  deleteFruitHandler,
);

export default router;
