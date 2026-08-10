export type CrmId = string | number;
export interface CrmBranch { id: CrmId; name: string }
export interface CrmCustomer {
  id: CrmId; code?: string; name: string; phone?: string | null; mobile?: string | null;
  email?: string | null; status?: string; category?: string | null; branch?: CrmBranch | null;
  branch_id?: CrmId | null; city?: string | null; created_at?: string;
  orders_count?: number; complaints_count?: number; addresses_count?: number;
  [key: string]: unknown;
}
export interface CrmPage<T> { items: T[]; currentPage: number; lastPage: number; total: number }
export interface CrmDashboard {
  customers_count?: number; active_customers_count?: number; new_customers_count?: number;
  open_complaints_count?: number; orders_count?: number; branches?: CrmBranch[];
  recent_customers?: CrmCustomer[]; [key: string]: unknown;
}
export type CrmSection = "overview" | "orders" | "addresses" | "complaints" | "notes" | "occasions" | "financial-summary" | "statement" | "aging";
