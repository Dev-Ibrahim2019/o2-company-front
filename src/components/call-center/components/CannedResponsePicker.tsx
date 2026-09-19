import React, { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Plus, Search, X } from "lucide-react";
import { callCenterService, type CannedResponse } from "../services/callCenterService";
import { toast } from "../../shared/Toast";

interface Props {
  onInsert: (text: string) => void;
}

export const CannedResponsePicker: React.FC<Props> = ({ onInsert }) => {
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await callCenterService.getCannedResponses(search.trim() ? { search: search.trim() } : undefined);
      setResponses(Array.isArray(data) ? data : []);
    } catch {
      toast.error("تعذر تحميل القوالب الجاهزة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => void load(), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setShowAddForm(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSave = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    setSaving(true);
    try {
      const { data } = await callCenterService.createCannedResponse({ title: newTitle.trim(), body: newBody.trim() });
      setResponses((current) => [data, ...current]);
      setNewTitle("");
      setNewBody("");
      setShowAddForm(false);
      toast.success("تم حفظ القالب");
    } catch {
      toast.error("تعذر حفظ القالب");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="قوالب الردود الجاهزة"
        title="قوالب الردود الجاهزة"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
      >
        <FileText size={13} />
        قوالب جاهزة
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-80 rounded-xl border border-white/10 bg-slate-900 shadow-2xl" dir="rtl">
          <div className="flex items-center justify-between border-b border-white/5 p-2.5">
            <div className="relative flex-1">
              <Search size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في القوالب..."
                aria-label="بحث في قوالب الردود"
                className="w-full rounded-lg border border-white/10 bg-slate-800 py-1.5 pr-8 pl-2 text-xs text-white outline-none focus:border-red-500/60"
              />
            </div>
            <button onClick={() => setOpen(false)} aria-label="إغلاق" className="mr-1.5 rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white">
              <X size={14} />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-4 text-xs text-slate-500">
                <Loader2 size={14} className="animate-spin" /> جارٍ التحميل...
              </div>
            ) : responses.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">لا توجد قوالب بعد</p>
            ) : (
              <div className="divide-y divide-white/5">
                {responses.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { onInsert(r.body); setOpen(false); }}
                    className="block w-full px-3 py-2 text-right hover:bg-white/5 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{r.title}</span>
                      {r.category && <span className="shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">{r.category}</span>}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{r.body}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 p-2.5">
            {showAddForm ? (
              <div className="space-y-1.5">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="عنوان القالب"
                  aria-label="عنوان القالب الجديد"
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-white outline-none focus:border-red-500/60"
                />
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="نص الرد الجاهز"
                  aria-label="نص القالب الجديد"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-white outline-none focus:border-red-500/60"
                />
                <div className="flex gap-1.5">
                  <button onClick={handleSave} disabled={saving || !newTitle.trim() || !newBody.trim()} className="flex-1 rounded-lg bg-red-600 py-1.5 text-[11px] font-bold text-white disabled:opacity-40">
                    {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:bg-white/5">إلغاء</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddForm(true)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 py-1.5 text-[11px] font-bold text-slate-400 hover:border-red-500/40 hover:text-red-300">
                <Plus size={13} /> إضافة قالب جديد
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
