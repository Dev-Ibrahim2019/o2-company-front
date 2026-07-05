// src/services/financeService.ts
//
// ✅ تم التحديث ليتطابق مع EmployeeFinancialController في الباك
// ✅ إضافة أنواع TypeScript صارمة للاستجابات
// ✅ توحيد بنية StatementEntry لجميع الكيانات
// ✅ تصحيح نوع الإرجاع لـ getEmployeeStatement (TransactionResponse بدلاً من StatementEntry[])
// ✅ إضافة loan API methods

import api from "../api/axios";

// ─── Shared Response Wrapper ───────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

// ─── Statement Types ───────────────────────────────────────────────────────

export interface SaleItem {
  product_name: string;
  product_name_ar?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  discount_amount: number;
  discount_percent: number;
  discount_apply_strategy?: string | null;
  tax_rate?: number;
  tax_amount?: number;
}

export interface StatementEntry {
  date: string;
  transaction_number: string;
  transaction_id?: number;
  reference: string | null;
  description: string | null;
  debit: number;
  credit: number;
  running_balance: number;
  account_name: string;
  transaction_source: string;
  type?: string | null;
  source_type?: string | null;
  source_id?: number | null;
  source_label?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  notes?: string | null;
  items?: SaleItem[];
  movement_type?: string;
  movement_label?: string;
  document_type?: string;
  status?: string | null;
}

export type MovementType = "sales" | "advance" | "salary" | "loan" | "payment" | "journal" | "return" | "settlement" | "advance_repayment" | "loan_repayment" | "salary_payment" | "adjustment" | "opening" | "other";

export type StatementType =
  | "all"
  | "sales"
  | "advance"
  | "salary"
  | "loan"
  | "payment"
  | "journal"
  | "return"
  | "settlement"
  | "purchase"
  | "transfer"
  | "adjustment"
  | "opening"
  | "closing";

export interface StatementFilters {
  from?: string;
  to?: string;
  type?: StatementType;
  mode?: "simple" | "detailed";
  branch_id?: number;
  search?: string;
  document_type?: string;
  status?: string;
  amount_from?: number;
  amount_to?: number;
  has_discounts?: boolean;
  invoice_number?: string;
  order_number?: string;
  journal_number?: string;
  cursor?: string;
  limit?: number;
}

export const MOVEMENT_LABELS: Record<string, string> = {
  sales: "مبيعات موظف",
  advance: "سلفة نقدية",
  advance_repayment: "سداد سلفة",
  salary: "خصم راتب",
  salary_payment: "صرف راتب",
  loan: "قرض",
  loan_repayment: "سداد قرض",
  payment: "دفعة",
  journal: "قيد يدوي",
  return: "مرتجع",
  settlement: "تسوية",
  purchase: "مشتريات",
  transfer: "تحويل",
  adjustment: "تسوية",
  opening: "رصيد افتتاحي",
  closing: "رصيد ختامي",
  other: "أخرى",
};

export const MOVEMENT_COLORS: Record<string, string> = {
  sales: "text-sky-400 bg-sky-500/15 border-sky-500/25",
  advance: "text-amber-400 bg-amber-500/15 border-amber-500/25",
  advance_repayment: "text-blue-400 bg-blue-500/15 border-blue-500/25",
  salary: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25",
  salary_payment: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25",
  loan: "text-violet-400 bg-violet-500/15 border-violet-500/25",
  loan_repayment: "text-violet-400 bg-violet-500/15 border-violet-500/25",
  payment: "text-blue-400 bg-blue-500/15 border-blue-500/25",
  journal: "text-slate-400 bg-slate-500/15 border-slate-500/25",
  return: "text-pink-400 bg-pink-500/15 border-pink-500/25",
  settlement: "text-amber-400 bg-amber-500/15 border-amber-500/25",
  adjustment: "text-amber-400 bg-amber-500/15 border-amber-500/25",
  opening: "text-slate-400 bg-slate-500/15 border-slate-500/25",
  other: "text-slate-500 bg-slate-500/10 border-slate-500/20",
};

export const MOVEMENT_ICONS: Record<string, string> = {
  sales: "🛒",
  advance: "💵",
  advance_repayment: "💳",
  salary: "💰",
  salary_payment: "💰",
  loan: "💵",
  loan_repayment: "💳",
  payment: "💳",
  journal: "📘",
  return: "↩",
  settlement: "🔄",
  adjustment: "🔄",
  opening: "📂",
  other: "❓",
};

export interface AccountStatementBlock {
  lines: StatementEntry[];
  closing_balance: number;
}

