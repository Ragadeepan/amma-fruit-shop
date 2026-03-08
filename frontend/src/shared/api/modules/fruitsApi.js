import { httpClient } from "../httpClient.js";

export const fruitsApi = {
  list: async (params = {}) => {
    const response = await httpClient.get("/fruits", { params });
    return response.data.data;
  },
  create: async (payload) => {
    const response = await httpClient.post("/fruits", payload);
    return response.data.data;
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await httpClient.post("/fruits/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.data;
  },
  update: async (fruitId, payload) => {
    const response = await httpClient.put(`/fruits/${fruitId}`, payload);
    return response.data.data;
  },
  toggleAvailability: async (fruitId, isAvailable) => {
    const response = await httpClient.patch(`/fruits/${fruitId}/availability`, {
      isAvailable,
    });
    return response.data.data;
  },
  remove: async (fruitId) => {
    const response = await httpClient.delete(`/fruits/${fruitId}`);
    return response.data;
  },
};
