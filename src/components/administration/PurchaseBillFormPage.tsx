import { useState, useEffect, useCallback } from "react";
import {
  ArrowRight, Loader2, Save, Plus, Trash2, Upload, FileText,
} from "lucide-react";
import { purchaseBillService } from "../../services/purchaseBillService";
import { supplierService } from "../../services/supplierService";
import { useApp } from "../../../store";
import { toast } from "../shared/Toast";
import type { PurchaseBill, PurchaseBillFormData } from "../../types/purchaseBill";
import {
  EMPTY_BILL_ITEM, calcItemTotals, formatBillCurrency, TAX_RATES, CURRENCIES,
} from "../../types/purchaseBill";

interface Props {
  billId?: number;
  onBack: () => void;
  onSaved: () => void;
}

export const PurchaseBillFormPage: React.FC<Props> = ({ billId, onBack, onSaved }) => {
  const { currentUser } = useApp();
  const isEditing = !!billId;

  const [saving, setSaving] = useState(false);
  const [loadingBill, setLoadingBill] = useState(isEditing);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const [currency, setCurrency] = useState("ILS");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0];
  });
  const [status, setStatus] = useState<"draft" | "pending_approval">("draft");
  const [discount, setDiscount] = useState(0);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_BILL_ITEM }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoadingSuppliers(true);
      try {
        const data = await supplierService.getAll().catch(() => []);
        setSuppliers(Array.isArray(data) ? data : []);
      } catch { setSuppliers([]); }
      setLoadingSuppliers(false);
    })();
  }, []);

  useEffect(() => {
    if (!billId) return;
    (async () => {
      setLoadingBill(true);
      try {
        const b = await purchaseBillService.getOne(billId);
        setSelectedSupplier(b.supplier);
        setSupplierSearch(b.supplier?.name || "");
        setCurrency(b.currency);
        setBillDate(b.bill_date);
        setDueDate(b.due_date);
        setStatus(b.status === "pending_approval" ? "pending_approval" : "draft");
        setDiscount(Number(b.discount) || 0);
        setReference(b.reference || "");
        setNotes(b.notes || "");
        if (b.items?.length) {
          setItems(b.items.map((it) => ({
            product_id: it.product_id,
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            tax_rate: Number(it.tax_rate),
            discount: Number(it.discount),
            account_id: it.account_id,
          })));
        }
      } catch { toast.error("فشل تحميل الفاتورة"); }
      setLoadingBill(false);
    })();
  }, [billId]);

  const filteredSuppliers = (() => {
    if (!supplierSearch) return suppliers.slice(0, 10);
    const q = supplierSearch.toLowerCase();
    return suppliers.filter((s) => s.name?.toLowerCase().includes(q) || s.phone?.includes(q)).slice(0, 10);
  })();

  const selectSupplier = (s: any) => {
    setSelectedSupplier(s);
    setSupplierSearch(s.name);
    setShowSupplierDropdown(false);
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_BILL_ITEM }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const computeTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    items.forEach((it) => {
      const t = calcItemTotals(it);
      subtotal += t.total_before_tax;
      taxTotal += t.tax_amount;
    });
    const total = subtotal + taxTotal - discount;
    return { subtotal, taxTotal, total };
  };

  const { subtotal, taxTotal, total } = computeTotals();

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!selectedSupplier) e.supplier = "اختر المورد";
    if (!billDate) e.bill_date = "التاريخ مطلوب";
    if (!dueDate) e.due_date = "تاريخ الاستحقاق مطلوب";
    if (items.length === 0 || items.every((it) => !it.description)) e.items = "أضف صنفًا واحدًا على الأقل";
    items.forEach((it, i) => {
      if (!it.description) e[`item_${i}_desc`] = "الوصف مطلوب";
      if (it.quantity <= 0) e[`item_${i}_qty`] = "الكمية غير صالحة";
      if (it.unit_price < 0) e[`item_${i}_price`] = "السعر غير صالح";
      if (!it.account_id) e[`item_${i}_acct`] = "الحساب مطلوب";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: PurchaseBillFormData = {
        supplier_id: selectedSupplier.id,
        currency,
        bill_date: billDate,
        due_date: dueDate,
        status,
        discount,
        reference: reference || undefined,
        notes: notes || undefined,
        items: items.map((it) => ({
          product_id: it.product_id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          tax_rate: it.tax_rate,
          discount: it.discount,
          account_id: it.account_id,
        })),
      };
      if (isEditing) {
        await purchaseBillService.update(billId!, payload);
        toast.success("تم تحديث الفاتورة");
      } else {
        await purchaseBillService.create(payload);
        toast.success("تم إنشاء الفاتورة");
      }
      onSaved();
    } catch {
      toast.error(isEditing ? "فشل تحديث الفاتورة" : "فشل إنشاء الفاتورة");
    } finally {
      setSaving(false);
    }
  };

  if (loadingBill) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--o2-muted)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg border hover:opacity-80" style={{ borderColor: "var(--o2-border)", color: "var(--o2-muted)" }}>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black" style={{ color: "var(--o2-text)" }}>{isEditing ? "تعديل فاتورة مشتريات" : "فاتورة مشتريات جديدة"}</h1>
            <p className="text-xs mt-1" style={{ color: "var(--o2-muted)" }}>{isEditing ? `تعديل ${billId}` : "أدخل بيانات الفاتورة"}</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
          style={{ backgroundColor: "#dc2626" }}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isEditing ? "تحديث" : "حفظ"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
            <h3 className="text-sm font-black" style={{ color: "var(--o2-text)" }}>بيانات الفاتورة</h3>

            <div className="relative">
              <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>المورد *</label>
              <input type="text" value={supplierSearch}
                onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); setSelectedSupplier(null); }}
                onFocus={() => setShowSupplierDropdown(true)}
                placeholder="بحث عن مورد..."
                className="w-full px-2 py-1.5 rounded text-xs border"
                style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: errors.supplier ? "#dc2626" : "var(--o2-border)", color: "var(--o2-text)" }} />
              {showSupplierDropdown && filteredSuppliers.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border shadow-xl max-h-48 overflow-y-auto"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                  {filteredSuppliers.map((s) => (
                    <button key={s.id} onClick={() => selectSupplier(s)}
                      className="w-full text-right px-3 py-2 text-xs hover:opacity-80 border-b last:border-0"
                      style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {errors.supplier && <p className="text-[10px] mt-1" style={{ color: "#dc2626" }}>{errors.supplier}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>العملة</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2 py-1.5 rounded text-xs border"
                style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label} ({c.symbol})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>التاريخ *</label>
                <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-xs border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>الاستحقاق *</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-xs border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>الحالة</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded text-xs border"
                style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                <option value="draft">مسودة</option>
                <option value="pending_approval">جاهزة للاعتماد</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>المرجع</label>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder="رقم المرجع..."
                className="w-full px-2 py-1.5 rounded text-xs border"
                style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
            </div>

            <div>
              <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>ملاحظات</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full px-2 py-1.5 rounded text-xs border resize-none"
                style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
            <h3 className="text-sm font-black" style={{ color: "var(--o2-text)" }}>الملخص</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span style={{ color: "var(--o2-muted)" }}>المجموع الفرعي</span><span style={{ color: "var(--o2-text)" }}>{formatBillCurrency(subtotal, currency)}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--o2-muted)" }}>الضريبة</span><span style={{ color: "var(--o2-text)" }}>{formatBillCurrency(taxTotal, currency)}</span></div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--o2-muted)" }}>الخصم</span>
                <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-24 text-left px-2 py-1 rounded text-xs border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>
              <div className="border-t pt-2 flex justify-between font-bold" style={{ borderColor: "var(--o2-border)" }}>
                <span style={{ color: "var(--o2-text)" }}>الإجمالي</span>
                <span style={{ color: "#dc2626" }}>{formatBillCurrency(total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: "var(--o2-surface)" }}>
                    {["#", "الوصف", "الكمية", "سعر الوحدة", "الضريبة %", "الخصم", "الحساب", "المجموع", ""].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-right font-bold" style={{ color: "var(--o2-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const t = calcItemTotals(it);
                    return (
                      <tr key={i} className="border-t" style={{ borderColor: "var(--o2-border)" }}>
                        <td className="px-3 py-2" style={{ color: "var(--o2-muted)" }}>{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                            placeholder="الوصف..."
                            className="w-full px-2 py-1 rounded text-xs border"
                            style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: errors[`item_${i}_desc`] ? "#dc2626" : "var(--o2-border)", color: "var(--o2-text)" }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={it.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value) || 0)}
                            min="0" step="0.01"
                            className="w-16 px-2 py-1 rounded text-xs border text-left"
                            style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={it.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value) || 0)}
                            min="0" step="0.01"
                            className="w-20 px-2 py-1 rounded text-xs border text-left"
                            style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={it.tax_rate} onChange={(e) => updateItem(i, "tax_rate", Number(e.target.value))}
                            className="w-16 px-1 py-1 rounded text-xs border"
                            style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                            {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={it.discount} onChange={(e) => updateItem(i, "discount", Number(e.target.value) || 0)}
                            min="0" step="0.01"
                            className="w-16 px-2 py-1 rounded text-xs border text-left"
                            style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={it.account_id || ""} onChange={(e) => updateItem(i, "account_id", Number(e.target.value) || null)}
                            placeholder="ID"
                            className="w-16 px-2 py-1 rounded text-xs border text-left"
                            style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                        </td>
                        <td className="px-3 py-2 font-bold" style={{ color: "var(--o2-text)" }}>{formatBillCurrency(t.line_total, currency)}</td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => removeItem(i)} className="p-1 rounded hover:opacity-80" style={{ color: "#dc2626" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t" style={{ borderColor: "var(--o2-border)" }}>
              <button onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:opacity-80"
                style={{ color: "var(--o2-brand)" }}>
                <Plus className="w-3.5 h-3.5" /> إضافة صنف
              </button>
            </div>
          </div>

          {errors.items && (
            <p className="text-xs" style={{ color: "#dc2626" }}>{errors.items}</p>
          )}
        </div>
      </div>
    </div>
  );
};
