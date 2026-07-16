import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, Tag, AlertCircle, Banknote, CreditCard, Wallet, Zap,
  CheckCircle, Trash2, FileText, X, UserPlus, Phone, Hash,
  Loader2, Users, UserCheck, Truck,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PaymentMethod } from "../../../types";
import { customerService } from "../../services/customerService";
import { employeeService } from "../../services/employeeService";
import { supplierService } from "../../services/supplierService";

const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

interface EntityResult {
  id: number;
  name: string;
  phone: string;
  balance: number;
  creditLimit?: number;
  isBlocked?: boolean;
  status?: string;
}

interface CustomerTabProps {
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  customerAddress?: string;
  setCustomerAddress?: (address: string) => void;
  isCallCenterMode?: boolean;
  selectedCustomer: any;
  accountType: 'ACCOUNT' | 'SUPPLIER' | 'EMPLOYEE';
  setAccountType: (type: 'ACCOUNT' | 'SUPPLIER' | 'EMPLOYEE') => void;
  accountNumber: string;
  setAccountNumber: (num: string) => void;
  setShowSearchModal: (show: boolean) => void;
  customers: any[];
  suppliers: any[];
  employees: any[];
  isHospitality: boolean;
  total: number;
  payments: PaymentEntry[];
  addPayment: (method: PaymentMethod) => void;
  removePayment: (index: number) => void;
  updatePaymentAmount: (index: number, val: string) => void;
  updatePaymentReference: (index: number, val: string) => void;
  hidePaymentActions?: boolean;
}

