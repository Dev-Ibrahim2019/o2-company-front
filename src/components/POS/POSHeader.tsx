import React from 'react';
import { Search } from 'lucide-react';

interface POSHeaderProps {
  editingOrderId: string | null;
  isHospitality: boolean;
  activePOSMode: 'menu' | 'info' | 'customer';
  setActivePOSMode: (mode: 'menu' | 'info' | 'customer') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  quickId: string;
  quickQty: string;
  quickTotal: string;
  handleQuickIdChange: (id: string) => void;
  handleQuickQtyChange: (qty: string) => void;
  handleQuickTotalChange: (total: string) => void;
  handleQuickAdd: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  clearCart: () => void;
}

export const POSHeader: React.FC<POSHeaderProps> = ({
  editingOrderId, isHospitality, activePOSMode, setActivePOSMode,
  searchQuery, setSearchQuery, quickId, quickQty, quickTotal,
  handleQuickIdChange, handleQuickQtyChange, handleQuickTotalChange,
  handleQuickAdd, handleKeyDown, clearCart,
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

        {/* Quick Entry Bar */}
        <div className="w-full xl:flex-1 flex flex-col sm:flex-row items-center gap-2 bg-slate-800/50 p-1.5 rounded-xl border border-white/5">
          <div className="flex flex-wrap items-center gap-1.5 flex-1 w-full">
            <span className="text-[9px] font-black text-slate-500 uppercase shrink-0">إضافة سريعة:</span>
            <input
              type="text"
              placeholder="رقم الصنف"
              value={quickId}
              onChange={(e) => handleQuickIdChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 sm:w-20 bg-slate-900 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-black text-white outline-none focus:ring-1 focus:ring-red-600"
            />
            <input
              type="number"
              placeholder="الكمية"
              value={quickQty}
              onChange={(e) => handleQuickQtyChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-14 bg-slate-900 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-black text-white outline-none focus:ring-1 focus:ring-red-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <input
              type="number"
              placeholder="الإجمالي"
              value={quickTotal}
              onChange={(e) => handleQuickTotalChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 sm:w-20 bg-slate-900 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-black text-white outline-none focus:ring-1 focus:ring-red-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <button
            onClick={handleQuickAdd}
            className="w-full sm:w-auto bg-red-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95 shrink-0"
          >
            إضافة
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {!isHospitality && (
          <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl shrink-0 border border-white/5 shadow-inner">
            {(['menu', 'info', 'customer'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActivePOSMode(mode)}
                className={`px-3 sm:px-5 py-2 rounded-lg text-[8px] sm:text-[10px] font-black transition-all whitespace-nowrap ${activePOSMode === mode ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {mode === 'menu' ? 'المنيو' : mode === 'info' ? 'بيانات الفاتورة' : 'بيانات الزبون والحساب'}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex-1 w-full group">
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
    </header>
  );
};
