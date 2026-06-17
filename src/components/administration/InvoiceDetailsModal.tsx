import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Trash2,
  X,
  Edit3,
  Eye,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { orderService } from "../../services/orderService";
import { fetchItems } from "../../services/itemService";
import type {
  DiscountType,
  OrderType,
  PaymentMethod,
  InvoiceFromApi,
} from "../../services/orderService";

interface InvoiceDetailsModalProps {
  row: any; // SalesInvoiceRow from parent
  onClose: () => void;
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

export const InvoiceDetailsModal = ({
  row,
  onClose,
}: InvoiceDetailsModalProps) => {
  const [invoice, setInvoice] = useState<InvoiceFromApi | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [discountValue, setDiscountValue] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Load invoice details when row changes
  useEffect(() => {
    const loadInvoice = async () => {
      setInvoice(null);
      setError(null);
      try {
        // If row.source is invoice, we can fetch by id
        // If source is order, we need to get invoice for order
        let invoiceId = row.id;
        if (row.source === "order") {
          // get invoice for order
          const invs = await orderService.getInvoices({ order_id: row.orderId });
          const invArray = Array.isArray(invs) ? invs : (invs as any)?.data || [];
          const found = invs.find((i: any) => i.id === row.id) ?? invArray[0];
          if (found) invoiceId = found.id;
        }
        const data = await orderService.getInvoices({ id: invoiceId });
        const invArray = Array.isArray(data) ? data : (data as any)?.data || [];
        const inv = invArray.find((i: any) => i.id === invoiceId) ?? invArray[0];
        setInvoice(inv);
        // Initialize editable fields
        setOrderType(inv.order?.order_type ?? "dine_in");
        setTableNumber(inv.order?.table_number ?? "");
        setCustomerName(inv.order?.customer_name ?? "");
        setCustomerPhone(inv.order?.customer_phone ?? "");
        setNote(inv.order?.note ?? "");
        setDiscountType(inv.order?.discount_type ?? "amount");
        setDiscountValue(String(inv.order?.discount_value ?? 0));
        setPaymentMethod((inv.order?.payment_method as PaymentMethod) ?? "cash");
        // Initialize items
        const orderItems = inv.order?.items ?? [];
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
      } catch (e) {
        console.error("Failed to load invoice details:", e);
        setError("فشل تحميل تفاصيل الفاتورة");
      }
    };
    loadInvoice();
  }, [row]);

  const subtotal = items.reduce(
    (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price),
    0
  );
  const discountAmount =
    discountType === "percent"
      ? (subtotal * toNumber(discountValue)) / 100
      : toNumber(discountValue);
  const total = Math.max(0, subtotal - discountAmount);

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
      const items = await fetchItems();
      const item = items.find((i) => i.code === code);
      if (!item) {
        setLookupError(`لم يتم العثور على صنف بالكود: ${code}`);
        return;
      }

      // Add new item to the list
      const newItem: EditableItem = {
        rowId: Date.now(), // temporary ID
        item_id: item.id,
        name: item.name_ar || item.name,
        quantity: "1",
        unit_price: String(item.price || 0),
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
        payment_method: paymentMethod,
        items: cleanItems,
      });

      const updatedInvoice = await orderService.getInvoiceForOrder(
        updatedOrder.id
      );

