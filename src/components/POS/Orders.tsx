
import React, { useState } from 'react';
import { useApp } from '../../../store';
import { OrderStatus, PaymentMethod, FinancialTransactionType, OrderType } from '../../../types';
import type { Order } from '../../../types';
import {
  Clock, CheckCircle2, Edit3, Eye, Search,
  User, Phone, CreditCard, Wallet, Banknote, FileText,
  PackageOpen, ClipboardList, Hash, RotateCcw, Trash2
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { activeOrders, voidOrder, completeOrder, loadOrderToPOS, currentShift, addFinancialTransaction, currentUser, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case OrderStatus.PREPARING: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case OrderStatus.READY: return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case OrderStatus.DELIVERED: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case OrderStatus.CANCELED: return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'قيد المراجعة';
      case OrderStatus.PREPARING: return 'في المطبخ';
      case OrderStatus.READY: return 'جاهز';
      case OrderStatus.DELIVERED: return 'تم التسليم';
      case OrderStatus.CANCELED: return 'ملغي';
      default: return 'غير معروف';
    }
  };

  const getPaymentIcon = (method?: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return <Banknote size={14} />;
      case PaymentMethod.CREDIT_CARD: return <CreditCard size={14} />;
      case PaymentMethod.WALLET: return <Wallet size={14} />;
      default: return <Banknote size={14} />;
    }
  };

  const getPaymentLabel = (method?: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return 'كاش';
      case PaymentMethod.CREDIT_CARD: return 'بطاقة';
      case PaymentMethod.WALLET: return 'تطبيق';
      default: return 'كاش';
    }
  };

  const filteredOrders = activeOrders.filter(order => {
    // Filter by shift if shift is open
    const orderDate = new Date(order.createdAt);
    const isInShift = currentShift ? orderDate >= new Date(currentShift.startTime) : true;

    if (!isInShift) return false;

    const matchesTab = activeTab === 'ACTIVE'
      ? order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELED
      : order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELED;

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || order.type === typeFilter;

    const matchesSearch = order.orderNumber.includes(searchTerm) ||
      (order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerPhone?.includes(searchTerm));

    return matchesTab && matchesStatus && matchesType && matchesSearch;
  });

  const handleEditOrder = (order: Order) => {
    if (order.status === OrderStatus.DELIVERED) {
      addNotification('عذراً، الطلبات المسلمة لا يمكن تعديلها.');
      return;
    }
    loadOrderToPOS(order);
  };

  const handleRefund = (order: Order) => {
    if (!currentShift || !currentUser) return;
    const confirm = window.confirm(`هل أنت متأكد من رغبتك في استرداد الطلب #${order.orderNumber}؟`);
    if (confirm) {
      addFinancialTransaction({
        shiftId: currentShift.id,
        cashierId: currentUser.id,
        type: FinancialTransactionType.REFUND,
        amount: order.total,
        reason: `مرتجع طلب #${order.orderNumber}`,
      });
      voidOrder(order.id);
      addNotification('تم تسجيل طلب المرتجع بنجاح');
    }
  };

  const handleVoid = (order: Order) => {
    if (!currentShift || !currentUser) return;
    const reason = window.prompt('يرجى إدخال سبب إلغاء الطلب:');
    if (reason) {
      addFinancialTransaction({
        shiftId: currentShift.id,
        cashierId: currentUser.id,
        type: FinancialTransactionType.VOID,
        amount: order.total,
        reason: `إلغاء طلب #${order.orderNumber}: ${reason}`,
      });
      voidOrder(order.id);
      addNotification('تم إلغاء الطلب وتسجيل العملية');
    }
  };

  return (
    <div className="space-y-5 w-full p-3 sm:p-5 lg:p-6 bg-slate-950 h-full overflow-y-auto rounded-[2rem] custom-scrollbar">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-white tracking-tight">إدارة الطلبات</h2>
          <p className="text-slate-500 font-bold text-[11px]">
            {currentShift ? `عرض طلبات الشفت الحالي (بدأ ${new Date(currentShift.startTime).toLocaleTimeString('ar-EG')})` : 'تابع الطلبات النشطة وراجع سجل المبيعات'}
          </p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="بحث برقم الطلب، اسم الزبون أو الجوال..."
            className="w-full pr-10 pl-4 py-3 bg-slate-900 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-red-600 text-xs font-bold text-white shadow-xl placeholder:text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 w-fit shadow-xl">
          <button
            onClick={() => { setActiveTab('ACTIVE'); setStatusFilter('ALL'); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${activeTab === 'ACTIVE' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ClipboardList size={14} />
            الطلبات النشطة
          </button>
          <button
            onClick={() => { setActiveTab('CLOSED'); setStatusFilter('ALL'); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${activeTab === 'CLOSED' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <CheckCircle2 size={14} />
            الطلبات المغلقة
          </button>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5 w-fit shadow-2xl">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`w-12 h-9 flex items-center justify-center rounded-lg font-black text-[10px] transition-all ${typeFilter === 'ALL' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            الكل
          </button>
          <button
            onClick={() => setTypeFilter(OrderType.DINE_IN)}
            className={`w-12 h-9 flex items-center justify-center rounded-lg font-black text-[10px] transition-all ${typeFilter === OrderType.DINE_IN ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            محلي
          </button>
          <button
            onClick={() => setTypeFilter(OrderType.TAKEAWAY)}
            className={`w-12 h-9 flex items-center justify-center rounded-lg font-black text-[10px] transition-all ${typeFilter === OrderType.TAKEAWAY ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            فوري
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-slate-900 rounded-[1.5rem] border border-white/5 shadow-xl hover:border-red-600/30 transition-all group overflow-hidden flex flex-col">
            <div className="p-5 flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Hash size={10} />
                    <span className="text-[8px] font-black uppercase tracking-widest">رقم الطلب</span>
                  </div>
                  <p className="text-xl font-black text-white">#{order.orderNumber.split('-').pop()}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border text-[9px] font-black flex items-center gap-1.5 ${getStatusColor(order.status)}`}>
                  <div className={`w-1 h-1 rounded-full animate-pulse ${getStatusColor(order.status).split(' ')[1].replace('text-', 'bg-')}`} />
                  {getStatusLabel(order.status)}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <ClipboardList size={10} />
                  <span className="text-[8px] font-black uppercase tracking-widest">الأصناف</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {order.items.map(item => (
                    <div key={item.uniqueId} className="flex justify-between items-center bg-slate-800/30 p-2 rounded-xl border border-white/5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-slate-200">{item.name}</span>
                          <span className="text-[9px] font-black bg-red-600/20 text-red-500 px-1 py-0.5 rounded">x{item.quantity}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-white">{(item.price * item.quantity).toFixed(2)} ₪</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock size={10} />
                    <span className="text-[8px] font-black uppercase tracking-widest">الوقت</span>
                  </div>
                  <p className="text-[9px] font-black text-slate-300">{new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    {getPaymentIcon(order.paymentMethod)}
                    <span className="text-[8px] font-black uppercase tracking-widest">الدفع</span>
                  </div>
                  <p className="text-[9px] font-black text-slate-300">{getPaymentLabel(order.paymentMethod)}</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Hash size={10} />
                    <span className="text-[8px] font-black uppercase tracking-widest">طاولة</span>
                  </div>
                  <p className="text-[9px] font-black text-red-500">
                    {order.type === OrderType.DINE_IN ? `${order.tableId?.replace('t-', '') || '---'}` : 'فوري'}
                  </p>
                </div>
              </div>

              {/* Customer Info (Only for Closed Orders or if available) */}
              {(activeTab === 'CLOSED' || order.customerName) && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <User size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">الزبون</span>
                    </div>
                    <p className="text-xs font-black text-slate-300 truncate">{order.customerName || 'غير محدد'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Phone size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">الجوال</span>
                    </div>
                    <p className="text-xs font-black text-slate-300">{order.customerPhone || '---'}</p>
                  </div>
                </div>
              )}

              {/* Note */}
              {order.note && (
                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <FileText size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">الملاحظة</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 bg-slate-800/30 p-3 rounded-xl border border-white/5 italic">
                    "{order.note}"
                  </p>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">الإجمالي النهائي</span>
                <p className="text-xl font-black text-red-600">{order.total.toFixed(2)} <span className="text-[10px]">₪</span></p>
              </div>
            </div>

            <div className="p-4 bg-slate-800/30 border-t border-white/5 flex gap-2">
              {activeTab === 'ACTIVE' ? (
                <>
                  <button
                    onClick={() => handleVoid(order)}
                    className="p-2.5 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all active:scale-95"
                    title="إلغاء الطلب"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => handleEditOrder(order)}
                    className="flex-1 bg-slate-800 border border-white/5 text-slate-300 py-2.5 rounded-xl font-black text-[10px] hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Edit3 size={14} /> تعديل
                  </button>
                  <button
                    onClick={() => {
                      if (!order.customerName) {
                        const name = prompt('يرجى إدخال اسم الزبون لإغلاق الفاتورة:');
                        if (!name) return;
                        // In a real app we'd update the order, here we'll just proceed if name is provided
                        completeOrder(order.id, { method: order.paymentMethod || PaymentMethod.CASH });
                      } else {
                        completeOrder(order.id, { method: order.paymentMethod || PaymentMethod.CASH });
                      }
                    }}
                    className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-black text-[10px] hover:bg-red-700 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-900/20 active:scale-95"
                  >
                    <CheckCircle2 size={14} /> إغلاق
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleRefund(order)}
                    className="flex-1 bg-orange-600/10 border border-orange-500/20 text-orange-500 py-2.5 rounded-xl font-black text-[10px] hover:bg-orange-600 hover:text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <RotateCcw size={14} /> طلب مرتجع
                  </button>
                  <button className="flex-1 bg-slate-800 border border-white/5 text-slate-300 py-2.5 rounded-xl font-black text-[10px] hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95">
                    <Eye size={14} /> عرض التفاصيل الكاملة
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-600 blur-[60px] opacity-20 rounded-full" />
              <div className="relative w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 shadow-2xl">
                <PackageOpen size={64} className="text-slate-700" strokeWidth={1} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white">لا توجد طلبات حالياً</h3>
              <p className="text-slate-500 font-bold text-sm max-w-xs mx-auto">
                {searchTerm ? 'لم نجد أي نتائج تطابق بحثك، جرب كلمات أخرى' : 'يبدو أن قائمة الطلبات فارغة في هذا القسم'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};