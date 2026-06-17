import { useState, useEffect } from "react";

export interface TransactionStats {
  total_lines: number;
  total_debit: number;
  total_credit: number;
  transactions_count: number;
  date: string;
}

interface UseTransactionStatsOptions {
  date?: string;
  enabled?: boolean;
}

export const useTransactionStats = (options?: UseTransactionStatsOptions) => {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options?.enabled === false) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const date = options?.date || new Date().toISOString().split("T")[0];
        const response = await fetch(
          `/api/transactions/stats/daily?date=${date}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }

        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        console.error("Error fetching transaction stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [options?.date, options?.enabled]);

  return { stats, loading, error, refetch: () => {} };
};
