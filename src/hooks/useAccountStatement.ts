// src/hooks/useAccountStatement.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { financeService } from "../services/financeService";
import type { StatementEntry, StatementFilters, StatementType } from "../services/financeService";

type EntityType = "employee" | "customer" | "supplier";

interface UseAccountStatementResult {
  lines: StatementEntry[];
  closingBalance: number;
  openingBalance: number;
  outstandingAdvance?: number;
  accruedSalary?: number;
  netPayable?: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function extractEmployeeLines(data: any): {
  lines: StatementEntry[];
  closingBalance: number;
  openingBalance: number;
} {
  if (Array.isArray(data?.all_lines)) {
    return {
      lines: data.all_lines,
      closingBalance: data.totals?.closing_balance ?? 0,
      openingBalance: data.totals?.opening_balance ?? 0,
    };
  }

  const accounts = data?.accounts ?? {};
  const advanceLines: StatementEntry[] = accounts.advance?.lines ?? [];
  const salaryLines: StatementEntry[] = accounts.salary?.lines ?? [];
  const loanLines: StatementEntry[] = accounts.loan?.lines ?? [];
  const salesLines: StatementEntry[] = accounts.sales?.lines ?? [];

  const combined = [...advanceLines, ...salaryLines, ...loanLines, ...salesLines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const closingBalance =
    (accounts.advance?.closing_balance ?? 0) +
    (accounts.salary?.closing_balance ?? 0) +
    (accounts.loan?.closing_balance ?? 0) +
    (accounts.sales?.closing_balance ?? 0);

  return { lines: combined, closingBalance, openingBalance: 0 };
}

export const useAccountStatement = (
  entityType: EntityType,
  entityId: number | null,
  from: string,
  to: string,
  employeeStatementType: StatementType = "all",
  extraFilters: Omit<StatementFilters, "from" | "to" | "type"> = {},
): UseAccountStatementResult => {
  const [lines, setLines] = useState<StatementEntry[]>([]);
  const [closingBalance, setClosingBalance] = useState<number>(0);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [outstandingAdvance, setOutstandingAdvance] = useState<number | undefined>();
  const [accruedSalary, setAccruedSalary] = useState<number | undefined>();
  const [netPayable, setNetPayable] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStatement = useCallback(async () => {
    if (!entityId) {
      setLines([]);
      setClosingBalance(0);
      setOpeningBalance(0);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (entityType === "employee") {
        response = await financeService.getEmployeeStatement(entityId, {
          from,
          to,
          type: employeeStatementType,
          mode: "simple",
          ...extraFilters,
        });
      } else if (entityType === "customer") {
        response = await financeService.getCustomerStatement(entityId, from, to);
      } else {
        response = await financeService.getSupplierStatement(entityId, from, to);
      }

      if (controller.signal.aborted) return;

      if (!response.success) {
        setError(response.message || "فشل جلب كشف الحساب");
        return;
      }

      const data = response.data;

      if (entityType === "employee") {
        const extracted = extractEmployeeLines(data);
        setLines(extracted.lines);
        setClosingBalance(extracted.closingBalance);
        setOpeningBalance(extracted.openingBalance);
        setOutstandingAdvance(data.outstanding_advance);
        setAccruedSalary(data.accrued_salary);
        setNetPayable(data.net_payable);
      } else {
        const stmt = data?.statement ?? data;
        setLines(stmt?.lines ?? []);
        setClosingBalance(stmt?.closing_balance ?? 0);
        setOpeningBalance(stmt?.opening_balance ?? 0);
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      const msg = err.response?.data?.message || err.message || "حدث خطأ غير متوقع";
      setError(msg);
      setLines([]);
      setClosingBalance(0);
      setOpeningBalance(0);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [entityType, entityId, from, to, employeeStatementType]);

  useEffect(() => {
    fetchStatement();
    return () => abortRef.current?.abort();
  }, [fetchStatement]);

  return {
    lines,
    closingBalance,
    openingBalance,
    outstandingAdvance,
    accruedSalary,
    netPayable,
    isLoading,
    error,
    refetch: fetchStatement,
  };
};
