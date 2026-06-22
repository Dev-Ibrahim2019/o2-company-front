import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Save,
  Trash2,
  X,
  Banknote,
  CreditCard,
  Wallet,
  Landmark,
  Plus,
  CheckCircle2,
  Receipt,
  Calendar,
  User,
  Phone,
  Hash,
  ShoppingCart,
} from "lucide-react";
import { orderService } from "../../services/orderService";
import { fetchItems } from "../../services/itemService";
import { InvoicePaymentsEditor } from "./shared/InvoicePaymentsEditor";
import {
  createPaymentDraft,
  draftsFromPayments,
  formatMoney,
  getPrimaryPaymentMethod,
  paymentDraftsToPayloads,
  roundMoney,
  validatePaymentDrafts,
  type PaymentDraft,
} from "./shared/invoicePayments";
import type {
  DiscountType,
  OrderType,
  PaymentMethod,
  InvoiceFromApi,
  InvoiceItemFromApi,
  InvoicePaymentResponse,
} from "../../services/orderService";

interface InvoiceViewEditModalProps {
  row: any;
  onClose: () => void;
  onSaved?: () => void;
}

interface EditableItem {
  rowId: number;
  item_id: number;
  name: string;
  quantity: string;
  unit_price: string;
  notes: string;
}

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const methodLabels: Record<string, string> = {
  cash: "كاش",
  credit_card: "بطاقة",
  wallet: "محفظة",
  bank_transfer: "بنك",
};

const paymentIcon = (method?: string | null) => {
  const normalized = String(method ?? "").toLowerCase();
  if (["credit_card", "card", "credit", "visa", "mastercard"].includes(normalized))
    return <CreditCard size={14} />;
  if (normalized === "wallet") return <Wallet size={14} />;
  if (["bank_transfer", "bank", "transfer", "qr", "online"].includes(normalized))
    return <Landmark size={14} />;
  return <Banknote size={14} />;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-SA");
};

