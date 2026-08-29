// src/components/Hospitality/PaymentMethodModal.tsx
//
// مودال اختيار طريقة الدفع عند إغلاق/تحصيل فاتورة.
// بدونه كان النظام بيفترض "نقدي" بصمت دايماً — راجع feedback الجلسة.
//
// بالكاشير العادي (pos.tsx) بيستقبل كمان بيانات الزبون والحساب (اسم/جوال/بحث
// عن عميل-مورد-موظف) عشان الكاشير ما يحتاج يروح لتاب منفصل قبل ما يقفل الفاتورة —
// هاي الحقول اختيارية وما بتظهر إلا إذا الأب مرر setCustomerName (حالة الضيافة
// اللي بتستخدم هالمودال من HospitalityOrders.tsx ما بتمررها فبتضل زي ما كانت).

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote, CreditCard, Wallet, X, Search, Loader2,
  Users, UserCheck, Truck, Phone, Tag,
} from "lucide-react";
import { PaymentMethod } from "../../../types";
import { customerService } from "../../services/customerService";
import { employeeService } from "../../services/employeeService";
import { supplierService } from "../../services/supplierService";

export const requiresPaymentReference = (method: PaymentMethod) =>
  method === PaymentMethod.WALLET || method === PaymentMethod.QR || method === PaymentMethod.ONLINE ||
  method === PaymentMethod.CREDIT_CARD;

interface PaymentMethodOption {
  method: PaymentMethod;
  label: string;
  icon: React.ElementType;
}

const OPTIONS: PaymentMethodOption[] = [
  { method: PaymentMethod.CASH, label: "نقدي", icon: Banknote },
  { method: PaymentMethod.CREDIT_CARD, label: "بطاقة", icon: CreditCard },
  { method: PaymentMethod.WALLET, label: "محفظة / تحويل", icon: Wallet },
];

interface EntityResult {
  id: number;
  name: string;
  phone: string;
  balance: number;
  creditLimit?: number;
  isBlocked?: boolean;
  status?: string;
}

type AccountType = "ACCOUNT" | "SUPPLIER" | "EMPLOYEE";

