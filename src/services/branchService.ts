// src/services/departmentService.ts

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

// إضافة التوكن تلقائياً لكل طلب
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
  code?: string;
  isMainBranch?: boolean;
  closingTime: Date;
  openingTime: Date;
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

  update: async (
    id: number,
    payload: Partial<Branch>,
  ): Promise<Branch> => {
    const { data } = await api.put(`/branches/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {  
    await api.delete(`/branches/${id}`);
  },
};
