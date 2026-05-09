import React from 'react';

interface Employee {
  id: string;
  name: string;
  role: string;
  employeeId: string;
  salary: number;
}

interface COA {
  id: string;
  nameAr: string;
  name?: string;
  balance: number;
}

interface Props {
  employees: Employee[];
  chartOfAccounts: COA[];
  onAction: (empId: string, type: 'ADVANCE' | 'SALARY' | 'DISCOUNT' | 'CUSTODY') => void;
}

export const EmployeesTab: React.FC<Props> = ({ employees, chartOfAccounts, onAction }) => (
  <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {employees.map(emp => {
        const account = chartOfAccounts.find(a => a.nameAr === emp.name || a.name === emp.name);
        return (
          <div key={emp.id} className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 hover:border-red-500/30 transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 text-xl font-black">
                {emp.name[0]}
              </div>
              <div className="text-right">
                <h4 className="text-lg font-black text-white leading-none mb-1">{emp.name}</h4>
                <p className="text-xs text-slate-500 mb-2">{emp.role}</p>
                <span className="bg-slate-950 px-2 py-0.5 rounded-lg text-[10px] text-red-500 font-mono font-black">{emp.employeeId}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-right">
              <div className="bg-slate-950 p-3 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">الراتب</p>
                <p className="text-sm font-black text-white">₪{emp.salary}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">الرصيد</p>
                <p className={`text-sm font-black ${account && account.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  ₪{account ? Math.abs(account.balance) : 0} {account && account.balance > 0 ? 'عليه' : 'له'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onAction(emp.id, 'ADVANCE')}   className="p-2 bg-slate-800 hover:bg-red-600     text-[10px] font-black text-slate-400 hover:text-white rounded-xl transition-all">سلفة</button>
              <button onClick={() => onAction(emp.id, 'SALARY')}    className="p-2 bg-slate-800 hover:bg-emerald-600 text-[10px] font-black text-slate-400 hover:text-white rounded-xl transition-all">صرف راتب</button>
              <button onClick={() => onAction(emp.id, 'DISCOUNT')}  className="p-2 bg-slate-800 hover:bg-orange-600  text-[10px] font-black text-slate-400 hover:text-white rounded-xl transition-all">خصم</button>
              <button onClick={() => onAction(emp.id, 'CUSTODY')}   className="p-2 bg-slate-800 hover:bg-blue-600    text-[10px] font-black text-slate-400 hover:text-white rounded-xl transition-all">عهدة</button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
