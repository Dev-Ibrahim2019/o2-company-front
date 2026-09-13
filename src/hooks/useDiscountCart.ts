import { useCallback, useEffect, useRef, useState } from "react";
import {
  discountService,
  type CartDiscountItem,
  type CartDiscountResult,
} from "../services/discountService";
import type { CartItem } from "./useCart";

export interface DiscountContext {
  customer_id?: number;
  employee_id?: number;
  supplier_id?: number;
  department_id?: number;
  branch_id?: number;
}

export interface EngineDiscountState {
  loading: boolean;
  error: string | null;
  engineDiscountTotal: number;
  originalSubtotal: number;
  discountedSubtotal: number;
  items: CartDiscountItem[];
  appliedDiscounts: Array<{
    id: number;
    name: string;
    code: string;
    amount: number;
  }>;
}

const EMPTY_STATE: EngineDiscountState = {
  loading: false,
  error: null,
  engineDiscountTotal: 0,
  originalSubtotal: 0,
  discountedSubtotal: 0,
  items: [],
  appliedDiscounts: [],
};

const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

/**
 * Recalculates rule-based discounts via /discounts/calculate-cart whenever cart or context changes.
 */
export function useDiscountCart(
  cart: CartItem[],
  context: DiscountContext,
  enabled = true,
) {
  const [state, setState] = useState<EngineDiscountState>(EMPTY_STATE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const recalculate = useCallback(async () => {
    if (!enabled || cart.length === 0) {
      setState(EMPTY_STATE);
      return;
    }

    const requestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await discountService.calculateCart({
        items: cart.map((item) => ({
          price: item.price,
          quantity: item.quantity,
          item_id: item.id,
          item_name: item.name,
          department_id: item.department_id,
        })),
        customer_id: context.customer_id,
        employee_id: context.employee_id,
        supplier_id: context.supplier_id,
        department_id: context.department_id,
        branch_id: context.branch_id,
      });

      if (requestId !== requestIdRef.current) return;

      const result: CartDiscountResult = response.data;
      const appliedMap = new Map<
        number,
        { id: number; name: string; code: string; amount: number }
      >();

      for (const line of result.items) {
        if (line.discount?.id) {
          const existing = appliedMap.get(line.discount.id);
          appliedMap.set(line.discount.id, {
            id: line.discount.id,
            name: line.discount.name,
            code: line.discount.code,
            amount: roundMoney(
              (existing?.amount ?? 0) + (line.discount_amount ?? 0),
            ),
          });
        }
      }

      setState({
        loading: false,
        error: null,
        engineDiscountTotal: roundMoney(result.total_discount),
        originalSubtotal: roundMoney(result.total_original),
        discountedSubtotal: roundMoney(result.total_final),
        items: result.items,
        appliedDiscounts: Array.from(appliedMap.values()),
      });
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      const message =
        err instanceof Error ? err.message : "فشل حساب الخصومات التلقائية";
      setState({ ...EMPTY_STATE, error: message });
    }
  }, [cart, context, enabled]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(recalculate, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [recalculate]);

  const enrichCartItem = useCallback(
    (item: CartItem): CartItem => {
      const line = state.items.find((l) => l.item_id === item.id);
      if (!line) return item;

      return {
        ...item,
        original_price: line.original_price,
        discount_amount: line.discount_amount,
        discount_percent: line.discount_percent,
        discount_id: line.discount?.id,
        final_price: line.final_unit_price,
        price: line.final_unit_price,
      };
    },
    [state.items],
  );

  return {
    ...state,
    recalculate,
    enrichCartItem,
  };
}
