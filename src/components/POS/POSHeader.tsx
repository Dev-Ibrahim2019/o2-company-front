import React from 'react';
import { Search } from 'lucide-react';

interface POSHeaderProps {
  editingOrderId: string | null;
  isHospitality: boolean;
  activePOSMode: 'menu' | 'tables' | 'info' | 'customer';
  setActivePOSMode: (mode: 'menu' | 'tables' | 'info' | 'customer') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  clearCart: () => void;
}

export const POSHeader: React.FC<POSHeaderProps> = ({
  editingOrderId, isHospitality, activePOSMode, setActivePOSMode,
  searchQuery, setSearchQuery, clearCart,
}) => {
  return (
    <header className="mb-3 bg-slate-900 p-3 sm:p-5 rounded-2xl border border-white/5 shadow-xl space-y-4">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3 shrink-0 w-full xl:w-auto justify-between xl:justify-start">
          <h2
            onClick={clearCart}
            className="text-base sm:text-lg font-black text-white tracking-tight whitespace-nowrap cursor-pointer hover:text-red-500 transition-colors"
          >
            {editingOrderId ? `تعديل طلب #${editingOrderId.slice(-4)}` : 'فاتورة جديدة'}
          </h2>
          {editingOrderId && (
            <button onClick={clearCart} className="text-[10px] font-black text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-xl transition-colors border border-red-500/20">إلغاء</button>
          )}
        </div>

        {/* Search Bar */}
        <div className="w-full xl:flex-1 relative group">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-red-500 transition-colors pointer-events-none">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="ابحث عن وجبة، رقم الصنف..."
            className="w-full pr-10 pl-3 py-2.5 bg-slate-800/40 border border-white/5 rounded-xl focus:ring-2 focus:ring-red-600/50 outline-none text-[10px] font-bold text-white placeholder-slate-600 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {!isHospitality && (
          <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl shrink-0 border border-white/5 shadow-inner">
            {(['menu', 'tables', 'info', 'customer'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActivePOSMode(mode)}
                className={`px-3 sm:px-5 py-2 rounded-lg text-[8px] sm:text-[10px] font-black transition-all whitespace-nowrap ${activePOSMode === mode ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {mode === 'menu' ? 'المنيو' : mode === 'tables' ? 'الطاولات' : mode === 'info' ? 'بيانات الفاتورة' : 'بيانات الزبون والحساب'}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};
