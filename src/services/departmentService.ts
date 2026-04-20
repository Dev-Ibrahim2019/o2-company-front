// src/services/departmentService.ts

import api from "../api/axios"; // ← استخدم الـ instance المشترك الذي يحمل التوكن

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
  displayOrder?: number;
  priority?: number;
  requiresAssembly?: boolean;
  notifications?: { sound: boolean; flash: boolean; push: boolean };
  orderTypeVisibility?: string[];
  branchId?: string;
}

export const departmentService = {
  getAll: async (): Promise<Department[]> => {
    const { data } = await api.get("/departments");
    return data.data; // ← الباك يرجع { data: [...], message, status }
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
