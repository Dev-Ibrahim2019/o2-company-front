// src/services/itemService.ts

import api from "../api/axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BranchPivot {
  price: number;
  is_active: boolean;
}

export interface ItemBranch {
  id: number;
  name: string;
  code?: string;
  is_active: boolean;
  pivot: BranchPivot;
}

export interface ItemDepartment {
  id: number;
  name: string;
  nameAr?: string;
  color?: string;
}

export interface ItemFromApi {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  image?: string;
  unit?: string;
  is_active: boolean;
  department_id: number;
  department?: ItemDepartment;
  branches?: ItemBranch[];
  created_at?: string;
  updated_at?: string;
}

export interface BranchPayload {
  branch_id: number;
  price: number;
  is_active: boolean;
}

export interface ItemPayload {
  department_id: number;
  name: string;
  name_ar?: string;
  code: string;
  image?: string;
  unit?: string;
  is_active?: boolean;
  branches?: BranchPayload[];
}

export interface ItemFilters {
  department_id?: number;
  branch_id?: number;
  search?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const itemService = {
  getAll: async (filters?: ItemFilters): Promise<ItemFromApi[]> => {
    const { data } = await api.get("/items", { params: filters });
    // يدعم كلا التنسيقين: مع wrapper أو بدونه
    return data.data ?? data;
  },

  getOne: async (id: number): Promise<ItemFromApi> => {
    const { data } = await api.get(`/items/${id}`);
    return data.data ?? data;
  },

  create: async (payload: ItemPayload): Promise<ItemFromApi> => {
    const { data } = await api.post("/items", payload);
    return data.data ?? data;
  },

  update: async (
    id: number,
    payload: Partial<ItemPayload>,
  ): Promise<ItemFromApi> => {
    const { data } = await api.put(`/items/${id}`, payload);
    return data.data ?? data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/items/${id}`);
  },

  getUsages: async (id: number) => {
    const { data } = await api.get(`/items/${id}/usages`);
    return data.data ?? data;
  },
};
