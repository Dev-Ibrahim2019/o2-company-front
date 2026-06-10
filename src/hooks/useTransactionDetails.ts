// src/hooks/useTransactionDetails.ts
//
// Hook بسيط لجلب تفاصيل قيد واحد مع entries مرتبة حسب sort_order.
// يُستخدَم داخل ExpandedEntries و TransactionDetailsModal.

import { useEffect, useState } from "react";
import { transactionService } from "../services/accountingService";
import type { Transaction, EntryLine } from "../services/accountingService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionDetails extends Omit<Transaction, "entries"> {
  entries: EntryLine[];
}

interface UseTransactionDetailsResult {
  details: TransactionDetails | null;
  loading: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useTransactionDetails = (
  transactionId: number | null | undefined,
): UseTransactionDetailsResult => {
  const [details, setDetails] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setDetails(null);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const tx = await transactionService.getOne(transactionId);
        if (cancelled) return;

        setDetails({
          ...tx,
          entries: [...(tx.entries ?? [])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
          ),
        });
      } catch (e: any) {
        if (!cancelled)
          setError(
            e?.response?.data?.message ??
              e?.message ??
              "فشل تحميل تفاصيل القيد",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  return { details, loading, error };
};
