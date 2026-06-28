import { useCallback, useEffect, useState } from "react";
import {
  Save, ArrowRight, Plus, Trash2, Search, Loader2, Banknote,
  ReceiptText, CheckCircle, FileDown,
} from "lucide-react";
import { financialInvoiceService } from "../../services/financialInvoiceService";
import { useApp } from "../../../store";
import type {
  FinancialInvoiceFormData,
  FinancialInvoiceItem,
  PaymentEntry,
  EntityType,
  InvoiceType,
  PaymentMethodType,
} from "../../types/financialInvoice";
import {
  EMPTY_INVOICE_ITEM, CURRENCIES, DEFAULT_CURRENCY,
  INVOICE_TYPES, PAYMENT_METHODS,
} from "../../types/financialInvoice";

interface Props {
  invoiceId?: number;
  onBack: () => void;
  onSaved: () => void;
}

export const FinancialInvoiceForm = ({ invoiceId, onBack, onSaved }: Props) => {
  const { branches } = useApp();
  const isEdit = !!invoiceId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [invoiceType, setInvoiceType] = useState<InvoiceType>("فاتورة ضريبية");
  const [entityType, setEntityType] = useState<EntityType | "">("");
  const [entityId, setEntityId] = useState<number | "">("");
  const [entityName, setEntityName] = useState("");
  const [branchId, setBranchId] = useState<number | "">("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [expectedPaymentDate, setExpectedPaymentDate] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<FinancialInvoiceItem[]>([{ ...EMPTY_INVOICE_ITEM }]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  const [entitySearch, setEntitySearch] = useState("");
  const [entitySearchResults, setEntitySearchResults] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemSearchResults, setItemSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    financialInvoiceService.getOne(invoiceId).then((inv) => {
      setInvoiceType((inv.type as InvoiceType) || "فاتورة ضريبية");
      setEntityType((inv.entity_type as EntityType) || "");
      setEntityId(inv.entity_id || "");
      setEntityName(inv.entity_name || "");
      setBranchId(inv.branch_id);
      setCurrency(inv.currency || DEFAULT_CURRENCY);
      setInvoiceDate(inv.invoice_date ? inv.invoice_date.split("T")[0] : "");
      setDueDate(inv.due_date ? inv.due_date.split("T")[0] : "");
      setDeliveryDate(inv.delivery_date ? inv.delivery_date.split("T")[0] : "");
      setExpectedPaymentDate(inv.expected_payment_date ? inv.expected_payment_date.split("T")[0] : "");
      setNotes(inv.notes || "");
      setItems(inv.items.length > 0 ? inv.items : [{ ...EMPTY_INVOICE_ITEM }]);
      setPayments(inv.payments || []);
    }).finally(() => setLoading(false));
  }, [invoiceId]);

  const recalcItem = (item: FinancialInvoiceItem): FinancialInvoiceItem => {
    const qty = item.quantity || 0;
    const price = item.unit_price || 0;
    const disc = item.discount || 0;
    const totalBeforeTax = qty * price - disc;
    const taxAmt = totalBeforeTax * (item.tax_rate / 100);
    return { ...item, total_before_tax: totalBeforeTax, tax_amount: taxAmt, total: totalBeforeTax + taxAmt };
  };

  const subtotal = items.reduce((s, i) => s + i.total_before_tax, 0);
  const taxTotal = items.reduce((s, i) => s + i.tax_amount, 0);
  const total = items.reduce((s, i) => s + i.total, 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = total - totalPaid;

  const searchEntities = useCallback(async (q: string) => {
    if (!q || q.length < 1 || !entityType) { setEntitySearchResults([]); return; }
    try {
      if (/^\d+$/.test(q)) {
        const r = await financialInvoiceService.searchEntitiesById(entityType, Number(q));
        setEntitySearchResults(r ? [r] : []);
      } else {
        let r: any[] = [];
        if (entityType === "customer") r = await financialInvoiceService.searchCustomers(q);
        else if (entityType === "employee") r = await financialInvoiceService.searchEmployees(q);
        else if (entityType === "supplier") r = await financialInvoiceService.searchSuppliers(q);
        setEntitySearchResults(Array.isArray(r) ? r : []);
      }
    } catch { setEntitySearchResults([]); }
  }, [entityType]);

  useEffect(() => {
    const t = setTimeout(() => searchEntities(entitySearch), 300);
    return () => clearTimeout(t);
  }, [entitySearch, searchEntities]);

  const searchItems = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setItemSearchResults([]); return; }
    try {
      const r = await financialInvoiceService.searchItems(q);
      setItemSearchResults(Array.isArray(r) ? r : []);
    } catch { setItemSearchResults([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchItems(itemSearch), 300);
    return () => clearTimeout(t);
  }, [itemSearch, searchItems]);

  const addItem = () => setItems([...items, { ...EMPTY_INVOICE_ITEM }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    updated[idx] = recalcItem(updated[idx]);
    setItems(updated);
  };
  const incrementQty = (idx: number) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
    updated[idx] = recalcItem(updated[idx]);
    setItems(updated);
  };
  const decrementQty = (idx: number) => {
    const updated = [...items];
    if (updated[idx].quantity > 1) {
      updated[idx] = { ...updated[idx], quantity: updated[idx].quantity - 1 };
      updated[idx] = recalcItem(updated[idx]);
      setItems(updated);
    }
  };

  const selectItemFromSearch = (item: any) => {
    const existingIdx = items.findIndex(i => i.item_id === item.id);
    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
      updated[existingIdx] = recalcItem(updated[existingIdx]);
      setItems(updated);
    } else {
      const emptyIdx = items.findIndex(i => !i.item_name);
      const newItem = recalcItem({ item_id: item.id, item_name: item.name, unit_price: item.price || 0, quantity: 1, discount: 0, tax_rate: 15, total_before_tax: 0, tax_amount: 0, total: 0 });
      if (emptyIdx >= 0) {
        const updated = [...items];
        updated[emptyIdx] = newItem;
        setItems(updated);
      } else {
        setItems([...items, newItem]);
      }
    }
    setItemSearch("");
    setItemSearchResults([]);
  };

  const addPayment = () => setPayments([...payments, { method: "cash", amount: 0 }]);
  const removePayment = (idx: number) => setPayments(payments.filter((_, i) => i !== idx));
  const updatePayment = (idx: number, field: string, value: any) => {
    const updated = [...payments];
    (updated[idx] as any)[field] = value;
    setPayments(updated);
  };

  const handleSave = async (status: "draft" | "pending") => {
    if (!branchId) { alert("اختر الفرع"); return; }
    if (items.length === 0 || items.every(i => !i.item_name)) { alert("أضف صفاً واحداً على الأقل"); return; }
    setSaving(true);
    try {
      const data: FinancialInvoiceFormData = {
        type: invoiceType,
        entity_type: entityType || undefined,
        entity_id: entityId || undefined,
        branch_id: branchId as number,
        currency,
        subtotal,
        tax_total: taxTotal,
        discount: 0,
        total,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        delivery_date: deliveryDate || undefined,
        expected_payment_date: expectedPaymentDate || undefined,
        notes,
        items,
        payments: payments.length > 0 ? payments : undefined,
      };
      if (isEdit) await financialInvoiceService.update(invoiceId!, data);
      else await financialInvoiceService.create(data);
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل الحفظ");
    } finally { setSaving(false); }
  };

  const getSymbol = (c?: string) => {
    const map: Record<string, string> = { ILS: "₪", JOD: "JD", USD: "$" };
    return map[c || currency] || "₪";
  };
  const symbol = getSymbol();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowRight className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">
                {isEdit ? "تعديل فاتورة المبيعات" : "فاتورة مبيعات جديدة"}
              </h1>
              <p className="text-xs text-gray-400">Financial Invoice</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onBack} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              إلغاء
            </button>
            <button onClick={() => handleSave("draft")} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ
            </button>
            <button onClick={() => handleSave("pending")} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              تعميد
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Header Fields */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500 uppercase tracking-wide">النوع</label>
              <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as InvoiceType)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                {INVOICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500 uppercase tracking-wide">إلى</label>
              <div className="flex gap-1.5">
                <select value={entityType} onChange={(e) => { setEntityType(e.target.value as EntityType | ""); setEntityId(""); setEntityName(""); setEntitySearch(""); }} className="w-24 border border-gray-200 rounded-lg px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">—</option>
                  <option value="customer">عميل</option>
                  <option value="employee">موظف</option>
                  <option value="supplier">مورد</option>
                </select>
                <div className="relative flex-1">
                  <input type="text" value={entityName || entitySearch} onChange={(e) => { setEntitySearch(e.target.value); setEntityName(""); setEntityId(""); }} disabled={!entityType} placeholder={entityType ? "رقم أو اسم..." : "اختر النوع"} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400 transition" />
                  {entitySearchResults.length > 0 && (
                    <div className="absolute z-30 w-full bg-white border rounded-xl mt-1 shadow-xl max-h-48 overflow-y-auto">
                      {entitySearchResults.map((e: any) => (
                        <button key={e.id} onClick={() => { setEntityId(e.id); setEntityName(e.name || e.full_name); setEntitySearch(""); setEntitySearchResults([]); }} className="w-full text-right px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center justify-between transition-colors">
                          <span className="font-medium">{e.name || e.full_name}</span>
                          <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded">#{e.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500 uppercase tracking-wide">رقم الفاتورة</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 font-mono">
                {isEdit ? `INV-${String(invoiceId).padStart(4, "0")}` : "يُولّد تلقائياً"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500 uppercase tracking-wide">العملة</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                {Object.values(CURRENCIES).map((c) => <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500 uppercase tracking-wide">تاريخ الإصدار</label>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500 uppercase tracking-wide">تاريخ الاستحقاق</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500 uppercase tracking-wide">تاريخ التوريد</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500 uppercase tracking-wide">تاريخ الدفع المتوقع</label>
              <input type="date" value={expectedPaymentDate} onChange={(e) => setExpectedPaymentDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-500 uppercase tracking-wide">الفرع</label>
              <select value={branchId} onChange={(e) => setBranchId(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">اختر الفرع</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2 text-sm text-gray-700">
              <ReceiptText className="w-5 h-5 text-blue-500" />
              الأصناف
              <span className="text-xs font-normal text-gray-400 mr-2">({items.filter(i => i.item_name).length} صنف)</span>
            </h2>
            <button onClick={addItem} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              إضافة صنف
            </button>
          </div>

          {/* Item Search */}
          <div className="px-6 py-3 border-b bg-white">
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="بحث عن صنف من القائمة..." className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
              {itemSearchResults.length > 0 && (
                <div className="absolute z-30 w-full bg-white border rounded-xl mt-1 shadow-xl max-h-56 overflow-y-auto">
                  {itemSearchResults.map((item: any) => (
                    <button key={item.id} onClick={() => selectItemFromSearch(item)} className="w-full text-right px-4 py-3 hover:bg-blue-50 text-sm flex items-center justify-between transition-colors border-b last:border-0">
                      <div>
                        <span className="font-medium text-gray-800">{item.name}</span>
                        {item.code && <span className="text-xs text-gray-400 mr-2">({item.code})</span>}
                      </div>
                      <span className="font-bold text-blue-600">{symbol} {item.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-10">#</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 min-w-[200px]">الصنف (الوصف)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-32">الكمية</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-28">سعر الوحدة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-24">Disc</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-32">المبلغ بدون ضريبة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-28">الحساب</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-20">الضريبة %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-32">Branches</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-28">{symbol}</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-center text-xs font-medium text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <input type="text" value={item.item_name} onChange={(e) => updateItem(idx, "item_name", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="اسم الصنف" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => decrementQty(idx)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600 flex items-center justify-center transition-colors">-</button>
                        <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="w-14 border border-gray-200 rounded-lg px-1 py-2 text-sm text-center font-medium focus:ring-2 focus:ring-blue-500 outline-none" min="0.01" step="0.01" />
                        <button onClick={() => incrementQty(idx)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600 flex items-center justify-center transition-colors">+</button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" min="0" step="0.01" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" value={item.discount} onChange={(e) => updateItem(idx, "discount", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" min="0" step="0.01" />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50/50">{item.total_before_tax.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <select className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option>حساب عام</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" value={item.tax_rate} onChange={(e) => updateItem(idx, "tax_rate", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none" min="0" max="100" />
                    </td>
                    <td className="px-4 py-3">
                      <select value={item.branch_id || ""} onChange={(e) => updateItem(idx, "branch_id", Number(e.target.value) || undefined)} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">—</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-600 bg-blue-50/30">{item.total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer: Payments + Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2 text-sm text-gray-700">
                <Banknote className="w-5 h-5 text-green-500" />
                طرق الدفع
              </h2>
              <button onClick={addPayment} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                إضافة دفعة
              </button>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">لم تُضاف أي دفعة بعد</div>
            ) : (
              <div className="space-y-3">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <select value={p.method} onChange={(e) => updatePayment(idx, "method", e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-32">
                      {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <input type="number" value={p.amount || ""} onChange={(e) => updatePayment(idx, "amount", Number(e.target.value))} placeholder="المبلغ" className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" min="0" step="0.01" />
                    {(p.method === "credit_card" || p.method === "app") && (
                      <input type="text" value={p.reference_number || ""} onChange={(e) => updatePayment(idx, "reference_number", e.target.value)} placeholder="رقم المرجع" className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    )}
                    <button onClick={() => removePayment(idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-bold text-sm text-gray-700 mb-4">الإجماليات</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">إجمالي فرعي</span>
                <span className="text-sm font-bold text-gray-700">{symbol} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">إجمالي الضريبة</span>
                <span className="text-sm font-bold text-gray-700">{symbol} {taxTotal.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-gray-800">الإجمالي</span>
                <span className="text-xl font-bold text-gray-900">{symbol} {total.toFixed(2)}</span>
              </div>
              {totalPaid > 0 && (
                <>
                  <div className="flex justify-between items-center py-2 text-green-600">
                    <span className="text-sm font-medium">المدفوع</span>
                    <span className="text-sm font-bold">{symbol} {totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center text-red-600">
                    <span className="text-base font-bold">المتبقي</span>
                    <span className="text-lg font-bold">{symbol} {remaining.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
