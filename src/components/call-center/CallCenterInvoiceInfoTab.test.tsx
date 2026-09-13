// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { OrderFromApi } from "../../services/orderService";
import { CallCenterInvoiceInfoTab } from "./CallCenterInvoiceInfoTab";

afterEach(cleanup);

const baseProps = {
  currentUser: { name: "موظف الاختبار" },
  branch: { id: 1, name: "فرع رام الله" },
  ticket: null,
  payments: [],
  openedAt: "2026-07-30T09:00:00Z",
};

const order = (changes: Partial<OrderFromApi> = {}) =>
  ({
    id: 27,
    order_number: "CC-27",
    branch_id: 1,
    cashier_id: 5,
    order_type: "delivery",
    status: "pending_payment",
    table_number: null,
    customer_name: "عميل",
    customer_phone: "0599001122",
    note: null,
    subtotal: 20,
    discount_value: 0,
    discount_type: "amount",
    discount_amount: 0,
    total: 20,
    payment_method: null,
    reference_number: null,
    paid_at: null,
    items: [],
    tickets: [],
    created_at: "2026-07-30T09:00:00Z",
    updated_at: "2026-07-30T10:00:00Z",
    ...changes,
  }) as OrderFromApi;

describe("CallCenterInvoiceInfoTab states", () => {
  it("shows a pre-save manual draft without closing details", () => {
    render(<CallCenterInvoiceInfoTab {...baseProps} order={null} />);
    expect(screen.getByText("مسودة")).toBeTruthy();
    expect(screen.getByText("فاتورة يدوية")).toBeTruthy();
    expect(screen.queryByText("إغلاق الفاتورة")).toBeNull();
  });

  it("shows a saved order as awaiting payment", () => {
    render(<CallCenterInvoiceInfoTab {...baseProps} order={order()} />);
    expect(screen.getByText("بانتظار الدفع")).toBeTruthy();
    expect(screen.getByText("CC-27")).toBeTruthy();
    expect(screen.queryByText("إغلاق الفاتورة")).toBeNull();
  });

  it("never treats paid status as kitchen-dispatch evidence", () => {
    render(
      <CallCenterInvoiceInfoTab
        {...baseProps}
        order={order({
          status: "paid",
          paid_at: null,
          payments: [
            {
              id: 1,
              invoice_id: 2,
              amount: 20,
              payment_method: "cash",
              created_at: "2026-07-30T10:00:00Z",
            },
          ],
        })}
        closedSuccessfully
      />,
    );
    expect(screen.getByText("إغلاق الفاتورة")).toBeTruthy();
    expect(screen.getAllByText("غير متوفر").length).toBeGreaterThan(1);
    expect(screen.getByText("حالة الإرسال غير مؤكدة")).toBeTruthy();
    expect(screen.queryByText("تم الإرسال للمطبخ")).toBeNull();
    expect(screen.getByText("نقدي: 20.00 ₪")).toBeTruthy();
  });

  it("shows kitchen dispatch only with explicit production evidence", () => {
    render(
      <CallCenterInvoiceInfoTab
        {...baseProps}
        order={order({
          status: "paid",
          paid_at: "2026-07-30T10:15:00Z",
          has_unsent_items: false,
          tickets: [
            {
              id: 9,
              order_id: 27,
              ticket_number: "KT-9",
              status: "pending",
              notes: null,
              started_at: null,
              completed_at: null,
              created_at: "2026-07-30T10:15:01Z",
            },
          ],
        })}
        closedSuccessfully
      />,
    );
    expect(screen.getByText("تم الإرسال للمطبخ")).toBeTruthy();
    expect(screen.queryByText("حالة الإرسال غير مؤكدة")).toBeNull();
  });
});
