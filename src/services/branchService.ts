// src/services/branchService.ts
// ✅ إصلاح: استخدام الـ api instance المشترك بدل إنشاء axios جديد

import api from "../api/axios";

export interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
  code?: string;
  isMainBranch?: boolean;
  closingTime: string;
  openingTime: string;
}

export const branchService = {
  getAll: async (): Promise<Branch[]> => {
    const { data } = await api.get("/branches");
    return data.data; // Laravel يلف البيانات في "data"
  },

  create: async (payload: Omit<Branch, "id">): Promise<Branch> => {
    const { data } = await api.post("/branches", payload);
    return data.data;
  },

  update: async (id: number, payload: Partial<Branch>): Promise<Branch> => {
    const { data } = await api.put(`/branches/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/branches/${id}`);
  },
};
