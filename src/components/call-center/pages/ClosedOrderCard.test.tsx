// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClosedOrderCard } from "./ClosedOrdersPage";
import type { ClosedCallCenterOrder } from "../services/callCenterService";

afterEach(cleanup);

const closedOrder = (changes: Partial<ClosedCallCenterOrder> = {}): ClosedCallCenterOrder => ({
  id: 42,
  order_number: "ORD-20260903-0001",
  status: "served",
  order_type: "takeaway",
  customer_id: 1,
  customer_name: "أحمد محمد",
  customer_phone: "0599001122",
  total: 150,
  branch: { id: 1, name: "الفرع الرئيسي" },
  created_at: "2026-09-03T09:00:00Z",
  updated_at: "2026-09-03T09:30:00Z",
  payment_status: "paid",
  ...changes,
});

describe("ClosedOrderCard — طلب مغلق للقراءة فقط دائمًا، بلا استثناء أدوار", () => {
  it("يرى فقط عرض التفاصيل وعرض الفاتورة، ولا يوجد أي زر تعديل/إلغاء/حذف/إضافة صنف", () => {
    render(<ClosedOrderCard order={closedOrder()} onOpen={vi.fn()} onViewInvoice={vi.fn()} />);

    expect(screen.getByText("عرض التفاصيل")).toBeTruthy();
    expect(screen.getByText("عرض الفاتورة")).toBeTruthy();
    expect(screen.queryByText("تعديل")).toBeNull();
    expect(screen.queryByText(/إضافة صنف/)).toBeNull();
    expect(screen.queryByText(/إلغاء الطلب/)).toBeNull();
    expect(screen.queryByText(/حذف/)).toBeNull();
  });

  it("زر عرض الفاتورة يستدعي onViewInvoice، وزر عرض التفاصيل يستدعي onOpen — مستقلان عن بعض", () => {
    const onOpen = vi.fn();
    const onViewInvoice = vi.fn();
    render(<ClosedOrderCard order={closedOrder()} onOpen={onOpen} onViewInvoice={onViewInvoice} />);

    screen.getByText("عرض الفاتورة").click();
    expect(onViewInvoice).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();

    screen.getByText("عرض التفاصيل").click();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("يعرض المرجع القصير (#0001) بدل رقم الطلب الكامل، مع الاحتفاظ بالرقم الكامل بـ title", () => {
    render(<ClosedOrderCard order={closedOrder()} onOpen={vi.fn()} onViewInvoice={vi.fn()} />);
    const ref = screen.getByTitle("ORD-20260903-0001");
    expect(ref.textContent).toBe("#0001");
  });

  it("حالة الدفع (مدفوع) تظهر كـ badge نصي منفصل عن حالة الطلب (تم التقديم)", () => {
    render(<ClosedOrderCard order={closedOrder({ status: "served", payment_status: "paid" })} onOpen={vi.fn()} onViewInvoice={vi.fn()} />);
    expect(screen.getByText("تم التقديم")).toBeTruthy();
    expect(screen.getByText(/مدفوع/)).toBeTruthy();
  });
});
