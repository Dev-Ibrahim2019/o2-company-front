import React from 'react';
import {
  Search, Tag, AlertCircle, Banknote, CreditCard, Wallet, Zap,
  CheckCircle, Trash2, FileText, X, UserPlus, Phone,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { PaymentMethod } from '../../../types';
import type { Customer, Employee, Supplier } from '../../../types';

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

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
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  isHospitality: boolean;
  total: number;
  payments: PaymentEntry[];
  addPayment: (method: PaymentMethod) => void;
  removePayment: (index: number) => void;
  updatePaymentAmount: (index: number, val: string) => void;
  updatePaymentReference: (index: number, val: string) => void;
}

export const CustomerTab: React.FC<CustomerTabProps> = ({
  customerName, setCustomerName, customerPhone, setCustomerPhone,
  selectedCustomer, accountType, setAccountType, accountNumber, setAccountNumber,
  setShowSearchModal, customers, suppliers, employees, isHospitality, total, payments, addPayment, removePayment,
  updatePaymentAmount, updatePaymentReference,
}) => {
  const [showAccountSuggestions, setShowAccountSuggestions] = React.useState(false);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = Math.max(0, total - totalPaid);
  const progress = total > 0 ? Math.min(100, (totalPaid / total) * 100) : 0;

  const accountSuggestions = React.useMemo(() => {
    const query = accountNumber.toLowerCase().trim();
    if (!query || !showAccountSuggestions) return [];

    if (accountType === 'ACCOUNT') {
      return customers
        .filter(customer =>
          customer.name.toLowerCase().includes(query) ||
          customer.phone.includes(query) ||
          customer.id.toLowerCase().includes(query) ||
          customer.linkedAccountId?.toLowerCase().includes(query)
        )
        .slice(0, 5)
        .map(customer => ({
          id: customer.linkedAccountId || customer.id,
          name: customer.name,
          phone: customer.phone,
          type: 'زبون',
        }));
    }

    if (accountType === 'SUPPLIER') {
      return suppliers
        .filter(supplier =>
          supplier.name.toLowerCase().includes(query) ||
          supplier.phone.includes(query) ||
          supplier.id.toLowerCase().includes(query) ||
          supplier.linkedAccountId?.toLowerCase().includes(query)
        )
        .slice(0, 5)
        .map(supplier => ({
          id: supplier.linkedAccountId || supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          type: 'مورد',
        }));
    }

    return employees
      .filter(employee =>
        employee.name.toLowerCase().includes(query) ||
        employee.phone.includes(query) ||
        employee.id.toLowerCase().includes(query) ||
        employee.employeeId.toLowerCase().includes(query)
      )
      .slice(0, 5)
      .map(employee => ({
        id: employee.employeeId,
        name: employee.name,
        phone: employee.phone,
        type: 'موظف',
      }));
  }, [accountNumber, accountType, customers, employees, showAccountSuggestions, suppliers]);

  const handleSelectAccount = (account: { id: string; name: string; phone: string }) => {
    setAccountNumber(account.id);
    setCustomerName(account.name);
    setCustomerPhone(account.phone);
    setShowAccountSuggestions(false);
  };

  const paymentMethods = [
    { id: PaymentMethod.CASH, label: 'كاش', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/5', hoverBorder: 'hover:border-emerald-500/30' },
    { id: PaymentMethod.CREDIT_CARD, label: 'بطاقة', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/5', hoverBorder: 'hover:border-blue-500/30' },
    { id: PaymentMethod.WALLET, label: 'تطبيق', icon: Wallet, color: 'text-purple-500', bg: 'bg-purple-500/5', hoverBorder: 'hover:border-purple-500/30' },
    { id: PaymentMethod.QR, label: 'بنكي', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/5', hoverBorder: 'hover:border-amber-500/30' },
  ];

  const getPaymentLabel = (method: PaymentMethod) => {
    if (method === PaymentMethod.CASH) return 'كاش (نقد)';
    if (method === PaymentMethod.CREDIT_CARD) return 'بطاقة ائتمان';
    if (method === PaymentMethod.WALLET) return 'المحفظة';
    return 'تحويل بنكي';
  };

  const getPaymentIcon = (method: PaymentMethod) => {
    if (method === PaymentMethod.CASH) return <Banknote size={18} />;
    if (method === PaymentMethod.CREDIT_CARD) return <CreditCard size={18} />;
    if (method === PaymentMethod.WALLET) return <Wallet size={18} />;
    return <Zap size={18} />;
  };

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
                onChange={(e) => {
                  setAccountType(e.target.value as any);
                  setAccountNumber('');
                  setShowAccountSuggestions(false);
                }}
                className="w-full p-2.5 sm:p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white transition-all appearance-none"
              >
                <option value="ACCOUNT">رقم حساب</option>
                <option value="SUPPLIER">رقم مورد</option>
                <option value="EMPLOYEE">رقم موظف</option>
              </select>
            </div>
            <div className="space-y-1.5 relative">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">رقم الحساب / المعرف</label>
              <div className="relative">
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    setShowAccountSuggestions(true);
                  }}
                  onFocus={() => setShowAccountSuggestions(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && accountSuggestions.length > 0) {
                      event.preventDefault();
                      handleSelectAccount(accountSuggestions[0]);
                    }
                    if (event.key === 'Escape') {
                      setShowAccountSuggestions(false);
                    }
                  }}
                  placeholder="ابحث بالاسم أو الرقم..."
                  className="w-full p-2.5 sm:p-3 pl-9 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white transition-all"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>

              <AnimatePresence>
                {showAccountSuggestions && accountSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-50 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                  >
                    <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">اقتراحات الحساب</span>
                      <button type="button" onClick={() => setShowAccountSuggestions(false)}>
                        <X size={12} className="text-slate-500 hover:text-white" />
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {accountSuggestions.map((account) => (
                        <button
                          key={`${account.type}-${account.id}`}
                          type="button"
                          onClick={() => handleSelectAccount(account)}
                          className="w-full text-right p-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
                              <UserPlus size={14} />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-white">{account.name}</p>
                              <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                <Phone size={8} /> {account.phone}
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-mono font-black text-red-500">{account.id}</p>
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">{account.type}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {!isHospitality && (
          <div className="space-y-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-white tracking-tight">إتمام الدفع</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Split & Payment Registry</p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-mono font-black ${remainingAmount > 0 ? 'text-red-500' : 'text-emerald-500'} transition-colors duration-500`}>
                    {remainingAmount.toLocaleString()} <span className="text-sm">₪</span>
                  </span>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">المبلغ المتبقي تحصيله</p>
                </div>
              </div>

              <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-white/5 flex p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={`h-full rounded-full ${totalPaid >= total && total > 0 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-red-600'} transition-all duration-700 ease-out`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  disabled={remainingAmount <= 0}
                  onClick={() => addPayment(method.id)}
                  className={`group relative flex flex-col items-center justify-center gap-2 py-4 rounded-3xl border border-white/5 bg-slate-900/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-20 disabled:grayscale disabled:hover:scale-100 overflow-hidden ${method.hoverBorder}`}
                >
                  <div className={`absolute inset-0 ${method.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <method.icon size={22} className={`${method.color} transition-transform group-hover:scale-110`} />
                  <span className="text-[10px] font-black text-slate-300 group-hover:text-white transition-colors">{method.label}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="popLayout">
              {payments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">الدفعات الحالية</span>
                    {totalPaid >= total && total > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black italic"
                      >
                        Ready to close <CheckCircle size={12} />
                      </motion.div>
                    )}
                  </div>

                  {payments.map((payment, index) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={`${payment.method}-${index}`}
                      className="flex items-center gap-3 bg-white/[0.02] p-2.5 sm:p-3 rounded-[1.25rem] border border-white/5 group hover:border-white/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors shrink-0">
                            {getPaymentIcon(payment.method)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate">{getPaymentLabel(payment.method)}</p>
                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">Transaction Ref ID</p>
                          </div>
                        </div>

                        <div className="relative group/ref">
                          <input
                            type="text"
                            placeholder="أدخل الرقم المرجعي أو ملاحظة العملية هنا..."
                            value={payment.reference || ''}
                            onChange={(event) => updatePaymentReference(index, event.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-300 outline-none focus:border-blue-500/30 transition-all placeholder:text-slate-700 placeholder:font-bold"
                          />
                          <FileText size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within/ref:text-blue-500 transition-colors" />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="relative w-28 sm:w-36">
                          <input
                            type="number"
                            value={payment.amount}
                            onChange={(event) => updatePaymentAmount(index, event.target.value)}
                            className="w-full bg-slate-950 border-2 border-white/5 rounded-xl px-4 py-2 text-right text-sm font-mono font-black text-emerald-500 outline-none focus:border-emerald-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-black">₪</span>
                        </div>
                        <button
                          onClick={() => removePayment(index)}
                          className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-black text-slate-600 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                        >
                          <Trash2 size={12} /> حذف الدفعة
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