type InvoiceWithFlatFields = InvoiceFromApi & {
  invoice_items?: InvoiceItemFromApi[];
  customer_name?: string | null;
  customer_phone?: string | null;
  table_number?: string | number | null;
  order_number?: string | number | null;
  order_type?: OrderType | null;
  note?: string | null;
  payment_method?: PaymentMethod | string | null;
  discount_type?: DiscountType | null;
  discount_value?: number | string | null;
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const normalizeOrderType = (value?: string | null): OrderType =>
  value === "takeaway" ? "takeaway" : "dine_in";

const normalizeDiscountType = (value?: string | null): DiscountType =>
  value === "percent" ? "percent" : "amount";

const normalizePaymentMethod = (value?: string | null): PaymentMethod => {
  const method = String(value ?? "").toLowerCase();
  if (["credit_card", "card", "credit", "visa", "mastercard"].includes(method))
    return "credit_card";
  if (method === "wallet") return "wallet";
  if (["bank_transfer", "bank", "transfer", "qr", "online"].includes(method))
    return "bank_transfer";
  return "cash";
};

const invoiceItemToEditable = (item: InvoiceItemFromApi): EditableItem => {
  const source = item as InvoiceItemFromApi & {
    item?: { name?: string; name_ar?: string };
    name?: string;
    unit_price?: number;
    notes?: string | null;
  };

  return {
    rowId: source.id,
    item_id: source.item_id,
    name:
      source.item_name ??
      source.item?.name_ar ??
      source.item?.name ??
      source.name ??
      "",
    quantity: String(source.quantity),
    unit_price: String(source.price ?? source.unit_price ?? 0),
    notes: source.notes ?? "",
  };
};

export const InvoiceViewEditModal = ({
  row,
  onClose,
  onSaved,
}: InvoiceViewEditModalProps) => {
  const [invoice, setInvoice] = useState<InvoiceFromApi | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [discountValue, setDiscountValue] = useState("0");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [payments, setPayments] = useState<InvoicePaymentResponse[]>([]);
  const [paymentDrafts, setPaymentDrafts] = useState<PaymentDraft[]>([
    createPaymentDraft(),
  ]);
  const [loading, setLoading] = useState(true);

  // Load invoice data from API — it returns items (invoice_items) + order
  useEffect(() => {
    const loadInvoice = async () => {
      setLoading(true);
      setInvoice(null);
      setError(null);
      try {
        const inv =
          row.source === "order"
            ? await orderService.getInvoiceForOrder(row.orderId)
            : (await orderService.getInvoice(row.id)) ??
              (row.orderId
                ? await orderService.getInvoiceForOrder(row.orderId)
                : null);

        if (!inv) {
          throw new Error("Invoice not found");
        }

        const invoiceData = inv as InvoiceWithFlatFields;
        setInvoice(inv);
        setPayments(inv.payments ?? []);

        // Initialize from invoice data (items = invoice_items from API)
        setOrderType(
          normalizeOrderType(
            invoiceData.order_type ?? invoiceData.order?.order_type,
          ),
        );
        setTableNumber(
          firstText(
            invoiceData.table_number,
            invoiceData.order?.table_number,
            row.tableNumber,
          ),
        );
        setCustomerName(
          firstText(
            invoiceData.customer_name,
            invoiceData.order?.customer_name,
            row.customerName,
          ),
        );
        setCustomerPhone(
          firstText(
            invoiceData.customer_phone,
            invoiceData.order?.customer_phone,
            row.customerPhone,
          ),
        );
        setNote(firstText(invoiceData.note, invoiceData.order?.note));
        setDiscountType(
          normalizeDiscountType(
            invoiceData.discount_type ?? invoiceData.order?.discount_type,
          ),
        );
        setDiscountValue(
          String(
            invoiceData.discount_value ??
              invoiceData.order?.discount_value ??
              invoiceData.discount_amount ??
              invoiceData.discount ??
              0,
          ),
        );
        const existingPaid = (inv.payments ?? []).reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        );
        const remainingToPay = Math.max(
          0,
          roundMoney(Number(inv.total || 0) - existingPaid),
        );
        setPaymentDrafts(
          remainingToPay > 0
            ? [
                createPaymentDraft(
                  remainingToPay,
                  normalizePaymentMethod(
                    invoiceData.payment_method ?? invoiceData.order?.payment_method,
                  ),
                ),
              ]
            : [],
        );

        // Use invoice_items (inv.items) if available, else fallback to order items
        const invoiceItems: InvoiceItemFromApi[] =
          invoiceData.items ?? invoiceData.invoice_items ?? [];
        const orderItems = inv.order?.items ?? [];

        if (invoiceItems.length > 0) {
          setItems(invoiceItems.map(invoiceItemToEditable));
        } else {
          setItems(
            orderItems.map((item: any) => ({
              rowId: item.id,
              item_id: item.item_id,
              name: item.item_name_ar || item.item_name,
              quantity: String(item.quantity),
              unit_price: String(item.unit_price),
              notes: item.notes ?? "",
            }))
          );
        }
      } catch (e) {
        console.error("Failed to load invoice details:", e);
        setError("فشل تحميل تفاصيل الفاتورة");
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [row]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price),
        0
      ),
    [items]
  );
  const discountAmount =
    discountType === "percent"
      ? (subtotal * toNumber(discountValue)) / 100
      : toNumber(discountValue);
  const total = Math.max(0, subtotal - discountAmount);
  const existingPaymentTotal = useMemo(
    () =>
      roundMoney(
        payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      ),
    [payments],
  );
  const paymentTarget = Math.max(0, roundMoney(total - existingPaymentTotal));

  useEffect(() => {
    setPaymentDrafts((prev) => {
      if (paymentTarget <= 0) return [];
      if (prev.length === 0) return [createPaymentDraft(paymentTarget)];
      if (prev.length !== 1) return prev;
      if (roundMoney(Number(prev[0].amount || 0)) === paymentTarget) return prev;
      return [
        {
          ...prev[0],
          amount: paymentTarget.toFixed(2),
        },
      ];
    });
  }, [paymentTarget]);

  const updateItem = (
    rowId: number,
    changes: Partial<Omit<EditableItem, "rowId" | "item_id" | "name">>
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId ? { ...item, ...changes } : item
      )
    );
  };

  const removeItem = (rowId: number) => {
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  const addItem = async () => {
    const codeInput = document.getElementById(
      "item-code-input"
    ) as HTMLInputElement;
    const code = codeInput?.value.trim();
    if (!code) {
      setLookupError("من فضلك أدخل كود الصنف");
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    try {
      const itemsList = await fetchItems();
      const foundItem = itemsList.find((i) => i.code === code);
      if (!foundItem) {
        setLookupError(`لم يتم العثور على صنف بالكود: ${code}`);
        return;
      }

      const newItem: EditableItem = {
        rowId: Date.now(),
        item_id: foundItem.id,
        name: foundItem.name_ar || foundItem.name,
        quantity: "1",
        unit_price: String(foundItem.price || 0),
        notes: "",
      };
      setItems((prev) => [...prev, newItem]);
      codeInput.value = "";
    } catch (err) {
      console.error("Failed to fetch item by code:", err);
      setLookupError("فشل جلب الصنف. يرجى المحاولة مرة أخرى.");
    } finally {
      setLookupLoading(false);
    }
  };

  const save = async () => {
    if (!invoice) return;
    const cleanItems = items
      .map((item) => ({
        item_id: item.item_id,
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unit_price),
        notes: item.notes.trim() || undefined,
      }))
      .filter((item) => item.quantity > 0 && item.unit_price >= 0);

    if (cleanItems.length === 0) {
      setError("لا يمكن حفظ فاتورة بدون أصناف");
      return;
    }

    if (existingPaymentTotal - total > 0.01) {
      setError("إجمالي الدفعات المسجلة أكبر من إجمالي الفاتورة بعد التعديل");
      return;
    }

    const paymentError = validatePaymentDrafts(paymentDrafts, paymentTarget, {
      allowEmpty: paymentTarget <= 0,
    });
    if (paymentError) {
      setError(paymentError);
      return;
    }

    const existingPaymentDrafts = draftsFromPayments(payments);
    const newPaymentPayloads = paymentDraftsToPayloads(paymentDrafts);

    setSaving(true);
    setError(null);
    try {
      const updatedOrder = await orderService.update(invoice.order_id, {
        branch_id: invoice.branch_id ?? invoice.order?.branch_id,
        order_type: orderType,
        table_number: tableNumber.trim() || undefined,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        note: note.trim() || undefined,
        discount_type: discountType,
        discount_value: toNumber(discountValue),
        payment_method: getPrimaryPaymentMethod([
          ...existingPaymentDrafts,
          ...paymentDrafts,
        ]),
        items: cleanItems,
      });

      let updatedInvoice = await orderService.getInvoiceForOrder(updatedOrder.id);
      const invoiceId = updatedInvoice?.id ?? invoice.id;

      if (newPaymentPayloads.length > 0) {
        await orderService.addPaymentsToInvoice(invoiceId, newPaymentPayloads);
        updatedInvoice = await orderService.getInvoiceForOrder(updatedOrder.id);
      }

      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        setPayments(updatedInvoice.payments ?? []);
        setPaymentDrafts([]);
      } else {
        setInvoice({
          ...invoice,
          subtotal: updatedOrder.subtotal,
          discount_amount: updatedOrder.discount_amount,
          total: updatedOrder.total,
          order: {
            ...invoice.order,
            ...updatedOrder,
          },
        });
      }
      onSaved?.();
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? "فشل تعديل الفاتورة";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl p-8 text-center shadow-2xl border border-white/10">
          <Loader2 size={28} className="mb-4 inline-block animate-spin text-red-500" />
          <p className="text-white font-bold text-lg">جاري تحميل الفاتورة...</p>
          <p className="text-slate-500 text-xs mt-2">يتم جلب البيانات من الخادم</p>
        </div>
      </div>
    );
  }

  const invoiceData = invoice as InvoiceWithFlatFields | null;
  const invNumber = invoice?.number ?? invoice?.invoice_number ?? row.invoiceNumber ?? `INV-${row.id}`;
  const orderNumber = firstText(
    invoiceData?.order?.order_number,
    invoiceData?.order_number,
    row.orderNumber,
  );
  const customer =
    firstText(
      invoiceData?.customer_name,
      invoiceData?.order?.customer_name,
      row.customerName,
    ) || "عميل نقدي";
  const phone =
    firstText(
      invoiceData?.customer_phone,
      invoiceData?.order?.customer_phone,
      row.customerPhone,
    ) || "---";
  const createdAt = invoice?.created_at ?? row.createdAt;
  const paidAt = invoice?.paid_at ?? row.paidAt;
  const invStatus = invoice?.status ?? row.status;
  const invTotal = invoice?.total ?? row.total ?? 0;
  const invPaidTotal = invoice?.paid_amount ?? row.paidTotal ?? 0;
  const invRemaining = invoice?.remaining_amount ?? row.remaining ?? 0;
  const invPayments = payments.length > 0 ? payments : (row.payments ?? []);

  return (
    <div className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Receipt size={20} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                فاتورة #{invNumber}
                {invStatus && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${
                    invStatus === "paid" || invStatus === "closed"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : invStatus === "cancelled" || invStatus === "void"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {invStatus === "paid" || invStatus === "closed" ? "مدفوعة" :
                     invStatus === "cancelled" || invStatus === "void" ? "ملغاة" :
                     invStatus === "partial" ? "جزئية" : "غير مدفوعة"}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                {orderNumber ? (
                  <>مرتبط بالطلب #{orderNumber}</>
                ) : (
                  "فاتورة مستقلة"
                )}
                <span className="mx-2">•</span>
                <span>{formatDateTime(createdAt)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-xs underline">
                مسح
              </button>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
              <p className="text-[9px] font-black text-emerald-400/70 uppercase">الإجمالي</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{formatMoney(invTotal)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <p className="text-[9px] font-black text-blue-400/70 uppercase">المدفوع</p>
              <p className="text-xl font-black text-blue-400 mt-1">{formatMoney(invPaidTotal)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-3">
              <p className="text-[9px] font-black text-orange-400/70 uppercase">المتبقي</p>
              <p className="text-xl font-black text-orange-400 mt-1">{formatMoney(invRemaining)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-3">
              <p className="text-[9px] font-black text-purple-400/70 uppercase">الأصناف</p>
              <p className="text-xl font-black text-purple-400 mt-1">{items.length}</p>
            </div>
          </div>

          {/* Invoice Info Fields */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-red-500 rounded-full"></div>
              <h4 className="text-sm font-black text-white">بيانات الفاتورة</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">النوع</span>
                <select
                  value={orderType}
                  onChange={(event) => setOrderType(event.target.value as OrderType)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                >
                  <option value="dine_in">🍽️ محلي</option>
                  <option value="takeaway">🛵 سفري</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">الطاولة</span>
                <input
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  placeholder="رقم الطاولة"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">العميل</span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="اسم العميل"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">الجوال</span>
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="رقم الجوال"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-black text-slate-500">ملاحظة</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="ملاحظة على الفاتورة..."
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">الخصم</span>
                <input
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
              <div>
                <label className="space-y-1 block">
                  <span className="text-[10px] font-black text-slate-500">نوع الخصم</span>
                  <select
                    value={discountType}
                    onChange={(event) =>
                      setDiscountType(event.target.value as DiscountType)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                  >
                    <option value="amount">₪ مبلغ</option>
                    <option value="percent">% نسبة</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
              <h4 className="text-sm font-black text-white">الأصناف</h4>
              <span className="text-[10px] text-slate-500 font-bold">({items.length} صنف)</span>
            </div>
            <div className="border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[720px]">
                  <thead className="bg-slate-950/60 text-slate-500 text-[10px] font-black">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">الصنف</th>
                      <th className="p-3 w-28">الكمية</th>
                      <th className="p-3 w-32">سعر الوحدة</th>
                      <th className="p-3">ملاحظة</th>
                      <th className="p-3 w-28">الإجمالي</th>
                      <th className="p-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                          <ShoppingCart size={24} className="mx-auto mb-2 opacity-50" />
                          لا توجد أصناف في هذه الفاتورة
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const lineTotal =
                          toNumber(item.quantity) * toNumber(item.unit_price);
                        return (
                          <tr key={item.rowId} className="hover:bg-white/[0.02]">
                            <td className="p-3 text-[10px] text-slate-500 font-bold text-center">
                              {idx + 1}
                            </td>
                            <td className="p-3 text-sm font-bold text-white">
                              {item.name}
                            </td>
                            <td className="p-3">
                              <input
                                value={item.quantity}
                                onChange={(event) =>
                                  updateItem(item.rowId, {
                                    quantity: event.target.value,
                                  })
                                }
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center focus:border-red-500/50"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                value={item.unit_price}
                                onChange={(event) =>
                                  updateItem(item.rowId, {
                                    unit_price: event.target.value,
                                  })
                                }
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center focus:border-red-500/50"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                value={item.notes}
                                onChange={(event) =>
                                  updateItem(item.rowId, { notes: event.target.value })
                                }
                                placeholder="..."
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-red-500/50"
                              />
                            </td>
                            <td className="p-3 text-sm font-black text-emerald-400 text-center">
                              {lineTotal.toFixed(2)}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => removeItem(item.rowId)}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                                title="حذف الصنف"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {/* Add new item row */}
                    <tr className="border-t border-white/5 bg-slate-950/30">
                      <td colSpan={7} className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            id="item-code-input"
                            placeholder="🔍 أدخل كود الصنف..."
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addItem();
                              }
                            }}
                            className="flex-1 max-w-xs bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                            disabled={lookupLoading}
                          />
                          <button
                            onClick={addItem}
                            disabled={lookupLoading}
                            className={`px-4 py-2 ${
                              lookupLoading ? "bg-red-600/50" : "bg-red-600 hover:bg-red-700"
                            } text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors`}
                          >
                            {lookupLoading ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <><Plus size={16} /> إضافة صنف</>
                            )}
                          </button>
                          <span className="text-[10px] text-slate-500">
                            اضغط Enter للإضافة السريعة
                          </span>
                        </div>
                      </td>
                    </tr>
                    {lookupError && (
                      <tr>
                        <td colSpan={7} className="p-2 text-center text-red-500 text-xs">
                          {lookupError}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Totals Section */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
              <div className="flex items-center gap-6">
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-500">المجموع الفرعي</p>
                  <p className="text-base font-black text-slate-300">{subtotal.toFixed(2)} ₪</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-500">الخصم</p>
                  <p className="text-base font-black text-red-400">- {discountAmount.toFixed(2)} ₪</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-500">الإجمالي النهائي</p>
                  <p className="text-2xl font-black text-emerald-400">{total.toFixed(2)} ₪</p>
                </div>
              </div>
            </div>
          </div>

          {paymentTarget > 0 && (
            <InvoicePaymentsEditor
              payments={paymentDrafts}
              targetAmount={paymentTarget}
              onChange={setPaymentDrafts}
              disabled={saving}
              title="دفعات إضافية"
            />
          )}

          {/* Payments Summary */}
          {invPayments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                <h4 className="text-sm font-black text-white">المدفوعات</h4>
                <span className="text-[10px] text-slate-500 font-bold">({invPayments.length} دفعة)</span>
              </div>
              <div className="border border-white/5 rounded-2xl overflow-hidden">
                <div className="divide-y divide-white/5">
                  {invPayments.map((payment: any, index: number) => {
                    const method = payment.payment_method ?? payment.method;
                    return (
                      <div
                        key={`payment-${payment.id}-${index}`}
                        className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                            {paymentIcon(method)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">
                              {methodLabels[method?.toLowerCase()] ?? method ?? "غير محدد"}
                            </p>
                            {payment.reference_number && (
                              <p className="text-[10px] text-slate-500">
                                مرجع: {payment.reference_number}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-base font-black text-emerald-400">
                            {formatMoney(payment.amount)}
                          </p>
                          <p className="text-[9px] text-slate-500">
                            {formatDateTime(payment.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2.5 border border-white/5">
              <Hash size={16} className="text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase">رقم الفاتورة</p>
                <p className="text-sm font-bold truncate text-white">{invNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2.5 border border-white/5">
              <Calendar size={16} className="text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase">تاريخ الإنشاء</p>
                <p className="text-sm font-bold truncate text-white">{formatDateTime(createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2.5 border border-white/5">
              <User size={16} className="text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase">العميل</p>
                <p className="text-sm font-bold truncate text-white">{customer}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2.5 border border-white/5">
              <Phone size={16} className="text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase">الجوال</p>
                <p className="text-sm font-bold truncate text-white">{phone}</p>
              </div>
            </div>
            {paidAt && (
              <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2.5 border border-white/5">
                <CheckCircle2 size={16} className="text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-500 uppercase">تاريخ الدفع</p>
                  <p className="text-sm font-bold truncate text-emerald-400">{formatDateTime(paidAt)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-950/30 flex items-center justify-between">
          <div className="text-[10px] text-slate-500 font-bold">
            {items.length > 0 ? (
              <span>{items.length} صنف • {formatMoney(total)}</span>
            ) : (
              <span>فاتورة بدون أصناف</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-black hover:bg-slate-700 transition-colors"
            >
              إغلاق
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-red-600 to-red-700 text-white text-xs font-black hover:from-red-700 hover:to-red-800 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              حفظ التعديلات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
