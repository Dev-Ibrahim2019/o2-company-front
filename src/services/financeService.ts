// src/services/financeService.ts
//
// ✅ تم التحديث ليتطابق مع EmployeeFinancialController في الباك
// ✅ إضافة أنواع TypeScript صارمة للاستجابات
// ✅ توحيد بنية StatementEntry لجميع الكيانات
// ✅ تصحيح نوع الإرجاع لـ getEmployeeStatement (TransactionResponse بدلاً من StatementEntry[])

import api from "../api/axios";

// ─── Shared Response Wrapper ───────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

// ─── Statement Types ───────────────────────────────────────────────────────

export interface StatementEntry {
  date: string;
  transaction_number: string;
  reference: string | null;
  description: string | null;
  debit: number;
  credit: number;
  running_balance: number;
  account_name: string;
  transaction_source: string;
}

export interface AccountStatementBlock {
  lines: StatementEntry[];
  closing_balance: number;
}

// بنية استجابة كشف حساب الموظف من الباك:
// { accounts: { advance: AccountStatementBlock, salary: AccountStatementBlock },
//   outstanding_advance, accrued_salary, net_payable }
export interface EmployeeStatementData {
  accounts: {
    advance?: AccountStatementBlock;
    salary?: AccountStatementBlock;
  };
  outstanding_advance?: number;
  accrued_salary?: number;
  net_payable?: number;
}

// بنية استجابة كشف حساب العميل/المورد
export interface EntityStatementData {
  lines: StatementEntry[];
  closing_balance: number;
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

// ─── Service ───────────────────────────────────────────────────────────────

export const financeService = {
  // ── Employee Finance ────────────────────────────────────────────────────

  // POST /api/employees/{id}/advance
  recordAdvance: async (
    employeeId: number,
    data: AdvancePayload,
  ): Promise<ApiResponse> => {
    const res = await api.post(`/employees/${employeeId}/advance`, data);
    return res.data;
  },

  // POST /api/employees/{id}/advance-repayment
  recordAdvanceRepayment: async (
    employeeId: number,
    data: AdvancePayload,
  ): Promise<ApiResponse> => {
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
    const res = await api.post(`/employees/${employeeId}/salary-accrual`, data);
    return res.data;
  },

  // POST /api/employees/{id}/salary-payment
  recordSalaryPayment: async (
    employeeId: number,
    data: SalaryPaymentPayload,
  ): Promise<ApiResponse> => {
    const res = await api.post(`/employees/${employeeId}/salary-payment`, data);
    return res.data;
  },

  // GET /api/employees/{id}/account-statement
  // ✅ الباك يرجع ApiResponse<EmployeeStatementData> — ليس StatementEntry[] مباشرة
  getEmployeeStatement: async (
    employeeId: number,
    from: string,
    to: string,
    type: "all" | "advance" | "salary" = "all",
  ): Promise<ApiResponse<EmployeeStatementData>> => {
    const res = await api.get(`/employees/${employeeId}/account-statement`, {
      params: { from, to, type },
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
    const res = await api.post(`/customers/${customerId}/invoice`, data);
    return res.data;
  },

  recordCustomerPayment: async (
    customerId: number,
    data: CustomerPaymentPayload,
  ): Promise<ApiResponse> => {
    const res = await api.post(`/customers/${customerId}/payment`, data);
    return res.data;
  },

  getCustomerStatement: async (
    customerId: number,
    from: string,
    to: string,
  ): Promise<ApiResponse<EntityStatementData>> => {
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
    const res = await api.post(`/suppliers/${supplierId}/bill`, data);
    return res.data;
  },

  recordSupplierPayment: async (
    supplierId: number,
    data: SupplierPaymentPayload,
  ): Promise<ApiResponse> => {
    const res = await api.post(`/suppliers/${supplierId}/payment`, data);
    return res.data;
  },

  getSupplierStatement: async (
    supplierId: number,
    from: string,
    to: string,
  ): Promise<ApiResponse<EntityStatementData>> => {
    const res = await api.get(`/suppliers/${supplierId}/statement`, {
      params: { from, to },
    });
    return res.data;
  },
};
