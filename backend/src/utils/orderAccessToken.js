import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signOrderAccessToken = ({ orderId, whatsappNumber }) =>
  jwt.sign(
    {
      orderId,
      whatsappNumber,
    },
    env.orderAccessSecret,
    { expiresIn: env.orderAccessExpiresIn },
  );

export const verifyOrderAccessToken = (token) =>
  jwt.verify(token, env.orderAccessSecret);
