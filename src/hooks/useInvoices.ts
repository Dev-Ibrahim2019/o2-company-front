import { useState, useCallback, useEffect } from "react";
import { useApp } from "../store";
import { orderService } from "../services/orderService";
import type { InvoiceFromApi } from "../services/orderService";

export const useInvoices = () => {
  const { currentUser } = useApp();
  const [invoices, setInvoices] = useState<InvoiceFromApi[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const branchFilter = (user: unknown) => {
    const u = user as { branch_id?: number | string; branchId?: number | string } | null;
    const raw = u?.branch_id ?? u?.branchId;
    const branchId = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(branchId) ? branchId : undefined;
  };

  const fetchInvoices = useCallback(
    async () => {
      if (!currentUser) {
        setError("User not logged in");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const branchId = branchFilter(currentUser);
        const data = await orderService.getInvoices({ branch_id: branchId });
        setInvoices(data);
      } catch (e) {
        console.error("Failed to fetch invoices:", e);
        setError("فشل تحميل فواتير المبيعات");
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  // Initial fetch and refetch when currentUser changes
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices, currentUser]);

  return { invoices, loading, error, refetch: fetchInvoices };
};