import api from "../api/axios";
import type { Voucher, VoucherFormData } from "../types/voucher";

const BASE = "/vouchers";

async function unwrap<T>(p: Promise<{ data: { data?: T } | T }>): Promise<T> {
  const { data } = await p;
  return (data as any).data !== undefined ? (data as any).data : (data as T);
}

export const voucherService = {
  getAll: (params?: Record<string, any>) =>
    unwrap<{ data: Voucher[]; current_page: number; last_page: number; total: number }>(
      api.get(BASE, { params })
    ),

  getOne: (id: number) =>
    unwrap<Voucher>(api.get(`${BASE}/${id}`)),

  create: (data: VoucherFormData) =>
    unwrap<Voucher>(api.post(BASE, data)),

  update: (id: number, data: Partial<VoucherFormData>) =>
    unwrap<Voucher>(api.put(`${BASE}/${id}`, data)),

  delete: (id: number) =>
    unwrap<any>(api.delete(`${BASE}/${id}`)),

  activate: (id: number) =>
    unwrap<Voucher>(api.post(`${BASE}/${id}/activate`)),

  cancel: (id: number) =>
    unwrap<Voucher>(api.post(`${BASE}/${id}/cancel`)),

  approve: (id: number) =>
    unwrap<Voucher>(api.post(`${BASE}/${id}/approve`)),

  getEntityInvoices: (entityType: string, entityId: number) =>
    unwrap<any[]>(api.get(`${BASE}/entity-invoices`, { params: { entity_type: entityType, entity_id: entityId } })),

  getStats: (params?: Record<string, any>) =>
    unwrap<{ total: number; draft: number; active: number; cancelled: number; receipts: number; payments: number }>(
      api.get(`${BASE}/stats`, { params })
    ),
};
