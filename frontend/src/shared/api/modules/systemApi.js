import { httpClient } from "../httpClient.js";

export const systemApi = {
  getApiStatus: async () => {
    const response = await httpClient.get("/system/api-status");
    return response.data.data;
  },
  getApiLogs: async (params = {}) => {
    const response = await httpClient.get("/system/logs", { params });
    return response.data.data;
  },
};
