import { useState } from 'react';
import { useApp } from '../../../store';
import { 
  TrendingUp, 
  Package, 
  Layers, 
  Search,
  Plus,
  Clock,
  AlertCircle,
  Edit2,
  Trash2,
  Printer,
  Users2,
  Map,
  Monitor,
  Zap,
  LayoutGrid,
  EyeOff,
  Activity,
  ChefHat,
} from 'lucide-react';
import { OrderStatus } from '../../../types';

const DepartmentsPage = () => {
  const { 
    activeOrders, 
    menuItems, 
    employees, 
    departments, 
    deleteDepartment,
  } = useApp();

  const [deptSubView, setDeptSubView] = useState('LIST');
  const [modalType, setModalType] = useState<'DEPARTMENT' | 'MENU_ITEM' | 'EMPLOYEE' | 'CUSTOMER' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const openModal = (type: 'DEPARTMENT' | 'MENU_ITEM' | 'EMPLOYEE' | 'CUSTOMER', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900 border border-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setDeptSubView('LIST')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${deptSubView === 'LIST' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutGrid size={18} />
            قائمة الأقسام
          </button>
          <button 
            onClick={() => setDeptSubView('MAP')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${deptSubView === 'MAP' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-400 hover:text-white'}`}
          >
            <Map size={18} />
            خريطة المطبخ
          </button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="البحث عن قسم..." 
              className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
            />
          </div>
          <button 
            onClick={() => openModal('DEPARTMENT')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all shadow-lg shadow-red-900/20 whitespace-nowrap"
          >
            <Plus size={18} />
            إضافة قسم
          </button>
        </div>
      </div>

      <div>
        {deptSubView === 'LIST' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => {
            const deptItems = menuItems.filter(item => item.departmentId === dept.id);
            const activeDeptOrders = activeOrders.filter(o => o.items.some(i => i.departmentId === dept.id) && o.status !== OrderStatus.COMPLETED);
            
            return (
              <div key={dept.id} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 hover:border-red-500/30 transition-all group relative overflow-hidden">
                {/* Status Indicator */}
                <div className="absolute top-0 right-0 w-1.5 h-full" style={{ backgroundColor: dept.color || '#ef4444' }}></div>
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner"
                      style={{ backgroundColor: `${dept.color || '#ef4444'}15`, color: dept.color || '#ef4444' }}
                    >
                      {dept.icon || <Layers size={24} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{dept.nameAr || dept.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{dept.shortName || dept.id.slice(0, 3).toUpperCase()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{dept.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openModal('DEPARTMENT', dept)}
                      className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteDepartment(dept.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-slate-500 mb-1">الموقع / المحطة</p>
                    <div className="flex items-center gap-2">
                      <Map size={14} className="text-red-500" />
                      <span className="text-sm font-bold text-white">{dept.location || `Station ${dept.stationNumber || '?'}`}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-slate-500 mb-1">وقت التحضير</p>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-emerald-500" />
                      <span className="text-sm font-bold text-white">{dept.defaultPrepTime || 0} دقيقة</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Package size={12} />
                      الأصناف
                    </span>
                    <span className="text-white font-bold">{deptItems.length} صنف</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Activity size={12} />
                      طلبات نشطة
                    </span>
                    <span className="text-blue-500 font-bold">{activeDeptOrders.length} طلب</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Users2 size={12} />
                      الموظفين
                    </span>
                    <span className="text-white font-bold">{employees.filter(e => e.departmentId === dept.id).length} موظف</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <TrendingUp size={12} />
                      الأكثر مبيعاً
                    </span>
                    <span className="text-emerald-500 font-bold">بيتزا مارغريتا</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Zap size={12} />
                      الطاقة الاستيعابية
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            (activeDeptOrders.length / (dept.maxConcurrentOrders || 10)) > 0.8 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (activeDeptOrders.length / (dept.maxConcurrentOrders || 10)) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-400">{activeDeptOrders.length}/{dept.maxConcurrentOrders || 10}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {dept.hasKds ? (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                        <Monitor size={10} />
                        KDS نشط
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-500/10 px-2 py-1 rounded-lg">
                        <EyeOff size={10} />
                        بدون شاشة
                      </div>
                    )}
                    {dept.autoPrintTicket && (
                      <div className="p-1 bg-blue-500/10 text-blue-500 rounded-lg" title="طباعة تلقائية">
                        <Printer size={12} />
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    dept.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 
                    dept.status === 'BUSY' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-slate-500/10 text-slate-500'
                  }`}>
                    {dept.status === 'ACTIVE' ? 'نشط' : dept.status === 'BUSY' ? 'مزدحم' : 'معطل'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 min-h-[600px] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-white">تخطيط محطات العمل (Kitchen Map)</h3>
                <p className="text-sm text-slate-500">توزيع الأقسام داخل المطبخ الرئيسي ومراقبة الحالة</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-slate-400">نشط</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-slate-400">مزدحم</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                  <span className="text-slate-400">معطل</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">إجمالي الأقسام</p>
                <p className="text-2xl font-black text-white">{departments.length}</p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                <p className="text-[10px] text-emerald-500 uppercase font-bold mb-1">أقسام نشطة</p>
                <p className="text-2xl font-black text-white">{departments.filter(d => d.status === 'ACTIVE').length}</p>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4">
                <p className="text-[10px] text-orange-500 uppercase font-bold mb-1">أقسام مزدحمة</p>
                <p className="text-2xl font-black text-white">{departments.filter(d => d.status === 'BUSY').length}</p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
                <p className="text-[10px] text-blue-500 uppercase font-bold mb-1">إجمالي الطلبات</p>
                <p className="text-2xl font-black text-white">{activeOrders.length}</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Kitchen Entrance / Aggregator Area */}
              <div className="sm:col-span-2 lg:col-span-4 bg-slate-800/40 border border-dashed border-white/10 rounded-2xl flex items-center justify-center p-8 relative group">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2">
                    <ChefHat size={24} />
                  </div>
                  <p className="text-sm font-bold text-white uppercase tracking-widest">منطقة تجميع الطلبات (Aggregator Area)</p>
                  <p className="text-[10px] text-slate-500">نقطة خروج الطلبات النهائية وتجميع الوجبات</p>
                </div>
              </div>

              {/* Stations */}
              {[1, 2, 3, 4, 5, 6, 7, 8].map(stationNum => {
                const dept = departments.find(d => d.stationNumber === stationNum.toString());
                const activeDeptOrders = dept ? activeOrders.filter(o => o.items.some(i => i.departmentId === dept.id) && o.status !== OrderStatus.COMPLETED) : [];
                
                return (
                  <div 
                    key={stationNum}
                    className={`relative rounded-3xl border-2 transition-all flex flex-col items-center justify-center p-6 min-h-[200px] cursor-pointer group ${
                      dept 
                        ? (dept.status === 'ACTIVE' ? 'bg-slate-800/80 border-white/10 hover:border-red-500/50' : 
                           dept.status === 'BUSY' ? 'bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50' : 
                           'bg-slate-900/80 border-white/5 opacity-50')
                        : 'bg-slate-900/40 border-dashed border-white/5 hover:bg-slate-800/40'
                    }`}
                    onClick={() => dept && openModal('DEPARTMENT', dept)}
                  >
                    <div className="absolute top-3 left-3 text-[10px] font-bold text-slate-600 tracking-widest">STATION {stationNum}</div>
                    
                    {dept ? (
                      <>
                        <div 
                          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-lg group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: `${dept.color || '#ef4444'}20`, color: dept.color || '#ef4444' }}
                        >
                          {dept.icon || <Layers size={32} />}
                        </div>
                        <div className="text-center">
                          <h4 className="text-sm font-bold text-white">{dept.nameAr || dept.name}</h4>
                          <div className="mt-2 flex items-center justify-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              dept.status === 'ACTIVE' ? 'bg-emerald-500' : 
                              dept.status === 'BUSY' ? 'bg-orange-500' : 'bg-slate-600'
                            }`}></span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{dept.status}</span>
                          </div>
                        </div>

                        {dept.status === 'BUSY' && (
                          <div className="absolute -top-2 -right-2 bg-orange-500 text-white p-1.5 rounded-full animate-pulse shadow-lg shadow-orange-900/20">
                            <AlertCircle size={14} />
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-slate-900/95 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                          <p className="text-xs font-bold text-white mb-3">{dept.name}</p>
                          <div className="flex flex-col gap-2 w-full max-w-[140px]">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">وقت التحضير:</span>
                              <span className="text-white">{dept.defaultPrepTime}د</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">طلبات نشطة:</span>
                              <span className="text-blue-500 font-bold">{activeDeptOrders.length}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">KDS:</span>
                              <span className={dept.hasKds ? 'text-emerald-500' : 'text-slate-500'}>{dept.hasKds ? 'متصل' : 'غير متصل'}</span>
                            </div>
                          </div>
                          <button className="mt-4 text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors">تعديل الإعدادات</button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center opacity-20 group-hover:opacity-100 transition-opacity">
                        <Plus size={24} className="text-slate-500 mx-auto mb-2" />
                        <p className="text-[10px] text-slate-500 font-bold">محطة فارغة</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default DepartmentsPage;