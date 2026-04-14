import React, { useState, useMemo } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { useApp } from '../../../../store';
import { EmployeeStatus } from '../../../../types';
import type { Employee, Attendance } from '../../../../types';

import EmployeeCard from './components/EmployeeCard';
import EmployeeTable from './components/EmployeeTable';
import EmployeeFilters from './components/EmployeeFilters';
import EmployeeProfile from './components/EmployeeProfile';
import AddEditEmployeeModal from './components/AddEditEmployeeModal';
import AttendanceModal from './components/AttendanceModal';

const EmployeeManagement: React.FC = () => {
    const {
        employees, departments, jobTitles, branches,
        attendances, workSchedules, activityLogs,
        checkIn, checkOut, recordAttendance, deleteAttendance,
        updateEmployee, deleteEmployee, addEmployee,
    } = useApp();

    // ── UI State ───────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [attendanceEmployeeId, setAttendanceEmployeeId] = useState<string>('');

    // ── Derived data ───────────────────────────────────────────────────────────
    const filteredEmployees = useMemo(() =>
        employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (emp.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = selectedDept === 'ALL' || emp.departmentId === selectedDept;
            const matchesStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;
            return matchesSearch && matchesDept && matchesStatus;
        }),
        [employees, searchQuery, selectedDept, selectedStatus]);

    const selectedEmployee = useMemo(() =>
        employees.find(e => e.id === selectedEmployeeId),
        [employees, selectedEmployeeId]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const openEdit = (emp: Employee) => { setEditingEmployee(emp); setShowAddModal(true); };
    const closeModal = () => { setShowAddModal(false); setEditingEmployee(null); };

    const handleSubmit = (data: Partial<Employee>) => {
        if (editingEmployee) updateEmployee(editingEmployee.id, data);
        else addEmployee(data as Employee);
        closeModal();
    };

    const openAttendanceModal = (employeeId: string) => {
        setAttendanceEmployeeId(employeeId);
        setShowAttendanceModal(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Full-screen profile overlay */}
            {selectedEmployee && (
                <EmployeeProfile
                    emp={selectedEmployee}
                    dept={departments.find(d => d.id === selectedEmployee.departmentId)}
                    title={jobTitles.find(t => t.id === selectedEmployee.jobTitleId)}
                    attendances={attendances}
                    activityLogs={activityLogs}
                    workSchedules={workSchedules}
                    onBack={() => setSelectedEmployeeId(null)}
                    onEdit={openEdit}
                    onDelete={id => { deleteEmployee(id); setSelectedEmployeeId(null); }}
                    onCheckIn={checkIn}
                    onCheckOut={checkOut}
                    onAddAttendance={openAttendanceModal}
                    onDeleteAttendance={deleteAttendance}
                />
            )}

            {/* Add / Edit modal */}
            <AddEditEmployeeModal
                isOpen={showAddModal}
                editingEmployee={editingEmployee}
                departments={departments}
                jobTitles={jobTitles}
                branches={branches}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />

            {/* Attendance modal */}
            {showAttendanceModal && (
                <AttendanceModal
                    employeeId={attendanceEmployeeId}
                    onClose={() => setShowAttendanceModal(false)}
                    onSave={record => recordAttendance(record as Attendance)}
                />
            )}

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Users className="text-red-500" size={28} />
                        إدارة الموظفين
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">إدارة بيانات الموظفين، الصلاحيات، والحضور والانصراف</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-red-500/20 transition-all"
                >
                    <UserPlus size={18} /> إضافة موظف جديد
                </button>
            </div>

            {/* ── Filters ─────────────────────────────────────────────────────── */}
            <EmployeeFilters
                searchQuery={searchQuery} onSearchChange={setSearchQuery}
                selectedDept={selectedDept} onDeptChange={setSelectedDept}
                selectedStatus={selectedStatus} onStatusChange={setSelectedStatus}
                viewMode={viewMode} onViewModeChange={setViewMode}
                departments={departments}
            />

            {/* ── Employee List ────────────────────────────────────────────────── */}
            {viewMode === 'GRID' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredEmployees.map(emp => (
                        <EmployeeCard
                            key={emp.id}
                            emp={emp}
                            dept={departments.find(d => d.id === emp.departmentId)}
                            title={jobTitles.find(t => t.id === emp.jobTitleId)}
                            onEdit={openEdit}
                            onDelete={deleteEmployee}
                            onSelect={setSelectedEmployeeId}
                        />
                    ))}
                </div>
            ) : (
                <EmployeeTable
                    employees={filteredEmployees}
                    departments={departments}
                    jobTitles={jobTitles}
                    onEdit={openEdit}
                    onDelete={deleteEmployee}
                    onSelect={setSelectedEmployeeId}
                />
            )}

            {/* ── Empty state ─────────────────────────────────────────────────── */}
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