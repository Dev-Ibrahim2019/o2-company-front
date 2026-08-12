import { useEffect, useRef, useState, useCallback } from "react";
import {
  Save, ArrowRight, Loader2, Banknote, CheckCircle, ReceiptText, Lock, Plus, Trash2,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { salesInvoiceService } from "../../services/salesInvoiceService";
import { useApp } from "../../../store";
import { toast } from "../shared/Toast";
import type { SalesInvoiceItem, SalesInvoicePayment, SalesInvoiceFormData, EntityType } from "../../types/salesInvoice";
import { EMPTY_INVOICE_ITEM, INVOICE_TYPES, PAYMENT_METHODS } from "../../types/salesInvoice";
import { useEntitySearch } from "../../hooks/useEntitySearch";
import { useItemSearch } from "../../hooks/useItemSearch";
import { EntitySelector } from "./EntitySelector";
import { ItemRow } from "./ItemRow";
import { ItemPickerModal, type PickedItem } from "./ItemPickerModal";

interface Props {
  invoiceId?: number;
  onBack: () => void;
  onSaved: () => void;
}

export const SalesInvoiceFormPage = ({ invoiceId, onBack, onSaved }: Props) => {
  const { branches } = useApp();
  const { user } = useAuth();
  const isEdit = !!invoiceId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Role check (Requirement 2) ──
  // Admin (super-admin, admin, branch-manager) → can choose any branch
  // Accountant → branch locked to assigned branch
  const isAdmin = user?.roles?.some((r) => ["super-admin", "admin", "branch-manager"].includes(r));

  // ── Entity Search (Customer/Supplier/Employee) ──
  const entity = useEntitySearch();
  const [customerVat, setCustomerVat] = useState("");

  // ── Item Search (Requirement 3) ──
  const itemSearch = useItemSearch();

  // ── Header Fields ──
  const [invoiceType, setInvoiceType] = useState<string>("simple_invoice");
  const [taxTreatment, setTaxTreatment] = useState<"inclusive" | "exclusive">("exclusive");
  const [branchId, setBranchId] = useState<number | "">("");
  const [currency, setCurrency] = useState("ILS");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [supplyDate, setSupplyDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // ── Items & Payments ──
  const [items, setItems] = useState<SalesInvoiceItem[]>([{ ...EMPTY_INVOICE_ITEM }]);
  const [payments, setPayments] = useState<SalesInvoicePayment[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Refs for keyboard navigation between rows
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Auto-assign branch for non-admin users (Requirement 2) ──
  useEffect(() => {
    if (!isAdmin && user?.branch_id) {
      setBranchId(user.branch_id);
    }
  }, [isAdmin, user?.branch_id]);

  // ── Load existing invoice ──
  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    salesInvoiceService.getOne(invoiceId).then((inv) => {
      setInvoiceType(inv.type || "simple_invoice");
      setTaxTreatment(inv.tax_treatment || "exclusive");
      if (inv.customer) entity.select(inv.customer);
      if (inv.customer_name) {
        entity.select({ id: inv.customer_id!, name: inv.customer_name, phone: inv.customer_phone || null, mobile: null, code: "", balance: 0, is_over_limit: false } as any);
      }
      setBranchId(inv.branch_id);
      setInvoiceNumber(inv.number || "");
      setCurrency(inv.currency || "ILS");
      setInvoiceDate(inv.invoice_date ? inv.invoice_date.split("T")[0] : "");
      setDueDate(inv.due_date || "");
      setSupplyDate(inv.supply_date || "");
      setReferenceNumber(inv.reference_number || "");
      setNotes(inv.notes || "");
      const loadedItems = (inv.items?.length ?? 0) > 0
        ? inv.items!.map((it: any) => ({
            ...it,
            id: it.id,
            item_id: it.item_id,
            item_name: it.item_name || "",
            description: it.description || "",
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            discount: Number(it.discount) || 0,
            tax_rate: Number(it.tax_rate) || 0,
            tax_amount: Number(it.tax_amount) || 0,
            total_before_tax: Number(it.total_before_tax) || 0,
            total: Number(it.total) || 0,
          }))
        : [{ ...EMPTY_INVOICE_ITEM }];
      setItems(loadedItems);
      setPayments((inv.payments || []).map((p: any) => ({
        ...p,
        amount: Number(p.amount) || 0,
        paid_at: p.paid_at || new Date().toISOString().slice(0, 19).replace("T", " "),
      })));
    }).finally(() => setLoading(false));
  }, [invoiceId]);

  // ── Calculations ──
  const recalcItem = useCallback((item: SalesInvoiceItem): SalesInvoiceItem => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const disc = Number(item.discount) || 0;
    const lineSubtotal = qty * price;
    const totalBeforeTax = Math.max(0, lineSubtotal - disc);
    const taxAmt = totalBeforeTax * ((Number(item.tax_rate) || 0) / 100);
    const total = taxTreatment === "inclusive" ? totalBeforeTax : totalBeforeTax + taxAmt;
    return {
      ...item,
      quantity: qty,
      unit_price: price,
      discount: disc,
      tax_rate: Number(item.tax_rate) || 0,
      total_before_tax: Math.round(totalBeforeTax * 10000) / 10000,
      tax_amount: Math.round(taxAmt * 10000) / 10000,
      total: Math.round(total * 10000) / 10000,
    };
  }, [taxTreatment]);

  const subtotal = items.reduce((s, i) => s + (Number(i.total_before_tax) || 0), 0);
  const taxTotal = items.reduce((s, i) => s + (Number(i.tax_amount) || 0), 0);
  const discountTotal = items.reduce((s, i) => s + (Number(i.discount) || 0), 0);
  const total = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = total - totalPaid;
  const symbol: Record<string, string> = { ILS: "₪", JOD: "JD", USD: "$", SAR: "﷼" };
  const sym = symbol[currency] || "₪";

  // ── Item CRUD ──
  const updateItem = useCallback((idx: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      updated[idx] = recalcItem(updated[idx]);
      return updated;
    });
  }, [recalcItem]);

  const removeItem = useCallback((idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, [items.length]);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { ...EMPTY_INVOICE_ITEM }]);
    setTimeout(() => itemInputRefs.current[items.length]?.focus(), 50);
  }, [items.length]);

  // ── Item Selection (from numeric search or modal) ──
  const selectItemForRow = useCallback((idx: number, picked: PickedItem) => {
    const newItem = recalcItem({
      item_id: picked.id,
      item_name: picked.name,
      description: picked.code,
      quantity: 1,
      unit_price: picked.price,
      discount: 0,
      discount_percent: 0,
      tax_rate: 15,
      tax_amount: 0,
      total_before_tax: 0,
      total: 0,
    });
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = newItem;
      return updated;
    });
    itemSearch.closeQuick();
    setTimeout(() => qtyRefs.current[idx]?.focus(), 50);
  }, [recalcItem, itemSearch]);

  // ── Item Input Handler (Requirement 3) ──
  const handleItemInputChange = useCallback((idx: number, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], item_name: value };
      return updated;
    });
    itemSearch.handleInput(idx, value, selectItemForRow);
  }, [itemSearch, selectItemForRow]);

  // ── Quantity Enter → new row (Requirement 4) ──
  const handleQtyEnter = useCallback((idx: number) => {
    setItems((prev) => {
      const newItems = [...prev, { ...EMPTY_INVOICE_ITEM }];
      setTimeout(() => itemInputRefs.current[newItems.length - 1]?.focus(), 50);
      return newItems;
    });
  }, []);

  // ── Item Modal Select ──
  const handleItemModalSelect = useCallback((picked: PickedItem) => {
    selectItemForRow(itemSearch.activeRow, picked);
  }, [itemSearch.activeRow, selectItemForRow]);

  // ── Entity Selection Handler ──
  const handleEntitySelect = useCallback((c: any) => {
    entity.select(c);
    setCustomerVat(c.tax_number || "");
  }, [entity]);

  const handleEntityClear = useCallback(() => {
    entity.clear();
    setCustomerVat("");
  }, [entity]);

  // ── Payment CRUD ──
  const addPayment = useCallback(() => setPayments((prev) => [
    ...prev,
    {
      method: "cash" as const,
      amount: 0,
      paid_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    },
  ]), []);
  const removePayment = useCallback((idx: number) => setPayments((prev) => prev.filter((_, i) => i !== idx)), []);
  const updatePayment = useCallback((idx: number, field: string, value: any) => {
    setPayments((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      return updated;
    });
  }, []);

  // ── Save ──
  const handleSave = useCallback(async (status: "draft" | "awaiting_approval") => {
    if (!branchId) { toast.error("اختر الفرع"); return; }
    if (items.length === 0 || items.every((i) => !i.item_name)) { toast.error("أضف صفاً واحداً على الأقل"); return; }
    setSaving(true);
    try {
      const data: SalesInvoiceFormData = {
        type: invoiceType as any,
        status,
        tax_treatment: taxTreatment,
        entity_type: entity.entityType,
        customer_id: entity.selected?.id || undefined,
        customer_name: entity.selected?.name || undefined,
        customer_phone: entity.selected?.phone || entity.selected?.mobile || undefined,
        customer_vat_number: customerVat || undefined,
        branch_id: branchId as number,
        currency,
        exchange_rate: 1,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        supply_date: supplyDate || undefined,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
        items,
      };
      if (payments.length > 0) data.payments = payments;
      if (isEdit) await salesInvoiceService.update(invoiceId!, data);
      else await salesInvoiceService.create(data);
      onSaved();
    } catch (err: any) {
      toast.error("فشل الحفظ", err?.response?.data?.message);
    } finally {
      setSaving(false);
    }
  }, [branchId, items, invoiceType, taxTreatment, entity, customerVat, currency, invoiceDate, dueDate, supplyDate, referenceNumber, notes, payments, isEdit, invoiceId, onSaved]);

    // ── ESC key returns to list (Requirement: ESC goes back without saving) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!saving) onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack, saving]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--o2-bg)]" dir="rtl">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-20 bg-[var(--o2-surface)] border-b border-[var(--o2-border)]">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-[var(--o2-border)] rounded-lg transition-colors">
              <ArrowRight className="w-5 h-5 text-[var(--o2-muted)]" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[var(--o2-text)]">
                {isEdit ? "تعديل فاتورة مبيعات" : "فاتورة مبيعات جديدة"}
              </h1>
              <p className="text-xs text-[var(--o2-muted)]">Sales Invoice</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onBack} disabled={saving} className="px-5 py-2.5 border border-[var(--o2-border)] rounded-lg text-sm font-medium text-[var(--o2-muted)] hover:bg-[var(--o2-border)] disabled:opacity-50 transition-colors">
              إلغاء
            </button>
            <button onClick={() => handleSave("draft")} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 border border-[var(--o2-border)] rounded-lg text-sm font-medium text-[var(--o2-text)] hover:bg-[var(--o2-border)] disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ
            </button>
            <button onClick={() => handleSave("awaiting_approval")} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--o2-brand)] text-white rounded-lg text-sm font-medium hover:bg-[var(--o2-brand-hover)] disabled:opacity-50 transition-colors shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              تعميد
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* ═══════════════════════════════════════════════════════
            HEADER FIELDS
           ═══════════════════════════════════════════════════════ */}
        <div className="bg-[var(--o2-surface)] rounded-xl border border-[var(--o2-border)] p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">النوع</label>
              <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}
                className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition">
                {INVOICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Tax Treatment - Only for tax invoices */}
            {invoiceType === "tax_invoice" && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">الضريبة</label>
                <div className="flex border border-[var(--o2-border)] rounded-lg overflow-hidden">
                  <button onClick={() => setTaxTreatment("exclusive")}
                    className={`flex-1 py-2.5 text-xs font-bold transition ${taxTreatment === "exclusive" ? "bg-[var(--o2-brand)] text-white" : "bg-[var(--o2-surface-raised)] text-[var(--o2-muted)] hover:bg-[var(--o2-border)]"}`}>
                    غير شامل
                  </button>
                  <button onClick={() => setTaxTreatment("inclusive")}
                    className={`flex-1 py-2.5 text-xs font-bold transition ${taxTreatment === "inclusive" ? "bg-[var(--o2-brand)] text-white" : "bg-[var(--o2-surface-raised)] text-[var(--o2-muted)] hover:bg-[var(--o2-border)]"}`}>
                    شامل الضريبة
                  </button>
                </div>
              </div>
            )}

            {/* Entity (Customer/Supplier/Employee) */}
            <div className={invoiceType === "tax_invoice" ? "col-span-2" : "col-span-3"}>
              <EntitySelector
                entityType={entity.entityType}
                onEntityTypeChange={entity.setEntityType}
                query={entity.query}
                setQuery={entity.setQuery}
                results={entity.results}
                open={entity.open}
                setOpen={entity.setOpen}
                selected={entity.selected}
                onSelect={handleEntitySelect}
                onClear={handleEntityClear}
                wrapRef={entity.wrapRef}
                symbol={sym}
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">رقم الفاتورة</label>
              <div className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-muted)] font-mono">
                {isEdit ? (invoiceNumber || `INV-${String(invoiceId).padStart(4, "0")}`) : "يُولّد تلقائياً"}
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">العملة</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition">
                <option value="ILS">₪ شيكل إسرائيلي (ILS)</option>
                <option value="JOD">JD دينار أردني (JOD)</option>
                <option value="USD">$ دولار أمريكي (USD)</option>
                <option value="SAR">﷼ ريال سعودي (SAR)</option>
              </select>
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">تاريخ الإصدار</label>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition" />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">تاريخ الاستحقاق</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition" />
            </div>

            {/* Supply Date */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">تاريخ التوريد</label>
              <input type="date" value={supplyDate} onChange={(e) => setSupplyDate(e.target.value)}
                className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition" />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">رقم المرجع</label>
              <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="اختياري"
                className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] placeholder:text-[var(--o2-muted)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition" />
            </div>

            {/* Branch (Requirement 2: role-based) */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">
                الفرع
                {!isAdmin && <Lock className="inline w-3 h-3 mr-1 opacity-50" />}
              </label>
              <select
                value={branchId}
                onChange={(e) => isAdmin && setBranchId(Number(e.target.value))}
                disabled={!isAdmin}
                className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">اختر الفرع</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {!isAdmin && (
                <p className="text-[10px] text-[var(--o2-muted)] mt-1">مقيّد بالفرع المعيّن لحسابك</p>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            ITEMS TABLE (Requirements 3 & 4)
           ═══════════════════════════════════════════════════════ */}
        <div className="bg-[var(--o2-surface)] rounded-xl border border-[var(--o2-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--o2-border)] bg-[var(--o2-surface-raised)] flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2 text-sm text-[var(--o2-text)]">
              <ReceiptText className="w-5 h-5 text-[var(--o2-brand-text)]" />
              الأصناف
              <span className="text-xs font-normal text-[var(--o2-muted)] mr-2">
                ({items.filter((i) => i.item_name).length} صنف)
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--o2-surface-raised)] border-b border-[var(--o2-border)]">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--o2-muted)] w-10">#</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--o2-muted)] min-w-[220px]">الصنف</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--o2-muted)] w-28">الكمية</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--o2-muted)] w-28">سعر الوحدة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--o2-muted)] w-24">Disc</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--o2-muted)] w-32">قبل الضريبة</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--o2-muted)] w-24">الضريبة %</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--o2-muted)] w-28">ضريبة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--o2-muted)] w-28">{sym} الإجمالي</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--o2-border)]">
                {items.map((item, idx) => (
                  <ItemRow
                    key={idx}
                    item={item}
                    index={idx}
                    showDelete={items.length > 1}
                    onItemInputMount={(el) => { itemInputRefs.current[idx] = el; }}
                    onQtyMount={(el) => { qtyRefs.current[idx] = el; }}
                    onItemInputChange={handleItemInputChange}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    onQtyEnter={handleQtyEnter}
                    symbol={sym}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Results Dropdown */}
          {itemSearch.quickOpenIdx !== null && itemSearch.quickResults.length > 0 && (
            <div className="mx-6 mb-3 bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
              {itemSearch.quickResults.map((qi) => (
                <button
                  key={qi.id}
                  onClick={() => selectItemForRow(itemSearch.quickOpenIdx!, qi)}
                  className="w-full text-right px-4 py-2.5 hover:bg-[var(--o2-border)] text-sm flex items-center justify-between transition-colors border-b border-[var(--o2-border)] last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-[var(--o2-text)]">{qi.name}</span>
                    <span className="text-xs text-[var(--o2-muted)] font-mono">{qi.code}</span>
                  </div>
                  <span className="font-bold text-[var(--o2-brand-text)]">{sym} {Number(qi.price || 0).toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Add row button */}
          <div className="px-6 py-3 border-t border-[var(--o2-border)] bg-[var(--o2-surface-raised)]">
            <button onClick={addItem}
              className="flex items-center gap-1.5 text-[var(--o2-brand-text)] hover:text-[var(--o2-text)] text-sm font-medium hover:bg-[var(--o2-border)] px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              إضافة صنف
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            FOOTER: Payments + Totals
           ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="bg-[var(--o2-surface)] rounded-xl border border-[var(--o2-border)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2 text-sm text-[var(--o2-text)]">
                <Banknote className="w-5 h-5 text-green-500" />
                طرق الدفع
              </h2>
              <button onClick={addPayment} className="flex items-center gap-1.5 text-[var(--o2-brand-text)] hover:text-[var(--o2-text)] text-sm font-medium hover:bg-[var(--o2-border)] px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                إضافة دفعة
              </button>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-[var(--o2-muted)] text-sm">لم تُضاف أي دفعة بعد</div>
            ) : (
              <div className="space-y-3">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-[var(--o2-surface-raised)] rounded-lg">
                    <select value={p.method} onChange={(e) => updatePayment(idx, "method", e.target.value)}
                      className="bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] outline-none w-32">
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <input type="number" value={p.amount || ""} onChange={(e) => updatePayment(idx, "amount", Number(e.target.value))}
                      placeholder="المبلغ" min="0.01" step="0.01"
                      className="flex-1 bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] placeholder:text-[var(--o2-muted)] focus:ring-2 focus:ring-[var(--o2-brand)] outline-none no-spinner" />
                    {(p.method === "credit_card" || p.method === "app") && (
                      <input type="text" value={p.reference_number || ""} onChange={(e) => updatePayment(idx, "reference_number", e.target.value)}
                        placeholder="رقم المرجع"
                        className="flex-1 bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] placeholder:text-[var(--o2-muted)] focus:ring-2 focus:ring-[var(--o2-brand)] outline-none" />
                    )}
                    <button onClick={() => removePayment(idx)} className="p-2 text-[var(--o2-muted)] hover:text-[var(--o2-brand-text)] hover:bg-[var(--o2-brand-soft)] rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-[var(--o2-surface)] rounded-xl border border-[var(--o2-border)] p-6">
            <h2 className="font-bold text-sm text-[var(--o2-text)] mb-4">الإجماليات</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[var(--o2-muted)]">إجمالي فرعي</span>
                <span className="text-sm font-bold text-[var(--o2-text)]">{sym} {subtotal.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between items-center py-2 text-[var(--o2-brand-text)]">
                  <span className="text-sm font-medium">الخصم</span>
                  <span className="text-sm font-bold">-{sym} {discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[var(--o2-muted)]">إجمالي الضريبة</span>
                <span className="text-sm font-bold text-[var(--o2-text)]">{sym} {taxTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-[var(--o2-border)] pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-[var(--o2-text)]">الإجمالي</span>
                <span className="text-xl font-bold text-[var(--o2-text)]">{sym} {total.toFixed(2)}</span>
              </div>
              {totalPaid > 0 && (
                <>
                  <div className="flex justify-between items-center py-2 text-green-500">
                    <span className="text-sm font-medium">المدفوع</span>
                    <span className="text-sm font-bold">{sym} {totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[var(--o2-border)] pt-3 flex justify-between items-center text-[var(--o2-brand-text)]">
                    <span className="text-base font-bold">المتبقي</span>
                    <span className="text-lg font-bold">{sym} {remaining.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="bg-[var(--o2-surface)] rounded-xl border border-[var(--o2-border)] p-6">
          <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">ملاحظات</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات إضافية على الفاتورة..." rows={3}
            className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--o2-text)] placeholder:text-[var(--o2-muted)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition resize-none" />
        </div>
      </div>

      {/* ── Item Picker Modal (Requirement 3) ── */}
      <ItemPickerModal
        open={itemSearch.modalOpen}
        initialQuery={itemSearch.modalQuery}
        onSelect={(item) => { handleItemModalSelect(item); itemSearch.closeModal(); }}
        onClose={itemSearch.closeModal}
      />
    </div>
  );
};
