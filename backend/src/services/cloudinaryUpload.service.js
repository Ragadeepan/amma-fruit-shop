import { configureCloudinary } from "../config/cloudinary.js";
import { AppError } from "../utils/AppError.js";

const mapUploadResult = (result) => ({
  imageUrl: result.secure_url,
  publicId: result.public_id,
  width: result.width,
  height: result.height,
  format: result.format,
  bytes: result.bytes,
});

export const uploadImageBuffer = async ({
  buffer,
  folder,
  publicId,
  overwrite = false,
}) => {
  const cloudinary = configureCloudinary();

  if (!cloudinary) {
    throw new AppError(
      503,
      "Cloudinary is not configured. Add CLOUDINARY_* values in .env.",
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        public_id: publicId,
        overwrite,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(new AppError(502, `Cloudinary upload failed: ${error.message}`));
          return;
        }

        resolve(mapUploadResult(result));
      },
    );

    uploadStream.end(buffer);
  });
};
