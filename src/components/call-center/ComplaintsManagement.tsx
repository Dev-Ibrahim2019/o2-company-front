import React, { useEffect, useState } from "react";
import { Plus, Loader2, X, MessageSquare } from "lucide-react";
import type { CustomerComplaint } from "./services/callCenterService";
import { callCenterService } from "./services/callCenterService";
import { colors, typography, radius, shadows, transitions, zIndex } from "./design/tokens";
import { Button, Badge, SearchInput, EmptyState, Skeleton } from "./design/components";

const statusOptions = [
  { value: "", label: "كل الحالات" },
  { value: "new", label: "جديدة" },
  { value: "open", label: "مفتوحة" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "waiting_customer", label: "بانتظار العميل" },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلقة" },
  { value: "cancelled", label: "ملغاة" },
];

const priorityOptions = [
  { value: "", label: "كل الأولويات" },
  { value: "low", label: "منخفضة" },
  { value: "normal", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "critical", label: "حرجة" },
];

const complaintTypes = [
  { value: "delay", label: "تأخير" },
  { value: "missing_item", label: "صنف ناقص" },
  { value: "wrong_item", label: "صنف خاطئ" },
  { value: "food_quality", label: "جودة الطعام" },
  { value: "packaging", label: "مشكلة في التغليف" },
  { value: "delivery", label: "مشكلة مع المندوب" },
  { value: "payment", label: "مشكلة دفع" },
  { value: "discount", label: "مشكلة خصم" },
  { value: "service", label: "سوء خدمة" },
  { value: "other", label: "أخرى" },
];

const statusMeta: Record<string, { variant: "default" | "success" | "warning" | "error" | "info" | "brand"; label: string }> = {
  new: { variant: "brand", label: "جديدة" },
  open: { variant: "warning", label: "مفتوحة" },
  in_progress: { variant: "info", label: "قيد المعالجة" },
  waiting_customer: { variant: "default", label: "بانتظار العميل" },
  resolved: { variant: "success", label: "تم الحل" },
  closed: { variant: "default", label: "مغلقة" },
  cancelled: { variant: "error", label: "ملغاة" },
};

const priorityMeta: Record<string, { variant: "default" | "success" | "warning" | "error" | "info" | "brand"; label: string }> = {
  low: { variant: "default", label: "منخفضة" },
  normal: { variant: "info", label: "متوسطة" },
  high: { variant: "warning", label: "عالية" },
  critical: { variant: "error", label: "حرجة" },
};

const ComplaintStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const meta = statusMeta[status] ?? { variant: "default" as const, label: status };
  return <Badge variant={meta.variant} dot>{meta.label}</Badge>;
};

const ComplaintPriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const meta = priorityMeta[priority] ?? { variant: "default" as const, label: priority };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
};

const selectStyle: React.CSSProperties = {
  height: 36, padding: "0 12px",
  fontSize: typography.size.sm, fontWeight: typography.weight.medium,
  color: colors.neutral[700], background: "#fff",
  border: `1px solid ${colors.border.default}`,
  borderRadius: radius.lg, outline: "none", cursor: "pointer",
};

