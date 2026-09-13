// src/hooks/useOrders.ts
//
// Hook مركزي يُدير حالة الطلبات + CRUD كامل + تأكيد الطلب

import { useState, useEffect, useCallback } from "react";
import { orderService } from "../services/orderService";
import type {
  CreateOrderPayload,
  OrderFromApi,
  OrderStatus,
} from "../services/orderService";

interface UseOrdersReturn {
  orders: OrderFromApi[];
  loading: boolean;
  error: string | null;

  createOrder: (payload: CreateOrderPayload) => Promise<OrderFromApi>;
  updateOrder: (
    id: number,
    payload: Partial<CreateOrderPayload>,
  ) => Promise<OrderFromApi>;
  confirmOrder: (id: number) => Promise<OrderFromApi>;
  cancelOrder: (id: number) => Promise<OrderFromApi>;
  deleteOrder: (id: number) => Promise<void>;
  refetch: (filters?: {
    branch_id?: number;
    status?: OrderStatus;
    date?: string;
  }) => Promise<void>;
}

export const useOrders = (initialFilters?: {
  branch_id?: number;
  status?: OrderStatus;
  date?: string;
}): UseOrdersReturn => {
  const [orders, setOrders] = useState<OrderFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const refetch = useCallback(
    async (filters?: {
      branch_id?: number;
      status?: OrderStatus;
      date?: string;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const data = await orderService.getAll(filters ?? initialFilters);
        setOrders(data);
      } catch {
        setError("فشل تحميل الطلبات");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const createOrder = async (
    payload: CreateOrderPayload,
  ): Promise<OrderFromApi> => {
    const newOrder = await orderService.create(payload);
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrder = async (
    id: number,
    payload: Partial<CreateOrderPayload>,
  ): Promise<OrderFromApi> => {
    const updated = await orderService.update(id, payload);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    return updated;
  };

  /**
   * confirmOrder: يرسل الطلب للأقسام الإنتاجية
   * بعد هذا الاستدعاء تُنشأ تذاكر المطبخ/البار تلقائياً
   */
  const confirmOrder = async (id: number): Promise<OrderFromApi> => {
    const confirmed = await orderService.confirm(id);
    setOrders((prev) =>
      prev.map((o) => (o.id === confirmed.id ? confirmed : o)),
    );
    return confirmed;
  };

  const cancelOrder = async (id: number): Promise<OrderFromApi> => {
    const cancelled = await orderService.cancel(id);
    setOrders((prev) =>
      prev.map((o) => (o.id === cancelled.id ? cancelled : o)),
    );
    return cancelled;
  };

  const deleteOrder = async (id: number): Promise<void> => {
    await orderService.delete(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrder,
    confirmOrder,
    cancelOrder,
    deleteOrder,
    refetch,
  };
};
