import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CheckCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Phone,
  Search,
  Trash2,
  Truck,
  UserCheck,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PaymentMethod } from "../../../types";
import type { PaymentEntry } from "../../hooks/useCallCenterCart";
import { customerService } from "../../services/customerService";
import { employeeService } from "../../services/employeeService";
import { supplierService } from "../../services/supplierService";
import { settlementService, type PaymentMethodDto } from "../../services/settlementService";
import type { NewCallerDraft } from "./CallCenterPOS";
import {
  callCenterService,
  type CustomerAddress,
  type CustomerSearchResult,
  type DeliveryQuote,
} from "./services/callCenterService";

type AccountType = "ACCOUNT" | "SUPPLIER" | "EMPLOYEE";

interface EntityResult {
  id: number;
  name: string;
  phone: string;
  balance: number;
  creditLimit?: number;
  isBlocked?: boolean;
  status?: string;
}

const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

const money = (value: number) => `${roundMoney(value).toFixed(2)} ₪`;

const inputClass =
  "h-[52px] w-full rounded-xl border border-[#30363D] bg-[#1D242D] px-4 text-sm font-black text-[#F0F6FC] outline-none transition-all placeholder:text-[#6E7681] focus:border-[#A30000] focus:ring-2 focus:ring-[#A30000]/25";

const directMethodStyles: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; hoverBorder: string }
> = {
  cash: {
    label: "كاش",
    icon: Banknote,
    color: "text-[#10B981]",
    bg: "bg-[#10B981]/[0.08]",
    hoverBorder: "hover:border-[#10B981]/50",
  },
  card: {
    label: "بطاقة",
    icon: CreditCard,
    color: "text-[#FF5A5F]",
    bg: "bg-[#FF5A5F]/[0.08]",
    hoverBorder: "hover:border-[#FF5A5F]/50",
  },
  wallet: {
    label: "تطبيق",
    icon: Wallet,
    color: "text-[#8B5CF6]",
    bg: "bg-[#8B5CF6]/[0.08]",
    hoverBorder: "hover:border-[#8B5CF6]/50",
  },
  bank: {
    label: "بنكي",
    icon: Zap,
    color: "text-[#FACC15]",
    bg: "bg-[#FACC15]/[0.08]",
    hoverBorder: "hover:border-[#FACC15]/50",
  },
  customer: {
    label: "زبون",
    icon: Users,
    color: "text-[#FF5A5F]",
    bg: "bg-[#A30000]/10",
    hoverBorder: "hover:border-[#A30000]/50",
  },
  employee: {
    label: "موظف",
    icon: UserCheck,
    color: "text-[#FF5A5F]",
    bg: "bg-[#A30000]/10",
    hoverBorder: "hover:border-[#A30000]/50",
  },
  supplier: {
    label: "مورد",
    icon: Truck,
    color: "text-[#FACC15]",
    bg: "bg-[#FACC15]/5",
    hoverBorder: "hover:border-[#FACC15]/40",
  },
};

const paymentMethodMap: Record<PaymentMethodDto["type"], PaymentMethod> = {
  cash: PaymentMethod.CASH,
  card: PaymentMethod.CREDIT_CARD,
  bank: PaymentMethod.QR,
  wallet: PaymentMethod.WALLET,
  customer: PaymentMethod.CUSTOMER,
  employee: PaymentMethod.EMPLOYEE,
  supplier: PaymentMethod.SUPPLIER,
};

const paymentMethodTypeMap: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "cash",
  [PaymentMethod.CREDIT_CARD]: "card",
  [PaymentMethod.WALLET]: "wallet",
  [PaymentMethod.QR]: "bank",
  [PaymentMethod.ONLINE]: "wallet",
  [PaymentMethod.EMPLOYEE]: "employee",
  [PaymentMethod.CUSTOMER]: "customer",
  [PaymentMethod.SUPPLIER]: "supplier",
};

const entityTypeLabel = (type: AccountType) =>
  type === "ACCOUNT" ? "زبون" : type === "SUPPLIER" ? "مورد" : "موظف";

const accountTypeToEntityType = (
  type: AccountType,
): "customer" | "employee" | "supplier" =>
  type === "ACCOUNT" ? "customer" : type === "SUPPLIER" ? "supplier" : "employee";

