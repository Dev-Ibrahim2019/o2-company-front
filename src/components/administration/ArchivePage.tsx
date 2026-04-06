import { useState } from 'react';
import {  FinancialTransactionType } from '../../../types';
import { useApp } from '../../../store';
import { 
  Search,
  Download,
  Eye
} from 'lucide-react';
const { 
    financialTransactions,
  } = useApp();

const ArchivePage = () => {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<FinancialTransactionType | 'ALL'>('ALL');
    const [dateFilter, setDateFilter] = useState('');

    const filtered = financialTransactions.filter(tx => {
      const matchesSearch = tx.reason.toLowerCase().includes(search.toLowerCase()) || 
                           tx.id.toLowerCase().includes(search.toLowerCase()) ||
                           tx.cashierId.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
      const matchesDate = !dateFilter || new Date(tx.timestamp).toISOString().split('T')[0] === dateFilter;
      return matchesSearch && matchesType && matchesDate;
    });

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">أرشيف العمليات المالية (Financial Archive)</h2>
            <p className="text-xs text-slate-500 font-medium">البحث في جميع العمليات المالية السابقة</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-slate-900 border border-white/5 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2">
              <Download size={16} />
              تصدير (Export)
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="بحث بالسبب، المعرف، أو الموظف..." 
              className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="bg-slate-800/50 border border-white/5 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-red-500/50"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="ALL">جميع الأنواع</option>
            {Object.values(FinancialTransactionType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input 
            type="date" 
            className="bg-slate-800/50 border border-white/5 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-red-500/50"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-right">
            <thead>
              <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4">المعرف</th>
                <th className="px-6 py-4">النوع</th>
                <th className="px-6 py-4">المبلغ</th>
                <th className="px-6 py-4">السبب</th>
                <th className="px-6 py-4">الموظف</th>
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">#{tx.id.slice(-6)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      tx.type === FinancialTransactionType.SALE ? 'bg-emerald-500/10 text-emerald-500' :
                      tx.type === FinancialTransactionType.EXPENSE ? 'bg-red-500/10 text-red-500' :
                      tx.type === FinancialTransactionType.WITHDRAWAL ? 'bg-orange-500/10 text-orange-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">₪{tx.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{tx.reason}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{tx.cashierId}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(tx.timestamp).toLocaleString('ar-SA')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="p-2 text-slate-500 hover:text-white transition-colors">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    لا توجد عمليات تطابق البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  export default ArchivePage;