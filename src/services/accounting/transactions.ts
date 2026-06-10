import api from "../../api/axios";
import type { Transaction } from "./types";

export const transactionService = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await api.get("/accounting/transactions", { params });
    return (
      data.data ?? {
        data: [],
        pagination: { current_page: 1, last_page: 1, total: 0, per_page: 30 },
      }
    );
  },

  getOne: async (id: number): Promise<Transaction> => {
    const { data } = await api.get(`/accounting/transactions/${id}`);
    return data.data?.transaction ?? data.data;
  },

  create: async (payload: any): Promise<Transaction> => {
    const { data } = await api.post("/accounting/transactions", payload);
    return data.data;
  },

  update: async (id: number, payload: any): Promise<Transaction> => {
    const { data } = await api.put(`/accounting/transactions/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounting/transactions/${id}`);
  },

  post: async (id: number): Promise<Transaction> => {
    const { data } = await api.post(`/accounting/transactions/${id}/post`);
    return data.data;
  },

  cancel: async (id: number): Promise<Transaction> => {
    const { data } = await api.post(`/accounting/transactions/${id}/cancel`);
    return data.data;
  },
};
