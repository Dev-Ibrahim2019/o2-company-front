import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Tag,
  FileText,
  Printer,
  Search,
  Loader2,
} from "lucide-react";
import { OrderType, OrderStatus, PaymentMethod } from "../../../types";

interface CartItem {
  uniqueId: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  original_price?: number;
  final_price?: number;
  discount_amount?: number;
  discount_percent?: number;
  discount_id?: number;
  is_takeaway?: boolean;
  is_printed_direct?: boolean;
}

interface SearchableItem {
  id: number;
  name: string;
  name_ar: string;
  code: string;
  price: number;
  department_id: number;
}

interface CartPanelProps {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isHospitality: boolean;
  cartOrderType: OrderType;
  setOrderType: (type: OrderType) => void;
  currentCart: CartItem[];
  manualTable: string;
  handleTableInput: (val: string) => void;
  onViewTables: () => void;
  subtotal: number;
  calculatedDiscount: number;
  engineDiscountTotal?: number;
  manualDiscount?: number;
  appliedDiscounts?: Array<{
    id: number;
    name: string;
    code: string;
    amount: number;
  }>;
  discountLoading?: boolean;
  discountType: "AMOUNT" | "PERCENT";
  discountValue: number;
  total: number;
  invoiceNote: string;
  setInvoiceNote: (note: string) => void;
  editingDiscount: string;
  setEditingDiscount: (val: string) => void;
  setDiscountValue: (val: number) => void;
  setDiscountType: (type: "AMOUNT" | "PERCENT") => void;
  paymentMethod: PaymentMethod;
  editingOrderId: string | null;
  editingQty: { [id: string]: string };
  editingNames: { [id: string]: string };
  handleNameChange: (uniqueId: string, newName: string) => void;
  handleQuantityChange: (uniqueId: string, val: string, price: number) => void;
  handleQuantityBlur: (uniqueId: string, val: string) => void;
  handleTotalChange: (uniqueId: string, val: string, price: number) => void;
  setEditingNames: React.Dispatch<
    React.SetStateAction<{ [id: string]: string }>
  >;
  removeFromCart: (id: string) => void;
  updateCartItem: (
    uniqueId: string,
    changes: Partial<{ quantity: number; name: string; price: number }>,
  ) => void;
  getItemCurrentPrice: (item: any) => number;
  setPosError: (err: string) => void;
  submitOrder: (
    status: OrderStatus,
    method: PaymentMethod,
    discount: number,
    meta: { name: string; phone: string; note: string },
    payments?: { method: PaymentMethod; amount: number; reference?: string }[],
    clearAfterSubmit?: boolean,
  ) => Promise<any>;
  customerName: string;
  customerPhone: string;
  setShowCustomerModal: (show: boolean) => void;
  handlePrintInvoice?: () => void;
  isPrinting?: boolean;
  onCloseCart?: () => void;
  onDeferOrder?: () => Promise<void>;
  isDeferred?: boolean;
  allItems?: SearchableItem[];
  addToCart?: (item: any, opts?: { quantity?: number; price?: number }) => void;
  posInfo?: { id?: number; code?: string; name?: string; branch_id?: number } | null;
  clearCart?: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  isCartOpen,
  setIsCartOpen,
  isHospitality,
  cartOrderType,
  setOrderType,
  currentCart,
  manualTable,
  handleTableInput,
  onViewTables,
  subtotal,
  calculatedDiscount,
  engineDiscountTotal = 0,
  manualDiscount = 0,
  appliedDiscounts = [],
  discountLoading = false,
  discountType,
  discountValue,
  total,
  invoiceNote,
  setInvoiceNote,
  editingDiscount,
  setEditingDiscount,
  setDiscountValue,
  setDiscountType,
  paymentMethod,
  editingOrderId,
  editingQty,
  editingNames,
  handleNameChange,
  handleQuantityChange,
  handleQuantityBlur,
  handleTotalChange,
  setEditingNames,
  removeFromCart,
  updateCartItem,
  getItemCurrentPrice,
  setPosError,
  submitOrder,
  customerName,
  customerPhone,
  setShowCustomerModal,
  handlePrintInvoice,
  isPrinting = false,
  allItems = [],
  onCloseCart,
  onDeferOrder,
  isDeferred = false,
  addToCart,
  posInfo,
  clearCart,
}) => {
  // ── Inline Search State ──────────────────────────────────────────────────
  const [inlineSearch, setInlineSearch] = useState("");
  const [inlineQty, setInlineQty] = useState("1");
  const [inlineTotal, setInlineTotal] = useState("");
  const [selectedSearchItem, setSelectedSearchItem] =
    useState<SearchableItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLTableCellElement>(null);

  const roundMoney = (value: number) =>
    Math.round((Number(value) || 0) * 100) / 100;

  // ── Keyboard shortcuts: +/- to adjust quantity of last focused item ──
  const lastFocusedItemRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (currentCart.length === 0) return;

      const targetItem =
        lastFocusedItemRef.current ||
        currentCart[currentCart.length - 1]?.uniqueId;
      if (!targetItem) return;

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        const item = currentCart.find((c) => c.uniqueId === targetItem);
        if (item) updateCartItem(targetItem, { quantity: item.quantity + 1 });
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        const item = currentCart.find((c) => c.uniqueId === targetItem);
        if (item && item.quantity > 1) {
          updateCartItem(targetItem, { quantity: item.quantity - 1 });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCart, updateCartItem]);

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

  const handleSelectSearchItem = (item: SearchableItem) => {
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

  return (
    <div
      className={`w-full lg:w-[450px] xl:w-[500px] bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 flex flex-col shadow-2xl overflow-hidden h-auto lg:h-full shrink-0 ${isCartOpen ? "fixed inset-0 z-50 lg:relative lg:z-0" : "hidden lg:flex"}`}
    >
      {/* 1. Header & Table Info */}
      <div className="p-3 sm:p-4 border-b border-white/5 space-y-3 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="text-red-500" size={16} />
            <h3 className="text-xs sm:text-sm font-black text-white">
              تفاصيل الفاتورة
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {/* زر تصغير السلة (minimize) - يظهر فقط في الشاشات الصغيرة */}
            <button
              onClick={() => setIsCartOpen(false)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-white transition-colors"
              title="تصغير"
            >
              <span className="text-lg font-black leading-none">−</span>
            </button>
            {/* زر إغلاق السلة (close) - يغلق الطاولة ويلغي الطلب */}
            <button
              onClick={() => onCloseCart?.()}
              className="lg:hidden p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              title="إغلاق الطاولة"
            >
              <span className="text-lg font-black leading-none">×</span>
            </button>
            {!isHospitality && (
              <div className="flex bg-slate-800 p-1 rounded-lg overflow-x-auto scrollbar-hide">
                {[OrderType.DINE_IN, OrderType.TAKEAWAY].map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`px-1.5 sm:px-2 py-1 text-[7px] sm:text-[8px] font-black rounded-md transition-all whitespace-nowrap ${cartOrderType === type ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    {type === OrderType.DINE_IN ? "محلي" : "فوري"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {cartOrderType === OrderType.DINE_IN && (
          <div className="grid grid-cols-2 gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 mr-2 uppercase tracking-widest">
                الطاولة
              </label>
              <input
                type="text"
                value={manualTable}
                onChange={(e) => handleTableInput(e.target.value)}
                placeholder="رقم..."
                className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-red-600 font-black text-[10px] text-center text-white"
              />
            </div>
            <div className="flex items-end">
              {isHospitality ? (
                <button
                  onClick={onViewTables}
                  className="w-full py-1.5 bg-slate-800 text-slate-400 border border-white/5 rounded-lg font-black text-[8px] hover:bg-slate-700 hover:text-slate-100 transition-all"
                >
                  الخريطة
                </button>
              ) : editingOrderId ? (
                <button
                  onClick={async () => {
                    if (isDeferred) return;
                    if (onDeferOrder) {
                      await onDeferOrder();
                    } else {
                      try {
                        const { orderService } = await import("../../services/orderService");
                        await orderService.deferOrder(Number(editingOrderId));
                        clearCart?.();
                        setPosError(null);
                        setIsCartOpen(false);
                      } catch (err: any) {
                        setPosError(err?.response?.data?.message || "فشل تأجيل الطلب");
                      }
                    }
                  }}
                  disabled={isDeferred}
                  className={`w-full py-1.5 rounded-lg font-black text-[8px] transition-all ${
                    isDeferred
                      ? "bg-slate-800 text-slate-500 border border-slate-600/30 cursor-not-allowed"
                      : "bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30"
                  }`}
                >
                  {isDeferred ? "مؤجلة" : "تأجيل"}
                </button>
              ) : (
                <button
                  onClick={onViewTables}
                  className="w-full py-1.5 bg-slate-800 text-slate-400 border border-white/5 rounded-lg font-black text-[8px] hover:bg-slate-700 hover:text-slate-100 transition-all"
                >
                  الخريطة
                </button>
              )}
            </div>
          </div>
        )}

        {/* Total Amount */}
        <div className="bg-red-600/10 border border-red-600/20 p-2 px-3 rounded-lg flex flex-col gap-1">
          {calculatedDiscount > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  الإجمالي الفرعي
                </span>
                <span className="text-sm font-black text-slate-300">
                  {subtotal.toFixed(2)} ₪
                </span>
              </div>
              {engineDiscountTotal > 0 && (
                <div className="flex justify-between items-center text-emerald-400">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      خصم تلقائي
                    </span>
                    {appliedDiscounts.map((d) => (
                      <span
                        key={d.id}
                        className="text-[7px] text-emerald-300/80"
                        title={`${d.name} (${d.code})`}
                      >
                        {d.name} — {d.code}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-black">
                    -{engineDiscountTotal.toFixed(2)} ₪
                  </span>
                </div>
              )}
              {manualDiscount > 0 && (
                <div className="flex justify-between items-center text-red-500">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      خصم إضافي
                    </span>
                    {discountType === "PERCENT" && (
                      <span className="text-[9px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded">
                        %{discountValue}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-black">
                    -{manualDiscount.toFixed(2)} ₪
                  </span>
                </div>
              )}
              {engineDiscountTotal <= 0 && manualDiscount <= 0 && (
                <div className="flex justify-between items-center text-red-500">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      الخصم
                    </span>
                    {discountType === "PERCENT" && (
                      <span className="text-[9px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded">
                        %{discountValue}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-black">
                    -{calculatedDiscount.toFixed(2)} ₪
                  </span>
                </div>
              )}
            </>
          )}
          {discountLoading && (
            <div className="text-[8px] text-slate-500 animate-pulse">
              جاري حساب الخصومات...
            </div>
          )}
          <div
            className={`pt-1 mt-1 ${calculatedDiscount > 0 ? "border-t border-red-600/20" : ""} flex justify-between items-center`}
          >
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {calculatedDiscount > 0 ? "الصافي النهائي" : "الإجمالي الكلي"}
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


      {/* 3. Table Header + Search (pinned, no scroll) */}
      <div className="bg-slate-900 border-b border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[350px]">
            <thead>
              <tr className="border-b border-white/5">
                {(cartOrderType === OrderType.DINE_IN
                  ? ["#", "الصنف", "السعر", "الكمية", "الإجمالي", "TW", ""]
                  : ["#", "الصنف", "السعر", "الكمية", "الإجمالي", ""]
                ).map(
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
                      <Search
                        size={12}
                        className="shrink-0 text-slate-500"
                      />
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

      {/* 4. Invoice Items Table (scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[100px] lg:min-h-0">
        {currentCart.length === 0 && !addToCart && (
          <div className="flex flex-col items-center justify-center py-6 text-slate-700 gap-2">
            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
              <ShoppingCart size={24} strokeWidth={1.5} />
            </div>
            <p className="font-black text-lg">الفاتورة فارغة</p>
          </div>
        )}
        {currentCart.length === 0 && addToCart && (
          <div className="flex flex-col items-center justify-center py-6 text-slate-700 gap-2">
            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
              <ShoppingCart size={24} strokeWidth={1.5} />
            </div>
            <p className="font-black text-lg">الفاتورة فارغة</p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[350px]">
            <tbody className="divide-y divide-white/5">
              {currentCart.map((item, index) => (
                <tr
                  key={item.uniqueId}
                  className="group hover:bg-white/5 transition-colors"
                >
                  <td className="p-2 sm:p-3 text-[8px] sm:text-[10px] font-black text-slate-600">
                    {index + 1}
                  </td>
                  <td className="p-2 sm:p-3">
                     <input

                      type="text"

                      value={

                        editingNames[item.uniqueId] !== undefined

                          ? editingNames[item.uniqueId]

                          : item.name

                      }

                      onFocus={() => {

                        // عند الدخول للحقل، نضع القيمة الحالية في التعديل للسماح بالإضافة فقط

                        if (editingNames[item.uniqueId] === undefined) {

                          setEditingNames((prev) => ({

                            ...prev,

                            [item.uniqueId]: item.name,

                          }));

                        }

                      }}

                      onChange={(e) => {

                        const newVal = e.target.value;

                        const baseName = item.name;

                        // نسمح فقط إذا كانت القيمة الجديدة تبدأ بالاسم الأصلي

                        if (newVal.startsWith(baseName)) {

                          handleNameChange(item.uniqueId, newVal);

                        }

                      }}

                      onBlur={() => {

                        setEditingNames((prev) => {

                          const next = { ...prev };

                          delete next[item.uniqueId];

                          return next;

                        });

                      }}

                      className="w-full bg-transparent text-[10px] sm:text-xs font-black text-white outline-none border-b border-transparent focus:border-red-500/30"

                    />
                  </td>
                  <td className="p-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold text-slate-400">
                    {getItemCurrentPrice(item)}
                  </td>
                  <td className="p-2 sm:p-3">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateCartItem(item.uniqueId, {
                              quantity: item.quantity - 1,
                            });
                          }
                        }}
                        className="w-5 h-5 bg-slate-700 rounded text-[10px] font-bold text-white hover:bg-slate-600 flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        value={
                          editingQty[item.uniqueId] !== undefined
                            ? editingQty[item.uniqueId]
                            : item.quantity
                        }
                        onChange={(e) =>
                          handleQuantityChange(
                            item.uniqueId,
                            e.target.value,
                            item.price,
                          )
                        }
                        onBlur={(e) =>
                          handleQuantityBlur(item.uniqueId, e.target.value)
                        }
                        className="w-8 bg-transparent text-center text-[10px] sm:text-xs font-black text-white outline-none"
                      />
                      <button
                        onClick={() => {
                          updateCartItem(item.uniqueId, {
                            quantity: item.quantity + 1,
                          });
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
                      onChange={(e) =>
                        handleTotalChange(
                          item.uniqueId,
                          e.target.value,
                          item.price,
                        )
                      }
                      className="w-16 sm:w-20 bg-transparent text-left text-[10px] sm:text-xs font-black text-red-500 outline-none"
                    />
                  </td>
                  {cartOrderType === OrderType.DINE_IN && (
                    <td className="p-2 sm:p-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.is_takeaway ?? false}
                        onChange={(e) => {
                          updateCartItem(item.uniqueId, { is_takeaway: e.target.checked });
                        }}
                        className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="p-2 sm:p-3 text-center">
                    {item.is_printed_direct ? (
                      <span className="text-emerald-500 text-[8px] font-black">مطبوع</span>
                    ) : (
                      <button
                        onClick={() => removeFromCart(item.uniqueId)}
                        className="p-1.5 text-slate-600 hover:text-red-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Footer Summary & Actions */}
      <div className="p-3 sm:p-4 bg-slate-950 border-t border-white/10 space-y-2">
        {/* Note & Discount Row */}
        <div className={`flex gap-2 ${isHospitality ? '' : ''}`}>
          {/* Invoice Note */}
          <div className={`${isHospitality ? 'w-full' : 'flex-1'} bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5`}>
            <div className="flex items-center gap-1 text-slate-500 shrink-0">
              <FileText size={10} />
              <span className="text-[8px] font-black uppercase tracking-widest">
                الملاحظة
              </span>
            </div>
            <textarea
              value={invoiceNote}
              onChange={(e) => setInvoiceNote(e.target.value)}
              placeholder="..."
              className="w-full bg-transparent text-[9px] sm:text-[10px] font-black outline-none text-white placeholder:text-slate-700 h-12 sm:h-16 resize-none"
            />
          </div>
          {/* Discount */}
          {!isHospitality && (
          <div className="w-28 sm:w-32 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-slate-500 shrink-0">
              <Tag size={10} />
              <span className="text-[8px] font-black uppercase tracking-widest">
                الخصم
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
  type="text"
  value={editingDiscount}
  onChange={(e) => {
    setEditingDiscount(e.target.value);
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      setDiscountValue(val);
    }
  }}
  placeholder="0"
  className="flex-1 min-w-0 bg-transparent text-center text-[10px] sm:text-xs font-black text-white outline-none"
/>
              <button
                onClick={() =>
                  setDiscountType(
                    discountType === "AMOUNT" ? "PERCENT" : "AMOUNT",
                  )
                }
                className="text-[9px] font-black text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded hover:text-slate-200 transition-colors"
              >
                {discountType === "AMOUNT" ? "₪" : "%"}
              </button>
            </div>
          </div>
          )}
        </div>
        {/* Action Buttons */}
        {isHospitality ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                if (cartOrderType === OrderType.DINE_IN && !manualTable) {
                  setPosError("يرجى إدخال رقم الطاولة أولاً");
                  return;
                }
                submitOrder(
                  OrderStatus.PENDING,
                  PaymentMethod.CASH,
                  calculatedDiscount,
                  {
                    name: customerName,
                    phone: customerPhone,
                    note: invoiceNote,
                  },
                );
              }}
              disabled={currentCart.length === 0}
              className="py-3 sm:py-4 bg-slate-800 text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-slate-700 shadow-lg disabled:opacity-30 transition-all active:scale-95"
            >
              <Save size={18} />
              حفظ الطلب
            </button>
            <button
              onClick={() => {
                if (cartOrderType === OrderType.DINE_IN && !manualTable) {
                  setPosError("يرجى إدخل رقم الطاولة أولاً");
                  return;
                }
                submitOrder(
                  OrderStatus.CONFIRMED,
                  PaymentMethod.CASH,
                  calculatedDiscount,
                  {
                    name: customerName,
                    phone: customerPhone,
                    note: invoiceNote,
                  },
                );
              }}
              disabled={currentCart.length === 0}
              className="py-3 sm:py-4 bg-red-600 text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-red-700 shadow-xl shadow-red-900/20 disabled:opacity-30 transition-all active:scale-95"
            >
              <Save size={18} />
              {editingOrderId ? "تحديث الطلب" : "إرسال الطلب"}
            </button>
          </div>
        ) : cartOrderType === OrderType.TAKEAWAY ? (
          /* فوري: زرين — حفظ وتنفيذ وطباعة */
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                submitOrder(
                  OrderStatus.PENDING,
                  paymentMethod,
                  calculatedDiscount,
                  {
                    name: customerName,
                    phone: customerPhone,
                    note: invoiceNote,
                  },
                );
              }}
              disabled={currentCart.length === 0}
              className="py-2.5 sm:py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-slate-700 disabled:opacity-30 transition-all active:scale-95"
            >
              <Save size={14} />
              حفظ
            </button>
            <button
              onClick={async () => {
                const result = await submitOrder(
                  OrderStatus.DELIVERED,
                  paymentMethod,
                  calculatedDiscount,
                  {
                    name: customerName,
                    phone: customerPhone,
                    note: invoiceNote,
                  },
                );
                if (result?.id && posInfo?.id) {
                  try {
                    const { printerService } = await import("../../services/printerService");
                    await printerService.directPrint(result.id, posInfo.id);
                  } catch (printErr: any) {
                    console.error("خطأ في الطباعة الفورية:", printErr);
                  }
                }
              }}
              disabled={currentCart.length === 0}
              className="py-2.5 sm:py-3 bg-red-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-red-700 shadow-xl shadow-red-900/20 disabled:opacity-30 transition-all active:scale-95"
            >
              <CheckCircle size={14} />
              تنفيذ وطباعة
            </button>
          </div>
        ) : (
          /* محلي: 4 أزرار — حفظ, تنفيذ, طباعة, إغلاق */
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => {
                if (cartOrderType === OrderType.DINE_IN && !manualTable) {
                  setPosError("يرجى إدخال رقم الطاولة أولاً");
                  return;
                }
                submitOrder(
                  OrderStatus.PENDING,
                  paymentMethod,
                  calculatedDiscount,
                  {
                    name: customerName,
                    phone: customerPhone,
                    note: invoiceNote,
                  },
                );
              }}
              disabled={currentCart.length === 0}
              className="py-2.5 sm:py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-slate-700 disabled:opacity-30 transition-all active:scale-95"
            >
              <Save size={14} />
              حفظ
            </button>
            <button
              onClick={async () => {
                if (cartOrderType === OrderType.DINE_IN && !manualTable) {
                  setPosError("يرجى إدخال رقم الطاولة أولاً");
                  return;
                }
                const result = await submitOrder(
                  OrderStatus.CONFIRMED,
                  paymentMethod,
                  calculatedDiscount,
                  {
                    name: customerName,
                    phone: customerPhone,
                    note: invoiceNote,
                  },
                  undefined,
                  false,
                );
                if (result?.id && posInfo?.id) {
                  try {
                    const { printerService } = await import("../../services/printerService");
                    // تجهيز بيانات TW لكل صنف
                    const itemsWithTw = (result.items || []).map((item: any) => ({
                      order_item_id: item.id,
                      is_takeaway: currentCart.find(
                        (c) => c.itemId === String(item.item_id),
                      )?.is_takeaway ?? false,
                    }));
                    const printResult = await printerService.directPrint(result.id, posInfo.id, itemsWithTw);
                    if (printResult?.success) {
                      // تعليم كل صنف في الكارت كـ "مطبوع" مباشرة
                      for (const cartItem of currentCart) {
                        updateCartItem(cartItem.uniqueId, { is_printed_direct: true });
                      }
                    }
                  } catch (printErr: any) {
                    console.error("خطأ في الطباعة:", printErr);
                  }
                }
              }}
              disabled={currentCart.length === 0 || currentCart.every((item) => item.is_printed_direct)}
              className="py-2.5 sm:py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-emerald-700 shadow-xl shadow-emerald-900/20 disabled:opacity-30 transition-all active:scale-95"
            >
              <CheckCircle size={14} />
              تنفيذ
            </button>
            <button
              onClick={async () => {
                const targetOrderId = editingOrderId || "11";
                try {
                  console.log("جاري إرسال طلب الطباعة للطلب رقم:", targetOrderId);
                  const { default: customApi } = await import("../../api/axios");
                  const response = await customApi.post(`/orders/${targetOrderId}/print-invoice`);
                  if (response.data && response.data.success) {
                    alert("نجاح الطباعة: " + response.data.message);
                  } else {
                    alert("تنبيه: " + (response.data?.message || "لم يتم تنفيذ الأمر بشكل صحيح"));
                  }
                } catch (error: any) {
                  console.error("خطأ في عملية الطباعة:", error);
                  alert("فشل أمر الطباعة: " + (error.response?.data?.message || error.message || "تحقق من اتصال الطابعة بالشبكة"));
                }
              }}
              disabled={currentCart.length === 0 || isPrinting}
              className="py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-blue-700 shadow-xl shadow-blue-900/20 disabled:opacity-30 transition-all active:scale-95"
            >
              {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              {isPrinting ? "..." : "طباعة"}
            </button>
            <button
              onClick={() => {
                if (cartOrderType === OrderType.DINE_IN && !manualTable) {
                  setPosError("يرجى إدخال رقم الطاولة أولاً");
                  return;
                }
                if (
                  !customerName ||
                  (customerName === "صندوق مبيعات" &&
                    paymentMethod !== PaymentMethod.CASH)
                ) {
                  setShowCustomerModal(true);
                  return;
                }
                submitOrder(
                  OrderStatus.DELIVERED,
                  paymentMethod,
                  calculatedDiscount,
                  {
                    name: customerName,
                    phone: customerPhone,
                    note: invoiceNote,
                  },
                );
              }}
              disabled={currentCart.length === 0}
              className="py-2.5 sm:py-3 bg-red-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-red-700 shadow-xl shadow-red-900/20 disabled:opacity-30 transition-all active:scale-95"
            >
              <CheckCircle size={14} />
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
