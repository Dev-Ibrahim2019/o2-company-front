import api from "../api/axios";
import type { SalesInvoice, SalesInvoiceFormData } from "../types/salesInvoice";

const BASE = "/sales-invoices";

async function unwrap<T>(p: Promise<{ data: { data?: T } | T }>): Promise<T> {
  const { data } = await p;
  return (data as any).data !== undefined ? (data as any).data : (data as T);
}

export const salesInvoiceService = {
  getAll: (params?: Record<string, any>) =>
    unwrap<{ data: SalesInvoice[]; current_page: number; last_page: number; total: number }>(
      api.get(BASE, { params })
    ),

  getOne: (id: number) =>
    unwrap<SalesInvoice>(api.get(`${BASE}/${id}`)),

  create: (data: SalesInvoiceFormData) =>
    unwrap<SalesInvoice>(api.post(BASE, data)),

  update: (id: number, data: Partial<SalesInvoiceFormData>) =>
    unwrap<SalesInvoice>(api.put(`${BASE}/${id}`, data)),

  delete: (id: number) =>
    unwrap<any>(api.delete(`${BASE}/${id}`)),

  approve: (id: number) =>
    unwrap<SalesInvoice>(api.post(`${BASE}/${id}/approve`)),

    bulkApprove: (ids: number[]) =>
    unwrap<{ approved: number; skipped: number }>(api.post(`${BASE}/bulk-approve`, { ids })),

  bulkPost: (ids: number[]) =>
    unwrap<{ posted: number; skipped: number }>(api.post(`${BASE}/bulk-post`, { ids })),

  group: (params: { group_by: string; from_date?: string; to_date?: string; branch_id?: number }) =>
    unwrap<{ group_by: string; groups: any[] }>(api.get(`${BASE}/group`, { params })),

  cancel: (id: number) =>
    unwrap<SalesInvoice>(api.post(`${BASE}/${id}/cancel`)),

  recordPayment: (id: number, data: { method: string; amount: number; reference_number?: string }) =>
    unwrap<SalesInvoice>(api.post(`${BASE}/${id}/payments`, data)),

  getStats: (params?: Record<string, any>) =>
    unwrap<any>(api.get(`${BASE}/stats`, { params })),

  getOverdue: () =>
    unwrap<SalesInvoice[]>(api.get(`${BASE}/overdue`)),

  getPosInvoices: (params?: Record<string, any>) =>
    unwrap<{ data: any[]; current_page: number; last_page: number; total: number }>(
      api.get(`${BASE}/pos-invoices`, { params })
    ),

  syncPosInvoice: (posInvoiceId: number) =>
    unwrap<SalesInvoice>(api.post(`${BASE}/pos-sync/single/${posInvoiceId}`)),

  syncPosEndOfDay: (data: { branch_id: number; date?: string }) =>
    unwrap<SalesInvoice>(api.post(`${BASE}/pos-sync/end-of-day`, data)),

  import: (formData: FormData) =>
    unwrap<{ success: number; errors: string[]; invoice_id: number | null }>(
      api.post(`${BASE}/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),

  posSyncEndOfDay: (data: { branch_id: number; date?: string }) =>
    unwrap<SalesInvoice>(api.post(`${BASE}/pos-sync/end-of-day`, data)),

  posSyncBatch: (data: { branch_id: number; from_date: string; to_date: string }) =>
    unwrap<{ synced: number; skipped: number; errors: string[] }>(
      api.post(`${BASE}/pos-sync/batch`, data)
    ),
};
