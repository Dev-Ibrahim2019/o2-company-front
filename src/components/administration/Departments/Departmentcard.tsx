// src/components/administration/Departments/DepartmentApiCard.tsx

import { Edit2, Trash2, Monitor, EyeOff, Printer, Layers, Map, Clock, Zap } from 'lucide-react';
import type { Department } from '../../../services/departmentService';

interface Props {
    dept: Department;
    onEdit: () => void;
    onDelete: () => void;
}

const STATUS_CONFIG = {
    ACTIVE: { label: 'نشط', cls: 'bg-emerald-500/10 text-emerald-500' },
    BUSY: { label: 'مزدحم', cls: 'bg-orange-500/10  text-orange-500' },
    INACTIVE: { label: 'معطل', cls: 'bg-slate-500/10   text-slate-500' },
} as const;

const DepartmentApiCard = ({ dept, onEdit, onDelete }: Props) => {
    const statusKey = (dept.status ?? 'INACTIVE') as keyof typeof STATUS_CONFIG;
    const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.INACTIVE;

    return (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 hover:border-red-500/30 transition-all group relative overflow-hidden">

            {/* شريط اللون */}
            <div
                className="absolute top-0 right-0 w-1.5 h-full"
                style={{ backgroundColor: dept.color || '#ef4444' }}
            />

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
                        style={{
                            backgroundColor: `${dept.color || '#ef4444'}15`,
                            color: dept.color || '#ef4444',
                        }}
                    >
                        {dept.icon || <Layers size={24} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">
                            {dept.nameAr || dept.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            {dept.shortName && (
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {dept.shortName}
                                </span>
                            )}
                            {dept.shortName && dept.type && (
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                            )}
                            {dept.type && (
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {dept.type}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                        title="تعديل"
                    >
                        <Edit2 size={15} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                        title="حذف"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-slate-500 mb-1">الموقع / المحطة</p>
                    <div className="flex items-center gap-2">
                        <Map size={13} className="text-red-500 shrink-0" />
                        <span className="text-sm font-bold text-white truncate">
                            {dept.location || `Station ${dept.stationNumber || '?'}`}
                        </span>
                    </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-slate-500 mb-1">وقت التحضير</p>
                    <div className="flex items-center gap-2">
                        <Clock size={13} className="text-emerald-500 shrink-0" />
                        <span className="text-sm font-bold text-white">
                            {dept.defaultPrepTime ?? 0} دقيقة
                        </span>
                    </div>
                </div>
            </div>

            {/* Capacity */}
            <div className="flex items-center justify-between text-xs mb-5">
                <span className="text-slate-500 flex items-center gap-1">
                    <Zap size={12} />
                    الطاقة الاستيعابية
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                    0 / {dept.maxConcurrentOrders ?? 10}
                </span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                    {dept.hasKds ? (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                            <Monitor size={10} /> KDS نشط
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-500/10 px-2 py-1 rounded-lg">
                            <EyeOff size={10} /> بدون شاشة
                        </div>
                    )}
                    {dept.autoPrintTicket && (
                        <div className="p-1 bg-blue-500/10 text-blue-500 rounded-lg" title="طباعة تلقائية">
                            <Printer size={12} />
                        </div>
                    )}
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${status.cls}`}>
                    {status.label}
                </span>
            </div>
        </div>
    );
};

export default DepartmentApiCard;