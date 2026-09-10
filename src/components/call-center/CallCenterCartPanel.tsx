import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Tag,
  FileText,
  Search,
  Loader2,
  MapPin,
  PackageSearch,
} from "lucide-react";
import { PaymentMethod } from "../../../types";
import type { CartItem, PaymentEntry } from "../../hooks/useCallCenterCart";
import type { MenuItem } from "../../hooks/useMenu";
import type {
  CustomerAddress,
  DeliveryQuote,
} from "./services/callCenterService";
import {
  settlementService,
  type PaymentMethodDto,
} from "../../services/settlementService";
import { buildCheckoutBlockers } from "./customerFlow";
import type { CallCenterSuccess, OrderMode } from "./CallCenterWorkspace";

const money = (value: number) => `${Number(value || 0).toFixed(2)} ₪`;

const methodMap: Record<PaymentMethodDto["type"], PaymentMethod> = {
  cash: PaymentMethod.CASH,
  card: PaymentMethod.CREDIT_CARD,
  bank: PaymentMethod.QR,
  wallet: PaymentMethod.WALLET,
  customer: PaymentMethod.CUSTOMER,
  employee: PaymentMethod.EMPLOYEE,
  supplier: PaymentMethod.SUPPLIER,
};

interface CallCenterCartPanelProps {
  // ── Cart Data & Handlers ───────────────────────────────────────────────
  cart: CartItem[];
  subtotal: number;
  update: (id: string, patch: Partial<CartItem>) => void;
  remove: (id: string) => void;
  clear: () => void;
  allItems: MenuItem[];
  addToCart?: (item: MenuItem, opts?: { quantity?: number; price?: number }) => void;

  // ── Order Context ──────────────────────────────────────────────────────
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  selectedAddress: CustomerAddress | null;
  branchId: number;
  newCaller: { name: string; phone: string; area: string; city: string } | null;
  deliveryQuote: DeliveryQuote | null;
  quoteLoading: boolean;
  quoteError: string;

  // ── Discount / Note ────────────────────────────────────────────────────
  discount: number;
  setDiscount: (value: number) => void;
  note: string;
  setNote: (value: string) => void;

  // ── Payments ───────────────────────────────────────────────────────────
  payments: PaymentEntry[];

  // ── Submission State ───────────────────────────────────────────────────
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  submitting: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  success: CallCenterSuccess | null;
  onNew: () => void;
}

