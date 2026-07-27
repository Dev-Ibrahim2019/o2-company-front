// src/components/call-center/CallCenterPOS.tsx
//
// POS الكول سنتر - يعيد استخدام مكونات POS الحالية مع تغيير سير العمل
// يعتمد على useCallCenterCall لإدارة دورة حياة المكالمة

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  Loader2,
  ShoppingCart,
  CheckCircle2,
  Headphones,
} from "lucide-react";
import { useApp } from "../../../store";
import { useCallCenterCall, type CallCenterPhase } from "../../hooks/useCallCenterCall";
import { callCenterService, type CustomerSearchResult } from "./services/callCenterService";
import { useMenu } from "../../hooks/useMenu";
import { useCart } from "../../hooks/useCart";
import { MenuGrid } from "../POS/MenuGrid";
import { CartPanel } from "../POS/CartPanel";
import { toast } from "../shared/Toast";
import { sound } from "../../services/soundService";
import { DEFAULT_EXTENSIONS, type CallCenterExtension } from "../../services/callProvider";
import { OrderType, OrderStatus, PaymentMethod } from "../../../types";
import { Pause, Play, PhoneForwarded } from "lucide-react";

// ── Helper: تنسيق المدة ──────────────────────────────────────────────────────
const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  المكون الرئيسي
// ═══════════════════════════════════════════════════════════════════════════════

