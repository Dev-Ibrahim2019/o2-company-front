import { useState, useMemo } from 'react';
import { useApp } from '../../../store';
import { OrderStatus, OrderType} from '../../../types';
import type {Order} from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ShoppingCart, 
  Layers, 
  Wallet, 
  FileText, 
  Search,
  Plus,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Printer,
  History,
  X,
  Building2,
  LayoutGrid,
  Activity,
  DollarSign,
  Flame,
  Check,
  Minus,
  Scissors,
  UtensilsCrossed,
  Archive,
  XCircle as XCircleIcon,
} from 'lucide-react';
  
const renderOrderDetails = (order: Order) => {
  const { 
    activeOrders, 
    cancelOrder, transferOrder, mergeOrders, splitOrder, refundOrder,
    updateOrderItemStatus,
    tables
  } = useApp();
  const table = tables.find(t => t.id === order.tableId);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitItems, setSplitItems] = useState<{ uniqueId: string, quantity: number }[]>([]);
    
    return (
      <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col animate-in fade-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-slate-900 border-b border-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedOrderId(null)}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <X size={24} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">طلب #{order.orderNumber}</h2>
              <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString('ar-SA')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all">
              <Printer size={18} />
              طباعة الفاتورة
            </button>
            <button 
              onClick={() => setShowCancelPrompt(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
            >
              <XCircle size={18} />
              إلغاء الطلب
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Sub-Modals */}
          <AnimatePresence>
            {showCancelPrompt && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl"
                >
                  <h3 className="text-xl font-bold text-white mb-4">إلغاء الطلب</h3>
                  <p className="text-slate-400 text-sm mb-4">يرجى تحديد سبب إلغاء الطلب #{order.orderNumber}:</p>
                  <textarea 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="مثال: خطأ من الكاشير، الزبون ألغى الطلب..."
                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 min-h-[100px] mb-6"
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowCancelPrompt(false)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all"
                    >
                      تراجع
                    </button>
                    <button 
                      onClick={() => {
                        cancelOrder(order.id, cancelReason);
                        setShowCancelPrompt(false);
                        setSelectedOrderId(null);
                      }}
                      disabled={!cancelReason.trim()}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all"
                    >
                      تأكيد الإلغاء
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {showTransferModal && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl"
                >
                  <h3 className="text-xl font-bold text-white mb-4">تحويل الطاولة</h3>
                  <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2">
                    {tables.filter(t => t.status === 'AVAILABLE').map(t => (
                      <button 
                        key={t.id}
                        onClick={() => {
                          transferOrder(order.id, t.id);
                          setShowTransferModal(false);
                        }}
                        className="aspect-square bg-slate-800 hover:bg-emerald-500/20 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"
                      >
                        <span className="text-xs font-bold text-white group-hover:text-emerald-500">{t.name}</span>
                        <span className="text-[8px] text-slate-500">متاحة</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowTransferModal(false)}
                    className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all"
                  >
                    إغلاق
                  </button>
                </motion.div>
              </div>
            )}

            {showMergeModal && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl"
                >
                  <h3 className="text-xl font-bold text-white mb-4">دمج الطلبات</h3>
                  <p className="text-slate-400 text-sm mb-4">اختر الطلب الذي تريد دمج الطلب الحالي معه:</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {activeOrders.filter(o => o.id !== order.id && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELED).map(o => (
                      <button 
                        key={o.id}
                        onClick={() => {
                          mergeOrders(order.id, o.id);
                          setShowMergeModal(false);
                          setSelectedOrderId(null);
                        }}
                        className="w-full bg-slate-800 hover:bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between transition-all"
                      >
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">#{o.orderNumber}</p>
                          <p className="text-[10px] text-slate-500">{o.customerName || 'عميل نقدي'}</p>
                        </div>
                        <span className="text-sm font-bold text-emerald-500">${o.total.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowMergeModal(false)}
                    className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all"
                  >
                    إغلاق
                  </button>
                </motion.div>
              </div>
            )}

            {showSplitModal && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-2xl w-full shadow-2xl"
                >
                  <h3 className="text-xl font-bold text-white mb-4">تقسيم الفاتورة</h3>
                  <p className="text-slate-400 text-sm mb-4">اختر الأصناف التي تريد نقلها إلى فاتورة جديدة:</p>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {order.items.map((item) => {
                      const selected = splitItems.find(si => si.uniqueId === item.uniqueId);
                      return (
                        <div key={item.uniqueId} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => {
                                if (selected) {
                                  setSplitItems(splitItems.filter(si => si.uniqueId !== item.uniqueId));
                                } else {
                                  setSplitItems([...splitItems, { uniqueId: item.uniqueId, quantity: 1 }]);
                                }
                              }}
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                selected ? 'bg-red-500 border-red-500 text-white' : 'border-white/20'
                              }`}
                            >
                              {selected && <Check size={14} />}
                            </button>
                            <div>
                              <p className="text-sm font-bold text-white">{item.name}</p>
                              <p className="text-[10px] text-slate-500">${item.price.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {selected && (
                            <div className="flex items-center gap-3 bg-slate-900 px-3 py-1 rounded-lg border border-white/5">
                              <button 
                                onClick={() => {
                                  if (selected.quantity > 1) {
                                    setSplitItems(splitItems.map(si => si.uniqueId === item.uniqueId ? { ...si, quantity: si.quantity - 1 } : si));
                                  }
                                }}
                                className="text-slate-400 hover:text-white"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-sm font-bold text-white min-w-[20px] text-center">{selected.quantity}</span>
                              <button 
                                onClick={() => {
                                  if (selected.quantity < item.quantity) {
                                    setSplitItems(splitItems.map(si => si.uniqueId === item.uniqueId ? { ...si, quantity: si.quantity + 1 } : si));
                                  }
                                }}
                                className="text-slate-400 hover:text-white"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={() => {
                        setShowSplitModal(false);
                        setSplitItems([]);
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all"
                    >
                      إلغاء
                    </button>
                    <button 
                      onClick={() => {
                        splitOrder(order.id, splitItems);
                        setShowSplitModal(false);
                        setSplitItems([]);
                        setSelectedOrderId(null);
                      }}
                      disabled={splitItems.length === 0}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all"
                    >
                      تأكيد التقسيم
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Info & Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">النوع</p>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      order.type === OrderType.DINE_IN ? 'bg-blue-500/10 text-blue-500' :
                      order.type === OrderType.TAKEAWAY ? 'bg-orange-500/10 text-orange-500' :
                      'bg-purple-500/10 text-purple-500'
                    }`}>
                      <UtensilsCrossed size={16} />
                    </div>
                    <span className="font-bold text-white">{order.type}</span>
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">الطاولة</p>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                      <LayoutGrid size={16} />
                    </div>
                    <span className="font-bold text-white">{table?.name || '---'}</span>
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">الحالة</p>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      order.status === OrderStatus.COMPLETED ? 'bg-emerald-500/10 text-emerald-500' :
                      order.status === OrderStatus.CANCELED ? 'bg-red-500/10 text-red-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      <Clock size={16} />
                    </div>
                    <span className="font-bold text-white">{order.status}</span>
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">العميل</p>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                      <Users size={16} />
                    </div>
                    <span className="font-bold text-white truncate">{order.customerName || 'عميل نقدي'}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <ShoppingCart size={18} className="text-red-500" />
                    الأصناف المطلوبة
                  </h3>
                  <span className="text-xs text-slate-500">{order.items.length} أصناف</span>
                </div>
                <table className="w-full text-right">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-white/5">
                      <th className="p-4 font-medium">الصنف</th>
                      <th className="p-4 font-medium text-center">الكمية</th>
                      <th className="p-4 font-medium">السعر</th>
                      <th className="p-4 font-medium">الإجمالي</th>
                      <th className="p-4 font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="text-sm hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <p className="text-white font-medium">{item.name}</p>
                          {item.note && <p className="text-[10px] text-red-400 mt-1">*{item.note}</p>}
                        </td>
                        <td className="p-4 text-center font-bold text-white">{item.quantity}</td>
                        <td className="p-4 text-slate-400">${item.price.toFixed(2)}</td>
                        <td className="p-4 font-bold text-white">${(item.price * item.quantity).toFixed(2)}</td>
                        <td className="p-4">
                          <select 
                            value={item.status || OrderStatus.PREPARING}
                            onChange={(e) => updateOrderItemStatus(order.id, item.uniqueId, e.target.value as OrderStatus)}
                            className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                          >
                            <option value={OrderStatus.PREPARING}>قيد التحضير</option>
                            <option value={OrderStatus.READY}>جاهز</option>
                            <option value={OrderStatus.DELIVERED}>تم التسليم</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => setShowTransferModal(true)}
                  className="bg-slate-900 border border-white/5 p-4 rounded-2xl hover:bg-slate-800 transition-all text-center group"
                >
                  <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-500 group-hover:scale-110 transition-transform">
                    <Building2 size={20} />
                  </div>
                  <p className="text-sm font-bold text-white">تحويل</p>
                  <p className="text-[10px] text-slate-500">نقل الطاولة</p>
                </button>
                <button 
                  onClick={() => setShowMergeModal(true)}
                  className="bg-slate-900 border border-white/5 p-4 rounded-2xl hover:bg-slate-800 transition-all text-center group"
                >
                  <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-purple-500 group-hover:scale-110 transition-transform">
                    <Layers size={20} />
                  </div>
                  <p className="text-sm font-bold text-white">دمج</p>
                  <p className="text-[10px] text-slate-500">دمج الطلبات</p>
                </button>
                <button 
                  onClick={() => setShowSplitModal(true)}
                  className="bg-slate-900 border border-white/5 p-4 rounded-2xl hover:bg-slate-800 transition-all text-center group"
                >
                  <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-red-500 group-hover:scale-110 transition-transform">
                    <Scissors size={20} />
                  </div>
                  <p className="text-sm font-bold text-white">تقسيم</p>
                  <p className="text-[10px] text-slate-500">فصل الفاتورة</p>
                </button>
                <button 
                  onClick={() => {
                    const amount = prompt('أدخل مبلغ المرتجع:');
                    if (amount) refundOrder(order.id, parseFloat(amount),[]);
                  }}
                  className="bg-slate-900 border border-white/5 p-4 rounded-2xl hover:bg-slate-800 transition-all text-center group"
                >
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-500 group-hover:scale-110 transition-transform">
                    <DollarSign size={20} />
                  </div>
                  <p className="text-sm font-bold text-white">مرتجع</p>
                  <p className="text-[10px] text-slate-500">إرجاع مبلغ</p>
                </button>
              </div>
            </div>

            {/* Right Column: Summary & Timeline */}
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-red-500" />
                  ملخص الفاتورة
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">المجموع الفرعي</span>
                    <span className="text-white font-medium">${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">الضريبة (0%)</span>
                    <span className="text-white font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">الخصم</span>
                    <span className="text-red-500 font-medium">-${order.discount.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                    <span className="text-lg font-bold text-white">الإجمالي</span>
                    <span className="text-2xl font-black text-emerald-500">${order.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">طريقة الدفع</span>
                    <span className="text-xs font-bold text-white">{order.paymentMethod || 'لم يتم الدفع'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/10 rounded text-emerald-500">
                      <Wallet size={14} />
                    </div>
                    <span className="text-[10px] text-slate-500">تم الدفع بواسطة الكاشير: أحمد</span>
                  </div>
                </div>
              </div>

              {/* Timeline Card */}
              <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                  <History size={18} className="text-red-500" />
                  تتبع الطلب
                </h3>
                <div className="space-y-6 relative before:absolute before:right-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
                  {order.timeline.map((event, idx) => (
                    <div key={idx} className="relative pr-8">
                      <div className={`absolute right-0 top-1 w-6 h-6 rounded-full border-4 border-slate-900 flex items-center justify-center z-10 ${
                        idx === 0 ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{event.status}</p>
                        <p className="text-[10px] text-slate-500">{new Date(event.time).toLocaleTimeString('ar-SA')}</p>
                        {event.note && <p className="text-[10px] text-red-400 mt-1">{event.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

const OrdersPage = () => {
  const { activeOrders } = useApp();
  const [orderTab, setOrderTab] = useState<'ACTIVE' | 'PREPARING' | 'READY' | 'CLOSED' | 'CANCELED'>('ACTIVE');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderFilters, setOrderFilters] = useState({
    type: 'all',
    cashierId: 'all',
    dateRange: 'today'
  });
  const [showOrderFilters, setShowOrderFilters] = useState(false);
  const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);

  const filteredOrders = useMemo(() => {
    return activeOrders.filter(order => {
      // Tab filtering
      const matchesTab = 
        orderTab === 'ACTIVE' ? (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELED) :
        orderTab === 'PREPARING' ? order.status === OrderStatus.PREPARING :
        orderTab === 'READY' ? order.status === OrderStatus.READY :
        orderTab === 'CLOSED' ? order.status === OrderStatus.COMPLETED :
        order.status === OrderStatus.CANCELED;

      // Search filtering
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        (order.customerName || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        (order.customerPhone || '').includes(orderSearchQuery);

      // Advanced filters
      const matchesType = orderFilters.type === 'all' || order.type === orderFilters.type;
      
      return matchesTab && matchesSearch && matchesType;
    });
  }, [activeOrders, orderTab, orderSearchQuery, orderFilters]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {selectedOrder && renderOrderDetails(selectedOrder)}

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'ACTIVE', label: 'الطلبات النشطة', icon: Activity, color: 'blue' },
            { id: 'PREPARING', label: 'قيد التحضير', icon: Flame, color: 'orange' },
            { id: 'READY', label: 'جاهزة للاستلام', icon: CheckCircle2, color: 'emerald' },
            { id: 'CLOSED', label: 'طلبات مغلقة', icon: Archive, color: 'slate' },
            { id: 'CANCELED', label: 'طلبات ملغاة', icon: XCircleIcon, color: 'red' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setOrderTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                orderTab === tab.id 
                  ? `bg-${tab.color}-500/10 border-${tab.color}-500/50 text-${tab.color}-500 shadow-lg shadow-${tab.color}-500/10` 
                  : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                orderTab === tab.id ? `bg-${tab.color}-500/20` : 'bg-slate-800'
              }`}>
                {activeOrders.filter(o => {
                  if (tab.id === 'ACTIVE') return o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELED;
                  if (tab.id === 'PREPARING') return o.status === OrderStatus.PREPARING;
                  if (tab.id === 'READY') return o.status === OrderStatus.READY;
                  if (tab.id === 'CLOSED') return o.status === OrderStatus.COMPLETED;
                  return o.status === OrderStatus.CANCELED;
                }).length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              placeholder="البحث برقم الطلب، اسم العميل، أو رقم الهاتف..." 
              className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={() => setShowOrderFilters(!showOrderFilters)}
              className={`flex-1 md:flex-none border px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                showOrderFilters ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-900 border-white/5 text-white hover:bg-slate-800'
              }`}
            >
              <Filter size={18} />
              تصفية
            </button>
            <button className="flex-1 md:flex-none bg-slate-900 border border-white/5 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:bg-slate-800 transition-all">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Advanced Order Filters */}
        <AnimatePresence>
          {showOrderFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase mb-1 block">نوع الطلب</label>
                  <select 
                    value={orderFilters.type}
                    onChange={(e) => setOrderFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="all">الكل</option>
                    <option value={OrderType.DINE_IN}>محلي</option>
                    <option value={OrderType.TAKEAWAY}>سفري</option>
                    <option value={OrderType.DELIVERY}>توصيل</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase mb-1 block">التاريخ</label>
                  <select 
                    value={orderFilters.dateRange}
                    onChange={(e) => setOrderFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="today">اليوم</option>
                    <option value="yesterday">أمس</option>
                    <option value="week">هذا الأسبوع</option>
                    <option value="month">هذا الشهر</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      setOrderSearchQuery('');
                      setOrderFilters({ type: 'all', cashierId: 'all', dateRange: 'today' });
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  >
                    إعادة تعيين
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-slate-500 text-sm border-b border-white/5">
                  <th className="p-4 font-medium">رقم الطلب</th>
                  <th className="p-4 font-medium">العميل</th>
                  <th className="p-4 font-medium">النوع</th>
                  <th className="p-4 font-medium">الحالة</th>
                  <th className="p-4 font-medium">الإجمالي</th>
                  <th className="p-4 font-medium">التاريخ والوقت</th>
                  <th className="p-4 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map(order => (
                  <tr 
                    key={order.id} 
                    onClick={() => setSelectedOrderId(order.id)}
                    className="text-sm hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          order.status === OrderStatus.PREPARING ? 'bg-orange-500 animate-pulse' :
                          order.status === OrderStatus.READY ? 'bg-emerald-500' :
                          order.status === OrderStatus.DELIVERED ? 'bg-blue-500' :
                          'bg-slate-500'
                        }`} />
                        <span className="font-bold text-white">#{order.orderNumber}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-white font-medium">{order.customerName || 'عميل نقدي'}</p>
                      <p className="text-[10px] text-slate-500">{order.customerPhone || '---'}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        order.type === OrderType.DINE_IN ? 'bg-blue-500/10 text-blue-500' :
                        order.type === OrderType.TAKEAWAY ? 'bg-orange-500/10 text-orange-500' :
                        'bg-purple-500/10 text-purple-500'
                      }`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${
                        order.status === OrderStatus.COMPLETED ? 'text-emerald-500' :
                        order.status === OrderStatus.CANCELED ? 'text-red-500' :
                        order.status === OrderStatus.READY ? 'text-emerald-500' :
                        order.status === OrderStatus.PREPARING ? 'text-orange-500' :
                        'text-blue-500'
                      }`}>
                        {order.status === OrderStatus.COMPLETED ? <CheckCircle2 size={12} /> :
                         order.status === OrderStatus.CANCELED ? <XCircle size={12} /> :
                         order.status === OrderStatus.READY ? <CheckCircle2 size={12} /> :
                         order.status === OrderStatus.PREPARING ? <Flame size={12} /> :
                         <Clock size={12} />}
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-white">${order.total.toFixed(2)}</td>
                    <td className="p-4">
                      <p className="text-slate-300">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
                      <p className="text-[10px] text-slate-500">{new Date(order.createdAt).toLocaleTimeString('ar-SA')}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); }}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); }}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
};

export default OrdersPage;