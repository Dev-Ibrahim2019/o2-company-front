import React from "react";
import { X, Printer, CreditCard } from "lucide-react";
import { colors, typography, radius, shadows } from "../design/tokens";
import type { OrderFromApi } from "../../../services/orderService";
import { getOrderReference, formatShekel, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "../activeOrdersView";

// معاينة الفاتورة — أقرب لشكل فاتورة برنامج محاسبة حقيقي: هيدر بهوية المطعم + رقم فاتورة
// مستقل، صندوق بيانات عميل + حالة دفع، جدول أصناف بحدود وتناوب ألوان، ملخص مبلغ، وفوتر ملاحظات.
// تُعيد استخدام بيانات order المحمّلة أصلاً بصفحة التفاصيل (order.items، order.invoice) بدل ما
// تجيب بيانات جديدة أو تخترع نظام فاتورة موازي — تعمل حتى قبل إصدار الفاتورة الرسمية (order.invoice
// لسا null)، وتُغتني بالأرقام/الحالة الرسمية لما توجد.

const formatDate = (d: string) => new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
const formatTime = (d: string) => new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

const ORDER_TYPE_MAP: Record<string, string> = { dine_in: "محلي", takeaway: "فوري", delivery: "توصيل" };

export const InvoicePreviewDrawer: React.FC<{
  order: OrderFromApi;
  onClose: () => void;
  onRecordPayment?: () => void;
}> = ({ order, onClose, onRecordPayment }) => {
  const invoice = order.invoice;
  const subtotal = order.items?.reduce((sum, i) => sum + (i.unit_price || 0) * i.quantity, 0) ?? order.subtotal;
  const discount = order.discount_amount || order.discount_value || 0;
  const deliveryFee = order.delivery_fee || 0;
  const taxAmount = order.tax_amount || invoice?.tax_total || 0;
  const total = invoice?.total ?? order.total;
  const hasLineTax = (order.items || []).some(i => (i.tax_amount || 0) > 0);

  const paymentStatus = order.payment_status;
  const isPaid = paymentStatus === "paid";
  const isPartial = paymentStatus === "pending";
  const paymentLabel = isPaid ? PAYMENT_STATUS_LABELS.paid : isPartial ? PAYMENT_STATUS_LABELS.awaiting_payment : PAYMENT_STATUS_LABELS.unpaid;
  const paymentColor = isPaid ? colors.semantic.success : isPartial ? colors.semantic.warning : colors.neutral[500];

  const lastPayment = invoice?.payments?.[invoice.payments.length - 1];
  const paidMethodLabel = isPaid
    ? PAYMENT_METHOD_LABELS[invoice?.payment_method || ""] || invoice?.payment_method
    : lastPayment
      ? PAYMENT_METHOD_LABELS[lastPayment.method || lastPayment.payment_method || ""] || lastPayment.method
      : null;

  const invoiceNumber = invoice?.number;
  const orderRef = getOrderReference(order.order_number);
  const branch = order.branch;

  const printInvoice = () => {
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
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{
          width: "100%", maxWidth: 560, maxHeight: "90vh",
          background: colors.neutral[0], borderRadius: radius.xl,
          boxShadow: shadows["2xl"], overflow: "hidden", display: "flex", flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${colors.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>معاينة الفاتورة</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isPaid && onRecordPayment && (
              <button onClick={onRecordPayment} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: radius.md,
                background: `color-mix(in srgb, ${colors.brand[500]} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${colors.brand[500]} 20%, transparent)`,
                color: colors.brand[600], fontSize: typography.size.xs, fontWeight: typography.weight.semibold, cursor: "pointer",
              }}>
                <CreditCard size={13} /> تسجيل الدفع
              </button>
            )}
            <button onClick={printInvoice} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: radius.md,
              background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
              color: colors.neutral[600], fontSize: typography.size.xs, fontWeight: typography.weight.semibold, cursor: "pointer",
            }}>
              <Printer size={13} /> طباعة / تحميل
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: colors.neutral[400] }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px", fontFamily: typography.fontFamily.sans }}>
          {/* هيدر الفاتورة: هوية المطعم يسار — رقم الفاتورة/الطلب/التاريخ يمين */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: colors.brand[600] }}>
                {invoiceNumber || "فاتورة غير مُصدرة"}
              </p>
              <p style={{ fontSize: typography.size.xs, color: colors.neutral[500], marginTop: 2 }}>
                طلب {orderRef} <span style={{ color: colors.neutral[400] }}>({order.order_number})</span>
              </p>
              <p style={{ fontSize: "11px", color: colors.neutral[400], marginTop: 2 }}>
                {formatDate(invoice?.details?.date ? invoice.details.date : order.created_at)} — {formatTime(order.created_at)}
              </p>
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>RestoMaster</p>
              {branch?.name && <p style={{ fontSize: typography.size.sm, color: colors.neutral[600] }}>{branch.name}</p>}
              {(branch?.phone || branch?.address) && (
                <p style={{ fontSize: "11px", color: colors.neutral[400] }}>
                  {[branch?.phone, branch?.address].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          {/* صندوق بيانات العميل + حالة الدفع */}
          <div style={{
            border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, padding: 14, marginBottom: 16,
            background: colors.neutral[50],
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.neutral[500] }}>بيانات العميل</span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: radius.full,
                background: `color-mix(in srgb, ${paymentColor} 14%, transparent)`, color: paymentColor,
                fontSize: "11px", fontWeight: typography.weight.bold,
              }}>
                ● {paymentLabel}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: typography.size.sm }}>
              <div><span style={{ color: colors.neutral[400] }}>الاسم: </span><span style={{ color: colors.neutral[800], fontWeight: typography.weight.semibold }}>{order.customer_name || "—"}</span></div>
              <div><span style={{ color: colors.neutral[400] }}>الهاتف: </span><span style={{ color: colors.neutral[800], fontFamily: typography.fontFamily.mono }}>{order.customer_phone || "—"}</span></div>
              <div><span style={{ color: colors.neutral[400] }}>نوع الطلب: </span><span style={{ color: colors.neutral[800] }}>{ORDER_TYPE_MAP[order.order_type] || order.order_type}</span></div>
              <div><span style={{ color: colors.neutral[400] }}>الفرع: </span><span style={{ color: colors.neutral[800] }}>{branch?.name || "—"}</span></div>
            </div>
          </div>

          {/* جدول الأصناف */}
          <div style={{ borderRadius: radius.lg, overflow: "hidden", border: `1px solid ${colors.border.subtle}`, marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.size.sm }}>
              <thead>
                <tr style={{ background: colors.neutral[100] }}>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold, width: 32 }}>#</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold }}>الصنف</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold }}>الكمية</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold }}>سعر الوحدة</th>
                  {hasLineTax && <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold }}>الضريبة</th>}
                  <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 1 ? colors.neutral[50] : "transparent", borderTop: `1px solid ${colors.border.subtle}` }}>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: colors.neutral[400], fontSize: "11px" }}>{idx + 1}</td>
                    <td style={{ padding: "8px 10px", color: colors.neutral[800], fontWeight: typography.weight.semibold }}>
                      {item.item_name_ar || item.item_name}
                      {item.notes && <div style={{ fontSize: "11px", color: colors.neutral[400], fontWeight: typography.weight.normal }}>📝 {item.notes}</div>}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: colors.neutral[600] }}>{item.quantity}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: colors.neutral[600] }}>{formatShekel(item.unit_price || 0)}</td>
                    {hasLineTax && <td style={{ padding: "8px 10px", textAlign: "center", color: colors.neutral[600] }}>{item.tax_amount ? formatShekel(item.tax_amount) : "—"}</td>}
                    <td style={{ padding: "8px 10px", textAlign: "center", color: colors.neutral[900], fontWeight: typography.weight.bold }}>
                      {formatShekel(item.total_price ?? (item.unit_price || 0) * item.quantity)}
                    </td>
                  </tr>
                ))}
                {(!order.items || order.items.length === 0) && (
                  <tr><td colSpan={hasLineTax ? 6 : 5} style={{ textAlign: "center", color: colors.neutral[400], padding: 24, fontSize: typography.size.sm }}>لا توجد أصناف</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ملخص المبلغ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
              <span style={{ color: colors.neutral[500] }}>المجموع الفرعي</span>
              <span style={{ color: colors.neutral[800] }}>{formatShekel(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
                <span style={{ color: colors.semantic.error }}>الخصم</span>
                <span style={{ color: colors.semantic.error }}>-{formatShekel(discount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
                <span style={{ color: colors.neutral[500] }}>رسوم التوصيل</span>
                <span style={{ color: colors.neutral[800] }}>{formatShekel(deliveryFee)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.sm }}>
                <span style={{ color: colors.neutral[500] }}>الضريبة</span>
                <span style={{ color: colors.neutral[800] }}>{formatShekel(taxAmount)}</span>
              </div>
            )}
            <div style={{ borderTop: `2px solid ${colors.neutral[900]}`, paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>الإجمالي</span>
              <span style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.brand[600] }}>{formatShekel(total)}</span>
            </div>
            {(isPartial || isPaid) && invoice && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, padding: "10px 12px", borderRadius: radius.lg, background: colors.neutral[50] }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.xs }}>
                  <span style={{ color: colors.neutral[500] }}>المبلغ المدفوع {paidMethodLabel ? `(${paidMethodLabel})` : ""}</span>
                  <span style={{ fontWeight: typography.weight.semibold, color: colors.semantic.success }}>{formatShekel(invoice.paid_amount || 0)}</span>
                </div>
                {isPartial && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: typography.size.xs }}>
                    <span style={{ color: colors.neutral[500] }}>المتبقي</span>
                    <span style={{ fontWeight: typography.weight.bold, color: colors.semantic.warning }}>{formatShekel(invoice.remaining_amount || 0)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* فوتر: ملاحظات الطلب + شكر/سياسة */}
          <div style={{ borderTop: `1px dashed ${colors.border.default}`, marginTop: 20, paddingTop: 14 }}>
            {order.note && (
              <p style={{ fontSize: typography.size.xs, color: colors.neutral[500], marginBottom: 8 }}>
                <strong style={{ color: colors.neutral[700] }}>ملاحظات: </strong>{order.note}
              </p>
            )}
            <p style={{ fontSize: "11px", color: colors.neutral[400], textAlign: "center" }}>
              شكرًا لتعاملكم معنا — البضاعة المباعة تُسترجع خلال 24 ساعة بموجب هذه الفاتورة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewDrawer;
