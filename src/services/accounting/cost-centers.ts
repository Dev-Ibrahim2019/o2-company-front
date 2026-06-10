import api from "../../api/axios";
import type { CostCenter } from "./types";

export const costCenterService = {
  getAll: async (params?: Record<string, any>): Promise<CostCenter[]> => {
    const { data } = await api.get("/accounting/cost-centers", { params });
    return data.data ?? [];
  },

  create: async (payload: any): Promise<CostCenter> => {
    const { data } = await api.post("/accounting/cost-centers", payload);
    return data.data;
  },

  update: async (id: number, payload: any): Promise<CostCenter> => {
    const { data } = await api.put(`/accounting/cost-centers/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounting/cost-centers/${id}`);
  },

  suggestCode: async (parentId?: number): Promise<string> => {
    const { data } = await api.get("/accounting/cost-centers/suggest-code", {
      params: parentId ? { parent_id: parentId } : {},
    });
    return data.data?.code ?? "";
  },
};
