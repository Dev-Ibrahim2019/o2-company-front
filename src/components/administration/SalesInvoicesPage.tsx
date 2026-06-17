import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  Landmark,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useApp } from "../../../store";
import { orderService } from "../../services/orderService";
import { InvoiceEditModal } from "./InvoiceEditModal";
import { InvoiceDetailsModal } from "./InvoiceDetailsModal";
import type {
  InvoiceFromApi,
  InvoicePaymentPayload,
  InvoicePaymentResponse,
  OrderFromApi,
  PaymentMethod,
} from "../../services/orderService";

type PaymentStatusFilter =
  | "all"
  | "closed"
  | "partial"
  | "unpaid"
  | "cancelled";
type PaymentMethodFilter = "all" | PaymentMethod;
type SalesInvoiceSource = "invoice" | "order";

type SalesInvoiceRow = {
  id: number;
  invoiceNumber: string;
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  paidCash: number;
  paidCard: number;
  paidWallet: number;
  paidBank: number;
  paidOther: number;
  paidTotal: number;
  remaining: number;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  payments: InvoicePaymentResponse[];
  primaryPaymentMethod?: PaymentMethod;
  source: SalesInvoiceSource;
};

type InvoiceFilters = {
  search: string;
  from: string;
  to: string;
  paymentStatus: PaymentStatusFilter;
  paymentMethod: PaymentMethodFilter;
  minTotal: string;
  maxTotal: string;
};

const emptyFilters: InvoiceFilters = {
  search: "",
  from: "",
  to: "",
  paymentStatus: "all",
  paymentMethod: "all",
  minTotal: "",
  maxTotal: "",
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: "كاش",
  credit_card: "بطاقة",
  wallet: "محفظة",
  bank_transfer: "بنك",
};

