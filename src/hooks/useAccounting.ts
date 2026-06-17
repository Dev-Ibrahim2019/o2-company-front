// src/hooks/useAccounting.ts
//
// Hook مركزي يُدير حالة المحاسبة كاملة:
//   - دليل الحسابات (COA)
//   - القيود المحاسبية (Transactions)
//   - مراكز التكلفة (Cost Centers)
//   - دفتر الأستاذ (Ledger)
//
// يُستخدَم مباشرةً داخل AccountingPortal.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  accountService,
  transactionService,
  costCenterService,
  type Account,
  type Transaction,
  type CostCenter,
  type LedgerData,
} from "../services/accounting";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Pagination {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface TransactionFilters {
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  branch_id?: number;
  search?: string;
  reference?: string;
  per_page?: number;
  page?: number;
}

export interface AccountFilters {
  type?: string;
  search?: string;
  is_active?: boolean;
  parent_id?: number;
  tree?: boolean;
  with_balance?: boolean;
}

export interface UseAccountingReturn {
  // ── State ────────────────────────────────────────────────────────────────
  accounts: Account[];
  accountTree: Account[]; // شجرة الحسابات كاملة
  transactions: Transaction[];
  costCenters: CostCenter[];
  ledger: LedgerData | null;

  loading: {
    accounts: boolean;
    transactions: boolean;
    costCenters: boolean;
    ledger: boolean;
    saving: boolean;
  };
  error: string | null;
  pagination: Pagination | null;

  // ── Account Actions ───────────────────────────────────────────────────────
  fetchAccounts: (filters?: AccountFilters) => Promise<void>;
  fetchAccountTree: () => Promise<void>;
  createAccount: (payload: any) => Promise<Account>;
  updateAccount: (id: number, payload: any) => Promise<Account>;
  deleteAccount: (id: number) => Promise<void>;
  fetchLedger: (accountId: number, from?: string, to?: string) => Promise<void>;

  // ── Transaction Actions ───────────────────────────────────────────────────
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  createTransaction: (payload: any) => Promise<Transaction>;
  updateTransaction: (id: number, payload: any) => Promise<Transaction>;
  deleteTransaction: (id: number) => Promise<void>;
  postTransaction: (id: number) => Promise<Transaction>;
  cancelTransaction: (id: number) => Promise<Transaction>;

  // ── Cost Center Actions ───────────────────────────────────────────────────
  fetchCostCenters: (params?: any) => Promise<void>;
  createCostCenter: (payload: any) => Promise<CostCenter>;
  updateCostCenter: (id: number, payload: any) => Promise<CostCenter>;
  deleteCostCenter: (id: number) => Promise<void>;

  clearError: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export const useAccounting = (): UseAccountingReturn => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTree, setAccountTree] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState({
    accounts: false,
    transactions: false,
    costCenters: false,
    ledger: false,
    saving: false,
  });

  // منع تكرار الـ fetch الأولي
  const initialFetchDone = useRef(false);

  const setL = (key: keyof typeof loading, val: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: val }));

  const clearError = () => setError(null);

  const handleError = (e: any, fallback: string) => {
    const msg = e?.response?.data?.message ?? e?.message ?? fallback;
    setError(msg);
    throw e;
  };

  // ── Account Actions ───────────────────────────────────────────────────────

  const fetchAccounts = useCallback(async (filters?: AccountFilters) => {
    try {
      setL("accounts", true);
      setError(null);
      const data = await accountService.getAll(filters);
      setAccounts(data);
    } catch (e) {
      setError("فشل تحميل الحسابات");
    } finally {
      setL("accounts", false);
    }
  }, []);

  const fetchAccountTree = useCallback(async () => {
    try {
      setL("accounts", true);
      setError(null);
      // طلب الشجرة مع الأرصدة
      const data = await accountService.getAll({
        tree: true,
        with_balance: true,
      });
      setAccountTree(data);
      // القائمة المسطحة أيضاً مع الأرصدة لضمان عرضها في كل مكان
      const flat = await accountService.getAll({ with_balance: true });
      setAccounts(flat);
    } catch (e) {
      setError("فشل تحميل شجرة الحسابات");
    } finally {
      setL("accounts", false);
    }
  }, []);

  const createAccount = async (payload: any): Promise<Account> => {
    try {
      setL("saving", true);
      setError(null);
      const account = await accountService.create(payload);
      // أضفه للقائمة المسطحة فوراً
      setAccounts((prev) => [...prev, account]);
      // أعد بناء الشجرة
      await fetchAccountTree();
      return account;
    } catch (e: any) {
      return handleError(e, "فشل إنشاء الحساب");
    } finally {
      setL("saving", false);
    }
  };

  const updateAccount = async (id: number, payload: any): Promise<Account> => {
    try {
      setL("saving", true);
      setError(null);
      const updated = await accountService.update(id, payload);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      await fetchAccountTree();
      return updated;
    } catch (e: any) {
      return handleError(e, "فشل تحديث الحساب");
    } finally {
      setL("saving", false);
    }
  };

  const deleteAccount = async (id: number): Promise<void> => {
    try {
      setL("saving", true);
      setError(null);
      await accountService.delete(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      await fetchAccountTree();
    } catch (e: any) {
      handleError(e, "فشل حذف الحساب");
    } finally {
      setL("saving", false);
    }
  };

  const fetchLedger = async (
    accountId: number,
    from?: string,
    to?: string,
  ): Promise<void> => {
    try {
      setL("ledger", true);
      setError(null);
      const data = await accountService.getLedger(accountId, { from, to });
      setLedger(data);
    } catch (e) {
      setError("فشل تحميل كشف الحساب");
    } finally {
      setL("ledger", false);
    }
  };

  // ── Transaction Actions ───────────────────────────────────────────────────

  const fetchTransactions = useCallback(
    async (filters?: TransactionFilters) => {
      try {
        setL("transactions", true);
        setError(null);
        const result = await transactionService.getAll(filters);
        setTransactions(result.data ?? []);
        setPagination(result.pagination ?? null);
      } catch (e) {
        setError("فشل تحميل القيود المحاسبية");
      } finally {
        setL("transactions", false);
      }
    },
    [],
  );

  const createTransaction = async (payload: any): Promise<Transaction> => {
    try {
      setL("saving", true);
      setError(null);
      const tx = await transactionService.create(payload);
      setTransactions((prev) => [tx, ...prev]);
      // تحديث الأرصدة فوراً بعد إنشاء القيد
      await fetchAccountTree();
      return tx;
    } catch (e: any) {
      return handleError(e, "فشل إنشاء القيد");
    } finally {
      setL("saving", false);
    }
  };

  const updateTransaction = async (
    id: number,
    payload: any,
  ): Promise<Transaction> => {
    try {
      setL("saving", true);
      setError(null);
      const updated = await transactionService.update(id, payload);
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (e: any) {
      return handleError(e, "فشل تحديث القيد");
    } finally {
      setL("saving", false);
    }
  };

  const deleteTransaction = async (id: number): Promise<void> => {
    try {
      setL("saving", true);
      setError(null);
      await transactionService.delete(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      handleError(e, "فشل حذف القيد");
    } finally {
      setL("saving", false);
    }
  };

  const postTransaction = async (id: number): Promise<Transaction> => {
    try {
      setL("saving", true);
      setError(null);
      const updated = await transactionService.post(id);
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      // تحديث الأرصدة فوراً بعد ترحيل القيد
      await fetchAccountTree();
      return updated;
    } catch (e: any) {
      return handleError(e, "فشل ترحيل القيد");
    } finally {
      setL("saving", false);
    }
  };

  const cancelTransaction = async (id: number): Promise<Transaction> => {
    try {
      setL("saving", true);
      setError(null);
      const updated = await transactionService.cancel(id);
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (e: any) {
      return handleError(e, "فشل إلغاء القيد");
    } finally {
      setL("saving", false);
    }
  };

  // ── Cost Center Actions ───────────────────────────────────────────────────

  const fetchCostCenters = useCallback(async (params?: any) => {
    try {
      setL("costCenters", true);
      setError(null);
      const data = await costCenterService.getAll(params);
      setCostCenters(data);
    } catch (e) {
      setError("فشل تحميل مراكز التكلفة");
    } finally {
      setL("costCenters", false);
    }
  }, []);

  const createCostCenter = async (payload: any): Promise<CostCenter> => {
    try {
      setL("saving", true);
      setError(null);
      const cc = await costCenterService.create(payload);
      setCostCenters((prev) => [...prev, cc]);
      return cc;
    } catch (e: any) {
      return handleError(e, "فشل إنشاء مركز التكلفة");
    } finally {
      setL("saving", false);
    }
  };

  const updateCostCenter = async (
    id: number,
    payload: any,
  ): Promise<CostCenter> => {
    try {
      setL("saving", true);
      setError(null);
      const updated = await costCenterService.update(id, payload);
      setCostCenters((prev) => prev.map((cc) => (cc.id === id ? updated : cc)));
      return updated;
    } catch (e: any) {
      return handleError(e, "فشل تحديث مركز التكلفة");
    } finally {
      setL("saving", false);
    }
  };

  const deleteCostCenter = async (id: number): Promise<void> => {
    try {
      setL("saving", true);
      setError(null);
      await costCenterService.delete(id);
      setCostCenters((prev) => prev.filter((cc) => cc.id !== id));
    } catch (e: any) {
      handleError(e, "فشل حذف مركز التكلفة");
    } finally {
      setL("saving", false);
    }
  };

  // ── Initial Fetch ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;

    fetchAccountTree();
    fetchTransactions({ per_page: 50 });
    fetchCostCenters();
  }, [fetchAccountTree, fetchTransactions, fetchCostCenters]);

  return {
    accounts,
    accountTree,
    transactions,
    costCenters,
    ledger,
    loading,
    error,
    pagination,

    fetchAccounts,
    fetchAccountTree,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchLedger,

    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    postTransaction,
    cancelTransaction,

    fetchCostCenters,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,

    clearError,
  };
};