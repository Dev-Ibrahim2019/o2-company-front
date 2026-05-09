import React from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Eye,
  ChevronRight,
  Layers,
  Activity,
  Zap,
  Target,
} from "lucide-react";

// ─────────────────────────────────────────────
// JournalView
// ─────────────────────────────────────────────
interface JournalEntry {
  id: string;
  date: string;
  description: string;
  status: string;
  lines: any[];
}

interface JournalViewProps {
  journalEntries: JournalEntry[];
  onAddJournal: () => void;
  onViewEntry: (id: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  journalEntries,
  onAddJournal,
  onViewEntry,
}) => (
  <motion.div
    key="journal"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="h-full overflow-y-auto custom-scrollbar pr-2 pb-10"
  >
    <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden text-right">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-lg font-black text-white">قيود اليومية</h3>
        <button
          onClick={onAddJournal}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2"
        >
          <Plus size={18} /> إنشاء قيد يدوي
        </button>
      </div>
      <div className="overflow-x-auto text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 text-slate-500 font-black uppercase tracking-widest">
              <th className="px-6 py-4">الرقم</th>
              <th className="px-6 py-4 text-right">التاريخ</th>
              <th className="px-6 py-4 text-right">البيان</th>
              <th className="px-6 py-4">الحالة</th>
              <th className="px-6 py-4 text-center">عرض</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {journalEntries.map((je) => (
              <tr key={je.id} className="hover:bg-white/5">
                <td className="px-6 py-4 font-mono text-slate-400">
                  #{je.id.split("_").pop()}
                </td>
                <td className="px-6 py-4 font-mono">{je.date}</td>
                <td className="px-6 py-4 font-bold text-white">
                  {je.description}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">
                    {je.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => onViewEntry(je.id)}
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Eye size={14} className="mx-auto text-slate-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────
// FiscalYearsView
// ─────────────────────────────────────────────
interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
}

interface FiscalYearsViewProps {
  fiscalYears: FiscalYear[];
}

export const FiscalYearsView: React.FC<FiscalYearsViewProps> = ({
  fiscalYears,
}) => (
  <motion.div
    key="years"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="h-full overflow-y-auto custom-scrollbar pr-2 pb-10"
  >
    <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 text-right flex justify-between items-center">
        <h3 className="text-lg font-black text-white">السنوات المالية</h3>
        <button className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1">
          <Plus size={16} /> سنة جديدة
        </button>
      </div>
      <div className="overflow-x-auto text-right text-xs">
        <table className="w-full">
          <thead className="bg-white/5 text-slate-500 font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">الاسم</th>
              <th className="px-6 py-4">البداية</th>
              <th className="px-6 py-4">النهاية</th>
              <th className="px-6 py-4">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {fiscalYears.map((fy) => (
              <tr
                key={fy.id}
                className="text-white hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 font-black">{fy.name}</td>
                <td className="px-6 py-4 font-mono">{fy.startDate}</td>
                <td className="px-6 py-4 font-mono">{fy.endDate}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black ${fy.status === "OPEN" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
                  >
                    {fy.status === "OPEN" ? "مفتوحة" : "مغلقة"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────
// CostCentersView
// ─────────────────────────────────────────────
interface CostCenter {
  id: string;
  nameAr: string;
  code: string;
}

interface CostCentersViewProps {
  costCenters: CostCenter[];
  onAdd: () => void;
  setCostCenterForm: (data: any) => void;
  setModalType: (type: string) => void;
  setIsModalOpen: (v: boolean) => void;
}

export const CostCentersView: React.FC<CostCentersViewProps> = ({
  costCenters,
  setCostCenterForm,
  setModalType,
  setIsModalOpen,
}) => {
  const stats = {
    total: costCenters.length,
    operational: costCenters.filter((c) => c.type === "OPERATIONAL").length,
    support: costCenters.filter((c) => c.type === "SUPPORT").length,
    profit: costCenters.filter((c) => c.type === "PROFIT").length,
  };

  return (
    <motion.div
      key="costs"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full overflow-y-auto custom-scrollbar pr-2 pb-10"
    >
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "إجمالي المراكز",
            value: stats.total,
            icon: Layers,
            color: "text-slate-400",
            bg: "bg-white/5",
          },
          {
            label: "مراكز تشغيلية",
            value: stats.operational,
            icon: Activity,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "مراكز خدمية",
            value: stats.support,
            icon: Zap,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
          },
          {
            label: "مراكز ربحية",
            value: stats.profit,
            icon: Target,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 flex items-center justify-between"
          >
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">
                {s.label}
              </p>
              <p className="text-2xl font-black text-white leading-none">
                {s.value}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-2xl ${s.bg} flex items-center justify-center ${s.color}`}
            >
              <s.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
        {costCenters.map((cc) => {
          const typeLabel =
            cc.type === "OPERATIONAL"
              ? "تشغيلي"
              : cc.type === "SUPPORT"
                ? "خدمي"
                : "ربحي";
          const typeColor =
            cc.type === "OPERATIONAL"
              ? "text-blue-500 bg-blue-500/10"
              : cc.type === "SUPPORT"
                ? "text-purple-500 bg-purple-500/10"
                : "text-emerald-500 bg-emerald-500/10";
          const Icon =
            cc.type === "OPERATIONAL"
              ? Activity
              : cc.type === "SUPPORT"
                ? Zap
                : Target;

          return (
            <div key={cc.id} className="relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-7 hover:border-red-500/30 transition-all shadow-xl shadow-black/20">
                <div className="flex items-start justify-between mb-8">
                  <div
                    className={`w-14 h-14 rounded-2xl ${typeColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <Icon size={28} />
                  </div>
                  <span
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${typeColor} border border-current opacity-30 group-hover:opacity-100 transition-opacity`}
                  >
                    {typeLabel}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-black text-white group-hover:text-red-500 transition-colors uppercase tracking-tight">
                    {cc.nameAr}
                  </h4>
                  {cc.parentId && (
                    <p className="text-[10px] text-slate-400 font-bold mb-1">
                      مركز رئيسي:{" "}
                      {costCenters.find((p) => p.id === cc.parentId)?.nameAr}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                      {cc.code}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">
                      الميزانية
                    </p>
                    <p className="text-sm font-mono font-black text-white">
                      ₪0
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">
                      المصروف الفعلي
                    </p>
                    <p className="text-sm font-mono font-black text-red-500">
                      ₪0
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500"
                      >
                        {i}
                      </div>
                    ))}
                  </div>
                  <button className="text-[10px] font-black text-slate-500 hover:text-white transition-colors flex items-center gap-1">
                    تفاصيل المركز{" "}
                    <ChevronRight size={14} className="rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => {
            setCostCenterForm({ type: "OPERATIONAL" });
            setModalType("ADD_COST_CENTER");
            setIsModalOpen(true);
          }}
          className="relative rounded-[2.5rem] border-2 border-dashed border-white/5 p-8 flex flex-col items-center justify-center gap-4 text-slate-500 hover:border-red-500/30 hover:text-white hover:bg-red-500/5 transition-all group"
        >
          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-90 transition-all duration-500 shadow-xl shadow-black/40">
            <Plus size={32} />
          </div>
          <div className="text-center">
            <span className="text-sm font-black block">
              إضافة مركز تكلفة جديد
            </span>
            <p className="text-[10px] font-medium opacity-50 mt-1">
              إنشاء سجل تتبع مالي منفصل
            </p>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
