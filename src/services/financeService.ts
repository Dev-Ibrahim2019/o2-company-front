// src/services/financeService.ts
//
// مُحدَّث ليتطابق مع EmployeeFinancialController في الباك:
//   - advance:          { amount, cash_account_id, date, description }
//   - advance-repayment:{ amount, cash_account_id, date, description }
//   - salary-accrual:   { amount, date, description }
//   - salary-payment:   { gross_amount, cash_account_id, date, advance_deduction, description }
//   - account-statement: GET ?from=&to=&type=

import api from "../api/axios";

export interface TransactionResponse {
  success: boolean;
  message: string;
  data: any;
  errors: any;
}

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

export interface StatementEntry {
  date: string;
  transaction_number: string;
  reference?: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export const financeService = {
  // ── Employee Finance ──────────────────────────────────────────────────────

  // POST /api/employees/{id}/advance
  recordAdvance: async (
    employeeId: number,
    data: {
      amount: number;
      cash_account_id: number;
      date: string;
      description?: string;
    },
  ): Promise<TransactionResponse> => {
    const res = await api.post(`/employees/${employeeId}/advance`, data);
    return res.data;
  },

  // POST /api/employees/{id}/advance-repayment
  recordAdvanceRepayment: async (
    employeeId: number,
    data: {
      amount: number;
      cash_account_id: number;
      date: string;
      description?: string;
    },
  ): Promise<TransactionResponse> => {
    const res = await api.post(
      `/employees/${employeeId}/advance-repayment`,
      data,
    );
    return res.data;
  },

  // POST /api/employees/{id}/salary-accrual
  recordSalaryAccrual: async (
    employeeId: number,
    data: {
      amount: number;
      date: string;
      description?: string;
    },
  ): Promise<TransactionResponse> => {
    const res = await api.post(`/employees/${employeeId}/salary-accrual`, data);
    return res.data;
  },

  // POST /api/employees/{id}/salary-payment
  recordSalaryPayment: async (
    employeeId: number,
    data: {
      gross_amount: number;
      cash_account_id: number;
      date: string;
      advance_deduction?: number;
      description?: string;
    },
  ): Promise<TransactionResponse> => {
    const res = await api.post(`/employees/${employeeId}/salary-payment`, data);
    return res.data;
  },

  // GET /api/employees/{id}/account-statement
  getEmployeeStatement: async (
    employeeId: number,
    from: string,
    to: string,
    type: "all" | "advance" | "salary" = "all",
  ): Promise<TransactionResponse> => {
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

  // ── Customer Finance ──────────────────────────────────────────────────────

  recordCustomerInvoice: async (
    customerId: number,
    data: {
      amount: number;
      offset_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
    },
  ): Promise<TransactionResponse> => {
    const res = await api.post(`/customers/${customerId}/invoice`, data);
    return res.data;
  },

  recordCustomerPayment: async (
    customerId: number,
    data: {
      amount: number;
      cash_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
    },
  ): Promise<TransactionResponse> => {
    const res = await api.post(`/customers/${customerId}/payment`, data);
    return res.data;
  },

  getCustomerStatement: async (
    customerId: number,
    from: string,
    to: string,
  ): Promise<TransactionResponse> => {
    const res = await api.get(`/customers/${customerId}/statement`, {
      params: { from, to },
    });
    return res.data;
  },

  // ── Supplier Finance ──────────────────────────────────────────────────────

  recordSupplierBill: async (
    supplierId: number,
    data: {
      amount: number;
      offset_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
    },
  ): Promise<TransactionResponse> => {
    const res = await api.post(`/suppliers/${supplierId}/bill`, data);
    return res.data;
  },

  recordSupplierPayment: async (
    supplierId: number,
    data: {
      amount: number;
      cash_account_id: number;
      date: string;
      reference?: string;
      branch_id?: number;
    },
  ): Promise<TransactionResponse> => {
    const res = await api.post(`/suppliers/${supplierId}/payment`, data);
    return res.data;
  },

  getSupplierStatement: async (
    supplierId: number,
    from: string,
    to: string,
  ): Promise<TransactionResponse> => {
    const res = await api.get(`/suppliers/${supplierId}/statement`, {
      params: { from, to },
    });
    return res.data;
  },
};
