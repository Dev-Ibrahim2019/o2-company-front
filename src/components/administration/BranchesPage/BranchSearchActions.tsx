import React from 'react';
import { Search, Plus } from 'lucide-react';

interface BranchSearchActionsProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onAddBranch: () => void;
}

const BranchSearchActions: React.FC<BranchSearchActionsProps> = ({ searchQuery, setSearchQuery, onAddBranch }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div className="relative flex-1 max-w-md">
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
      <input 
        type="text"
        placeholder="البحث عن فرع بالاسم أو المدينة..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pr-12 pl-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all shadow-inner"
      />
    </div>
    <button
      onClick={onAddBranch}
      className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-xl shadow-red-900/30 hover:scale-[1.02] active:scale-[0.98]"
    >
      <Plus size={20} />
      إضافة فرع جديد
    </button>
  </div>
);

export default BranchSearchActions;