interface PaymentMethodModalProps {
  show: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, reference?: string, currency?: string, exchangeRate?: number) => void;
  confirming?: boolean;

  // بيانات الزبون والحساب — اختيارية (كاشير فقط)
  customerName?: string;
  setCustomerName?: (name: string) => void;
  customerPhone?: string;
  setCustomerPhone?: (phone: string) => void;
  accountType?: AccountType;
  setAccountType?: (type: AccountType) => void;
  accountNumber?: string;
  setAccountNumber?: (num: string) => void;
  setShowSearchModal?: (show: boolean) => void;
}

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  show,
  total,
  onClose,
  onConfirm,
  confirming = false,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  accountType,
  setAccountType,
  accountNumber,
  setAccountNumber,
  setShowSearchModal,
}) => {
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const accountSearchInputRef = useRef<HTMLInputElement>(null);

  const showAccountFields = !!setCustomerName;

  // ── بحث الحساب (عميل/مورد/موظف) ─────────────────────────────────────────
  const [showAccountSuggestions, setShowAccountSuggestions] = useState(false);
  const [entityResults, setEntityResults] = useState<EntityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityResult | null>(null);

  useEffect(() => {
    if (!showAccountFields || !accountNumber || accountNumber.length < 1 || !showAccountSuggestions) {
      setEntityResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let results: EntityResult[] = [];

        if (accountType === "ACCOUNT") {
          const res = await customerService.list({ search: accountNumber, per_page: 10 });
          const paginatedData: any = res?.data?.data;
          const data: any[] = Array.isArray(paginatedData) ? paginatedData : (paginatedData?.data || []);
          results = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || "",
            balance: Number(c.balance) || 0,
            creditLimit: Number(c.credit_limit) || 0,
            isBlocked: c.status === "blocked" || false,
          }));
        } else if (accountType === "SUPPLIER") {
          const res = await supplierService.list({ search: accountNumber, per_page: 10 });
          const data = res?.data?.data || [];
          results = data.map((s: any) => ({
            id: s.id,
            name: s.name,
            phone: s.phone || "",
            balance: s.balance || 0,
          }));
        } else if (accountType === "EMPLOYEE") {
          const data = await employeeService.getAll({ search: accountNumber });
          const employeesData = Array.isArray(data) ? data : [];
          results = employeesData.map((e: any) => ({
            id: e.id,
            name: e.name,
            phone: e.phone || "",
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
  }, [accountNumber, accountType, showAccountSuggestions, showAccountFields]);

  useEffect(() => {
    if (!selectedEntity) return;
    setCustomerName?.(selectedEntity.name);
    setCustomerPhone?.(selectedEntity.phone);
  }, [selectedEntity]);

  // المودال بيتصفر بين فتحة وفتحة عشان ما يفضل حساب طلب سابق عالق
  useEffect(() => {
    if (!show) {
      setSelected(null);
      setReference("");
      setError("");
      setSelectedEntity(null);
      setShowAccountSuggestions(false);
      setEntityResults([]);
    }
  }, [show]);

  const handleSelectAccount = (entity: EntityResult) => {
    setAccountNumber?.(String(entity.id));
    setSelectedEntity(entity);
    setShowAccountSuggestions(false);
  };

  const entityTypeLabel = accountType === "ACCOUNT" ? "عميل" : accountType === "SUPPLIER" ? "مورد" : "موظف";
  const entityPaymentMethod =
    accountType === "ACCOUNT" ? PaymentMethod.CUSTOMER
      : accountType === "SUPPLIER" ? PaymentMethod.SUPPLIER
      : PaymentMethod.EMPLOYEE;

  const options: PaymentMethodOption[] = selectedEntity
    ? [...OPTIONS, { method: entityPaymentMethod, label: `حساب ${entityTypeLabel}`, icon: entityTypeLabel === "عميل" ? Users : entityTypeLabel === "مورد" ? Truck : UserCheck }]
    : OPTIONS;

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = () => {
    if (!selected) {
      setError("اختر طريقة الدفع أولاً");
      return;
    }
    if (requiresPaymentReference(selected) && !reference.trim()) {
      setError("يرجى إدخال الرقم المرجعي");
      return;
    }
    onConfirm(selected, reference.trim() || undefined);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden p-7 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">إتمام الفاتورة</h3>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {showAccountFields && (
              <div className="space-y-3 border-b border-white/5 pb-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white">بيانات الزبون والحساب</h4>
                  {(setAccountType || setShowSearchModal) && (
                    <button
                      onClick={() => {
                        if (setAccountType) {
                          setShowAccountSuggestions(true);
                          setTimeout(() => accountSearchInputRef.current?.focus(), 0);
                        } else {
                          setShowSearchModal?.(true);
                        }
                      }}
                      className="flex items-center gap-1.5 bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors px-2.5 py-1.5 rounded-lg text-[10px] font-black active:scale-95"
                    >
                      <Search size={11} />
                      بحث عن عميل مسجل
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={customerName ?? ""}
                      onChange={(e) => setCustomerName?.(e.target.value)}
                      placeholder="اسم الزبون..."
                      className="w-full p-2 bg-slate-800 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-red-600 font-black text-[10px] text-white"
                    />
                    {selectedEntity && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-emerald-500/20 text-emerald-500 px-1 py-0.5 rounded text-[7px] font-bold">
                        <Tag size={7} />
                        {entityTypeLabel}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customerPhone ?? ""}
                    onChange={(e) => setCustomerPhone?.(e.target.value)}
                    placeholder="رقم الجوال..."
                    className="w-full p-2 bg-slate-800 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-red-600 font-black text-[10px] text-white"
                  />
                </div>

                {setAccountType && (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={accountType}
                      onChange={(e) => {
                        setAccountType(e.target.value as AccountType);
                        setAccountNumber?.("");
                        setSelectedEntity(null);
                        setEntityResults([]);
                        setShowAccountSuggestions(false);
                      }}
                      className="w-full p-2 bg-slate-800 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-red-600 font-black text-[10px] text-white appearance-none"
                    >
                      <option value="ACCOUNT">زبون</option>
                      <option value="SUPPLIER">مورد</option>
                      <option value="EMPLOYEE">موظف</option>
                    </select>
                    <div className="relative">
                      <input
                        ref={accountSearchInputRef}
                        type="text"
                        value={accountNumber ?? ""}
                        onChange={(e) => {
                          setAccountNumber?.(e.target.value);
                          setSelectedEntity(null);
                          setShowAccountSuggestions(true);
                        }}
                        onFocus={() => setShowAccountSuggestions(true)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && entityResults.length > 0) {
                            event.preventDefault();
                            handleSelectAccount(entityResults[0]);
                          }
                          if (event.key === "Escape") setShowAccountSuggestions(false);
                        }}
                        placeholder="ابحث بالاسم/الجوال..."
                        className="w-full p-2 pl-7 bg-slate-800 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-red-600 font-black text-[10px] text-white"
                      />
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />

                      <AnimatePresence>
                        {showAccountSuggestions && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute z-50 w-56 -left-2 mt-1.5 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                          >
                            <div className="p-1.5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                                {isSearching ? "جاري البحث..." : "نتائج البحث"}
                              </span>
                              <button type="button" onClick={() => setShowAccountSuggestions(false)}>
                                <X size={10} className="text-slate-500 hover:text-white" />
                              </button>
                            </div>

                            {isSearching && (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 size={14} className="text-red-500 animate-spin" />
                              </div>
                            )}

                            {!isSearching && entityResults.length > 0 && (
                              <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                {entityResults.map((entity) => (
                                  <button
                                    key={`${accountType}-${entity.id}`}
                                    type="button"
                                    onClick={() => handleSelectAccount(entity)}
                                    className="w-full text-right p-2 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center ${entity.isBlocked ? "bg-red-500/10 text-red-500" : "bg-slate-800 text-slate-400"}`}>
                                        {accountType === "ACCOUNT" ? <Users size={11} /> : accountType === "SUPPLIER" ? <Truck size={11} /> : <UserCheck size={11} />}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-black text-white truncate">{entity.name}</p>
                                        <p className="text-[8px] font-bold text-slate-500 flex items-center gap-1">
                                          <Phone size={7} /> {entity.phone || "—"}
                                        </p>
                                      </div>
                                    </div>
                                    <p className="text-[9px] font-mono font-black shrink-0">
                                      <span className={entity.balance > 0 ? "text-red-500" : "text-emerald-500"}>{entity.balance.toFixed(0)}</span>
                                    </p>
                                  </button>
                                ))}
                              </div>
                            )}

                            {!isSearching && accountNumber && entityResults.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                                <p className="text-[9px] font-black">لا توجد نتائج</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {selectedEntity && (
                  <div className="bg-slate-800/50 border border-white/5 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-[9px] font-black text-emerald-500">✓ {entityTypeLabel} محدد #{selectedEntity.id}</span>
                    <span className={`text-[10px] font-mono font-black ${selectedEntity.balance > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      رصيد: {selectedEntity.balance.toFixed(2)} ₪
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="text-center">
              <p className="text-slate-500 text-xs font-bold">المبلغ المطلوب تحصيله</p>
              <p className="text-3xl font-black text-white mt-1">{total.toFixed(2)} ₪</p>
            </div>

            <div className={`grid gap-2 ${options.length > 3 ? "grid-cols-4" : "grid-cols-3"}`}>
              {options.map(({ method, label, icon: Icon }) => (
                <button
                  key={method}
                  onClick={() => {
                    setSelected(method);
                    setError("");
                  }}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border font-bold text-[11px] transition-all active:scale-95 ${
                    selected === method
                      ? "bg-red-600 border-red-500 text-white"
                      : "bg-slate-800 border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            {selected && requiresPaymentReference(selected) && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
                  الرقم المرجعي
                </label>
                <input
                  type="text"
                  autoFocus
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={selected === PaymentMethod.CREDIT_CARD ? "رقم عملية البطاقة..." : "رقم العملية / التحويل..."}
                  className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-xs text-white"
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs font-bold text-center">{error}</p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full bg-red-600 text-white py-3 rounded-2xl font-black text-xs shadow-lg shadow-red-900/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {confirming ? "جاري التحصيل..." : "تأكيد وتحصيل الفاتورة"}
              </button>
              <button
                onClick={handleClose}
                className="w-full bg-slate-800 text-slate-400 py-3 rounded-2xl font-black text-xs active:scale-95 transition-all"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
