// src/hooks/usePrinters.ts
// ──────────────────────────────────────────────────────────────
// Hook لإدارة الطابعات وقواعد التوجيه

import { useState, useEffect, useCallback } from "react";
import { printerService, printRouteService } from "../services/printerService";
import type { Printer, PrintRoute, PrintRouteFormData } from "../../types";

interface UsePrintersReturn {
  printers: Printer[];
  routes: PrintRoute[];
  loading: boolean;
  error: string | null;

  addPrinter: (payload: {
    name: string;
    ip_address: string;
    port?: string;
    type: string;
    branch_id?: number;
  }) => Promise<Printer>;
  deletePrinter: (id: number) => Promise<void>;
  testPrinter: (id: number) => Promise<boolean>;

  addRoute: (payload: PrintRouteFormData) => Promise<PrintRoute>;
  deleteRoute: (id: number) => Promise<void>;

  refetchAll: () => Promise<void>;
}

export const usePrinters = (): UsePrintersReturn => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [routes, setRoutes] = useState<PrintRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [printersData, routesData] = await Promise.all([
        printerService.getAll(),
        printRouteService.getAll(),
      ]);
      setPrinters(printersData);
      setRoutes(routesData);
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

  const addPrinter = async (payload: {
    name: string;
    ip_address: string;
    port?: string;
    type: string;
    branch_id?: number;
  }): Promise<Printer> => {
    const newPrinter = await printerService.create(payload);
    setPrinters((prev) => [newPrinter, ...prev]);
    return newPrinter;
  };

  const deletePrinter = async (id: number): Promise<void> => {
    await printerService.delete(id);
    setPrinters((prev) => prev.filter((p) => p.id !== id));
    // حذف القواعد المرتبطة بالطابعة محلياً
    setRoutes((prev) => prev.filter((r) => r.printer_id !== id));
  };

  const testPrinter = async (id: number): Promise<boolean> => {
    const result = await printerService.testConnection(id);
    return result.success;
  };

  const addRoute = async (payload: PrintRouteFormData): Promise<PrintRoute> => {
    const newRoute = await printRouteService.create(payload);
    setRoutes((prev) => [newRoute, ...prev]);
    return newRoute;
  };

  const deleteRoute = async (id: number): Promise<void> => {
    await printRouteService.delete(id);
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  return {
    printers,
    routes,
    loading,
    error,
    addPrinter,
    deletePrinter,
    testPrinter,
    addRoute,
    deleteRoute,
    refetchAll: fetchAll,
  };
};
