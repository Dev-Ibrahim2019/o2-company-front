import { useCallback, useMemo, useState } from "react";
import type { MenuItem } from "./useMenu";
import {
  callCenterOrderWorkflow,
  type CallCenterOrderPayload,
  type CallCenterPayment,
} from "../services/callCenterOrderWorkflow";

export type { CallCenterPayment as PaymentEntry };
export interface CartItem {
  uniqueId: string;
  itemId: string;
  id: number;
  name: string;
  name_ar: string;
  price: number;
  quantity: number;
  department_id?: number | null;
  notes?: string;
}

export const useCallCenterCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const addToCart = useCallback(
    (item: MenuItem, options?: { quantity?: number; price?: number; notes?: string }) => {
      const quantity = options?.quantity ?? 1;
      const price = options?.price ?? item.price;
      const notes = options?.notes;
      setCart((current) => {
        // Merge by id + price + notes so distinct customizations of the same
        // base item (e.g. different sizes/extras) stay on separate lines,
        // while repeated plain quick-adds still collapse into one line.
        const index = current.findIndex(
          (row) => row.id === item.id && row.price === price && (row.notes || "") === (notes || ""),
        );
        if (index >= 0) {
          return current.map((row, rowIndex) =>
            rowIndex === index
              ? { ...row, quantity: row.quantity + quantity }
              : row,
          );
        }
        const uniqueId = `cc-${item.id}-${crypto.randomUUID()}`;
        return [
          {
            uniqueId,
            itemId: uniqueId,
            id: item.id,
            name: item.name_ar || item.name,
            name_ar: item.name_ar || item.name,
            price,
            quantity,
            department_id: item.department_id,
            notes,
          },
          ...current,
        ];
      });
    },
    [],
  );

  const updateCartItem = useCallback(
    (uniqueId: string, changes: Partial<CartItem>) =>
      setCart((current) =>
        current.map((row) =>
          row.uniqueId === uniqueId ? { ...row, ...changes } : row,
        ),
      ),
    [],
  );
  const removeFromCart = useCallback(
    (uniqueId: string) =>
      setCart((current) => current.filter((row) => row.uniqueId !== uniqueId)),
    [],
  );
  const clearCart = useCallback(() => setCart([]), []);
  const subtotal = useMemo(
    () => cart.reduce((sum, row) => sum + row.price * row.quantity, 0),
    [cart],
  );

  const saveDraft = useCallback(
    async (
      payload: Omit<CallCenterOrderPayload, "items">,
      existingOrderId?: number | null,
    ) => {
      if (cart.length === 0) return null;
      setSubmitting(true);
      setSubmitError(null);
      try {
        return await callCenterOrderWorkflow.saveDraft(
          {
            ...payload,
            items: cart.map((row) => ({
              item_id: row.id,
              quantity: row.quantity,
              unit_price: row.price,
              notes: row.notes,
            })),
          },
          existingOrderId,
        );
      } catch (error: any) {
        setSubmitError(
          error?.response?.data?.message ||
            error?.message ||
            "تعذر حفظ طلب الكول سنتر",
        );
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [cart],
  );

  const checkout = useCallback(
    async (
      orderId: number,
      payments: CallCenterPayment[],
      customer: { id?: number; name?: string; phone?: string },
    ) => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        return await callCenterOrderWorkflow.checkout(
          orderId,
          payments,
          customer,
        );
      } catch (error: any) {
        setSubmitError(
          error?.response?.data?.message ||
            error?.message ||
            "تعذر إتمام الدفع",
        );
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return {
    cart,
    subtotal,
    submitting,
    submitError,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    saveDraft,
    checkout,
  };
};
