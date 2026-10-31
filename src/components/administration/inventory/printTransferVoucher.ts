import { fmtNum, type StockDocument } from "../../../services/inventoryService";

// طباعة سند الصرف (A5 عمودي، ويُطبع على A4 كذلك) في نافذة معزولة — نفس نمط printInvoice.ts،
// فتخرج الطباعة بلا واجهة التطبيق حولها. التكاليف تظهر فقط لمن يراها (costs_visible) وبعد الترحيل.

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });

const STATUS: Record<StockDocument["status"], string> = { draft: "مسودة", posted: "مرحّل", reversed: "معكوس" };

export function printTransferVoucher(doc: StockDocument): void {
  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) return;

  const showCosts = doc.costs_visible && doc.status !== "draft";
  const lines = doc.lines ?? [];
  const rows = lines
    .map((l, i) => {
      const qty = Number(l.quantity);
      const value = l.posted_cost !== null ? Number(l.posted_cost) : null;
      // تكلفة الوحدة المختارة = قيمة السطر المرحّلة ÷ الكمية
      const unitCost = value !== null && qty > 0 ? value / qty : null;
      return `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${esc(l.stock_item?.name)} <span class="muted ltr">${esc(l.stock_item?.code)}</span>
          ${l.batch ? `<div class="muted ltr">دفعة ${esc(l.batch.code)}</div>` : ""}</td>
        <td class="c">${esc(l.unit?.name)}</td>
        <td class="c num">${esc(fmtNum(qty))}</td>
        ${showCosts ? `<td class="c num">${unitCost !== null ? esc(fmtNum(unitCost, 4)) : "—"}</td><td class="c num">${value !== null ? esc(fmtNum(value, 2)) : "—"}</td>` : ""}
      </tr>`;
    })
    .join("");

  win.document.write(`
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${esc(doc.number)}</title>
      <style>
        @page { size: A5 portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Tajawal', 'Segoe UI', sans-serif; color: #18181b; font-size: 12px; margin: 0; padding: 16px; }
        h1 { font-size: 18px; margin: 0; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #18181b; padding-bottom: 8px; margin-bottom: 10px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 10px; }
        .meta div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dotted #d4d4d8; padding: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { border: 1px solid #d4d4d8; padding: 5px 6px; }
        th { background: #f4f4f5; font-size: 11px; }
        .c { text-align: center; }
        .num { font-variant-numeric: tabular-nums; direction: ltr; }
        .ltr { direction: ltr; unicode-bidi: isolate; }
        .muted { color: #71717a; font-size: 10px; }
        .total { display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; border-top: 2px solid #18181b; padding-top: 6px; }
        .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; }
        .sign { border-top: 1px solid #18181b; padding-top: 6px; text-align: center; min-height: 48px; }
        .stamp { display: inline-block; border: 1px solid #18181b; border-radius: 4px; padding: 1px 8px; font-weight: 700; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="head">
        <div>
          <h1>سند صرف مخزني</h1>
          <div class="muted">صرف للأقسام / تحويل</div>
        </div>
        <div style="text-align:left">
          <div class="ltr" style="font-weight:800;font-size:15px">${esc(doc.number)}</div>
          <span class="stamp">${STATUS[doc.status]}</span>
        </div>
      </div>
      <div class="meta">
        <div><span>التاريخ</span><strong class="ltr">${esc(doc.document_date)}</strong></div>
        <div><span>أنشأه</span><strong>${esc(doc.creator?.name ?? "—")}</strong></div>
        ${doc.reference_no ? `<div><span>رقم المرجع</span><strong class="ltr">${esc(doc.reference_no)}</strong></div>` : ""}
        <div><span>من مخزن</span><strong>${esc(doc.warehouse?.name)}</strong></div>
        <div><span>إلى مخزن</span><strong>${esc(doc.to_warehouse?.name)}</strong></div>
        ${doc.destination ? `<div><span>الجهة</span><strong>${esc(doc.destination)}</strong></div>` : ""}
      </div>
      <table>
        <thead><tr><th>#</th><th>الصنف</th><th>الوحدة</th><th>الكمية</th>${showCosts ? "<th>التكلفة</th><th>الإجمالي (₪)</th>" : ""}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">
        <span>عدد الأصناف: ${lines.length}</span>
        ${showCosts ? `<span>الإجمالي: <span class="num">${esc(fmtNum(doc.total_cost, 2))}</span> ₪</span>` : ""}
      </div>
      ${doc.notes ? `<p class="muted" style="font-size:11px">ملاحظات: ${esc(doc.notes)}</p>` : ""}
      <div class="signs">
        <div class="sign">أمين المخزن المُسلِّم<div class="muted">${esc(doc.poster?.name ?? "")}</div></div>
        <div class="sign">المستلِم
          ${doc.received_at ? `<div class="muted">${esc(doc.receiver?.name ?? "")} · <span class="ltr">${esc(fmtDateTime(doc.received_at))}</span></div>` : ""}
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 400);
}
