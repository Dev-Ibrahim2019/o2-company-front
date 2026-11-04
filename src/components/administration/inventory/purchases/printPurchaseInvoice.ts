import { PAYMENT_MODE_LABELS, PURCHASE_STATUS_LABELS, fmtMoney, type PurchaseBill } from "../../../../services/purchaseInvoiceService";

// طباعة فاتورة المشتريات (A4 عمودي) في نافذة معزولة — نفس نمط printInvoice.ts و printTransferVoucher.ts.

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const num = (v: unknown, digits = 3) => Number(v ?? 0).toLocaleString("en-US", { maximumFractionDigits: digits });

export function printPurchaseInvoice(bill: PurchaseBill): void {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;

  const lines = bill.items ?? [];
  const rows = lines
    .map((l, i) => {
      const isStock = l.line_kind === "stock";
      const batch = isStock ? bill.stock_document?.lines?.find((x) => x.stock_item_id === l.stock_item_id)?.created_batch : null;
      return `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${esc(isStock ? l.stock_item?.name : l.description)} ${isStock ? `<span class="muted ltr">${esc(l.stock_item?.code)}</span>` : '<span class="muted">(مصروف)</span>'}
          ${batch ? `<div class="muted ltr">دفعة ${esc(batch.code)}${l.expiry_date ? ` · ينتهي ${esc(l.expiry_date)}` : ""}</div>` : ""}</td>
        <td class="c">${esc(isStock ? l.unit?.name : "—")}</td>
        <td class="c num">${isStock ? esc(num(l.quantity)) : "1"}</td>
        <td class="c num">${esc(num(l.unit_price, 4))}</td>
        <td class="c num">${Number(l.discount_pct) ? `${esc(num(l.discount_pct, 2))}%` : "—"}</td>
        <td class="c num">${esc(num(l.tax_rate, 2))}%</td>
        <td class="c num">${esc(fmtMoney(l.line_total))}</td>
      </tr>`;
    })
    .join("");

  win.document.write(`
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${esc(bill.bill_number)}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Tajawal', 'Segoe UI', sans-serif; color: #18181b; font-size: 12px; margin: 0; padding: 16px; }
        h1 { font-size: 20px; margin: 0; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #18181b; padding-bottom: 10px; margin-bottom: 12px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 12px; }
        .meta div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dotted #d4d4d8; padding: 3px 0; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { border: 1px solid #d4d4d8; padding: 5px 6px; }
        th { background: #f4f4f5; font-size: 11px; }
        .c { text-align: center; }
        .num { font-variant-numeric: tabular-nums; direction: ltr; }
        .ltr { direction: ltr; unicode-bidi: isolate; }
        .muted { color: #71717a; font-size: 10px; }
        .bottom { display: grid; grid-template-columns: 1fr 260px; gap: 24px; margin-top: 10px; }
        .sum div { display: flex; justify-content: space-between; padding: 3px 0; }
        .sum .total { font-weight: 800; font-size: 15px; border-top: 2px solid #18181b; margin-top: 4px; padding-top: 6px; }
        .sign { margin-top: 48px; width: 260px; border-top: 1px solid #18181b; padding-top: 6px; text-align: center; }
        .stamp { display: inline-block; border: 1px solid #18181b; border-radius: 4px; padding: 1px 8px; font-weight: 700; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="head">
        <div>
          <h1>فاتورة مشتريات</h1>
          <div class="muted">المخزن المستلم: ${esc(bill.warehouse?.name ?? "—")}</div>
        </div>
        <div style="text-align:left">
          <div class="ltr" style="font-weight:800;font-size:16px">${esc(bill.bill_number)}</div>
          <span class="stamp">${esc(PURCHASE_STATUS_LABELS[bill.effective_status] ?? "")}</span>
        </div>
      </div>
      <div class="meta">
        <div><span>المورّد</span><strong>${esc(bill.supplier?.name)}</strong></div>
        <div><span>الرقم الضريبي للمورّد</span><strong class="ltr">${esc(bill.supplier?.tax_number ?? "—")}</strong></div>
        <div><span>رقم فاتورة المورّد</span><strong class="ltr">${esc(bill.supplier_invoice_no ?? "—")}</strong></div>
        <div><span>تاريخ الفاتورة</span><strong class="ltr">${esc(bill.bill_date)}</strong></div>
        <div><span>طريقة الدفع</span><strong>${esc(bill.payment_mode ? PAYMENT_MODE_LABELS[bill.payment_mode] : "—")}</strong></div>
        <div><span>تاريخ الاستحقاق</span><strong class="ltr">${esc(bill.due_date)}</strong></div>
        <div><span>العملة</span><strong>${esc(bill.currency)}${bill.currency !== "ILS" ? ` (سعر الصرف ${esc(num(bill.exchange_rate, 4))})` : ""}</strong></div>
        <div><span>أنشأها</span><strong>${esc(bill.creator?.name ?? "—")}</strong></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>سعر الوحدة</th><th>خصم</th><th>الضريبة</th><th>الإجمالي</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="bottom">
        <div>
          ${bill.notes ? `<p class="muted" style="font-size:11px">ملاحظات: ${esc(bill.notes)}</p>` : ""}
          <div class="sign">المستلِم<div class="muted">${esc(bill.poster?.name ?? "")}</div></div>
        </div>
        <div class="sum">
          <div><span>الصافي قبل الضريبة</span><span class="num">${esc(fmtMoney(bill.subtotal))}</span></div>
          ${Number(bill.discount) ? `<div><span>منه خصم على الفاتورة</span><span class="num">${esc(fmtMoney(bill.discount))}</span></div>` : ""}
          <div><span>الضريبة</span><span class="num">${esc(fmtMoney(bill.tax_total))}</span></div>
          <div class="total"><span>الإجمالي</span><span class="num">${esc(fmtMoney(bill.total))} ${esc(bill.currency)}</span></div>
          <div><span>المدفوع</span><span class="num">${esc(fmtMoney(bill.paid_amount))}</span></div>
          <div><strong>المتبقي</strong><strong class="num">${esc(fmtMoney(bill.remaining))}</strong></div>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 400);
}
