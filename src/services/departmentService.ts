// src/services/departmentService.ts

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Department {
  id: number;
  name: string;
  nameAr?: string;
  parent_id?: number | null;
  parentId?: number | null;
  shortName?: string;
  code?: string;
  icon?: string;
  color?: string;
  startCode?: string;
  type?: string;
  status?: string;
  location?: string;
  stationNumber?: string;
  defaultPrepTime?: number;
  maxConcurrentOrders?: number;
  hasKds?: boolean;
  autoPrintTicket?: boolean;
}

interface DepartmentApiResponse {
  id: number;
  name: string;
  nameAr?: string;
  name_ar?: string;
  parent_id?: number | null;
  parentId?: number | null;
  shortName?: string;
  short_name?: string;
  code?: string | number;
  icon?: string;
  color?: string;
  startCode?: string;
  start_code?: string;
  type?: string;
  status?: string;
  location?: string;
  stationNumber?: string;
  station_number?: string;
  defaultPrepTime?: number;
  default_prep_time?: number;
  maxConcurrentOrders?: number;
  max_concurrent_orders?: number;
  hasKds?: boolean;
  has_kds?: boolean;
  autoPrintTicket?: boolean;
  auto_print_ticket?: boolean;
}

const normalizeDepartment = (
  department: DepartmentApiResponse,
): Department => ({
  id: department.id,
  name: department.name,
  nameAr: department.nameAr ?? department.name_ar,
  parent_id: department.parent_id ?? department.parentId ?? null,
  parentId: department.parentId ?? department.parent_id ?? null,
  shortName: department.shortName ?? department.short_name,
  code:
    department.code === undefined || department.code === null
      ? undefined
      : String(department.code),
  icon: department.icon,
  color: department.color,
  startCode: department.startCode ?? department.start_code,
  type: department.type,
  status: department.status,
  location: department.location,
  stationNumber: department.stationNumber ?? department.station_number,
  defaultPrepTime:
    department.defaultPrepTime ?? department.default_prep_time,
  maxConcurrentOrders:
    department.maxConcurrentOrders ?? department.max_concurrent_orders,
  hasKds: department.hasKds ?? department.has_kds,
  autoPrintTicket:
    department.autoPrintTicket ?? department.auto_print_ticket,
});

export const departmentService = {
  getAll: async (): Promise<Department[]> => {
    const { data } = await api.get("/departments");
    return (data.data as DepartmentApiResponse[]).map(normalizeDepartment);
  },

  create: async (payload: Omit<Department, "id">): Promise<Department> => {
    const { data } = await api.post("/departments", payload);
    return normalizeDepartment(data.data as DepartmentApiResponse);
  },

  update: async (
    id: number,
    payload: Partial<Department>,
  ): Promise<Department> => {
    const { data } = await api.put(`/departments/${id}`, payload);
    return normalizeDepartment(data.data as DepartmentApiResponse);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};
