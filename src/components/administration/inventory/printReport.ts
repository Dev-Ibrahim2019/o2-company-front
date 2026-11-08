// طباعة كشف/تقرير جدولي (A4) في نافذة معزولة — نفس نمط printTransferVoucher وprintInvoice:
// الطباعة تخرج بلا واجهة التطبيق، ومنها "حفظ كـ PDF" من نافذة الطباعة نفسها.

export interface ReportColumn {
  label: string;
  /** أرقام: محاذاة وأرقام ثابتة العرض. */
  num?: boolean;
}

export interface ReportOptions {
  title: string;
  subtitle?: string;
  /** سطر الفلاتر المستخدمة: [التسمية، القيمة]. */
  filters?: [string, string][];
  columns: ReportColumn[];
  rows: (string | number | null | undefined)[][];
  /** صف الإجماليات في ذيل الجدول (بطول الأعمدة؛ null = خلية فارغة). */
  footRow?: (string | number | null)[];
  /** ملخص تحت الجدول: [التسمية، القيمة]. */
  totals?: [string, string][];
  landscape?: boolean;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function printReport(o: ReportOptions): void {
  const win = window.open("", "_blank", "width=1000,height=900");
  if (!win) return;

  const head = o.columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const cell = (v: unknown, i: number) => `<td class="${o.columns[i]?.num ? "num" : ""}">${v === null || v === undefined || v === "" ? "—" : esc(v)}</td>`;
  const body = o.rows.length
    ? o.rows.map((r) => `<tr>${r.map(cell).join("")}</tr>`).join("")
    : `<tr><td colspan="${o.columns.length}" class="c muted">لا توجد بيانات</td></tr>`;
  const foot = o.footRow ? `<tfoot><tr>${o.footRow.map((v, i) => `<td class="${o.columns[i]?.num ? "num" : ""}">${v === null ? "" : esc(v)}</td>`).join("")}</tr></tfoot>` : "";
  const printedAt = new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });

  win.document.write(`
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${esc(o.title)}</title>
      <style>
        @page { size: A4 ${o.landscape ? "landscape" : "portrait"}; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Cairo', 'Tajawal', 'Segoe UI', sans-serif; color: #18181b; font-size: 11px; margin: 0; padding: 16px; }
        h1 { font-size: 17px; margin: 0; }
        .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #18181b; padding-bottom: 6px; margin-bottom: 8px; }
        .filters { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-bottom: 8px; color: #3f3f46; }
        .filters b { color: #18181b; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #d4d4d8; padding: 4px 5px; text-align: right; }
        th { background: #f4f4f5; font-size: 10px; }
        tfoot td { font-weight: 800; background: #fafafa; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        .num { font-variant-numeric: tabular-nums; direction: ltr; text-align: left; }
        .c { text-align: center; }
        .muted { color: #71717a; }
        .totals { display: flex; flex-wrap: wrap; gap: 4px 24px; margin-top: 8px; font-weight: 800; font-size: 12px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="head">
        <div>
          <h1>${esc(o.title)}</h1>
          ${o.subtitle ? `<div class="muted">${esc(o.subtitle)}</div>` : ""}
        </div>
        <div class="muted">طُبع: <span dir="ltr">${esc(printedAt)}</span></div>
      </div>
      ${o.filters?.length ? `<div class="filters">${o.filters.map(([k, v]) => `<span>${esc(k)}: <b>${esc(v)}</b></span>`).join("")}</div>` : ""}
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>
      ${o.totals?.length ? `<div class="totals">${o.totals.map(([k, v]) => `<span>${esc(k)}: <span class="num">${esc(v)}</span></span>`).join("")}</div>` : ""}
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 400);
}
