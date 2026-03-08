const getEnvValue = (key, fallback = "") => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value : fallback;
};

const normalizeApiBaseUrl = (value) => {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  try {
    const parsed = new URL(rawValue);
    const pathname = parsed.pathname.replace(/\/+$/, "");

    if (!pathname || pathname === "/") {
      parsed.pathname = "/api/v1";
    } else if (pathname === "/api") {
      parsed.pathname = "/api/v1";
    } else {
      parsed.pathname = pathname;
    }

    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return rawValue.replace(/\/+$/, "");
  }
};

export const env = Object.freeze({
  apiBaseUrl: normalizeApiBaseUrl(
    getEnvValue("VITE_API_BASE_URL", "http://localhost:5000/api/v1"),
  ),
});
