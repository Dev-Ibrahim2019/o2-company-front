// src/hooks/usePrinters.ts
// ──────────────────────────────────────────────────────────────
// Hook لإدارة الطابعات — التوجيه مدمج في الطابعة

import { useState, useEffect, useCallback } from "react";
import { printerService } from "../services/printerService";
import type { Printer, PrinterFormData } from "../../types";

interface UsePrintersReturn {
  printers: Printer[];
  loading: boolean;
  error: string | null;

  addPrinter: (payload: PrinterFormData) => Promise<Printer>;
  updatePrinter: (id: number, payload: Partial<PrinterFormData & { is_active: boolean }>) => Promise<Printer>;
  deletePrinter: (id: number, branchId?: number) => Promise<void>;
  testPrinter: (id: number) => Promise<boolean>;

  refetchAll: (branchId?: number) => Promise<void>;
}

export const usePrinters = (): UsePrintersReturn => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (branchId?: number) => {
    try {
      setLoading(true);
      setError(null);
      const printersData = await printerService.getAll(branchId);
      setPrinters(printersData);
    } catch (err: any) {
      console.error("Error fetching printers:", err);
      setError(err.response?.data?.message || "فشل تحميل بيانات الطابعات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addPrinter = async (payload: PrinterFormData): Promise<Printer> => {
    const newPrinter = await printerService.create(payload);
    setPrinters((prev) => [newPrinter, ...prev]);
    return newPrinter;
  };

  const updatePrinter = async (
    id: number,
    payload: Partial<PrinterFormData & { is_active: boolean }>,
  ): Promise<Printer> => {
    const updated = await printerService.update(id, payload);
    setPrinters((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deletePrinter = async (id: number, branchId?: number): Promise<void> => {
    await printerService.delete(id, branchId);
    setPrinters((prev) => prev.filter((p) => p.id !== id));
  };

  const testPrinter = async (id: number): Promise<boolean> => {
    const result = await printerService.testConnection(id);
    return result.success;
  };

  return {
    printers,
    loading,
    error,
    addPrinter,
    updatePrinter,
    deletePrinter,
    testPrinter,
    refetchAll: fetchAll,
  };
};
