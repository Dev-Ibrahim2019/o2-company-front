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
  document_number?: string | null;
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
  invoice_id?: number | null;
  document_id?: number | null;
  has_discounts?: boolean;
  discount_amount?: number;
  discount_percent?: number;
  payments_data?: Array<Record<string, unknown>>;
  journal_entries?: Array<Record<string, unknown>>;
}

export type MovementType = "sales" | "advance" | "salary" | "loan" | "payment" | "payments" | "receipt" | "receipts" | "journal" | "return" | "returns" | "settlement" | "advance_repayment" | "loan_repayment" | "salary_payment" | "adjustment" | "opening" | "purchase" | "purchases" | "credit_note" | "debit_note" | "discount" | "other";

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
  | "purchases"
  | "payments"
  | "receipts"
  | "returns"
  | "credit_note"
  | "debit_note"
  | "discount"
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
  sales: "\u0645\u0628\u064a\u0639\u0627\u062a",
  advance: "\u0633\u0644\u0641\u0629 \u0646\u0642\u062f\u064a\u0629",
  advance_repayment: "\u0633\u062f\u0627\u062f \u0633\u0644\u0641\u0629",
  salary: "\u0627\u0633\u062a\u062d\u0642\u0627\u0642 \u0631\u0627\u062a\u0628",
  salary_payment: "\u0635\u0631\u0641 \u0631\u0627\u062a\u0628",
  loan: "\u0642\u0631\u0636",
  loan_repayment: "\u0633\u062f\u0627\u062f \u0642\u0631\u0636",
  payment: "\u062f\u0641\u0639\u0629",
  payments: "\u062f\u0641\u0639\u0627\u062a",
  receipt: "\u062a\u062d\u0635\u064a\u0644",
  receipts: "\u062a\u062d\u0635\u064a\u0644\u0627\u062a",
  journal: "\u0642\u064a\u062f \u064a\u0648\u0645\u064a\u0629",
  return: "\u0645\u0631\u062a\u062c\u0639",
  returns: "\u0645\u0631\u062a\u062c\u0639\u0627\u062a",
  settlement: "\u062a\u0633\u0648\u064a\u0629",
  purchase: "\u0645\u0634\u062a\u0631\u064a\u0627\u062a",
  purchases: "\u0645\u0634\u062a\u0631\u064a\u0627\u062a",
  transfer: "\u062a\u062d\u0648\u064a\u0644",
  adjustment: "\u062a\u0633\u0648\u064a\u0629",
  credit_note: "\u0625\u0634\u0639\u0627\u0631 \u062f\u0627\u0626\u0646",
  debit_note: "\u0625\u0634\u0639\u0627\u0631 \u0645\u062f\u064a\u0646",
  discount: "\u062e\u0635\u0645",
  opening: "\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a",
  closing: "\u0631\u0635\u064a\u062f \u062e\u062a\u0627\u0645\u064a",
  other: "\u0623\u062e\u0631\u0649",
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
  sales: "\u2022",
  advance: "\u2022",
  advance_repayment: "\u2022",
  salary: "\u2022",
  salary_payment: "\u2022",
  loan: "\u2022",
  loan_repayment: "\u2022",
  payment: "\u2022",
  payments: "\u2022",
  receipt: "\u2022",
  receipts: "\u2022",
  journal: "\u2022",
  return: "\u2022",
  returns: "\u2022",
  settlement: "\u2022",
  purchase: "\u2022",
  purchases: "\u2022",
  credit_note: "\u2022",
  debit_note: "\u2022",
  discount: "\u2022",
  adjustment: "\u2022",
  opening: "\u2022",
  other: "\u2022",
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

  getEmployeeStatementPdf: async (
    employeeId: number,
    from: string,
    to: string,
    type: StatementType = "all",
    pdfStyle: "simple" | "detailed" = "detailed",
  ): Promise<Blob> => {
    const res = await api.get(`/employees/${employeeId}/account-statement/pdf`, {
      params: { from, to, type, pdf_style: pdfStyle },
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
    filters: Omit<StatementFilters, "from" | "to"> = {},
  ): Promise<ApiResponse<CustomerStatementResponse>> => {
    const res = await api.get(`/customers/${customerId}/statement`, {
      params: { from, to, ...filters },
    });
    return res.data;
  },

  exportCustomerStatement: async (
    customerId: number,
    filters: StatementFilters,
    format: "csv" | "excel" = "csv",
  ): Promise<Blob> => {
    const res = await api.get(`/customers/${customerId}/statement/export`, {
      params: { ...filters, format },
      responseType: "blob",
    });
    return res.data;
  },

  getCustomerStatementPdf: async (
    customerId: number,
    from: string,
    to: string,
    type: StatementType = "all",
    pdfStyle: "simple" | "detailed" = "detailed",
  ): Promise<Blob> => {
    const res = await api.get(`/customers/${customerId}/statement/pdf`, {
      params: { from, to, type, pdf_style: pdfStyle },
      responseType: "blob",
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
    filters: Omit<StatementFilters, "from" | "to"> = {},
  ): Promise<ApiResponse<SupplierStatementResponse>> => {
    const res = await api.get(`/suppliers/${supplierId}/statement`, {
      params: { from, to, ...filters },
    });
    return res.data;
  },

  exportSupplierStatement: async (
    supplierId: number,
    filters: StatementFilters,
    format: "csv" | "excel" = "csv",
  ): Promise<Blob> => {
    const res = await api.get(`/suppliers/${supplierId}/statement/export`, {
      params: { ...filters, format },
      responseType: "blob",
    });
    return res.data;
  },

  getSupplierStatementPdf: async (
    supplierId: number,
    from: string,
    to: string,
    type: StatementType = "all",
    pdfStyle: "simple" | "detailed" = "detailed",
  ): Promise<Blob> => {
    const res = await api.get(`/suppliers/${supplierId}/statement/pdf`, {
      params: { from, to, type, pdf_style: pdfStyle },
      responseType: "blob",
    });
    return res.data;
  },
};