const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} ₪`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-SA");
};

const normalizePaymentMethod = (
  value?: string | null,
): PaymentMethod | "other" | undefined => {
  const method = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!method) return undefined;
  if (method === "cash") return "cash";
  if (
    ["credit_card", "card", "credit", "visa", "mastercard"].includes(method)
  ) {
    return "credit_card";
  }
  if (method === "wallet") return "wallet";
  if (["bank_transfer", "bank", "transfer", "qr", "online"].includes(method)) {
    return "bank_transfer";
  }
  return "other";
};

const isPaidLikeStatus = (status?: string | null) => {
  const normalized = String(status ?? "").toLowerCase();
  return ["paid", "closed", "settled", "completed"].some((item) =>
    normalized.includes(item),
  );
};

const isCancelledLikeStatus = (status?: string | null) => {
  const normalized = String(status ?? "").toLowerCase();
  return ["cancelled", "canceled", "void", "refunded"].some((item) =>
    normalized.includes(item),
  );
};

const branchFilter = (currentUser: unknown) => {
  const user = currentUser as {
    branch_id?: number | string;
    branchId?: number | string;
  } | null;
  const raw = user?.branch_id ?? user?.branchId;
  if (raw === null || raw === undefined || raw === 0 || raw === "0")
    return undefined;
  const branchId = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(branchId) ? branchId : undefined;
};

const normalizePayments = (
  payments: InvoicePaymentResponse[] | undefined,
): InvoicePaymentResponse[] =>
  (payments ?? []).map((payment) => {
    const method = normalizePaymentMethod(
      payment.payment_method ?? payment.method,
    );
    return {
      ...payment,
      payment_method:
        method && method !== "other" ? method : payment.payment_method,
      method: method && method !== "other" ? method : payment.method,
    };
  });

const inferredPayment = (
  id: number,
  amount: number,
  method: PaymentMethod,
  createdAt?: string | null,
): InvoicePaymentResponse => ({
  id: -id,
  invoice_id: id,
  amount,
  payment_method: method,
  method,
  created_at: createdAt ?? new Date().toISOString(),
});

const summarizePayments = (
  payments: InvoicePaymentResponse[],
  total: number,
  status?: string | null,
  paidAt?: string | null,
  fallbackMethod?: PaymentMethod | null,
  fallbackId = 0,
) => {
  const shouldInferPaid =
    payments.length === 0 &&
    total > 0 &&
    fallbackMethod &&
    (isPaidLikeStatus(status) || Boolean(paidAt));
  const effectivePayments = shouldInferPaid
    ? [inferredPayment(fallbackId, total, fallbackMethod, paidAt)]
    : payments;

  const totals = effectivePayments.reduce(
    (acc, payment) => {
      const method = normalizePaymentMethod(
        payment.payment_method ?? payment.method,
      );
      const amount = Number(payment.amount || 0);
      if (method === "cash") acc.cash += amount;
      else if (method === "credit_card") acc.card += amount;
      else if (method === "wallet") acc.wallet += amount;
      else if (method === "bank_transfer") acc.bank += amount;
      else acc.other += amount;
      acc.total += amount;
      return acc;
    },
    { cash: 0, card: 0, wallet: 0, bank: 0, other: 0, total: 0 },
  );

  const primaryPaymentMethod =
    (normalizePaymentMethod(
      effectivePayments[0]?.payment_method ?? effectivePayments[0]?.method,
    ) as PaymentMethod | undefined) ??
    fallbackMethod ??
    undefined;

  return {
    payments: effectivePayments,
    paidCash: totals.cash,
    paidCard: totals.card,
    paidWallet: totals.wallet,
    paidBank: totals.bank,
    paidOther: totals.other,
    paidTotal: totals.total,
    remaining: Math.max(0, Number((total - totals.total).toFixed(2))),
    primaryPaymentMethod,
  };
};

const invoiceToRow = (invoice: InvoiceFromApi): SalesInvoiceRow => {
  const total = Number(invoice.total || 0);
  const fallbackMethod = normalizePaymentMethod(invoice.order?.payment_method);
  const paymentSummary = summarizePayments(
    normalizePayments(invoice.payments),
    total,
    invoice.status,
    invoice.paid_at ?? invoice.order?.paid_at,
    fallbackMethod && fallbackMethod !== "other" ? fallbackMethod : null,
    invoice.id,
  );

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number ?? `INV-${invoice.id}`,
    orderId: invoice.order_id,
    orderNumber: invoice.order?.order_number ?? String(invoice.order_id),
    customerName: invoice.order?.customer_name || "عميل نقدي",
    customerPhone: invoice.order?.customer_phone || "---",
    total,
    status: invoice.status,
    createdAt: invoice.created_at,
    paidAt: invoice.paid_at ?? invoice.order?.paid_at,
    source: "invoice",
    ...paymentSummary,
  };
};

const orderToRow = (order: OrderFromApi): SalesInvoiceRow => {
  const total = Number(order.total || 0);
  const fallbackMethod = normalizePaymentMethod(order.payment_method);
  const paymentSummary = summarizePayments(
    normalizePayments(order.payments),
    total,
    order.status,
    order.paid_at,
    fallbackMethod && fallbackMethod !== "other" ? fallbackMethod : null,
    order.id,
  );

  return {
    id: order.id,
    invoiceNumber: `ORD-${order.order_number}`,
    orderId: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name || "عميل نقدي",
    customerPhone: order.customer_phone || "---",
    total,
    status: order.status,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    source: "order",
    ...paymentSummary,
  };
};

const rowPaymentStatus = (row: SalesInvoiceRow): PaymentStatusFilter => {
  if (isCancelledLikeStatus(row.status)) return "cancelled";
  if (row.remaining <= 0.01 || isPaidLikeStatus(row.status) || row.paidAt)
    return "closed";
  if (row.paidTotal > 0) return "partial";
  return "unpaid";
};

const statusMeta = (row: SalesInvoiceRow) => {
  const status = rowPaymentStatus(row);
  if (status === "closed") {
    return {
      label: "مغلقة",
      className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      icon: CheckCircle2,
    };
  }
  if (status === "partial") {
    return {
      label: "مدفوعة جزئيا",
      className: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      icon: AlertCircle,
    };
  }
  if (status === "cancelled") {
    return {
      label: "ملغاة",
      className: "text-red-400 bg-red-500/10 border-red-500/20",
      icon: XCircle,
    };
  }
  return {
    label: "غير مدفوعة",
    className: "text-slate-300 bg-slate-500/10 border-slate-500/20",
    icon: FileText,
  };
};

const paymentIcon = (method?: string | null) => {
  const normalized = normalizePaymentMethod(method);
  if (normalized === "credit_card") return <CreditCard size={13} />;
  if (normalized === "wallet") return <Wallet size={13} />;
  if (normalized === "bank_transfer") return <Landmark size={13} />;
  return <Banknote size={13} />;
};

const paymentLabel = (method?: string | null) => {
  const normalized = normalizePaymentMethod(method);
  if (normalized && normalized !== "other") return methodLabels[normalized];
  return "غير محدد";
};

const toInputNumber = (value: string) => {
  if (value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const rowMatchesMethod = (
  row: SalesInvoiceRow,
  method: PaymentMethodFilter,
) => {
  if (method === "all") return true;
  if (method === "cash") return row.paidCash > 0;
  if (method === "credit_card") return row.paidCard > 0;
  if (method === "wallet") return row.paidWallet > 0;
  return row.paidBank > 0;
};

const getRowDateKey = (row: SalesInvoiceRow) => {
  const date = new Date(row.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const escapeCsv = (value: string | number) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const exportRowsToCsv = (rows: SalesInvoiceRow[]) => {
  const headers = [
    "invoice_number",
    "order_number",
    "customer",
    "phone",
    "status",
    "total",
    "paid_cash",
    "paid_card",
    "paid_wallet",
    "paid_bank",
    "remaining",
    "date",
  ];
  const body = rows.map((row) => [
    row.invoiceNumber,
    row.orderNumber,
    row.customerName,
    row.customerPhone,
    statusMeta(row).label,
    row.total,
    row.paidCash,
    row.paidCard,
    row.paidWallet,
    row.paidBank,
    row.remaining,
    row.createdAt,
  ]);
  const csv = [headers, ...body]
    .map((line) => line.map(escapeCsv).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sales-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof FileText;
  color: string;
}) => (
  <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-4 min-h-28">
    <Icon size={17} className={color} />
    <p className="mt-3 text-[10px] font-black text-slate-500 uppercase">
      {label}
    </p>
    <p className={`mt-1 text-lg font-black font-mono ${color}`}>{value}</p>
  </div>
);

const PaymentProcessModal = ({
  row,
  saving,
  onClose,
  onSubmit,
}: {
  row: SalesInvoiceRow;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: InvoicePaymentPayload) => Promise<void>;
}) => {
  const [method, setMethod] = useState<PaymentMethod>(
    row.primaryPaymentMethod ?? "cash",
  );
  const [amount, setAmount] = useState(String(row.remaining || row.total));
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("أدخل مبلغ صحيح للمعالجة");
      return;
    }

    setError(null);
    await onSubmit({
      payment_method: method,
      method,
      amount: value,
      reference_number: reference.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white">معالجة الفاتورة</h3>
            <p className="text-[11px] text-slate-500 font-bold">
              {row.invoiceNumber} - المتبقي {formatMoney(row.remaining)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-black text-slate-500">
                طريقة الدفع
              </span>
              <select
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as PaymentMethod)
                }
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
              >
                <option value="cash">كاش</option>
                <option value="credit_card">بطاقة</option>
                <option value="wallet">محفظة</option>
                <option value="bank_transfer">بنك</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black text-slate-500">
                المبلغ
              </span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-[10px] font-black text-slate-500">
              رقم مرجعي
            </span>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="اختياري، مهم للبطاقة والمحفظة والبنك"
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
            />
          </label>
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-black hover:bg-slate-700"
          >
            إلغاء
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            حفظ المعالجة
          </button>
        </div>
      </div>
    </div>
  );
};


export default function SalesInvoicesPage() {
  const { currentUser } = useApp();
  const [rows, setRows] = useState<SalesInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<SalesInvoiceSource>("invoice");
  const [filters, setFilters] = useState<InvoiceFilters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceFromApi | null>(
    null,
  );
  const [processingRow, setProcessingRow] = useState<SalesInvoiceRow | null>(
    null,
  );
  const [detailsRow, setDetailsRow] = useState<SalesInvoiceRow | null>(null);
  const [postedInvoiceIds, setPostedInvoiceIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    const branchId = branchFilter(currentUser);
    console.log(
      "Fetching invoices with branchId:",
      branchId,
      "currentUser:",
      currentUser,
    );
    setLoading(true);
    setError(null);

    try {
      // First try without branch filter to see if any invoices exist
      let invoices = await orderService.getInvoices({});
      let invoiceList = Array.isArray(invoices)
        ? invoices
        : (invoices as any)?.data || [];

      if (invoiceList.length === 0 && branchId !== undefined) {
        // If none and we have a branchId, try with branch filter
        invoices = await orderService.getInvoices({ branch_id: branchId });
        invoiceList = Array.isArray(invoices)
          ? invoices
          : (invoices as any)?.data || [];
      }
      setRows(
        invoiceList
          .map(invoiceToRow)
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      );
      setSource("invoice");
    } catch (e) {
      console.error("Failed to fetch invoices:", e);
      setError("فشل تحميل فواتير المبيعات");
      setRows([]);
      setSource("invoice");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const minTotal = toInputNumber(filters.minTotal);
    const maxTotal = toInputNumber(filters.maxTotal);

    return rows.filter((row) => {
      const rowDate = getRowDateKey(row);
      const matchesSearch =
        !q ||
        row.invoiceNumber.toLowerCase().includes(q) ||
        row.orderNumber.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q) ||
        row.customerPhone.toLowerCase().includes(q) ||
        row.payments.some((payment) =>
          String(payment.reference_number ?? "")
            .toLowerCase()
            .includes(q),
        );
      const matchesFrom = !filters.from || rowDate >= filters.from;
      const matchesTo = !filters.to || rowDate <= filters.to;
      const matchesStatus =
        filters.paymentStatus === "all" ||
        rowPaymentStatus(row) === filters.paymentStatus;
      const matchesMethod = rowMatchesMethod(row, filters.paymentMethod);
      const matchesMin = minTotal === undefined || row.total >= minTotal;
      const matchesMax = maxTotal === undefined || row.total <= maxTotal;

      return (
        matchesSearch &&
        matchesFrom &&
        matchesTo &&
        matchesStatus &&
        matchesMethod &&
        matchesMin &&
        matchesMax
      );
    });
  }, [filters, rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const stats = useMemo(
    () => ({
      count: filtered.length,
      total: filtered.reduce((sum, row) => sum + row.total, 0),
      paid: filtered.reduce((sum, row) => sum + row.paidTotal, 0),
      remaining: filtered.reduce((sum, row) => sum + row.remaining, 0),
      cash: filtered.reduce((sum, row) => sum + row.paidCash, 0),
      card: filtered.reduce((sum, row) => sum + row.paidCard, 0),
      wallet: filtered.reduce((sum, row) => sum + row.paidWallet, 0),
      bank: filtered.reduce((sum, row) => sum + row.paidBank, 0),
      closed: filtered.filter((row) => rowPaymentStatus(row) === "closed")
        .length,
    }),
    [filtered],
  );

  const ensureInvoiceForRow = async (row: SalesInvoiceRow) => {
    if (row.source === "invoice") return row.id;

    const existing = await orderService.getInvoiceForOrder(row.orderId);
    if (existing) return existing.id;

    const created = await orderService.createInvoiceFromOrder(row.orderId, {
      customer_name:
        row.customerName === "عميل نقدي" ? undefined : row.customerName,
      customer_phone:
        row.customerPhone === "---" ? undefined : row.customerPhone,
    });
    return created.id;
  };

  const fetchInvoiceForEdit = async (row: SalesInvoiceRow) => {
    const branchId = branchFilter(currentUser);
    const invoices = await orderService.getInvoices({
      branch_id: branchId,
      order_id: row.orderId,
    });
    const found =
      invoices.find((invoice) => invoice.id === row.id) ?? invoices[0];
    if (found) return found;

    if (row.source === "order") {
      return orderService.createInvoiceFromOrder(row.orderId, {
        customer_name:
          row.customerName === "عميل نقدي" ? undefined : row.customerName,
        customer_phone:
          row.customerPhone === "---" ? undefined : row.customerPhone,
      });
    }

    return null;
  };

  const handleEditInvoice = async (row: SalesInvoiceRow) => {
    setSavingAction(true);
    setError(null);
    try {
      const invoice = await fetchInvoiceForEdit(row);
      if (invoice) setEditingInvoice(invoice);
      else setError("لم يتم العثور على الفاتورة للتعديل");
    } catch {
      setError("فشل تحميل الفاتورة للتعديل");
    } finally {
      setSavingAction(false);
    }
  };

  const handleProcessPayment = async (
    row: SalesInvoiceRow,
    payload: InvoicePaymentPayload,
  ) => {
    setSavingAction(true);
    setError(null);
    try {
      const amount = Number(payload.amount || 0);
      const method = normalizePaymentMethod(
        payload.method ?? payload.payment_method,
      );
      if (!method || method === "other")
        throw new Error("طريقة الدفع غير مدعومة");

      if (row.remaining > 0 && amount >= row.remaining - 0.01) {
        await orderService.closeOrderWithPayments(row.orderId, {
          customer_name:
            row.customerName === "عميل نقدي" ? undefined : row.customerName,
          customer_phone:
            row.customerPhone === "---" ? undefined : row.customerPhone,
          payments: [
            {
              ...payload,
              method,
              payment_method: method,
              amount,
            },
          ],
        });
      } else {
        const invoiceId = await ensureInvoiceForRow(row);
        await orderService.addPaymentToInvoice(invoiceId, {
          ...payload,
          method,
          payment_method: method,
          amount,
        });
      }

      setProcessingRow(null);
      await load();
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (e as { message?: string })?.message ??
        "فشل معالجة الفاتورة";
      setError(message);
    } finally {
      setSavingAction(false);
    }
  };

  const handlePostJournal = async (row: SalesInvoiceRow) => {
    if (row.paidTotal <= 0) {
      setError("لا يمكن ترحيل قيد لفاتورة غير مدفوعة");
      return;
    }

    setSavingAction(true);
    setError(null);
    try {
      const invoiceId = await ensureInvoiceForRow(row);
      const method = row.primaryPaymentMethod ?? "cash";
      await orderService.createJournalEntryFromInvoice(
        invoiceId,
        row.orderId,
        row.paidTotal,
        method,
        `ترحيل مبيعات فاتورة ${row.invoiceNumber}`,
      );
      setPostedInvoiceIds((prev) => [...new Set([...prev, invoiceId])]);
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (e as { message?: string })?.message ??
        "فشل ترحيل القيد المحاسبي";
      setError(message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleVoid = async (row: SalesInvoiceRow) => {
    const reason = window.prompt(
      `سبب إلغاء / عكس الفاتورة ${row.invoiceNumber}`,
    );
    if (!reason?.trim()) return;

    setSavingAction(true);
    setError(null);
    try {
      await orderService.void(row.orderId, reason.trim());
      await load();
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (e as { message?: string })?.message ??
        "فشل إلغاء الفاتورة";
      setError(message);
    } finally {
      setSavingAction(false);
    }
  };

  const statCards = [
    {
      label: "عدد الفواتير",
      value: stats.count.toLocaleString(),
      icon: FileText,
      color: "text-slate-200",
    },
    {
      label: "إجمالي المبيعات",
      value: formatMoney(stats.total),
      icon: Banknote,
      color: "text-emerald-400",
    },
    {
      label: "المحصّل",
      value: formatMoney(stats.paid),
      icon: CheckCircle2,
      color: "text-blue-400",
    },
    {
      label: "المتبقي",
      value: formatMoney(stats.remaining),
      icon: AlertCircle,
      color: "text-amber-400",
    },
    {
      label: "محفظة / بنك",
      value: formatMoney(stats.wallet + stats.bank),
      icon: Landmark,
      color: "text-cyan-400",
    },
    {
      label: "مغلقة",
      value: stats.closed.toLocaleString(),
      icon: Archive,
      color: "text-slate-300",
    },
  ];

  return (
    <div
      className="h-full overflow-y-auto custom-scrollbar space-y-5 p-1"
      dir="rtl"
    >
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">فواتير المبيعات</h2>
          <p className="text-[11px] text-slate-500 font-bold">
            {source === "invoice"
              ? "متابعة الفواتير والتحصيل والترحيل المحاسبي"
              : "عرض بديل من الطلبات لحين تفعيل endpoint الفواتير"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="رقم الفاتورة، الطلب، العميل، الجوال أو المرجع..."
              className="w-80 max-w-full bg-slate-900 border border-white/5 rounded-xl py-2.5 pr-9 pl-4 text-xs text-white outline-none focus:border-red-500/50"
            />
          </div>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`px-3 py-2.5 border rounded-xl text-xs font-black flex items-center gap-2 ${
              showFilters
                ? "bg-red-600 border-red-600 text-white"
                : "bg-slate-900 border-white/5 text-slate-300 hover:text-white"
            }`}
          >
            <SlidersHorizontal size={15} />
            فلاتر
          </button>
          <button
            onClick={() => exportRowsToCsv(filtered)}
            className="px-3 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-slate-300 hover:text-white text-xs font-black flex items-center gap-2"
          >
            <Download size={15} />
            تصدير
          </button>
          <button
            onClick={load}
            className="p-2.5 bg-slate-900 border border-white/5 rounded-xl text-slate-400 hover:text-white"
            title="تحديث"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-300">
          <AlertCircle size={15} />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-amber-200 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-right text-xs">
            <thead className="bg-slate-950/40 text-slate-500 font-black">
              <tr>
                <th className="p-4">الفاتورة</th>
                <th className="p-4">العميل</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">المدفوعات</th>
                <th className="p-4 text-center">الإجمالي</th>
                <th className="p-4 text-center">كاش</th>
                <th className="p-4 text-center">بطاقة</th>
                <th className="p-4 text-center">محفظة</th>
                <th className="p-4 text-center">بنك</th>
                <th className="p-4 text-center">المتبقي</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4 text-center">عمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={12}
                    className="p-16 text-center text-slate-500 font-black"
                  >
                    <Loader2
                      size={20}
                      className="inline-block animate-spin text-red-500 ml-2"
                    />
                    جاري تحميل الفواتير...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="p-16 text-center text-slate-500 font-bold"
                  >
                    لا توجد فواتير مطابقة للفلاتر الحالية
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const meta = statusMeta(row);
                  const StatusIcon = meta.icon;
                  const posted = postedInvoiceIds.includes(row.id);
                  return (
                    <tr
                      key={`${row.source}-${row.id}`}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="p-4">
                        <p className="font-black text-white">
                          {row.invoiceNumber}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          طلب #{row.orderNumber}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-white">
                          {row.customerName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {row.customerPhone}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black ${meta.className}`}
                        >
                          <StatusIcon size={12} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {row.payments.length === 0 ? (
                            <span className="text-[10px] text-slate-500 font-bold">
                              لا توجد دفعات
                            </span>
                          ) : (
                            row.payments.slice(0, 3).map((payment, index) => (
                              <span
                                key={`${payment.payment_method}-${payment.id}-${index}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-slate-950 px-2 py-1 text-[10px] font-black text-slate-300"
                              >
                                {paymentIcon(
                                  payment.payment_method ?? payment.method,
                                )}
                                {paymentLabel(
                                  payment.payment_method ?? payment.method,
                                )}
                                <span className="text-emerald-400">
                                  {formatMoney(payment.amount)}
                                </span>
                              </span>
                            ))
                          )}
                          {row.payments.length > 3 && (
                            <span className="rounded-lg border border-white/5 bg-slate-950 px-2 py-1 text-[10px] font-black text-slate-400">
                              +{row.payments.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center font-black text-white">
                        {formatMoney(row.total)}
                      </td>
                      <td className="p-4 text-center font-black text-emerald-400">
                        {formatMoney(row.paidCash)}
                      </td>
                      <td className="p-4 text-center font-black text-blue-400">
                        {formatMoney(row.paidCard)}
                      </td>
                      <td className="p-4 text-center font-black text-cyan-400">
                        {formatMoney(row.paidWallet)}
                      </td>
                      <td className="p-4 text-center font-black text-amber-400">
                        {formatMoney(row.paidBank)}
                      </td>
                      <td className="p-4 text-center font-black text-orange-400">
                        {formatMoney(row.remaining)}
                      </td>
                      <td className="p-4 text-slate-400">
                        {formatDateTime(row.paidAt ?? row.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setDetailsRow(row)}
                            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                            title="عرض التفاصيل"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleEditInvoice(row)}
                            disabled={
                              savingAction ||
                              rowPaymentStatus(row) === "cancelled"
                            }
                            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-40"
                            title="تعديل الفاتورة"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => setProcessingRow(row)}
                            disabled={
                              savingAction ||
                              row.remaining <= 0.01 ||
                              rowPaymentStatus(row) === "cancelled"
                            }
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white disabled:opacity-40"
                            title="معالجة / تسديد"
                          >
                            <ReceiptText size={15} />
                          </button>
                          <button
                            onClick={() => handlePostJournal(row)}
                            disabled={
                              savingAction ||
                              posted ||
                              row.paidTotal <= 0 ||
                              rowPaymentStatus(row) === "cancelled"
                            }
                            className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-600 hover:text-white disabled:opacity-40"
                            title={posted ? "تم الترحيل" : "ترحيل قيد"}
                          >
                            <Archive size={15} />
                          </button>
                          <button
                            onClick={() => handleVoid(row)}
                            disabled={
                              savingAction ||
                              rowPaymentStatus(row) === "cancelled"
                            }
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-40"
                            title="إلغاء / عكس"
                          >
                            <XCircle size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-bold">
            عرض {pageRows.length} من {filtered.length} فاتورة
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
              صفوف
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-white outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                title="السابق"
              >
                <ChevronRight size={16} />
              </button>
              <span className="text-[11px] font-black text-slate-300">
                صفحة {page} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={page >= totalPages}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                title="التالي"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {editingInvoice && (
        <InvoiceEditModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={() => {
            setEditingInvoice(null);
            load();
          }}
        />
      )}

      {processingRow && (
        <PaymentProcessModal
          row={processingRow}
          saving={savingAction}
          onClose={() => setProcessingRow(null)}
          onSubmit={(payload) => handleProcessPayment(processingRow, payload)}
        />
      )}

      {detailsRow && (
        <InvoiceDetailsModal
          row={detailsRow}
          onClose={() => setDetailsRow(null)}
        />
      )}
    </div>
  );
}
