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
  // === ✅ أنواع الرواتب الجديدة ===
  salary_type?: "hourly" | "daily" | "monthly";
  hourly_rate?: number;
  daily_rate?: number;
  working_hours?: number;
  working_days?: number;
  calculated_salary?: number; // المحسوب آلياً
  salary_details?: {
    type: string;
    type_label: string;
    rate: number;
    total: number;
    hours?: number;
    days?: number;
  };
  monthly_hours_note?: string;
  // =============================
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
  // الأرصدة المالية
  outstanding_advance?: number;
  accrued_salary?: number;
  net_payable?: number;
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
  salary_type?: "hourly" | "daily" | "monthly";
  hourly_rate?: number;
  daily_rate?: number;
  working_hours?: number;
  working_days?: number;
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
  salary_type?: string;
}

export const employeeService = {
  getAll: async (filters?: EmployeeFilters): Promise<EmployeeFromApi[]> => {
    const { data } = await api.get("/employees", { params: filters });
    const payload = data.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
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
