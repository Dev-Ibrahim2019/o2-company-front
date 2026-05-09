// src/hooks/useCart.ts
//
// يدير حالة السلة:
// - addToCart: يزيد الكمية إذا الصنف موجود بدل صف جديد
// - submitOrder: يرسل الطلب للـ API

import { useState, useCallback } from "react";
import api from "../api/axios";
import type { MenuItem } from "./useMenu";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  uniqueId: string; // item_id كـ string (للتوافق مع CartPanel)
  itemId: string; // نفس uniqueId
  id: number; // الرقم الحقيقي للصنف
  name: string;
  name_ar: string;
  price: number; // السعر الحالي (من pivot)
  quantity: number;
  notes?: string;
  department_id: number;
}

export interface SubmitOrderPayload {
  branch_id: number;
  cashier_id?: number;
  order_type: "dine_in" | "takeaway";
  table_number?: string;
  customer_name?: string;
  customer_phone?: string;
  note?: string;
  discount_value?: number;
  discount_type?: "amount" | "percent";
  payment_method?: "cash" | "credit_card" | "wallet";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── addToCart ─────────────────────────────────────────────────────────────
  // ✅ الإصلاح: نتحقق إذا الصنف موجود → نزيد الكمية بدل صف جديد
  const addToCart = useCallback(
    (item: MenuItem, opts?: { quantity?: number; price?: number }) => {
      const qty = opts?.quantity ?? 1;
      const price = opts?.price ?? item.price;

      setCart((prev) => {
        const existing = prev.find((c) => c.id === item.id);

        if (existing) {
          // الصنف موجود → زيادة الكمية فقط
          return prev.map((c) =>
            c.id === item.id ? { ...c, quantity: c.quantity + qty } : c,
          );
        }

        // صنف جديد → أضف صف
        const uniqueId = String(item.id);
        return [
          ...prev,
          {
            uniqueId,
            itemId: uniqueId,
            id: item.id,
            name: item.name_ar || item.name,
            name_ar: item.name_ar || item.name,
            price,
            quantity: qty,
            department_id: item.department_id,
          },
        ];
      });
    },
    [],
  );

  // ── updateCartItem ────────────────────────────────────────────────────────
  const updateCartItem = useCallback(
    (uniqueId: string, changes: Partial<CartItem>) => {
      setCart((prev) =>
        prev.map((c) => (c.uniqueId === uniqueId ? { ...c, ...changes } : c)),
      );
    },
    [],
  );

  // ── removeFromCart ────────────────────────────────────────────────────────
  const removeFromCart = useCallback((uniqueId: string) => {
    setCart((prev) => prev.filter((c) => c.uniqueId !== uniqueId));
  }, []);

  // ── clearCart ─────────────────────────────────────────────────────────────
  const clearCart = useCallback(() => setCart([]), []);

  // ── submitOrder ───────────────────────────────────────────────────────────
  // يرسل الطلب للـ API — حفظ pending أو تأكيد confirmed
  const submitOrder = useCallback(
    async (
      payload: SubmitOrderPayload,
      shouldConfirm = false, // true = أرسل للمطبخ فوراً بعد الحفظ
    ) => {
      if (cart.length === 0) return null;

      setSubmitting(true);
      setSubmitError(null);

      try {
        // 1. أنشئ الطلب
        const { data: createRes } = await api.post("/orders", {
          ...payload,
          items: cart.map((c) => ({
            item_id: c.id,
            quantity: c.quantity,
            unit_price: c.price,
            notes: c.notes ?? null,
          })),
        });

        const order = createRes.data;
        setLastOrderId(order.id);

        // 2. إذا مطلوب تأكيد → أرسل للمطبخ
        if (shouldConfirm) {
          await api.post(`/orders/${order.id}/confirm`);
        }

        clearCart();
        return order;
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? "فشل إرسال الطلب";
        setSubmitError(msg);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [cart, clearCart],
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  return {
    cart,
    subtotal,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    submitOrder,
    submitting,
    submitError,
    lastOrderId,
  };
};
