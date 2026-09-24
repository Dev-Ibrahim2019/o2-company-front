import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, Loader2, Lock, Minus, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { colors, typography, radius } from "../design/tokens";
import { toast } from "../../shared/Toast";
import { useAuth } from "../../../auth/AuthContext";
import { menuService, type ApiMenuItem } from "../../../services/menuService";
import { callCenterService, type OrderDetail, type OrderFlow } from "../services/callCenterService";
import { formatShekel, getOrderReference } from "../activeOrdersView";
import {
  buildInitialLines, diffLines, editRequirements, estimateTotal, hasAnyItem, payloadFromLines, type EditLine,
} from "../orderEditView";
import { MIN_REASON_LENGTH } from "../orderDrawerView";

// ============================================================================
// EDIT ORDER PAGE — تعديل طلب مفتوح: نفس الرقم ونفس الخانة. الحفظ بيبعت الأصناف بشكلها النهائي والباك اند
// بيحسب الفرق وبيطلّع للأقسام تذكرة بالفرق بس (أصناف مضافة → تذكرة جديدة، ملغاة → تذكرة إلغاء) ويسجّل من عدّل
// وشو تغيّر. قفل التعديل بيمنع موظفين يعدّلوا نفس الطلب سوا، وبيتجدد كل 45 ثانية وبينتهي لحاله بعد دقيقتين.
// ============================================================================

const HEARTBEAT_MS = 45_000;
const SUPERVISOR_ROLES = ["call-center-manager", "super-admin", "branch-manager", "accountant"];

const inputStyle: React.CSSProperties = {
  height: 40, padding: "0 12px", borderRadius: radius.md, border: `1px solid ${colors.border.default}`,
  background: colors.neutral[0], color: colors.neutral[900], fontSize: typography.size.sm, fontFamily: "inherit",
};
const iconButton: React.CSSProperties = {
  width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: radius.md,
  border: `1px solid ${colors.border.default}`, background: colors.neutral[0], color: colors.neutral[800], cursor: "pointer",
};

