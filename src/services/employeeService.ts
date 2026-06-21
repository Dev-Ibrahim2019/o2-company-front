// src/services/employeeService.ts
// Enhanced with financial endpoints matching Customer/Supplier architecture

import api from "../api/axios";

export interface EmployeeFromApi {
  id: number;
  name: string;
  employeeId?: string;
  phone: string;
  email?: string;
  address?: string;
  nationalId?: string;
  dob?: string;
  image?: string;
  branch_id: number;
  department_id: number;
  jobTitleId?: string;
  typeId?: string;
  managerId?: string;
  hireDate: string;
  salary?: number;
  salary_type?: "hourly" | "daily" | "monthly";
  hourly_rate?: number;
  daily_rate?: number;
  working_hours?: number;
  working_days?: number;
  calculated_salary?: number;
  role: string;
  status: string;
  username?: string;
  permissions: string[];
  notes?: string;
  rating: number;
  branch?: { id: number; name: string };
  department?: { id: number; name: string };
  outstanding_advance?: number;
  accrued_salary?: number;
  net_payable?: number;
  job_title?: { id: number; name: string };
}

export interface EmployeeFilters {
  branch_id?: number;
  department_id?: number;
  status?: string;
  search?: string;
  salary_type?: string;
  month?: number;
  year?: number;
}

export interface EmployeeStatementLine {
  id?: number;
  date: string;
  transaction_number: string;
  type: string;
  description: string | null;
  account_name?: string;
  account_code?: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface EmployeeStatement {
  lines: EmployeeStatementLine[];
  opening_balance: number;
  closing_balance: number;
  total_debit: number;
  total_credit: number;
}

export interface AccountStatementResponse {
  employee: { id: number; name: string };
  period: { from: string; to: string };
  outstanding_advance: number;
  outstanding_loan: number;
  accrued_salary: number;
  net_payable: number;
  accounts: {
    advance?: EmployeeStatement;
    salary?: EmployeeStatement;
    loan?: EmployeeStatement;
  };
}

export interface EmployeeDashboardStats {
  total_employees: number;
  active_employees: number;
  monthly_salary_expense: number;
  outstanding_advances: number;
  total_payments: number;
  average_salary: number;
  pending_salary_employees: number;
  department_breakdown: {
    department: string;
    count: number;
    salary: number;
    advances: number;
  }[];
  monthly_trend: {
    month: string;
    salaries: number;
    advances: number;
    payments: number;
  }[];
}

export interface EmployeeAnalyticsData {
  department_payroll: {
    name: string;
    salaries: number;
    advances: number;
    count: number;
  }[];
  monthly_summary: {
    month: string;
    salaries: number;
    advances: number;
    payments: number;
  }[];
  totals: {
    total_salaries: number;
    total_advances: number;
    total_payments: number;
    average_salary: number;
    total_employees: number;
  };
}

export interface FinancialBatchEmployee {
  id: number;
  name: string;
  employeeId: string;
  phone: string;
  status: string;
  salary: number;
  department: string;
  department_id: number;
  branch: string;
  branch_id: number;
  job_title: string;
  hireDate: string;
  outstanding_advance: number;
  accrued_salary: number;
  net_payable: number;
  last_transaction_date: string;
}

export interface FinancialBatchResponse {
  employees: FinancialBatchEmployee[];
  totals: {
    total_employees: number;
    active_employees: number;
    total_salaries: number;
    total_outstanding_advances: number;
    total_accrued_salaries: number;
    total_net_payable: number;
    average_salary: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

const logEmployeePayload = (label: string, payload: Record<string, unknown>) => {
  console.debug(label, {
    received_entity_type: payload.entity_type ?? null,
    received_entity_id: payload.entity_id ?? null,
    received_subledger_type: payload.subledger_type ?? null,
    received_subledger_id: payload.subledger_id ?? null,
    payload,
  });
};

export const employeeService = {
  // ── CRUD ──────────────────────────────────────────────────
  getAll: async (filters?: EmployeeFilters): Promise<EmployeeFromApi[]> => {
    const { data } = await api.get("/employees", { params: filters });
    const payload = data.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.employees)) return payload.employees;
    return [];
  },

  getOne: async (id: number): Promise<EmployeeFromApi> => {
    const { data } = await api.get(`/employees/${id}`);
    return data.data;
  },

  create: async (payload: any): Promise<EmployeeFromApi> => {
    const { data } = await api.post("/employees", payload);
    return data.data;
  },