export interface CallCenterCustomerAccountTabProps {
  customer: CustomerSearchResult | null;
  newCaller: NewCallerDraft;
  onNewCaller: React.Dispatch<React.SetStateAction<NewCallerDraft>>;
  onSelectCustomer: (customer: CustomerSearchResult) => Promise<void> | void;
  selectedAddress: CustomerAddress | null;
  onSelectAddress: (address: CustomerAddress | null) => void;
  orderMode: "delivery" | "takeaway";
  deliveryQuote: DeliveryQuote | null;
  quoteLoading: boolean;
  quoteError: string;
  total: number;
  payments: PaymentEntry[];
  onPayments: (payments: PaymentEntry[]) => void;
  onOpenProfile: () => void;
}

export const CallCenterCustomerAccountTab: React.FC<CallCenterCustomerAccountTabProps> = ({
  customer,
  newCaller,
  onNewCaller,
  onSelectCustomer,
  selectedAddress,
  onSelectAddress,
  orderMode,
  deliveryQuote,
  quoteLoading,
  quoteError,
  total,
  payments,
  onPayments,
  onOpenProfile,
}) => {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);

  const [accountType, setAccountType] = useState<AccountType>("ACCOUNT");
  const [accountNumber, setAccountNumber] = useState("");
  const [showAccountSuggestions, setShowAccountSuggestions] = useState(false);
  const [accountResults, setAccountResults] = useState<EntityResult[]>([]);
  const [accountSearching, setAccountSearching] = useState(false);
  const [selectedFinancialEntity, setSelectedFinancialEntity] =
    useState<EntityResult | null>(null);
  const [selectedEntityBalance, setSelectedEntityBalance] = useState<number>(0);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDto[]>([]);
  const [methodError, setMethodError] = useState("");

  const customerSearchGeneration = useRef(0);
  const accountSearchGeneration = useRef(0);
  const addressGeneration = useRef(0);

  useEffect(() => {
    settlementService
      .getPaymentMethods()
      .then((methods) => {
        setPaymentMethods(methods.filter((method) => method.is_active));
      })
      .catch(() => setMethodError("تعذر تحميل طرق الدفع النشطة"));
  }, []);

  useEffect(() => {
    const generation = ++customerSearchGeneration.current;
    const value = customerQuery.trim();
    if (value.length < 2) {
      setCustomerResults([]);
      setCustomerSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const response = await callCenterService.searchCustomers(value, 12);
        if (customerSearchGeneration.current === generation) {
          setCustomerResults(response.data);
        }
      } catch {
        if (customerSearchGeneration.current === generation) {
          setCustomerResults([]);
        }
      } finally {
        if (customerSearchGeneration.current === generation) {
          setCustomerSearching(false);
        }
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [customerQuery]);

  useEffect(() => {
    const generation = ++addressGeneration.current;
    setAddresses([]);
    if (!customer) return;

    setAddressLoading(true);
    callCenterService
      .getCustomerAddresses(customer.id)
      .then((response) => {
        if (addressGeneration.current !== generation) return;
        setAddresses((response.data as CustomerAddress[]).filter((row) => row.is_active));
      })
      .catch(() => {
        if (addressGeneration.current === generation) setAddresses([]);
      })
      .finally(() => {
        if (addressGeneration.current === generation) setAddressLoading(false);
      });
  }, [customer?.id]);

  useEffect(() => {
    const value = accountNumber.trim();
    if (!showAccountSuggestions || value.length < 1) {
      setAccountResults([]);
      setAccountSearching(false);
      return;
    }

    const generation = ++accountSearchGeneration.current;
    const timer = window.setTimeout(async () => {
      setAccountSearching(true);
      try {
        let results: EntityResult[] = [];

        if (accountType === "ACCOUNT") {
          const response = await customerService.list({ search: value, per_page: 10 });
          const paginatedData: any = response?.data?.data;
          const data: any[] = Array.isArray(paginatedData)
            ? paginatedData
            : paginatedData?.data || [];
          results = data.map((row: any) => ({
            id: Number(row.id),
            name: row.name,
            phone: row.phone || row.mobile || "",
            balance: Number(row.balance) || 0,
            creditLimit: Number(row.credit_limit) || 0,
            isBlocked: row.status === "blocked" || false,
          }));
        } else if (accountType === "SUPPLIER") {
          const response = await supplierService.list({ search: value, per_page: 10 });
          const data = response?.data?.data || [];
          results = data.map((row: any) => ({
            id: Number(row.id),
            name: row.name,
            phone: row.phone || "",
            balance: Number(row.balance) || 0,
            creditLimit: Number(row.credit_limit) || 0,
            isBlocked: row.status === "blocked" || false,
          }));
        } else {
          const data = await employeeService.getAll({ search: value });
          const employees = Array.isArray(data) ? data : [];
          results = employees.map((row: any) => ({
            id: Number(row.id),
            name: row.name,
            phone: row.phone || "",
            balance: Number(row.outstanding_advance) || 0,
            status: row.employment_status,
            isBlocked: row.status === "blocked" || false,
          }));
        }

        if (accountSearchGeneration.current === generation) {
          setAccountResults(results);
        }
      } catch {
        if (accountSearchGeneration.current === generation) {
          setAccountResults([]);
        }
      } finally {
        if (accountSearchGeneration.current === generation) {
          setAccountSearching(false);
        }
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [accountNumber, accountType, showAccountSuggestions]);

  useEffect(() => {
    if (!selectedFinancialEntity) return;
    setSelectedEntityBalance(selectedFinancialEntity.balance);
  }, [selectedFinancialEntity]);

  const paid = useMemo(
    () => roundMoney(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
    [payments],
  );
  const remaining = Math.max(0, roundMoney(total - paid));
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  const handleSelectCustomer = async (row: CustomerSearchResult) => {
    customerSearchGeneration.current += 1;
    addressGeneration.current += 1;
    setCustomerResults([]);
    setCustomerQuery("");
    setAddresses([]);
    onSelectAddress(null);
    await onSelectCustomer(row);
  };

  const handleSelectFinancialEntity = (entity: EntityResult) => {
    setAccountNumber(String(entity.id));
    setSelectedFinancialEntity(entity);
    setSelectedEntityBalance(entity.balance);
    setShowAccountSuggestions(false);
  };

  const handleAccountTypeChange = (value: AccountType) => {
    setAccountType(value);
    setAccountNumber("");
    setSelectedFinancialEntity(null);
    setSelectedEntityBalance(0);
    setAccountResults([]);
    setShowAccountSuggestions(false);
  };

  const directMethods = paymentMethods.filter((method) => !method.is_entity);
  const selectedEntityType = accountTypeToEntityType(accountType);
  const backendEntityMethods = paymentMethods.filter(
    (method) => method.is_entity && method.type === selectedEntityType,
  );
  const fallbackEntityMethod = selectedFinancialEntity
    ? [
        {
          id: 0,
          name: `تسديد على حساب ${entityTypeLabel(accountType)}`,
          type: selectedEntityType,
          account: null,
          is_active: true,
          is_entity: true,
        } satisfies PaymentMethodDto,
      ]
    : [];
  const entityMethods = backendEntityMethods.length > 0 ? backendEntityMethods : fallbackEntityMethod;

  const getPaymentIcon = (type: string) => {
    const meta = directMethodStyles[type];
    const Icon = meta?.icon || Banknote;
    return <Icon size={22} />;
  };

  const addPayment = (method: PaymentMethodDto) => {
    if (remaining <= 0) return;

    if (method.is_entity && !selectedFinancialEntity) {
      setMethodError("حدد الجهة المالية أولاً قبل إضافة دفعة على الحساب");
      return;
    }

    const methodType = paymentMethodMap[method.type];
    const entityType = method.is_entity ? selectedEntityType : undefined;
    const entityId = method.is_entity ? selectedFinancialEntity?.id : undefined;

    onPayments([
      ...payments,
      {
        method: methodType,
        amount: roundMoney(remaining),
        entity_type: entityType,
        entity_id: entityId,
        subledger_type: entityType,
        subledger_id: entityId,
      },
    ]);
    setMethodError("");
  };

  const updatePaymentAmount = (index: number, value: string) => {
    const amount = Number(value) || 0;
    onPayments(
      payments.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, amount: roundMoney(amount) } : payment,
      ),
    );
  };

  const updatePaymentReference = (index: number, value: string) => {
    onPayments(
      payments.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, reference: value } : payment,
      ),
    );
  };

  const removePayment = (index: number) => {
    onPayments(payments.filter((_, paymentIndex) => paymentIndex !== index));
  };

  return (
    <div
      dir="rtl"
      className="h-full min-h-0 overflow-y-auto custom-scrollbar bg-[#161B22] border border-white/5 rounded-[24px] sm:rounded-[32px] p-5 sm:p-10 pb-24 sm:pb-10 font-['Cairo','Tajawal',Arial,sans-serif]"
    >
      <div className="mx-auto w-full max-w-3xl space-y-12">
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
            <h4 className="text-lg sm:text-xl font-black text-[#F0F6FC]">بيانات العميل</h4>
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-1 text-[12px] font-bold text-red-500 hover:underline"
            >
              <Search size={13} />
              فتح الملف الكامل
            </button>
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B949E]"
            />
            <input
              value={customerQuery}
              onChange={(event) => setCustomerQuery(event.target.value)}
              placeholder="ابحث باسم العميل أو رقمه..."
              className={`${inputClass} pr-11`}
            />
            {customerSearching && (
              <Loader2
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-[#A30000]"
              />
            )}

            <AnimatePresence>
              {customerResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[#30363D] bg-[#161B22] shadow-2xl"
                >
                  {customerResults.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => void handleSelectCustomer(row)}
                      className="flex w-full items-center justify-between border-b border-[#30363D]/60 px-4 py-4 text-right transition-colors last:border-0 hover:bg-white/[0.035]"
                    >
                      <div className="min-w-0 text-right">
                        <p className="truncate text-[14px] font-black text-[#F0F6FC]">{row.name}</p>
                        <p className="flex items-center gap-1 text-[11px] font-bold text-[#8B949E]">
                          <Phone size={8} />
                          {row.phone || row.mobile || "بدون هاتف"}
                          <span className="mx-1">·</span>
                          {row.code || `#${row.id}`}
                        </p>
                      </div>
                      <UserCheck size={18} className="text-[#A30000]" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {customer ? (
            <div className="space-y-4 rounded-2xl border border-[#30363D] bg-[#1D242D] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black text-emerald-500">
                  ✓ العميل المحدد
                </span>
                <span className="text-[11px] font-bold text-[#8B949E]">رقم: {customer.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#0B0F12] p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#6E7681]">
                    الرصيد الحالي
                  </p>
                  <p
                    className={`font-mono text-sm font-black ${
                      selectedEntityBalance > 0 ? "text-[#EF4444]" : "text-[#10B981]"
                    }`}
                  >
                    {money(selectedEntityBalance)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#0B0F12] p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#6E7681]">
                    الهاتف
                  </p>
                  <p className="text-base font-black text-[#F0F6FC]">
                    {customer.phone || customer.mobile || "غير متوفر"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="border-b border-[#30363D] pb-3">
            <h3 className="text-[24px] font-black text-[#F0F6FC]">بيانات التوصيل</h3>
            <p className="mt-1 text-[12px] font-bold text-[#8B949E]">
              {orderMode === "takeaway"
                ? "طلب استلام من الفرع"
                : "اختر عنواناً صالحاً ليتم احتساب التوصيل"}
            </p>
          </div>

          {orderMode === "delivery" && (
            <>
              {customer ? (
                <div className="space-y-3">
                  {addressLoading ? (
                    <div className="flex min-h-24 items-center justify-center">
                      <Loader2 size={18} className="animate-spin text-[#A30000]" />
                    </div>
                  ) : addresses.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {addresses.map((address) => (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => onSelectAddress(address)}
                          className={`min-h-24 rounded-xl border p-4 text-right transition-all ${
                            selectedAddress?.id === address.id
                              ? "border-[#A30000] bg-[#A30000]/10"
                              : "border-[#30363D] bg-[#1D242D] hover:border-white/20"
                          }`}
                        >
                          <strong className="block text-[15px] font-black text-[#F0F6FC]">
                            {address.label || "عنوان"}
                          </strong>
                          <span className="mt-1 block text-[13px] leading-6 text-[#8B949E]">
                            {[address.city, address.area, address.district, address.street, address.building_no]
                              .filter(Boolean)
                              .join("، ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-[#30363D] p-6 text-center text-[13px] text-[#8B949E]">
                      لا توجد عناوين نشطة في ملف العميل
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(["city", "area", "addressLine", "landmark"] as const).map((field) => (
                    <label key={field} className="text-[13px] font-bold text-[#8B949E]">
                      {field === "city"
                        ? "المدينة"
                        : field === "area"
                          ? "المنطقة"
                          : field === "addressLine"
                            ? "العنوان التفصيلي"
                            : "أقرب معلم"}
                      <input
                        value={(newCaller as any)[field]}
                        onChange={(event) =>
                          onNewCaller((current) => ({ ...current, [field]: event.target.value }))
                        }
                        className={`${inputClass} mt-1.5`}
                      />
                    </label>
                  ))}
                  <label className="text-[13px] font-bold text-[#8B949E] sm:col-span-2">
                    تعليمات التوصيل
                    <textarea
                      value={newCaller.deliveryNotes}
                      onChange={(event) =>
                        onNewCaller((current) => ({ ...current, deliveryNotes: event.target.value }))
                      }
                      className={`${inputClass} mt-1.5 min-h-24 py-3`}
                    />
                  </label>
                </div>
              )}

              <div
                aria-live="polite"
                className={`rounded-xl border p-4 text-[13px] ${
                  deliveryQuote
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : quoteError
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                }`}
              >
                {quoteLoading
                  ? "جارٍ احتساب التوصيل..."
                  : deliveryQuote
                    ? `${deliveryQuote.zone_name} · ${money(deliveryQuote.fee)} · نحو ${deliveryQuote.eta_minutes} دقيقة`
                    : quoteError || "اختر أو أدخل عنواناً لعرض التوصيل"}
              </div>
            </>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
            <h4 className="text-lg sm:text-xl font-black text-[#F0F6FC]">بيانات الحساب المالي</h4>
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-1 text-[12px] font-bold text-red-500 hover:underline"
            >
              <Search size={13} />
              فتح الملف الكامل
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 items-start">
            <div className="space-y-2">
              <label className="mb-2 block text-[13px] font-black text-[#8B949E]">
                نوع الحساب
              </label>
              <select
                value={accountType}
                onChange={(event) => handleAccountTypeChange(event.target.value as AccountType)}
                className="h-[58px] w-full rounded-xl border border-[#30363D] bg-[#1D242D] px-4 text-right text-[15px] font-black text-[#F0F6FC] outline-none transition-all focus:border-[#A30000] focus:ring-2 focus:ring-[#A30000]/25"
              >
                <option value="ACCOUNT">زبون</option>
                <option value="SUPPLIER">مورد</option>
                <option value="EMPLOYEE">موظف</option>
              </select>
            </div>

            <div className="space-y-2 relative">
              <label className="mb-2 block text-[13px] font-black text-[#8B949E]">
                ابحث بالاسم / الرقم
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(event) => {
                    setAccountNumber(event.target.value);
                    setSelectedFinancialEntity(null);
                    setSelectedEntityBalance(0);
                    setShowAccountSuggestions(true);
                  }}
                  onFocus={() => setShowAccountSuggestions(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && accountResults.length > 0) {
                      event.preventDefault();
                      handleSelectFinancialEntity(accountResults[0]);
                    }
                    if (event.key === "Escape") {
                      setShowAccountSuggestions(false);
                    }
                  }}
                  placeholder="ابحث بالاسم أو رقم الجوال..."
                  className={`${inputClass} pl-11`}
                />
                <Search
                  size={14}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B949E]"
                />
              </div>

              <AnimatePresence>
                {showAccountSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[#30363D] bg-[#161B22] shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-[#30363D] bg-[#1D242D] px-4 py-3">
                      <span className="text-[11px] font-black text-[#8B949E]">
                        {accountSearching ? "جارٍ البحث..." : "نتائج البحث من قاعدة البيانات"}
                      </span>
                      <button type="button" onClick={() => setShowAccountSuggestions(false)}>
                        <X size={12} className="text-[#8B949E] hover:text-[#F0F6FC]" />
                      </button>
                    </div>

                    {accountSearching && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={18} className="animate-spin text-[#A30000]" />
                      </div>
                    )}

                    {!accountSearching && accountResults.length > 0 && (
                      <div className="max-h-72 overflow-y-auto custom-scrollbar">
                        {accountResults.map((entity) => {
                          const Icon =
                            accountType === "ACCOUNT"
                              ? Users
                              : accountType === "SUPPLIER"
                                ? Truck
                                : UserCheck;
                          return (
                            <button
                              key={`${accountType}-${entity.id}`}
                              type="button"
                              onClick={() => handleSelectFinancialEntity(entity)}
                              className="group flex w-full items-center justify-between border-b border-[#30363D]/60 px-4 py-4 text-right transition-colors last:border-0 hover:bg-white/[0.035]"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                    entity.isBlocked
                                      ? "bg-[#EF4444]/10 text-[#EF4444]"
                                      : "bg-[#1D242D] text-[#8B949E] group-hover:bg-[#A30000]/10 group-hover:text-[#A30000]"
                                  }`}
                                >
                                  <Icon size={16} />
                                </div>
                                <div className="text-right">
                                  <p className="text-[14px] font-black text-[#F0F6FC]">{entity.name}</p>
                                  <p className="flex items-center gap-1 text-[11px] font-bold text-[#8B949E]">
                                    <Phone size={8} />
                                    {entity.phone || "—"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-left space-y-0.5">
                                <p className="font-mono text-[11px] font-black text-[#8B949E]">
                                  رصيد:{" "}
                                  <span className={entity.balance > 0 ? "text-[#EF4444]" : "text-[#10B981]"}>
                                    {entity.balance.toFixed(2)}
                                  </span>
                                </p>
                                {entity.creditLimit && entity.creditLimit > 0 ? (
                                  <p className="text-[9px] font-bold text-[#6E7681]">
                                    حد ائتماني: {entity.creditLimit.toFixed(2)} ₪
                                  </p>
                                ) : null}
                                {entity.isBlocked ? (
                                  <p className="text-[9px] font-black text-[#EF4444]">مظور</p>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!accountSearching && accountNumber && accountResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-[#8B949E]">
                        <Search size={20} className="mb-2 opacity-50" />
                        <p className="text-[11px] font-black">لا توجد نتائج</p>
                        <p className="text-[9px] font-bold text-[#6E7681]">
                          ابحث بالاسم أو رقم الجوال الصحيح
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {selectedFinancialEntity && (
            <div className="space-y-4 rounded-xl border border-[#30363D] bg-[#1D242D] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black text-emerald-500">
                  ✓ {entityTypeLabel(accountType)} محدد
                </span>
                <span className="text-[11px] font-bold text-[#8B949E]">
                  رقم: {selectedFinancialEntity.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#0B0F12] p-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#6E7681]">
                    الرصيد الحالي
                  </p>
                  <p
                    className={`font-mono text-sm font-black ${
                      selectedEntityBalance > 0 ? "text-[#EF4444]" : "text-[#10B981]"
                    }`}
                  >
                    {selectedEntityBalance.toFixed(2)} ₪
                  </p>
                </div>
                {selectedFinancialEntity.creditLimit && selectedFinancialEntity.creditLimit > 0 ? (
                <div className="rounded-lg bg-[#0B0F12] p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#6E7681]">
                      الحد الائتماني
                    </p>
                    <p className="font-mono text-sm font-black text-[#FACC15]">
                      {selectedFinancialEntity.creditLimit.toFixed(2)} ₪
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#0B0F12] p-3">
                    <p className="text-[8px] font-black uppercase tracking-wider text-[#6E7681]">
                      الحساب
                    </p>
                    <p className="text-base font-black text-[#F0F6FC]">
                      {selectedFinancialEntity.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-7 border-t border-[#30363D] pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-[22px] font-black text-[#F0F6FC] tracking-tight">
                  إتمام الدفع
                </h4>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8B949E]">
                  Split &amp; Payment Registry
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-[28px] font-mono font-black ${
                    remaining > 0 ? "text-[#EF4444]" : "text-[#10B981]"
                  } transition-colors duration-500`}
                >
                  {remaining.toLocaleString()}{" "}
                  <span className="text-sm">₪</span>
                </span>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#8B949E]">
                  المبلغ المتبقي تحصيله
                </p>
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full border border-[#30363D] bg-[#0B0F12] flex p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  paid >= total && total > 0
                    ? "bg-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-[#A30000]"
                }`}
              />
            </div>
          </div>

          {methodError && (
            <p className="rounded-lg bg-[#A30000]/[0.14] p-3 text-[13px] text-[#FF5A5F]">
              {methodError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {directMethods.map((method) => {
              const meta = directMethodStyles[method.type] || {
                label: method.name,
                icon: Banknote,
                color: "text-[#F0F6FC]",
                bg: "bg-white/5",
                hoverBorder: "hover:border-white/10",
              };
              const Icon = meta.icon;

              return (
                <button
                  key={method.id}
                  type="button"
                  disabled={remaining <= 0}
                  onClick={() => addPayment(method)}
                  className={`group relative flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-[#30363D] bg-[#1D242D] px-4 py-5 transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-20 disabled:grayscale disabled:hover:translate-y-0 overflow-hidden ${meta.hoverBorder}`}
                >
                  <div className={`absolute inset-0 ${meta.bg} opacity-0 transition-opacity group-hover:opacity-100`} />
                  <Icon size={24} className={`${meta.color} transition-transform group-hover:scale-110`} />
                  <span className="text-[12px] font-black text-[#D1D5DB] transition-colors group-hover:text-white">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>

          {entityMethods.length > 0 && selectedFinancialEntity ? (
            <div className="space-y-3">
              <h4 className="text-[12px] font-black uppercase tracking-widest text-[#8B949E]">
                حسابات الكيانات
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {entityMethods.map((method) => {
                  const meta = directMethodStyles[method.type] || {
                    label: method.name,
                    icon: Banknote,
                    color: "text-[#F0F6FC]",
                    bg: "bg-white/5",
                    hoverBorder: "hover:border-white/10",
                  };
                  const Icon = meta.icon;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      disabled={remaining <= 0}
                      onClick={() => addPayment(method)}
                      className={`group relative flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-[#30363D] bg-[#1D242D] px-4 py-5 transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-20 disabled:grayscale overflow-hidden ${meta.hoverBorder}`}
                    >
                      <div className={`absolute inset-0 ${meta.bg} opacity-0 transition-opacity group-hover:opacity-100`} />
                      <Icon size={24} className={`${meta.color} transition-transform group-hover:scale-110`} />
                      <span className="text-[12px] font-black text-[#D1D5DB] transition-colors group-hover:text-white">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <AnimatePresence mode="popLayout">
            {payments.length > 0 && (
              <div className="space-y-2">
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#8B949E]">
                    الدفعات الحالية
                  </span>
                  {paid >= total && total > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 text-[11px] font-black italic text-[#10B981]"
                    >
                      Ready to close <CheckCircle size={12} />
                    </motion.div>
                  ) : null}
                </div>

                {payments.map((payment, index) => {
                  const iconKey = paymentMethodTypeMap[payment.method] || "cash";
                  const methodMeta = directMethodStyles[iconKey] || directMethodStyles.cash;
                  const Icon = methodMeta.icon;

                  return (
                    <motion.div
                      layout
                      key={`${payment.method}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group flex items-center gap-3 rounded-[1.25rem] border border-[#30363D] bg-white/[0.02] p-3 sm:p-4 transition-colors hover:border-white/10"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-[#0B0F12] text-[#8B949E] transition-colors group-hover:bg-[#A30000]/10 group-hover:text-[#A30000]">
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0">
                        <p className="truncate text-[14px] font-black text-[#F0F6FC]">
                              {methodMeta.label}
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-tighter text-[#6E7681]">
                              Transaction Ref ID
                            </p>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            placeholder="أدخل الرقم المرجعي..."
                            value={payment.reference || ""}
                            onChange={(event) => updatePaymentReference(index, event.target.value)}
                          className="w-full rounded-lg border border-white/5 bg-black/40 px-3 py-3 text-[12px] font-black text-[#D1D5DB] outline-none transition-all placeholder:font-bold placeholder:text-[#374151] focus:border-[#2563EB]/30"
                          />
                          <FileText
                            size={10}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#374151] transition-colors group-focus-within:text-[#2563EB]"
                          />
                        </div>

                        {payment.entity_type ? (
                          <div className="text-[10px] font-bold text-[#8B949E]">
                            الجهة المالية: {entityTypeLabel(accountType)} #{payment.entity_id ?? "غير محدد"}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="relative w-28 sm:w-36">
                          <input
                            type="number"
                            value={payment.amount}
                            onChange={(event) => updatePaymentAmount(index, event.target.value)}
                            className="w-full rounded-xl border-2 border-white/5 bg-[#0B0F12] px-4 py-3 text-right font-mono text-[16px] font-black text-[#10B981] outline-none transition-all [appearance:textfield] focus:border-[#10B981]/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#6E7681]">
                            ₪
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePayment(index)}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black text-[#6E7681] transition-all hover:bg-[#EF4444]/5 hover:text-[#EF4444]"
                        >
                          <Trash2 size={12} />
                          حذف الدفعة
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};
