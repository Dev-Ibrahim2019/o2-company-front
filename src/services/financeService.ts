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
  reference: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface AccountStatement {
  opening_balance: number;
  closing_balance: number;
  entries: StatementEntry[];
}

export const financeService = {
  // Employee Finance Actions
  recordAdvance: async (
    employeeId: number,
    data: {
      amount: number;
      cash_bank_account_id: number;
      date_granted: string;
      notes?: string;
    },
  ): Promise<TransactionResponse> => {
    const response = await api.post<TransactionResponse>(
      `/employees/${employeeId}/advance`,
      data,
    );
    return response.data;
  },

  recordRepayment: async (
    employeeId: number,
    loanId: number,
    data: {
      amount: number;
      cash_bank_account_id: number;
      repayment_date: string;
      notes?: string;
    },
  ): Promise<TransactionResponse> => {
    const response = await api.post<TransactionResponse>(
      `/employees/${employeeId}/repay-advance/${loanId}`,
      data,
    );
    return response.data;
  },

  recordSalaryPayment: async (
    employeeId: number,
    data: {
      gross_salary: number;
      cash_bank_account_id: number;
      payment_date: string;
      notes?: string;
    },
  ): Promise<TransactionResponse> => {
    const response = await api.post<TransactionResponse>(
      `/employees/${employeeId}/salary-payment`,
      data,
    );
    return response.data;
  },

  getEmployeeStatement: async (
    employeeId: number,
    from_date?: string,
    to_date?: string,
  ): Promise<TransactionResponse> => {
    const response = await api.get<TransactionResponse>(
      `/employees/${employeeId}/statement`,
      { params: { from_date, to_date } },
    );
    return response.data;
  },

  getEmployeeLoans: async (employeeId: number): Promise<EmployeeLoan[]> => {
    const response = await api.get<EmployeeLoan[]>(
      `/employees/${employeeId}/loans`,
    );
    return response.data;
  },

  // Customer Finance Actions
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
    const response = await api.post<TransactionResponse>(
      `/customers/${customerId}/invoice`,
      data,
    );
    return response.data;
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
    const response = await api.post<TransactionResponse>(
      `/customers/${customerId}/payment`,
      data,
    );
    return response.data;
  },

  getCustomerStatement: async (
    customerId: number,
    from: string,
    to: string,
  ): Promise<TransactionResponse> => {
    const response = await api.get<TransactionResponse>(
      `/customers/${customerId}/statement`,
      { params: { from, to } },
    );
    return response.data;
  },

  // Supplier Finance Actions
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
    const response = await api.post<TransactionResponse>(
      `/suppliers/${supplierId}/bill`,
      data,
    );
    return response.data;
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
    const response = await api.post<TransactionResponse>(
      `/suppliers/${supplierId}/payment`,
      data,
    );
    return response.data;
  },

  getSupplierStatement: async (
    supplierId: number,
    from: string,
    to: string,
  ): Promise<TransactionResponse> => {
    const response = await api.get<TransactionResponse>(
      `/suppliers/${supplierId}/statement`,
      { params: { from, to } },
    );
    return response.data;
  },
};
