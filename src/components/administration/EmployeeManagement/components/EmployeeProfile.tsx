// components/EmployeeProfile.tsx
import React, { useState } from 'react';
import {
    ChevronRight, Edit2, Trash2, Info, Phone, Mail, MapPin,
    Shield, FileText, BarChart3, Star, Clock, Plus, Activity,
    History, Building2, Calendar,
} from 'lucide-react';
import type { EmployeeFromApi } from "../../../../services/employeeService";
import { getStatusColor, getStatusLabel } from '../utils';

// ── Tab types ─────────────────────────────────────────────────────────────────

type TabKey = 'OVERVIEW' | 'SCHEDULE' | 'LOGS';

const TAB_LABELS: Record<TabKey, string> = {
    OVERVIEW: 'نظرة عامة',
    SCHEDULE: 'جداول العمل',
    LOGS: 'سجل النشاطات',
};

// ── Overview ─────────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ emp: EmployeeFromApi }> = ({ emp }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-red-500" /> إحصائيات الأداء
                </h4>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">إجمالي المبيعات</span>
                        <span className="text-lg font-bold text-emerald-500">
                            {emp.performance?.totalSales?.toLocaleString('ar-SA') || '0'} ر.س
                        </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[70%] rounded-full" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">ساعات العمل</span>
                        <span className="text-lg font-bold text-blue-500">
                            {emp.performance?.hoursWorked || 0} ساعة
                        </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full w-[45%] rounded-full" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">الطلبات المُخدَّمة</span>
                        <span className="text-lg font-bold text-purple-400">
                            {emp.performance?.ordersServed || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick info */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-4">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Clock size={18} className="text-red-500" /> معلومات الوظيفة
                </h4>
                {[
                    { label: 'الدور في النظام', value: emp.role },
                    { label: 'اسم المستخدم', value: emp.username || '---' },
                    { label: 'تاريخ التوظيف', value: emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('ar-SA') : '---' },
                    { label: 'الراتب', value: emp.salary ? `${Number(emp.salary).toLocaleString('ar-SA')} ر.س` : '---' },
                ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-white font-medium">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Placeholder activity */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                <History size={18} className="text-red-500" /> آخر النشاطات
            </h4>
            <p className="text-slate-500 text-sm text-center py-6">لا توجد نشاطات مسجلة</p>
        </div>
    </div>
);

// ── Schedule placeholder ──────────────────────────────────────────────────────

const ScheduleTab: React.FC = () => (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 text-center">
        <Calendar size={40} className="mx-auto text-slate-700 mb-3" />
        <p className="text-slate-400 font-bold">جداول العمل</p>
        <p className="text-slate-600 text-sm mt-1">سيتم إضافة هذه الميزة قريباً</p>
    </div>
);

// ── Logs placeholder ──────────────────────────────────────────────────────────

const LogsTab: React.FC = () => (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 text-center">
        <Activity size={40} className="mx-auto text-slate-700 mb-3" />
        <p className="text-slate-400 font-bold">سجل النشاطات</p>
        <p className="text-slate-600 text-sm mt-1">سيتم إضافة هذه الميزة قريباً</p>
    </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────

interface EmployeeProfileProps {
    emp: EmployeeFromApi;
    departments: { id: number; name: string }[];
    branches: { id: number; name: string }[];
    onBack: () => void;
    onEdit: (emp: EmployeeFromApi) => void;
    onDelete: (id: number) => void;
    onAddAttendance: (emp: EmployeeFromApi) => void;
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({
    emp, departments, branches, onBack, onEdit, onDelete, onAddAttendance,
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');

    const dept = departments.find(d => d.id === emp.department_id);
    const branch = branches.find(b => b.id === emp.branch_id);

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/80 backdrop-blur shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
                    >
                        <ChevronRight size={22} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-white">الملف التعريفي للموظف</h2>
                        <p className="text-xs text-slate-500">{emp.name} — {emp.employeeId || `#${emp.id}`}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onAddAttendance(emp)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all"
                    >
                        <Plus size={16} /> سجل حضور
                    </button>
                    <button
                        onClick={() => onEdit(emp)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all"
                    >
                        <Edit2 size={16} /> تعديل
                    </button>
                    <button
                        onClick={() => { if (confirm('هل أنت متأكد؟')) onDelete(emp.id); }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all"
                    >
                        <Trash2 size={16} /> حذف
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Sidebar */}
                    <div className="space-y-5">
                        {/* Avatar card */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 text-center">
                            <div className="w-28 h-28 rounded-3xl bg-slate-800 border-2 border-red-500/20 mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-red-500 overflow-hidden">
                                {emp.image
                                    ? <img src={emp.image} alt={emp.name} className="w-full h-full object-cover" />
                                    : emp.name.charAt(0)}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{emp.name}</h3>
                            <p className="text-sm text-slate-400 mb-1">{emp.role}</p>
                            {dept && <p className="text-xs text-slate-500 mb-4">{dept.name}</p>}
                            <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold ${getStatusColor(emp.status)}`}>
                                {getStatusLabel(emp.status)}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <div className="bg-slate-800/50 p-3 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 mb-1 uppercase">الطلبات</p>
                                    <p className="text-lg font-bold text-white">{emp.performance?.ordersServed || 0}</p>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 mb-1 uppercase">التقييم</p>
                                    <div className="flex items-center justify-center gap-1">
                                        <Star size={13} className="text-yellow-500 fill-yellow-500" />
                                        <p className="text-lg font-bold text-white">{emp.rating ?? 5.0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-3">
                            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                                <Info size={16} className="text-red-500" /> معلومات التواصل
                            </h4>
                            {[
                                { icon: <Phone size={13} />, value: emp.phone },
                                { icon: <Mail size={13} />, value: emp.email },
                                { icon: <MapPin size={13} />, value: emp.address },
                                { icon: <Building2 size={13} />, value: branch?.name },
                            ].map((item, i) => item.value && (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                        {item.icon}
                                    </div>
                                    <span className="text-slate-300 truncate">{item.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Permissions */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 space-y-3">
                            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                                <Shield size={16} className="text-red-500" /> الصلاحيات والأمان
                            </h4>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">اسم المستخدم</span>
                                <span className="text-white font-mono text-xs">{emp.username || '---'}</span>
                            </div>
                            <div className="pt-1">
                                <p className="text-[10px] text-slate-500 uppercase mb-2">الصلاحيات النشطة</p>
                                <div className="flex flex-wrap gap-1">
                                    {(emp.permissions || []).length > 0
                                        ? emp.permissions.map(p => (
                                            <span key={p} className="px-2 py-0.5 bg-slate-800 border border-white/5 rounded text-[9px] text-slate-300">{p}</span>
                                        ))
                                        : <span className="text-xs text-slate-600">لا توجد صلاحيات مُعيَّنة</span>
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-5">
                            <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                                <FileText size={16} className="text-red-500" /> ملاحظات إدارية
                            </h4>
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 min-h-[80px]">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {emp.notes || 'لا توجد ملاحظات إضافية لهذا الموظف.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tab bar */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-2 flex gap-1">
                            {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === tab
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {TAB_LABELS[tab]}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'OVERVIEW' && <OverviewTab emp={emp} />}
                        {activeTab === 'SCHEDULE' && <ScheduleTab />}
                        {activeTab === 'LOGS' && <LogsTab />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeProfile;