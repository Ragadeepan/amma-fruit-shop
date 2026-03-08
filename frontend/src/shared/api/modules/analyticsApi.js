import { httpClient } from "../httpClient.js";

export const analyticsApi = {
  getSummary: async () => {
    const response = await httpClient.get("/analytics/summary");
    return response.data.data;
  },
  getDaySales: async () => {
    const response = await httpClient.get("/analytics/day-sales");
    return response.data.data;
  },
  getMonthlySales: async () => {
    const response = await httpClient.get("/analytics/monthly-sales");
    return response.data.data;
  },
};
