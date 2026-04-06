
import React, { useState, useMemo } from 'react';
import { useApp } from '../../../store';
import { 
  Users, 
  Search, 
  Plus, 
  LayoutGrid, 
  List, 
  UserPlus, 
  Shield, 
  Clock, 
  Calendar, 
  Activity, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Building2, 
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  History,
  BarChart3,
  Timer,
  Info,
  FileText,
  X,
  Save,
  Hash,
  AtSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmployeeStatus } from '../../../types';
import type { Employee, Attendance } from '../../../types';

const EmployeeManagement: React.FC = () => {
  const { 
    employees, 
    departments, 
    jobTitles, 
    attendances, 
    workSchedules, 
    activityLogs,
    checkIn,
    checkOut,
    recordAttendance,
    deleteAttendance,
    updateEmployee,
    deleteEmployee,
    addEmployee
  } = useApp();

  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ATTENDANCE' | 'SCHEDULE' | 'LOGS'>('OVERVIEW');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState<Partial<Attendance>>({
    status: 'PRESENT',
    date: new Date()
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDept === 'ALL' || emp.departmentId === selectedDept;
      const matchesStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, selectedDept, selectedStatus]);

  const selectedEmployee = useMemo(() => 
    employees.find(e => e.id === selectedEmployeeId), 
    [employees, selectedEmployeeId]
  );

  const getStatusColor = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE: return 'text-emerald-500 bg-emerald-500/10';
      case EmployeeStatus.ON_LEAVE: return 'text-orange-500 bg-orange-500/10';
      case EmployeeStatus.SUSPENDED: return 'text-red-500 bg-red-500/10';
      case EmployeeStatus.TERMINATED: return 'text-slate-500 bg-slate-500/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getStatusLabel = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE: return 'نشط';
      case EmployeeStatus.ON_LEAVE: return 'في إجازة';
      case EmployeeStatus.SUSPENDED: return 'موقوف';
      case EmployeeStatus.TERMINATED: return 'مفصول';
      case EmployeeStatus.RESIGNED: return 'مستقيل';
      default: return status;
    }
  };

  const renderEmployeeCard = (emp: Employee) => {
    const dept = departments.find(d => d.id === emp.departmentId);
    const title = jobTitles.find(t => t.id === emp.jobTitleId);

    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-white/5 rounded-2xl p-5 hover:border-red-500/30 transition-all group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-red-500/10 transition-all" />
        
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-2xl font-bold text-red-500 overflow-hidden">
              {emp.image ? (
                <img src={emp.image} alt={emp.name} className="w-full h-full object-cover" />
              ) : (
                emp.name.charAt(0)
              )}
            </div>
            <div>
              <h3 className="font-bold text-white group-hover:text-red-400 transition-colors">{emp.name}</h3>
              <p className="text-xs text-slate-500">{emp.employeeId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEditingEmployee(emp);
                setShowAddModal(true);
              }}
              className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-500 hover:text-emerald-500 transition-all"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={() => deleteEmployee(emp.id)}
              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
            >
              <Trash2 size={16} />
            </button>
            <button 
              onClick={() => setSelectedEmployeeId(emp.id)}
              className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-500 transition-all"
            >
              <Eye size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-6 relative z-10">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase size={14} className="text-slate-500" />
            <span className="text-slate-300">{title?.name || 'بدون مسمى'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 size={14} className="text-slate-500" />
            <span className="text-slate-300">{dept?.nameAr || 'بدون قسم'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-slate-500" />
            <span className="text-slate-400 text-xs">توظيف: {new Date(emp.hireDate).toLocaleDateString('ar-SA')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between relative z-10">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusColor(emp.status)}`}>
            {getStatusLabel(emp.status)}
          </span>
          <button 
            onClick={() => setSelectedEmployeeId(emp.id)}
            className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-all"
          >
            الملف الشخصي
            <ChevronRight size={14} />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderEmployeeTable = () => (
    <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
      <table className="w-full text-right">
        <thead>
          <tr className="bg-slate-800/50 text-slate-400 text-xs border-b border-white/5">
            <th className="p-4 font-medium">الموظف</th>
            <th className="p-4 font-medium">المسمى الوظيفي</th>
            <th className="p-4 font-medium">القسم</th>
            <th className="p-4 font-medium">تاريخ التوظيف</th>
            <th className="p-4 font-medium">الحالة</th>
            <th className="p-4 font-medium">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {filteredEmployees.map(emp => {
            const dept = departments.find(d => d.id === emp.departmentId);
            const title = jobTitles.find(t => t.id === emp.jobTitleId);
            return (
              <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-red-500">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">{emp.name}</p>
                      <p className="text-[10px] text-slate-500">{emp.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-300">{title?.name}</td>
                <td className="p-4 text-sm text-slate-300">{dept?.nameAr}</td>
                <td className="p-4 text-sm text-slate-400">{new Date(emp.hireDate).toLocaleDateString('ar-SA')}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${getStatusColor(emp.status)}`}>
                    {getStatusLabel(emp.status)}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-500 transition-all"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setEditingEmployee(emp);
                        setShowAddModal(true);
                      }}
                      className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-500 hover:text-emerald-500 transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteEmployee(emp.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderProfile = (emp: Employee) => {
    const dept = departments.find(d => d.id === emp.departmentId);
    const title = jobTitles.find(t => t.id === emp.jobTitleId);
    const empAttendances = attendances.filter(a => a.employeeId === emp.id);
    const empLogs = activityLogs.filter(l => l.employeeId === emp.id);
    const activeAttendance = empAttendances.find(a => !a.checkOut);

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in slide-in-from-right duration-300">
        <div className="bg-slate-900 border-b border-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setSelectedEmployeeId(null);
                setActiveTab('OVERVIEW');
              }}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <ChevronRight size={24} className="rotate-180" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">الملف التعريفي للموظف</h2>
              <p className="text-xs text-slate-500">{emp.name} | {emp.employeeId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEditingEmployee(emp);
                setShowAddModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
            >
              <Edit2 size={18} />
              تعديل
            </button>
            <button 
              onClick={() => {
                if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
                  deleteEmployee(emp.id);
                  setSelectedEmployeeId(null);
                }
              }}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
            >
              <Trash2 size={18} />
              حذف
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Basic Info */}
            <div className="space-y-6">
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

              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-4">
                <h4 className="font-bold text-white flex items-center gap-2 mb-2">
                  <Info size={18} className="text-red-500" />
                  معلومات التواصل
                </h4>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                    <Phone size={14} />
                  </div>
                  <span className="text-slate-300">{emp.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                    <Mail size={14} />
                  </div>
                  <span className="text-slate-300">{emp.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                    <MapPin size={14} />
                  </div>
                  <span className="text-slate-300">{emp.address}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-4">
                <h4 className="font-bold text-white flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-red-500" />
                  الصلاحيات والأمان
                </h4>
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
                    {emp.permissions.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-slate-800 border border-white/5 rounded text-[9px] text-slate-300">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-red-500" />
                  ملاحظات إدارية
                </h4>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 min-h-[100px]">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {emp.notes || 'لا توجد ملاحظات إضافية لهذا الموظف.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Tabs & Details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-2 flex gap-1">
                {(['OVERVIEW', 'ATTENDANCE', 'SCHEDULE', 'LOGS'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      activeTab === tab ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'OVERVIEW' ? 'نظرة عامة' : tab === 'ATTENDANCE' ? 'الحضور' : tab === 'SCHEDULE' ? 'الجدول' : 'السجل'}
                  </button>
                ))}
              </div>

              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                      <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <BarChart3 size={18} className="text-red-500" />
                        إحصائيات الأداء
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">إجمالي المبيعات</span>
                          <span className="text-lg font-bold text-emerald-500">${emp.performance?.totalSales.toFixed(2) || '0.00'}</span>
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
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                      <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Timer size={18} className="text-red-500" />
                        الشفت الحالي
                      </h4>
                      <div className="text-center py-4">
                        {activeAttendance ? (
                          <>
                            <p className="text-3xl font-black text-white mb-2">08:45:12</p>
                            <p className="text-xs text-slate-500">منذ الدخول في {new Date(activeAttendance.checkIn).toLocaleTimeString('ar-SA')}</p>
                            <button 
                              onClick={() => checkOut(emp.id)}
                              className="mt-6 w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-bold transition-all"
                            >
                              تسجيل خروج (Check Out)
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-bold text-slate-500 mb-4">غير مسجل دخول</p>
                            <button 
                              onClick={() => checkIn(emp.id)}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl font-bold transition-all"
                            >
                              تسجيل دخول (Check In)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <History size={18} className="text-red-500" />
                      آخر النشاطات
                    </h4>
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
              )}

              {activeTab === 'ATTENDANCE' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Clock size={18} className="text-red-500" />
                      سجل الحضور والانصراف
                    </h4>
                    <button 
                      onClick={() => {
                        setAttendanceForm({
                          employeeId: emp.id,
                          date: new Date(),
                          status: 'PRESENT'
                        });
                        setShowAttendanceModal(true);
                      }}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold text-xs transition-all"
                    >
                      <Plus size={14} />
                      إضافة سجل يدوي
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
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                att.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500' : 
                                att.status === 'LATE' ? 'bg-orange-500/10 text-orange-500' : 
                                'bg-red-500/10 text-red-500'
                              }`}>
                                {att.status === 'PRESENT' ? 'حاضر' : att.status === 'LATE' ? 'متأخر' : 'غائب'}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-500">{att.note || '---'}</td>
                            <td className="p-4">
                              <button 
                                onClick={() => deleteAttendance(att.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={6} className="p-10 text-center text-slate-500">لا يوجد سجل حضور لهذا الموظف</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'SCHEDULE' && (
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
                      {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => {
                        const sch = workSchedules.find(s => s.employeeId === emp.id && s.day === day);
                        return (
                          <tr key={day} className="text-sm">
                            <td className="p-4 text-white font-bold">{day}</td>
                            <td className="p-4 text-slate-300 font-mono">{sch?.startTime || '09:00'}</td>
                            <td className="p-4 text-slate-300 font-mono">{sch?.endTime || '17:00'}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sch?.isOff ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                              }`}>
                                {sch?.isOff ? 'إجازة' : 'دوام'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'LOGS' && (
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
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAddEditModal = () => {
    const isEditing = !!editingEmployee;
    
    return (
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false);
                setEditingEmployee(null);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    {isEditing ? <Edit2 size={20} /> : <UserPlus size={20} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{isEditing ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}</h3>
                    <p className="text-xs text-slate-500">أدخل البيانات المطلوبة بدقة</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEmployee(null);
                  }}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form 
                className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data: any = {
                    name: formData.get('name'),
                    employeeId: formData.get('employeeId'),
                    phone: formData.get('phone'),
                    email: formData.get('email'),
                    address: formData.get('address'),
                    nationalId: formData.get('nationalId'),
                    dob: new Date(formData.get('dob') as string),
                    hireDate: new Date(formData.get('hireDate') as string),
                    salary: Number(formData.get('salary')),
                    status: formData.get('status'),
                    role: formData.get('role'),
                    jobTitleId: formData.get('jobTitleId'),
                    departmentId: formData.get('departmentId'),
                    branchId: formData.get('branchId'),
                    typeId: formData.get('typeId'),
                    username: formData.get('username'),
                    pin: formData.get('pin'),
                    permissions: editingEmployee?.permissions || ['VIEW_ORDERS'],
                    notes: formData.get('notes')
                  };

                  if (isEditing) {
                    updateEmployee(editingEmployee.id, data);
                  } else {
                    addEmployee(data);
                  }
                  setShowAddModal(false);
                  setEditingEmployee(null);
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Users size={14} /> الاسم الكامل
                    </label>
                    <input 
                      name="name"
                      defaultValue={editingEmployee?.name}
                      required
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
                      placeholder="أدخل الاسم الرباعي"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Hash size={14} /> الرقم الوظيفي
                    </label>
                    <input 
                      name="employeeId"
                      defaultValue={editingEmployee?.employeeId}
                      required
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all font-mono"
                      placeholder="EMP-000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Phone size={14} /> رقم الجوال
                    </label>
                    <input 
                      name="phone"
                      defaultValue={editingEmployee?.phone}
                      required
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
                      placeholder="059-000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <AtSign size={14} /> البريد الإلكتروني
                    </label>
                    <input 
                      name="email"
                      type="email"
                      defaultValue={editingEmployee?.email}
                      required
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
                      placeholder="example@resto.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">الفرع</label>
                    <select 
                      name="branchId"
                      defaultValue={editingEmployee?.branchId}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
                    >
                      {useApp().branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">القسم</label>
                    <select 
                      name="departmentId"
                      defaultValue={editingEmployee?.departmentId}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
                    >
                      {departments.map(d => <option key={d.id} value={d.id}>{d.nameAr}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">المسمى الوظيفي</label>
                    <select 
                      name="jobTitleId"
                      defaultValue={editingEmployee?.jobTitleId}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
                    >
                      {jobTitles.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">الدور في النظام</label>
                    <select 
                      name="role"
                      defaultValue={editingEmployee?.role}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
                    >
                      <option value="ADMIN">مدير نظام</option>
                      <option value="BRANCH_MANAGER">مدير فرع</option>
                      <option value="CASHIER">كاشير</option>
                      <option value="WAITER">ويتر</option>
                      <option value="COOK">طباخ</option>
                      <option value="FINANCE">محاسب</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">الحالة</label>
                    <select 
                      name="status"
                      defaultValue={editingEmployee?.status}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all"
                    >
                      {Object.values(EmployeeStatus).map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">اسم المستخدم (للدخول)</label>
                    <input 
                      name="username"
                      defaultValue={editingEmployee?.username}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all font-mono"
                      placeholder="user.name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">رمز الـ PIN (4 أرقام)</label>
                    <input 
                      name="pin"
                      maxLength={4}
                      defaultValue={editingEmployee?.pin}
                      className="w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all font-mono"
                      placeholder="0000"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingEmployee(null);
                    }}
                    className="px-8 py-3 rounded-2xl text-slate-400 font-bold hover:bg-white/5 transition-all"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit"
                    className="bg-red-500 hover:bg-red-600 text-white px-10 py-3 rounded-2xl font-bold shadow-xl shadow-red-500/20 transition-all flex items-center gap-2"
                  >
                    <Save size={18} />
                    {isEditing ? 'حفظ التعديلات' : 'إضافة الموظف'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {selectedEmployee && renderProfile(selectedEmployee)}
      {renderAddEditModal()}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setShowAttendanceModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-6">إضافة سجل حضور يدوي</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">التاريخ</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-red-500/50"
                  value={attendanceForm.date ? new Date(attendanceForm.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setAttendanceForm({...attendanceForm, date: new Date(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">وقت الدخول</label>
                  <input 
                    type="time" 
                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-red-500/50"
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const date = new Date(attendanceForm.date || new Date());
                      date.setHours(parseInt(hours), parseInt(minutes));
                      setAttendanceForm({...attendanceForm, checkIn: date});
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">وقت الخروج</label>
                  <input 
                    type="time" 
                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-red-500/50"
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const date = new Date(attendanceForm.date || new Date());
                      date.setHours(parseInt(hours), parseInt(minutes));
                      setAttendanceForm({...attendanceForm, checkOut: date});
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">الحالة</label>
                <select 
                  className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-red-500/50"
                  value={attendanceForm.status}
                  onChange={(e) => setAttendanceForm({...attendanceForm, status: e.target.value as any})}
                >
                  <option value="PRESENT">حاضر</option>
                  <option value="LATE">متأخر</option>
                  <option value="ABSENT">غائب</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">ملاحظات</label>
                <textarea 
                  className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-red-500/50 h-20"
                  placeholder="أدخل أي ملاحظات إضافية..."
                  value={attendanceForm.note || ''}
                  onChange={(e) => setAttendanceForm({...attendanceForm, note: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowAttendanceModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => {
                    if (attendanceForm.employeeId && attendanceForm.date && attendanceForm.status) {
                      recordAttendance(attendanceForm as any);
                      setShowAttendanceModal(false);
                    }
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-all"
                >
                  حفظ السجل
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Users className="text-red-500" size={28} />
            إدارة الموظفين
          </h1>
          <p className="text-slate-500 text-sm mt-1">إدارة بيانات الموظفين، الصلاحيات، والحضور والانصراف</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-red-500/20 transition-all"
          >
            <UserPlus size={18} />
            إضافة موظف جديد
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بالاسم أو الرقم الوظيفي..." 
            className="w-full bg-slate-900 border border-white/5 rounded-2xl py-2.5 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-900 border border-white/5 text-white px-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:border-red-500/50 transition-all"
          >
            <option value="ALL">جميع الأقسام</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.nameAr}</option>)}
          </select>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-white/5 text-white px-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:border-red-500/50 transition-all"
          >
            <option value="ALL">جميع الحالات</option>
            {Object.values(EmployeeStatus).map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
          </select>
          <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setViewMode('GRID')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('TABLE')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'TABLE' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Employee List */}
      {viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map(emp => renderEmployeeCard(emp))}
        </div>
      ) : (
        renderEmployeeTable()
      )}

      {filteredEmployees.length === 0 && (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-white/10">
          <Users size={48} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-400">لا يوجد موظفين يطابقون البحث</h3>
          <p className="text-sm text-slate-600">جرب تغيير معايير البحث أو التصفية</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
