// src/components/administration/Items/MenuPage.tsx

import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Package, CheckCircle2, AlertCircle, Star, Edit2, Trash2, Clock, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useItems } from '../../../hooks/useItems';
import { useBranch } from '../../../hooks/useBranch';
import { useDepartments } from '../../../hooks/useDepartments';
import ItemModal, { type ItemFormOutput } from './ItemModal';
import type { ItemPayload } from '../../../services/itemService';

const MenuPage: React.FC = () => {
  const { items, loading, error, addItem, updateItem, deleteItem } = useItems();
  const { branches } = useBranch();
  const { departments } = useDepartments();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredItems = useMemo(() =>
    items.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.name_ar ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = filterDept === 'all' || String(item.department_id) === filterDept;
      const matchStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && item.is_active) ||
        (filterStatus === 'inactive' && !item.is_active);

      return matchSearch && matchDept && matchStatus;
    }),
    [items, searchQuery, filterDept, filterStatus]
  );

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.is_active).length,
    inactive: items.filter(i => !i.is_active).length,
    linked: items.filter(i => (i.branches?.length ?? 0) > 0).length,
  }), [items]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openAdd = () => { setEditingItem(null); setIsModalOpen(true); };
  const openEdit = (item: any) => { setEditingItem(item); setIsModalOpen(true); };

  const handleSave = async (formData: ItemFormOutput) => {
    const payload: ItemPayload = { ...formData };
    if (editingItem) {
      await updateItem(editingItem.id, payload);
    } else {
      await addItem(payload);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    await deleteItem(id);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-400 gap-2">
      <AlertCircle size={20} /> {error}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأصناف', value: stats.total, icon: Package, color: 'blue' },
          { label: 'متوفر حالياً', value: stats.active, icon: CheckCircle2, color: 'emerald' },
          { label: 'غير متاح', value: stats.inactive, icon: AlertCircle, color: 'red' },
          { label: 'مرتبط بفروع', value: stats.linked, icon: Star, color: 'orange' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-3">
            <div className={`p-2 bg-${color}-500/10 rounded-lg text-${color}-500`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase">{label}</p>
              <p className="text-xl font-black text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="البحث بالاسم أو الكود..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="hidden md:block px-3 py-1 bg-slate-800 rounded-full border border-white/5 text-[10px] font-black text-slate-400">
            {filteredItems.length} نتيجة
          </span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-1 md:flex-none border px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition-all ${showFilters
              ? 'bg-red-600/10 border-red-600/50 text-red-500'
              : 'bg-slate-900 border-white/5 text-white hover:bg-slate-800'
              }`}
          >
            <Filter size={16} /> تصفية
          </button>
          <button
            onClick={openAdd}
            className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition-all shadow-lg shadow-red-900/20"
          >
            <Plus size={16} /> إضافة صنف
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">القسم</label>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="all">الكل</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">الحالة</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="all">الكل</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setSearchQuery(''); setFilterDept('all'); setFilterStatus('all'); }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-black transition-all"
                >إعادة تعيين</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-900/50 border border-white/5 rounded-xl p-4 animate-pulse flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-slate-800 rounded w-1/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-black text-white mb-1">لا توجد أصناف</h3>
          <p className="text-slate-500 text-sm mb-4">
            {searchQuery ? 'لا توجد نتائج مطابقة' : 'ابدأ بإضافة أول صنف'}
          </p>
          {!searchQuery && (
            <button onClick={openAdd}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-black text-sm transition-all">
              إضافة صنف جديد
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                  <th className="p-4 font-black">الصنف</th>
                  <th className="p-4 font-black">القسم</th>
                  <th className="p-4 font-black text-center">الفروع والأسعار</th>
                  <th className="p-4 font-black">الوحدة</th>
                  <th className="p-4 font-black text-center">الحالة</th>
                  <th className="p-4 font-black text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">

                    {/* Item Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/5">
                          {item.image
                            ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-slate-600"><Package size={18} /></div>
                          }
                        </div>
                        <div>
                          <p className="font-black text-white text-sm">{item.name_ar || item.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Tag size={9} className="text-slate-600" />
                            <span className="text-[10px] text-slate-500 font-mono">{item.code}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="p-4">
                      <span className="text-sm text-slate-300 font-black">
                        {item.department?.nameAr || item.department?.name || '—'}
                      </span>
                    </td>

                    {/* Branches */}
                    <td className="p-4 text-center">
                      {(item.branches?.length ?? 0) === 0 ? (
                        <span className="text-[10px] text-slate-600 font-black">غير مرتبط</span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-slate-400">
                            {item.branches!.length} فرع
                          </span>
                          <div className="flex flex-wrap gap-1 justify-center max-w-[180px]">
                            {item.branches!.slice(0, 3).map(b => (
                              <span key={b.id} className="text-[9px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                                {b.name.split(' ')[0]} — {b.pivot.price.toFixed(2)}₪
                              </span>
                            ))}
                            {item.branches!.length > 3 && (
                              <span className="text-[9px] font-black text-red-400">+{item.branches!.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="p-4">
                      <span className="text-sm text-slate-400">{item.unit || '—'}</span>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${item.is_active
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                        }`}>
                        {item.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(item)}
                          className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                          title="تعديل">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                          title="حذف">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        editingItem={editingItem}
        branches={branches}
        departments={departments}
        onSave={handleSave}
      />
    </div>
  );
};

export default MenuPage;