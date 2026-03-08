import multer from "multer";
import { AppError } from "../utils/AppError.js";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const memoryStorage = multer.memoryStorage();

const imageFileFilter = (_req, file, callback) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    callback(
      new AppError(415, "Only JPG, PNG, WEBP, or AVIF images are allowed."),
    );
    return;
  }

  callback(null, true);
};

export const uploadSingleFruitImage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: imageFileFilter,
}).single("image");
