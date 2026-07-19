import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Save,
  Trash2,
  X,
  Plus,
  Receipt,
  Search,
  User,
  Phone,
  Building2,
} from "lucide-react";
import { orderService } from "../../services/orderService";
import { fetchItems } from "../../services/itemService";
import { branchService } from "../../services/branchService";
import { useApp } from "../../../store";
import { InvoicePaymentsEditor } from "./shared/InvoicePaymentsEditor";
import {
  createPaymentDraft,
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
  OrderFromApi,
} from "../../services/orderService";

interface CreateInvoiceModalProps {
  onClose: () => void;
  onCreated: () => void;
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

const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} ₪`;

const branchIdFromUser = (user: unknown) => {
  const raw =
    (user as { branch_id?: number | string; branchId?: number | string } | null)
      ?.branch_id ?? (user as { branchId?: number | string } | null)?.branchId;
  const branchId = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(branchId) && branchId > 0 ? branchId : 1;
};

export const CreateInvoiceModal = ({
  onClose,
  onCreated,
}: CreateInvoiceModalProps) => {
  const { currentUser } = useApp();
  const [step, setStep] = useState<"search" | "edit">("search");
  const [searchOrderId, setSearchOrderId] = useState("");
  const [order, setOrder] = useState<OrderFromApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [discountValue, setDiscountValue] = useState("0");
  const [paymentDrafts, setPaymentDrafts] = useState<PaymentDraft[]>([
    createPaymentDraft(),
  ]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const startNewInvoice = () => {
    setOrder(null);
    setItems([]);
    setOrderType("dine_in");
    setTableNumber("");
    setCustomerName("");
    setCustomerPhone("");
    setNote("");
    setDiscountType("amount");
    setDiscountValue("0");
    setPaymentDrafts([createPaymentDraft()]);
    setLookupError(null);
    setError(null);
    setStep("edit");
  };

  useEffect(() => {
    let active = true;
    setLoadingBranches(true);
    branchService
      .getAll()
      .then((list) => {
        if (!active) return;
        const raw = Array.isArray(list) ? list : [];
        console.debug(
          "[CreateInvoiceModal] branches raw:",
          list,
          "count:",
          raw.length,
        );
        setBranches(raw);
      })
      .catch((err) => {
        console.error("[CreateInvoiceModal] branches load error:", err);
        if (!active) return;
        setBranches([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingBranches(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const searchOrder = async () => {
    const id = parseInt(searchOrderId, 10);
    if (!id || id <= 0) {
      setError("الرجاء إدخال رقم طلب صحيح");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const found = await orderService.getOne(id);
      setOrder(found);

      // Initialize all fields from order
      setOrderType(found.order_type ?? "dine_in");
      setTableNumber(found.table_number ?? "");
      setCustomerName(found.customer_name ?? "");
      setCustomerPhone(found.customer_phone ?? "");
      setNote(found.note ?? "");
      setDiscountType(found.discount_type ?? "amount");
      setDiscountValue(String(found.discount_value ?? 0));
      setPaymentDrafts([
        createPaymentDraft(
          Number(found.total || 0),
          (found.payment_method as PaymentMethod) ?? "cash",
        ),
      ]);
      setItems(
        (found.items ?? []).map((item: any) => ({
          rowId: item.id,
          item_id: item.item_id,
          name: item.item_name_ar || item.item_name,
          quantity: String(item.quantity),
          unit_price: String(item.unit_price),
          notes: item.notes ?? "",
        })),
      );

      setStep("edit");
    } catch (e) {
      console.error("Failed to fetch order:", e);
      setError(`لم يتم العثور على طلب رقم ${id}`);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + toNumber(item.quantity) * toNumber(item.unit_price),
        0,
      ),
    [items],
  );
  const discountAmount =
    discountType === "percent"
      ? (subtotal * toNumber(discountValue)) / 100
      : toNumber(discountValue);
  const total = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    setPaymentDrafts((prev) => {
      if (prev.length !== 1) return prev;
      const nextAmount = roundMoney(total);
      if (roundMoney(Number(prev[0].amount || 0)) === nextAmount) return prev;
      return [
        {
          ...prev[0],
          amount: nextAmount > 0 ? nextAmount.toFixed(2) : "",
        },
      ];
    });
  }, [total]);

  const updateItem = (
    rowId: number,
    changes: Partial<Omit<EditableItem, "rowId" | "item_id" | "name">>,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId ? { ...item, ...changes } : item,
      ),
    );
  };

  const selectedBranchId = useMemo(() => {
    const raw =
      (order?.branch_id as number | string | undefined) ??
      branchIdFromUser(currentUser);
    if (raw === undefined || raw === null || raw === "") return "";
    return Number(raw);
  }, [order?.branch_id, currentUser]);

  const defaultBranchForAdmin = useMemo(() => {
    if (!currentUser || currentUser.role !== "ADMIN") return undefined;
    const mainBranch = branches.find((b: any) => b.isMainBranch) ?? branches[0];
    return mainBranch?.id ? Number(mainBranch.id) : undefined;
  }, [currentUser, branches]);

  useEffect(() => {
    if (loadingBranches) return;
    console.debug("CreateInvoiceModal branches:", branches);
  }, [branches, loadingBranches]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== "ADMIN") return;
    if (!branches.length) return;
    if (defaultBranchForAdmin == null) return;
    setOrder((prev) => ({
      ...(prev ?? ({} as any)),
      branch_id: defaultBranchForAdmin as any,
    }));
  }, [currentUser, branches, defaultBranchForAdmin]);

  const removeItem = (rowId: number) => {
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  const addItem = async () => {
    const codeInput = document.getElementById(
      "create-item-code-input",
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
      setLookupError("فشل جلب الصنف");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    const cleanItems = items
      .map((item) => ({
        item_id: item.item_id,
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unit_price),
        notes: item.notes.trim() || undefined,
      }))
      .filter((item) => item.quantity > 0 && item.unit_price >= 0);

    if (cleanItems.length === 0) {
      setError("لا يمكن إنشاء فاتورة بدون أصناف");
      return;
    }

    const paymentError = validatePaymentDrafts(paymentDrafts, total);
    if (paymentError) {
      setError(paymentError);
      return;
    }

    const paymentPayloads = paymentDraftsToPayloads(paymentDrafts);

    setSaving(true);
    setError(null);
    try {
      const orderPayload = {
        branch_id: order?.branch_id ?? branchIdFromUser(currentUser),
        cashier_id: (currentUser as { id?: number | string } | null)?.id
          ? Number((currentUser as { id?: number | string }).id)
          : undefined,
        order_type: orderType,
        table_number: tableNumber.trim() || undefined,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        note: note.trim() || undefined,
        discount_type: discountType,
        discount_value: toNumber(discountValue),
        payment_method: getPrimaryPaymentMethod(paymentDrafts),
        items: cleanItems,
      };

      const savedOrder = order
        ? await orderService.update(order.id, orderPayload)
        : await orderService.create(orderPayload);

      const existingInvoice = await orderService.getInvoiceForOrder(
        savedOrder.id,
      );

      const invoice =
        existingInvoice ??
        (await orderService.createInvoiceFromOrder(savedOrder.id, {
          customer_name:
            customerName.trim() === "عميل نقدي"
              ? undefined
              : customerName.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          note: note.trim() || undefined,
        }));

      if (invoice) {
        const existingPaid = (invoice.payments ?? []).reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        );
        if (roundMoney(existingPaid) <= 0 && paymentPayloads.length > 0) {
          await orderService.addPaymentsToInvoice(invoice.id, paymentPayloads);
        }
        onCreated();
      }
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (e as { message?: string })?.message ??
        "فشل إنشاء الفاتورة";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (step === "edit") setStep("search");
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, step]);

  if (step === "search") {
    return (
      <div className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">
                إنشاء فاتورة جديدة
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                اختر فاتورة جديدة أو طلب موجود
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

            <button
              onClick={startNewInvoice}
              className="w-full px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-black hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <Plus size={17} />
              إنشاء فاتورة جديدة
            </button>

            <label className="space-y-1 block">
              <span className="text-[10px] font-black text-slate-500">
                رقم طلب موجود
              </span>
              <input
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchOrder();
                  }
                }}
                placeholder="أدخل رقم الطلب..."
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-500/50"
                autoFocus
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
              onClick={searchOrder}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              بحث عن الطلب
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              <h3 className="text-lg font-black text-white">
                {order
                  ? `إنشاء فاتورة من الطلب #${order.order_number}`
                  : "إنشاء فاتورة جديدة"}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                {order ? (
                  <>
                    العميل: {order.customer_name || "عميل نقدي"} •{" "}
                    {order.order_type === "dine_in" ? "🍽️ محلي" : "🛵 سفري"}
                    {order.table_number ? ` • طاولة ${order.table_number}` : ""}
                  </>
                ) : (
                  <>
                    طلب جديد • {orderType === "dine_in" ? "🍽️ محلي" : "🛵 سفري"}
                    {tableNumber ? ` • طاولة ${tableNumber}` : ""}
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStep("search")}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-xs underline"
              >
                مسح
              </button>
            </div>
          )}

          {/* Invoice Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-red-500 rounded-full"></div>
              <h4 className="text-sm font-black text-white">بيانات الفاتورة</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">
                  النوع
                </span>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                >
                  <option value="dine_in">🍽️ محلي</option>
                  <option value="takeaway">🛵 سفري</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">
                  <Building2 size={12} className="inline ml-1" />
                  الفرع
                </span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const value = raw === "" ? undefined : Number(raw);
                    setOrder(
                      (prev) =>
                        ({
                          ...(prev ?? ({} as any)),
                          branch_id: value as any,
                        }) as any,
                    );
                  }}
                  disabled={loadingBranches}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50 disabled:opacity-60"
                >
                  <option value="">
                    {order?.branch_id != null
                      ? "تغيير الفرع..."
                      : "اختر الفرع..."}
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {loadingBranches && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    جاري تحميل الفروع...
                  </p>
                )}
                {!loadingBranches && branches.length === 0 && (
                  <p className="text-[10px] text-red-400 mt-1">
                    لا يوجد فروع متاحة — تحقق من الاتصال أو صلاحيات المستخدم
                  </p>
                )}
                <p className="text-[10px] text-slate-500">
                  الفرع المحدد حالياً:{" "}
                  {selectedBranchId ? selectedBranchId : "غير محدد"}
                </p>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">
                  الطاولة
                </span>
                <input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="رقم الطاولة"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">
                  <User size={12} className="inline ml-1" />
                  العميل
                </span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="اسم العميل"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">
                  <Phone size={12} className="inline ml-1" />
                  الجوال
                </span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="رقم الجوال"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-black text-slate-500">
                  ملاحظة
                </span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ملاحظة على الفاتورة..."
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black text-slate-500">
                  الخصم
                </span>
                <input
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                />
              </label>
              <div>
                <label className="space-y-1 block">
                  <span className="text-[10px] font-black text-slate-500">
                    نوع الخصم
                  </span>
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as DiscountType)
                    }
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
              <span className="text-[10px] text-slate-500 font-bold">
                ({items.length} صنف)
              </span>
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
                    {items.map((item, idx) => {
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
                              onChange={(e) =>
                                updateItem(item.rowId, {
                                  quantity: e.target.value,
                                })
                              }
                              className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center focus:border-red-500/50"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(item.rowId, {
                                  unit_price: e.target.value,
                                })
                              }
                              className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center focus:border-red-500/50"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              value={item.notes}
                              onChange={(e) =>
                                updateItem(item.rowId, {
                                  notes: e.target.value,
                                })
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
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-white/5 bg-slate-950/30">
                      <td colSpan={7} className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            id="create-item-code-input"
                            placeholder="🔍 أدخل كود الصنف..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addItem();
                              }
                            }}
                            className="flex-1 max-w-xs bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                            disabled={lookupLoading}
                          />
                          <button
                            onClick={addItem}
                            disabled={lookupLoading}
                            className={`px-4 py-2 ${lookupLoading ? "bg-red-600/50" : "bg-red-600 hover:bg-red-700"} text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors`}
                          >
                            {lookupLoading ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <>
                                <Plus size={16} /> إضافة
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {lookupError && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-2 text-center text-red-500 text-xs"
                        >
                          {lookupError}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-end gap-6">
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-500">
                  المجموع الفرعي
                </p>
                <p className="text-base font-black text-slate-300">
                  {subtotal.toFixed(2)} ₪
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-500">الخصم</p>
                <p className="text-base font-black text-red-400">
                  - {discountAmount.toFixed(2)} ₪
                </p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-500">
                  الإجمالي النهائي
                </p>
                <p className="text-2xl font-black text-emerald-400">
                  {total.toFixed(2)} ₪
                </p>
              </div>
            </div>
          </div>

          <InvoicePaymentsEditor
            payments={paymentDrafts}
            targetAmount={total}
            onChange={setPaymentDrafts}
            disabled={saving}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-950/30 flex items-center justify-between">
          <div className="text-[10px] text-slate-500 font-bold">
            {items.length} صنف • {formatMoney(total)}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("search")}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-black hover:bg-slate-700 transition-colors"
            >
              رجوع
            </button>
            <button
              onClick={handleCreateInvoice}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-red-600 to-red-700 text-white text-xs font-black hover:from-red-700 hover:to-red-800 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              إنشاء الفاتورة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