export const CustomerTab: React.FC<CustomerTabProps> = ({
  customerName, setCustomerName, customerPhone, setCustomerPhone,
  customerAddress = "", setCustomerAddress, isCallCenterMode = false,
  selectedCustomer, accountType, setAccountType, accountNumber, setAccountNumber,
  setShowSearchModal, customers, suppliers, employees, isHospitality, total, payments, addPayment, removePayment,
  updatePaymentAmount, updatePaymentReference,
  hidePaymentActions = false,
}) => {
  const [showAccountSuggestions, setShowAccountSuggestions] = useState(false);
  const [entityResults, setEntityResults] = useState<EntityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityResult | null>(null);
  const [entityBalance, setEntityBalance] = useState<number>(0);

  const totalPaid = roundMoney(
    payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const remainingAmount = Math.max(0, roundMoney(total - totalPaid));
  const progress = total > 0 ? Math.min(100, (totalPaid / total) * 100) : 0;

  // ── Real entity search from API ──────────────────────────────────────────
  useEffect(() => {
    if (!accountNumber || accountNumber.length < 1 || !showAccountSuggestions) {
      setEntityResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let results: EntityResult[] = [];

        if (accountType === 'ACCOUNT') {
          const res = await customerService.list({ search: accountNumber, per_page: 10 });
          const paginatedData: any = res?.data?.data;
          const data: any[] = Array.isArray(paginatedData) ? paginatedData : (paginatedData?.data || []);
          results = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            balance: Number(c.balance) || 0,
            creditLimit: Number(c.credit_limit) || 0,
            isBlocked: c.status === 'blocked' || false,
          }));
        } else if (accountType === 'SUPPLIER') {
          const res = await supplierService.list({ search: accountNumber, per_page: 10 });
          const data = res?.data?.data || [];
          results = data.map((s: any) => ({
            id: s.id,
            name: s.name,
            phone: s.phone || '',
            balance: s.balance || 0,
          }));
        } else if (accountType === 'EMPLOYEE') {
          const data = await employeeService.getAll({ search: accountNumber });
          const employeesData = Array.isArray(data) ? data : [];
          results = employeesData.map((e: any) => ({
            id: e.id,
            name: e.name,
            phone: e.phone || '',
            balance: e.outstanding_advance || 0,
            status: e.employment_status,
          }));
        }

        setEntityResults(results);
      } catch (err) {
        console.error("Entity search failed:", err);
        setEntityResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [accountNumber, accountType, showAccountSuggestions]);

  // ── Fetch entity balance when selected ──────────────────────────────────
  useEffect(() => {
    if (!selectedEntity) return;
    setEntityBalance(selectedEntity.balance);
    setCustomerName(selectedEntity.name);
    setCustomerPhone(selectedEntity.phone);
  }, [selectedEntity, setCustomerName, setCustomerPhone]);

  const handleSelectAccount = (entity: EntityResult) => {
    setAccountNumber(String(entity.id));
    setSelectedEntity(entity);
    setShowAccountSuggestions(false);
  };

  // ── Payment Methods — تعتمد على نوع الحساب المختار ──
  // إذا اختار المستخدم كياناً (موظف/عميل/مورد)، نعرض زر تسديد على حساب الكيان فقط
  // وإلا نعرض وسائل الدفع النقدية المعتادة
  const entityPaymentMethods: Record<string, { id: string; label: string; icon: any; color: string; bg: string; hoverBorder: string }[]> = {
    EMPLOYEE: [
      { id: 'employee', label: 'تسديد على حساب الموظف', icon: UserCheck, color: 'text-cyan-500', bg: 'bg-cyan-500/5', hoverBorder: 'hover:border-cyan-500/30' },
    ],
    CUSTOMER: [
      { id: 'customer', label: 'تسديد على حساب العميل', icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-500/5', hoverBorder: 'hover:border-cyan-500/30' },
    ],
    SUPPLIER: [
      { id: 'supplier', label: 'تسديد على حساب المورد', icon: Truck, color: 'text-cyan-500', bg: 'bg-cyan-500/5', hoverBorder: 'hover:border-cyan-500/30' },
    ],
  };

  const directPaymentMethods = [
    { id: 'cash', label: 'كاش', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/5', hoverBorder: 'hover:border-emerald-500/30' },
    { id: 'card', label: 'بطاقة', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/5', hoverBorder: 'hover:border-blue-500/30' },
    { id: 'wallet', label: 'تطبيق', icon: Wallet, color: 'text-purple-500', bg: 'bg-purple-500/5', hoverBorder: 'hover:border-purple-500/30' },
    { id: 'bank', label: 'بنكي', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/5', hoverBorder: 'hover:border-amber-500/30' },
  ];

  // اختيار وسائل الدفع حسب نوع الحساب
  // accountType = 'ACCOUNT' يعني زبون → نستخدم مفتاح 'CUSTOMER'
  const entityTypeKey = accountType === 'ACCOUNT' ? 'CUSTOMER' : accountType;
  // FIXED: نعرض جميع وسائل الدفع (cash/bank/card/wallet + entity) معاً دائماً
  // حتى لو تم اختيار كيان، نسمح بالدفع المختلط
  const entityMethod = selectedEntity
    ? (entityPaymentMethods[entityTypeKey] || [])
    : [];
  const paymentMethods = [...directPaymentMethods, ...entityMethod];

  const getPaymentLabel = (method: string) => {
    if (method === 'cash') return 'كاش (نقد)';
    if (method === 'card') return 'بطاقة ائتمان';
    if (method === 'wallet') return 'المحفظة';
    if (method === 'bank') return 'تحويل بنكي';
    return 'دفعة';
  };

  const getPaymentIcon = (method: string) => {
    if (method === 'cash') return <Banknote size={18} />;
    if (method === 'card') return <CreditCard size={18} />;
    if (method === 'wallet') return <Wallet size={18} />;
    if (method === 'bank') return <Zap size={18} />;
    return <Banknote size={18} />;
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
                {selectedEntity && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-md text-[8px] font-bold">
                    <Tag size={8} />
                    {accountType === 'ACCOUNT' ? 'عميل' : accountType === 'SUPPLIER' ? 'مورد' : 'موظف'}
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
            {isCallCenterMode && (
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="invoice-customer-address" className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">عنوان التوصيل</label>
                <input
                  id="invoice-customer-address"
                  type="text"
                  value={customerAddress}
                  onChange={(event) => setCustomerAddress?.(event.target.value)}
                  placeholder="المدينة، المنطقة، الشارع، أقرب معلم"
                  autoComplete="street-address"
                  className="w-full p-2.5 sm:p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* Account Section — Real Data from API */}
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
                  setSelectedEntity(null);
                  setEntityBalance(0);
                  setEntityResults([]);
                  setShowAccountSuggestions(false);
                }}
                className="w-full p-2.5 sm:p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white transition-all appearance-none"
              >
                <option value="ACCOUNT">زبون</option>
                <option value="SUPPLIER">مورد</option>
                <option value="EMPLOYEE">موظف</option>
              </select>
            </div>
            <div className="space-y-1.5 relative">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">ابحث بالاسم / الرقم</label>
              <div className="relative">
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    setSelectedEntity(null);
                    setShowAccountSuggestions(true);
                  }}
                  onFocus={() => setShowAccountSuggestions(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && entityResults.length > 0) {
                      event.preventDefault();
                      handleSelectAccount(entityResults[0]);
                    }
                    if (event.key === 'Escape') {
                      setShowAccountSuggestions(false);
                    }
                  }}
                  placeholder="ابحث بالاسم أو رقم الجوال..."
                  className="w-full p-2.5 sm:p-3 pl-9 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white transition-all"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>

              {/* Entity Suggestions from Real API */}
              <AnimatePresence>
                {showAccountSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-50 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                  >
                    <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        {isSearching ? 'جاري البحث...' : 'نتائج البحث من قاعدة البيانات'}
                      </span>
                      <button type="button" onClick={() => setShowAccountSuggestions(false)}>
                        <X size={12} className="text-slate-500 hover:text-white" />
                      </button>
                    </div>

                    {isSearching && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={16} className="text-red-500 animate-spin" />
                      </div>
                    )}

                    {!isSearching && entityResults.length > 0 && (
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {entityResults.map((entity) => (
                          <button
                            key={`${accountType}-${entity.id}`}
                            type="button"
                            onClick={() => handleSelectAccount(entity)}
                            className="w-full text-right p-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${entity.isBlocked
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-slate-800 text-slate-400 group-hover:bg-red-500/10 group-hover:text-red-500'
                                }`}>
                                {accountType === 'ACCOUNT' ? <Users size={14} /> : accountType === 'SUPPLIER' ? <Truck size={14} /> : <UserCheck size={14} />}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-white">{entity.name}</p>
                                <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                  <Phone size={8} /> {entity.phone || '—'}
                                </p>
                              </div>
                            </div>
                            <div className="text-left space-y-0.5">
                              <p className="text-[10px] font-mono font-black text-slate-400">
                                رصيد: <span className={entity.balance > 0 ? 'text-red-500' : 'text-emerald-500'}>{entity.balance.toFixed(2)}</span>
                              </p>
                              {entity.creditLimit && entity.creditLimit > 0 && (
                                <p className="text-[8px] font-bold text-slate-600">
                                  حد ائتماني: {entity.creditLimit.toFixed(2)} ₪
                                </p>
                              )}
                              {entity.isBlocked && (
                                <p className="text-[8px] font-black text-red-500">⚠ محظور — لا يمكن البيع بالدين</p>
                              )}
                              {entity.status && entity.status !== 'active' && accountType === 'EMPLOYEE' && (
                                <p className="text-[8px] font-black text-amber-500">⚠ الموظف غير نشط</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!isSearching && accountNumber && entityResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                        <Search size={20} className="mb-2 opacity-50" />
                        <p className="text-[10px] font-black">لا توجد نتائج</p>
                        <p className="text-[8px] font-bold text-slate-600">ابحث باسم أو رقم جوال صحيح</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Selected Entity Info */}
          {selectedEntity && (
            <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-500">
                  ✓ {accountType === 'ACCOUNT' ? 'عميل' : accountType === 'SUPPLIER' ? 'مورد' : 'موظف'} محدد
                </span>
                <span className="text-[9px] text-slate-500 font-bold">
                  رقم: {selectedEntity.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 rounded-lg p-2">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-wider">الرصيد الحالي</p>
                  <p className={`text-sm font-mono font-black ${selectedEntity.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {selectedEntity.balance.toFixed(2)} ₪
                  </p>
                </div>
                {selectedEntity.creditLimit && selectedEntity.creditLimit > 0 && (
                  <div className="bg-slate-900 rounded-lg p-2">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-wider">الحد الائتماني</p>
                    <p className="text-sm font-mono font-black text-cyan-500">
                      {selectedEntity.creditLimit.toFixed(2)} ₪
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!isHospitality && !hidePaymentActions && (
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
                  onClick={() => addPayment(method.id as any)}
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
                            placeholder="أدخل الرقم المرجعي..."
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
