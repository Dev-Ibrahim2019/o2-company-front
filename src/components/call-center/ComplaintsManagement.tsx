import React, { useEffect, useState } from "react";
import { AlertTriangle, Plus, Search, Loader2, X, MessageSquare, Filter } from "lucide-react";
import type { CustomerComplaint, ComplaintFollowup } from "./services/callCenterService";
import { callCenterService } from "./services/callCenterService";

const statusOptions = [
  { value: "", label: "ظƒظ„ ط§ظ„ط­ط§ظ„ط§طھ" },
  { value: "new", label: "ط¬ط¯ظٹط¯" },
  { value: "open", label: "مفتوح" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "waiting_customer", label: "ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ط¹ظ…ظٹظ„" },
  { value: "resolved", label: "طھظ… ط§ظ„ط­ظ„" },
  { value: "closed", label: "ظ…ط؛ظ„ظ‚" },
  { value: "cancelled", label: "ظ…ظ„ط؛ظٹ" },
];

const priorityOptions = [
  { value: "", label: "ظƒظ„ ط§ظ„ط£ظˆظ„ظˆظٹط§طھ" },
  { value: "low", label: "منخفضة" },
  { value: "normal", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "critical", label: "ط­ط±ط¬ط©" },
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
      const params: any = { per_page: 50 };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (type) params.type = type;
      if (search) params.search = search;
      const res = await callCenterService.getComplaints(params);
      setComplaints(res.data?.data ?? []);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, priority, type, search]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white">ط§ظ„ط´ظƒط§ظˆظ‰ ظˆط§ظ„ظ…طھط§ط¨ط¹ط©</h2>
          <p className="text-xs text-slate-400">ط¥ط¯ط§ط±ط© ط´ظƒط§ظˆظ‰ ط§ظ„ط¹ظ…ظ„ط§ط، ظˆظ…طھط§ط¨ط¹طھظ‡ط§</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all">
          <Plus size={14} /> ط´ظƒظˆظ‰ ط¬ط¯ظٹط¯ط©
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-red-500/50">
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)}
          className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-red-500/50">
          {priorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)}
          className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-red-500/50">
          <option value="">ظƒظ„ ط§ظ„ط£ظ†ظˆط§ط¹</option>
          {complaintTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ط¨ط­ط« ظپظٹ ط§ظ„ط´ظƒط§ظˆظ‰..."
            className="w-full bg-slate-800 border border-white/10 rounded-lg py-1.5 pr-8 pl-3 text-xs text-white focus:outline-none focus:border-red-500/50 placeholder-slate-500" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-red-500" /></div>
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-slate-500">
          <AlertTriangle size={32} className="mb-2" />
          <p className="text-sm">ظ„ط§ طھظˆط¬ط¯ ط´ظƒط§ظˆظ‰</p>
        </div>
      ) : (
        <div className="space-y-2">
          {complaints.map(c => (
            <button key={c.id} onClick={() => setSelectedComplaint(c)}
              className="w-full bg-slate-900 border border-white/5 rounded-xl p-4 text-right hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{c.title}</span>
                  <ComplaintStatusBadge status={c.status} />
                </div>
                <ComplaintPriorityBadge priority={c.priority} />
              </div>
              {c.description && <p className="text-xs text-slate-400 mb-2 line-clamp-2">{c.description}</p>}
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>#{c.id}</span>
                <span>{new Date(c.created_at).toLocaleDateString("ar-SA")}</span>
                {c.customer && <span>{c.customer.name}</span>}
                {c.order && <span>طلب: {c.order.order_number}</span>}
                <span className={c.type ? "" : "hidden"}>{complaintTypes.find(t => t.value === c.type)?.label || c.type}</span>
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

/* â”€â”€â”€ Detail Modal â”€â”€â”€ */

const ComplaintDetailModal: React.FC<{ complaint: CustomerComplaint; onClose: () => void; onReload: () => void }> = ({ complaint, onClose, onReload }) => {
  const [tab, setTab] = useState<"details" | "timeline">("details");
  const [followupNotes, setFollowupNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [timeline, setTimeline] = useState<{ complaint: any; followups: any[] } | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const loadTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const res = await callCenterService.getComplaintTimeline(complaint.id);
      setTimeline(res.data);
    } catch { } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => { if (tab === "timeline") loadTimeline(); }, [tab]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await callCenterService.updateComplaint(complaint.id, { status: newStatus });
      onReload();
    } catch { }
  };

  const handleAddFollowup = async () => {
    if (!followupNotes.trim()) return;
    setSending(true);
    try {
      await callCenterService.addFollowup(complaint.id, { notes: followupNotes, action: "note_added", followup_type: "note" });
      setFollowupNotes("");
      loadTimeline();
    } catch { } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="text-white font-black text-sm">{complaint.title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg"><X size={16} className="text-slate-400" /></button>
        </div>

        <div className="flex border-b border-white/5">
          <button onClick={() => setTab("details")} className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${tab === "details" ? "border-red-500 text-white" : "border-transparent text-slate-400"}`}>التفاصيل</button>
          <button onClick={() => setTab("timeline")} className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all ${tab === "timeline" ? "border-red-500 text-white" : "border-transparent text-slate-400"}`}>الجدول الزمني</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === "details" ? (
            <>
              <div className="flex items-center gap-2">
                <ComplaintStatusBadge status={complaint.status} />
                <ComplaintPriorityBadge priority={complaint.priority} />
              </div>
              <p className="text-xs text-slate-400">{complaint.description || "â€”"}</p>
              <div className="text-xs text-slate-400 space-y-1">
                <p>ط§ظ„ظ†ظˆط¹: {complaintTypes.find(t => t.value === complaint.type)?.label || complaint.type}</p>
                <p>ط§ظ„ط­ط³ط§ط³ظٹط©: {complaint.is_sensitive ? "ط­ط³ط§ط³ط©" : "ط¹ط§ط¯ظٹط©"}</p>
                {complaint.customer && <p>ط§ظ„ط¹ظ…ظٹظ„: {complaint.customer.name}</p>}
                {complaint.order && <p>ط§ظ„طلب: {complaint.order.order_number}</p>}
                {complaint.resolution_notes && <p>ملاحظات ط§ظ„ط­ظ„: {complaint.resolution_notes}</p>}
              </div>
              <div className="flex gap-2">
                <StatusActions currentStatus={complaint.status} onSelect={handleStatusChange} />
              </div>
            </>
          ) : (
            <>
              {loadingTimeline ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-red-500" /></div>
                : timeline ? (
                  <div className="space-y-3">
                    {timeline.followups.map((f, idx) => (
                      <div key={f.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-red-500" : "bg-slate-600"}`} />
                          {idx < timeline.followups.length - 1 && <div className="w-px flex-1 bg-slate-700 my-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-xs font-bold text-white">{f.notes}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>{f.user?.name || "ط§ظ„ظ†ط¸ط§ظ…"}</span>
                            <span>{new Date(f.created_at).toLocaleString("ar-SA")}</span>
                            {f.old_status && f.new_status && (
                              <span>({f.old_status} â†’ {f.new_status})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-center text-slate-500 text-xs">ظ„ط§ طھظˆط¬ط¯ ظ…طھط§ط¨ط¹ط§طھ</p>}

              <div className="border-t border-white/5 pt-3 mt-3">
                <textarea value={followupNotes} onChange={e => setFollowupNotes(e.target.value)} placeholder="ط£ط¶ظپ ظ…طھط§ط¨ط¹ط©..."
                  className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 resize-none h-20" />
                <button onClick={handleAddFollowup} disabled={sending || !followupNotes.trim()}
                  className="mt-2 w-full py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {sending ? "ط¬ط§ط±ظٹ ط§ظ„إرسال..." : "ط¥ط¶ط§ظپط© ظ…طھط§ط¨ط¹ط©"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* â”€â”€â”€ Create Modal â”€â”€â”€ */

const CreateComplaintModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("other");
  const [priority, setPriority] = useState("normal");
  const [customerId, setCustomerId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !customerId) return;
    setSending(true);
    try {
      await callCenterService.createComplaint({
        customer_id: parseInt(customerId),
        title: title.trim(),
        description,
        type,
        priority,
        is_sensitive: isSensitive,
        order_id: orderId ? parseInt(orderId) : undefined,
      });
      onCreated();
    } catch { } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-black text-sm">ط´ظƒظˆظ‰ ط¬ط¯ظٹط¯ط©</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg"><X size={16} className="text-slate-400" /></button>
        </div>
        <input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="ط±ظ‚ظ… ط§ظ„ط¹ظ…ظٹظ„ *" type="number"
          className="w-full bg-slate-800 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ط¹ظ†ظˆط§ظ† ط§ظ„ط´ظƒظˆظ‰ *"
          className="w-full bg-slate-800 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="ط§ظ„ظˆطµظپ"
          className="w-full bg-slate-800 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 resize-none h-20" />
        <div className="flex gap-2">
          <select value={type} onChange={e => setType(e.target.value)} className="flex-1 bg-slate-800 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500/50">
            {complaintTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="flex-1 bg-slate-800 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500/50">
            {priorityOptions.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="ط±ظ‚ظ… ط§ظ„طلب (ط§ط®طھظٹط§ط±ظٹ)" type="number"
          className="w-full bg-slate-800 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50" />
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={isSensitive} onChange={e => setIsSensitive(e.target.checked)} className="rounded bg-slate-800 border-white/10" />
          ط´ظƒظˆظ‰ ط­ط³ط§ط³ط© (طھطھطلب ط§ظ‡طھظ…ط§ظ… ط®ط§طµ)
        </label>
        <button onClick={handleSubmit} disabled={sending || !title.trim() || !customerId}
          className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-50">
          {sending ? "ط¬ط§ط±ظٹ ط§ظ„ط¥ظ†ط´ط§ط،..." : "ط¥ظ†ط´ط§ط، ط§ظ„ط´ظƒظˆظ‰"}
        </button>
      </div>
    </div>
  );
};

/* â”€â”€â”€ Helpers â”€â”€â”€ */

const ComplaintStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; label: string }> = {
    new: { color: "text-red-400 bg-red-500/10", label: "ط¬ط¯ظٹط¯" },
    open: { color: "text-amber-400 bg-amber-500/10", label: "مفتوح" },
    in_progress: { color: "text-blue-400 bg-blue-500/10", label: "قيد المعالجة" },
    waiting_customer: { color: "text-purple-400 bg-purple-500/10", label: "ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ط¹ظ…ظٹظ„" },
    resolved: { color: "text-emerald-400 bg-emerald-500/10", label: "طھظ… ط§ظ„ط­ظ„" },
    closed: { color: "text-slate-400 bg-slate-500/10", label: "ظ…ط؛ظ„ظ‚" },
    cancelled: { color: "text-red-400 bg-red-500/10", label: "ظ…ظ„ط؛ظٹ" },
  };
  const s = map[status] || { color: "text-slate-400 bg-slate-500/10", label: status };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.color}`}>{s.label}</span>;
};

const ComplaintPriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const map: Record<string, { color: string; label: string }> = {
    low: { color: "text-slate-400 bg-slate-500/10", label: "منخفضة" },
    normal: { color: "text-blue-400 bg-blue-500/10", label: "متوسطة" },
    high: { color: "text-amber-400 bg-amber-500/10", label: "عالية" },
    critical: { color: "text-red-400 bg-red-500/10", label: "ط­ط±ط¬ط©" },
  };
  const s = map[priority] || { color: "text-slate-400 bg-slate-500/10", label: priority };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.color}`}>{s.label}</span>;
};

const StatusActions: React.FC<{ currentStatus: string; onSelect: (status: string) => void }> = ({ currentStatus, onSelect }) => {
  const transitions: Record<string, { value: string; label: string }[]> = {
    new: [{ value: "open", label: "ظپطھط­ ط§ظ„ط´ظƒظˆظ‰" }],
    open: [{ value: "in_progress", label: "ط¨ط¯ط، ط§ظ„ظ…ط¹ط§ظ„ط¬ط©" }, { value: "waiting_customer", label: "ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ط¹ظ…ظٹظ„" }],
    in_progress: [{ value: "resolved", label: "طھظ… ط§ظ„ط­ظ„" }, { value: "waiting_customer", label: "ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ط¹ظ…ظٹظ„" }],
    waiting_customer: [{ value: "in_progress", label: "ط§ط³طھط¦ظ†ط§ظپ ط§ظ„ظ…ط¹ط§ظ„ط¬ط©" }, { value: "resolved", label: "طھظ… ط§ظ„ط­ظ„" }],
    resolved: [{ value: "closed", label: "ط¥ط؛ظ„ط§ظ‚" }, { value: "open", label: "ط¥ط¹ط§ط¯ط© ظپطھط­" }],
    closed: [{ value: "open", label: "ط¥ط¹ط§ط¯ط© ظپطھط­" }],
    cancelled: [{ value: "open", label: "ط¥ط¹ط§ط¯ط© ظپطھط­" }],
  };

  const actions = transitions[currentStatus] || [];
  return (
    <div className="flex gap-2">
      {actions.map(a => (
        <button key={a.value} onClick={() => onSelect(a.value)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white transition-all">
          {a.label}
        </button>
      ))}
    </div>
  );
};

