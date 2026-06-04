// src/hooks/useAccountStatement.ts
//
// إصلاحات:
// 1. تعامل صحيح مع بنية استجابة الباك لكل نوع (employee/customer/supplier)
// 2. الموظف يرجع { accounts: { advance: { lines }, salary: { lines } } }
// 3. العميل/المورد يرجع { lines, closing_balance }
// 4. إضافة دعم نوع الكشف للموظف (advance/salary/all)

import { useState, useEffect, useCallback } from "react";
import { financeService } from "../services/financeService";
import type { StatementEntry } from "../services/financeService";

type EntityType = "employee" | "customer" | "supplier";
type EmployeeStatementType = "all" | "advance" | "salary";

interface UseAccountStatementResult {
  lines: StatementEntry[];
  closingBalance: number;
  // بيانات إضافية للموظفين
  outstandingAdvance?: number;
  accruedSalary?: number;
  netPayable?: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── استخراج الأسطر من استجابة الموظف ────────────────────────────────────────
// الباك يرجع: { accounts: { advance: { lines, closing_balance }, salary: { lines, closing_balance } } }
function extractEmployeeLines(
  data: any,
  statementType: EmployeeStatementType,
): { lines: StatementEntry[]; closingBalance: number } {
  const accounts = data?.accounts ?? {};

  if (statementType === "advance" && accounts.advance) {
    return {
      lines: accounts.advance.lines ?? [],
      closingBalance: accounts.advance.closing_balance ?? 0,
    };
  }

  if (statementType === "salary" && accounts.salary) {
    return {
      lines: accounts.salary.lines ?? [],
      closingBalance: accounts.salary.closing_balance ?? 0,
    };
  }

  // all: ندمج الأسطر من كلا الحسابين مرتبة حسب التاريخ
  const advanceLines: StatementEntry[] = accounts.advance?.lines ?? [];
  const salaryLines: StatementEntry[] = accounts.salary?.lines ?? [];

  const combined = [...advanceLines, ...salaryLines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const closingBalance =
    (accounts.advance?.closing_balance ?? 0) +
    (accounts.salary?.closing_balance ?? 0);

  return { lines: combined, closingBalance };
}

export const useAccountStatement = (
  entityType: EntityType,
  entityId: number | null,
  from: string,
  to: string,
  employeeStatementType: EmployeeStatementType = "all",
): UseAccountStatementResult => {
  const [lines, setLines] = useState<StatementEntry[]>([]);
  const [closingBalance, setClosingBalance] = useState<number>(0);
  const [outstandingAdvance, setOutstandingAdvance] = useState<
    number | undefined
  >();
  const [accruedSalary, setAccruedSalary] = useState<number | undefined>();
  const [netPayable, setNetPayable] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = useCallback(
    async (signal: AbortSignal) => {
      if (!entityId) {
        setLines([]);
        setClosingBalance(0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let response;

        if (entityType === "employee") {
          response = await financeService.getEmployeeStatement(
            entityId,
            from,
            to,
            employeeStatementType,
          );
        } else if (entityType === "customer") {
          response = await financeService.getCustomerStatement(
            entityId,
            from,
            to,
          );
        } else {
          response = await financeService.getSupplierStatement(
            entityId,
            from,
            to,
          );
        }

        if (signal.aborted) return;

        if (!response.success) {
          setError(response.message || "فشل جلب كشف الحساب");
          return;
        }

        const data = response.data;

        if (entityType === "employee") {
          // ✅ بنية الموظف مختلفة
          const extracted = extractEmployeeLines(data, employeeStatementType);
          setLines(extracted.lines);
          setClosingBalance(extracted.closingBalance);
          setOutstandingAdvance(data.outstanding_advance);
          setAccruedSalary(data.accrued_salary);
          setNetPayable(data.net_payable);
        } else {
          // ✅ العميل والمورد: الباك يرجع { lines, closing_balance } مباشرة
          setLines(data.lines ?? []);
          setClosingBalance(data.closing_balance ?? 0);
        }
      } catch (err: any) {
        if (signal.aborted) return;
        const msg =
          err.response?.data?.message || err.message || "حدث خطأ غير متوقع";
        setError(msg);
        setLines([]);
        setClosingBalance(0);
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [entityType, entityId, from, to, employeeStatementType],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchStatement(controller.signal);
    return () => controller.abort();
  }, [fetchStatement]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    fetchStatement(controller.signal);
  }, [fetchStatement]);

  return {
    lines,
    closingBalance,
    outstandingAdvance,
    accruedSalary,
    netPayable,
    isLoading,
    error,
    refetch,
  };
};
