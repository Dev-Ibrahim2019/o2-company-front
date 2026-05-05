// src/components/POS/pos.tsx
//
// التغييرات الجوهرية:
// 1. المنيو يجي من API عبر useMenu(branchId) بدل MENU_ITEMS الثابتة
// 2. السلة تدار عبر useCart — addToCart يزيد الكمية بدل صف جديد
// 3. submitOrder يرسل للـ API فعلياً
// 4. getItemCurrentPrice تقرأ item.price مباشرة (جاي من pivot الفرع)

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../store';
import { OrderType, OrderStatus, PaymentMethod, CustomerType } from '../../../types';
import { AlertCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { POSHeader } from './POSHeader';
import { MenuGrid } from './MenuGrid';
import { InvoiceInfoTab } from './InvoiceInfoTab';
import { CustomerTab } from './CustomerTab';
import { CartPanel } from './CartPanel';
import {
  CustomerSearchModal,
  QuickAddCustomerModal,
  CloseInvoiceModal,
} from './POSModals';

import { useMenu } from '../../hooks/useMenu';
import { useCart } from '../../hooks/useCart';
import type { MenuItem } from '../../hooks/useMenu';

export const POS: React.FC<{ onViewTables: () => void }> = ({ onViewTables }) => {
  // ── Store (للحالات القديمة غير المنقولة بعد) ──────────────────────────────
  const {
    selectedTable, setSelectedTable, tables,
    currentUser, userRole, customers, addCustomer, employees,
  } = useApp();

  const isHospitality = userRole === 'HOSPITALITY';

  // ── Branch ID ─────────────────────────────────────────────────────────────
  // نأخذه من currentUser إذا موجود، وإلا نستخدم 1 كـ fallback مؤقت
  const branchId: number = (currentUser as any)?.branch_id ?? (currentUser as any)?.branchId ?? 1;

  // ── Menu from API ─────────────────────────────────────────────────────────
  const { categories, allItems, loading: menuLoading, findByCode } = useMenu(branchId);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const {
    cart: currentCart,
    subtotal,
    addToCart: addToCartRaw,
    updateCartItem,
    removeFromCart,
    clearCart,
    submitOrder: submitOrderApi,
    submitting,
    submitError,
  } = useCart();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [activePOSMode, setActivePOSMode] = useState<'menu' | 'info' | 'customer'>('menu');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualTable, setManualTable] = useState('');
  const [editingOrderId] = useState<string | null>(null);

  // ── Customer State ────────────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // ── Invoice State ─────────────────────────────────────────────────────────
  const [invoiceNote, setInvoiceNote] = useState('');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [editingDiscount, setEditingDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [cartOrderType, setCartOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [accountType, setAccountType] = useState<'ACCOUNT' | 'SUPPLIER' | 'EMPLOYEE'>('ACCOUNT');
  const [accountNumber, setAccountNumber] = useState('');

  // ── Quick Add State ───────────────────────────────────────────────────────
  const [quickId, setQuickId] = useState('');
  const [quickQty, setQuickQty] = useState('');
  const [quickTotal, setQuickTotal] = useState('');

  // ── Cart Editing State ────────────────────────────────────────────────────
  const [editingQty, setEditingQty] = useState<{ [id: string]: string }>({});
  const [editingNames, setEditingNames] = useState<{ [id: string]: string }>({});

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { setEditingDiscount(discountValue.toString()); }, [discountValue]);

  useEffect(() => {
    if (selectedTable) setManualTable((selectedTable as any).number?.toString() ?? '');
    else setManualTable('');
  }, [selectedTable]);

  useEffect(() => {
    if (isHospitality) { setCartOrderType(OrderType.DINE_IN); setActivePOSMode('menu'); }
  }, [isHospitality]);

  useEffect(() => {
    if (posError || submitError) {
      const msg = submitError || posError;
      setPosError(msg);
      const t = setTimeout(() => setPosError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [posError, submitError]);

  useEffect(() => {
    if (paymentMethod === PaymentMethod.CASH) {
      setCustomerName('صندوق مبيعات'); setAccountNumber('1001');
    } else if (paymentMethod === PaymentMethod.WALLET) {
      setAccountNumber('2002');
      if (customerName === 'صندوق مبيعات') setCustomerName('');
    } else if (paymentMethod === PaymentMethod.CREDIT_CARD) {
      setAccountNumber('3003');
      if (customerName === 'صندوق مبيعات') setCustomerName('');
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (accountType === 'EMPLOYEE' && accountNumber) {
      const emp = employees?.find((e: any) => e.id === accountNumber || e.phone === accountNumber);
      if (emp) setCustomerName((emp as any).name);
    }
  }, [accountNumber, accountType, employees]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return [];
    return (customers ?? []).filter((c: any) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone.includes(customerSearchQuery)
    );
  }, [customers, customerSearchQuery]);

  const calculatedDiscount = discountType === 'PERCENT'
    ? (subtotal * discountValue) / 100
    : discountValue;
  const total = Math.max(0, subtotal - calculatedDiscount);

  // ── Helpers ───────────────────────────────────────────────────────────────

  // ✅ getItemCurrentPrice: السعر يجي من pivot مباشرة
  const getItemCurrentPrice = (item: any): number => item.price ?? 0;

  const setOrderType = (type: OrderType) => setCartOrderType(type);

  const addToCart = (item: MenuItem | any, opts?: { quantity?: number; price?: number }) => {
    addToCartRaw(item, opts);
  };

  const handleTableInput = (val: string) => {
    setManualTable(val);
    const table = tables?.find((t: any) => t.number?.toString() === val);
    setSelectedTable(table ?? null);
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowSearchModal(false);
    setCustomerSearchQuery('');
  };

  const handleQuickAddCustomer = () => {
    if (!quickCustomerName || !quickCustomerPhone) return;
    addCustomer?.({ name: quickCustomerName, phone: quickCustomerPhone, type: CustomerType.REGULAR, allowCredit: false, notes: '' });
    setShowQuickAddCustomer(false);
    setQuickCustomerName('');
    setQuickCustomerPhone('');
  };

  // ── Quick Add ─────────────────────────────────────────────────────────────
  const handleQuickIdChange = (id: string) => {
    setQuickId(id);
    const item = findByCode(id);
    if (item) { setQuickQty('1'); setQuickTotal(item.price.toFixed(2)); }
    else { setQuickQty(''); setQuickTotal(''); }
  };

  const handleQuickQtyChange = (qtyStr: string) => {
    setQuickQty(qtyStr);
    const item = findByCode(quickId);
    if (item && qtyStr) setQuickTotal(((parseFloat(qtyStr) || 0) * item.price).toFixed(2));
  };

  const handleQuickTotalChange = (totalStr: string) => {
    setQuickTotal(totalStr);
    const item = findByCode(quickId);
    if (item && totalStr) setQuickQty(((parseFloat(totalStr) || 0) / item.price).toFixed(2));
  };

  const handleQuickAdd = () => {
    const item = findByCode(quickId);
    if (!item) { setPosError('الصنف غير موجود في منيو هذا الفرع'); return; }
    addToCart(item, { quantity: parseFloat(quickQty) || 1, price: item.price });
    setQuickId(''); setQuickQty(''); setQuickTotal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleQuickAdd(); };

  // ── Cart Handlers ─────────────────────────────────────────────────────────
  const handleNameChange = (uniqueId: string, newName: string) => {
    setEditingNames(prev => ({ ...prev, [uniqueId]: newName }));
    updateCartItem(uniqueId, { name: newName } as any);
  };

  const handleQuantityChange = (uniqueId: string, val: string) => {
    setEditingQty(prev => ({ ...prev, [uniqueId]: val }));
    if (val === '' || val === '.' || val.endsWith('.')) return;
    const qty = parseFloat(val);
    if (!isNaN(qty)) updateCartItem(uniqueId, { quantity: qty } as any);
  };

  const handleQuantityBlur = (uniqueId: string, val: string) => {
    updateCartItem(uniqueId, { quantity: parseFloat(val) || 0 } as any);
    setEditingQty(prev => { const n = { ...prev }; delete n[uniqueId]; return n; });
  };

  const handleTotalChange = (uniqueId: string, val: string, price: number) => {
    if (val === '') { updateCartItem(uniqueId, { quantity: 0 } as any); return; }
    const newTotal = parseFloat(val);
    if (!isNaN(newTotal)) updateCartItem(uniqueId, { quantity: price > 0 ? newTotal / price : 0 } as any);
  };

  // ── submitOrder ───────────────────────────────────────────────────────────
  // يرسل الطلب للـ API الحقيقي
  const submitOrder = async (
    status: OrderStatus,
    method: PaymentMethod,
    _discount: number,
    meta: { name: string; phone: string; note: string }
  ) => {
    if (currentCart.length === 0) { setPosError('السلة فارغة'); return; }

    const orderType = cartOrderType === OrderType.DINE_IN ? 'dine_in' : 'takeaway';

    const shouldConfirm =
      status === OrderStatus.CONFIRMED ||
      isHospitality;   // الضيافة تأكد مباشرة

    const paymentMap: Record<PaymentMethod, 'cash' | 'credit_card' | 'wallet'> = {
      [PaymentMethod.CASH]: 'cash',
      [PaymentMethod.CREDIT_CARD]: 'credit_card',
      [PaymentMethod.WALLET]: 'wallet',
    };

    const result = await submitOrderApi(
      {
        branch_id: branchId,
        cashier_id: currentUser?.id ? Number(currentUser.id) : undefined,
        order_type: orderType,
        table_number: manualTable || undefined,
        customer_name: meta.name || undefined,
        customer_phone: meta.phone || undefined,
        note: meta.note || undefined,
        discount_value: discountValue || undefined,
        discount_type: discountType === 'PERCENT' ? 'percent' : 'amount',
        payment_method: paymentMap[method],
      },
      shouldConfirm
    );

    if (result) {
      // تنظيف بعد النجاح
      setInvoiceNote('');
      setDiscountValue(0);
      setManualTable('');
      setCustomerName('');
      setCustomerPhone('');
      setShowCustomerModal(false);
    }
  };

  // ── commonCartProps ───────────────────────────────────────────────────────
  const commonCartProps = {
    isCartOpen, setIsCartOpen,
    isHospitality,
    cartOrderType,
    setOrderType,
    currentCart,
    manualTable, handleTableInput, onViewTables,
    subtotal, calculatedDiscount, discountType, discountValue, total,
    invoiceNote, setInvoiceNote,
    editingDiscount, setEditingDiscount, setDiscountValue, setDiscountType,
    paymentMethod, setPaymentMethod,
    editingOrderId,
    editingQty, editingNames,
    handleNameChange,
    handleQuantityChange,
    handleQuantityBlur,
    handleTotalChange,
    setEditingNames,
    removeFromCart,
    getItemCurrentPrice,
    setPosError,
    submitOrder,
    customerName, customerPhone,
    setShowCustomerModal,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full bg-slate-950 overflow-y-auto lg:overflow-hidden p-2 sm:p-4 lg:p-0 custom-scrollbar relative">

      {/* Error Toast */}
      <AnimatePresence>
        {posError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 border border-red-500/50"
          >
            <AlertCircle size={20} />
            {posError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submitting Overlay */}
      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[150] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl px-8 py-6 flex items-center gap-4 shadow-2xl">
              <Loader2 size={24} className="text-red-500 animate-spin" />
              <span className="text-white font-black text-sm">جاري إرسال الطلب...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Panel: Menu Area */}
      <div className={`flex-1 flex flex-col min-w-0 h-full ${isCartOpen ? 'hidden lg:flex' : 'flex'}`}>
        <POSHeader
          editingOrderId={editingOrderId}
          isHospitality={isHospitality}
          activePOSMode={activePOSMode}
          setActivePOSMode={setActivePOSMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          quickId={quickId} quickQty={quickQty} quickTotal={quickTotal}
          handleQuickIdChange={handleQuickIdChange}
          handleQuickQtyChange={handleQuickQtyChange}
          handleQuickTotalChange={handleQuickTotalChange}
          handleQuickAdd={handleQuickAdd}
          handleKeyDown={handleKeyDown}
          clearCart={clearCart}
        />

        <div className="flex-1 flex flex-col min-h-0">
          {activePOSMode === 'menu' ? (
            <MenuGrid
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              searchQuery={searchQuery}
              addToCart={addToCart}
              loading={menuLoading}
            />
          ) : activePOSMode === 'info' ? (
            <InvoiceInfoTab editingOrderId={editingOrderId} currentUser={currentUser} />
          ) : (
            <CustomerTab
              customerName={customerName} setCustomerName={setCustomerName}
              customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
              selectedCustomer={selectedCustomer}
              accountType={accountType} setAccountType={setAccountType}
              accountNumber={accountNumber} setAccountNumber={setAccountNumber}
              setShowSearchModal={setShowSearchModal}
            />
          )}
        </div>
      </div>

      {/* Right Panel: Cart */}
      <CartPanel {...commonCartProps} />

      {/* Mobile Cart Button */}
      {currentCart.length > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="lg:hidden fixed bottom-6 left-6 right-6 bg-red-600 text-white py-4 rounded-2xl font-black shadow-2xl shadow-red-900/40 flex items-center justify-center gap-3 z-40 animate-bounce"
        >
          <ShoppingCart size={20} />
          عرض السلة ({currentCart.length}) — {total.toFixed(2)} ₪
        </button>
      )}

      {/* Modals */}
      <CustomerSearchModal
        show={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        customerSearchQuery={customerSearchQuery}
        setCustomerSearchQuery={setCustomerSearchQuery}
        filteredCustomers={filteredCustomers}
        handleSelectCustomer={handleSelectCustomer}
        onAddNew={(name) => { setQuickCustomerName(name); setShowQuickAddCustomer(true); }}
      />

      <QuickAddCustomerModal
        show={showQuickAddCustomer}
        onClose={() => setShowQuickAddCustomer(false)}
        quickCustomerName={quickCustomerName}
        setQuickCustomerName={setQuickCustomerName}
        quickCustomerPhone={quickCustomerPhone}
        setQuickCustomerPhone={setQuickCustomerPhone}
        handleQuickAddCustomer={handleQuickAddCustomer}
      />

      <CloseInvoiceModal
        show={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customerName={customerName}
        setCustomerName={setCustomerName}
        setPosError={setPosError}
        onConfirm={() => submitOrder(
          OrderStatus.DELIVERED,
          paymentMethod,
          calculatedDiscount,
          { name: customerName, phone: customerPhone, note: invoiceNote }
        )}
      />
    </div>
  );
};