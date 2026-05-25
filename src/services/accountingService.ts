// src/services/accountingService.ts

import api from "../api/axios";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";
export type TransactionType =
  | "sale"
  | "purchase"
  | "salary"
  | "expense"
  | "receipt"
  | "payment"
  | "journal"
  | "opening"
  | "adjustment";
export type TransactionStatus = "draft" | "posted" | "cancelled";
export type CostCenterType =
  | "operational"
  | "administrative"
  | "service"
  | "production";

export interface Account {
  id: number;
  name: string;
  code: string;
  type: AccountType;
  type_label: string;
  normal_balance: "debit" | "credit";
  level: number;
  allow_posting: boolean;
  is_active: boolean;
  is_system: boolean;
  is_parent: boolean;
  notes?: string;
  balance?: number;
  total_debit?: number;
  total_credit?: number;
  parent?: { id: number; name: string; code: string };
  children?: Account[];
}

export interface EntryLine {
  id?: number;
  account_id: number;
  debit: number;
  credit: number;
  description?: string;
  cost_center_id?: number;
  sort_order?: number;
  account?: { id: number; name: string; code: string; type: string };
  cost_center?: { id: number; name: string; code?: string } | null;
}

export interface Transaction {
  id: number;
  transaction_number: string;
  date: string;
  reference?: string;
  type: TransactionType;
  type_label: string;
  status: TransactionStatus;
  status_label: string;
  description?: string;
  notes?: string;
  total_debit: number;
  total_credit: number;
  // ✅ عدد الأسطر — يأتي من الداتابيز في كل استجابة
  entries_count: number;
  is_balanced: boolean;
  is_editable: boolean;
  source_type?: string;
  source_id?: number;
  source_label?: string;
  // entries محمّلة فقط عند show() أو عند التفاصيل
  entries?: EntryLine[];
  branch?: { id: number; name: string };
  user?: { id: number; name: string };
  posted_at?: string;
  created_at?: string;
}

export interface CostCenter {
  id: number;
  name: string;
  code?: string;
  type?: CostCenterType;
  type_label: string;
  is_active: boolean;
  notes?: string;
  parent?: { id: number; name: string } | null;
  children?: CostCenter[];
  branch?: { id: number; name: string } | null;
}

export interface LedgerLine {
  date: string;
  transaction_number: string;
  reference?: string;
  description?: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerData {
  account: Account;
  period: { from: string; to: string };
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  lines: LedgerLine[];
}

export const accountService = {
  getAll: async (params?: Record<string, any>): Promise<Account[]> => {
    const { data } = await api.get("/accounting/accounts", { params });
    return data.data ?? [];
  },

  getOne: async (id: number, withBalance = false): Promise<Account> => {
    const { data } = await api.get(`/accounting/accounts/${id}`, {
      params: { with_balance: withBalance },
    });
    return data.data;
  },

  create: async (payload: any): Promise<Account> => {
    const { data } = await api.post("/accounting/accounts", payload);
    return data.data;
  },

  update: async (id: number, payload: any): Promise<Account> => {
    const { data } = await api.put(`/accounting/accounts/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounting/accounts/${id}`);
  },

  getLedger: async (
    id: number,
    params?: { from?: string; to?: string },
  ): Promise<LedgerData> => {
    const { data } = await api.get(`/accounting/accounts/${id}/ledger`, {
      params,
    });
    return data.data;
  },

  suggestCode: async (parentId?: number): Promise<string> => {
    const { data } = await api.get("/accounting/accounts/suggest-code", {
      params: parentId ? { parent_id: parentId } : {},
    });
    return data.data?.code ?? "";
  },
};

export const transactionService = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await api.get("/accounting/transactions", { params });
    return (
      data.data ?? {
        data: [],
        pagination: { current_page: 1, last_page: 1, total: 0, per_page: 30 },
      }
    );
  },

  // ✅ جلب قيد واحد مع entries كاملة من الداتابيز
  getOne: async (id: number): Promise<Transaction> => {
    const { data } = await api.get(`/accounting/transactions/${id}`);
    return data.data;
  },

  create: async (payload: any): Promise<Transaction> => {
    const { data } = await api.post("/accounting/transactions", payload);
    return data.data;
  },

  update: async (id: number, payload: any): Promise<Transaction> => {
    const { data } = await api.put(`/accounting/transactions/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounting/transactions/${id}`);
  },

  post: async (id: number): Promise<Transaction> => {
    const { data } = await api.post(`/accounting/transactions/${id}/post`);
    return data.data;
  },

  cancel: async (id: number): Promise<Transaction> => {
    const { data } = await api.post(`/accounting/transactions/${id}/cancel`);
    return data.data;
  },
};

export const costCenterService = {
  getAll: async (params?: Record<string, any>): Promise<CostCenter[]> => {
    const { data } = await api.get("/accounting/cost-centers", { params });
    return data.data ?? [];
  },

  create: async (payload: any): Promise<CostCenter> => {
    const { data } = await api.post("/accounting/cost-centers", payload);
    return data.data;
  },

  update: async (id: number, payload: any): Promise<CostCenter> => {
    const { data } = await api.put(`/accounting/cost-centers/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/accounting/cost-centers/${id}`);
  },
  suggestCode: async (parentId?: number): Promise<string> => {
    const { data } = await api.get("/accounting/cost-centers/suggest-code", {
      params: parentId ? { parent_id: parentId } : {},
    });

    return data.data?.code ?? "";
  },
};