// بنية استجابة كشف حساب الموظف من الباك:
// { accounts: { advance, salary, loan, sales },
//   outstanding_advance, outstanding_loan, accrued_salary, net_payable }
export interface EmployeeStatementData {
  accounts: {
    advance?: AccountStatementBlock;
    salary?: AccountStatementBlock;
    loan?: AccountStatementBlock;
    sales?: AccountStatementBlock;
  };
  outstanding_advance?: number;
  outstanding_loan?: number;
  accrued_salary?: number;
  net_payable?: number;
  all_lines?: StatementEntry[];
  totals?: {
    opening_balance: number;
    closing_balance: number;
    total_debit: number;
    total_credit: number;
  };
  pagination?: {
    next_cursor: string | null;
    has_more: boolean;
    total: number;
    returned: number;
  };
  summary_by_movement?: Record<string, {
    movement_type: string;
    movement_label: string;
    count: number;
    debit: number;
    credit: number;
  }>;
}

// بنية استجابة كشف حساب العميل/المورد
export interface EntityStatementData {
  lines: StatementEntry[];
  closing_balance: number;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  accounts?: Array<{
    account_id: number;
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
    net: number;
  }>;
}

export interface CustomerStatementResponse {
  customer: { id: number; name: string; code: string };
  balance: number;
  period: { from: string; to: string };
  statement: EntityStatementData;
}

export interface SupplierStatementResponse {
  supplier: { id: number; name: string; code: string };
  balance: number;
  period: { from: string; to: string };
  statement: EntityStatementData;
}

// ─── Loan Types ────────────────────────────────────────────────────────────

export interface EmployeeLoan {
  id: number;
  employee_id: number;
  amount: number;
  date_granted: string;
  repayment_date: string | null;
  amount_paid: number;
  status: "pending" | "repaid" | "partially_repaid" | "cancelled";
  notes: string | null;
  transaction_id: number | null;
  remaining_amount?: number;
  created_at: string;
  updated_at: string;
}

// ─── Action Payload Types ──────────────────────────────────────────────────

export interface AdvancePayload {
  amount: number;
  cash_account_id: number;
  date: string;
  description?: string;
}

export interface SalaryAccrualPayload {
  amount: number;
  date: string;
  description?: string;
}

export interface SalaryPaymentPayload {
  gross_amount: number;
  cash_account_id: number;
  date: string;
  advance_deduction?: number;
  description?: string;
}

export interface LoanPayload {
  amount: number;
  cash_account_id: number;
  date: string;
  description?: string;
}

export interface CustomerInvoicePayload {
  amount: number;
  offset_account_id: number;
  date: string;
  reference?: string;
  branch_id?: number;
}

export interface CustomerPaymentPayload {
  amount: number;
  cash_account_id: number;
  date: string;
  reference?: string;
  branch_id?: number;
}

export interface SupplierBillPayload {
  amount: number;
  offset_account_id: number;
  date: string;
  reference?: string;
  branch_id?: number;
}

export interface SupplierPaymentPayload {
  amount: number;
  cash_account_id: number;
  date: string;
  reference?: string;
  branch_id?: number;
}

const logAccountingPayload = (label: string, payload: Record<string, unknown>) => {
  console.debug(label, {
    received_entity_type: payload.entity_type ?? null,
    received_entity_id: payload.entity_id ?? null,
    received_subledger_type: payload.subledger_type ?? null,
    received_subledger_id: payload.subledger_id ?? null,
    payload,
  });
};

// ─── Service ───────────────────────────────────────────────────────────────

