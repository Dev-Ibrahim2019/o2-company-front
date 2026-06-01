import { useState, useEffect, useCallback } from "react";
import { financeService } from "../services/financeService";
import type { AccountStatement, StatementEntry } from "../services/financeService";

type EntityType = "employee" | "customer" | "supplier";

interface UseAccountStatementResult {
  lines: StatementEntry[];
  closingBalance: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAccountStatement = (
  entityType: EntityType,
  entityId: number | null,
  from: string,
  to: string,
): UseAccountStatementResult => {
  const [lines, setLines] = useState<StatementEntry[]>([]);
  const [closingBalance, setClosingBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = useCallback(
    async (abortSignal: AbortSignal) => {
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
          );
        } else if (entityType === "customer") {
          response = await financeService.getCustomerStatement(
            entityId,
            from,
            to,
          );
        } else if (entityType === "supplier") {
          response = await financeService.getSupplierStatement(
            entityId,
            from,
            to,
          );
        } else {
          throw new Error("Invalid entity type");
        }

        if (abortSignal.aborted) return;

        if (response.success) {
          const statement: AccountStatement = response.data;
          setLines(statement.entries);
          setClosingBalance(statement.closing_balance);
        } else {
          setError(response.message || "Failed to fetch statement");
        }
      } catch (err: any) {
        if (abortSignal.aborted) return;
        setError(
          err.response?.data?.message ||
            err.message ||
            "An unexpected error occurred",
        );
        setLines([]);
        setClosingBalance(0);
      } finally {
        if (abortSignal.aborted) return;
        setIsLoading(false);
      }
    },
    [entityType, entityId, from, to],
  );

  useEffect(() => {
    const abortController = new AbortController();
    fetchStatement(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchStatement]);

  const refetch = useCallback(() => {
    const abortController = new AbortController();
    fetchStatement(abortController.signal);
  }, [fetchStatement]);

  return { lines, closingBalance, isLoading, error, refetch };
};
