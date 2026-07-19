import api from "../api/axios";
import type { Quote, QuoteFormData } from "../types/priceQuote";

const BASE = "/quotes";

async function unwrap<T>(p: Promise<{ data: { data?: T } | T }>): Promise<T> {
  const { data } = await p;
  return (data as any).data !== undefined ? (data as any).data : (data as T);
}

export const quoteService = {
  getAll: (params?: Record<string, any>) =>
    unwrap<{ data: Quote[]; current_page: number; last_page: number; total: number }>(
      api.get(BASE, { params })
    ),

  getOne: (id: number) =>
    unwrap<Quote>(api.get(`${BASE}/${id}`)),

  create: (data: QuoteFormData) =>
    unwrap<Quote>(api.post(BASE, data)),

  update: (id: number, data: Partial<QuoteFormData>) =>
    unwrap<Quote>(api.put(`${BASE}/${id}`, data)),

  delete: (id: number) =>
    unwrap<any>(api.delete(`${BASE}/${id}`)),

  send: (id: number) =>
    unwrap<Quote>(api.post(`${BASE}/${id}/send`)),

  accept: (id: number) =>
    unwrap<Quote>(api.post(`${BASE}/${id}/accept`)),

  reject: (id: number) =>
    unwrap<Quote>(api.post(`${BASE}/${id}/reject`)),

  convertToInvoice: (id: number, invoiceData?: Record<string, any>) =>
    unwrap<{ quote: Quote; invoice: any }>(
      api.post(`${BASE}/${id}/convert`, invoiceData ?? {})
    ),

  duplicate: (id: number) =>
    unwrap<Quote>(api.post(`${BASE}/${id}/duplicate`)),

  getStats: (branchId?: number) =>
    unwrap<{ total: number; draft: number; sent: number; accepted: number; rejected: number; expired: number; converted: number; total_value: number }>(
      api.get(`${BASE}/stats`, { params: branchId ? { branch_id: branchId } : {} })
    ),
};
