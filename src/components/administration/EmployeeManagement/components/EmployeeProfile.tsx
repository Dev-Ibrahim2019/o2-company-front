import React, { useState } from 'react';
import {
    ChevronRight, Edit2, Trash2, Info, Phone, Mail, MapPin, Shield,
    FileText, BarChart3, Timer, Star, Clock, Plus, Activity, History
} from 'lucide-react';
import type { Employee, Department, JobTitle, Attendance, ActivityLog, WorkSchedule } from '../../../../../types';
import { getStatusColor, getStatusLabel } from '../utils';

// ─── Sub-tab: Overview ───────────────────────────────────────────────────────

interface OverviewTabProps {
    emp: Employee;
    activeAttendance?: Attendance;
    empLogs: ActivityLog[];
    onCheckIn: () => void;
    onCheckOut: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ emp, activeAttendance, empLogs, onCheckIn, onCheckOut }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-red-500" /> إحصائيات الأداء</h4>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">إجمالي المبيعات</span>
                        <span className="text-lg font-bold text-emerald-500">${emp.performance?.totalSales?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[70%]" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">ساعات العمل</span>
                        <span className="text-lg font-bold text-blue-500">{emp.performance?.hoursWorked || 0} ساعة</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full w-[45%]" />
                    </div>
                </div>
            </div>

            {/* Current Shift */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Timer size={18} className="text-red-500" /> الشفت الحالي</h4>
                <div className="text-center py-4">
                    {activeAttendance ? (
                        <>
                            <p className="text-3xl font-black text-white mb-2">08:45:12</p>
                            <p className="text-xs text-slate-500">منذ الدخول في {new Date(activeAttendance.checkIn).toLocaleTimeString('ar-SA')}</p>
                            <button onClick={onCheckOut} className="mt-6 w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-bold transition-all">
                                تسجيل خروج (Check Out)
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-bold text-slate-500 mb-4">غير مسجل دخول</p>
                            <button onClick={onCheckIn} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl font-bold transition-all">
                                تسجيل دخول (Check In)
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2"><History size={18} className="text-red-500" /> آخر النشاطات</h4>
            <div className="space-y-4">
                {empLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-red-500">
                                <Activity size={14} />
                            </div>
                            <span className="text-sm text-slate-300">{log.action}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString('ar-SA')}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// ─── Sub-tab: Attendance ─────────────────────────────────────────────────────

interface AttendanceTabProps {
    empAttendances: Attendance[];
    onAddManual: () => void;
    onDelete: (id: string) => void;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ empAttendances, onAddManual, onDelete }) => (
    <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <h4 className="font-bold text-white flex items-center gap-2"><Clock size={18} className="text-red-500" /> سجل الحضور والانصراف</h4>
            <button onClick={onAddManual} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold text-xs transition-all">
                <Plus size={14} /> إضافة سجل يدوي
            </button>
        </div>
        <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-right">
                <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-xs border-b border-white/5">
                        <th className="p-4 font-medium">التاريخ</th>
                        <th className="p-4 font-medium">وقت الدخول</th>
                        <th className="p-4 font-medium">وقت الخروج</th>
                        <th className="p-4 font-medium">الحالة</th>
                        <th className="p-4 font-medium">ملاحظات</th>
                        <th className="p-4 font-medium">الإجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {empAttendances.length > 0 ? empAttendances.map(att => (
                        <tr key={att.id} className="text-sm group hover:bg-white/5 transition-colors">
                            <td className="p-4 text-white">{new Date(att.date).toLocaleDateString('ar-SA')}</td>
                            <td className="p-4 text-emerald-500 font-mono">
                                {att.checkIn ? new Date(att.checkIn).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '---'}
                            </td>
                            <td className="p-4 text-red-400 font-mono">
                                {att.checkOut ? new Date(att.checkOut).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '---'}
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${att.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500' :
                                    att.status === 'LATE' ? 'bg-orange-500/10 text-orange-500' :
                                        'bg-red-500/10 text-red-500'
                                    }`}>
                                    {att.status === 'PRESENT' ? 'حاضر' : att.status === 'LATE' ? 'متأخر' : 'غائب'}
                                </span>
                            </td>
                            <td className="p-4 text-xs text-slate-500">{att.note || '---'}</td>
                            <td className="p-4">
                                <button onClick={() => onDelete(att.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={14} />
                                </button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={6} className="p-10 text-center text-slate-500">لا يوجد سجل حضور لهذا الموظف</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

// ─── Sub-tab: Schedule ───────────────────────────────────────────────────────

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

interface ScheduleTabProps {
    empId: string;
    workSchedules: WorkSchedule[];
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ empId, workSchedules }) => (
    <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden">
        <table className="w-full text-right">
            <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs border-b border-white/5">
                    <th className="p-4 font-medium">اليوم</th>
                    <th className="p-4 font-medium">وقت البدء</th>
                    <th className="p-4 font-medium">وقت الانتهاء</th>
                    <th className="p-4 font-medium">الحالة</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {DAYS.map(day => {
                    const sch = workSchedules.find(s => s.employeeId === empId && (s as any).day === day);
                    return (
                        <tr key={day} className="text-sm">
                            <td className="p-4 text-white font-bold">{day}</td>
                            <td className="p-4 text-slate-300 font-mono">{sch?.startTime || '09:00'}</td>
                            <td className="p-4 text-slate-300 font-mono">{sch?.endTime || '17:00'}</td>
                            <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(sch as any)?.isOff ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                                    }`}>
                                    {(sch as any)?.isOff ? 'إجازة' : 'دوام'}
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

// ─── Sub-tab: Logs ───────────────────────────────────────────────────────────

interface LogsTabProps { empLogs: ActivityLog[] }

const LogsTab: React.FC<LogsTabProps> = ({ empLogs }) => (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
        <div className="space-y-4">
            {empLogs.length > 0 ? empLogs.map(log => (
                <div key={log.id} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-red-500 shrink-0">
                        <Activity size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-white font-bold">{log.action}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(log.timestamp).toLocaleString('ar-SA')}</p>
                        {log.details && (
                            <pre className="mt-2 p-2 bg-slate-950 rounded-lg text-[10px] text-slate-400 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )) : (
                <div className="text-center py-10 text-slate-500">لا يوجد سجل نشاطات لهذا الموظف</div>
            )}
        </div>
    </div>
);

// ─── Main Profile Component ──────────────────────────────────────────────────

type TabKey = 'OVERVIEW' | 'ATTENDANCE' | 'SCHEDULE' | 'LOGS';
const TAB_LABELS: Record<TabKey, string> = {
    OVERVIEW: 'نظرة عامة', ATTENDANCE: 'الحضور', SCHEDULE: 'الجدول', LOGS: 'السجل',
};

interface EmployeeProfileProps {
    emp: Employee;
    dept?: Department;
    title?: JobTitle;
    attendances: Attendance[];
    activityLogs: ActivityLog[];
    workSchedules: WorkSchedule[];
    onBack: () => void;
    onEdit: (emp: Employee) => void;
    onDelete: (id: string) => void;
    onCheckIn: (id: string) => void;
    onCheckOut: (id: string) => void;
    onAddAttendance: (employeeId: string) => void;
    onDeleteAttendance: (id: string) => void;
}

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({
    emp, dept, title, attendances, activityLogs, workSchedules,
    onBack, onEdit, onDelete, onCheckIn, onCheckOut, onAddAttendance, onDeleteAttendance,
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');
    const empAttendances = attendances.filter(a => a.employeeId === emp.id);
    const empLogs = activityLogs.filter(l => l.employeeId === emp.id);
    const activeAttendance = empAttendances.find(a => !a.checkOut);

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in slide-in-from-right duration-300">
            {/* Top bar */}
            <div className="bg-slate-900 border-b border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
                        <ChevronRight size={24} className="rotate-180" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white">الملف التعريفي للموظف</h2>
                        <p className="text-xs text-slate-500">{emp.name} | {emp.employeeId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(emp)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all">
                        <Edit2 size={18} /> تعديل
                    </button>
                    <button
                        onClick={() => { if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) { onDelete(emp.id); onBack(); } }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
                    >
                        <Trash2 size={18} /> حذف
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left sidebar */}
                    <div className="space-y-6">
                        {/* Avatar + stats */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 text-center">
                            <div className="w-32 h-32 rounded-3xl bg-slate-800 border-2 border-red-500/20 mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-red-500 overflow-hidden">
                                {emp.image ? <img src={emp.image} alt={emp.name} className="w-full h-full object-cover" /> : emp.name.charAt(0)}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{emp.name}</h3>
                            <p className="text-sm text-slate-400 mb-4">{title?.name}</p>
                            <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold ${getStatusColor(emp.status)}`}>
                                {getStatusLabel(emp.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-8">
                                <div className="bg-slate-800/50 p-3 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 mb-1 uppercase">الطلبات</p>
                                    <p className="text-lg font-bold text-white">{emp.performance?.ordersServed || 0}</p>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 mb-1 uppercase">التقييم</p>
                                    <div className="flex items-center justify-center gap-1">
                                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                        <p className="text-lg font-bold text-white">{emp.rating || 5.0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-4">
                            <h4 className="font-bold text-white flex items-center gap-2 mb-2"><Info size={18} className="text-red-500" /> معلومات التواصل</h4>
                            {[
                                { icon: <Phone size={14} />, value: emp.phone },
                                { icon: <Mail size={14} />, value: emp.email },
                                { icon: <MapPin size={14} />, value: emp.address },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">{item.icon}</div>
                                    <span className="text-slate-300">{item.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Permissions */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-4">
                            <h4 className="font-bold text-white flex items-center gap-2 mb-2"><Shield size={18} className="text-red-500" /> الصلاحيات والأمان</h4>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">اسم المستخدم</span>
                                <span className="text-white font-mono">{emp.username || '---'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">رمز الـ PIN</span>
                                <span className="text-white font-mono">****</span>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] text-slate-500 uppercase mb-2">الصلاحيات النشطة</p>
                                <div className="flex flex-wrap gap-1">
                                    {(emp.permissions || []).map(p => (
                                        <span key={p} className="px-2 py-0.5 bg-slate-800 border border-white/5 rounded text-[9px] text-slate-300">{p}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                            <h4 className="font-bold text-white mb-4 flex items-center gap-2"><FileText size={18} className="text-red-500" /> ملاحظات إدارية</h4>
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 min-h-[100px]">
                                <p className="text-sm text-slate-300 leading-relaxed">{emp.notes || 'لا توجد ملاحظات إضافية لهذا الموظف.'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tab switcher */}
                        <div className="bg-slate-900 border border-white/5 rounded-3xl p-2 flex gap-1">
                            {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {TAB_LABELS[tab]}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'OVERVIEW' && <OverviewTab emp={emp} activeAttendance={activeAttendance} empLogs={empLogs} onCheckIn={() => onCheckIn(emp.id)} onCheckOut={() => onCheckOut(emp.id)} />}
                        {activeTab === 'ATTENDANCE' && <AttendanceTab empAttendances={empAttendances} onAddManual={() => onAddAttendance(emp.id)} onDelete={onDeleteAttendance} />}
                        {activeTab === 'SCHEDULE' && <ScheduleTab empId={emp.id} workSchedules={workSchedules} />}
                        {activeTab === 'LOGS' && <LogsTab empLogs={empLogs} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeProfile;