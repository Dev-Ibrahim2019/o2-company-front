import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, DollarSign, Users,
  TrendingUp, Download, Wallet,
} from 'lucide-react';
import EntityFinanceActions from './EntityFinanceActions';

interface Employee {
  id: string;
  name: string;
  role: string;
  employeeId: string;
  salary: number;
}
interface COA { id: string; nameAr: string; name?: string; balance: number }
interface Props {
  employees: Employee[];
  chartOfAccounts: COA[];
  onAction: (empId: string, type: 'ADVANCE' | 'SALARY' | 'DISCOUNT' | 'CUSTODY') => void;
}

export const EmployeesTab: React.FC<Props> = ({ employees, chartOfAccounts, onAction }) => {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'cards' | 'table'>('cards');

  const filtered = employees.filter(e =>
    e.name.includes(search) || e.role.includes(search) || e.employeeId.includes(search)
  );

  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0);
  const totalAdvances = chartOfAccounts
    .filter(a => employees.some(e => e.name === a.nameAr))
    .reduce((s, a) => s + Math.max(a.balance, 0), 0);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-6" dir="rtl">

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الرواتب الشهرية', value: `₪${totalPayroll.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'عدد الموظفين', value: `${employees.length} موظف`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'إجمالي السلف', value: `₪${totalAdvances.toLocaleString()}`, icon: Wallet, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'متوسط الراتب', value: employees.length > 0 ? `₪${Math.round(totalPayroll / employees.length).toLocaleString()}` : '₪0', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        ].map((kpi, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`bg-slate-900/60 border ${kpi.border} rounded-3xl p-5`}
          >
            <div className={`w-10 h-10 rounded-2xl ${kpi.bg} border ${kpi.border} flex items-center justify-center ${kpi.color} mb-3`}>
              <kpi.icon size={18} />
            </div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className={`text-xl font-black font-mono ${kpi.color}`}>{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث باسم أو وظيفة أو رقم..."
              className="bg-slate-900 border border-white/5 rounded-xl py-2.5 pr-9 pl-4 text-xs text-white outline-none focus:border-red-500/50 w-64" />
          </div>
          <button className="p-2.5 bg-slate-900 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
            <Filter size={14} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-white/5 rounded-xl p-1">
            {(['cards', 'table'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${view === v ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {v === 'cards' ? 'بطاقات' : 'جدول'}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-xl text-xs font-black transition-all">
            <Download size={13} /> تصدير
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all">
            صرف رواتب جماعي
          </button>
        </div>
      </div>

      {/* Cards View */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((emp, i) => {
            const account = chartOfAccounts.find(a => a.nameAr === emp.name || a.name === emp.name);
            const bal = account?.balance ?? 0;
            const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2);

            const hueMap: Record<number, string> = { 0: 'from-blue-600 to-blue-800', 1: 'from-emerald-600 to-emerald-800', 2: 'from-purple-600 to-purple-800', 3: 'from-rose-600 to-rose-800', 4: 'from-amber-600 to-amber-800' };
            const grad = hueMap[i % 5];

            return (
              <motion.div key={emp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 180 }}
                className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden hover:border-white/15 transition-all group"
              >
                {/* Card header */}
                <div className="p-5 flex items-center gap-4 border-b border-white/5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <h4 className="text-sm font-black text-white truncate">{emp.name}</h4>
                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">{emp.role}</p>
                    <span className="inline-block mt-1 bg-slate-950 px-2 py-0.5 rounded-lg text-[10px] text-red-500 font-mono font-black border border-red-500/20">
                      {emp.employeeId}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-white/5 text-right">
                  <div className="p-4">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                      💰 الراتب الشهري
                    </p>
                    <p className="text-sm font-black text-white font-mono">₪{emp.salary.toLocaleString()}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">رصيد الحساب</p>
                    <p className={`text-sm font-black font-mono ${bal > 0 ? 'text-rose-400' : bal < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {bal !== 0 ? `₪${Math.abs(bal).toLocaleString()}` : 'مصفّر'}
                      {bal !== 0 && <span className="text-[9px] mr-1">{bal > 0 ? 'عليه' : 'له'}</span>}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-white/5">
                  <EntityFinanceActions
                    entityType="employee"
                    entityId={parseInt(emp.id)}
                    entityName={emp.name}
                    currentBalance={bal}
                    onActionSuccess={() => onAction(emp.id, 'SALARY')}
                  />
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-3 py-20 text-center text-slate-600 font-black italic">
              لا يوجد موظفون مطابقون للبحث
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/40 border-b border-white/5">
                <tr className="text-slate-500 font-black uppercase tracking-wider">
                  <th className="px-5 py-3">الموظف</th>
                  <th className="px-5 py-3">الوظيفة</th>
                  <th className="px-5 py-3">الرقم الوظيفي</th>
                  <th className="px-5 py-3 text-center">الراتب</th>
                  <th className="px-5 py-3 text-center">الرصيد</th>
                  <th className="px-5 py-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((emp) => {
                  const account = chartOfAccounts.find(a => a.nameAr === emp.name || a.name === emp.name);
                  const bal = account?.balance ?? 0;
                  return (
                    <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/20 flex items-center justify-center text-red-400 font-black text-xs shrink-0">
                            {emp.name[0]}
                          </div>
                          <span className="font-bold text-white">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-bold">{emp.role}</td>
                      <td className="px-5 py-4 font-mono text-slate-500 text-[11px]">{emp.employeeId}</td>
                      <td className="px-5 py-4 text-center font-black font-mono text-white">₪{emp.salary.toLocaleString()}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-black font-mono ${bal > 0 ? 'text-rose-400' : bal < 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {bal !== 0 ? `₪${Math.abs(bal).toLocaleString()} ${bal > 0 ? 'عليه' : 'له'}` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <EntityFinanceActions
                            entityType="employee"
                            entityId={parseInt(emp.id)}
                            entityName={emp.name}
                            currentBalance={bal}
                            onActionSuccess={() => onAction(emp.id, 'SALARY')}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};