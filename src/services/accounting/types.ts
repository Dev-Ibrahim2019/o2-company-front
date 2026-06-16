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

export type SubledgerType = "employee" | "customer" | "supplier";

export interface SubledgerInfo {
  type: SubledgerType;
  id: number;
  name?: string | null;
}

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
  subledger_type?: SubledgerType | null;
  subledger_id?: number | null;
  subledger?: SubledgerInfo | null;
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
  entries_count: number;
  is_balanced: boolean;
  is_editable: boolean;
  source_type?: string;
  source_id?: number;
  source_label?: string;
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
