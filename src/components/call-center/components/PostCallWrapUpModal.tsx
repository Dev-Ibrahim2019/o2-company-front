import React, { useState } from "react";
import { Star, X } from "lucide-react";
import { callTicketService, CALL_TYPE_LABELS, type CallType } from "../../../services/callTicketService";
import { toast } from "../../shared/Toast";

interface Props {
  ticketId: number;
  onDone: () => void;
}

export const PostCallWrapUpModal: React.FC<Props> = ({ ticketId, onDone }) => {
  const [callType, setCallType] = useState<CallType | "">("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (callType) await callTicketService.classify(ticketId, callType);
      if (rating > 0) await callTicketService.rate(ticketId, rating, feedback.trim() || undefined);
      toast.success("تم حفظ ملخص المكالمة");
    } catch {
      toast.error("تعذر حفظ ملخص المكالمة");
    } finally {
      setSaving(false);
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm" dir="rtl" role="dialog" aria-modal="true" aria-label="ملخص المكالمة">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="text-sm font-black text-white">ملخص المكالمة</h2>
          <button onClick={onDone} aria-label="تخطي" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <p className="mb-2 text-xs font-bold text-slate-400">تصنيف المكالمة</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(CALL_TYPE_LABELS) as [CallType, string][]).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setCallType(value)}
                  className={`min-h-9 rounded-lg text-xs font-bold transition ${callType === value ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-400">تقييم رضا العميل عن المكالمة</p>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} aria-label={`${star} نجوم`} className="p-1">
                  <Star size={26} fill={star <= rating ? "#f59e0b" : "none"} color={star <= rating ? "#f59e0b" : "#475569"} />
                </button>
              ))}
            </div>
          </div>

          {rating > 0 && rating <= 3 && (
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="ما سبب عدم الرضا؟ (اختياري)"
              aria-label="سبب التقييم"
              rows={2}
              className="w-full resize-none rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-red-500/60"
            />
          )}
        </div>

        <div className="flex gap-2 border-t border-white/5 p-4">
          <button onClick={onDone} className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/5">تخطي</button>
          <button onClick={handleSave} disabled={saving || (!callType && rating === 0)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
};
