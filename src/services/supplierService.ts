// src/services/supplierService.ts
// خدمة الموردين — واجهة كاملة للتعامل مع وحدة الموردين

import api from "../api/axios";

export interface Supplier {
  id: number;
  name: string;
  name_en: string | null;
  code: string;
  tax_number: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  category: "local" | "international" | "service" | null;
  currency: string;
  status: "active" | "inactive" | "blocked";
  credit_limit: number;
  payment_terms: string | null;
  opening_balance: number;
  is_opening_balance_posted: boolean;
  notes: string | null;
  gps_link: string | null;
  branch_id: number | null;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierForm {
  name: string;
  name_en?: string;
  code?: string;
  tax_number?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  category?: string;
  currency?: string;
  status?: string;
  credit_limit?: number;
  payment_terms?: string;
  opening_balance?: number;
  notes?: string;
  gps_link?: string;
  branch_id?: number | null;
}

export interface SupplierAging {
  current: number;
  "1_30": number;
  "31_60": number;
  "61_90": number;
  over_90: number;
  total: number;
}

export interface AgingReportItem {
  id: number;
  name: string;
  code: string;
  balance: number;
  aging: SupplierAging;
}

export interface SupplierStatementLine {
  date: string;
  transaction_number: string;
  transaction_id?: number;
  type: string;
  description: string | null;
  reference?: string | null;
  debit: number;
  credit: number;
  balance: number;
  source_type?: string | null;
  source_id?: number | null;
  source_label?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  notes?: string | null;
}

export interface SupplierStatement {
  lines: SupplierStatementLine[];
  opening_balance: number;
  closing_balance: number;
  total_debit: number;
  total_credit: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

const logSupplierPayload = (label: string, payload: Record<string, unknown>) => {
  console.debug(label, {
    received_entity_type: payload.entity_type ?? null,
    received_entity_id: payload.entity_id ?? null,
    received_subledger_type: payload.subledger_type ?? null,
    received_subledger_id: payload.subledger_id ?? null,
    payload,
  });
};

export const supplierService = {
  // ── CRUD ──────────────────────────────────────────────────

  getAll: async (params?: { search?: string; status?: string; branch_id?: number }): Promise<Supplier[]> => {
    const res = await api.get("/suppliers", { params: { ...params, per_page: 500 } });
    const raw = res.data?.data?.data ?? res.data?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  },

  list: async (params?: {
    search?: string;
    status?: string;
    sort_by?: string;
    sort_dir?: string;
    per_page?: number;
    page?: number;
  }): Promise<
    ApiResponse<{
      data: Supplier[];
      total: number;
      current_page: number;
      last_page: number;
    }>
  > => {
    const res = await api.get("/suppliers", { params });
    return res.data;
  },

  get: async (
    id: number,
  ): Promise<
    ApiResponse<{
      supplier: Supplier;
      aging: SupplierAging;
      statement_summary: SupplierStatement;
    }>
  > => {
    const res = await api.get(`/suppliers/${id}`);
    return res.data;
  },

  create: async (data: SupplierForm): Promise<ApiResponse<Supplier>> => {
    const res = await api.post("/suppliers", data);
    return res.data;
  },

  update: async (
    id: number,
    data: Partial<SupplierForm>,
  ): Promise<ApiResponse<Supplier>> => {
    const res = await api.put(`/suppliers/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const res = await api.delete(`/suppliers/${id}`);
    return res.data;
  },

  // ── Accounting ────────────────────────────────────────────

  recordBill: async (
    supplierId: number,
    data: {
      amount: number;
      expense_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
      entity_type?: "supplier";
      entity_id?: number;
      subledger_type?: "supplier";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logSupplierPayload("supplierService.recordBill", data as Record<string, unknown>);
    const res = await api.post(`/suppliers/${supplierId}/bill`, data);
    return res.data;
  },

  recordPayment: async (
    supplierId: number,
    data: {
      amount: number;
      cash_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
      entity_type?: "supplier";
      entity_id?: number;
      subledger_type?: "supplier";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logSupplierPayload("supplierService.recordPayment", data as Record<string, unknown>);
    const res = await api.post(`/suppliers/${supplierId}/payment`, data);
    return res.data;
  },

  recordCreditNote: async (
    supplierId: number,
    data: {
      amount: number;
      expense_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
      entity_type?: "supplier";
      entity_id?: number;
      subledger_type?: "supplier";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logSupplierPayload("supplierService.recordCreditNote", data as Record<string, unknown>);
    const res = await api.post(`/suppliers/${supplierId}/credit-note`, data);
    return res.data;
  },

  recordDebitNote: async (
    supplierId: number,
    data: {
      amount: number;
      expense_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
      entity_type?: "supplier";
      entity_id?: number;
      subledger_type?: "supplier";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logSupplierPayload("supplierService.recordDebitNote", data as Record<string, unknown>);
    const res = await api.post(`/suppliers/${supplierId}/debit-note`, data);
    return res.data;
  },

  getStatement: async (
    supplierId: number,
    from: string,
    to: string,
    branch_id?: number,
  ): Promise<
    ApiResponse<{ statement: SupplierStatement; balance: number }>
  > => {
    const res = await api.get(`/suppliers/${supplierId}/statement`, {
      params: { from, to, branch_id },
    });
    return res.data;
  },

  getAging: async (
    supplierId: number,
  ): Promise<ApiResponse<{ aging: SupplierAging }>> => {
    const res = await api.get(`/suppliers/${supplierId}/aging`);
    return res.data;
  },

  getAgingReport: async (): Promise<
    ApiResponse<{ suppliers: AgingReportItem[]; totals: SupplierAging }>
  > => {
    const res = await api.get("/suppliers/aging-report");
    return res.data;
  },

  getTransactions: async (
    supplierId: number,
    page?: number,
  ): Promise<ApiResponse<any>> => {
    const res = await api.get(`/suppliers/${supplierId}/transactions`, {
      params: { page },
    });
    return res.data;
  },
};
