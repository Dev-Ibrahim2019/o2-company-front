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
  static_ip?: string;
}

async function unwrapBranches(payload: any): Promise<Branch[]> {
  const raw = payload?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export const branchService = {
  getAll: async (): Promise<Branch[]> => {
    try {
      const { data } = await api.get("/branches");
      const list = unwrapBranches(data);
      console.debug("[branchService] branches loaded:", list.length, list);
      return list;
    } catch (err) {
      console.error("[branchService] failed to load branches:", err);
      return [];
    }
  },

  getOne: async (id: number): Promise<Branch> => {
    const { data } = await api.get(`/branches/${id}`);
    return data.data;
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