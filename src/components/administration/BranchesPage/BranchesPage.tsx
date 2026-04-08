import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../../../store';
import { 
  Users, 
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Building2,
  Map,
  Shield,
  Smartphone
} from 'lucide-react';

const BranchesPage = () => {
    const { 
        employees, 
        branches,
        deleteBranch
    } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [modalType, setModalType] = useState<'BRANCH' | 'DEPARTMENT' | 'MENU_ITEM' | 'EMPLOYEE' | 'CUSTOMER' | null>(null);
    const [setEditingItem] = useState<any>(null);
    const [activeBranchTab, setActiveBranchTab] = useState<'BASIC' | 'LOCATION' | 'CONTACT' | 'OPERATIONS' | 'FINANCIAL' | 'CASHIER' | 'ADVANCED'>('BASIC');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filteredBranches = branches.filter(b => 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openModal = (type: 'BRANCH' | 'DEPARTMENT' | 'MENU_ITEM' | 'EMPLOYEE' | 'CUSTOMER', item: any = null) => {
        setModalType(type);
        setEditingItem(item);
        setActiveBranchTab('BASIC');
        setIsModalOpen(true);
    };

    const stats = {
      total: branches.length,
      active: branches.filter(b => b.status === 'ACTIVE').length,
      inactive: branches.filter(b => b.status === 'INACTIVE').length,
      totalEmployees: employees.length
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">إجمالي الأفرع</p>
              <p className="text-xl font-black text-white">{stats.total}</p>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">أفرع نشطة</p>
              <p className="text-xl font-black text-white">{stats.active}</p>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">أفرع متوقفة</p>
              <p className="text-xl font-black text-white">{stats.inactive}</p>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">إجمالي الموظفين</p>
              <p className="text-xl font-black text-white">{stats.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="البحث عن فرع بالاسم أو المدينة..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pr-12 pl-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all shadow-inner"
            />
          </div>
          <button 
            onClick={() => openModal('BRANCH')}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-xl shadow-red-900/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={20} />
            إضافة فرع جديد
          </button>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5 bg-white/5">
                  <th className="p-6">معلومات الفرع</th>
                  <th className="p-6">الموقع والتواصل</th>
                  <th className="p-6">الإدارة</th>
                  <th className="p-6 text-center">القوى العاملة</th>
                  <th className="p-6">الحالة التشغيلية</th>
                  <th className="p-6 text-center">العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBranches.map(branch => {
                  const manager = employees.find(e => e.id === branch.managerId);
                  const employeeCount = employees.filter(e => e.branchId === branch.id).length;
                  
                  return (
                    <tr key={branch.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-500 ${
                            branch.isMainBranch ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-900/20' : 'bg-slate-800 shadow-black/20'
                          }`}>
                            <Building2 size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-black text-white text-base">{branch.name}</p>
                              {branch.isMainBranch && (
                                <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-red-500/20 uppercase tracking-tighter">الرئيسي</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-mono">#{branch.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Map size={14} className="text-slate-500" />
                            <span className="text-sm font-bold">{branch.city}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Smartphone size={14} />
                            <span className="text-xs">{branch.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        {manager ? (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center text-sm font-black text-white shadow-inner">
                              {manager.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{manager.name}</p>
                              <p className="text-[10px] text-slate-500">مدير الفرع</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Shield size={14} />
                            <span className="text-xs font-medium italic">لم يتم التعيين</span>
                          </div>
                        )}
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex -space-x-2 rtl:space-x-reverse">
                            {[...Array(Math.min(3, employeeCount))].map((_, i) => (
                              <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400">
                                <Users size={12} />
                              </div>
                            ))}
                            {employeeCount > 3 && (
                              <div className="w-7 h-7 rounded-full border-2 border-slate-900 bg-red-600 flex items-center justify-center text-[8px] font-bold text-white">
                                +{employeeCount - 3}
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-black text-slate-500 uppercase">{employeeCount} موظف | {branch.cashierCount} كاشير</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${
                          branch.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-900/10' :
                          branch.status === 'INACTIVE' ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-lg shadow-red-900/10' :
                          branch.status === 'MAINTENANCE' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                          'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                            branch.status === 'ACTIVE' ? 'bg-emerald-500' :
                            branch.status === 'INACTIVE' ? 'bg-red-500' :
                            branch.status === 'MAINTENANCE' ? 'bg-orange-500' : 'bg-blue-500'
                          }`} />
                          {branch.status === 'ACTIVE' ? 'نشط الآن' : 
                           branch.status === 'INACTIVE' ? 'متوقف مؤقتاً' :
                           branch.status === 'MAINTENANCE' ? 'تحت الصيانة' : 'مزدحم جداً'}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openModal('BRANCH', branch)}
                            className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-lg shadow-blue-900/5"
                            title="تعديل البيانات"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا الفرع؟ سيؤدي ذلك لإخفائه من النظام.')) {
                                deleteBranch(branch.id);
                              }
                            }}
                            className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 shadow-lg shadow-red-900/5"
                            title="حذف الفرع"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredBranches.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-600 mx-auto mb-6 rotate-12">
                <Building2 size={40} />
              </div>
              <h3 className="text-xl font-black text-white mb-2">لا يوجد أفرع مطابقة</h3>
              <p className="text-slate-500 font-medium">جرب البحث بكلمات أخرى أو أضف فرعاً جديداً</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  export default BranchesPage;