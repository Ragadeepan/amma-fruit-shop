import { httpClient } from "../httpClient.js";

export const authApi = {
  login: async ({ email, password }) => {
    const response = await httpClient.post("/auth/login", { email, password });
    return response.data.data;
  },
};
