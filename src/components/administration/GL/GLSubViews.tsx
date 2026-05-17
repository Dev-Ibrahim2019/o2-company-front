import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Eye, ChevronRight, Layers, Activity,
  Zap, Target, Search, Download, Filter,
  CheckCircle2, Clock, AlertCircle,
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
}) => {
  const [search, setSearch] = useState("");

  const filtered = journalEntries.filter(je =>
    je.description.includes(search) || je.id.includes(search) || je.date.includes(search)
  );

  const totalDebit = journalEntries.flatMap(je => je.lines).reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = journalEntries.flatMap(je => je.lines).reduce((s, l) => s + (l.credit || 0), 0);
  const posted = journalEntries.filter(je => je.status === 'POSTED').length;
  const draft = journalEntries.filter(je => je.status !== 'POSTED').length;

  return (
    <motion.div
      key="journal"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-5"
      dir="rtl"
    >
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المدين', value: `₪${totalDebit.toLocaleString()}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
          { label: 'إجمالي الدائن', value: `₪${totalCredit.toLocaleString()}`, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: CheckCircle2 },
          { label: 'قيود مُرحَّلة', value: `${posted} قيد`, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle2 },
          { label: 'قيود مسودة', value: `${draft} قيد`, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock },
        ].map((k, i) => (
          <div key={i} className={`bg-slate-900/60 border ${k.border} rounded-2xl p-4 flex items-center justify-between`}>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{k.label}</p>
              <p className={`text-lg font-black font-mono ${k.color}`}>{k.value}</p>
            </div>
            <div className={`w-9 h-9 rounded-xl ${k.bg} border ${k.border} flex items-center justify-center ${k.color}`}>
              <k.icon size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">قيود اليومية العامة</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{journalEntries.length} قيد إجمالاً</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="بحث في القيود..."
                className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-9 pl-4 text-xs text-white outline-none focus:border-red-500/50 w-56" />
            </div>
            <button className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
              <Filter size={14} />
            </button>
            <button className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
              <Download size={14} />
            </button>
            <button
              onClick={onAddJournal}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
            >
              <Plus size={14} /> قيد جديد
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/40 border-b border-white/5">
              <tr className="text-slate-500 font-black uppercase tracking-wider">
                <th className="px-5 py-3">رقم القيد</th>
                <th className="px-5 py-3">التاريخ</th>
                <th className="px-5 py-3">البيان</th>
                <th className="px-5 py-3 text-center">عدد الأسطر</th>
                <th className="px-5 py-3 text-center">إجمالي المدين</th>
                <th className="px-5 py-3 text-center">الحالة</th>
                <th className="px-5 py-3 text-center">عرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((je, i) => {
                const debit = je.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
                const isPosted = je.status === 'POSTED';
                return (
                  <motion.tr key={je.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-slate-400 text-[11px] bg-slate-950 px-2 py-0.5 rounded-lg border border-white/5">
                        #{je.id.split("_").pop() || je.id.slice(-6)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400">{je.date}</td>
                    <td className="px-5 py-4 font-bold text-white max-w-[200px] truncate">{je.description}</td>
                    <td className="px-5 py-4 text-center text-slate-500 font-bold">{je.lines.length}</td>
                    <td className="px-5 py-4 text-center font-black font-mono text-emerald-400">
                      ₪{debit.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${isPosted
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        }`}>
                        {isPosted ? 'مُرحَّل' : 'مسودة'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => onViewEntry(je.id)}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Eye size={13} className="text-slate-400" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-600 font-black italic">
                    لا توجد قيود مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-bold">{filtered.length} من {journalEntries.length} قيد</span>
          <button className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white font-black transition-colors">
            <Download size={12} /> تصدير PDF
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// FiscalYearsView
// ─────────────────────────────────────────────

interface FiscalYear { id: string; name: string; startDate: string; endDate: string; status: "OPEN" | "CLOSED" }

export const FiscalYearsView: React.FC<{ fiscalYears: FiscalYear[] }> = ({ fiscalYears }) => (
  <motion.div
    key="years"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-5"
    dir="rtl"
  >
    {/* Summary */}
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'السنوات الإجمالية', value: fiscalYears.length, color: 'text-white', bg: 'bg-white/5', border: 'border-white/10' },
        { label: 'مفتوحة / جارية', value: fiscalYears.filter(f => f.status === 'OPEN').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: 'مغلقة / مؤرشفة', value: fiscalYears.filter(f => f.status === 'CLOSED').length, color: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10' },
      ].map((k, i) => (
        <div key={i} className={`bg-slate-900/60 border ${k.border} rounded-2xl p-5 text-right`}>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{k.label}</p>
          <p className={`text-2xl font-black font-mono ${k.color}`}>{k.value}</p>
        </div>
      ))}
    </div>

    <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white">السنوات المالية</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">إدارة الفترات المحاسبية والإقفالات</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all">
          <Plus size={14} /> سنة مالية جديدة
        </button>
      </div>

      <div className="divide-y divide-white/5">
        {fiscalYears.map((fy, i) => {
          const start = new Date(fy.startDate);
          const end = new Date(fy.endDate);
          const today = new Date();
          const total = end.getTime() - start.getTime();
          const elapsed = Math.min(today.getTime() - start.getTime(), total);
          const progress = fy.status === 'OPEN' ? Math.max(0, Math.min((elapsed / total) * 100, 100)) : 100;

          return (
            <motion.div key={fy.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.07 }}
              className="p-5 hover:bg-white/[0.02] transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${fy.status === 'OPEN' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-white/5 border border-white/10 text-slate-500'}`}>
                    {fy.status === 'OPEN' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-black text-white">{fy.name}</h4>
                    <p className="text-[11px] font-mono text-slate-500">{fy.startDate} — {fy.endDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-xl border text-[10px] font-black ${fy.status === 'OPEN' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 bg-white/5 border-white/10'}`}>
                    {fy.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
                  </span>
                  {fy.status === 'OPEN' && (
                    <button className="px-3 py-1 bg-rose-600/10 border border-rose-500/20 text-rose-400 text-[10px] font-black rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                      إقفال السنة
                    </button>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${fy.status === 'OPEN' ? 'bg-emerald-500' : 'bg-slate-600'}`}
                />
              </div>
              <p className="text-[10px] text-slate-600 font-bold mt-1.5">
                {fy.status === 'OPEN' ? `${progress.toFixed(0)}% من السنة منقضي` : 'السنة مغلقة ومؤرشفة'}
              </p>
            </motion.div>
          );
        })}
        {fiscalYears.length === 0 && (
          <div className="py-20 text-center text-slate-600 font-black italic">لا توجد سنوات مالية مسجلة</div>
        )}
      </div>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────
// CostCentersView
// ─────────────────────────────────────────────

interface CostCenter { id: string; nameAr: string; code: string; type?: string; parentId?: string }

interface CostCentersViewProps {
  costCenters: CostCenter[];
  onAdd: () => void;
  setCostCenterForm?: (data: any) => void;
  setModalType?: (type: string) => void;
  setIsModalOpen?: (v: boolean) => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  OPERATIONAL: { label: 'تشغيلي', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Activity },
  SUPPORT: { label: 'خدمي', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Zap },
  PROFIT: { label: 'ربحي', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Target },
};

export const CostCentersView: React.FC<CostCentersViewProps> = ({
  costCenters,
  setCostCenterForm,
  setModalType,
  setIsModalOpen,
}) => {
  const [search, setSearch] = useState('');
  const filtered = costCenters.filter(cc =>
    cc.nameAr.includes(search) || cc.code.includes(search)
  );

  const stats = {
    total: costCenters.length,
    operational: costCenters.filter(c => c.type === 'OPERATIONAL').length,
    support: costCenters.filter(c => c.type === 'SUPPORT').length,
    profit: costCenters.filter(c => c.type === 'PROFIT').length,
  };

  return (
    <motion.div
      key="costs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-5"
      dir="rtl"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المراكز', value: stats.total, color: 'text-white', bg: 'bg-white/5', border: 'border-white/10', icon: Layers },
          { label: 'تشغيلية', value: stats.operational, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Activity },
          { label: 'خدمية', value: stats.support, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Zap },
          { label: 'ربحية', value: stats.profit, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Target },
        ].map((s, i) => (
          <div key={i} className={`bg-slate-900/60 border ${s.border} rounded-2xl p-5 flex items-center justify-between`}>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-2xl ${s.bg} border ${s.border} flex items-center justify-center ${s.color}`}>
              <s.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن مركز تكلفة..."
            className="bg-slate-900 border border-white/5 rounded-xl py-2.5 pr-9 pl-4 text-xs text-white outline-none focus:border-red-500/50 w-64" />
        </div>
        <button
          onClick={() => {
            setCostCenterForm?.({ type: 'OPERATIONAL' });
            setModalType?.('ADD_COST_CENTER');
            setIsModalOpen?.(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
        >
          <Plus size={14} /> مركز تكلفة جديد
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((cc, i) => {
          const cfg = TYPE_CONFIG[cc.type || 'OPERATIONAL'] || TYPE_CONFIG.OPERATIONAL;
          const IconComp = cfg.icon;
          const parent = costCenters.find(p => p.id === cc.parentId);

          return (
            <motion.div key={cc.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 180 }}
              className={`bg-slate-900/60 border border-white/5 rounded-3xl p-6 hover:border-white/15 transition-all group hover:${cfg.border}`}
            >
              <div className="flex items-start justify-between mb-5">
                <div className={`w-12 h-12 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center ${cfg.color} group-hover:scale-105 transition-transform`}>
                  <IconComp size={24} />
                </div>
                <span className={`px-3 py-1 rounded-xl border text-[10px] font-black ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                  {cfg.label}
                </span>
              </div>

              <div className="mb-5 text-right">
                <h4 className="text-base font-black text-white mb-1">{cc.nameAr}</h4>
                {parent && <p className="text-[11px] text-slate-500 font-bold">تابع لـ: {parent.nameAr}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-lg border border-white/5">
                    {cc.code}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 text-right">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">الميزانية</p>
                  <p className="text-sm font-black font-mono text-white">₪0</p>
                </div>
                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 text-right">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">المصروف</p>
                  <p className="text-sm font-black font-mono text-rose-400">₪0</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-[10px] text-slate-600 font-bold">لا توجد حركات</span>
                <button className="text-[10px] font-black text-slate-500 hover:text-white transition-colors flex items-center gap-1">
                  تفاصيل <ChevronRight size={12} className="rotate-180" />
                </button>
              </div>
            </motion.div>
          );
        })}

        {/* Add Card */}
        <button
          onClick={() => {
            setCostCenterForm?.({ type: 'OPERATIONAL' });
            setModalType?.('ADD_COST_CENTER');
            setIsModalOpen?.(true);
          }}
          className="rounded-3xl border-2 border-dashed border-white/5 p-8 flex flex-col items-center justify-center gap-4 text-slate-600 hover:border-red-500/30 hover:text-slate-400 hover:bg-red-500/5 transition-all group min-h-[220px]"
        >
          <div className="w-14 h-14 rounded-3xl bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-90 transition-all duration-500">
            <Plus size={28} />
          </div>
          <div className="text-center">
            <span className="text-sm font-black block">إضافة مركز تكلفة</span>
            <p className="text-[11px] font-medium opacity-60 mt-1">إنشاء سجل تتبع مالي منفصل</p>
          </div>
        </button>
      </div>
    </motion.div>
  );
};