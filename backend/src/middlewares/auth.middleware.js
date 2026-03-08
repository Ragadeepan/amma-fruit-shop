import { findUserById } from "../modules/auth/auth.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/jwt.js";

const extractBearerToken = (headerValue) => {
  if (!headerValue || !headerValue.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice(7).trim();
};

export const requireAdminAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    throw new AppError(401, "Authentication token is missing.");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (_error) {
    throw new AppError(401, "Invalid or expired authentication token.");
  }

  const user = await findUserById(payload.sub);

  if (!user || user.role !== "admin") {
    throw new AppError(403, "Admin access is required.");
  }

  req.user = {
    id: user._id,
    email: user.email,
    role: user.role,
  };

  next();
});
