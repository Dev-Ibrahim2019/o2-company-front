
import React, { useState, useMemo } from 'react';
import { 
  Search, UserPlus, Filter, MoreVertical, Edit2, Trash2, Eye, 
  History, Star, MapPin, Phone, Mail, Calendar, CreditCard, 
  ShieldAlert, ShieldCheck, TrendingUp, ShoppingBag, DollarSign,
  Plus, X, Save, CheckCircle2, AlertCircle, Award, Map,
  MessageSquare, UserCheck, UserX, ArrowRight, ArrowLeft,
  Info, LayoutGrid, Grid, List, Clock, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../../store';
import type { Customer, CustomerAddress } from '../../../types';
import { CustomerType, OrderStatus } from '../../../types';
interface CustomerManagementProps {
  initialType?: CustomerType;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ initialType }) => {
  const { 
    customers, activeOrders, addCustomer, updateCustomer, deleteCustomer,
    addCustomerAddress, removeCustomerAddress, toggleBlockCustomer,
    adjustCustomerPoints, adjustCustomerBalance
  } = useApp();

  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<CustomerType | 'ALL'>(initialType || 'ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'ADDRESSES' | 'LOYALTY' | 'NOTES'>('OVERVIEW');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || c.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [customers, searchQuery, filterType]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const customerOrders = useMemo(() => {
    if (!selectedCustomerId) return [];
    // In a real app, we would fetch all orders for this customer.
    // For now, we'll filter activeOrders and maybe some mock historical orders.
    return activeOrders.filter(o => o.customerId === selectedCustomerId);
  }, [activeOrders, selectedCustomerId]);

  const stats = useMemo(() => {
    if (!selectedCustomer) return null;
    return {
      totalOrders: selectedCustomer.ordersCount,
      totalSpent: selectedCustomer.totalSpent,
      avgOrder: selectedCustomer.ordersCount > 0 ? selectedCustomer.totalSpent / selectedCustomer.ordersCount : 0,
      points: selectedCustomer.points,
      balance: selectedCustomer.balance
    };
  }, [selectedCustomer]);

  const renderAddEditModal = () => {
    if (!showAddModal) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const customerData = {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        type: formData.get('type') as CustomerType,
        allowCredit: formData.get('allowCredit') === 'on',
        notes: formData.get('notes') as string,
      };

      if (editingCustomer) {
        updateCustomer(editingCustomer.id, customerData);
      } else {
        addCustomer(customerData);
      }
      setShowAddModal(false);
      setEditingCustomer(null);
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
            </h2>
            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">الاسم الكامل</label>
                <input 
                  name="name"
                  defaultValue={editingCustomer?.name}
                  required
                  className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">رقم الهاتف</label>
                <input 
                  name="phone"
                  defaultValue={editingCustomer?.phone}
                  required
                  className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">البريد الإلكتروني</label>
                <input 
                  name="email"
                  type="email"
                  defaultValue={editingCustomer?.email}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">تصنيف العميل</label>
                <select 
                  name="type"
                  defaultValue={editingCustomer?.type || CustomerType.REGULAR}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50"
                >
                  <option value={CustomerType.REGULAR}>عميل عادي</option>
                  <option value={CustomerType.LOYAL}>عميل دائم</option>
                  <option value={CustomerType.VIP}>VIP</option>
                  <option value={CustomerType.COMPANY}>شركة</option>
                  <option value={CustomerType.EMPLOYEE}>موظف</option>
                  <option value={CustomerType.SUPPLIER}>مورد</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-2xl border border-white/5">
              <input 
                type="checkbox" 
                name="allowCredit"
                id="allowCredit"
                defaultChecked={editingCustomer?.allowCredit}
                className="w-5 h-5 rounded border-white/10 bg-slate-700 text-red-600 focus:ring-red-500/50"
              />
              <label htmlFor="allowCredit" className="text-sm text-white font-medium">السماح بالدفع الآجل (فتح حساب)</label>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">ملاحظات</label>
              <textarea 
                name="notes"
                defaultValue={editingCustomer?.notes}
                className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 h-24 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {editingCustomer ? 'حفظ التغييرات' : 'إضافة العميل'}
              </button>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  const renderProfile = () => {
    if (!selectedCustomer) return null;

    return (
      <div className="fixed inset-0 z-[90] bg-slate-950 flex flex-col animate-in fade-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-slate-900 border-b border-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedCustomerId(null)}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <ArrowRight size={24} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 text-xl font-bold">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedCustomer.name}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{selectedCustomer.phone}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedCustomer.type === CustomerType.VIP ? 'bg-amber-500/20 text-amber-500' :
                    selectedCustomer.type === CustomerType.COMPANY ? 'bg-blue-500/20 text-blue-500' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {selectedCustomer.type}
                  </span>
                  {selectedCustomer.isBlocked && (
                    <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-[10px] font-bold">محظور</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEditingCustomer(selectedCustomer);
                setShowAddModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
            >
              <Edit2 size={18} />
              تعديل
            </button>
            <button 
              onClick={() => toggleBlockCustomer(selectedCustomer.id)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all ${
                selectedCustomer.isBlocked 
                  ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                  : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
              }`}
            >
              {selectedCustomer.isBlocked ? <UserCheck size={18} /> : <UserX size={18} />}
              {selectedCustomer.isBlocked ? 'إلغاء الحظر' : 'حظر العميل'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-slate-900 border-b border-white/5 px-6 flex gap-8">
          {(['OVERVIEW', 'ORDERS', 'ADDRESSES', 'LOYALTY', 'NOTES'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-bold transition-all relative ${
                activeTab === tab ? 'text-red-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'OVERVIEW' && 'نظرة عامة'}
              {tab === 'ORDERS' && 'سجل الطلبات'}
              {tab === 'ADDRESSES' && 'العناوين'}
              {tab === 'LOYALTY' && 'نظام النقاط'}
              {tab === 'NOTES' && 'الملاحظات'}
              {activeTab === tab && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Stats & Info */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-red-500" />
                  إحصائيات العميل
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">إجمالي الطلبات</p>
                    <p className="text-xl font-black text-white">{stats?.totalOrders}</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">إجمالي الإنفاق</p>
                    <p className="text-xl font-black text-emerald-500">₪{stats?.totalSpent}</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">متوسط الطلب</p>
                    <p className="text-xl font-black text-blue-500">₪{stats?.avgOrder.toFixed(0)}</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">النقاط</p>
                    <p className="text-xl font-black text-amber-500">{stats?.points}</p>
                  </div>
                </div>
                {selectedCustomer.allowCredit && (
                  <div className="mt-4 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-red-500 uppercase font-bold">الرصيد الحالي (دين)</p>
                      <p className="text-xl font-black text-red-500">₪{selectedCustomer.balance}</p>
                    </div>
                    <button 
                      onClick={() => adjustCustomerBalance(selectedCustomer.id, -selectedCustomer.balance)}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                    >
                      تسديد
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Info size={18} className="text-red-500" />
                  معلومات التواصل
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      <Phone size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">رقم الهاتف</p>
                      <p className="text-sm text-white font-medium">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      <Mail size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">البريد الإلكتروني</p>
                      <p className="text-sm text-white font-medium">{selectedCustomer.email || 'غير متوفر'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      <Calendar size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">تاريخ التسجيل</p>
                      <p className="text-sm text-white font-medium">{new Date(selectedCustomer.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Tab Content */}
            <div className="lg:col-span-2 space-y-6">
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Star size={18} className="text-red-500" />
                      تقييم العميل
                    </h4>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star} 
                          size={24} 
                          className={star <= selectedCustomer.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-700'} 
                        />
                      ))}
                      <span className="mr-4 text-xl font-bold text-white">{selectedCustomer.rating}/5</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <History size={18} className="text-red-500" />
                      آخر الطلبات
                    </h4>
                    <div className="space-y-3">
                      {customerOrders.length > 0 ? customerOrders.slice(0, 3).map(order => (
                        <div key={order.id} className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-white">
                              <ShoppingBag size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">طلب #{order.orderNumber}</p>
                              <p className="text-[10px] text-slate-500">{new Date(order.createdAt).toLocaleString('ar-SA')}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-emerald-500">₪{order.total}</p>
                            <p className="text-[10px] text-slate-500">{order.type}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8">
                          <ShoppingBag size={48} className="mx-auto text-slate-800 mb-4" />
                          <p className="text-slate-500">لا توجد طلبات سابقة</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ORDERS' && (
                <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden">
                  <div className="p-6 border-b border-white/5">
                    <h4 className="font-bold text-white">سجل الطلبات الكامل</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                          <th className="px-6 py-4 font-medium">رقم الطلب</th>
                          <th className="px-6 py-4 font-medium">التاريخ</th>
                          <th className="px-6 py-4 font-medium">النوع</th>
                          <th className="px-6 py-4 font-medium">الحالة</th>
                          <th className="px-6 py-4 font-medium">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {customerOrders.map(order => (
                          <tr key={order.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-white">#{order.orderNumber}</td>
                            <td className="px-6 py-4 text-sm text-slate-400">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</td>
                            <td className="px-6 py-4 text-sm text-slate-400">{order.type}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                order.status === OrderStatus.COMPLETED ? 'bg-emerald-500/20 text-emerald-500' :
                                order.status === OrderStatus.CANCELED ? 'bg-red-500/20 text-red-500' :
                                'bg-blue-500/20 text-blue-500'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-emerald-500">₪{order.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'ADDRESSES' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white">عناوين التوصيل</h4>
                    <button 
                      onClick={() => {
                        const label = prompt('تسمية العنوان (مثلاً: المنزل، العمل):');
                        if (label) {
                          addCustomerAddress(selectedCustomer.id, {
                            label,
                            city: 'نابلس',
                            district: '',
                            street: ''
                          });
                        }
                      }}
                      className="text-red-500 hover:text-red-400 text-sm font-bold flex items-center gap-1"
                    >
                      <Plus size={16} />
                      إضافة عنوان جديد
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCustomer.addresses.map(addr => (
                      <div key={addr.id} className="bg-slate-900 border border-white/5 rounded-2xl p-4 relative group">
                        <div className="flex items-center gap-3 mb-2">
                          <MapPin size={18} className="text-red-500" />
                          <h5 className="font-bold text-white">{addr.label}</h5>
                        </div>
                        <p className="text-sm text-slate-400">{addr.city}, {addr.district}, {addr.street}</p>
                        <button 
                          onClick={() => removeCustomerAddress(selectedCustomer.id, addr.id)}
                          className="absolute top-4 left-4 p-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'LOYALTY' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                    <Award size={64} className="mx-auto text-amber-500 mb-4" />
                    <h3 className="text-2xl font-black text-white mb-2">نظام الولاء والمكافآت</h3>
                    <p className="text-slate-400 mb-6">كل 1 شيكل = 1 نقطة. استبدل نقاطك بوجبات مجانية!</p>
                    
                    <div className="max-w-xs mx-auto bg-slate-800 p-6 rounded-3xl border border-white/10">
                      <p className="text-sm text-slate-500 uppercase font-bold mb-1">رصيد النقاط الحالي</p>
                      <p className="text-4xl font-black text-amber-500">{selectedCustomer.points}</p>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-xs font-bold text-white mb-2">500 نقطة</p>
                        <p className="text-[10px] text-slate-500">وجبة شاورما مجانية</p>
                        <button className="mt-3 w-full bg-slate-700 text-slate-400 py-1.5 rounded-lg text-[10px] font-bold cursor-not-allowed">غير متاح</button>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-xs font-bold text-white mb-2">1000 نقطة</p>
                        <p className="text-[10px] text-slate-500">وجبة عائلية مجانية</p>
                        <button className="mt-3 w-full bg-slate-700 text-slate-400 py-1.5 rounded-lg text-[10px] font-bold cursor-not-allowed">غير متاح</button>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-xs font-bold text-white mb-2">خصم 20%</p>
                        <p className="text-[10px] text-slate-500">على الطلب القادم</p>
                        <button className="mt-3 w-full bg-amber-500 text-white py-1.5 rounded-lg text-[10px] font-bold">استبدال</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'NOTES' && (
                <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-white">ملاحظات وتفضيلات العميل</h4>
                    <button className="text-red-500 hover:text-red-400 text-sm font-bold">تعديل</button>
                  </div>
                  <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 min-h-[200px]">
                    <p className="text-slate-300 leading-relaxed">
                      {selectedCustomer.notes || 'لا توجد ملاحظات مسجلة لهذا العميل.'}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <AlertCircle size={14} />
                    <span>هذه الملاحظات تظهر للكاشير والقرصون عند اختيار العميل.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="البحث بالاسم، الهاتف، أو الرقم..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
            />
          </div>
          <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1">
            <button 
              onClick={() => setViewMode('GRID')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-red-500 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('TABLE')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'TABLE' ? 'bg-red-500 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <Filter size={18} />
            </button>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setShowAddModal(true);
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-red-900/20"
        >
          <UserPlus size={18} />
          إضافة عميل جديد
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['ALL', ...Object.values(CustomerType)] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
              filterType === type 
                ? 'bg-red-500/10 border-red-500 text-red-500' 
                : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/20'
            }`}
          >
            {type === 'ALL' ? 'الكل' : type}
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => (
            <motion.div 
              layout
              key={customer.id} 
              className={`bg-slate-900/50 border rounded-2xl p-6 hover:border-red-500/30 transition-all group relative overflow-hidden ${
                customer.isBlocked ? 'border-red-500/20 grayscale opacity-70' : 'border-white/5'
              }`}
            >
              {customer.type === CustomerType.VIP && (
                <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden">
                  <div className="bg-amber-500 text-white text-[8px] font-black py-1 w-32 text-center -rotate-45 -translate-x-10 translate-y-4 shadow-lg">
                    VIP CUSTOMER
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-white font-bold text-2xl">
                  {customer.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate group-hover:text-red-500 transition-colors">{customer.name}</h3>
                  <p className="text-sm text-slate-500">{customer.phone}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingCustomer(customer);
                      setShowAddModal(true);
                    }}
                    className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
                <div className="bg-slate-800/50 rounded-xl p-2 text-center border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase">النقاط</p>
                  <p className="text-sm font-bold text-amber-500">{customer.points}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-2 text-center border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase">الطلبات</p>
                  <p className="text-sm font-bold text-white">{customer.ordersCount}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-2 text-center border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase">الإنفاق</p>
                  <p className="text-sm font-bold text-emerald-500">₪{customer.totalSpent}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-2">
                  <History size={14} className="text-slate-500" />
                  <span className="text-[10px] text-slate-400">
                    آخر زيارة: {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('ar-SA') : 'لا يوجد'}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className="text-[10px] text-red-500 font-bold hover:underline"
                >
                  عرض الملف الشخصي
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                <th className="px-6 py-4 font-medium">العميل</th>
                <th className="px-6 py-4 font-medium">الهاتف</th>
                <th className="px-6 py-4 font-medium">النوع</th>
                <th className="px-6 py-4 font-medium">الطلبات</th>
                <th className="px-6 py-4 font-medium">الإنفاق</th>
                <th className="px-6 py-4 font-medium">آخر زيارة</th>
                <th className="px-6 py-4 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className={`hover:bg-white/5 transition-colors ${customer.isBlocked ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold text-xs">
                        {customer.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-white">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{customer.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      customer.type === CustomerType.VIP ? 'bg-amber-500/20 text-amber-500' :
                      customer.type === CustomerType.COMPANY ? 'bg-blue-500/20 text-blue-500' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {customer.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{customer.ordersCount}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-500">₪{customer.totalSpent}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('ar-SA') : 'أمس'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedCustomerId(customer.id)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => { setEditingCustomer(customer); setShowAddModal(true); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => toggleBlockCustomer(customer.id)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                        {customer.isBlocked ? <UserCheck size={16} /> : <UserX size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {renderAddEditModal()}
      {renderProfile()}
    </div>
  );
};

export default CustomerManagement;
