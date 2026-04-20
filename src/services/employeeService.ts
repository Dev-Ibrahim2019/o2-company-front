// src/services/employeeService.ts
//
// طبقة الاتصال مع API الموظفين.
// كل الأنواع (types) معرَّفة هنا وتُصدَّر للاستخدام في باقي الملفات.

import api from "../api/axios"; // ← هاد هو الصحيح

// ── نوع البيانات القادمة من الـ API ─────────────────────────────────────────

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
  // من الـ eager loading
  branch?: { id: number; name: string };
  department?: { id: number; name: string };
}

// ── نوع البيانات المُرسَلة إلى الـ API ──────────────────────────────────────

export interface EmployeePayload {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nationalId?: string;
  dob?: string; // 'YYYY-MM-DD'
  image?: string;
  branch_id: number;
  department_id: number;
  jobTitleId?: string;
  typeId?: string;
  managerId?: string;
  hireDate: string; // 'YYYY-MM-DD'
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

// ── فلاتر البحث ──────────────────────────────────────────────────────────────

export interface EmployeeFilters {
  branch_id?: number;
  department_id?: number;
  status?: string;
  search?: string;
}

// ── دوال الـ API ─────────────────────────────────────────────────────────────

export const employeeService = {
  /** جلب كل الموظفين مع إمكانية الفلترة */
  getAll: async (filters?: EmployeeFilters): Promise<EmployeeFromApi[]> => {
    const { data } = await api.get("/employees", { params: filters });
    return data.data;
  },

  /** جلب موظف واحد */
  getOne: async (id: number): Promise<EmployeeFromApi> => {
    const { data } = await api.get(`/employees/${id}`);
    return data.data;
  },

  /** إضافة موظف */
  create: async (payload: EmployeePayload): Promise<EmployeeFromApi> => {
    const { data } = await api.post("/employees", payload);
    return data.data;
  },

  /** تعديل موظف */
  update: async (
    id: number,
    payload: Partial<EmployeePayload>,
  ): Promise<EmployeeFromApi> => {
    const { data } = await api.put(`/employees/${id}`, payload);
    return data.data;
  },

  /** حذف موظف */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },
};
