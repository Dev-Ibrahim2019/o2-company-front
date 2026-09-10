import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Trash2, X } from "lucide-react";
import { orderService } from "../../services/orderService";
import { toast } from "../shared/Toast";
import type {
  DiscountType,
  OrderFromApi,
  OrderType,
  PaymentMethod,
  InvoiceFromApi,
} from "../../services/orderService";

interface InvoiceEditModalProps {
  invoice: InvoiceFromApi;
  onClose: () => void;
  onSaved: (invoice: InvoiceFromApi) => void;
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

export const InvoiceEditModal = ({
  invoice,
  onClose,
  onSaved,
}: InvoiceEditModalProps) => {
  const [orderType, setOrderType] = useState<OrderType>(
    invoice.order?.order_type ?? "dine_in"
  );
  const [tableNumber, setTableNumber] = useState(
    invoice.order?.table_number ?? ""
  );
  const [customerName, setCustomerName] = useState(
    invoice.order?.customer_name ?? ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    invoice.order?.customer_phone ?? ""
  );
  const [note, setNote] = useState(invoice.order?.note ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(
    invoice.order?.discount_type ?? "amount"
  );
  const [discountValue, setDiscountValue] = useState(
    String(invoice.order?.discount_value ?? 0)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (invoice.order?.payment_method as PaymentMethod) ?? "cash"
  );
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize items from invoice's associated order items
    // If the invoice doesn't have order items directly, we might need to fetch the order
    const orderItems = invoice.order?.items ?? [];
    setItems(
      orderItems.map((item) => ({
        rowId: item.id,
        item_id: item.item_id,
        name: item.item_name_ar || item.item_name,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
        notes: item.notes ?? "",
      }))
    );
  }, [invoice]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + toNumber(item.quantity) * toNumber(item.unit_price),
        0
      ),
    [items]
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

  const save = async () => {
    // Validate
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
      // Update the associated order
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

      // Fetch the updated invoice to return
      const updatedInvoice = await orderService.getInvoiceForOrder(
        updatedOrder.id
      );

      if (updatedInvoice) {
        onSaved(updatedInvoice);
      } else {
        // If we can't get the updated invoice, create a new invoice from the order
        const newInvoice = await orderService.createInvoiceFromOrder(updatedOrder.id, {
          customer_name: updatedOrder.customer_name === "عميل نقدي" ? undefined : updatedOrder.customer_name,
          customer_phone: updatedOrder.customer_phone === "---" ? undefined : updatedOrder.customer_phone,
        });
        onSaved(newInvoice);
      }
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل تعديل الفاتورة";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Escape key to close modal and Enter key to save
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "Enter") {
        // Prevent form submission if in a form
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, save]);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white">
              تعديل الفاتورة #{invoice.invoice_number}
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-black text-slate-500">النوع</span>
              <select
                value={orderType}
                onChange={(event) => setOrderType(event.target.value as OrderType)}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
              >
                <option value="dine_in">محلي</option>
                <option value="takeaway">فوري</option>
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
                        id="item-code-input"
                        placeholder="أدخل كود الصنف..."
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            const codeInput = document.getElementById(
                              "item-code-input"
                            ) as HTMLInputElement;
                            const code = codeInput?.value.trim();
                            if (!code) return;
                            // TODO: Implement item lookup by code
                            toast.info(`سيتم جلب الصنف بالكود: ${code}`);
                            codeInput.value = "";
                          }
                        }}
                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                      />
                      <button
                        onClick={() => {
                          // TODO: Implement item lookup by code
                          const codeInput = document.getElementById(
                            "item-code-input"
                          ) as HTMLInputElement;
                          const code = codeInput?.value.trim();
                          if (!code) return;

                          // This would typically call a service to get item by code
                          // For now, we'll focus on the structure
                          toast.info(`سيتم جلب الصنف بالكود: ${code}`);
                          codeInput.value = "";
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
                      >
                        إضافة
                      </button>
                    </td>
                    <td colSpan="4" className="p-3 text-center text-slate-500">
                      اضغط Enter لإضافة الصنف
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 text-sm font-black">
            <span className="text-slate-500">الفرعي {subtotal.toFixed(2)}</span>
            <span className="text-slate-500">الخصم {discountAmount.toFixed(2)}</span>
            <span className="text-white text-lg">الإجمالي {total.toFixed(2)} ₪</span>
          </div>
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
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ التعديل
          </button>
        </div>
      </div>
    </div>
  );
};