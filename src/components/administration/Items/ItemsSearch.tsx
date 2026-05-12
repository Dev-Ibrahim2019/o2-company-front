import { useState } from "react";
import { useApp } from "../../../../store";
import { Filter, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Filters {
  departmentId: string;
  status: string;
  popular: boolean;
  chefRecommended: boolean;
  seasonal: boolean;
}

interface Props {
  query: string;
  setQuery: (v: string) => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  filteredCount: number;
  onAddItem: () => void;
  onAddSubGroup: () => void;
}

const ItemsSearch = ({
  query,
  setQuery,
  filters,
  setFilters,
  filteredCount,
  onAddItem,
  onAddSubGroup,
}: Props) => {
  const { departments } = useApp();
  const [showAdv, setShowAdv] = useState(false);

  const reset = () => {
    setQuery("");
    setFilters({
      departmentId: "all",
      status: "all",
      popular: false,
      chefRecommended: false,
      seasonal: false,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <input
            type="text"
            placeholder="البحث عن صنف بالاسم أو الكود..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/40 transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="hidden md:flex px-3 py-1.5 bg-slate-800/80 rounded-full border border-white/5 items-center">
            <span className="text-[10px] font-bold text-slate-400">
              {filteredCount} صنف
            </span>
          </div>

          <button
            onClick={() => setShowAdv(!showAdv)}
            className={`flex-1 md:flex-none border px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
              showAdv
                ? "bg-red-600/10 border-red-500/40 text-red-400"
                : "bg-slate-900 border-white/5 text-white hover:bg-slate-800"
            }`}
          >
            <Filter size={16} />
            تصفية
          </button>

          <button
            onClick={onAddItem}
            className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-lg shadow-red-900/20"
          >
            <Plus size={16} />
            إضافة صنف
          </button>

          <button
            onClick={onAddSubGroup}
            className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 border border-white/10 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
          >
            <Plus size={16} />
            إضافة مجموعة فرعية
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdv && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">القسم</label>
                <select
                  value={filters.departmentId}
                  onChange={(e) => setFilters((p) => ({ ...p, departmentId: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">الكل</option>
                  {(departments as any[]).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.nameAr ?? d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">الحالة</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">الكل</option>
                  <option value="AVAILABLE">متوفر</option>
                  <option value="UNAVAILABLE">غير متوفر</option>
                  <option value="OUT_OF_STOCK">نفذت الكمية</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">خصائص</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { k: "popular", label: "مبيعاً" },
                    { k: "chefRecommended", label: "شيف" },
                    { k: "seasonal", label: "موسمي" },
                  ] as { k: keyof Filters; label: string }[]).map(({ k, label }) => (
                    <button
                      key={k}
                      onClick={() => setFilters((p) => ({ ...p, [k]: !p[k] }))}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        filters[k]
                          ? "bg-red-600/10 border-red-500/30 text-red-400"
                          : "bg-slate-800 border-white/5 text-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={reset}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  إعادة تعيين
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ItemsSearch;
