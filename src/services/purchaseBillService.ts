import api from "../api/axios";
import type { PurchaseBill, PurchaseBillFormData } from "../types/purchaseBill";

const BASE = "/purchase-bills";

async function unwrap<T>(p: Promise<{ data: { data?: T } | T }>): Promise<T> {
  const { data } = await p;
  return (data as any).data !== undefined ? (data as any).data : (data as T);
}

export const purchaseBillService = {
  getAll: (params?: Record<string, any>) =>
    unwrap<{ data: PurchaseBill[]; current_page: number; last_page: number; total: number }>(
      api.get(BASE, { params })
    ),

  getOne: (id: number) =>
    unwrap<PurchaseBill>(api.get(`${BASE}/${id}`)),

  create: (data: PurchaseBillFormData) =>
    unwrap<PurchaseBill>(api.post(BASE, data)),

  update: (id: number, data: Partial<PurchaseBillFormData>) =>
    unwrap<PurchaseBill>(api.put(`${BASE}/${id}`, data)),

  delete: (id: number) =>
    unwrap<any>(api.delete(`${BASE}/${id}`)),

  approve: (id: number) =>
    unwrap<PurchaseBill>(api.post(`${BASE}/${id}/approve`)),

  cancel: (id: number) =>
    unwrap<PurchaseBill>(api.post(`${BASE}/${id}/cancel`)),

  recordPayment: (id: number, data: { amount: number; payment_method?: string; reference_number?: string; payment_date: string }) =>
    unwrap<PurchaseBill>(api.post(`${BASE}/${id}/payments`, data)),

  getStats: (params?: Record<string, any>) =>
    unwrap<any>(api.get(`${BASE}/stats`, { params })),
};