export const CallCenterPOS: React.FC = () => {
  const { currentUser, addCustomer } = useApp();
  const {
    session,
    phase,
    answer,
    reject,
    hangup,
    transferCall,
    setCustomer,
    reset,
    simulateCall,
    isOnBreak,
    setBreak,
  } = useCallCenterCall();

  // ── Branch ID ──────────────────────────────────────────────────────────────
  const branchId: number | undefined = (currentUser as any)?.branch_id ?? undefined;

  // ── Menu ───────────────────────────────────────────────────────────────────
  const { categories, allItems, loading: menuLoading } = useMenu(branchId);

  // ── Cart ───────────────────────────────────────────────────────────────────
  const {
    cart: currentCart,
    subtotal,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    submitOrder: submitOrderApi,
    submitting,
    submitError,
  } = useCart();

  // ── UI State ───────────────────────────────────────────────────────────────
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [posError, setPosError] = useState<string | null>(null);

  // ── Customer Identification State ──────────────────────────────────────────
  const [identifiedCustomer, setIdentifiedCustomer] = useState<CustomerSearchResult | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);

  // ── Quick Customer Creation ────────────────────────────────────────────────
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickAddress, setQuickAddress] = useState("");

  // ── Invoice State ──────────────────────────────────────────────────────────
  const [invoiceNote, setInvoiceNote] = useState("");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [payments, setPayments] = useState<any[]>([]);
  const [cartOrderType, setCartOrderType] = useState<OrderType>(OrderType.TAKEAWAY);

  // ── Auto-identify customer when call is answered ───────────────────────────
  useEffect(() => {
    if (phase === "identifying" && session?.callerNumber) {
      identifyCustomerByPhone(session.callerNumber);
    }
  }, [phase, session?.callerNumber]);

  const identifyCustomerByPhone = async (phone: string) => {
    setIsSearchingCustomer(true);
    setCustomerSearchError(null);
    try {
      const response = await callCenterService.searchCustomers(phone, 5);
      const results = response.data ?? [];
      const exactMatch = results.find(
        (c) => c.phone === phone || c.mobile === phone,
      );
      if (exactMatch) {
        setIdentifiedCustomer(exactMatch);
        setCustomer(exactMatch.id, exactMatch.name, exactMatch.phone ?? phone);
        toast.success(`تم التعرف على العميل: ${exactMatch.name}`);
      } else {
        setIdentifiedCustomer(null);
        setQuickPhone(phone);
        setShowQuickCreate(true);
        setCustomerSearchError("العميل غير موجود، يرجى إنشاء عميل جديد");
      }
    } catch (err) {
      console.error("فشل البحث عن العميل:", err);
      setCustomerSearchError("فشل البحث عن العميل");
      setShowQuickCreate(true);
      setQuickPhone(phone);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleQuickCreateCustomer = async () => {
    if (!quickName || !quickPhone) {
      toast.error("يرجى إدخال اسم ورقم هاتف العميل");
      return;
    }
    try {
      // المحاولة الأولى: API الإنشاء السريع
      let newCustomer: any;
      try {
        const response = await callCenterService.quickCreateCustomer({
          name: quickName,
          phone: quickPhone,
          address: quickAddress || undefined,
          branch_id: branchId,
        });
        newCustomer = response.data;
      } catch (quickErr) {
        console.warn("quickCreateCustomer فشل، جرب createCustomer:", quickErr);
        // المحاولة الثانية: API الإنشاء العادي
        try {
          const response = await callCenterService.createCustomer({
            name: quickName,
            phone: quickPhone,
            address: quickAddress || undefined,
            branch_id: branchId,
          });
          newCustomer = response.data;
        } catch (createErr) {
          console.warn("createCustomer فشل، إنشاء محلي:", createErr);
          // المحاولة الثالثة: إنشاء محلي في الـ store
          const localId = Date.now();
          newCustomer = {
            id: localId,
            name: quickName,
            phone: quickPhone,
            mobile: quickPhone,
            code: `CALL-${localId}`,
            status: "active" as const,
            category: null,
            city: quickAddress || null,
            address: quickAddress || null,
            branch_id: branchId ?? null,
          };
          // إضافة للـ store المحلي
          (addCustomer as any)?.({
            name: quickName,
            phone: quickPhone,
            type: "REGULAR",
            allowCredit: false,
            notes: quickAddress || "",
          });
        }
      }

      if (newCustomer) {
        setIdentifiedCustomer(newCustomer as CustomerSearchResult);
        setCustomer(newCustomer.id, newCustomer.name, newCustomer.phone ?? quickPhone);
        setShowQuickCreate(false);
        setQuickName("");
        setQuickPhone("");
        setQuickAddress("");
        toast.success(`تم إنشاء العميل: ${newCustomer.name}`);
      }
    } catch (err) {
      console.error("فشل إنشاء العميل:", err);
      toast.error("فشل إنشاء العميل");
    }
  };

  // ── Auto-dismiss error ─────────────────────────────────────────────────────
  useEffect(() => {
    if (posError) {
      toast.error(posError);
      setPosError(null);
    }
  }, [posError]);

  useEffect(() => {
    if (submitError) {
      toast.error("فشل إرسال الطلب", submitError);
    }
  }, [submitError]);

  // ── Submit Order ───────────────────────────────────────────────────────────
  // تطابق توقيع CartPanel.submitOrder
  const handleSubmitOrder = async (
    status: OrderStatus,
    method: PaymentMethod,
    discount: number,
    meta: { name: string; phone: string; note: string },
    paymentsArg?: any[],
    clearAfterSubmit = true,
  ): Promise<any> => {
    if (currentCart.length === 0) {
      setPosError("السلة فارغة");
      return null;
    }
    if (!session?.customerId) {
      setPosError("لم يتم تحديد العميل");
      return null;
    }

    const orderPayload = {
      branch_id: branchId || 0,
      cashier_id: (currentUser as any)?.id,
      order_type: "takeaway" as const,
      customer_id: session.customerId,
      customer_name: session.customerName,
      customer_phone: session.customerPhone,
      note: `[Call Center] مكالمة: ${session.callId} | ${meta.note || invoiceNote}`.trim(),
      discount_value: discountValue,
      discount_type: (discountType === "PERCENT" ? "percent" : "amount") as "amount" | "percent",
      payment_method: "cash" as any,
    };

    const result = await submitOrderApi(
      orderPayload,
      true, // shouldConfirm - إرسال للمطبخ
      paymentsArg ?? payments,
      false, // createInvoice
      null, // existingOrderId
      clearAfterSubmit,
    );

    if (result) {
      toast.success("تم إرسال الطلب بنجاح");
      await hangup();
      setTimeout(() => {
        reset();
        clearCart();
        setIdentifiedCustomer(null);
        setIsCartOpen(false);
        setInvoiceNote("");
        setDiscountValue(0);
        setPayments([]);
      }, 3000);
    }
    return result;
  };

  // ── Render based on phase ──────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100" dir="rtl">
      {/* شريط حالة المكالمة */}
      <CallStatusBar
        phase={phase}
        session={session}
        onHangup={hangup}
        customerName={session?.customerName}
        customerPhone={session?.customerPhone}
      />

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === "waiting" && (
            <WaitingScreen
              key="waiting"
              onSimulate={simulateCall}
              isOnBreak={isOnBreak}
              onToggleBreak={() => setBreak(!isOnBreak)}
            />
          )}

          {phase === "incoming" && (
            <IncomingCallScreen
              key="incoming"
              callerNumber={session?.callerNumber ?? ""}
              onAnswer={answer}
              onReject={reject}
              onTransfer={transferCall}
              extensions={DEFAULT_EXTENSIONS}
            />
          )}

          {(phase === "identifying" || phase === "ordering") && (
            <OrderingScreen
              key="ordering"
              phase={phase}
              isSearchingCustomer={isSearchingCustomer}
              customerSearchError={customerSearchError}
              identifiedCustomer={identifiedCustomer}
              showQuickCreate={showQuickCreate}
              quickName={quickName}
              quickPhone={quickPhone}
              quickAddress={quickAddress}
              onQuickNameChange={setQuickName}
              onQuickPhoneChange={setQuickPhone}
              onQuickAddressChange={setQuickAddress}
              onQuickCreate={handleQuickCreateCustomer}
              onCancelQuickCreate={() => setShowQuickCreate(false)}
              // POS props
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              searchQuery={searchQuery}
              addToCart={addToCart}
              menuLoading={menuLoading}
              isCartOpen={isCartOpen}
              setIsCartOpen={setIsCartOpen}
              currentCart={currentCart}
              subtotal={subtotal}
              invoiceNote={invoiceNote}
              onInvoiceNoteChange={setInvoiceNote}
              discountValue={discountValue}
              discountType={discountType}
              onDiscountValueChange={setDiscountValue}
              onDiscountTypeChange={setDiscountType}
              payments={payments}
              onPaymentsChange={setPayments}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              cartOrderType={cartOrderType}
              submitting={submitting}
              onSubmitOrder={handleSubmitOrder}
              customerName={session?.customerName ?? ""}
              customerPhone={session?.customerPhone ?? ""}
              onUpdateCartItem={updateCartItem}
              onRemoveFromCart={removeFromCart}
              onClearCart={clearCart}
              setPosError={setPosError}
            />
          )}

          {(phase === "completed" || phase === "missed" || phase === "cancelled") && (
            <CallEndedScreen
              key="ended"
              phase={phase}
              duration={session?.duration ?? 0}
              onReset={reset}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  المكونات الفرعية
// ═══════════════════════════════════════════════════════════════════════════════

// ── شريط حالة المكالمة ───────────────────────────────────────────────────────

const CallStatusBar: React.FC<{
  phase: CallCenterPhase;
  session: any;
  onHangup: () => void;
  customerName?: string;
  customerPhone?: string;
}> = ({ phase, session, onHangup, customerName, customerPhone }) => {
  const isActive = phase === "ordering" || phase === "identifying";
  const isRinging = phase === "incoming";

  if (!isActive && !isRinging) return null;

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 border-b ${
        isRinging
          ? "bg-green-600/20 border-green-500/30"
          : "bg-cyan-600/10 border-cyan-500/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${
            isRinging ? "bg-green-400 animate-pulse" : "bg-cyan-400"
          }`}
        />
        <span className="text-xs font-bold text-slate-300">
          {isRinging
            ? "مكالمة واردة..."
            : `مدة المكالمة: ${formatDuration(session?.duration ?? 0)}`}
        </span>
        {customerName && (
          <>
            <span className="text-white/30">|</span>
            <User size={14} className="text-cyan-400" />
            <span className="text-sm font-bold text-white">{customerName}</span>
            <span className="text-xs text-slate-400">{customerPhone}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {phase === "ordering" && (
          <button
            onClick={onHangup}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-xs font-bold text-white transition-colors"
          >
            <PhoneOff size={14} />
            إنهاء المكالمة
          </button>
        )}
      </div>
    </div>
  );
};

// ── شاشة الانتظار ────────────────────────────────────────────────────────────

const WaitingScreen: React.FC<{
  onSimulate: (phone: string) => void;
  isOnBreak: boolean;
  onToggleBreak: () => void;
}> = ({ onSimulate, isOnBreak, onToggleBreak }) => {
  const [showSimulate, setShowSimulate] = useState(false);
  const [simPhone, setSimPhone] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center p-8"
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-cyan-600/20 rounded-full flex items-center justify-center">
          <Headphones size={48} className="text-cyan-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full animate-ping" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-white mb-2">نظام الكول سنتر</h2>
      <p className="text-slate-400 text-sm mb-8">في انتظار المكالمات الواردة...</p>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Clock size={14} />
        <span>النظام جاهز لاستقبال المكالمات</span>
      </div>

      <div className="mt-12">
        {!showSimulate ? (
          <button
            onClick={() => setShowSimulate(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-400 transition-colors"
          >
            محاكاة مكالمة واردة (تطوير)
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={simPhone}
              onChange={(e) => setSimPhone(e.target.value)}
              placeholder="رقم الهاتف..."
              className="w-40 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={() => {
                if (simPhone.trim()) {
                  onSimulate(simPhone.trim());
                  setShowSimulate(false);
                  setSimPhone("");
                }
              }}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-bold text-white transition-colors"
            >
              محاكاة
            </button>
            <button
              onClick={() => setShowSimulate(false)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-400 transition-colors"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── شاشة المكالمة الواردة ────────────────────────────────────────────────────

const IncomingCallScreen: React.FC<{
  callerNumber: string;
  onAnswer: () => void;
  onReject: () => void;
  onTransfer: (target: string) => Promise<void>;
  extensions: CallCenterExtension[];
}> = ({ callerNumber, onAnswer, onReject, onTransfer, extensions }) => {
  const [showTransfer, setShowTransfer] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="h-full flex flex-col items-center justify-center p-8"
    >
      <div className="relative mb-8">
        <div className="w-28 h-28 bg-green-600/20 rounded-full flex items-center justify-center">
          <PhoneIncoming size={56} className="text-green-400 animate-bounce" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-ping">
          <Phone size={14} className="text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-white mb-2">مكالمة واردة</h2>
      <p className="text-3xl font-black text-green-400 mb-1" dir="ltr">
        {callerNumber}
      </p>
      <p className="text-slate-500 text-sm mb-10">جاري البحث عن العميل...</p>

      <div className="flex items-center gap-6">
        <button onClick={onAnswer} className="flex flex-col items-center gap-2 group">
          <div className="w-16 h-16 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-green-500/30">
            <Phone size={28} className="text-white" />
          </div>
          <span className="text-xs font-bold text-green-400">رد</span>
        </button>
        <button onClick={onReject} className="flex flex-col items-center gap-2 group">
          <div className="w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-red-500/30">
            <PhoneOff size={28} className="text-white" />
          </div>
          <span className="text-xs font-bold text-red-400">رفض</span>
        </button>
        <button
          onClick={() => setShowTransfer(!showTransfer)}
          className="flex flex-col items-center gap-2 group"
        >
          <div className="w-16 h-16 bg-cyan-600 hover:bg-cyan-500 rounded-full flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-cyan-500/30">
            <PhoneForwarded size={28} className="text-white" />
          </div>
          <span className="text-xs font-bold text-cyan-400">تحويل</span>
        </button>
      </div>

      {/* قائمة تحويل المكالمة */}
      {showTransfer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="mt-6 grid grid-cols-2 gap-3 w-full max-w-md"
        >
          {extensions
            .filter((ext) => ext.status === "available")
            .map((ext) => (
              <button
                key={ext.number}
                onClick={() => {
                  onTransfer(ext.number);
                  setShowTransfer(false);
                }}
                className="flex flex-col items-center gap-1.5 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <span className="text-lg font-black text-cyan-400" dir="ltr">
                  {ext.number}
                </span>
                <span className="text-xs font-bold text-slate-300">{ext.name}</span>
              </button>
            ))}
        </motion.div>
      )}
    </motion.div>
  );
};

// ── شاشة الطلب (تستخدم مكونات POS) ───────────────────────────────────────────

const OrderingScreen: React.FC<{
  phase: CallCenterPhase;
  isSearchingCustomer: boolean;
  customerSearchError: string | null;
  identifiedCustomer: CustomerSearchResult | null;
  showQuickCreate: boolean;
  quickName: string;
  quickPhone: string;
  quickAddress: string;
  onQuickNameChange: (v: string) => void;
  onQuickPhoneChange: (v: string) => void;
  onQuickAddressChange: (v: string) => void;
  onQuickCreate: () => void;
  onCancelQuickCreate: () => void;
  // POS props
  categories: any[];
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  searchQuery: string;
  addToCart: (item: any) => void;
  menuLoading?: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  currentCart: any[];
  subtotal: number;
  invoiceNote: string;
  onInvoiceNoteChange: (n: string) => void;
  discountValue: number;
  discountType: "AMOUNT" | "PERCENT";
  onDiscountValueChange: (v: number) => void;
  onDiscountTypeChange: (t: "AMOUNT" | "PERCENT") => void;
  payments: any[];
  onPaymentsChange: (p: any[]) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  cartOrderType: OrderType;
  submitting: boolean;
  onSubmitOrder: (
    status: OrderStatus,
    method: PaymentMethod,
    discount: number,
    meta: { name: string; phone: string; note: string },
    payments?: any[],
    clearAfterSubmit?: boolean,
  ) => Promise<any>;
  customerName: string;
  customerPhone: string;
  onUpdateCartItem: (id: string, changes: any) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  setPosError: (err: string | null) => void;
}> = ({
  phase,
  isSearchingCustomer,
  customerSearchError,
  identifiedCustomer,
  showQuickCreate,
  quickName,
  quickPhone,
  quickAddress,
  onQuickNameChange,
  onQuickPhoneChange,
  onQuickAddressChange,
  onQuickCreate,
  onCancelQuickCreate,
  // POS
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  addToCart,
  menuLoading,
  isCartOpen,
  setIsCartOpen,
  currentCart,
  subtotal,
  invoiceNote,
  onInvoiceNoteChange,
  discountValue,
  discountType,
  onDiscountValueChange,
  onDiscountTypeChange,
  payments,
  onPaymentsChange,
  paymentMethod,
  onPaymentMethodChange,
  cartOrderType,
  submitting,
  onSubmitOrder,
  customerName,
  customerPhone,
  onUpdateCartItem,
  onRemoveFromCart,
  onClearCart,
  setPosError,
}) => {
  // أثناء التعرف على العميل
  if (phase === "identifying") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full flex flex-col items-center justify-center p-8"
      >
        {isSearchingCustomer ? (
          <>
            <Loader2 size={40} className="animate-spin text-cyan-400 mb-4" />
            <p className="text-slate-400">جاري التعرف على العميل...</p>
          </>
        ) : showQuickCreate ? (
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-black text-white mb-4">إنشاء عميل جديد</h3>
            {customerSearchError && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-xl px-3 py-2 mb-4">
                <AlertTriangle size={14} />
                {customerSearchError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">الاسم *</label>
                <input
                  value={quickName}
                  onChange={(e) => onQuickNameChange(e.target.value)}
                  placeholder="اسم العميل"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">رقم الهاتف *</label>
                <input
                  value={quickPhone}
                  onChange={(e) => onQuickPhoneChange(e.target.value)}
                  placeholder="رقم الهاتف"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-cyan-500/50"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">العنوان</label>
                <input
                  value={quickAddress}
                  onChange={(e) => onQuickAddressChange(e.target.value)}
                  placeholder="العنوان (اختياري)"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={onQuickCreate}
                className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-bold text-white transition-colors"
              >
                إنشاء العميل وبدء الطلب
              </button>
              <button
                onClick={onCancelQuickCreate}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm text-slate-400 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : null}
      </motion.div>
    );
  }

  // شاشة الطلب - تعيد استخدام مكونات POS
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* معلومات العميل */}
      {identifiedCustomer && (
        <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-cyan-400" />
              <span className="font-bold text-white">{identifiedCustomer.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone size={14} className="text-slate-500" />
              <span className="text-slate-400" dir="ltr">
                {identifiedCustomer.phone || identifiedCustomer.mobile}
              </span>
            </div>
            {identifiedCustomer.city && (
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-500" />
                <span className="text-slate-400">{identifiedCustomer.city}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* واجهة POS - إعادة استخدام المكونات الموجودة */}
      <div className="flex-1 flex overflow-hidden">
        {/* القائمة */}
        <div className="flex-1 overflow-y-auto">
          <MenuGrid
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            addToCart={addToCart}
            loading={menuLoading}
          />
        </div>

        {/* السلة (جانبية) */}
        <AnimatePresence>
          {isCartOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-slate-800 overflow-hidden"
            >
              <div className="w-[400px] h-full overflow-y-auto">
                <CartPanel
                  isCartOpen={isCartOpen}
                  setIsCartOpen={setIsCartOpen}
                  isHospitality={false}
                  cartOrderType={cartOrderType}
                  setOrderType={() => {}}
                  currentCart={currentCart}
                  manualTable=""
                  handleTableInput={() => {}}
                  onViewTables={() => {}}
                  subtotal={subtotal}
                  calculatedDiscount={discountValue}
                  discountType={discountType}
                  discountValue={discountValue}
                  total={subtotal}
                  invoiceNote={invoiceNote}
                  setInvoiceNote={onInvoiceNoteChange}
                  editingDiscount="0"
                  setEditingDiscount={() => {}}
                  setDiscountValue={onDiscountValueChange}
                  setDiscountType={onDiscountTypeChange}
                  paymentMethod={paymentMethod}
                  editingOrderId={null}
                  editingQty={{}}
                  editingNames={{}}
                  handleNameChange={() => {}}
                  handleQuantityChange={() => {}}
                  handleQuantityBlur={() => {}}
                  handleTotalChange={() => {}}
                  setEditingNames={() => {}}
                  removeFromCart={onRemoveFromCart}
                  updateCartItem={onUpdateCartItem}
                  getItemCurrentPrice={(item: any) => item.price ?? 0}
                  setPosError={setPosError}
                  submitOrder={onSubmitOrder}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  setShowCustomerModal={() => {}}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* زر فتح السلة (عندما تكون مغلقة) */}
      {!isCartOpen && currentCart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="absolute left-4 bottom-4 flex items-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-bold text-white shadow-lg transition-colors"
        >
          <ShoppingCart size={18} />
          عرض السلة ({currentCart.length})
        </button>
      )}
    </motion.div>
  );
};

// ── شاشة انتهاء المكالمة ─────────────────────────────────────────────────────

const CallEndedScreen: React.FC<{
  phase: CallCenterPhase;
  duration: number;
  onReset: () => void;
}> = ({ phase, duration, onReset }) => {
  const isCompleted = phase === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="h-full flex flex-col items-center justify-center p-8"
    >
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isCompleted ? "bg-green-600/20" : "bg-slate-800"
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 size={40} className="text-green-400" />
        ) : (
          <PhoneOff size={40} className="text-slate-500" />
        )}
      </div>

      <h2 className="text-2xl font-black text-white mb-2">
        {isCompleted ? "تم إتمام الطلب" : "المكالمة الفائتة"}
      </h2>
      <p className="text-slate-400 text-sm mb-2">
        {isCompleted
          ? "تم إرسال الطلب للمطبخ وإنهاء المكالمة"
          : "لم يتم الرد على المكالمة"}
      </p>
      <p className="text-xs text-slate-500 mb-8">
        مدة المكالمة: {formatDuration(duration)}
      </p>

      <button
        onClick={onReset}
        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-bold text-white transition-colors"
      >
        العودة لانتظار المكالمات
      </button>
    </motion.div>
  );
};