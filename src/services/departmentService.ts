// src/services/departmentService.ts

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

// إضافة التوكن تلقائياً لكل طلب
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Department {
  id: number;
  name: string;
  nameAr?: string;
  shortName?: string;
  icon?: string;
  color?: string;
  type?: string;
  status?: string;
  location?: string;
  stationNumber?: string;
  defaultPrepTime?: number;
  maxConcurrentOrders?: number;
  hasKds?: boolean;
  autoPrintTicket?: boolean;
}

export const departmentService = {
  getAll: async (): Promise<Department[]> => {
    const { data } = await api.get("/departments");
    return data.data; // Laravel يلف البيانات في "data"
  },

  create: async (payload: Omit<Department, "id">): Promise<Department> => {
    const { data } = await api.post("/departments", payload);
    return data.data;
  },

  update: async (
    id: number,
    payload: Partial<Department>,
  ): Promise<Department> => {
    const { data } = await api.put(`/departments/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};
