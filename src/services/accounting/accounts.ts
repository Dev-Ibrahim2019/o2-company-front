import api from "../../api/axios";
import type { Account, LedgerData } from "./types";

export const accountService = {
  getAll: async (params?: Record<string, any>): Promise<Account[]> => {
    const { data } = await api.get("/accounting/accounts", { params });
    return data.data ?? [];
  },

  getOne: async (id: number, withBalance = false): Promise<Account> => {
    const { data } = await api.get(`/accounting/accounts/${id}`, {
      params: { with_balance: withBalance },
    });
    return data.data;
  },

  create: async (payload: any): Promise<Account> => {
    const { data } = await api.post("/accounting/accounts", payload);
    return data.data;
  },

  update: async (id: number, payload: any): Promise<Account> => {
    const { data } = await api.put(`/accounting/accounts/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounting/accounts/${id}`);
  },

  getLedger: async (
    id: number,
    params?: { from?: string; to?: string },
  ): Promise<LedgerData> => {
    const { data } = await api.get(`/accounting/accounts/${id}/ledger`, {
      params,
    });
    return data.data;
  },

  suggestCode: async (parentId?: number): Promise<string> => {
    const { data } = await api.get("/accounting/accounts/suggest-code", {
      params: parentId ? { parent_id: parentId } : {},
    });
    return data.data?.code ?? "";
  },
};
