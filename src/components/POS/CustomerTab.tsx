import React from 'react';
import { Search, Tag, AlertCircle } from 'lucide-react';
import type { Customer } from '../../../types';

interface CustomerTabProps {
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  selectedCustomer: Customer | null;
  accountType: 'ACCOUNT' | 'SUPPLIER' | 'EMPLOYEE';
  setAccountType: (type: 'ACCOUNT' | 'SUPPLIER' | 'EMPLOYEE') => void;
  accountNumber: string;
  setAccountNumber: (num: string) => void;
  setShowSearchModal: (show: boolean) => void;
}

export const CustomerTab: React.FC<CustomerTabProps> = ({
  customerName, setCustomerName, customerPhone, setCustomerPhone,
  selectedCustomer, accountType, setAccountType, accountNumber, setAccountNumber,
  setShowSearchModal,
}) => {
  return (
    <div className="flex-1 bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 p-3 sm:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Customer Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-sm sm:text-base font-black text-white">بيانات الزبون</h4>
            <button
              onClick={() => setShowSearchModal(true)}
              className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
            >
              <Search size={12} />
              بحث عن عميل مسجل
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">اسم الزبون</label>
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="أدخل اسم الزبون..."
                  className="w-full p-2.5 sm:p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white transition-all"
                />
                {selectedCustomer && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-md text-[8px] font-bold">
                    <Tag size={8} />
                    {selectedCustomer.type}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">رقم الجوال</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="059-000-0000"
                className="w-full p-2.5 sm:p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white transition-all"
              />
            </div>
          </div>
          {selectedCustomer?.notes && (
            <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex items-center gap-1.5 text-amber-500">
              <AlertCircle size={12} />
              <p className="text-[9px] font-bold">ملاحظة: {selectedCustomer.notes}</p>
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="space-y-4">
          <h4 className="text-sm sm:text-base font-black text-white border-b border-white/5 pb-2">بيانات الحساب المالي</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">نوع الحساب</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
                className="w-full p-2.5 sm:p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white transition-all appearance-none"
              >
                <option value="ACCOUNT">رقم حساب</option>
                <option value="SUPPLIER">رقم مورد</option>
                <option value="EMPLOYEE">رقم موظف</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">رقم الحساب / المعرف</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="أدخل الرقم هنا..."
                className="w-full p-2.5 sm:p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};