export const CallCenterCartPanel: React.FC<CallCenterCartPanelProps> = ({
  cart,
  subtotal,
  update,
  remove,
  clear,
  allItems,
  addToCart,
  orderMode,
  setOrderMode,
  selectedAddress,
  branchId,
  newCaller,
  deliveryQuote,
  quoteLoading,
  quoteError,
  discount,
  setDiscount,
  note,
  setNote,
  payments,
  isCartOpen,
  setIsCartOpen,
  submitting,
  onSaveDraft,
  onSubmit,
  onNew,
  success,
}) => {
  // ── Inline Search State ──────────────────────────────────────────────────
  const [inlineSearch, setInlineSearch] = useState("");
  const [inlineQty, setInlineQty] = useState("1");
  const [inlineTotal, setInlineTotal] = useState("");
  const [selectedSearchItem, setSelectedSearchItem] = useState<MenuItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLTableCellElement>(null);

  // ── Payment Methods State ───────────────────────────────────────────────
  const [methods, setMethods] = useState<PaymentMethodDto[]>([]);
  const [methodError, setMethodError] = useState("");

  useEffect(() => {
    settlementService
      .getPaymentMethods()
      .then((rows) => setMethods(rows.filter((r) => r.is_active)))
      .catch(() => setMethodError("تعذر تحميل طرق الدفع"));
  }, []);

  const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

  // ── Keyboard shortcuts: +/- to adjust quantity of last focused item ──
  const lastFocusedItemRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (cart.length === 0) return;

      const targetItem = lastFocusedItemRef.current || cart[cart.length - 1]?.uniqueId;
      if (!targetItem) return;

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        const item = cart.find((c) => c.uniqueId === targetItem);
        if (item) update(targetItem, { quantity: item.quantity + 1 });
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        const item = cart.find((c) => c.uniqueId === targetItem);
        if (item && item.quantity > 1) {
          update(targetItem, { quantity: item.quantity - 1 });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, update]);

  const filteredSearchItems = useMemo(() => {
    if (!inlineSearch || inlineSearch.length < 1) return [];
    const q = inlineSearch.toLowerCase();
    return allItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.name_ar.includes(inlineSearch) ||
          String(item.id) === inlineSearch ||
          item.code === inlineSearch,
      )
      .slice(0, 8);
  }, [inlineSearch, allItems]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectSearchItem = (item: MenuItem) => {
    setSelectedSearchItem(item);
    setInlineSearch(item.name_ar || item.name);
    setInlineQty("1");
    setInlineTotal(roundMoney(item.price).toFixed(2));
    setShowDropdown(false);
  };

  const handleInlineAdd = () => {
    if (!selectedSearchItem || !addToCart) return;
    const qty = parseFloat(inlineQty) || 1;
    addToCart(selectedSearchItem, {
      quantity: qty,
      price: selectedSearchItem.price,
    });
    setInlineSearch("");
    setInlineQty("1");
    setInlineTotal("");
    setSelectedSearchItem(null);
  };

  const handleInlineSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInlineSearch(value);
    setSelectedSearchItem(null);
    setShowDropdown(true);
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (selectedSearchItem) {
        handleInlineAdd();
      } else if (filteredSearchItems.length > 0) {
        handleSelectSearchItem(filteredSearchItems[0]);
      }
    }
  };

  // ── Totals ──────────────────────────────────────────────────────────────
  const deliveryFee = deliveryQuote?.fee ?? 0;
  const total = Math.max(0, subtotal - discount + (orderMode === "delivery" ? deliveryFee : 0));
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, total - paid);
  const excess = Math.max(0, paid - total);

  const addressReady = Boolean(selectedAddress || (newCaller?.area && newCaller?.city));
  const blockers = buildCheckoutBlockers({
    branchId,
    customerName: newCaller?.name,
    isNewCaller: Boolean(newCaller),
    cartCount: cart.length,
    isDelivery: orderMode === "delivery",
    addressReady,
    deliveryQuoteReady: Boolean(deliveryQuote),
  });
  const invalid =
    blockers.length > 0 ||
    remaining > 0.01 ||
    excess > 0.01 ||
    payments.some((p) => {
      const type = methods.find((m) => methodMap[m.type] === (p.method as PaymentMethod))?.type;
      const needsRef = Boolean(type && ["card", "bank", "wallet"].includes(type));
      return (
        (needsRef && !p.reference) ||
        (["employee", "supplier"].includes(type ?? "") && !p.entity_id)
      );
    });

  // ── Success Screen ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className={`w-full lg:w-[450px] xl:w-[500px] bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 flex flex-col shadow-2xl overflow-hidden shrink-0 ${isCartOpen ? "fixed inset-0 z-50 lg:relative lg:z-0" : "hidden lg:flex"}`}
      >
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center text-white">
          <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-400">
            <CheckCircle size={40} />
          </span>
          <h2 className="text-xl font-black">تم إرسال الطلب بنجاح</h2>
          <p className="mt-2 text-sm text-slate-400">
            الطلب {success.orderNumber} · الفاتورة {success.invoiceNumber || "تم إنشاؤها"}
          </p>
          <p className="my-5 text-3xl font-black text-red-500">{money(success.total)}</p>
          <div className="w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-right text-xs space-y-2">
            <p className="font-bold text-white">{success.customerName}</p>
            {success.address && <p className="text-slate-400">{success.address}</p>}
            <div className="my-2 border-t border-white/10 pt-2">
              {success.payments.map((p, i) => (
                <p key={i} className="flex justify-between text-slate-300">
                  <span>
                    {methods.find((m) => methodMap[m.type] === (p.method as PaymentMethod))?.name ||
                      p.method}
                  </span>
                  <strong className="text-white">{money(p.amount)}</strong>
                </p>
              ))}
            </div>
            <p className="text-emerald-400">مدفوع · أُرسل للمطبخ</p>
          </div>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <button
              onClick={() => window.print()}
              className="py-2.5 bg-slate-800 text-white rounded-xl font-black text-xs hover:bg-slate-700 transition-all"
            >
              طباعة الملخص
            </button>
            <button
              onClick={() => window.open(`/sales-invoices?order=${success.orderId}`, "_blank")}
              className="py-2.5 bg-slate-800 text-white rounded-xl font-black text-xs hover:bg-slate-700 transition-all"
            >
              عرض الفاتورة
            </button>
          </div>
          <button
            onClick={onNew}
            className="mt-3 min-h-12 w-full rounded-xl bg-red-600 text-white font-black text-sm hover:bg-red-700 shadow-xl shadow-red-900/20 transition-all active:scale-95"
          >
            مكالمة جديدة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full lg:w-[450px] xl:w-[500px] bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 flex flex-col shadow-2xl overflow-hidden h-auto lg:h-full shrink-0 ${isCartOpen ? "fixed inset-0 z-50 lg:relative lg:z-0" : "hidden lg:flex"}`}
    >
      {/* 1. Header & Order Mode */}
      <div className="p-3 sm:p-4 border-b border-white/5 space-y-3 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="text-red-500" size={16} />
            <h3 className="text-xs sm:text-sm font-black text-white">
              تفاصيل الفاتورة
            </h3>
            {cart.length > 0 && (
              <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* زر تصغير السلة */}
            <button
              onClick={() => setIsCartOpen(false)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-white transition-colors"
              title="تصغير"
            >
              <span className="text-lg font-black leading-none">−</span>
            </button>
            {cart.length > 0 && (
              <button
                onClick={clear}
                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors text-[8px] font-black"
                title="تفريغ السلة"
              >
                تفريغ
              </button>
            )}
            {/* وضع الطلب: توصيل / استلام */}
            <div className="flex bg-slate-800 p-1 rounded-lg overflow-x-auto scrollbar-hide">
              {(["delivery", "takeaway"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setOrderMode(mode)}
                  className={`px-1.5 sm:px-2 py-1 text-[7px] sm:text-[8px] font-black rounded-md transition-all whitespace-nowrap ${orderMode === mode ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {mode === "delivery" ? "توصيل" : "استلام"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Delivery Zone Status */}
        {orderMode === "delivery" && (
          <div
            aria-live="polite"
            className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[9px] font-bold ${
              deliveryQuote
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : quoteError
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            <MapPin size={12} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              {!selectedAddress ? (
                "اختر عنواناً صالحاً من ملف العميل"
              ) : quoteLoading ? (
                "جارٍ التحقق من نطاق التوصيل…"
              ) : deliveryQuote ? (
                <>
                  <strong>{deliveryQuote.zone_name}</strong> · {money(deliveryQuote.fee)} · نحو{" "}
                  {deliveryQuote.eta_minutes} دقيقة
                </>
              ) : (
                quoteError || "لم يتم اعتماد العنوان للتوصيل"
              )}
            </div>
          </div>
        )}

        {/* Total Amount */}
        <div className="bg-red-600/10 border border-red-600/20 p-2 px-3 rounded-lg flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
              الإجمالي الفرعي
            </span>
            <span className="text-sm font-black text-slate-300">{money(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between items-center text-red-500">
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-black uppercase tracking-widest">خصم الطلب</span>
              </div>
              <span className="text-sm font-black">-{money(discount)}</span>
            </div>
          )}
          {orderMode === "delivery" && deliveryFee > 0 && (
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[8px] font-black uppercase tracking-widest">رسوم التوصيل</span>
              <span className="text-sm font-black">{money(deliveryFee)}</span>
            </div>
          )}
          <div
            className={`pt-1 mt-1 ${discount > 0 || deliveryFee > 0 ? "border-t border-red-600/20" : ""} flex justify-between items-center`}
          >
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {discount > 0 || deliveryFee > 0 ? "الصافي النهائي" : "الإجمالي الكلي"}
            </span>
            <div className="text-left">
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-red-600">
                {total.toFixed(2)}
              </span>
              <span className="text-[11px] font-black text-red-600 mr-1">₪</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Table Header + Search (pinned, no scroll) */}
      <div className="bg-slate-900 border-b border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[350px]">
            <thead>
              <tr className="border-b border-white/5">
                {["#", "الصنف", "السعر", "الكمية", "الإجمالي", "ملاحظة", ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className={`p-2 sm:p-3 text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ${i === 4 ? "text-left" : i === 3 ? "text-center" : ""}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
              {/* Inline Search/Add Row — always visible */}
              {addToCart && allItems.length > 0 && (
                <tr className="bg-slate-800/30 border-b border-dashed border-white/10">
                  <td className="p-2 text-center align-middle">
                    <Plus size={12} className="text-emerald-500 mx-auto" />
                  </td>
                  <td className="p-2 relative" ref={searchRef}>
                    <div className="relative flex items-center gap-1">
                      <input
                        type="text"
                        value={inlineSearch}
                        onChange={handleInlineSearchChange}
                        onFocus={() => {
                          if (inlineSearch) setShowDropdown(true);
                        }}
                        onKeyDown={handleInlineKeyDown}
                        placeholder="ابحث عن صنف..."
                        className="w-full bg-transparent text-[10px] sm:text-xs font-bold text-white outline-none border-b border-emerald-500/30 focus:border-emerald-500 placeholder:text-slate-600"
                      />
                      <Search size={12} className="shrink-0 text-slate-500" />
                    </div>
                    {/* Dropdown appears above */}
                    {showDropdown && filteredSearchItems.length > 0 && (
                      <div className="absolute left-0 right-0 bottom-full mb-1 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-30 max-h-40 overflow-y-auto custom-scrollbar">
                        {filteredSearchItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectSearchItem(item)}
                            className="w-full text-right px-3 py-2 hover:bg-white/5 transition-colors flex items-center justify-between gap-2"
                          >
                            <span className="text-[10px] font-black text-white truncate">
                              {item.name_ar || item.name}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-500 shrink-0">
                              {item.price} ₪
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-center text-[10px] font-bold text-slate-500">
                    {selectedSearchItem ? selectedSearchItem.price : "—"}
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={inlineQty}
                      onChange={(e) => setInlineQty(e.target.value)}
                      onKeyDown={handleInlineKeyDown}
                      className="w-10 sm:w-12 bg-transparent text-center text-[10px] sm:text-xs font-black text-white outline-none border-b border-emerald-500/30 focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={inlineTotal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInlineTotal(val);
                        if (selectedSearchItem && val) {
                          const total = parseFloat(val);
                          if (!isNaN(total) && total >= 0 && selectedSearchItem.price > 0) {
                            const qty = total / selectedSearchItem.price;
                            setInlineQty(roundMoney(qty).toFixed(2));
                          }
                        }
                      }}
                      placeholder="—"
                      className="w-16 sm:w-20 bg-transparent text-left text-[10px] sm:text-xs font-black text-emerald-400 outline-none border-b border-emerald-500/30 focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </td>
                  <td />
                  <td className="p-2 text-center align-middle">
                    <button
                      onClick={handleInlineAdd}
                      disabled={!selectedSearchItem}
                      className="p-1 text-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </td>
                </tr>
              )}
            </thead>
          </table>
        </div>
      </div>

      {/* 3. Invoice Items Table (scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[100px] lg:min-h-0">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-slate-700 gap-2">
            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
              <PackageSearch size={24} strokeWidth={1.5} />
            </div>
            <p className="font-black text-lg text-slate-600">الفاتورة فارغة</p>
            <p className="text-xs text-slate-500">أضف صنفًا من المنيو لبدء الطلب</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[350px]">
            <tbody className="divide-y divide-white/5">
              {cart.map((item, index) => (
                <tr
                  key={item.uniqueId}
                  className="group hover:bg-white/5 transition-colors"
                  onFocus={() => (lastFocusedItemRef.current = item.uniqueId)}
                >
                  <td className="p-2 sm:p-3 text-[8px] sm:text-[10px] font-black text-slate-600">
                    {index + 1}
                  </td>
                  <td className="p-2 sm:p-3">
                    <input
                      type="text"
                      value={item.name_ar || item.name}
                      onChange={(e) => update(item.uniqueId, { name: e.target.value, name_ar: e.target.value })}
                      className="w-full bg-transparent text-[10px] sm:text-xs font-black text-white outline-none border-b border-transparent focus:border-red-500/30"
                    />
                  </td>
                  <td className="p-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold text-slate-400">
                    {money(item.price)}
                  </td>
                  <td className="p-2 sm:p-3">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            update(item.uniqueId, { quantity: item.quantity - 1 });
                          }
                        }}
                        className="w-5 h-5 bg-slate-700 rounded text-[10px] font-bold text-white hover:bg-slate-600 flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseFloat(e.target.value);
                          if (!isNaN(qty) && qty > 0) {
                            update(item.uniqueId, { quantity: qty });
                          }
                        }}
                        className="w-8 bg-transparent text-center text-[10px] sm:text-xs font-black text-white outline-none"
                      />
                      <button
                        onClick={() => {
                          update(item.uniqueId, { quantity: item.quantity + 1 });
                        }}
                        className="w-5 h-5 bg-slate-700 rounded text-[10px] font-bold text-white hover:bg-slate-600 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 text-left">
                    <input
                      type="text"
                      value={Math.round(item.price * item.quantity * 100) / 100}
                      onChange={(e) => {
                        const total = parseFloat(e.target.value);
                        if (!isNaN(total) && total >= 0 && item.price > 0) {
                          const qty = total / item.price;
                          update(item.uniqueId, { quantity: roundMoney(qty) });
                        }
                      }}
                      className="w-16 sm:w-20 bg-transparent text-left text-[10px] sm:text-xs font-black text-red-500 outline-none"
                    />
                  </td>
                  <td className="p-2 sm:p-3">
                    <input
                      type="text"
                      value={item.notes || ""}
                      onChange={(e) => update(item.uniqueId, { notes: e.target.value })}
                      placeholder="+"
                      className="w-10 sm:w-14 bg-transparent text-[9px] font-bold text-slate-400 outline-none border-b border-transparent focus:border-red-500/30 placeholder:text-slate-600"
                      title="ملاحظة خاصة للصنف"
                    />
                  </td>
                  <td className="p-2 sm:p-3 text-center">
                    <button
                      onClick={() => remove(item.uniqueId)}
                      className="p-1.5 text-slate-600 hover:text-red-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Footer Summary & Actions */}
      <div className="p-3 sm:p-4 bg-slate-950 border-t border-white/10 space-y-2">
        {/* Payment Summary */}
        {payments.length > 0 && (
          <div className="space-y-1 bg-slate-900 rounded-xl border border-white/5 px-3 py-2">
            <div className="flex justify-between text-[10px] font-black text-slate-400">
              <span>المبلغ المدفوع</span>
              <span className="text-emerald-400">{money(paid)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-400">
              <span>{excess ? "المبلغ الزائد" : "المتبقي"}</span>
              <span className={remaining || excess ? "text-amber-400" : "text-emerald-400"}>
                {money(excess || remaining)}
              </span>
            </div>
          </div>
        )}

        {/* Blockers */}
        {blockers.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[9px] text-amber-200">
            <b>لا يمكن المتابعة:</b>
            <ul className="mt-1 list-inside list-disc">
              {blockers.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        {methodError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[9px] text-rose-300">
            {methodError}
          </div>
        )}

        {/* Note & Discount Row */}
        <div className="flex gap-2">
          {/* Invoice Note */}
          <div className="flex-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-slate-500 shrink-0">
              <FileText size={10} />
              <span className="text-[8px] font-black uppercase tracking-widest">الملاحظة</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="..."
              className="w-full bg-transparent text-[9px] sm:text-[10px] font-black outline-none text-white placeholder:text-slate-700 h-12 sm:h-16 resize-none"
            />
          </div>
          {/* Discount */}
          <div className="w-28 sm:w-32 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-slate-500 shrink-0">
              <Tag size={10} />
              <span className="text-[8px] font-black uppercase tracking-widest">الخصم</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                inputMode="decimal"
                className="flex-1 min-w-0 bg-transparent text-center text-[10px] sm:text-xs font-black text-white outline-none"
              />
              <span className="text-[9px] font-black text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                ₪
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onSaveDraft}
            disabled={blockers.length > 0 || submitting}
            className="py-3 sm:py-4 bg-slate-800 text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-slate-700 shadow-lg disabled:opacity-30 transition-all active:scale-95"
          >
            <Save size={18} />
            {submitting ? "جارٍ الحفظ…" : newCaller ? "حفظ ومتابعة الدفع" : "حفظ بانتظار الدفع"}
          </button>
          <button
            onClick={onSubmit}
            disabled={invalid || submitting}
            className="py-3 sm:py-4 bg-red-600 text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-red-700 shadow-xl shadow-red-900/20 disabled:opacity-30 transition-all active:scale-95"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {submitting ? "جارٍ الإغلاق…" : "دفع وإرسال للمطبخ"}
          </button>
        </div>
      </div>
    </div>
  );
};