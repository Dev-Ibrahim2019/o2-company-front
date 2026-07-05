/**
 * Hospitality/HospitalityPOSHeader.tsx — Header خاص بقسم الضيافة
 * يحتوي على: فاتورة جديدة، تعديل فاتورة، وبحث فقط
 */

import React from 'react';
import { Search, Receipt } from 'lucide-react';

interface HospitalityPOSHeaderProps {
  editingOrderId: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  clearCart: () => void;
  onNewInvoice: () => void;
}

export const HospitalityPOSHeader: React.FC<HospitalityPOSHeaderProps> = ({
  editingOrderId,
  searchQuery,
  setSearchQuery,
  clearCart,
  onNewInvoice,
}) => {
  return (
    <header className="mb-3 bg-slate-900 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-xl">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Right Side - Title (Clickable) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <h2
            onClick={onNewInvoice}
            className="text-base sm:text-lg font-black text-white tracking-tight whitespace-nowrap cursor-pointer hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <Receipt size={18} className="text-red-500" />
            {editingOrderId ? `تعديل فاتورة #${editingOrderId.slice(-4)}` : 'فاتورة جديدة'}
          </h2>
        </div>

        {/* Left Side - Search */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-red-500 transition-colors pointer-events-none">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="بحث عن وجبة، رقم الصنف..."
            className="w-full pr-10 pl-3 py-2.5 bg-slate-800/40 border border-white/5 rounded-xl focus:ring-2 focus:ring-red-600/50 outline-none text-xs font-bold text-white placeholder-slate-600 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
    </header>
  );
};