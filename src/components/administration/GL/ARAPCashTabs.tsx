import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Users, Briefcase, CreditCard, Landmark,
  Search, ArrowUpRight, ArrowDownRight, AlertTriangle,
  CheckCircle2, Clock, Filter, Download,
} from 'lucide-react';

// ─── shared ───────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  label: string; value: number; sub?: string;
  color: string; bg: string; border: string; icon: React.ElementType;
}> = ({ label, value, sub, color, bg, border, icon: Icon }) => (
  <div className={`bg-slate-900/60 border ${border} rounded-3xl p-5`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-2xl ${bg} border ${border} flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      {sub && <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{sub}</span>}
    </div>
    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-xl font-black font-mono ${color}`}>₪{Math.abs(value).toLocaleString()}</p>
  </div>
);

const agingLabel = (days: number) => {
  if (days <= 30) return { label: 'جارية', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (days <= 60) return { label: '٣٠-٦٠ يوم', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  if (days <= 90) return { label: '٦٠-٩٠ يوم', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
  return { label: 'متأخر +٩٠', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
};

// ─── ARTab ────────────────────────────────────────────────────────────────

interface Customer { id: string; name: string; phone: string; balance: number; allowCredit: boolean }

export const ARTab: React.FC<{ customers: Customer[] }> = ({ customers }) => {
  const [search, setSearch] = useState('');
  const creditCustomers = customers.filter(c => c.allowCredit);
  const filtered = creditCustomers.filter(c =>
    c.name.includes(search) || c.phone.includes(search)
  );

  const totalAR = creditCustomers.reduce((s, c) => s + Math.max(c.balance, 0), 0);
  const overdue = creditCustomers.filter(c => c.balance > 5000).length;
  const collected = creditCustomers.filter(c => c.balance <= 0).length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-6" dir="rtl">

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="إجمالي الذمم المدينة" value={totalAR}
          color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" icon={Users} />
        <SummaryCard label="عملاء بالآجل" value={creditCustomers.length}
          sub={`${creditCustomers.length} عميل`}
          color="text-slate-300" bg="bg-white/5" border="border-white/10" icon={Users} />
        <SummaryCard label="ذمم متأخرة" value={overdue}
          sub="تحتاج متابعة"
          color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" icon={AlertTriangle} />
        <SummaryCard label="محصّلة / مسوّاة" value={collected}
          sub={`${collected} حساب`}
          color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" icon={CheckCircle2} />
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">الذمم المدينة — كشف العملاء</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">عملاء بالآجل والرصيد الجاري</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="بحث باسم أو رقم..."
                className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-9 pl-4 text-xs text-white outline-none focus:border-blue-500/50 w-52" />
            </div>
            <button className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
              <Filter size={14} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all">
              <Plus size={14} /> عميل جديد
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/40 border-b border-white/5">
              <tr className="text-slate-500 font-black uppercase tracking-wider">
                <th className="px-5 py-3">العميل</th>
                <th className="px-5 py-3">رقم التواصل</th>
                <th className="px-5 py-3 text-center">الرصيد</th>
                <th className="px-5 py-3 text-center">حالة الذمة</th>
                <th className="px-5 py-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((c, i) => {
                const aging = agingLabel(c.balance > 0 ? 45 : 0);
                return (
                  <motion.tr key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm shrink-0">
                          {c.name[0]}
                        </div>
                        <span className="font-bold text-white">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400">{c.phone}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`font-black font-mono text-sm ${c.balance > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                        ₪{Math.abs(c.balance).toLocaleString()}
                        <span className="text-[9px] font-black text-slate-500 mr-1">{c.balance > 0 ? 'مدين' : 'دائن'}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${aging.color}`}>{aging.label}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                          تحصيل
                        </button>
                        <button className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black rounded-lg hover:bg-white/10 transition-all">
                          كشف حساب
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-16 text-center text-slate-600 font-black italic">لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-bold">{filtered.length} عميل</span>
          <button className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-white font-black transition-colors">
            <Download size={13} /> تصدير Excel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── APTab ────────────────────────────────────────────────────────────────

interface Supplier { id: string; name: string; phone: string; balance: number }

export const APTab: React.FC<{ suppliers: Supplier[] }> = ({ suppliers }) => {
  const [search, setSearch] = useState('');
  const filtered = suppliers.filter(s => s.name.includes(search) || s.phone.includes(search));
  const totalAP = suppliers.reduce((s, c) => s + Math.max(c.balance, 0), 0);
  const overdue = suppliers.filter(s => s.balance > 0).length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-6" dir="rtl">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="إجمالي الذمم الدائنة" value={totalAP}
          color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20" icon={Briefcase} />
        <SummaryCard label="عدد الموردين" value={suppliers.length}
          sub={`${suppliers.length} مورد`}
          color="text-slate-300" bg="bg-white/5" border="border-white/10" icon={Briefcase} />
        <SummaryCard label="فواتير مستحقة" value={overdue}
          sub="تحتاج سداد"
          color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" icon={Clock} />
        <SummaryCard label="تم السداد" value={suppliers.filter(s => s.balance <= 0).length}
          sub="مسوّى بالكامل"
          color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" icon={CheckCircle2} />
      </div>

      <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">الذمم الدائنة — كشف الموردين</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">المستحقات للموردين وجدول السداد</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="بحث..."
                className="bg-slate-950 border border-white/5 rounded-xl py-2 pr-9 pl-4 text-xs text-white outline-none focus:border-rose-500/50 w-48" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition-all">
              <Plus size={14} /> مورد جديد
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/40 border-b border-white/5">
              <tr className="text-slate-500 font-black uppercase tracking-wider">
                <th className="px-5 py-3">المورد</th>
                <th className="px-5 py-3">رقم التواصل</th>
                <th className="px-5 py-3 text-center">المستحق</th>
                <th className="px-5 py-3 text-center">الحالة</th>
                <th className="px-5 py-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((s, i) => (
                <motion.tr key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-black text-sm shrink-0">
                        {s.name[0]}
                      </div>
                      <span className="font-bold text-white">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-400">{s.phone}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`font-black font-mono text-sm ${s.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ₪{Math.abs(s.balance).toLocaleString()}
                      <span className="text-[9px] font-black text-slate-500 mr-1">{s.balance > 0 ? 'دائن' : 'مدين'}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${s.balance > 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                      {s.balance > 0 ? 'مستحق' : 'مسوّى'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="px-3 py-1.5 bg-rose-600/20 border border-rose-500/30 text-rose-400 text-[10px] font-black rounded-lg hover:bg-rose-600 hover:text-white transition-all">
                        سداد
                      </button>
                      <button className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black rounded-lg hover:bg-white/10 transition-all">
                        كشف حساب
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-16 text-center text-slate-600 font-black italic">لا توجد موردين</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── CashBankTab ──────────────────────────────────────────────────────────

interface BankAccount { id: string; name: string; bankName: string; balance: number }
interface AccountLike { id: number; name: string; code: string; type: string; balance?: number }
interface TransactionLike {
  id: number;
  date: string;
  transaction_number: string;
  description?: string;
  entries?: {
    account_id: number;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

export const CashBankTab: React.FC<{
  bankAccounts: BankAccount[];
  accounts?: AccountLike[];
  transactions?: TransactionLike[];
}> = ({ bankAccounts, accounts = [], transactions = [] }) => {
  const cashAssetAccounts = accounts.filter((account) => {
    const label = `${account.name} ${account.code}`;
    return account.type === "asset" && /(cash|bank|صندوق|نقد|بنك)/i.test(label);
  });
  const bankAssetAccounts = cashAssetAccounts.filter((account) =>
    /(bank|بنك)/i.test(`${account.name} ${account.code}`),
  );
  const drawerAccounts = cashAssetAccounts.filter(
    (account) => !bankAssetAccounts.some((bank) => bank.id === account.id),
  );
  const accountBankTotal = bankAssetAccounts.reduce((s, b) => s + Number(b.balance || 0), 0);
  const totalBank = bankAccounts.length > 0
    ? bankAccounts.reduce((s, b) => s + b.balance, 0)
    : accountBankTotal;
  const cashOnHand = drawerAccounts.reduce((s, account) => s + Number(account.balance || 0), 0);
  const displayedBankAccounts =
    bankAccounts.length > 0
      ? bankAccounts
      : bankAssetAccounts.map((account) => ({
          id: String(account.id),
          name: account.name,
          bankName: account.code,
          balance: Number(account.balance || 0),
        }));
  const cashAccountIds = new Set(cashAssetAccounts.map((account) => account.id));
  const recentTx = transactions
    .flatMap((tx) =>
      (tx.entries ?? [])
        .filter((entry) => cashAccountIds.has(entry.account_id))
        .map((entry) => ({
          date: tx.date,
          desc: entry.description || tx.description || tx.transaction_number,
          type: entry.debit > 0 ? "credit" : "debit",
          amount: entry.debit > 0 ? entry.debit : entry.credit,
        })),
    )
    .slice(0, 8);
  const monthlyOutflows = recentTx
    .filter((tx) => tx.type === "debit")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-6" dir="rtl">

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="إجمالي أرصدة البنوك" value={totalBank}
          color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" icon={Landmark} />
        <SummaryCard label="النقد في الصندوق" value={cashOnHand}
          color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" icon={CreditCard} />
        <SummaryCard label="إجمالي السيولة" value={totalBank + cashOnHand}
          sub="بنوك + صندوق"
          color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" icon={ArrowUpRight} />
        <SummaryCard label="مدفوعات الفترة" value={monthlyOutflows}
          sub="من القيود"
          color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20" icon={ArrowDownRight} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Bank Accounts */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Landmark size={16} className="text-blue-400" /> الحسابات البنكية
            </h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-black rounded-xl hover:bg-blue-700 transition-all">
              <Plus size={13} /> حساب جديد
            </button>
          </div>
          <div className="space-y-3">
            {displayedBankAccounts.map((bank, i) => (
              <motion.div key={bank.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 hover:border-blue-500/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{bank.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold capitalize">{bank.bankName}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-0.5">الرصيد</p>
                    <p className="text-base font-black font-mono text-white">₪{bank.balance.toLocaleString()}</p>
                  </div>
                </div>
                {/* mini progress */}
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/60 rounded-full"
                    style={{ width: `${Math.min((bank.balance / (totalBank || 1)) * 100, 100)}%` }} />
                </div>
                <p className="text-[9px] text-slate-600 font-black mt-1.5 text-left">
                  {totalBank > 0 ? ((bank.balance / totalBank) * 100).toFixed(1) : 0}% من الإجمالي
                </p>
              </motion.div>
            ))}

            {/* Cash Box */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">الصندوق النقدي</p>
                    <p className="text-[10px] text-slate-500 font-bold">Cash on Hand</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-0.5">الرصيد</p>
                  <p className="text-base font-black font-mono text-emerald-400">₪{cashOnHand.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-black text-white">آخر الحركات النقدية</h3>
            <button className="text-[11px] text-slate-400 hover:text-white font-black transition-colors flex items-center gap-1">
              <Download size={13} /> تصدير
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {recentTx.map((tx, i) => (
              <motion.div key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {tx.type === 'credit' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">{tx.desc}</p>
                    <p className="text-[10px] font-mono text-slate-500">{tx.date}</p>
                  </div>
                </div>
                <span className={`text-sm font-black font-mono ${tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.type === 'credit' ? '+' : '-'}₪{tx.amount.toLocaleString()}
                </span>
              </motion.div>
            ))}
            {recentTx.length === 0 && (
              <div className="px-5 py-12 text-center text-slate-600 text-xs font-black">
                لا توجد حركات نقدية مرتبطة بحسابات الصندوق أو البنك
              </div>
            )}
          </div>
          <div className="p-4 border-t border-white/5 text-center">
            <button className="text-[11px] text-slate-500 hover:text-white font-black transition-colors">
              عرض كافة الحركات ←
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
