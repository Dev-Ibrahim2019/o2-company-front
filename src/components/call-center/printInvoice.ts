import type { OrderFromApi } from "../../services/orderService";
import { getOrderReference, formatShekel, PAYMENT_STATUS_LABELS } from "./activeOrdersView";

// طباعة الفاتورة — دالة واحدة مشتركة يستدعيها كل من زر "طباعة" داخل InvoicePreviewDrawer
// واختصار لوحة المفاتيح (F9/F12) بصفحة تفاصيل الطلب، بدل ما يكون عندنا نسختين من نفس منطق
// بناء HTML الطباعة. تفتح نافذة معزولة (بدل window.print() على الصفحة الحالية) عشان الطباعة
// تطلع نظيفة بدون كروم التطبيق حواليها — نفس النمط المستخدم أصلاً بـ QuoteFormPage.tsx.

const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
const formatTime = (d: string) => new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

export function printOrderInvoice(order: OrderFromApi): void {
  const invoice = order.invoice;
  const subtotal = order.items?.reduce((sum, i) => sum + (i.unit_price || 0) * i.quantity, 0) ?? order.subtotal;
  const discount = order.discount_amount || order.discount_value || 0;
  const deliveryFee = order.delivery_fee || 0;
  const taxAmount = order.tax_amount || invoice?.tax_total || 0;
  const total = invoice?.total ?? order.total;

  const paymentStatus = order.payment_status;
  const isPaid = paymentStatus === "paid";
  const isPartial = paymentStatus === "pending";
  const paymentLabel = isPaid ? PAYMENT_STATUS_LABELS.paid : isPartial ? PAYMENT_STATUS_LABELS.awaiting_payment : PAYMENT_STATUS_LABELS.unpaid;

  const invoiceNumber = invoice?.number;
  const orderRef = getOrderReference(order.order_number);
  const branch = order.branch;

  const win = window.open("", "_blank", "width=420,height=720");
  if (!win) return;

  const itemsRows = (order.items || []).map((item, idx) => `
    <tr style="background:${idx % 2 === 1 ? "#f8f8f8" : "transparent"}">
      <td style="padding:6px 8px;border:1px solid #e5e5e5;text-align:center">${idx + 1}</td>
      <td style="padding:6px 8px;border:1px solid #e5e5e5">${item.item_name_ar || item.item_name}</td>
      <td style="padding:6px 8px;border:1px solid #e5e5e5;text-align:center">${item.quantity}</td>
      <td style="padding:6px 8px;border:1px solid #e5e5e5;text-align:center">${formatShekel(item.unit_price || 0)}</td>
      <td style="padding:6px 8px;border:1px solid #e5e5e5;text-align:center;font-weight:700">${formatShekel(item.total_price ?? (item.unit_price || 0) * item.quantity)}</td>
    </tr>
  `).join("");

  win.document.write(`
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${invoiceNumber || orderRef}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Tajawal', 'Segoe UI', sans-serif; padding: 20px; color: #18181b; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { padding: 6px 8px; border: 1px solid #e5e5e5; background: #f4f4f5; font-size: 12px; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
        .muted { color: #71717a; }
        .total-row { display: flex; justify-content: space-between; border-top: 2px solid #18181b; padding-top: 8px; margin-top: 8px; font-weight: 800; font-size: 18px; }
        .divider { border-top: 1px dashed #a1a1aa; margin: 14px 0; }
        @media print { body { padding: 8px; } }
      </style>
    </head>
    <body>
      <div style="text-align:center;margin-bottom:12px">
        <h2 style="margin:0;font-size:20px">RestoMaster</h2>
        ${branch?.name ? `<div class="muted">${branch.name}</div>` : ""}
        ${branch?.phone || branch?.address ? `<div class="muted" style="font-size:11px">${[branch?.phone, branch?.address].filter(Boolean).join(" · ")}</div>` : ""}
      </div>
      <div class="row"><span>رقم الفاتورة</span><strong>${invoiceNumber || "—"}</strong></div>
      <div class="row"><span>رقم الطلب</span><span>${orderRef}</span></div>
      <div class="row"><span>التاريخ والوقت</span><span>${formatDate(order.created_at)} — ${formatTime(order.created_at)}</span></div>
      ${order.customer_name || order.customer_phone ? `<div class="row"><span>العميل</span><span>${order.customer_name || "—"}${order.customer_phone ? ` · ${order.customer_phone}` : ""}</span></div>` : ""}
      <div class="row"><span>حالة الدفع</span><strong>${paymentLabel}</strong></div>
      <div class="divider"></div>
      <table>
        <thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <div class="row"><span>المجموع الفرعي</span><span>${formatShekel(subtotal)}</span></div>
      ${discount > 0 ? `<div class="row"><span>الخصم</span><span>-${formatShekel(discount)}</span></div>` : ""}
      ${deliveryFee > 0 ? `<div class="row"><span>رسوم التوصيل</span><span>${formatShekel(deliveryFee)}</span></div>` : ""}
      ${taxAmount > 0 ? `<div class="row"><span>الضريبة</span><span>${formatShekel(taxAmount)}</span></div>` : ""}
      <div class="total-row"><span>الإجمالي</span><span>${formatShekel(total)}</span></div>
      ${isPartial && invoice ? `
        <div class="row" style="margin-top:8px"><span>المدفوع</span><span>${formatShekel(invoice.paid_amount || 0)}</span></div>
        <div class="row"><span>المتبقي</span><strong>${formatShekel(invoice.remaining_amount || 0)}</strong></div>
      ` : ""}
      ${order.note ? `<div class="divider"></div><div class="muted" style="font-size:12px">ملاحظات: ${order.note}</div>` : ""}
      <div class="divider"></div>
      <div style="text-align:center;font-size:12px" class="muted">شكرًا لتعاملكم معنا</div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 400);
}