export const EditOrderPage: React.FC = () => {
  const { orderId } = useParams();
  const id = Number(orderId);
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isSupervisor = SUPERVISOR_ROLES.some(r => hasRole(r));

  const [details, setDetails] = useState<OrderDetail | null>(null);
  const [flow, setFlow] = useState<OrderFlow | null>(null);
  const [lines, setLines] = useState<EditLine[]>([]);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [menu, setMenu] = useState<ApiMenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const holdsLock = useRef(false);

  const load = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([callCenterService.getOrderDetails(id), callCenterService.getOrderFlow(id)]);
      setDetails(d.data);
      setFlow(f.data);
      setLines(buildInitialLines(d.data.items));
      setNotes(d.data.note ?? "");
      setLoadError(null);
      if (d.data.branch?.id) {
        menuService.getMenu(d.data.branch.id)
          .then(m => setMenu(m.categories.flatMap(c => c.items).filter(i => i.price !== null)))
          .catch(() => toast.warning("تعذر تحميل المنيو", "بتقدر تعدّل كميات الأصناف الحالية بس"));
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || "تعذر تحميل الطلب");
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // قفل التعديل: بيتحجز أول ما الطلب ينحمّل، وبيتجدد بالخلفية، وبيتحرر بالخروج من الصفحة
  const acquireLock = useCallback(async () => {
    try {
      await callCenterService.acquireEditLock(id);
      holdsLock.current = true;
      setLockError(null);
    } catch (err: any) {
      holdsLock.current = false;
      setLockError(err?.response?.data?.message || "تعذر حجز الطلب للتعديل");
    }
  }, [id]);

  useEffect(() => {
    if (!details || flow?.lifecycle !== "open") return;
    void acquireLock();
    const beat = window.setInterval(() => { void acquireLock(); }, HEARTBEAT_MS);
    return () => {
      window.clearInterval(beat);
      if (holdsLock.current) void callCenterService.releaseEditLock(id).catch(() => undefined);
    };
  }, [details?.id, flow?.lifecycle, id, acquireLock]); // eslint-disable-line react-hooks/exhaustive-deps

  const diff = useMemo(() => diffLines(lines), [lines]);
  const notesChanged = (notes.trim() || null) !== (details?.note ?? null);
  const requirements = flow ? editRequirements(diff, flow.execution_status, flow.payment_state) : { reason: false, supervisor: false };
  const blockedForRole = requirements.supervisor && !isSupervisor;
  const reasonMissing = requirements.reason && reason.trim().length < MIN_REASON_LENGTH;
  const estimated = estimateTotal(lines);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return menu.filter(i => `${i.name_ar} ${i.name} ${i.code}`.toLowerCase().includes(q)).slice(0, 8);
  }, [menu, search]);

  const setQuantity = (itemId: number, quantity: number) =>
    setLines(prev => prev.map(l => (l.itemId === itemId ? { ...l, quantity: Math.max(0, Math.round(quantity)) } : l)));

  const addFromMenu = (item: ApiMenuItem) => {
    setLines(prev => prev.some(l => l.itemId === item.id)
      ? prev.map(l => (l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l))
      : [...prev, { itemId: item.id, name: item.name_ar || item.name, price: item.price ?? 0, quantity: 1, notes: null, original: 0 }]);
    setSearch("");
  };

  const setLineNotes = (itemId: number, value: string) =>
    setLines(prev => prev.map(l => (l.itemId === itemId ? { ...l, notes: value || null } : l)));

  const save = async () => {
    if (!hasAnyItem(lines)) { toast.error("لازم يضل صنف واحد", "لإلغاء الطلب كامل استخدم زر الإلغاء"); return; }
    if (reasonMissing) { toast.error("السبب مطلوب", `${MIN_REASON_LENGTH} أحرف على الأقل`); return; }
    setSaving(true);
    try {
      const res = await callCenterService.updateOrder(id, payloadFromLines(lines, notes.trim() || null, reason));
      toast.success(res.message);
      (res.data.warnings ?? []).forEach(w => toast.warning("تنبيه بالمبلغ", w));
      (res.data.change_tickets ?? []).filter(t => !t.success).forEach(t => toast.error(`فشلت طباعة تذكرة ${t.department ?? ""}`, "بتقدر تعيد الطباعة من تفاصيل الطلب"));
      navigate("/call-center/active-orders");
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const message = errors ? Object.values(errors).flat().join(" ") : err?.response?.data?.message || err?.message;
      if (err?.response?.status === 409) setLockError(message);
      toast.error("فشل حفظ التعديل", message);
    } finally {
      setSaving(false);
    }
  };

  const back = () => navigate("/call-center/active-orders");

  if (loadError) {
    return (
      <div dir="rtl" role="alert" style={{ padding: 32, textAlign: "center", color: colors.semantic.error }}>
        <AlertTriangle size={28} aria-hidden /> <p>{loadError}</p>
        <button type="button" onClick={back} style={{ ...iconButton, width: "auto", padding: "0 14px", marginTop: 10 }}>رجوع</button>
      </div>
    );
  }
  if (!details || !flow) {
    return <div dir="rtl" role="status" aria-label="جاري التحميل" style={{ display: "flex", justifyContent: "center", padding: 60 }}><Loader2 size={30} className="animate-spin" style={{ color: colors.brand[500] }} /></div>;
  }

  const readOnly = flow.lifecycle !== "open" || !!lockError;

  return (
    <div dir="rtl" style={{ maxWidth: 860, margin: "0 auto", padding: "8px 4px 40px", fontFamily: typography.fontFamily.sans, display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={back} aria-label="رجوع للطلبات النشطة" style={iconButton}><ArrowRight size={16} aria-hidden /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>تعديل الطلب {getOrderReference(details.order_number)}</h1>
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500] }}>
            {details.customer_name || "بدون اسم"} — نفس الرقم ونفس الخانة، والأقسام بتستلم الفرق بس.
          </p>
        </div>
      </header>

      {flow.lifecycle !== "open" && (
        <div role="alert" style={{ padding: 12, borderRadius: radius.lg, background: colors.semantic.errorBg, border: `1px solid ${colors.semantic.errorBorder}` }}>
          الطلب {flow.lifecycle === "closed" ? "مغلق" : "ملغي"} — ما بينعدّل.
        </div>
      )}
      {lockError && flow.lifecycle === "open" && (
        <div role="alert" style={{ display: "flex", gap: 8, alignItems: "center", padding: 12, borderRadius: radius.lg, background: colors.semantic.warningBg, border: `1px solid ${colors.semantic.warningBorder}` }}>
          <Lock size={16} aria-hidden /> <span style={{ flex: 1 }}>{lockError}</span>
          <button type="button" onClick={() => void acquireLock()} style={{ ...iconButton, width: "auto", padding: "0 12px" }}>إعادة المحاولة</button>
        </div>
      )}
      {requirements.supervisor && (
        <div role="status" style={{ padding: 12, borderRadius: radius.lg, background: colors.semantic.warningBg, border: `1px solid ${colors.semantic.warningBorder}`, fontSize: typography.size.sm }}>
          الطلب مدفوع — تعديل الأصناف بيخلي المبلغ ما يطابق التحويل، فبيحتاج {isSupervisor ? "سبب واضح" : "صلاحية مشرف"}.
        </div>
      )}

      <section aria-label="أصناف الطلب" style={{ padding: 14, borderRadius: radius.lg, background: colors.neutral[0], border: `1px solid ${colors.border.subtle}` }}>
        <h2 style={{ fontSize: typography.size.base, fontWeight: typography.weight.bold, marginBottom: 8 }}>الأصناف</h2>
        <ul style={{ margin: 0, padding: 0 }}>
          {lines.map(line => {
            const removed = line.original > 0 && line.quantity === 0;
            return (
              <li key={line.itemId} style={{ listStyle: "none", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 0", borderBottom: `1px dashed ${colors.border.subtle}`, opacity: removed ? 0.55 : 1 }}>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontWeight: typography.weight.semibold, textDecoration: removed ? "line-through" : "none" }}>
                    {line.name} {line.original === 0 && <span style={{ fontSize: "11px", color: colors.semantic.success }}>(جديد)</span>}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.neutral[500] }}>{formatShekel(line.price)} للواحد</div>
                </div>
                {line.original === 0 ? (
                  <input value={line.notes ?? ""} onChange={e => setLineNotes(line.itemId, e.target.value)} placeholder="ملاحظة للصنف" aria-label={`ملاحظة ${line.name}`} maxLength={200} disabled={readOnly} style={{ ...inputStyle, flex: "1 1 160px" }} />
                ) : line.notes ? <span style={{ fontSize: "12px", color: colors.semantic.warning }}>{line.notes}</span> : null}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <button type="button" onClick={() => setQuantity(line.itemId, line.quantity - 1)} disabled={readOnly || line.quantity === 0} aria-label={`تنقيص ${line.name}`} style={iconButton}><Minus size={14} aria-hidden /></button>
                  <span style={{ minWidth: 28, textAlign: "center", fontWeight: typography.weight.bold, fontVariantNumeric: "tabular-nums" }} aria-live="polite">{line.quantity}</span>
                  <button type="button" onClick={() => setQuantity(line.itemId, line.quantity + 1)} disabled={readOnly} aria-label={`زيادة ${line.name}`} style={iconButton}><Plus size={14} aria-hidden /></button>
                  {removed ? (
                    <button type="button" onClick={() => setQuantity(line.itemId, line.original)} disabled={readOnly} aria-label={`استرجاع ${line.name}`} style={iconButton}><RotateCcw size={14} aria-hidden /></button>
                  ) : (
                    <button type="button" onClick={() => setQuantity(line.itemId, 0)} disabled={readOnly} aria-label={`إزالة ${line.name}`} style={{ ...iconButton, color: colors.semantic.error }}><Trash2 size={14} aria-hidden /></button>
                  )}
                </div>
                <span style={{ minWidth: 80, textAlign: "end", fontVariantNumeric: "tabular-nums" }}>{formatShekel(line.price * line.quantity)}</span>
              </li>
            );
          })}
        </ul>

        <div style={{ position: "relative", marginTop: 12 }}>
          <Search size={16} aria-hidden style={{ position: "absolute", insetInlineStart: 12, top: 12, color: colors.neutral[400] }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="إضافة صنف من المنيو…" aria-label="إضافة صنف" disabled={readOnly || menu.length === 0}
            style={{ ...inputStyle, width: "100%", paddingInlineStart: 36 }} />
          {results.length > 0 && (
            <ul role="listbox" aria-label="نتائج المنيو" style={{ position: "absolute", zIndex: 5, insetInline: 0, top: 44, margin: 0, padding: 4, background: colors.surface.raised, border: `1px solid ${colors.border.default}`, borderRadius: radius.md, maxHeight: 260, overflowY: "auto" }}>
              {results.map(item => (
                <li key={item.id} role="option" aria-selected={false} style={{ listStyle: "none" }}>
                  <button type="button" onClick={() => addFromMenu(item)} style={{ width: "100%", textAlign: "start", display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 10px", background: "transparent", border: "none", cursor: "pointer", color: colors.neutral[900] }}>
                    <span>{item.name_ar || item.name}</span><span style={{ color: colors.neutral[500] }}>{formatShekel(item.price ?? 0)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontWeight: typography.weight.extrabold }}>
          <span>الإجمالي التقريبي <span style={{ fontWeight: typography.weight.normal, fontSize: "12px", color: colors.neutral[500] }}>(الخصومات بتنحسب بعد الحفظ)</span></span>
          <span>{formatShekel(estimated)}</span>
        </div>
      </section>

      <section aria-label="ملاحظات وسبب" style={{ padding: 14, borderRadius: radius.lg, background: colors.neutral[0], border: `1px solid ${colors.border.subtle}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <label htmlFor="order-notes" style={{ fontSize: "12px", fontWeight: typography.weight.semibold }}>ملاحظات الطلب</label>
        <textarea id="order-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={4000} disabled={readOnly} style={{ ...inputStyle, height: "auto", padding: 10 }} />
        {requirements.reason && (
          <>
            <label htmlFor="edit-reason" style={{ fontSize: "12px", fontWeight: typography.weight.semibold }}>سبب التعديل (إلزامي)</label>
            <input id="edit-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} aria-invalid={reasonMissing} disabled={readOnly} style={inputStyle} />
          </>
        )}
      </section>

      <footer style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={save} disabled={readOnly || saving || blockedForRole || (!diff.changed && !notesChanged)}
          style={{ height: 44, padding: "0 24px", borderRadius: radius.md, border: "none", background: colors.brand[600], color: "#fff", fontWeight: typography.weight.bold, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, opacity: readOnly || blockedForRole || (!diff.changed && !notesChanged) ? 0.5 : 1 }}>
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden />} حفظ التعديل
        </button>
        <button type="button" onClick={back} style={{ height: 44, padding: "0 18px", borderRadius: radius.md, border: `1px solid ${colors.border.default}`, background: colors.neutral[0], cursor: "pointer", color: colors.neutral[800] }}>إلغاء</button>
        <span style={{ fontSize: "12px", color: colors.neutral[500] }}>
          {diff.changed || notesChanged
            ? [diff.added.length && `${diff.added.length} مضاف`, diff.increased.length && `${diff.increased.length} زيادة`, diff.decreased.length && `${diff.decreased.length} نقص`, diff.removed.length && `${diff.removed.length} مُزال`, notesChanged && "ملاحظات"].filter(Boolean).join(" · ")
            : "ما في تغييرات بعد"}
        </span>
      </footer>
    </div>
  );
};

export default EditOrderPage;
