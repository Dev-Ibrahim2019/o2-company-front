import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Trash2, X } from "lucide-react";
import { orderService } from "../../services/orderService";
import type {
  DiscountType,
  OrderFromApi,
  OrderType,
  PaymentMethod,
} from "../../services/orderService";

interface OrderEditModalProps {
  order: OrderFromApi;
  onClose: () => void;
  onSaved: (order: OrderFromApi) => void;
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

export const OrderEditModal = ({
  order,
  onClose,
  onSaved,
}: OrderEditModalProps) => {
  const [orderType, setOrderType] = useState<OrderType>(order.order_type);
  const [tableNumber, setTableNumber] = useState(order.table_number ?? "");
  const [customerName, setCustomerName] = useState(order.customer_name ?? "");
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone ?? "");
  const [note, setNote] = useState(order.note ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(
    order.discount_type ?? "amount",
  );
  const [discountValue, setDiscountValue] = useState(
    String(order.discount_value ?? 0),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    order.payment_method ?? "cash",
  );
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(
      order.items.map((item) => ({
        rowId: item.id,
        item_id: item.item_id,
        name: item.item_name_ar || item.item_name,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
        notes: item.notes ?? "",
      })),
    );
  }, [order]);

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

  const removeItem = (rowId: number) => {
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  const save = async () => {
    const cleanItems = items
      .map((item) => ({
        item_id: item.item_id,
        quantity: toNumber(item.quantity),
        unit_price: toNumber(item.unit_price),
        notes: item.notes.trim() || undefined,
      }))
      .filter((item) => item.quantity > 0 && item.unit_price >= 0);

    if (cleanItems.length === 0) {
      setError("لا يمكن حفظ طلب بدون أصناف");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await orderService.update(order.id, {
        branch_id: order.branch_id,
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
      onSaved(updated);
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل تعديل الطلب";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white">
              تعديل الطلب #{order.order_number}
            </h3>
            <p className="text-[11px] text-slate-500 font-bold">
              الطلب النشط قابل للتعديل قبل الإغلاق
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
                    setDiscountType(event.target.value as DiscountType)
                  }
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
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
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
