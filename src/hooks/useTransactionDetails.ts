import { useState, useEffect } from "react";

export interface TransactionEntry {
  id: string;
  account: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
  debit: number;
  credit: number;
  description: string;
  cost_center: {
    id: string;
    name: string;
  } | null;
  sort_order: number;
}

export interface TransactionDetails {
  transaction: {
    id: string;
    transaction_number: string;
    date: string;
    description: string;
    status: string;
    type: string;
    reference: string | null;
    branch: {
      id: string;
      name: string;
    };
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  entries: TransactionEntry[];
  totals: {
    debit: number;
    credit: number;
    count: number;
  };
}

interface UseTransactionDetailsOptions {
  transactionId?: string;
  enabled?: boolean;
}

export const useTransactionDetails = (
  options?: UseTransactionDetailsOptions,
) => {
  const [details, setDetails] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options?.transactionId || options?.enabled === false) {
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/transactions/${options.transactionId}/entries`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch details: ${response.statusText}`);
        }

        const data = await response.json();
        setDetails(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        console.error("Error fetching transaction details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [options?.transactionId, options?.enabled]);

  return { details, loading, error };
};
