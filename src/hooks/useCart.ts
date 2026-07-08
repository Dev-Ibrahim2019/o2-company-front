// src/hooks/useCart.ts
//
// يدير حالة السلة:
// - addToCart: يزيد الكمية إذا الصنف موجود بدل صف جديد
// - submitOrder: يرسل الطلب للـ API ويتبع التدفق الكامل من إنشاء الطلب إلى القيد المحاسبي

import { useState, useCallback } from "react";
import api from "../api/axios";
import {
  orderService,
  type OrderFromApi,
  type PaymentMethod,
} from "../services/orderService";
import type { MenuItem } from "./useMenu";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  uniqueId: string; // item_id كـ string (للتوافق مع CartPanel)
  itemId: string; // نفس uniqueId
  id: number; // الرقم الحقيقي للصنف
  name: string;
  name_ar: string;
  price: number; // السعر الحالي (من pivot)
  original_price?: number; // السعر الأصلي قبل الخصم
  discount_amount?: number; // قيمة الخصم
  discount_percent?: number; // نسبة الخصم
  discount_id?: number; // معرف الخصم المطبق
  final_price?: number; // السعر النهائي بعد الخصم
  quantity: number;
  notes?: string;
  department_id: number;
}

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface SubmitOrderPayload {
  branch_id: number;
  cashier_id?: number;
  order_type: "dine_in" | "takeaway";
  table_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: number;
  employee_id?: number;
  supplier_id?: number;
  note?: string;
  discount_value?: number;
  discount_type?: "amount" | "percent";
  payment_method?: PaymentMethod;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const MONEY_EPSILON = 0.01;

const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

const normalizePaymentEntries = (entries: PaymentEntry[]): PaymentEntry[] =>
  entries
    .map((payment) => ({
      ...payment,
      amount: roundMoney(payment.amount),
      reference: payment.reference?.trim() || undefined,
    }))
    .filter((payment) => payment.amount > 0);

const normalizeTableNumber = (value: string | number | null | undefined) =>
  String(value ?? "").trim();

type ApiErrorLike = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const getApiError = (error: unknown) => error as ApiErrorLike;

const getApiErrorMessage = (error: unknown, fallback = "") => {
  const apiError = getApiError(error);
  return String(
    apiError.response?.data?.message ?? apiError.message ?? fallback,
  );
};

const isCloseUpdateStateError = (error: unknown) => {
  const apiError = getApiError(error);
  const status = apiError.response?.status;
  const message = getApiErrorMessage(error).toLowerCase();

  return (
    status === 409 ||
    message.includes("already") ||
    message.includes("confirmed") ||
    message.includes("confirmation") ||
    message.includes("تأكيد") ||
    message.includes("مؤكد")
  );
};

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── addToCart ─────────────────────────────────────────────────────────────
  // اذا الصنف موجود بالسلة → تزيد الكمية بدل صف جديد
  const addToCart = useCallback(
    (item: MenuItem, opts?: { quantity?: number; price?: number }) => {
      const qty = opts?.quantity ?? 1;
      const price = opts?.price ?? item.price;

      setCart((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === item.id);
        if (existingIdx >= 0) {
          // الصنف موجود — زيد الكمية
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + qty,
          };
          return updated;
        }
        // صنف جديد — أضف صف جديد
        const uniqueId = String(item.id) + '-' + Math.random().toString(36).substr(2, 9);
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
            notes: undefined,
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

  const loadCart = useCallback((items: CartItem[]) => {
    setCart(items);
  }, []);

  // ── clearCart ─────────────────────────────────────────────────────────────
  const clearCart = useCallback(() => setCart([]), []);

  // ── submitOrder ───────────────────────────────────────────────────────────
  // يرسل الطلب للـ API — يتبع التدفق الكامل من إنشاء الطلب إلى القيد المحاسبي
  // Phase 1: إنشاء الطلب (pending)
  // Phase 2: إرسال للمطبخ (confirm → production tickets)
  // Phase 3: الأقسام تحضّر (preparing → ready)
  // Phase 4: التسليم والدفع (serve → create invoice → pay)
  // ترحيل المبيعات يتم لاحقا من شاشة الطلبات المغلقة
  const submitOrder = useCallback(
    async (
      payload: SubmitOrderPayload,
      shouldConfirm = false, // true = أرسل للمطبخ فوراً بعد الحفظ
      paymentEntries: PaymentEntry[] = [],
      createInvoice = false,
      existingOrderId?: number | null,
    ) => {
      if (cart.length === 0) return null;

      setSubmitting(true);
      setSubmitError(null);

      try {
        const requestedTableNumber = normalizeTableNumber(payload.table_number);
        if (payload.order_type === "dine_in" && !requestedTableNumber) {
          throw new Error("رقم الطاولة مطلوب لحفظ طلب محلي");
        }

        if (existingOrderId && requestedTableNumber) {
          const existingOrder = await orderService.getOne(existingOrderId);
          const existingTableNumber = normalizeTableNumber(
            existingOrder.table_number,
          );

          if (
            existingTableNumber &&
            existingTableNumber !== requestedTableNumber
          ) {
            throw new Error("لا يمكن تعديل طلب طاولة مختلفة من السلة الحالية");
          }
        }
        // ═══════════════════════════════════════════════════
        // PHASE 1: إنشاء الطلب
        // ═══════════════════════════════════════════════════
        const orderPayload = {
          ...payload,
          items: cart.map((c) => ({
            item_id: c.id,
            quantity: c.quantity,
            unit_price: c.price,
            notes: c.notes ?? undefined,
          })),
        };

        let order: OrderFromApi;
        if (existingOrderId) {
          if (createInvoice) {
            order = await orderService.getOne(existingOrderId);
          } else {
            try {
              order = await orderService.update(existingOrderId, orderPayload);
            } catch (error) {
              if (!isCloseUpdateStateError(error)) {
                throw error;
              }
              order = await orderService.getOne(existingOrderId);
            }
          }
        } else {
          order = (await api.post("/orders", orderPayload)).data
            .data as OrderFromApi;
        }

        const savedTableNumber = normalizeTableNumber(order.table_number);
        if (
          payload.order_type === "dine_in" &&
          savedTableNumber !== requestedTableNumber
        ) {
          throw new Error("استجابة الطلب لا تطابق الطاولة النشطة");
        }

        setLastOrderId(order.id);

        // ═══════════════════════════════════════════════════
        // PHASE 2: إرسال للمطبخ (اختياري)
        // ═══════════════════════════════════════════════════
        // نأكد الطلب إذا كان pending سواء أردنا confirm أو createInvoice
        // لأن الباكند يتطلب tickets موجودة قبل إنشاء الفاتورة
        if ((shouldConfirm || createInvoice) && order.status === "pending") {
          try {
            order = await orderService.confirm(order.id);
          } catch (error) {
            if (!isCloseUpdateStateError(error)) {
              throw error;
            }
            order = await orderService.getOne(order.id);
          }
        }

        // ═══════════════════════════════════════════════════
        // PHASE 3: الأقسام تحضّر (handled b  y backend/KDS)
        // ═══════════════════════════════════════════════════
        // Kitchen updates production tickets: preparing → ready
        // When all items ready → order status = ready

        // ═══════════════════════════════════════════════════
        // PHASE 4: التسليم والدفع
        // ═══════════════════════════════════════════════════
        if (createInvoice && order.id) {
          try {
            order = await orderService.syncPricing(order.id, {
              customer_id: payload.customer_id,
              employee_id: payload.employee_id,
              supplier_id: payload.supplier_id,
              discount_value: payload.discount_value,
              discount_type: payload.discount_type,
              customer_name: payload.customer_name,
              customer_phone: payload.customer_phone,
              note: payload.note,
            });
          } catch {
            // confirmed orders may still proceed — invoice creation recalculates totals
          }
        }

        const orderTotal = roundMoney(Number(order.total ?? 0));
        const normalizedPayments = normalizePaymentEntries(paymentEntries);
        const paymentsToRecord: PaymentEntry[] =
          normalizedPayments.length > 0
            ? normalizedPayments
            : createInvoice && orderTotal > 0 && payload.payment_method
              ? [{ method: payload.payment_method, amount: orderTotal }]
              : [];

        if (createInvoice || paymentsToRecord.length > 0) {
          const paidTotal = roundMoney(
            paymentsToRecord.reduce((sum, payment) => sum + payment.amount, 0),
          );
          const paymentDiff = roundMoney(orderTotal - paidTotal);

          if (orderTotal > 0 && paymentsToRecord.length === 0) {
            throw new Error("يرجى تحديد طريقة الدفع قبل إغلاق الفاتورة");
          }

          if (
            !createInvoice &&
            orderTotal > 0 &&
            Math.abs(paymentDiff) > MONEY_EPSILON
          ) {
            throw new Error(
              paymentDiff > 0
                ? `المبلغ المدفوع ناقص ${paymentDiff.toFixed(2)} ₪`
                : `المبلغ المدفوع زائد ${Math.abs(paymentDiff).toFixed(2)} ₪`,
            );
          }

          order = await orderService.closeOrderWithPayments(order.id, {
            customer_name: payload.customer_name,
            customer_phone: payload.customer_phone,
            customer_id: payload.customer_id,
            employee_id: payload.employee_id,
            supplier_id: payload.supplier_id,
            note: payload.note,
            payments: paymentsToRecord.map((payment) => ({
              method: payment.method,
              payment_method: payment.method,
              amount: payment.amount,
              reference_number: payment.reference,
              // المحافظة على entity data إذا كانت موجودة
              entity_type: (payment as any).entity_type,
              entity_id: (payment as any).entity_id,
              subledger_type: (payment as any).subledger_type,
              subledger_id: (payment as any).subledger_id,
            })),
          });
        }

        let finalOrder = order;
        try {
          const { data: refreshedOrder } = await api.get(`/orders/${order.id}`);
          finalOrder = refreshedOrder.data ?? order;
        } catch {
          finalOrder = order;
        }

        clearCart();
        return finalOrder;
      } catch (e) {
        const msg = getApiErrorMessage(e, "فشل إرسال الطلب");
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
    loadCart,
    clearCart,
    submitOrder,
    submitting,
    submitError,
    lastOrderId,
  };
};
