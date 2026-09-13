import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft, Save, Loader2, Trash2, Plus, CheckCircle2,
  AlertTriangle, X, Receipt, Banknote,
} from "lucide-react";
import { voucherService } from "../../services/voucherService";
import { customerService } from "../../services/customerService";
import { useApp } from "../../../store";
import { toast } from "../shared/Toast";
import type { VoucherType, VoucherFormData, VoucherAllocation } from "../../types/voucher";
import {
  VOUCHER_TYPE_LABELS,
  VOUCHER_PAYMENT_METHODS, VOUCHER_CURRENCIES, formatVoucherCurrency,
} from "../../types/voucher";

interface Props {
  voucherType: VoucherType;
  editingId?: number;
  onBack: () => void;
  onSaved: (id: number) => void;
}

export const VoucherFormPage: React.FC<Props> = ({ voucherType, editingId, onBack, onSaved }) => {
  const { currentUser } = useApp();
  const isEditing = !!editingId;
  const isReceipt = voucherType === "receipt";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<any[]>([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [form, setForm] = useState<VoucherFormData>({
    type: voucherType,
    entity_type: isReceipt ? "customer" : "supplier",
    entity_id: 0,
    entity_name: "",
    amount: 0,
    currency: "ILS",
    payment_method_id: null,
    payment_method_name: "",
    reference_number: "",
    branch_id: currentUser?.branchId ? Number(currentUser.branchId) : 1,
    voucher_date: new Date().toISOString().split("T")[0],
    status: "draft",
    notes: "",
    allocations: [],
  });

  const [partySearch, setPartySearch] = useState("");
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  // Load parties (customers or suppliers)
  useEffect(() => {
    (async () => {
      setLoadingParties(true);
      try {
        if (isReceipt) {
          const res = await customerService.getAll().catch(() => []);
          setParties(Array.isArray(res) ? res : []);
        } else {
          const { default: api } = await import("../../api/axios");
          const res = await api.get("/suppliers").catch(() => ({ data: { data: [] } }));
          const data = (res.data as any)?.data ?? [];
          setParties(Array.isArray(data) ? data : []);
        }
      } catch { setParties([]); }
      setLoadingParties(false);
    })();
  }, [isReceipt]);

  // Load unpaid invoices when party is selected
  useEffect(() => {
    if (!form.entity_id) { setUnpaidInvoices([]); return; }
    (async () => {
      setLoadingInvoices(true);
      try {
        const invoices = await voucherService.getEntityInvoices(form.entity_type, form.entity_id);
        setUnpaidInvoices(invoices);
      } catch { setUnpaidInvoices([]); }
      setLoadingInvoices(false);
    })();
  }, [form.entity_id, form.entity_type]);

  // Load existing voucher for editing
  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const v = await voucherService.getOne(editingId);
        setForm({
          type: v.type,
          entity_type: v.entity_type,
          entity_id: v.entity_id,
          entity_name: v.entity_name,
          amount: Number(v.amount),
          currency: v.currency,
          payment_method_id: v.payment_method_id,
          payment_method_name: v.payment_method_name || "",
          reference_number: v.reference_number || "",
          branch_id: v.branch_id,
          voucher_date: v.voucher_date,
          status: v.status,
          notes: v.notes || "",
          allocations: v.allocations?.map(a => ({ invoice_id: a.invoice_id, amount: Number(a.amount) })) || [],
        });
      } catch { /* ignore */ }
    })();
  }, [editingId]);

  const filteredParties = useMemo(() => {
    if (!partySearch) return parties.slice(0, 10);
    const s = partySearch.toLowerCase();
    return parties.filter(p => p.name?.toLowerCase().includes(s) || p.phone?.includes(s)).slice(0, 10);
  }, [partySearch, parties]);

  const selectParty = (p: any) => {
    setForm(prev => ({ ...prev, entity_id: p.id, entity_name: p.name }));
    setPartySearch("");
    setShowPartyDropdown(false);
  };

  const totalAllocated = useMemo(() =>
    (form.allocations || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
  , [form.allocations]);

  const remainingAmount = useMemo(() =>
    Math.max(0, Number(form.amount) - totalAllocated)
  , [form.amount, totalAllocated]);

  const updateAllocation = (invoiceId: number, amount: number) => {
    setForm(prev => {
      const allocs = [...(prev.allocations || [])];
      const idx = allocs.findIndex(a => a.invoice_id === invoiceId);
      if (idx >= 0) {
        if (amount <= 0) allocs.splice(idx, 1);
        else allocs[idx] = { ...allocs[idx], amount };
      } else if (amount > 0) {
        allocs.push({ invoice_id: invoiceId, amount });
      }
      return { ...prev, allocations: allocs };
    });
  };

  const handleSave = async (activateImmediately = false) => {
    if (!form.entity_id) { toast.error(isReceipt ? "اختر العميل" : "اختر المورد"); return; }
    if (form.amount <= 0) { toast.error("المبلغ يجب أن يكون أكبر من صفر"); return; }
    if (totalAllocated > form.amount) { toast.error("إجمالي التخصيص يتجاوز مبلغ السند"); return; }

    setSaving(true);
    try {
      const payload: VoucherFormData = {
        ...form,
        status: activateImmediately ? "active" : "draft",
      };

      let result;
      if (isEditing && editingId) {
        result = await voucherService.update(editingId, payload);
      } else {
        result = await voucherService.create(payload);
        if (activateImmediately && result?.id) {
          await voucherService.approve(result.id);
        }
      }

      toast.success(isEditing ? "تم تحديث السند" : "تم إنشاء السند");
      onSaved(result?.id || editingId || 0);
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--o2-bg)" }} dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b shrink-0" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg transition" style={{ color: "var(--o2-muted)" }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {isReceipt ? <Receipt className="w-5 h-5" style={{ color: "#16a34a" }} /> : <Banknote className="w-5 h-5" style={{ color: "#dc2626" }} />}
              <h1 className="text-lg font-bold" style={{ color: "var(--o2-text)" }}>
                {isEditing ? `تعديل ${VOUCHER_TYPE_LABELS[voucherType]}` : VOUCHER_TYPE_LABELS[voucherType]}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border disabled:opacity-50"
              style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} حفظ مسودة
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white disabled:opacity-50"
              style={{ backgroundColor: isReceipt ? "#16a34a" : "#dc2626" }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} حفظ وتفعيل
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Party Selection */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--o2-text)" }}>
              {isReceipt ? "العميل" : "المورد"}
            </h3>
            <div className="relative">
              <input type="text" value={showPartyDropdown ? partySearch : form.entity_name}
                onChange={(e) => { setPartySearch(e.target.value); setShowPartyDropdown(true); }}
                onFocus={() => { setPartySearch(""); setShowPartyDropdown(true); }}
                placeholder={isReceipt ? "ابحث عن عميل..." : "ابحث عن مورد..."}
                className="w-full px-3 py-2.5 rounded-lg text-sm border"
                style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              {showPartyDropdown && (
                <div className="absolute top-full mt-1 w-full rounded-lg border shadow-xl z-50 max-h-48 overflow-y-auto"
                  style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
                  {filteredParties.length === 0 ? (
                    <div className="px-3 py-2 text-xs" style={{ color: "var(--o2-muted)" }}>لا توجد نتائج</div>
                  ) : filteredParties.map((p) => (
                    <button key={p.id} onClick={() => selectParty(p)}
                      className="w-full px-3 py-2 text-right text-xs hover:opacity-80" style={{ color: "var(--o2-text)" }}>
                      <span className="font-bold">{p.name}</span>
                      {p.phone && <span className="mr-2" style={{ color: "var(--o2-muted)" }}>{p.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Voucher Details */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--o2-text)" }}>بيانات السند</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>المبلغ *</label>
                <input type="number" min="0" step="0.01" value={form.amount || ""}
                  onChange={(e) => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>العملة</label>
                <select value={form.currency} onChange={(e) => setForm(p => ({ ...p, currency: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                  {VOUCHER_CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label} ({c.symbol})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>تاريخ السند *</label>
                <input type="date" value={form.voucher_date} onChange={(e) => setForm(p => ({ ...p, voucher_date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>طريقة الدفع</label>
                <select value={form.payment_method_id || ""} onChange={(e) => setForm(p => ({ ...p, payment_method_id: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                  <option value="">اختر...</option>
                  {VOUCHER_PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>رقم المرجع</label>
                <input type="text" value={form.reference_number || ""} onChange={(e) => setForm(p => ({ ...p, reference_number: e.target.value }))}
                  placeholder="رقم الشيك أو التحويل..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>ملاحظات</label>
                <input type="text" value={form.notes || ""} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>
            </div>
          </div>

          {/* Invoice Allocation */}
          {form.entity_id > 0 && (
            <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: "var(--o2-text)" }}>تخصيص الفواتير</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span style={{ color: "var(--o2-muted)" }}>المبلغ: <strong style={{ color: "var(--o2-text)" }}>{formatVoucherCurrency(form.amount, form.currency)}</strong></span>
                  <span style={{ color: "var(--o2-muted)" }}>المخصّص: <strong style={{ color: "#16a34a" }}>{formatVoucherCurrency(totalAllocated, form.currency)}</strong></span>
                  <span style={{ color: "var(--o2-muted)" }}>المتبقي: <strong style={{ color: remainingAmount > 0 ? "#d97706" : "var(--o2-text)" }}>{formatVoucherCurrency(remainingAmount, form.currency)}</strong></span>
                </div>
              </div>

              {loadingInvoices ? (
                <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--o2-muted)" }} /></div>
              ) : unpaidInvoices.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: "var(--o2-muted)" }}>لا توجد فواتير مستحقة</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold px-2" style={{ color: "var(--o2-muted)" }}>
                    <div className="col-span-3">رقم الفاتورة</div>
                    <div className="col-span-2">التاريخ</div>
                    <div className="col-span-2 text-center">الإجمالي</div>
                    <div className="col-span-2 text-center">المدفوع</div>
                    <div className="col-span-1 text-center">المتبقي</div>
                    <div className="col-span-2 text-center">تخصيص</div>
                  </div>
                  {unpaidInvoices.map((inv) => {
                    const allocated = form.allocations?.find(a => a.invoice_id === inv.id)?.amount || 0;
                    return (
                      <div key={inv.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border text-xs"
                        style={{ backgroundColor: allocated > 0 ? "var(--o2-surface-raised)" : "transparent", borderColor: "var(--o2-border)" }}>
                        <div className="col-span-3 font-bold font-mono" style={{ color: "var(--o2-text)" }}>{inv.number}</div>
                        <div className="col-span-2" style={{ color: "var(--o2-muted)" }}>{inv.invoice_date?.split("T")[0]}</div>
                        <div className="col-span-2 text-center font-bold" style={{ color: "var(--o2-text)" }}>{Number(inv.total).toFixed(2)}</div>
                        <div className="col-span-2 text-center" style={{ color: "#16a34a" }}>{Number(inv.paid_amount).toFixed(2)}</div>
                        <div className="col-span-1 text-center font-bold" style={{ color: "#dc2626" }}>{Number(inv.remaining_amount).toFixed(2)}</div>
                        <div className="col-span-2 flex items-center justify-center">
                          <input type="number" min="0" max={inv.remaining_amount} step="0.01"
                            value={allocated || ""}
                            onChange={(e) => updateAllocation(inv.id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 rounded text-xs border text-center"
                            style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalAllocated > 0 && totalAllocated > form.amount && (
                <div className="mt-3 rounded-lg p-2 flex items-center gap-2 text-xs" style={{ backgroundColor: "#fef2f2", color: "#991b1b" }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  إجمالي التخصيص يتجاوز مبلغ السند
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
