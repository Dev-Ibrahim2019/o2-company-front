import React, { useEffect, useState } from "react";
import { Calendar, Phone, MessageSquare, CheckCircle, Loader2, ChevronRight, ArrowRight, Filter } from "lucide-react";
import { callCenterService } from "./services/callCenterService";
import type { CustomerOccasion } from "./services/callCenterService";
import { CustomerProfileDrawer } from "./CustomerProfileDrawer";

type Range = "today" | "tomorrow" | "week" | "month" | "upcoming" | "past";

const rangeLabels: Record<Range, string> = {
  today: "ط§ظ„ظٹظˆظ…",
  tomorrow: "ط؛ط¯ط§ظ‹",
  week: "ظ‡ط°ط§ ط§ظ„ط£ط³ط¨ظˆط¹",
  month: "ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±",
  upcoming: "ط§ظ„ظ‚ط§ط¯ظ…ط©",
  past: "ط§ظ„ظپط§ط¦طھط©",
};

export const OccasionsPage: React.FC = () => {
  const [range, setRange] = useState<Range>("today");
  const [occasions, setOccasions] = useState<CustomerOccasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const load = async (r: Range) => {
    setLoading(true);
    try {
      const res = await callCenterService.getOccasionsByRange(r);
      setOccasions(res.data ?? []);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(range); }, [range]);

  const typeLabel = (t: string) => ({
    birthday: "ط¹ظٹط¯ ظ…ظٹظ„ط§ط¯",
    anniversary: "ط°ظƒط±ظ‰ ط²ظˆط§ط¬",
    company_founding: "طھط£ط³ظٹط³ ط´ط±ظƒط©",
    special: "ظ…ظ†ط§ط³ط¨ط© ط®ط§طµط©",
    reminder: "طھط°ظƒظٹط±",
  }[t] || t);

  const typeIcon = (t: string) => {
    switch (t) {
      case "birthday": return "ًںژ‚";
      case "anniversary": return "ًں’چ";
      case "company_founding": return "ًںڈ¢";
      case "special": return "â­گ";
      case "reminder": return "ًں“Œ";
      default: return "ًں“…";
    }
  };

  return (
    <div className="h-full flex flex-col" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-white">ط§ظ„ظ…ظ†ط§ط³ط¨ط§طھ</h1>
          <p className="text-xs text-slate-400 mt-1">ط¥ط¯ط§ط±ط© ظ…ظ†ط§ط³ط¨ط§طھ ط§ظ„ط¹ظ…ظ„ط§ط، ظˆط§ظ„طھظˆط§طµظ„ ظ…ط¹ظ‡ظ…</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {(Object.entries(rangeLabels) as [Range, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setRange(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${range === key ? "bg-red-600 text-white shadow-lg shadow-red-900/30" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-red-500" /></div>
      ) : occasions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Calendar size={48} className="mb-3 opacity-40" />
          <p className="text-sm font-bold">ظ„ط§ طھظˆط¬ط¯ ظ…ظ†ط§ط³ط¨ط§طھ {rangeLabels[range]}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
          {occasions.map((o) => (
            <div key={o.id} className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800 transition-all">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{typeIcon(o.occasion_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{o.title}</h3>
                      <span className="text-[10px] font-bold text-slate-500">{typeLabel(o.occasion_type)}</span>
                    </div>
                    <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{new Date(o.date).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" })}</span>
                  </div>
                  {o.customer && (
                    <div className="flex items-center gap-3 mt-2 bg-slate-900/50 rounded-lg p-2">
                      <div>
                        <p className="text-xs font-bold text-white">{o.customer.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <Phone size={10} /> {o.customer.phone || o.customer.mobile || "â€”"}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCustomerId(o.customer.id)}
                        className="mr-auto flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300 transition-all"
                      >
                        ط¹ط±ط¶ ط§ظ„ظ…ظ„ظپ <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                  {o.notes && (
                    <p className="text-[11px] text-slate-400 mt-2 flex items-start gap-1">
                      <MessageSquare size={11} className="mt-0.5 shrink-0" /> {o.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {o.preferred_contact_method && (
                      <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {o.preferred_contact_method === "call" ? "ط§طھطµط§ظ„" : o.preferred_contact_method === "whatsapp" ? "ظˆط§طھط³ط§ط¨" : o.preferred_contact_method === "sms" ? "ط±ط³ط§ظ„ط©" : o.preferred_contact_method}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCustomerId && (
        <CustomerProfileDrawer
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
};