export const ComplaintsManagement: React.FC = () => {
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<CustomerComplaint | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: { status?: string; priority?: string; type?: string; search?: string; per_page: number } = { per_page: 50 };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (type) params.type = type;
      if (search) params.search = search;
      const res = await callCenterService.getComplaints(params);
      setComplaints(res.data?.data ?? []);
    } catch {
      // handled by the empty-state below
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority, type, search]);

  return (
    <div dir="rtl" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>الشكاوى والمتابعة</h1>
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>إدارة شكاوى العملاء ومتابعتها حتى الحل</p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowCreateModal(true)}>
          شكوى جديدة
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle} aria-label="تصفية بالحالة">
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={selectStyle} aria-label="تصفية بالأولوية">
          {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle} aria-label="تصفية بالنوع">
          <option value="">كل الأنواع</option>
          {complaintTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ flex: 1, minWidth: 220 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="بحث في الشكاوى..." />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={84} borderRadius={radius.xl} />)}
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState icon={<MessageSquare size={24} />} title="لا توجد شكاوى" description="لا توجد شكاوى مطابقة لعوامل التصفية الحالية" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {complaints.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedComplaint(c)}
              style={{
                width: "100%", textAlign: "right", background: "#fff",
                border: `1px solid ${colors.border.subtle}`, borderRadius: radius.xl,
                padding: 16, cursor: "pointer", transition: `all ${transitions.fast}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border.default; e.currentTarget.style.boxShadow = shadows.sm; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border.subtle; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.neutral[900], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                  <ComplaintStatusBadge status={c.status} />
                </div>
                <ComplaintPriorityBadge priority={c.priority} />
              </div>
              {c.description && (
                <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {c.description}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: typography.size.xs, color: colors.neutral[400] }}>
                <span>#{c.id}</span>
                <span>{new Date(c.created_at).toLocaleDateString("ar-EG")}</span>
                {c.customer && <span>{c.customer.name}</span>}
                {c.order && <span>طلب: {c.order.order_number}</span>}
                {c.type && <span>{complaintTypes.find((t) => t.value === c.type)?.label || c.type}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedComplaint && (
        <ComplaintDetailModal complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} onReload={load} />
      )}

      {showCreateModal && (
        <CreateComplaintModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); load(); }} />
      )}
    </div>
  );
};

/* ─── Detail Modal ─── */

interface ComplaintTimelineFollowup {
  id: number;
  notes: string | null;
  user?: { name: string } | null;
  created_at: string;
  old_status?: string | null;
  new_status?: string | null;
}

const ComplaintDetailModal: React.FC<{ complaint: CustomerComplaint; onClose: () => void; onReload: () => void }> = ({ complaint, onClose, onReload }) => {
  const [tab, setTab] = useState<"details" | "timeline">("details");
  const [followupNotes, setFollowupNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [timeline, setTimeline] = useState<{ followups: ComplaintTimelineFollowup[] } | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const loadTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const res = await callCenterService.getComplaintTimeline(complaint.id);
      setTimeline(res.data);
    } catch {
      // keep previous timeline state
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => { if (tab === "timeline") void loadTimeline(); }, [tab]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await callCenterService.updateComplaint(complaint.id, { status: newStatus });
      onReload();
      onClose();
    } catch {
      // surfaced by the parent list refresh failing silently is acceptable here
    }
  };

  const handleAddFollowup = async () => {
    if (!followupNotes.trim()) return;
    setSending(true);
    try {
      await callCenterService.addFollowup(complaint.id, { notes: followupNotes, action: "note_added", followup_type: "note" });
      setFollowupNotes("");
      void loadTimeline();
    } catch {
      // keep the note for the agent to retry
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl" role="dialog" aria-modal="true" aria-label={complaint.title}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: colors.surface.overlay }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: radius["2xl"], boxShadow: shadows.xl, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: `1px solid ${colors.border.subtle}` }}>
          <h3 style={{ fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>{complaint.title}</h3>
          <button onClick={onClose} aria-label="إغلاق" style={{ padding: 6, background: colors.neutral[100], border: "none", borderRadius: radius.md, cursor: "pointer", color: colors.neutral[500] }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${colors.border.subtle}` }}>
          {(["details", "timeline"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: "10px 0", fontSize: typography.size.xs, fontWeight: typography.weight.bold,
                background: "transparent", border: "none", cursor: "pointer",
                color: tab === key ? colors.brand[600] : colors.neutral[400],
                borderBottom: `2px solid ${tab === key ? colors.brand[500] : "transparent"}`,
              }}
            >
              {key === "details" ? "التفاصيل" : "الجدول الزمني"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {tab === "details" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ComplaintStatusBadge status={complaint.status} />
                <ComplaintPriorityBadge priority={complaint.priority} />
              </div>
              <p style={{ fontSize: typography.size.sm, color: colors.neutral[600] }}>{complaint.description || "—"}</p>
              <div style={{ fontSize: typography.size.xs, color: colors.neutral[500], display: "flex", flexDirection: "column", gap: 4 }}>
                <span>النوع: {complaintTypes.find((t) => t.value === complaint.type)?.label || complaint.type}</span>
                <span>الحساسية: {complaint.is_sensitive ? "حساسة" : "عادية"}</span>
                {complaint.customer && <span>العميل: {complaint.customer.name}</span>}
                {complaint.order && <span>الطلب: {complaint.order.order_number}</span>}
                {complaint.resolution_notes && <span>ملاحظات الحل: {complaint.resolution_notes}</span>}
              </div>
              <StatusActions currentStatus={complaint.status} onSelect={handleStatusChange} />
            </>
          ) : (
            <>
              {loadingTimeline ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Loader2 size={20} className="animate-spin" color={colors.brand[500]} /></div>
              ) : timeline ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {timeline.followups.map((f, idx) => (
                    <div key={f.id} style={{ display: "flex", gap: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: idx === 0 ? colors.brand[500] : colors.neutral[300] }} />
                        {idx < timeline.followups.length - 1 && <div style={{ width: 1, flex: 1, background: colors.border.subtle, margin: "4px 0" }} />}
                      </div>
                      <div style={{ paddingBottom: 12 }}>
                        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[900] }}>{f.notes}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: typography.size.xs, color: colors.neutral[400], marginTop: 2 }}>
                          <span>{f.user?.name || "النظام"}</span>
                          <span>{new Date(f.created_at).toLocaleString("ar-EG")}</span>
                          {f.old_status && f.new_status && <span>({f.old_status} ← {f.new_status})</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p style={{ textAlign: "center", fontSize: typography.size.sm, color: colors.neutral[400] }}>لا توجد متابعات</p>}

              <div style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 12 }}>
                <textarea
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="أضف متابعة..."
                  aria-label="متابعة جديدة"
                  style={{ width: "100%", height: 76, padding: 10, fontSize: typography.size.sm, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, outline: "none", resize: "none", fontFamily: typography.fontFamily.sans }}
                />
                <Button variant="primary" fullWidth onClick={handleAddFollowup} disabled={sending || !followupNotes.trim()} loading={sending} style={{ marginTop: 8 }}>
                  إضافة متابعة
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Create Modal ─── */

const CreateComplaintModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("other");
  const [priority, setPriority] = useState("normal");
  const [customerId, setCustomerId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);
  const [sending, setSending] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", fontSize: typography.size.sm,
    border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, outline: "none",
    fontFamily: typography.fontFamily.sans, color: colors.neutral[900],
  };

  const handleSubmit = async () => {
    if (!title.trim() || !customerId) return;
    setSending(true);
    try {
      await callCenterService.createComplaint({
        customer_id: parseInt(customerId, 10),
        title: title.trim(),
        description,
        type,
        priority,
        is_sensitive: isSensitive,
        order_id: orderId ? parseInt(orderId, 10) : undefined,
      });
      onCreated();
    } catch {
      // form stays open so the agent can retry
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl" role="dialog" aria-modal="true" aria-label="شكوى جديدة">
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: colors.surface.overlay }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 440, background: "#fff", borderRadius: radius["2xl"], boxShadow: shadows.xl, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>شكوى جديدة</h3>
          <button onClick={onClose} aria-label="إغلاق" style={{ padding: 6, background: colors.neutral[100], border: "none", borderRadius: radius.md, cursor: "pointer", color: colors.neutral[500] }}>
            <X size={16} />
          </button>
        </div>
        <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="رقم العميل *" type="number" aria-label="رقم العميل" style={inputStyle} />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الشكوى *" aria-label="عنوان الشكوى" style={inputStyle} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الوصف" aria-label="وصف الشكوى" style={{ ...inputStyle, height: 76, resize: "none" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...selectStyle, flex: 1 }} aria-label="نوع الشكوى">
            {complaintTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...selectStyle, flex: 1 }} aria-label="أولوية الشكوى">
            {priorityOptions.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="رقم الطلب (اختياري)" type="number" aria-label="رقم الطلب" style={inputStyle} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: typography.size.xs, color: colors.neutral[600] }}>
          <input type="checkbox" checked={isSensitive} onChange={(e) => setIsSensitive(e.target.checked)} style={{ accentColor: colors.brand[500] }} />
          شكوى حساسة (تتطلب اهتماماً خاصاً)
        </label>
        <Button variant="primary" fullWidth onClick={handleSubmit} disabled={sending || !title.trim() || !customerId} loading={sending}>
          إنشاء الشكوى
        </Button>
      </div>
    </div>
  );
};

/* ─── Status Actions ─── */

const statusTransitions: Record<string, { value: string; label: string }[]> = {
  new: [{ value: "open", label: "فتح الشكوى" }],
  open: [{ value: "in_progress", label: "بدء المعالجة" }, { value: "waiting_customer", label: "بانتظار العميل" }],
  in_progress: [{ value: "resolved", label: "تم الحل" }, { value: "waiting_customer", label: "بانتظار العميل" }],
  waiting_customer: [{ value: "in_progress", label: "استئناف المعالجة" }, { value: "resolved", label: "تم الحل" }],
  resolved: [{ value: "closed", label: "إغلاق" }, { value: "open", label: "إعادة فتح" }],
  closed: [{ value: "open", label: "إعادة فتح" }],
  cancelled: [{ value: "open", label: "إعادة فتح" }],
};

const StatusActions: React.FC<{ currentStatus: string; onSelect: (status: string) => void }> = ({ currentStatus, onSelect }) => {
  const actions = statusTransitions[currentStatus] || [];
  if (actions.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {actions.map((a) => (
        <Button key={a.value} variant="secondary" size="sm" onClick={() => onSelect(a.value)}>
          {a.label}
        </Button>
      ))}
    </div>
  );
};
