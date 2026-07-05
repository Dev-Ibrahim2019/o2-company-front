// src/services/customerService.ts
// خدمة العملاء — واجهة كاملة للتعامل مع وحدة العملاء

import api from "../api/axios";

export interface Customer {
  id: number;
  name: string;
  name_en: string | null;
  code: string;
  tax_number: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  currency: string;
  status: "active" | "inactive" | "blocked";
  risk_level: "low" | "medium" | "high" | "critical";
  credit_limit: number;
  payment_terms: string | null;
  credit_days: number;
  opening_balance: number;
  is_opening_balance_posted: boolean;
  notes: string | null;
  gps_link: string | null;
  branch_id: number | null;
  salesperson_id: number | null;
  balance: number;
  available_credit: number;
  is_over_limit: boolean;
  credit_usage_percent: number;
  created_at: string;
  updated_at: string;
  branch?: { id: number; name: string };
  salesperson?: { id: number; name: string };
}

export interface CustomerForm {
  name: string;
  name_en?: string;
  code?: string;
  tax_number?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  category?: string;
  currency?: string;
  status?: string;
  risk_level?: string;
  credit_limit?: number;
  payment_terms?: string;
  credit_days?: number;
  opening_balance?: number;
  notes?: string;
  gps_link?: string;
  branch_id?: number | null;
  salesperson_id?: number | null;
}

export interface CustomerAging {
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
  aging: CustomerAging;
}

export interface CustomerStatementLine {
  date: string;
  transaction_number: string;
  transaction_id?: number;
  type: string;
  description: string | null;
  reference?: string | null;
  account_name: string;
  account_code: string;
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

export interface CustomerStatement {
  lines: CustomerStatementLine[];
  opening_balance: number;
  closing_balance: number;
  total_debit: number;
  total_credit: number;
}

export interface CustomerAnalytics {
  current_balance: number;
  total_sales: number;
  total_collected: number;
  collection_rate: number;
  dso: number;
  monthly_collections: number;
  aging: CustomerAging;
  credit_usage: number;
  available_credit: number;
  is_over_limit: boolean;
}

export interface CollectionReportItem {
  id: number;
  name: string;
  code: string;
  balance: number;
  aging: CustomerAging;
  days_past_due: number;
  monthly_collections: number;
  risk_level: string;
  credit_limit: number;
  credit_usage: number;
  phone: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

const logCustomerPayload = (label: string, payload: Record<string, unknown>) => {
  console.debug(label, {
    received_entity_type: payload.entity_type ?? null,
    received_entity_id: payload.entity_id ?? null,
    received_subledger_type: payload.subledger_type ?? null,
    received_subledger_id: payload.subledger_id ?? null,
    payload,
  });
};

export const customerService = {
  // ── CRUD ──────────────────────────────────────────────────

  list: async (params?: {
    search?: string;
    status?: string;
    risk_level?: string;
    branch_id?: number;
    sort_by?: string;
    sort_dir?: string;
    per_page?: number;
    page?: number;
  }): Promise<
    ApiResponse<{
      data: Customer[];
      total: number;
      current_page: number;
      last_page: number;
    }>
  > => {
    const res = await api.get("/customers", { params });
    return res.data;
  },

  get: async (
    id: number,
  ): Promise<
    ApiResponse<{
      customer: Customer;
      aging: CustomerAging;
      statement_summary: CustomerStatement;
    }>
  > => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  create: async (data: CustomerForm): Promise<ApiResponse<Customer>> => {
    const res = await api.post("/customers", data);
    return res.data;
  },

  update: async (
    id: number,
    data: Partial<CustomerForm>,
  ): Promise<ApiResponse<Customer>> => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },

  // ── Accounting ────────────────────────────────────────────

  recordInvoice: async (
    customerId: number,
    data: {
      amount: number;
      tax_amount?: number;
      date: string;
      reference?: string;
      branch_id?: number;
      entity_type?: "customer";
      entity_id?: number;
      subledger_type?: "customer";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logCustomerPayload("customerService.recordInvoice", data as Record<string, unknown>);
    const res = await api.post(`/customers/${customerId}/invoice`, data);
    return res.data;
  },

  recordReceipt: async (
    customerId: number,
    data: {
      amount: number;
      cash_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
      entity_type?: "customer";
      entity_id?: number;
      subledger_type?: "customer";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logCustomerPayload("customerService.recordReceipt", data as Record<string, unknown>);
    const res = await api.post(`/customers/${customerId}/receipt`, data);
    return res.data;
  },

  recordCreditNote: async (
    customerId: number,
    data: {
      amount: number;
      revenue_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
      entity_type?: "customer";
      entity_id?: number;
      subledger_type?: "customer";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logCustomerPayload("customerService.recordCreditNote", data as Record<string, unknown>);
    const res = await api.post(`/customers/${customerId}/credit-note`, data);
    return res.data;
  },

  recordDebitNote: async (
    customerId: number,
    data: {
      amount: number;
      revenue_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
      entity_type?: "customer";
      entity_id?: number;
      subledger_type?: "customer";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logCustomerPayload("customerService.recordDebitNote", data as Record<string, unknown>);
    const res = await api.post(`/customers/${customerId}/debit-note`, data);
    return res.data;
  },

  getStatement: async (
    customerId: number,
    from: string,
    to: string,
    branch_id?: number,
  ): Promise<
    ApiResponse<{ statement: CustomerStatement; balance: number }>
  > => {
    const res = await api.get(`/customers/${customerId}/statement`, {
      params: { from, to, branch_id },
    });
    return res.data;
  },

  getAging: async (
    customerId: number,
  ): Promise<ApiResponse<{ aging: CustomerAging }>> => {
    const res = await api.get(`/customers/${customerId}/aging`);
    return res.data;
  },

  getAnalytics: async (
    customerId: number,
  ): Promise<ApiResponse<CustomerAnalytics>> => {
    const res = await api.get(`/customers/${customerId}/analytics`);
    return res.data;
  },

  getAgingReport: async (): Promise<
    ApiResponse<{ customers: AgingReportItem[]; totals: CustomerAging }>
  > => {
    const res = await api.get("/customers/aging-report");
    return res.data;
  },

  getCollectionReport: async (): Promise<
    ApiResponse<{
      customers: CollectionReportItem[];
      total_outstanding: number;
      total_customers: number;
    }>
  > => {
    const res = await api.get("/customers/collection-report");
    return res.data;
  },
};
