
import { useState } from 'react';
import { useApp } from '../../../../store';
import {  
  Package, 
  Search,
  Plus,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Monitor,
  ChefHat,
  Star,
  Leaf,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MenuPage = () => {
    const { 
    menuItems,  
    departments,
    deleteMenuItem
  } = useApp();

  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuFilters, setMenuFilters] = useState({
    departmentId: 'all',
    status: 'all',
    popular: false,
    chefRecommended: false,
    seasonal: false
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [modalType, setModalType] = useState<'DEPARTMENT' | 'MENU_ITEM' | 'EMPLOYEE' | 'CUSTOMER' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = (type: 'DEPARTMENT' | 'MENU_ITEM' | 'EMPLOYEE' | 'CUSTOMER', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

    const stats = {
      total: menuItems.length,
      available: menuItems.filter(i => i.status === 'AVAILABLE').length,
      outOfStock: menuItems.filter(i => i.status === 'OUT_OF_STOCK').length,
      popular: menuItems.filter(i => i.popular).length,
    };

    const filteredMenuItems = menuItems.filter(item => {
      const matchesSearch = 
        item.nameAr.toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
        item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
        item.code?.toLowerCase().includes(menuSearchQuery.toLowerCase());
      
      const matchesDept = menuFilters.departmentId === 'all' || item.departmentId === menuFilters.departmentId;
      const matchesStatus = menuFilters.status === 'all' || item.status === menuFilters.status;
      const matchesPopular = !menuFilters.popular || item.popular;
      const matchesChef = !menuFilters.chefRecommended || item.chefRecommended;
      const matchesSeasonal = !menuFilters.seasonal || item.seasonal;

      return matchesSearch && matchesDept && matchesStatus && matchesPopular && matchesChef && matchesSeasonal;
    });

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <Package size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">إجمالي الأصناف</p>
                <p className="text-xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">متوفر حالياً</p>
                <p className="text-xl font-bold text-white">{stats.available}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">نفذت الكمية</p>
                <p className="text-xl font-bold text-white">{stats.outOfStock}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <Star size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">الأكثر مبيعاً</p>
                <p className="text-xl font-bold text-white">{stats.popular}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="البحث عن صنف بالاسم أو الكود..." 
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="hidden md:block px-3 py-1 bg-slate-800 rounded-full border border-white/5">
                <span className="text-[10px] font-bold text-slate-400">نتائج البحث: {filteredMenuItems.length}</span>
              </div>
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex-1 md:flex-none border px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  showAdvancedFilters 
                    ? 'bg-red-600/10 border-red-600/50 text-red-500' 
                    : 'bg-slate-900 border-white/5 text-white hover:bg-slate-800'
                }`}
              >
                <Filter size={18} />
                تصفية متقدمة
              </button>
              <button 
                onClick={() => openModal('MENU_ITEM')}
                className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-lg shadow-red-900/20"
              >
                <Plus size={18} />
                إضافة صنف جديد
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">القسم</label>
                    <select 
                      value={menuFilters.departmentId}
                      onChange={(e) => setMenuFilters(prev => ({ ...prev, departmentId: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="all">الكل</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">الحالة</label>
                    <select 
                      value={menuFilters.status}
                      onChange={(e) => setMenuFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="all">الكل</option>
                      <option value="AVAILABLE">متوفر</option>
                      <option value="UNAVAILABLE">غير متوفر</option>
                      <option value="OUT_OF_STOCK">نفذت الكمية</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                      menuFilters.popular ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : 'bg-slate-800 border-white/5 text-slate-400'
                    }`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={menuFilters.popular}
                        onChange={(e) => setMenuFilters(prev => ({ ...prev, popular: e.target.checked }))}
                      />
                      <Star size={14} />
                      <span className="text-[10px] font-bold">الأكثر مبيعاً</span>
                    </label>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                      menuFilters.chefRecommended ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-slate-800 border-white/5 text-slate-400'
                    }`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={menuFilters.chefRecommended}
                        onChange={(e) => setMenuFilters(prev => ({ ...prev, chefRecommended: e.target.checked }))}
                      />
                      <ChefHat size={14} />
                      <span className="text-[10px] font-bold">توصية الشيف</span>
                    </label>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                      menuFilters.seasonal ? 'bg-blue-500/10 border-blue-500/50 text-blue-500' : 'bg-slate-800 border-white/5 text-slate-400'
                    }`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={menuFilters.seasonal}
                        onChange={(e) => setMenuFilters(prev => ({ ...prev, seasonal: e.target.checked }))}
                      />
                      <Leaf size={14} />
                      <span className="text-[10px] font-bold">موسمي</span>
                    </label>
                  </div>
                  <div className="flex items-end gap-2">
                    <button 
                      onClick={() => {
                        setMenuSearchQuery('');
                        setMenuFilters({
                          departmentId: 'all',
                          status: 'all',
                          popular: false,
                          chefRecommended: false,
                          seasonal: false
                        });
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-bold transition-all"
                    >
                      إعادة تعيين
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-white/5">
                  <th className="p-4 font-bold">الصنف والمعلومات</th>
                  <th className="p-4 font-bold">القسم</th>
                  <th className="p-4 font-bold">التسعير</th>
                  <th className="p-4 font-bold">العمليات</th>
                  <th className="p-4 font-bold">الأداء</th>
                  <th className="p-4 font-bold">الحالة</th>
                  <th className="p-4 font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMenuItems.map(item => (
                  <tr key={item.id} className="text-sm hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/5 relative">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          {item.popular && (
                            <div className="absolute top-0 right-0 p-0.5 bg-orange-500 text-white rounded-bl-lg">
                              <Star size={8} fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white">{item.nameAr || item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Tag size={10} />
                              {item.code || `IT-${item.id.slice(-4)}`}
                            </span>
                            {item.chefRecommended && (
                              <span className="text-[8px] bg-red-500/10 text-red-500 px-1 rounded flex items-center gap-0.5">
                                <ChefHat size={8} />
                                توصية
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium">
                          {departments.find(d => d.id === item.departmentId)?.nameAr || 'غير محدد'}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.category}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">${item.price.toFixed(2)}</span>
                        {item.offerPrice && (
                          <span className="text-[10px] text-emerald-500 line-through opacity-50">${item.offerPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock size={12} />
                          {item.prepTime} دقيقة
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Monitor size={12} />
                          {item.requiresKitchen ? 'مطبخ' : 'مباشر'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold">{item.stats?.salesCount || 0} مبيعات</span>
                        <span className="text-[10px] text-slate-500">${(item.stats?.totalRevenue || 0).toLocaleString()} إيراد</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        item.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500' : 
                        item.status === 'OUT_OF_STOCK' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {item.status === 'AVAILABLE' ? 'متوفر' : 
                         item.status === 'OUT_OF_STOCK' ? 'نفذ' : 'غير متاح'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openModal('MENU_ITEM', item)}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteMenuItem(item.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={16} />
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

  export default MenuPage;