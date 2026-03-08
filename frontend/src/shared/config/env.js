const getEnvValue = (key, fallback = "") => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value : fallback;
};

export const env = Object.freeze({
  apiBaseUrl: getEnvValue("VITE_API_BASE_URL", "http://localhost:5000/api/v1"),
});
