import axios from "axios";
import { env } from "../config/env.js";
import { storageKeys } from "../constants/storageKeys.js";

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(storageKeys.adminToken);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error?.response?.status === 401
    ) {
      window.localStorage.removeItem(storageKeys.adminToken);
      window.localStorage.removeItem(storageKeys.adminProfile);
      window.dispatchEvent(new CustomEvent("amma-auth-expired"));
    }

    return Promise.reject(error);
  },
);