      if (updatedInvoice) {
        // close modal and notify parent (maybe via callback)
        onClose();
        // Optionally refresh parent data
        // we could call a refetch function if provided
      } else {
        const newInvoice = await orderService.createInvoiceFromOrder(
          updatedOrder.id,
          {
            customer_name:
              updatedOrder.customer_name === "عميل نقدي"
                ? undefined
                : updatedOrder.customer_name,
            customer_phone:
              updatedOrder.customer_phone === "---"
                ? undefined
                : updatedOrder.customer_phone,
          }
        );
        onClose();
      }
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? "فشل تعديل الفاتورة";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Escape key to close, Enter to save when editing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "Enter" && isEditing) {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, save, isEditing]);

  if (!invoice) {
    return (
      <div className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl p-6 text-center">
          <Loader2 size={20} className="mb-4 inline-block animate-spin" />
          <p>جاري تحميل الفاتورة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white">
              تفاصيل الفاتورة {invoice.invoice_number ?? `INV-${invoice.id}`}
            </h3>
            <p className="text-[11px] text-slate-500 font-bold">
              {invoice.order?.order_number ? (
                `مرتبط بالطلب #{invoice.order.order_number}`
              ) : (
                "فاتورة مستقلة"
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-xs font-bold">
              {error}
              <button onClick={() => setError(null)} className="ml-2 text-xs underline">
                مسح
              </button>
            </div>
          )}

          {!isEditing ? (
            // View mode: show line items table read-only
            <>
              <div className="border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right min-w-[720px]">
                    <thead className="bg-slate-950/60 text-slate-500 text-[10px] font-black">
                      <tr>
                        <th className="p-3">الصنف</th>
                        <th className="p-3 w-28">الكمية</th>
                        <th className="p-3 w-32">السعر</th>
                        <th className="p-3">ملاحظة</th>
                        <th className="p-3 w-28">الإجمالي</th>
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map((item) => {
                        const lineTotal =
                          toNumber(item.quantity) * toNumber(item.unit_price);
                        return (
                          <tr key={item.rowId}>
                            <td className="p-3 text-sm font-bold text-white">
                              {item.name}
                            </td>
                            <td className="p-3 text-center">
                              {item.quantity}
                            </td>
                            <td className="p-3 text-center">
                              {item.unit_price}
                            </td>
                            <td className="p-3 text-[10px]">
                              {item.notes}
                            </td>
                            <td className="p-3 text-sm font-black text-emerald-400">
                              {lineTotal.toFixed(2)}
                            </td>
                            <td className="p-3">
                              {/* No delete in view mode */}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Add new item row */}
                      <tr className="border-t border-white/5">
                        <td className="p-3 flex items-center gap-2">
                          <input
                            id="item-code-input"
                            placeholder="أدخل كود الصنف..."
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addItem();
                              }
                            }}
                            className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                            disabled={lookupLoading}
                          />
                          <button
                            onClick={addItem}
                            disabled={lookupLoading}
                            className={`px-3 py-2 ${
                              lookupLoading ? "bg-blue-600/50" : "bg-blue-600"
                            } text-white rounded-lg text-sm font-bold hover:bg-blue-700`}
                          >
                            {lookupLoading ? (
                              <Loader2 size={16} className="mr-2 animate-spin" />
                            ) : (
                              <>{"إضافة"}</>
                            )}
                          </button>
                        </td>
                        <td colSpan="6" className="p-3 text-center text-slate-500">
                          اضغط Enter لإضافة الصنف
                        </td>
                      </tr>
                      {lookupError && (
                        <tr>
                          <td colSpan="6" className="p-3 text-center text-red-500">
                            {lookupError}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 text-sm font-black">
                <span className="text-slate-500">الفرعي {subtotal.toFixed(2)}</span>
                <span className="text-slate-500">الخصم {discountAmount.toFixed(2)}</span>
                <span className="text-white text-lg">الإجمالي {total.toFixed(2)} ₪</span>
              </div>

              <div className="p-4 border-t border-white/5 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-black hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 flex items-center gap-2"
                >
                  تعديل
                </button>
              </div>
            </>
          ) : (
            // Edit mode: show inputs similar to InvoiceEditModal
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500">النوع</span>
                  <select
                    value={orderType}
                    onChange={(event) => setOrderType(event.target.value as OrderType)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="dine_in">محلي</option>
                    <option value="takeaway">سفري</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500">الطاولة</span>
                  <input
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500">العميل</span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500">الجوال</span>
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-black text-slate-500">ملاحظة</span>
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500">الخصم</span>
                  <input
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500">نوع الخصم</span>
                    <select
                      value={discountType}
                      onChange={(event) =>
                        setDiscountType(event.target.value as DiscountType)}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="amount">مبلغ</option>
                      <option value="percent">نسبة</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500">الدفع</span>
                    <select
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(event.target.value as PaymentMethod)}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="cash">كاش</option>
                      <option value="credit_card">بطاقة</option>
                      <option value="wallet">محفظة</option>
                      <option value="bank_transfer">بنكي</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right min-w-[720px]">
                    <thead className="bg-slate-950/60 text-slate-500 text-[10px] font-black">
                      <tr>
                        <th className="p-3">الصنف</th>
                        <th className="p-3 w-28">الكمية</th>
                        <th className="p-3 w-32">السعر</th>
                        <th className="p-3">ملاحظة</th>
                        <th className="p-3 w-28">الإجمالي</th>
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map((item) => {
                        const lineTotal =
                          toNumber(item.quantity) * toNumber(item.unit_price);
                        return (
                          <tr key={item.rowId}>
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
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center"
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
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                value={item.notes}
                                onChange={(event) =>
                                  updateItem(item.rowId, { notes: event.target.value })
                                }
                                className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
                              />
                            </td>
                            <td className="p-3 text-sm font-black text-red-400">
                              {lineTotal.toFixed(2)}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => removeItem(item.rowId)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Add new item row */}
                      <tr className="border-t border-white/5">
                        <td className="p-3 flex items-center gap-2">
                          <input
                            id="item-code-input-edit"
                            placeholder="أدخل كود الصنف..."
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addItem();
                              }
                            }}
                            className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                            disabled={lookupLoading}
                          />
                          <button
                            onClick={addItem}
                            disabled={lookupLoading}
                            className={`px-3 py-2 ${
                              lookupLoading ? "bg-red-600/50" : "bg-red-600"
                            } text-white rounded-lg text-sm font-bold hover:bg-red-700`}
                          >
                            {lookupLoading ? (
                              <Loader2 size={16} className="mr-2 animate-spin" />
                            ) : (
                              <>{"إضافة"}</>
                            )}
                          </button>
                        </td>
                        <td colSpan="6" className="p-3 text-center text-slate-500">
                          اضغط Enter لإضافة الصنف
                        </td>
                      </tr>
                      {lookupError && (
                        <tr>
                          <td colSpan="6" className="p-3 text-center text-red-500">
                            {lookupError}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 text-sm font-black">
                <span className="text-slate-500">الفرعي {subtotal.toFixed(2)}</span>
                <span className="text-slate-500">الخصم {discountAmount.toFixed(2)}</span>
                <span className="text-white text-lg">الإجمالي {total.toFixed(2)} ₪</span>
              </div>

              <div className="p-4 border-t border-white/5 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-black hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  حفظ التعديل
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};