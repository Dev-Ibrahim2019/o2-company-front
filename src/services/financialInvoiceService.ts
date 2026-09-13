import api from "../api/axios";
import type { FinancialInvoice, FinancialInvoiceFormData } from "../types/financialInvoice";

const BASE = "/financial/invoices";

async function unwrap<T>(p: Promise<{ data: { data?: T } | T }>): Promise<T> {
  const { data } = await p;
  return (data as any).data !== undefined ? (data as any).data : (data as T);
}

export const financialInvoiceService = {
  getAll: (params?: Record<string, any>) =>
    unwrap<{ data: FinancialInvoice[]; current_page: number; last_page: number; per_page: number; total: number }>(
      api.get(BASE, { params })
    ),

  getOne: (id: number) =>
    unwrap<FinancialInvoice>(api.get(`${BASE}/${id}`)),

  create: (data: FinancialInvoiceFormData) =>
    unwrap<FinancialInvoice>(api.post(BASE, data)),

  update: (id: number, data: FinancialInvoiceFormData) =>
    unwrap<FinancialInvoice>(api.put(`${BASE}/${id}`, data)),

  delete: (id: number) =>
    unwrap<any>(api.delete(`${BASE}/${id}`)),

  approve: (id: number) =>
    unwrap<FinancialInvoice>(api.post(`${BASE}/${id}/approve`)),

  void: (id: number) =>
    unwrap<FinancialInvoice>(api.post(`${BASE}/${id}/void`)),

  getStats: (params?: Record<string, any>) =>
    unwrap<any>(api.get(`${BASE}/stats`, { params })),

  searchCustomers: (search: string) =>
    unwrap<any[]>(api.get("/customers", { params: { search } })),

  searchEmployees: (search: string) =>
    unwrap<any[]>(api.get("/employees", { params: { search } })),

  searchSuppliers: (search: string) =>
    unwrap<any[]>(api.get("/suppliers", { params: { search } })),

  searchItems: (search: string) =>
    unwrap<any[]>(api.get("/items", { params: { search } })),

  // Search entity by ID
  searchEntitiesById: async (type: string, id: number): Promise<any | null> => {
    try {
      const endpoint = type === "customer" ? "/customers" : type === "employee" ? "/employees" : "/suppliers";
      const { data } = await api.get(`${endpoint}/${id}`);
      const result = (data as any).data !== undefined ? (data as any).data : data;
      return result || null;
    } catch {
      return null;
    }
  },
};
