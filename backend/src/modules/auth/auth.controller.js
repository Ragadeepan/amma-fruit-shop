import { asyncHandler } from "../../utils/asyncHandler.js";
import { loginAdmin } from "./auth.service.js";

export const adminLogin = asyncHandler(async (req, res) => {
  const data = await loginAdmin(req.body);

  res.status(200).json({
    success: true,
    message: "Admin login successful.",
    data,
  });
});
