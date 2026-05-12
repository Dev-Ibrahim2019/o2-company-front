
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../store';
import { TableStatus, OrderType } from '../../../types';
import type { Table } from '../../../types';
import { HALLS } from '../../../constants';
import { 
  Users, Clock, DollarSign, Move, Merge, Split, 
  Trash2, ExternalLink, X, Info, Map as MapIcon, Grid,
  ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Layout, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const TablesView: React.FC<{ onSelect: (table: Table) => void }> = ({ onSelect }) => {
  const { 
    tables, selectedTable, setSelectedTable, activeOrders, 
    updateTableStatus, transferTable, mergeTables, loadOrderToPOS,
    currentUser, seatTable, setOrderType
  } = useApp();
  
  const [viewMode, setViewMode] = useState<'MAP' | 'GRID'>('GRID');
  const [selectedHallId, setSelectedHallId] = useState<string>(HALLS[0].id);
  const [zoom, setZoom] = useState(1);
  const [showPopup, setShowPopup] = useState<string | null>(null);
  const [transferMode, setTransferMode] = useState<{ fromId: string } | null>(null);
  const [mergeMode, setMergeMode] = useState<string[]>([]);
  const [seatingTableId, setSeatingTableId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);
  
  const mapRef = useRef<HTMLDivElement>(null);

  const filteredTables = tables.filter(t => t.hallId === selectedHallId);

  const getStatusConfig = (status: TableStatus) => {
    switch(status) {
      case TableStatus.AVAILABLE: 
        return { color: 'bg-emerald-500', label: 'فارغة', border: 'border-emerald-600/20' };
      case TableStatus.OCCUPIED: 
        return { color: 'bg-red-600', label: 'مشغولة', border: 'border-red-700/20' };
      case TableStatus.PAYMENT_PENDING: 
        return { color: 'bg-orange-500', label: 'بانتظار الدفع', border: 'border-orange-600/20' };
      case TableStatus.PAID: 
        return { color: 'bg-emerald-600', label: 'تم الدفع', border: 'border-emerald-700/20' };
      case TableStatus.RESERVED: 
        return { color: 'bg-blue-600', label: 'محجوزة', border: 'border-blue-700/20' };
      case TableStatus.CLEANING: 
        return { color: 'bg-slate-500', label: 'قيد التنظيف', border: 'border-slate-600/20' };
      default: 
        return { color: 'bg-slate-800', label: 'غير معروف', border: 'border-white/5' };
    }
  };

  const getTableOrder = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table?.currentOrderId) return null;
    return activeOrders.find(o => o.id === table.currentOrderId);
  };

  const calculateSittingTime = (seatedAt?: Date) => {
    if (!seatedAt) return '0 دقيقة';
    const diff = Math.floor((new Date().getTime() - new Date(seatedAt).getTime()) / 60000);
    return `${diff} دقيقة`;
  };

  const handleTableClick = (table: Table) => {
    if (transferMode) {
      if (table.status === TableStatus.AVAILABLE) {
        transferTable(transferMode.fromId, table.id);
        setTransferMode(null);
      } else {
        alert('يرجى اختيار طاولة فارغة للنقل إليها');
      }
      return;
    }

    if (mergeMode.length > 0) {
      if (mergeMode.includes(table.id)) {
        setMergeMode(prev => prev.filter(id => id !== table.id));
      } else {
        setMergeMode(prev => [...prev, table.id]);
      }
      return;
    }

    if (table.status === TableStatus.AVAILABLE) {
      setSeatingTableId(table.id);
      setGuestCount(table.capacity);
    } else {
      setShowPopup(table.id);
    }
  };

  const resetTable = (tableId: string) => {
    updateTableStatus(tableId, TableStatus.AVAILABLE, { currentOrderId: undefined, seatedAt: undefined });
    setShowPopup(null);
  };

  const activePopupTable = tables.find(t => t.id === showPopup);
  const activePopupOrder = showPopup ? getTableOrder(showPopup) : null;

  return (
    <div className="h-full flex flex-col space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8 rounded-[3rem] overflow-hidden">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-white tracking-tight">إدارة الطاولات</h2>
          <p className="text-slate-500 font-bold text-sm">خريطة المطعم وتوزيع الطاولات المباشر</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Hall Switcher */}
          <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide">
            {HALLS.map(hall => (
              <button
                key={hall.id}
                onClick={() => setSelectedHallId(hall.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] transition-all whitespace-nowrap ${selectedHallId === hall.id ? 'bg-slate-800 text-white border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Layout size={14} /> {hall.name}
              </button>
            ))}
          </div>

          <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setViewMode('MAP')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${viewMode === 'MAP' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <MapIcon size={16} /> خريطة
            </button>
            <button 
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${viewMode === 'GRID' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Grid size={16} /> شبكة
            </button>
          </div>

          {viewMode === 'MAP' && (
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2.5 text-slate-500 hover:text-white"><ZoomOut size={18} /></button>
              <span className="px-4 py-2.5 text-xs font-black text-white flex items-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2.5 text-slate-500 hover:text-white"><ZoomIn size={18} /></button>
            </div>
          )}

          {mergeMode.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={() => { mergeTables(mergeMode); setMergeMode([]); }}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-blue-900/20 flex items-center gap-2"
              >
                <Merge size={16} /> دمج ({mergeMode.length})
              </button>
              <button onClick={() => setMergeMode([])} className="bg-slate-800 text-white px-4 py-2.5 rounded-2xl font-black text-xs">إلغاء</button>
            </div>
          )}
        </div>
      </header>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 py-4 border-y border-white/5">
        {Object.values(TableStatus).map(status => {
          const config = getStatusConfig(status);
          return (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${config.color}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-900/50 rounded-[2.5rem] border border-white/5 custom-scrollbar">
        {viewMode === 'GRID' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-8 overflow-y-auto h-full custom-scrollbar">
            {filteredTables.map(table => {
              const config = getStatusConfig(table.status);
              const order = getTableOrder(table.id);
              return (
                <motion.button
                  key={table.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTableClick(table)}
                  className={`relative aspect-square rounded-3xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                    mergeMode.includes(table.id) ? 'ring-4 ring-blue-600 ring-offset-4 ring-offset-slate-950' : ''
                  } ${table.mergedWithId ? 'opacity-60 border-dashed' : ''} ${config.color} ${config.border} text-white shadow-xl`}
                >
                  <span className="text-2xl font-black">#{table.number}</span>
                  <div className="flex flex-col items-center gap-1">
                    {table.status === TableStatus.PAID && (
                      <span className="text-[8px] font-black bg-white text-emerald-600 px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                        تم الدفع
                      </span>
                    )}
                    <span className="text-[10px] font-black bg-black/20 px-2 py-0.5 rounded-full">
                      {table.mergedWithId ? `مدمجة مع #${tables.find(t => t.id === table.mergedWithId)?.number}` : 
                       table.status === TableStatus.OCCUPIED || table.status === TableStatus.PAID ? `${table.guestCount || 0} أشخاص` : `${table.capacity} سعة`}
                    </span>
                    {order && !table.mergedWithId && (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-white/80">
                          {order.total.toFixed(2)} ₪
                        </span>
                        {order.shelfLocation && (
                          <span className="text-[8px] font-black bg-white text-red-600 px-1.5 py-0.5 rounded-full shadow-sm">
                            الرف: {order.shelfLocation}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {table.status === TableStatus.OCCUPIED && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-black bg-black/40 px-1.5 py-0.5 rounded-full">
                      <Clock size={8} /> {calculateSittingTime(table.seatedAt)}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div 
            ref={mapRef}
            className="w-full h-full overflow-auto p-20 custom-scrollbar"
            style={{ cursor: transferMode ? 'crosshair' : 'default' }}
          >
            <div 
              className="relative bg-slate-800/20 rounded-[4rem] border-4 border-dashed border-white/5"
              style={{ 
                width: 1500 * zoom, 
                height: 1500 * zoom,
                transformOrigin: 'top left'
              }}
            >
              {filteredTables.map(table => {
                const config = getStatusConfig(table.status);
                const order = getTableOrder(table.id);
                return (
                  <motion.button
                    key={table.id}
                    initial={false}
                    animate={{ 
                      left: table.position.x * zoom, 
                      top: table.position.y * zoom,
                      width: 100 * zoom,
                      height: 100 * zoom
                    }}
                    onClick={() => handleTableClick(table)}
                    className={`absolute rounded-2xl border-2 flex flex-col items-center justify-center gap-1 shadow-2xl transition-all ${
                      mergeMode.includes(table.id) ? 'ring-4 ring-blue-600' : ''
                    } ${table.mergedWithId ? 'opacity-60 border-dashed' : ''} ${config.color} ${config.border} text-white`}
                  >
                    <span className="font-black" style={{ fontSize: `${18 * zoom}px` }}>#{table.number}</span>
                    {table.status === TableStatus.PAID && (
                      <span className="font-black bg-white text-emerald-600 px-1 py-0.5 rounded-full shadow-sm animate-pulse" style={{ fontSize: `${7 * zoom}px` }}>
                        تم الدفع
                      </span>
                    )}
                    {zoom > 0.7 && (
                      <div className="flex flex-col items-center">
                        <span className="font-black bg-black/20 px-1.5 py-0.5 rounded-full" style={{ fontSize: `${8 * zoom}px` }}>
                          {table.mergedWithId ? `مدمجة مع #${tables.find(t => t.id === table.mergedWithId)?.number}` :
                           table.status === TableStatus.OCCUPIED || table.status === TableStatus.PAID ? `${table.guestCount || 0} أشخاص` : `${table.capacity} سعة`}
                        </span>
                        {order && !table.mergedWithId && (
                          <div className="flex flex-col items-center">
                            <span className="font-black" style={{ fontSize: `${9 * zoom}px` }}>
                              {order.total.toFixed(2)} ₪
                            </span>
                            {order.shelfLocation && (
                              <span className="font-black bg-white text-red-600 px-1 py-0.5 rounded-full shadow-sm" style={{ fontSize: `${7 * zoom}px` }}>
                                الرف: {order.shelfLocation}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Seating Modal */}
      <AnimatePresence>
        {seatingTableId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 w-full max-w-sm rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} />
                </div>
                <h3 className="text-2xl font-black text-white">تسكين الطاولة #{tables.find(t => t.id === seatingTableId)?.number}</h3>
                <p className="text-slate-500 font-bold text-sm">يرجى تحديد عدد الأشخاص لبدء الوقت</p>
              </div>

              <div className="flex items-center justify-center gap-6">
                <button 
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center hover:bg-slate-700 transition-all font-black text-xl border border-white/5"
                >
                  -
                </button>
                <span className="text-4xl font-black text-white w-12 text-center">{guestCount}</span>
                <button 
                  onClick={() => setGuestCount(guestCount + 1)}
                  className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center hover:bg-slate-700 transition-all font-black text-xl border border-white/5"
                >
                  +
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const table = tables.find(t => t.id === seatingTableId);
                    seatTable(seatingTableId, guestCount);
                    setOrderType(OrderType.DINE_IN);
                    setSeatingTableId(null);
                    if (table) {
                      setTimeout(() => {
                        onSelect(table);
                      }, 100);
                    }
                  }}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                >
                  تسكين الطاولة وبدء الوقت
                </button>
                <button 
                  onClick={() => setSeatingTableId(null)}
                  className="w-full bg-slate-800 text-slate-400 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPopup && activePopupTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className={`p-8 ${getStatusConfig(activePopupTable.status).color} text-white flex justify-between items-start`}>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black">طاولة #{activePopupTable.number}</h3>
                  <div className="flex items-center gap-2 text-sm font-bold opacity-80">
                    <Info size={16} /> {getStatusConfig(activePopupTable.status).label}
                  </div>
                </div>
                <button onClick={() => setShowPopup(null)} className="p-2 hover:bg-black/20 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {activePopupTable.status === TableStatus.OCCUPIED || activePopupTable.status === TableStatus.PAID || activePopupOrder ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <Users size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">عدد الأشخاص</span>
                        </div>
                        <p className="text-lg font-black text-white">{activePopupTable.guestCount || activePopupTable.capacity} أشخاص</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <Clock size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">وقت الجلوس</span>
                        </div>
                        <p className="text-lg font-black text-white">{calculateSittingTime(activePopupTable.seatedAt)}</p>
                      </div>
                    </div>

                    {activePopupTable.mergedWithId && (
                      <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-2xl text-center">
                        <p className="text-blue-500 font-black text-xs">مدمجة مع طاولة #{tables.find(t => t.id === activePopupTable.mergedWithId)?.number}</p>
                      </div>
                    )}

                    {activePopupOrder ? (
                      <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-500">
                              <DollarSign size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">إجمالي الفاتورة</span>
                            </div>
                            <p className="text-3xl font-black text-red-600">{activePopupOrder.total.toFixed(2)} ₪</p>
                          </div>
                          <button 
                            onClick={() => { 
                              loadOrderToPOS(activePopupOrder); 
                              setOrderType(OrderType.DINE_IN);
                              setTimeout(() => {
                                onSelect(activePopupTable); 
                              }, 100);
                            }}
                            className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-red-900/20 flex items-center gap-2"
                          >
                            <ExternalLink size={18} /> فتح الفاتورة
                          </button>
                        </div>
                        
                        {activePopupTable.status === TableStatus.OCCUPIED && (
                          <button 
                            onClick={() => updateTableStatus(activePopupTable.id, TableStatus.PAYMENT_PENDING)}
                            className="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
                          >
                            <DollarSign size={16} /> طلب الحساب (بانتظار الدفع)
                          </button>
                        )}

                        {activePopupTable.status === TableStatus.PAID && (
                          <div className="space-y-3">
                            <div className="bg-emerald-600/10 border border-emerald-600/20 p-3 rounded-xl text-center">
                              <p className="text-emerald-500 font-black text-xs">تم دفع الحساب بنجاح</p>
                            </div>
                            <button 
                              onClick={() => { 
                                setSelectedTable(activePopupTable); 
                                setOrderType(OrderType.DINE_IN);
                                setTimeout(() => {
                                  onSelect(activePopupTable); 
                                }, 100);
                              }}
                              className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                            >
                              <Plus size={16} /> فتح فاتورة جديدة
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                        <div className="text-center py-2">
                          <p className="text-slate-400 font-bold text-sm">لا توجد طلبات مسجلة لهذه الطاولة بعد</p>
                        </div>
                        <button 
                          onClick={() => { 
                            setSelectedTable(activePopupTable); 
                            setOrderType(OrderType.DINE_IN);
                            setTimeout(() => {
                              onSelect(activePopupTable); 
                            }, 100);
                          }}
                          className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                        >
                          <Plus size={18} /> إضافة طلب جديد
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <button 
                        onClick={() => {
                          if (activePopupTable.status !== TableStatus.PAID) {
                            alert('لا يمكن تفريغ الطاولة قبل دفع الحساب');
                            return;
                          }
                          updateTableStatus(activePopupTable.id, TableStatus.CLEANING);
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/5 transition-all ${
                          activePopupTable.status === TableStatus.PAID 
                            ? 'bg-slate-800 hover:bg-slate-700' 
                            : 'bg-slate-900 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 size={20} className="text-red-500" />
                        <span className="text-[10px] font-black text-slate-300">تفريغ</span>
                      </button>
                      <button 
                        onClick={() => { setTransferMode({ fromId: activePopupTable.id }); setShowPopup(null); }}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-2xl border border-white/5 hover:bg-slate-700 transition-all"
                      >
                        <Move size={20} className="text-blue-500" />
                        <span className="text-[10px] font-black text-slate-300">نقل</span>
                      </button>
                      <button 
                        onClick={() => { setMergeMode([activePopupTable.id]); setShowPopup(null); }}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-2xl border border-white/5 hover:bg-slate-700 transition-all"
                      >
                        <Merge size={20} className="text-purple-500" />
                        <span className="text-[10px] font-black text-slate-300">دمج</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activePopupTable.status === TableStatus.RESERVED && (
                      <div className="bg-blue-600/10 p-6 rounded-3xl border border-blue-600/20 space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">اسم الحجز</p>
                          <p className="text-xl font-black text-white">{activePopupTable.reservationName || 'غير محدد'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">وقت الحجز</p>
                          <p className="text-xl font-black text-white">{activePopupTable.reservationTime || '--:--'}</p>
                        </div>
                      </div>
                    )}

                    {activePopupTable.status === TableStatus.CLEANING && (
                      <div className="text-center py-8 space-y-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                          <Clock size={40} />
                        </div>
                        <p className="text-slate-400 font-bold">الطاولة قيد التنظيف حالياً</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {activePopupTable.status === TableStatus.CLEANING && (
                        <button 
                          onClick={() => resetTable(activePopupTable.id)}
                          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-900/20"
                        >
                          تم التنظيف (تفعيل الطاولة)
                        </button>
                      )}
                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            const name = prompt('اسم الحجز:');
                            const time = prompt('وقت الحجز (مثلاً 07:00 PM):');
                            if (name && time) {
                              updateTableStatus(activePopupTable.id, TableStatus.RESERVED, { reservationName: name, reservationTime: time });
                              setShowPopup(null);
                            }
                          }}
                          className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-900/20"
                        >
                          حجز الطاولة
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer Mode Overlay */}
      {transferMode && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-8 py-4 rounded-full font-black shadow-2xl flex items-center gap-4 animate-bounce">
          <Move size={24} />
          <span>اختر الطاولة الجديدة لنقل الطلب إليها...</span>
          <button onClick={() => setTransferMode(null)} className="bg-black/20 p-1 rounded-full hover:bg-black/40"><X size={16} /></button>
        </div>
      )}
    </div>
  );
};
