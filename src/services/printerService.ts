// src/services/printerService.ts
// ──────────────────────────────────────────────────────────────
// خدمة إدارة الطابعات الشبكية (SNBC) — التوجيه مدمج في الطابعة

import api from "../api/axios";
import type { Printer, PrinterFormData } from "../../types";

// ── أنواع الاستجابة ──────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── الطابعات ─────────────────────────────────────────────────

export const printerService = {
  /** جلب جميع الطابعات لفرع محدد */
  getAll: async (branchId?: number): Promise<Printer[]> => {
    const params: Record<string, any> = {};
    if (branchId) params.branch_id = branchId;
    const { data } = await api.get<ApiResponse<Printer[]>>("/admin/printers", { params });
    return data.data ?? [];
  },

  /** جلب طابعة بالمعرّف */
  getOne: async (id: number): Promise<Printer> => {
    const { data } = await api.get<ApiResponse<Printer>>(`/admin/printers/${id}`);
    return data.data;
  },

  /** إضافة طابعة جديدة */
  create: async (payload: PrinterFormData): Promise<Printer> => {
    const { data } = await api.post<ApiResponse<Printer>>("/admin/printers", {
      name: payload.name,
      ip_address: payload.ip_address,
      port: payload.port ?? "9100",
      type: payload.type,
      branch_id: payload.branch_id,
      print_on_direct: payload.print_on_direct ?? false,
      linked_pos_register_id: payload.linked_pos_register_id ?? null,
      department_ids: payload.department_ids ?? [],
      item_ids: payload.item_ids ?? [],
    });
    return data.data;
  },

  /** تحديث طابعة */
  update: async (
    id: number,
    payload: Partial<PrinterFormData & { is_active: boolean }>,
  ): Promise<Printer> => {
    const { data } = await api.put<ApiResponse<Printer>>(
      `/admin/printers/${id}`,
      payload,
    );
    return data.data;
  },

  /** حذف طابعة */
  delete: async (id: number, branchId?: number): Promise<void> => {
    const params: Record<string, any> = {};
    if (branchId) params.branch_id = branchId;
    await api.delete(`/admin/printers/${id}`, { params });
  },

  /** اختبار الاتصال بالطابعة */
  testConnection: async (
    id: number,
  ): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/admin/printers/${id}/test`);
    return data;
  },

  /** اختبار طباعة */
  testPrint: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/admin/printers/${id}/test-print`);
    return data;
  },

  /** طباعة فورية وتنفيذ — تنفيذ الطلب وطباعته مباشرة */
  directPrint: async (
    orderId: number,
    cashierDeviceId: number,
    items?: { order_item_id: number; is_takeaway: boolean }[],
  ): Promise<{
    success: boolean;
    message: string;
    print_jobs: any[];
    printed_items_count: number;
  }> => {
    const payload: Record<string, any> = {
      cashier_device_id: cashierDeviceId,
    };
    if (items && items.length > 0) {
      payload.items = items;
    }
    const { data } = await api.post(`/orders/${orderId}/direct-print`, payload);
    return data;
  },
};
