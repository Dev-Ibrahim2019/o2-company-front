// src/services/employeeService.ts

import api from "../api/axios";

export interface EmployeeFromApi {
  id: number;
  name: string;
  employeeId?: string;
  phone: string;
  email?: string;
  address?: string;
  nationalId?: string;
  dob?: string;
  image?: string;
  branch_id: number;
  department_id: number;
  jobTitleId?: string;
  typeId?: string;
  managerId?: string;
  hireDate: string;
  salary?: number;
  role: string;
  status: string;
  username?: string;
  permissions: string[];
  notes?: string;
  rating: number;
  performance?: {
    ordersServed: number;
    totalSales: number;
    hoursWorked: number;
  };
  branch?: { id: number; name: string };
  department?: { id: number; name: string };
}

export interface EmployeePayload {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nationalId?: string;
  dob?: string;
  image?: string;
  branch_id: number;
  department_id: number;
  jobTitleId?: string;
  typeId?: string;
  managerId?: string;
  hireDate: string;
  salary?: number;
  role: string;
  status: string;
  employeeId?: string;
  username?: string;
  password?: string;
  pin?: string;
  permissions?: string[];
  notes?: string;
}

export interface EmployeeFilters {
  branch_id?: number;
  department_id?: number;
  status?: string;
  search?: string;
}

export const employeeService = {
  getAll: async (filters?: EmployeeFilters): Promise<EmployeeFromApi[]> => {
    const { data } = await api.get("/employees", { params: filters });

    // ✅ الباك ممكن يرجع paginated { data: { data: [], pagination: {} } }
    // أو بسيط { data: [] }
    const payload = data.data;
    if (Array.isArray(payload)) return payload; // الشكل البسيط
    if (Array.isArray(payload?.data)) return payload.data; // الشكل paginated
    return [];
  },

  getOne: async (id: number): Promise<EmployeeFromApi> => {
    const { data } = await api.get(`/employees/${id}`);
    return data.data;
  },

  create: async (payload: EmployeePayload): Promise<EmployeeFromApi> => {
    const { data } = await api.post("/employees", payload);
    return data.data;
  },

  update: async (
    id: number,
    payload: Partial<EmployeePayload>,
  ): Promise<EmployeeFromApi> => {
    const { data } = await api.put(`/employees/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },
};
