import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// A new axios instance for finance operations that does not rely on localStorage
// The token should be passed in from a secure context (e.g., React Context, Redux, or a prop)
const financeApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add a request interceptor to include the Authorization header dynamically
financeApi.interceptors.request.use(
  (config) => {
    // This assumes a mechanism to get the token without localStorage/sessionStorage
    // For example, if a token is stored in a global state or passed via a context
    // For now, we'll leave it as a placeholder. The actual implementation will depend
    // on how the frontend manages authentication tokens without local storage.
    // const token = getAuthTokenFromContextOrState(); // Placeholder
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export interface TransactionResponse {
  success: boolean;
  message: string;
  data: any;
  errors: any;
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
      cash_account_id: number;
      date: string;
      description?: string;
      branch_id?: number;
    },
  ): Promise<TransactionResponse> => {
    const response = await financeApi.post<TransactionResponse>(
      `/employees/${employeeId}/advance`,
      data,
    );
    return response.data;
  },

  recordSalaryPayment: async (
    employeeId: number,
    data: {
      gross_amount: number;
      advance_deduction: number;
      cash_account_id: number;
      date: string;
      description?: string;
      branch_id?: number;
    },
  ): Promise<TransactionResponse> => {
    const response = await financeApi.post<TransactionResponse>(
      `/employees/${employeeId}/salary-payment`,
      data,
    );
    return response.data;
  },

  getEmployeeStatement: async (
    employeeId: number,
    from: string,
    to: string,
  ): Promise<TransactionResponse> => {
    const response = await financeApi.get<TransactionResponse>(
      `/employees/${employeeId}/statement`,
      { params: { from, to } },
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
    const response = await financeApi.post<TransactionResponse>(
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
    const response = await financeApi.post<TransactionResponse>(
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
    const response = await financeApi.get<TransactionResponse>(
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
    const response = await financeApi.post<TransactionResponse>(
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
    const response = await financeApi.post<TransactionResponse>(
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
    const response = await financeApi.get<TransactionResponse>(
      `/suppliers/${supplierId}/statement`,
      { params: { from, to } },
    );
    return response.data;
  },
};
