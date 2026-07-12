// src/services/printerService.ts
// ──────────────────────────────────────────────────────────────
// خدمة إدارة الطابعات الشبكية (SNBC) وقواعد التوجيه الذكي

import api from "../api/axios";
import type { Printer, PrintRoute, PrintRouteFormData } from "../../types";

// ── أنواع الاستجابة ──────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── الطابعات ─────────────────────────────────────────────────

export const printerService = {
  /** جلب جميع الطابعات (الفرع الحالي تلقائياً من الباك-إيند) */
  getAll: async (): Promise<Printer[]> => {
    const { data } = await api.get<ApiResponse<Printer[]>>("/admin/printers");
    return data.data ?? [];
  },

  /** جلب طابعة بالمعرّف */
  getOne: async (id: number): Promise<Printer> => {
    const { data } = await api.get<ApiResponse<Printer>>(`/admin/printers/${id}`);
    return data.data;
  },

  /** إضافة طابعة جديدة */
  create: async (payload: {
    name: string;
    ip_address: string;
    port?: string;
    type: string;
    branch_id?: number;
  }): Promise<Printer> => {
    const { data } = await api.post<ApiResponse<Printer>>("/admin/printers", {
      name: payload.name,
      ip_address: payload.ip_address,
      port: payload.port ?? "9100",
      type: payload.type,
      branch_id: payload.branch_id,
    });
    return data.data;
  },

  /** تحديث طابعة */
  update: async (
    id: number,
    payload: Partial<{
      name: string;
      ip_address: string;
      port: string;
      type: string;
      is_active: boolean;
    }>,
  ): Promise<Printer> => {
    const { data } = await api.put<ApiResponse<Printer>>(
      `/admin/printers/${id}`,
      payload,
    );
    return data.data;
  },

  /** حذف طابعة */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/printers/${id}`);
  },

  /** اختبار الاتصال بالطابعة */
  testConnection: async (
    id: number,
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/admin/printers/${id}/test`);
    return data;
  },
};

// ── قواعد التوجيه ────────────────────────────────────────────

export const printRouteService = {
  /** جلب جميع قواعد التوجيه */
  getAll: async (): Promise<PrintRoute[]> => {
    const { data } = await api.get<ApiResponse<PrintRoute[]>>("/admin/print-routes");
    return data.data ?? [];
  },

  /** جلب قواعد توجيه لطابعة محددة */
  getByPrinter: async (printerId: number): Promise<PrintRoute[]> => {
    const { data } = await api.get<ApiResponse<PrintRoute[]>>(
      `/admin/printers/${printerId}/routes`,
    );
    return data.data ?? [];
  },

  /** إنشاء قاعدة توجيه جديدة */
  create: async (payload: PrintRouteFormData): Promise<PrintRoute> => {
    const { data } = await api.post<ApiResponse<PrintRoute>>(
      "/admin/print-routes",
      payload,
    );
    return data.data;
  },

  /** تحديث قاعدة توجيه */
  update: async (
    id: number,
    payload: Partial<PrintRouteFormData>,
  ): Promise<PrintRoute> => {
    const { data } = await api.put<ApiResponse<PrintRoute>>(
      `/admin/print-routes/${id}`,
      payload,
    );
    return data.data;
  },

  /** حذف قاعدة توجيه */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/print-routes/${id}`);
  },
};
