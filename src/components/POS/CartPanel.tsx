import React from 'react';
import {
  ShoppingCart, Plus, Trash2, CreditCard, Save, CheckCircle, Tag,
  Wallet, Banknote, FileText,
} from 'lucide-react';
import { OrderType, OrderStatus, PaymentMethod } from '../../../types';

interface CartItem {
  uniqueId: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
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
  discountType: 'AMOUNT' | 'PERCENT';
  discountValue: number;
  total: number;
  invoiceNote: string;
  setInvoiceNote: (note: string) => void;
  editingDiscount: string;
  setEditingDiscount: (val: string) => void;
  setDiscountValue: (val: number) => void;
  setDiscountType: (type: 'AMOUNT' | 'PERCENT') => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  editingOrderId: string | null;
  editingQty: { [id: string]: string };
  editingNames: { [id: string]: string };
  handleNameChange: (uniqueId: string, newName: string) => void;
  handleQuantityChange: (uniqueId: string, val: string, price: number) => void;
  handleQuantityBlur: (uniqueId: string, val: string) => void;
  handleTotalChange: (uniqueId: string, val: string, price: number) => void;
  setEditingNames: React.Dispatch<React.SetStateAction<{ [id: string]: string }>>;
  removeFromCart: (id: string) => void;
  getItemCurrentPrice: (item: any) => number;
  setPosError: (err: string) => void;
  submitOrder: (status: OrderStatus, method: PaymentMethod, discount: number, meta: { name: string; phone: string; note: string }) => void;
  customerName: string;
  customerPhone: string;
  setShowCustomerModal: (show: boolean) => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  isCartOpen, setIsCartOpen, isHospitality, cartOrderType, setOrderType, currentCart,
  manualTable, handleTableInput, onViewTables, subtotal, calculatedDiscount,
  discountType, discountValue, total, invoiceNote, setInvoiceNote, editingDiscount,
  setEditingDiscount, setDiscountValue, setDiscountType, paymentMethod, setPaymentMethod,
  editingOrderId, editingQty, editingNames, handleNameChange, handleQuantityChange,
  handleQuantityBlur, handleTotalChange, setEditingNames, removeFromCart,
  getItemCurrentPrice, setPosError, submitOrder, customerName, customerPhone,
  setShowCustomerModal,
}) => {
  return (
    <div className={`w-full lg:w-[450px] xl:w-[500px] bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 flex flex-col shadow-2xl overflow-hidden h-auto lg:h-full shrink-0 ${isCartOpen ? 'fixed inset-0 z-50 lg:relative lg:z-0' : 'hidden lg:flex'}`}>
      {/* 1. Header & Table Info */}
      <div className="p-3 sm:p-4 border-b border-white/5 space-y-3 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="text-red-500" size={16} />
            <h3 className="text-xs sm:text-sm font-black text-white">تفاصيل الفاتورة</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-1.5 text-slate-500 hover:text-white transition-colors">
              <Plus className="rotate-45" size={20} />
            </button>
            {!isHospitality && (
              <div className="flex bg-slate-800 p-1 rounded-lg overflow-x-auto scrollbar-hide">
                {([OrderType.DINE_IN, OrderType.TAKEAWAY]).map(type => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`px-1.5 sm:px-2 py-1 text-[7px] sm:text-[8px] font-black rounded-md transition-all whitespace-nowrap ${cartOrderType === type ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {type === OrderType.DINE_IN ? 'محلي' : 'فوري'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {cartOrderType === OrderType.DINE_IN && (
          <div className="grid grid-cols-2 gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 mr-2 uppercase tracking-widest">الطاولة</label>
              <input
                type="text"
                value={manualTable}
                onChange={(e) => handleTableInput(e.target.value)}
                placeholder="رقم..."
                className="w-full px-2 py-1.5 bg-slate-800 border border-white/5 rounded-lg outline-none focus:ring-1 focus:ring-red-600 font-black text-[10px] text-center text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={onViewTables}
                className="w-full py-1.5 bg-slate-800 text-slate-400 border border-white/5 rounded-lg font-black text-[8px] hover:bg-slate-700 hover:text-slate-100 transition-all"
              >
                الخريطة
              </button>
            </div>
          </div>
        )}

        {/* Total Amount */}
        <div className="bg-red-600/10 border border-red-600/20 p-2 px-3 rounded-lg flex flex-col gap-1">
          {calculatedDiscount > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">الإجمالي الفرعي</span>
                <span className="text-sm font-black text-slate-300">{subtotal.toFixed(2)} ₪</span>
              </div>
              <div className="flex justify-between items-center text-red-500">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-black uppercase tracking-widest">الخصم</span>
                  {discountType === 'PERCENT' && <span className="text-[9px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-800 rounded">%{discountValue}</span>}
                </div>
                <span className="text-sm font-black">-{calculatedDiscount.toFixed(2)} ₪</span>
              </div>
            </>
          )}
          <div className={`pt-1 mt-1 ${calculatedDiscount > 0 ? 'border-t border-red-600/20' : ''} flex justify-between items-center`}>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {calculatedDiscount > 0 ? 'الصافي النهائي' : 'الإجمالي الكلي'}
            </span>
            <div className="text-left">
              <span className="text-base sm:text-lg font-black text-red-600">{total.toFixed(2)}</span>
              <span className="text-[9px] font-black text-red-600 mr-1">₪</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Invoice Items Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[200px] lg:min-h-0">
        {currentCart.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-700 space-y-3">
            <div className="w-12 sm:w-16 h-12 sm:h-16 bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
              <ShoppingCart size={24} strokeWidth={1} />
            </div>
            <p className="font-black text-[10px] sm:text-xs">الفاتورة فارغة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[350px]">
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="border-b border-white/5">
                  {['#', 'الصنف', 'السعر', 'الكمية', 'الإجمالي', ''].map((h, i) => (
                    <th key={i} className={`p-2 sm:p-3 text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ${i === 4 ? 'text-left' : i === 3 ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentCart.map((item) => (
                  <tr key={item.uniqueId} className="group hover:bg-white/5 transition-colors">
                    <td className="p-2 sm:p-3 text-[8px] sm:text-[10px] font-black text-slate-600">#{item.itemId}</td>
                    <td className="p-2 sm:p-3">
                      <input
                        type="text"
                        value={editingNames[item.uniqueId] !== undefined ? editingNames[item.uniqueId] : item.name}
                        onChange={(e) => handleNameChange(item.uniqueId, e.target.value)}
                        onBlur={() => setEditingNames(prev => { const next = { ...prev }; delete next[item.uniqueId]; return next; })}
                        className="w-full bg-transparent text-[10px] sm:text-xs font-black text-white outline-none border-b border-transparent focus:border-red-500/30"
                      />
                    </td>
                    <td className="p-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold text-slate-400">{getItemCurrentPrice(item)}</td>
                    <td className="p-2 sm:p-3">
                      <input
                        type="text"
                        value={editingQty[item.uniqueId] !== undefined ? editingQty[item.uniqueId] : item.quantity}
                        onChange={(e) => handleQuantityChange(item.uniqueId, e.target.value, item.price)}
                        onBlur={(e) => handleQuantityBlur(item.uniqueId, e.target.value)}
                        className="w-10 sm:w-12 bg-transparent text-center text-[10px] sm:text-xs font-black text-white outline-none"
                      />
                    </td>
                    <td className="p-2 sm:p-3 text-left">
                      <input
                        type="text"
                        value={Math.round(item.price * item.quantity * 100) / 100}
                        onChange={(e) => handleTotalChange(item.uniqueId, e.target.value, item.price)}
                        className="w-16 sm:w-20 bg-transparent text-left text-[10px] sm:text-xs font-black text-red-500 outline-none"
                      />
                    </td>
                    <td className="p-2 sm:p-3 text-center">
                      <button
                        onClick={() => removeFromCart(item.uniqueId)}
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
        )}
      </div>

      {/* 4. Footer Summary & Actions */}
      <div className="p-3 sm:p-4 bg-slate-950 border-t border-white/10 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Invoice Note */}
          <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-slate-500 shrink-0">
              <FileText size={10} />
              <span className="text-[8px] font-black uppercase tracking-widest">الملاحظة</span>
            </div>
            <textarea
              value={invoiceNote}
              onChange={(e) => setInvoiceNote(e.target.value)}
              placeholder="..."
              className="w-full bg-transparent text-[9px] sm:text-[10px] font-black outline-none text-white placeholder:text-slate-700 h-6 sm:h-8 resize-none"
            />
          </div>

          {/* Discount */}
          <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-1 text-slate-500 shrink-0">
              <div className="flex items-center gap-1">
                <Tag size={10} />
                <span className="text-[8px] font-black uppercase tracking-widest">الخصم</span>
              </div>
              <div className="flex bg-slate-800 rounded-lg p-0.5">
                <button onClick={() => setDiscountType('AMOUNT')} className={`px-1.5 py-0.5 rounded-md text-[7px] font-black transition-all ${discountType === 'AMOUNT' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>₪</button>
                <button onClick={() => setDiscountType('PERCENT')} className={`px-1.5 py-0.5 rounded-md text-[7px] font-black transition-all ${discountType === 'PERCENT' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>%</button>
              </div>
            </div>
            <input
              type="text"
              value={editingDiscount}
              onChange={(e) => { setEditingDiscount(e.target.value); setDiscountValue(parseFloat(e.target.value) || 0); }}
              onBlur={() => setEditingDiscount(discountValue.toString())}
              placeholder="0.00"
              className="w-full bg-transparent text-[9px] sm:text-[10px] font-black outline-none text-white placeholder:text-slate-700"
            />
          </div>
        </div>

        {/* Payment Methods */}
        {!isHospitality && (
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { method: PaymentMethod.CASH, icon: <Banknote size={14} />, label: 'كاش' },
              { method: PaymentMethod.WALLET, icon: <Wallet size={14} />, label: 'تطبيق' },
              { method: PaymentMethod.CREDIT_CARD, icon: <CreditCard size={14} />, label: 'بطاقة' },
            ].map(({ method, icon, label }) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-xl border transition-all ${paymentMethod === method ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-slate-900 border-white/5 text-slate-500'}`}
              >
                {icon}
                <span className="text-[8px] sm:text-[9px] font-black">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {isHospitality ? (
            <button
              onClick={() => {
                if (cartOrderType === OrderType.DINE_IN && !manualTable) { setPosError('يرجى إدخل رقم الطاولة أولاً'); return; }
                submitOrder(OrderStatus.CONFIRMED, PaymentMethod.CASH, calculatedDiscount, { name: customerName, phone: customerPhone, note: invoiceNote });
              }}
              disabled={currentCart.length === 0}
              className="col-span-2 py-3 sm:py-4 bg-red-600 text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-red-700 shadow-xl shadow-red-900/20 disabled:opacity-30 transition-all active:scale-95"
            >
              <Save size={18} />
              {editingOrderId ? 'تحديث الطلب' : 'إرسال الطلب للمطبخ والكاشير'}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (cartOrderType === OrderType.DINE_IN && !manualTable) { setPosError('يرجى إدخال رقم الطاولة أولاً'); return; }
                  submitOrder(OrderStatus.PENDING, paymentMethod, calculatedDiscount, { name: customerName, phone: customerPhone, note: invoiceNote });
                }}
                disabled={currentCart.length === 0}
                className="py-2.5 sm:py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-slate-700 disabled:opacity-30 transition-all active:scale-95"
              >
                <Save size={14} />
                حفظ
              </button>
              <button
                onClick={() => {
                  if (cartOrderType === OrderType.DINE_IN && !manualTable) { setPosError('يرجى إدخال رقم الطاولة أولاً'); return; }
                  if (!customerName || (customerName === 'صندوق مبيعات' && paymentMethod !== PaymentMethod.CASH)) { setShowCustomerModal(true); return; }
                  submitOrder(OrderStatus.DELIVERED, paymentMethod, calculatedDiscount, { name: customerName, phone: customerPhone, note: invoiceNote });
                }}
                disabled={currentCart.length === 0}
                className="py-2.5 sm:py-3 bg-red-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-red-700 shadow-xl shadow-red-900/20 disabled:opacity-30 transition-all active:scale-95"
              >
                <CheckCircle size={14} />
                إغلاق
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};