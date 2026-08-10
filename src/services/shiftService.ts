// src/services/shiftService.ts
// خدمة إدارة الورديات (Shifts) - ربط الباك إند مع الفرونت

import api from "../api/axios";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ShiftFromApi {
  id: number;
  branch_id: number;
  opened_by: number;
  closed_by: number | null;
  date: string;
  opened_at: string;
  closed_at: string | null;
  status: "open" | "closed";
  opening_balance: number;
  closing_balance: number | null;
  total_sales: number;
  created_at: string;
  updated_at: string;
  opener?: {
    id: number;
    name: string;
  };
  closer?: {
    id: number;
    name: string;
  };
}

export interface ShiftStats {
  total_orders: number;
  paid_orders: number;
  open_orders: number;
  total_sales: number;
}

export interface CurrentShiftResponse {
  shift: ShiftFromApi | null;
  stats: ShiftStats | null;
}

export interface RolloverResponse {
  closed_shift: {
    id: number;
    total_sales: number;
    closed_at: string;
  };
  new_shift: ShiftFromApi;
}

// ── Service ────────────────────────────────────────────────────────────────────

export const shiftService = {
  /**
   * جلب جميع اليوميات (مع فلترة)
   */
  async getAll(filters?: {
    branch_id?: number;
    date?: string;
    status?: "open" | "closed";
    page?: number;
  }): Promise<{ data: ShiftFromApi[]; current_page: number; last_page: number }> {
    const params = new URLSearchParams();
    if (filters?.branch_id) params.append("branch_id", String(filters.branch_id));
    if (filters?.date) params.append("date", filters.date);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.page) params.append("page", String(filters.page));

    const { data } = await api.get(`/shifts?${params.toString()}`);
    return data.data;
  },

  /**
   * جلب اليومية النشطة للفرع الحالي
   */
  async getCurrent(): Promise<CurrentShiftResponse> {
    const { data } = await api.get("/shifts/current");
    return data.data;
  },

  /**
   * الترحيل السريع (Rollover)
   * يُغلق الـ shift الحالي ويفتح shift جديد
   */
  async rollover(closingBalance?: number): Promise<RolloverResponse> {
    const { data } = await api.post("/shifts/rollover", {
      closing_balance: closingBalance ?? 0,
    });
    return data.data;
  },
};

export default shiftService;
