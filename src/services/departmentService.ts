// src/services/departmentService.ts

import api from "../api/axios";

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
  branchCategories?: any[];
  branch_categories?: any[];
  branches?: any[];
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
): Department => {
  const result: Department = {
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
  };

  // Preserve branch relations if present in raw response
  const raw = department as any;
  if (raw.branchCategories) result.branchCategories = raw.branchCategories;
  if (raw.branch_categories) result.branch_categories = raw.branch_categories;
  if (raw.branches) result.branches = raw.branches;

  return result;
};

export const departmentService = {
  getAll: async (): Promise<Department[]> => {
    const { data } = await api.get("/departments");
    return (data.data as DepartmentApiResponse[]).map(normalizeDepartment);
  },

  getOne: async (id: number): Promise<Department> => {
    const { data } = await api.get(`/departments/${id}`);
    const normalized = normalizeDepartment(data.data as DepartmentApiResponse);
    // Preserve branch relations from raw API response for modal editing
    const raw = data.data as any;
    return {
      ...normalized,
      ...(raw.branchCategories && { branchCategories: raw.branchCategories }),
      ...(raw.branch_categories && { branch_categories: raw.branch_categories }),
      ...(raw.branches && { branches: raw.branches }),
    } as Department;
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
