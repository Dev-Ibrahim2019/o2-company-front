import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X, Loader2, Save, AlertTriangle, Zap, Receipt, Banknote,
  ArrowRight, Calendar, CreditCard, FileText, Hash,
} from "lucide-react";
import { voucherService } from "../../services/voucherService";
import { supplierService } from "../../services/supplierService";
import { useApp } from "../../../store";
import { toast } from "../shared/Toast";
import type { VoucherFormData } from "../../types/voucher";
import { VOUCHER_PAYMENT_METHODS, VOUCHER_CURRENCIES, formatVoucherCurrency } from "../../types/voucher";

interface Props {
  editingId?: number;
  onBack: () => void;
  onSaved: () => void;
}

interface InvoiceRow {
  id: number;
  number: string;
  invoice_date: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  allocated: number;
}

export const SupplierPaymentVoucherDrawer: React.FC<Props> = ({ editingId, onBack, onSaved }) => {
  const { currentUser } = useApp();
  const isEditing = !!editingId;

  const [saving, setSaving] = useState(false);
  const [loadingVoucher, setLoadingVoucher] = useState(isEditing);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [supplierBalance, setSupplierBalance] = useState<number | null>(null);
  const [outstandingBalance, setOutstandingBalance] = useState<number | null>(null);

  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [currency, setCurrency] = useState("ILS");
  const [amount, setAmount] = useState(0);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [additionalExpenses, setAdditionalExpenses] = useState(0);

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
    if (!editingId) return;
    (async () => {
      setLoadingVoucher(true);
      try {
        const v = await voucherService.getOne(editingId);
        setSelectedSupplier({ id: v.entity_id, name: v.entity_name });
        setSupplierSearch(v.entity_name || "");
        setVoucherDate(v.voucher_date);
        setPaymentMethodId(v.payment_method_id);
        setCurrency(v.currency);
        setAmount(Number(v.amount));
        setReferenceNumber(v.reference_number || "");
        setNotes(v.notes || "");
        if (v.allocations?.length) {
          setInvoices(
            v.allocations.map((a) => ({
              id: a.invoice_id,
              number: a.invoice?.number || String(a.invoice_id),
              invoice_date: a.invoice?.invoice_date || "",
              total: Number(a.invoice?.total || 0),
              paid_amount: Number(a.invoice?.paid_amount || 0),
              remaining_amount: Number(a.invoice?.remaining_amount || 0),
              allocated: Number(a.amount),
            }))
          );
        }
      } catch { /* ignore */ }
      setLoadingVoucher(false);
    })();
  }, [editingId]);

  const loadSupplierBalance = useCallback(async (supplierId: number) => {
    try {
      const res = await supplierService.get(supplierId);
      const s = res.data?.supplier ?? res.data ?? {};
      setSupplierBalance(Number(s.balance ?? 0));
      setOutstandingBalance(Number(s.balance ?? 0));
    } catch {
      setSupplierBalance(null);
      setOutstandingBalance(null);
    }
  }, []);

  const loadInvoices = useCallback(async (supplierId: number) => {
    setLoadingInvoices(true);
    try {
      const raw = await voucherService.getEntityInvoices("supplier", supplierId);
      const list = Array.isArray(raw) ? raw : [];
      const mapped: InvoiceRow[] = list.map((inv: any) => ({
        id: inv.id,
        number: inv.number,
        invoice_date: typeof inv.invoice_date === "string" ? inv.invoice_date.split("T")[0] : inv.invoice_date,
        total: Number(inv.total || 0),
        paid_amount: Number(inv.paid_amount || 0),
        remaining_amount: Number(inv.remaining_amount || inv.total - (inv.paid_amount || 0)),
        allocated: 0,
      }));
      setInvoices(mapped);
    } catch { setInvoices([]); }
    setLoadingInvoices(false);
  }, []);

  const selectSupplier = (s: any) => {
    setSelectedSupplier(s);
    setSupplierSearch(s.name);
    setShowSupplierDropdown(false);
    loadSupplierBalance(s.id);
    loadInvoices(s.id);
  };

  const clearSupplier = () => {
    setSelectedSupplier(null);
    setSupplierSearch("");
    setSupplierBalance(null);
    setOutstandingBalance(null);
    setInvoices([]);
  };

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers.slice(0, 10);
    const q = supplierSearch.toLowerCase();
    return suppliers.filter((s) => s.name?.toLowerCase().includes(q) || s.phone?.includes(q)).slice(0, 10);
  }, [supplierSearch, suppliers]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedSupplier) errs.supplier = "اختر المورد";
    if (amount <= 0) errs.amount = "المبلغ يجب أن يكون أكبر من صفر";
    if (!voucherDate) errs.date = "اختر التاريخ";
    const totalAllocated = invoices.reduce((s, inv) => s + inv.allocated, 0);
    if (totalAllocated > amount) errs.allocated = "إجمالي التخصيص يتجاوز مبلغ السند";
    if (totalAllocated <= 0 && amount > 0) errs.allocated = "يجب تخصيص مبلغ واحد على الأقل";
    invoices.forEach((inv) => {
      if (inv.allocated < 0) errs[`inv_${inv.id}`] = "لا يمكن أن يكون المبلغ سالباً";
      if (inv.allocated > inv.remaining_amount) errs[`inv_${inv.id}`] = "يتجاوز المبلغ المتبقي للفاتورة";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [selectedSupplier, amount, voucherDate, invoices]);

  const handleAutoAllocate = useCallback(() => {
    const sorted = [...invoices].sort(
      (a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
    );
    let remaining = amount;
    const allocMap = new Map<number, number>();
    for (const inv of sorted) {
      if (remaining <= 0) { allocMap.set(inv.id, 0); continue; }
      const alloc = Math.min(inv.remaining_amount, remaining);
      allocMap.set(inv.id, alloc);
      remaining -= alloc;
    }
    setInvoices((prev) => prev.map((p) => ({ ...p, allocated: allocMap.get(p.id) ?? 0 })));
  }, [invoices, amount]);

  const totalAllocated = useMemo(() => invoices.reduce((s, inv) => s + inv.allocated, 0), [invoices]);
  const remainingUnallocated = useMemo(() => Math.max(0, amount - totalAllocated), [amount, totalAllocated]);
  const finalTotal = useMemo(() => amount + additionalExpenses, [amount, additionalExpenses]);

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const allocations = invoices.filter((inv) => inv.allocated > 0).map((inv) => ({
        invoice_id: inv.id,
        amount: inv.allocated,
      }));
      const payload: VoucherFormData = {
        type: "payment",
        entity_type: "supplier",
        entity_id: selectedSupplier.id,
        entity_name: selectedSupplier.name,
        amount,
        currency,
        payment_method_id: paymentMethodId,
        reference_number: referenceNumber || undefined,
        branch_id: currentUser?.branchId ? Number(currentUser.branchId) : 1,
        voucher_date: voucherDate,
        status: "active",
        notes: notes || undefined,
        allocations,
      };
      if (isEditing && editingId) {
        await voucherService.update(editingId, payload);
        toast.success("تم تحديث سند الصرف");
      } else {
        const result = await voucherService.create(payload);
        if (result?.id) { await voucherService.approve(result.id); }
        toast.success("تم إنشاء سند الصرف وتفعيله");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--o2-bg)" }} dir="rtl">
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-40 border-b shrink-0" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg transition" style={{ color: "var(--o2-muted)" }}>
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#dc262615" }}>
                <Banknote className="w-5 h-5" style={{ color: "#dc2626" }} />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ color: "var(--o2-text)" }}>
                  {isEditing ? `تعديل ${editingId}` : "سند صرف مورد جديد"}
                </h1>
                <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>دفع فواتير المشتريات للموردين</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="px-4 py-2 rounded-lg text-xs font-bold border"
              style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>إلغاء</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white disabled:opacity-50"
              style={{ backgroundColor: "#dc2626" }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isEditing ? "تحديث السند" : "حفظ السند"}
            </button>
          </div>
        </div>
      </div>

      {loadingVoucher ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--o2-muted)" }} /></div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ═══════════════════════════════════════════════
                  RIGHT COLUMN — Voucher Information
              ═══════════════════════════════════════════════ */}
              <div className="space-y-5">

                {/* Supplier Selection */}
                <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold" style={{ color: "var(--o2-text)" }}>المورد</h3>
                    {selectedSupplier && (
                      <button onClick={clearSupplier} className="text-[10px] font-bold px-2 py-1 rounded" style={{ color: "var(--o2-brand)" }}>
                        تغيير المورد
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={showSupplierDropdown ? supplierSearch : (selectedSupplier?.name || "")}
                      onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); }}
                      onFocus={() => { if (!selectedSupplier) { setSupplierSearch(""); setShowSupplierDropdown(true); } }}
                      placeholder="ابحث عن مورد..."
                      className="w-full px-3 py-2.5 rounded-lg text-sm border"
                      style={{
                        backgroundColor: "var(--o2-surface-raised)",
                        borderColor: errors.supplier ? "#dc2626" : "var(--o2-border)",
                        color: "var(--o2-text)",
                      }}
                    />
                    {errors.supplier && <p className="text-[10px] mt-1" style={{ color: "#dc2626" }}>{errors.supplier}</p>}
                    {showSupplierDropdown && (
                      <div className="absolute top-full mt-1 w-full rounded-lg border shadow-xl z-50 max-h-56 overflow-y-auto"
                        style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
                        {loadingSuppliers ? (
                          <div className="px-3 py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" style={{ color: "var(--o2-muted)" }} /></div>
                        ) : filteredSuppliers.length === 0 ? (
                          <div className="px-3 py-2 text-xs" style={{ color: "var(--o2-muted)" }}>لا توجد نتائج</div>
                        ) : filteredSuppliers.map((s) => (
                          <button key={s.id} onClick={() => selectSupplier(s)}
                            className="w-full px-3 py-2.5 text-right text-xs hover:opacity-80 border-b last:border-0"
                            style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                            <span className="font-bold">{s.name}</span>
                            {s.code && <span className="mr-2 text-[10px]" style={{ color: "var(--o2-muted)" }}>{s.code}</span>}
                            {s.phone && <span className="mr-2 text-[10px]" style={{ color: "var(--o2-muted)" }}>{s.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedSupplier && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                        <p className="text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>الرصيد الحالي</p>
                        <p className="text-sm font-black" style={{ color: supplierBalance !== null && supplierBalance > 0 ? "#dc2626" : "#16a34a" }}>
                          {supplierBalance !== null ? formatVoucherCurrency(supplierBalance, currency) : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                        <p className="text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>الرصيد المستحق</p>
                        <p className="text-sm font-black" style={{ color: outstandingBalance !== null && outstandingBalance > 0 ? "#dc2626" : "#16a34a" }}>
                          {outstandingBalance !== null ? formatVoucherCurrency(outstandingBalance, currency) : "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voucher Details */}
                <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
                  <h3 className="text-sm font-bold mb-4" style={{ color: "var(--o2-text)" }}>بيانات السند</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>
                          <Calendar className="w-3 h-3" /> التاريخ *
                        </label>
                        <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg text-sm border"
                          style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: errors.date ? "#dc2626" : "var(--o2-border)", color: "var(--o2-text)" }} />
                        {errors.date && <p className="text-[10px] mt-1" style={{ color: "#dc2626" }}>{errors.date}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>
                          <CreditCard className="w-3 h-3" /> طريقة الدفع
                        </label>
                        <select value={paymentMethodId || ""} onChange={(e) => setPaymentMethodId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2.5 rounded-lg text-sm border"
                          style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                          <option value="">اختر...</option>
                          {VOUCHER_PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>
                          <Banknote className="w-3 h-3" /> العملة
                        </label>
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg text-sm border"
                          style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                          {VOUCHER_CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label} ({c.symbol})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>
                          <Hash className="w-3 h-3" /> المبلغ المدفوع *
                        </label>
                        <input type="number" min="0" step="0.01" value={amount || ""}
                          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2.5 rounded-lg text-sm font-bold border"
                          style={{
                            backgroundColor: "var(--o2-surface-raised)",
                            borderColor: errors.amount ? "#dc2626" : "var(--o2-border)",
                            color: "#dc2626",
                          }} />
                        {errors.amount && <p className="text-[10px] mt-1" style={{ color: "#dc2626" }}>{errors.amount}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>
                        <FileText className="w-3 h-3" /> رقم المرجع
                      </label>
                      <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="رقم الشيك أو التحويل..."
                        className="w-full px-3 py-2.5 rounded-lg text-sm border"
                        style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>
                        <FileText className="w-3 h-3" /> ملاحظات
                      </label>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="أدخل ملاحظات السند..."
                        className="w-full px-3 py-2.5 rounded-lg text-sm border resize-none"
                        style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
                  <h3 className="text-sm font-bold mb-4" style={{ color: "var(--o2-text)" }}>إجماليات السند</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--o2-border)" }}>
                      <span className="text-xs" style={{ color: "var(--o2-muted)" }}>مبلغ السند</span>
                      <span className="text-sm font-bold" style={{ color: "var(--o2-text)" }}>{formatVoucherCurrency(amount, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--o2-border)" }}>
                      <span className="text-xs" style={{ color: "var(--o2-muted)" }}>المبلغ المخصّص</span>
                      <span className="text-sm font-bold" style={{ color: "#16a34a" }}>{formatVoucherCurrency(totalAllocated, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--o2-border)" }}>
                      <span className="text-xs" style={{ color: "var(--o2-muted)" }}>المبلغ غير المخصّص</span>
                      <span className="text-sm font-bold" style={{ color: remainingUnallocated > 0 ? "#d97706" : "var(--o2-text)" }}>
                        {formatVoucherCurrency(remainingUnallocated, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--o2-border)" }}>
                      <span className="text-xs" style={{ color: "var(--o2-muted)" }}>مصاريف إضافية</span>
                      <input type="number" min="0" step="0.01" value={additionalExpenses || ""}
                        onChange={(e) => setAdditionalExpenses(parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 rounded text-xs border text-right font-bold"
                        style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                    </div>
                    <div className="flex items-center justify-between py-3 rounded-lg px-3" style={{ backgroundColor: "var(--o2-surface-raised)" }}>
                      <span className="text-xs font-bold" style={{ color: "var(--o2-muted)" }}>الإجمالي النهائي</span>
                      <span className="text-lg font-black" style={{ color: "#dc2626" }}>{formatVoucherCurrency(finalTotal, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════
                  LEFT COLUMN — Purchase Invoices
              ═══════════════════════════════════════════════ */}
              <div>
                <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
                  <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--o2-border)" }}>
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" style={{ color: "var(--o2-brand)" }} />
                      <h3 className="text-sm font-bold" style={{ color: "var(--o2-text)" }}>فواتير المشتريات المستحقة</h3>
                      {!loadingInvoices && invoices.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: "var(--o2-brand)15", color: "var(--o2-brand)" }}>
                          {invoices.filter((i) => i.allocated > 0).length}/{invoices.length}
                        </span>
                      )}
                    </div>
                    {selectedSupplier && invoices.length > 0 && (
                      <button onClick={handleAutoAllocate}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors hover:opacity-80"
                        style={{ borderColor: "var(--o2-brand)", color: "var(--o2-brand)" }}>
                        <Zap className="w-3.5 h-3.5" /> توزيع تلقائي
                      </button>
                    )}
                  </div>

                  {!selectedSupplier ? (
                    <div className="py-16 text-center">
                      <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "var(--o2-surface-raised)" }}>
                        <Banknote className="w-7 h-7" style={{ color: "var(--o2-muted)" }} />
                      </div>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--o2-text)" }}>اختر المورد أولاً</p>
                      <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>سيتم تحميل الفواتير المستحقة تلقائياً</p>
                    </div>
                  ) : loadingInvoices ? (
                    <div className="py-16 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "var(--o2-brand)" }} />
                      <p className="text-xs" style={{ color: "var(--o2-muted)" }}>جاري تحميل الفواتير...</p>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#16a34a15" }}>
                        <Receipt className="w-7 h-7" style={{ color: "#16a34a" }} />
                      </div>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--o2-text)" }}>لا توجد فواتير مستحقة</p>
                      <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>جميع فواتير هذا المورد مدفوعة بالكامل</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ backgroundColor: "var(--o2-surface-raised)" }}>
                            {["رقم الفاتورة", "التاريخ", "الإجمالي", "المدفوع", "المتبقي", "المبلغ للدفع"].map((h) => (
                              <th key={h} className="px-3 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: "var(--o2-muted)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv.id}
                              className="border-t transition-colors"
                              style={{
                                borderColor: "var(--o2-border)",
                                backgroundColor: inv.allocated > 0 ? "var(--o2-brand)08" : "transparent",
                              }}>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  {inv.allocated > 0 && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#16a34a" }} />}
                                  <span className="font-bold font-mono" style={{ color: "var(--o2-text)" }}>{inv.number}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: "var(--o2-muted)" }}>{inv.invoice_date}</td>
                              <td className="px-3 py-2.5 text-right font-bold" style={{ color: "var(--o2-text)" }}>{Number(inv.total).toFixed(2)}</td>
                              <td className="px-3 py-2.5 text-right" style={{ color: "#16a34a" }}>{Number(inv.paid_amount).toFixed(2)}</td>
                              <td className="px-3 py-2.5 text-right font-bold" style={{ color: "#dc2626" }}>{Number(inv.remaining_amount).toFixed(2)}</td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="number"
                                  min="0"
                                  max={inv.remaining_amount}
                                  step="0.01"
                                  value={inv.allocated || ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setInvoices((prev) =>
                                      prev.map((p) =>
                                        p.id === inv.id ? { ...p, allocated: Math.min(Math.max(val, 0), p.remaining_amount) } : p
                                      )
                                    );
                                  }}
                                  className="w-full max-w-[100px] px-2 py-1.5 rounded text-xs border text-center font-bold"
                                  style={{
                                    backgroundColor: "var(--o2-surface-raised)",
                                    borderColor: errors[`inv_${inv.id}`] ? "#dc2626" : "var(--o2-border)",
                                    color: inv.allocated > 0 ? "#16a34a" : "var(--o2-text)",
                                  }}
                                />
                                {errors[`inv_${inv.id}`] && (
                                  <p className="text-[9px] mt-0.5" style={{ color: "#dc2626" }}>{errors[`inv_${inv.id}`]}</p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ backgroundColor: "var(--o2-surface-raised)" }}>
                            <td colSpan={4} className="px-3 py-2.5 text-xs font-bold" style={{ color: "var(--o2-muted)" }}>إجمالي التخصيص</td>
                            <td colSpan={2} className="px-3 py-2.5 text-right text-xs font-black" style={{ color: "#16a34a" }}>
                              {formatVoucherCurrency(totalAllocated, currency)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {errors.allocated && (
                  <div className="mt-3 rounded-lg p-3 flex items-center gap-2 text-xs" style={{ backgroundColor: "#fef2f2", color: "#991b1b" }}>
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {errors.allocated}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