export const financeService = {
  // ── Employee Finance ────────────────────────────────────────────────────

  // POST /api/employees/{id}/advance
  recordAdvance: async (
    employeeId: number,
    data: AdvancePayload,
  ): Promise<ApiResponse> => {
    logAccountingPayload("financeService.recordAdvance", data as Record<string, unknown>);
    const res = await api.post(`/employees/${employeeId}/advance`, data);
    return res.data;
  },

  // POST /api/employees/{id}/advance-repayment
  recordAdvanceRepayment: async (
    employeeId: number,
    data: AdvancePayload,
  ): Promise<ApiResponse> => {
    logAccountingPayload("financeService.recordAdvanceRepayment", data as Record<string, unknown>);
    const res = await api.post(
      `/employees/${employeeId}/advance-repayment`,
      data,
    );
    return res.data;
  },

  // POST /api/employees/{id}/salary-accrual
  recordSalaryAccrual: async (
    employeeId: number,
    data: SalaryAccrualPayload,
  ): Promise<ApiResponse> => {
    logAccountingPayload("financeService.recordSalaryAccrual", data as Record<string, unknown>);
    const res = await api.post(`/employees/${employeeId}/salary-accrual`, data);
    return res.data;
  },

  // POST /api/employees/{id}/salary-payment
  recordSalaryPayment: async (
    employeeId: number,
    data: SalaryPaymentPayload,
  ): Promise<ApiResponse> => {
    logAccountingPayload("financeService.recordSalaryPayment", data as Record<string, unknown>);
    const res = await api.post(`/employees/${employeeId}/salary-payment`, data);
    return res.data;
  },

  // POST /api/employees/{id}/loan
  recordLoan: async (
    employeeId: number,
    data: LoanPayload,
  ): Promise<ApiResponse> => {
    const res = await api.post(`/employees/${employeeId}/loan`, data);
    return res.data;
  },

  // POST /api/employees/{id}/loan-repayment
  recordLoanRepayment: async (
    employeeId: number,
    data: LoanPayload,
  ): Promise<ApiResponse> => {
    const res = await api.post(`/employees/${employeeId}/loan-repayment`, data);
    return res.data;
  },

  // GET /api/employees/{id}/account-statement
  // ✅ الباك يرجع ApiResponse<EmployeeStatementData> — ليس StatementEntry[] مباشرة
  // ✅ الباك يقوم بالفلترة حسب movement_type (StatementClassifier)
  getEmployeeStatement: async (
    employeeId: number,
    filters: StatementFilters | string,
    toArg?: string,
    typeArg?: StatementType,
  ): Promise<ApiResponse<EmployeeStatementData>> => {
    const params: StatementFilters =
      typeof filters === "string"
        ? { from: filters, to: toArg, type: typeArg ?? "all" }
        : filters;

    const res = await api.get(`/employees/${employeeId}/account-statement`, {
      params,
    });
    return res.data;
  },

  exportEmployeeStatement: async (
    employeeId: number,
    filters: StatementFilters,
    format: "csv" | "excel" = "csv",
  ): Promise<Blob> => {
    const res = await api.get(`/employees/${employeeId}/account-statement/export`, {
      params: { ...filters, format },
      responseType: "blob",
    });
    return res.data;
  },

  // GET /api/employees/{id}/loans
  getEmployeeLoans: async (employeeId: number): Promise<EmployeeLoan[]> => {
    const res = await api.get(`/employees/${employeeId}/loans`);
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  },

  // ── Customer Finance ────────────────────────────────────────────────────

  recordCustomerInvoice: async (
    customerId: number,
    data: CustomerInvoicePayload,
  ): Promise<ApiResponse> => {
    logAccountingPayload("financeService.recordCustomerInvoice", data as Record<string, unknown>);
    const res = await api.post(`/customers/${customerId}/invoice`, data);
    return res.data;
  },

  recordCustomerPayment: async (
    customerId: number,
    data: CustomerPaymentPayload,
  ): Promise<ApiResponse> => {
    logAccountingPayload("financeService.recordCustomerPayment", data as Record<string, unknown>);
    const res = await api.post(`/customers/${customerId}/payment`, data);
    return res.data;
  },

  getCustomerStatement: async (
    customerId: number,
    from: string,
    to: string,
  ): Promise<ApiResponse<CustomerStatementResponse>> => {
    const res = await api.get(`/customers/${customerId}/statement`, {
      params: { from, to },
    });
    return res.data;
  },

  // ── Supplier Finance ────────────────────────────────────────────────────

  recordSupplierBill: async (
    supplierId: number,
    data: SupplierBillPayload,
  ): Promise<ApiResponse> => {
    logAccountingPayload("financeService.recordSupplierBill", data as Record<string, unknown>);
    const res = await api.post(`/suppliers/${supplierId}/bill`, data);
    return res.data;
  },

  recordSupplierPayment: async (
    supplierId: number,
    data: SupplierPaymentPayload,
  ): Promise<ApiResponse> => {
    logAccountingPayload("financeService.recordSupplierPayment", data as Record<string, unknown>);
    const res = await api.post(`/suppliers/${supplierId}/payment`, data);
    return res.data;
  },

  getSupplierStatement: async (
    supplierId: number,
    from: string,
    to: string,
  ): Promise<ApiResponse<SupplierStatementResponse>> => {
    const res = await api.get(`/suppliers/${supplierId}/statement`, {
      params: { from, to },
    });
    return res.data;
  },
};
