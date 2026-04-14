import React from 'react';
import { X, Save, UserPlus, Edit2, Users, Hash, Phone, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmployeeStatus } from '../../../../../types';
import type { Employee, Department, JobTitle } from '../../../../../types';
import { getStatusLabel } from '../utils';

interface AddEditEmployeeModalProps {
    isOpen: boolean;
    editingEmployee: Employee | null;
    departments: Department[];
    jobTitles: JobTitle[];
    branches: { id: string; name: string }[];
    onClose: () => void;
    onSubmit: (data: Partial<Employee>) => void;
}

const inputCls = "w-full bg-slate-800 border border-white/5 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-red-500/50 transition-all";
const labelCls = "text-xs font-bold text-slate-500 uppercase flex items-center gap-2";

const AddEditEmployeeModal: React.FC<AddEditEmployeeModalProps> = ({
    isOpen, editingEmployee, departments, jobTitles, branches, onClose, onSubmit,
}) => {
    const isEditing = !!editingEmployee;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data: Partial<Employee> = {
            name: fd.get('name') as string,
            employeeId: fd.get('employeeId') as string,
            phone: fd.get('phone') as string,
            email: fd.get('email') as string,
            address: fd.get('address') as string,
            nationalId: fd.get('nationalId') as string,
            dob: new Date(fd.get('dob') as string),
            hireDate: new Date(fd.get('hireDate') as string),
            salary: Number(fd.get('salary')),
            status: fd.get('status') as string,
            role: fd.get('role') as string,
            jobTitleId: fd.get('jobTitleId') as string,
            departmentId: fd.get('departmentId') as string,
            branchId: fd.get('branchId') as string,
            typeId: fd.get('typeId') as string,
            username: fd.get('username') as string,
            pin: fd.get('pin') as string,
            permissions: editingEmployee?.permissions || ['VIEW_ORDERS'],
            notes: fd.get('notes') as string,
        };
        onSubmit(data);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
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
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {/* Personal Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={labelCls}><Users size={14} /> الاسم الكامل</label>
                                    <input name="name" defaultValue={editingEmployee?.name} required className={inputCls} placeholder="أدخل الاسم الرباعي" />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}><Hash size={14} /> الرقم الوظيفي</label>
                                    <input name="employeeId" defaultValue={editingEmployee?.employeeId} required className={`${inputCls} font-mono`} placeholder="EMP-000" />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}><Phone size={14} /> رقم الجوال</label>
                                    <input name="phone" defaultValue={editingEmployee?.phone} required className={inputCls} placeholder="059-000-0000" />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}><AtSign size={14} /> البريد الإلكتروني</label>
                                    <input name="email" type="email" defaultValue={editingEmployee?.email} required className={inputCls} placeholder="example@resto.com" />
                                </div>
                            </div>

                            {/* Branch / Department / Job Title */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">الفرع</label>
                                    <select name="branchId" defaultValue={editingEmployee?.branchId} className={inputCls}>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">القسم</label>
                                    <select name="departmentId" defaultValue={editingEmployee?.departmentId} className={inputCls}>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.nameAr}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">المسمى الوظيفي</label>
                                    <select name="jobTitleId" defaultValue={editingEmployee?.jobTitleId} className={inputCls}>
                                        {jobTitles.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Role / Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">الدور في النظام</label>
                                    <select name="role" defaultValue={editingEmployee?.role} className={inputCls}>
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
                                    <select name="status" defaultValue={editingEmployee?.status} className={inputCls}>
                                        {Object.values(EmployeeStatus).map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Credentials */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">اسم المستخدم (للدخول)</label>
                                    <input name="username" defaultValue={editingEmployee?.username} className={`${inputCls} font-mono`} placeholder="user.name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">رمز الـ PIN (4 أرقام)</label>
                                    <input name="pin" maxLength={4} defaultValue={editingEmployee?.pin} className={`${inputCls} font-mono`} placeholder="0000" />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={onClose} className="px-8 py-3 rounded-2xl text-slate-400 font-bold hover:bg-white/5 transition-all">
                                    إلغاء
                                </button>
                                <button type="submit" className="bg-red-500 hover:bg-red-600 text-white px-10 py-3 rounded-2xl font-bold shadow-xl shadow-red-500/20 transition-all flex items-center gap-2">
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

export default AddEditEmployeeModal;