  update: async (id: number, payload: any): Promise<EmployeeFromApi> => {
    const { data } = await api.put(`/employees/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },

  // ── Financial Batch (all employees with subledger data) ──
  getFinancialBatch: async (filters?: {
    department_id?: number;
    branch_id?: number;
    status?: string;
  }): Promise<ApiResponse<FinancialBatchResponse>> => {
    const { data } = await api.get("/employees/financial-batch", {
      params: filters,
    });
    return data;
  },

  // ── Dashboard & Analytics ────────────────────────────────
  getDashboard: async (filters?: {
    month?: number;
    year?: number;
    department_id?: number;
    branch_id?: number;
  }): Promise<ApiResponse<EmployeeDashboardStats>> => {
    const { data } = await api.get("/employees/dashboard", { params: filters });
    return data;
  },

  getAnalytics: async (filters?: {
    month?: number;
    year?: number;
    department_id?: number;
  }): Promise<ApiResponse<EmployeeAnalyticsData>> => {
    const { data } = await api.get("/employees/analytics", { params: filters });
    return data;
  },

  // ── Account Statements ────────────────────────────────────
  getAccountStatement: async (
    employeeId: number,
    from: string,
    to: string,
    type: string = "all",
  ): Promise<ApiResponse<AccountStatementResponse>> => {
    const { data } = await api.get(
      `/employees/${employeeId}/account-statement`,
      { params: { from, to, type } },
    );
    return data;
  },

  // ── Advances ──────────────────────────────────────────────
  recordAdvance: async (
    employeeId: number,
    payload: {
      amount: number;
      cash_account_id: number;
      date: string;
      description?: string;
      branch_id?: number;
      entity_type?: "employee";
      entity_id?: number;
      subledger_type?: "employee";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logEmployeePayload("employeeService.recordAdvance", payload as Record<string, unknown>);
    const { data } = await api.post(
      `/employees/${employeeId}/advance`,
      payload,
    );
    return data;
  },

  recordAdvanceRepayment: async (
    employeeId: number,
    payload: {
      amount: number;
      cash_account_id: number;
      date: string;
      description?: string;
      branch_id?: number;
      entity_type?: "employee";
      entity_id?: number;
      subledger_type?: "employee";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logEmployeePayload("employeeService.recordAdvanceRepayment", payload as Record<string, unknown>);
    const { data } = await api.post(
      `/employees/${employeeId}/advance-repayment`,
      payload,
    );
    return data;
  },

  // ── Salaries ─────────────────────────────────────────────
  accrualSalary: async (
    employeeId: number,
    payload: any,
  ): Promise<ApiResponse<any>> => {
    logEmployeePayload("employeeService.accrualSalary", payload as Record<string, unknown>);
    const { data } = await api.post(
      `/employees/${employeeId}/salary-accrual`,
      payload,
    );
    return data;
  },

  paySalary: async (
    employeeId: number,
    payload: {
      gross_amount: number;
      cash_account_id: number;
      date: string;
      month: number;
      year: number;
      allowances?: number;
      deductions?: number;
      advance_deduction?: number;
      description?: string;
      branch_id?: number;
      entity_type?: "employee";
      entity_id?: number;
      subledger_type?: "employee";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logEmployeePayload("employeeService.paySalary", payload as Record<string, unknown>);
    const { data } = await api.post(
      `/employees/${employeeId}/salary-payment`,
      payload,
    );
    return data;
  },

  // ── Settlement ────────────────────────────────────────────
  recordSettlement: async (
    employeeId: number,
    payload: {
      amount: number;
      cash_account_id: number;
      date: string;
      description?: string;
      branch_id?: number;
      type: "debit" | "credit";
      entity_type?: "employee";
      entity_id?: number;
      subledger_type?: "employee";
      subledger_id?: number;
    },
  ): Promise<ApiResponse<any>> => {
    logEmployeePayload("employeeService.recordSettlement", payload as Record<string, unknown>);
    const { data } = await api.post(
      `/employees/${employeeId}/settlement`,
      payload,
    );
    return data;
  },

  // ── Loans ────────────────────────────────────────────────
  recordLoan: async (
    employeeId: number,
    payload: any,
  ): Promise<ApiResponse<any>> => {
    const { data } = await api.post(`/employees/${employeeId}/loan`, payload);
    return data;
  },

  recordLoanRepayment: async (
    employeeId: number,
    payload: any,
  ): Promise<ApiResponse<any>> => {
    const { data } = await api.post(
      `/employees/${employeeId}/loan-repayment`,
      payload,
    );
    return data;
  },

  getLoans: async (employeeId: number): Promise<ApiResponse<any>> => {
    const { data } = await api.get(`/employees/${employeeId}/loans`);
    return data;
  },
};
