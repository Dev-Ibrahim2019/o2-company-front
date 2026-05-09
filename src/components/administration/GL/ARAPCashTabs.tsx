import React from 'react';
import { Plus, Users, Briefcase, CreditCard, Landmark } from 'lucide-react';

// ─── ARTab ────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  allowCredit: boolean;
}

interface ARTabProps { customers: Customer[] }

export const ARTab: React.FC<ARTabProps> = ({ customers }) => (
  <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-10 text-right">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 text-right">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-white">العملاء والذمم المدينة</h3>
              <p className="text-xs text-slate-500 mt-1">إدارة مديونيات العملاء والتحصيل</p>
            </div>
            <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1">
              <Plus size={14} /> عميل جديد
            </button>
          </div>
          <div className="space-y-4">
            {customers.filter(c => c.allowCredit).map(customer => (
              <div key={customer.id} className="bg-slate-800/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{customer.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{customer.phone}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">الرصيد</p>
                  <p className="text-lg font-black text-blue-500">₪{customer.balance.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── APTab ────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  phone: string;
  balance: number;
}

interface APTabProps { suppliers: Supplier[] }

export const APTab: React.FC<APTabProps> = ({ suppliers }) => (
  <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-10 text-right">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
      <div className="md:col-span-2 space-y-6">
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-white">الموردين والحسابات الدائنة</h3>
              <p className="text-xs text-slate-500 mt-1">إدارة مديونيات الموردين والمدفوعات</p>
            </div>
            <button className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1">
              <Plus size={14} /> مورد جديد
            </button>
          </div>
          <div className="space-y-4">
            {suppliers.map(supplier => (
              <div key={supplier.id} className="bg-slate-800/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-red-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{supplier.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{supplier.phone}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">المستحق</p>
                  <p className="text-lg font-black text-red-500">₪{supplier.balance.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── CashBankTab ──────────────────────────────────────────────────────────

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  balance: number;
}

interface CashBankTabProps { bankAccounts: BankAccount[] }

export const CashBankTab: React.FC<CashBankTabProps> = ({ bankAccounts }) => (
  <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-10 text-right">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-right">
      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
        <h3 className="text-lg font-black text-white mb-8 flex items-center justify-end gap-2">
          <Landmark size={20} className="text-blue-500" /> البنوك
        </h3>
        <div className="space-y-4">
          {bankAccounts.map(bank => (
            <div key={bank.id} className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 group hover:border-blue-500/20 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <CreditCard size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">{bank.name}</p>
                    <p className="text-xs font-mono text-slate-500 capitalize">{bank.bankName}</p>
                  </div>
                </div>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">الرصيد</p>
                <p className="text-2xl font-black text-white">₪{bank.balance.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
