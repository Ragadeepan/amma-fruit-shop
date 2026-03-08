import { httpClient } from "../httpClient.js";

export const ordersApi = {
  create: async (payload) => {
    const response = await httpClient.post("/orders", payload);
    return response.data.data;
  },
  list: async (params = {}) => {
    const response = await httpClient.get("/orders", { params });
    return response.data.data;
  },
  getStatus: async ({ orderId, token }) => {
    const response = await httpClient.get(`/orders/${orderId}/status`, {
      params: { token },
    });
    return response.data.data;
  },
  getInvoicePreview: async ({ orderId, token }) => {
    const response = await httpClient.get(`/orders/${orderId}/invoice-preview`, {
      params: { token },
    });
    return response.data.data;
  },
  downloadInvoicePdf: async ({ orderId, token }) => {
    const response = await httpClient.get(`/orders/${orderId}/invoice.pdf`, {
      params: { token },
      responseType: "blob",
    });
    return response.data;
  },
  confirmPayment: async ({ orderId, paymentReference }) => {
    const response = await httpClient.patch(`/orders/${orderId}/confirm-payment`, {
      paymentReference,
    });
    return response.data.data;
  },
  updatePaymentStatus: async ({
    orderId,
    status,
    paymentReference,
    failureReason,
  }) => {
    const response = await httpClient.patch(`/orders/${orderId}/payment-status`, {
      status,
      paymentReference,
      failureReason,
    });
    return response.data.data;
  },
};
