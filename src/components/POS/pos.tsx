import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../store';
import { MENU_ITEMS } from '../../../constants';
import { OrderType, OrderStatus, PaymentMethod, CustomerType } from '../../../types';
import { AlertCircle, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { POSHeader } from './POSHeader';
import { MenuGrid } from './MenuGrid';
import { InvoiceInfoTab } from './InvoiceInfoTab';
import { CustomerTab } from './CustomerTab';
import { CartPanel } from './CartPanel';
import { CustomerSearchModal, QuickAddCustomerModal, CloseInvoiceModal } from './POSModals';

export const POS: React.FC<{ onViewTables: () => void }> = ({ onViewTables }) => {
  const {
    addToCart, currentCart, cartOrderType, setOrderType,
    updateCartItem, removeFromCart, submitOrder, selectedTable, setSelectedTable, tables, editingOrderId, clearCart,
    currentUser, userRole, customers, addCustomer, employees
  } = useApp();

  const isHospitality = userRole === 'HOSPITALITY';

  // ── UI State ──
  const [activePOSMode, setActivePOSMode] = useState<'menu' | 'info' | 'customer'>('menu');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualTable, setManualTable] = useState('');

  // ── Customer State ──
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // ── Invoice State ──
  const [invoiceNote, setInvoiceNote] = useState('');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [editingDiscount, setEditingDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [accountType, setAccountType] = useState<'ACCOUNT' | 'SUPPLIER' | 'EMPLOYEE'>('ACCOUNT');
  const [accountNumber, setAccountNumber] = useState('');

  // ── Quick Add State ──
  const [quickId, setQuickId] = useState('');
  const [quickQty, setQuickQty] = useState('');
  const [quickTotal, setQuickTotal] = useState('');

  // ── Cart Editing State ──
  const [editingQty, setEditingQty] = useState<{ [id: string]: string }>({});
  const [editingNames, setEditingNames] = useState<{ [id: string]: string }>({});

  // ── Effects ──
  useEffect(() => { setEditingDiscount(discountValue.toString()); }, [discountValue]);

  useEffect(() => {
    if (selectedTable) setManualTable(selectedTable.number.toString());
    else setManualTable('');
  }, [selectedTable]);

  useEffect(() => {
    if (isHospitality) { setOrderType(OrderType.DINE_IN); setActivePOSMode('menu'); }
  }, [isHospitality]);

  useEffect(() => {
    if (posError) { const t = setTimeout(() => setPosError(null), 3000); return () => clearTimeout(t); }
  }, [posError]);

  useEffect(() => {
    if (paymentMethod === PaymentMethod.CASH) { setCustomerName('صندوق مبيعات'); setAccountNumber('1001'); }
    else if (paymentMethod === PaymentMethod.WALLET) { setAccountNumber('2002'); if (customerName === 'صندوق مبيعات') setCustomerName(''); }
    else if (paymentMethod === PaymentMethod.CREDIT_CARD) { setAccountNumber('3003'); if (customerName === 'صندوق مبيعات') setCustomerName(''); }
  }, [paymentMethod]);

  useEffect(() => {
    if (accountType === 'EMPLOYEE' && accountNumber) {
      const emp = employees.find((e: any) => e.id === accountNumber || e.phone === accountNumber);
      if (emp) setCustomerName(emp.name);
    }
  }, [accountNumber, accountType, employees]);

  // ── Derived ──
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return [];
    return customers.filter((c: any) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone.includes(customerSearchQuery)
    );
  }, [customers, customerSearchQuery]);

  const filteredItems = MENU_ITEMS.filter(item =>
    (selectedCategory === 'all' || item.category === selectedCategory) &&
    (item.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) || item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const subtotal = currentCart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const calculatedDiscount = discountType === 'PERCENT' ? (subtotal * discountValue) / 100 : discountValue;
  const total = subtotal - calculatedDiscount;

  // ── Helpers ──
  const getItemCurrentPrice = (item: any) => {
    let price = item.price;
    if (cartOrderType === OrderType.DINE_IN && item.dineInPrice) price = item.dineInPrice;
    else if (cartOrderType === OrderType.TAKEAWAY && item.takeawayPrice) price = item.takeawayPrice;
    else if (cartOrderType === OrderType.DELIVERY && item.deliveryPrice) price = item.deliveryPrice;
    if (item.offerPrice && item.offerStartDate && item.offerEndDate) {
      const now = new Date();
      if (now >= new Date(item.offerStartDate) && now <= new Date(item.offerEndDate)) price = item.offerPrice;
    }
    return price;
  };

  const handleTableInput = (val: string) => {
    setManualTable(val);
    const table = tables.find((t: any) => t.number.toString() === val);
    setSelectedTable(table || null);
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
    addCustomer({ name: quickCustomerName, phone: quickCustomerPhone, type: CustomerType.REGULAR, allowCredit: false, notes: '' });
    setShowQuickAddCustomer(false);
    setQuickCustomerName('');
    setQuickCustomerPhone('');
  };

  const handleQuickIdChange = (id: string) => {
    setQuickId(id);
    const item = MENU_ITEMS.find(i => i.id === id);
    if (item) { setQuickQty('1'); setQuickTotal(getItemCurrentPrice(item).toString()); }
    else { setQuickQty(''); setQuickTotal(''); }
  };

  const handleQuickQtyChange = (qtyStr: string) => {
    setQuickQty(qtyStr);
    const item = MENU_ITEMS.find(i => i.id === quickId);
    if (item && qtyStr) setQuickTotal(((parseFloat(qtyStr) || 0) * getItemCurrentPrice(item)).toFixed(2));
  };

  const handleQuickTotalChange = (totalStr: string) => {
    setQuickTotal(totalStr);
    const item = MENU_ITEMS.find(i => i.id === quickId);
    if (item && totalStr) setQuickQty(((parseFloat(totalStr) || 0) / getItemCurrentPrice(item)).toFixed(2));
  };

  const handleQuickAdd = () => {
    const item = MENU_ITEMS.find(i => i.id === quickId);
    if (!item) return;
    addToCart(item, { quantity: parseFloat(quickQty) || 1, price: getItemCurrentPrice(item) });
    setQuickId(''); setQuickQty(''); setQuickTotal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleQuickAdd(); };

  const handleNameChange = (uniqueId: string, newName: string) => {
    setEditingNames(prev => ({ ...prev, [uniqueId]: newName }));
    updateCartItem(uniqueId, { name: newName });
  };

  const handleQuantityChange = (uniqueId: string, val: string, price: number) => {
    setEditingQty(prev => ({ ...prev, [uniqueId]: val }));
    if (val === '' || val === '.' || val.endsWith('.')) return;
    const qty = parseFloat(val);
    if (!isNaN(qty)) updateCartItem(uniqueId, { quantity: qty });
  };

  const handleQuantityBlur = (uniqueId: string, val: string) => {
    updateCartItem(uniqueId, { quantity: parseFloat(val) || 0 });
    setEditingQty(prev => { const next = { ...prev }; delete next[uniqueId]; return next; });
  };

  const handleTotalChange = (uniqueId: string, val: string, price: number) => {
    if (val === '') { updateCartItem(uniqueId, { quantity: 0 }); return; }
    const newTotal = parseFloat(val);
    if (!isNaN(newTotal)) updateCartItem(uniqueId, { quantity: price > 0 ? newTotal / price : 0 });
  };

  const commonCartProps = {
    isCartOpen, setIsCartOpen, isHospitality, cartOrderType, setOrderType, currentCart,
    manualTable, handleTableInput, onViewTables, subtotal, calculatedDiscount, discountType,
    discountValue, total, invoiceNote, setInvoiceNote, editingDiscount, setEditingDiscount,
    setDiscountValue, setDiscountType, paymentMethod, setPaymentMethod, editingOrderId,
    editingQty, editingNames, handleNameChange, handleQuantityChange, handleQuantityBlur,
    handleTotalChange, setEditingNames, removeFromCart, getItemCurrentPrice, setPosError,
    submitOrder, customerName, customerPhone, setShowCustomerModal,
  };

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
              filteredItems={filteredItems}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              getItemCurrentPrice={getItemCurrentPrice}
              addToCart={addToCart}
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
          عرض السلة ({currentCart.length}) - {total.toFixed(2)} ₪
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
        onConfirm={() => submitOrder(OrderStatus.DELIVERED, paymentMethod, calculatedDiscount, { name: customerName, phone: customerPhone, note: invoiceNote })}
      />
    </div>
  );
};
