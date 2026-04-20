// src/components/administration/EmployeeManagement/EmployeeManagement.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { Users, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';
import { useEmployees } from '../../../hooks/useEmployees';
import type { EmployeeFromApi, EmployeePayload } from '../../../services/employeeService';
import api from "../../../api/axios";

import EmployeeCard from './components/EmployeeCard';
import EmployeeTable from './components/EmployeeTable';
import EmployeeFilters from './components/EmployeeFilters';
import EmployeeProfile from './components/EmployeeProfile';
import EmployeeModal from './components/EmployeeModal';
import AttendanceModal from './components/AttendanceModal';

// ── جلب الأقسام والفروع من الـ API ───────────────────────────────────────────

interface SimpleOpt { id: number; name: string }

const useOptions = () => {
    const [departments, setDepartments] = useState<SimpleOpt[]>([]);
    const [branches, setBranches] = useState<SimpleOpt[]>([]);

    useEffect(() => {
        // جلب الأقسام
        api.get('/departments')
            .then(r => {
                const list = r.data.data as any[];
                setDepartments(list.map(d => ({ id: d.id, name: d.nameAr || d.name })));
            })
            .catch(err => console.error('departments error:', err));

        // جلب الفروع — إذا ما عندك branches route، استخدم قائمة ثابتة مؤقتاً
        api.get('/branches')
            .then(r => {
                const list = r.data.data as any[];
                setBranches(list.map(b => ({ id: b.id, name: b.name })));
            })
            .catch(() => {
                // fallback مؤقت
                setBranches([{ id: 1, name: 'الفرع الرئيسي' }]);
            });
    }, []);

    return { departments, branches };
};

// ── Main ──────────────────────────────────────────────────────────────────────

const EmployeeManagement: React.FC = () => {
    const { employees, loading, error, addEmployee, updateEmployee, deleteEmployee, refetch }
        = useEmployees();

    const { departments, branches } = useOptions();

    const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeFromApi | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<EmployeeFromApi | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [attendanceEmployee, setAttendanceEmployee] = useState<EmployeeFromApi | null>(null);

    const filteredEmployees = useMemo(() =>
        employees.filter(emp => {
            const q = searchQuery.toLowerCase();
            const matchSearch =
                emp.name.toLowerCase().includes(q) ||
                (emp.employeeId ?? '').toLowerCase().includes(q) ||
                emp.phone.includes(q);
            const matchDept = selectedDept === 'ALL' || String(emp.department_id) === selectedDept;
            const matchStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;
            return matchSearch && matchDept && matchStatus;
        }),
        [employees, searchQuery, selectedDept, selectedStatus],
    );

    const openAdd = () => { setEditingEmployee(null); setShowModal(true); };
    const openEdit = (emp: EmployeeFromApi) => { setEditingEmployee(emp); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditingEmployee(null); };

    const handleSave = async (payload: EmployeePayload) => {
        try {
            if (editingEmployee) {
                await updateEmployee(editingEmployee.id, payload);
            } else {
                await addEmployee(payload);
            }
            closeModal();
        } catch (e: any) {
            // إظهار خطأ الـ validation من Laravel
            const msg = e.response?.data?.message || 'فشل الحفظ';
            alert(msg);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
        await deleteEmployee(id);
        if (selectedEmployee?.id === id) setSelectedEmployee(null);
    };

    // ── Profile fullscreen ────────────────────────────────────────────────────
    if (selectedEmployee) {
        return (
            <>
                <EmployeeProfile
                    emp={selectedEmployee}
                    departments={departments}
                    branches={branches}
                    onBack={() => setSelectedEmployee(null)}
                    onEdit={emp => { setSelectedEmployee(null); openEdit(emp); }}
                    onDelete={handleDelete}
                    onAddAttendance={emp => setAttendanceEmployee(emp)}
                />
                {attendanceEmployee && (
                    <AttendanceModal
                        employeeId={String(attendanceEmployee.id)}
                        onClose={() => setAttendanceEmployee(null)}
                        onSave={() => setAttendanceEmployee(null)}
                    />
                )}
            </>
        );
    }

    // ── Main list ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {showModal && (
                <EmployeeModal
                    employee={editingEmployee}
                    departments={departments}
                    branches={branches}
                    onSave={handleSave}
                    onClose={closeModal}
                />
            )}

            {attendanceEmployee && (
                <AttendanceModal
                    employeeId={String(attendanceEmployee.id)}
                    onClose={() => setAttendanceEmployee(null)}
                    onSave={() => setAttendanceEmployee(null)}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Users className="text-red-500" size={28} />
                        إدارة الموظفين
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        إدارة بيانات الموظفين، الصلاحيات، والحضور والانصراف
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                        title="تحديث"
                    >
                        <RefreshCw size={17} />
                    </button>
                    <button
                        onClick={openAdd}
                        className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-red-500/20 transition-all"
                    >
                        <UserPlus size={17} /> إضافة موظف جديد
                    </button>
                </div>
            </div>

            {/* Filters */}
            <EmployeeFilters
                searchQuery={searchQuery} onSearchChange={setSearchQuery}
                selectedDept={selectedDept} onDeptChange={setSelectedDept}
                selectedStatus={selectedStatus} onStatusChange={setSelectedStatus}
                viewMode={viewMode} onViewModeChange={setViewMode}
                departments={departments}
            />

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-sm">
                    <AlertCircle size={17} />
                    {error}
                    <button onClick={() => refetch()} className="mr-auto underline text-xs">
                        إعادة المحاولة
                    </button>
                </div>
            )}

            {/* Skeleton */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-slate-900 border border-white/5 rounded-2xl p-5 animate-pulse">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-800" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-slate-800 rounded" />
                                <div className="h-3 bg-slate-800 rounded w-5/6" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Grid */}
            {!loading && viewMode === 'GRID' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredEmployees.map(emp => (
                        <EmployeeCard
                            key={emp.id}
                            emp={emp}
                            departments={departments}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onSelect={setSelectedEmployee}
                        />
                    ))}
                </div>
            )}

            {/* Table */}
            {!loading && viewMode === 'TABLE' && (
                <EmployeeTable
                    employees={filteredEmployees}
                    departments={departments}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onSelect={setSelectedEmployee}
                />
            )}

            {/* Empty */}
            {!loading && !error && filteredEmployees.length === 0 && (
                <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-white/10">
                    <Users size={48} className="mx-auto text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-400">لا يوجد موظفين</h3>
                    <p className="text-sm text-slate-600 mt-1">أضف موظفاً جديداً للبدء</p>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;