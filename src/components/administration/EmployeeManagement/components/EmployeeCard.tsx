import React from 'react';
import { Briefcase, Building2, Calendar, Edit2, Trash2, Eye, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Employee, Department, JobTitle } from '../../../../../types';
import { getStatusColor, getStatusLabel } from '../utils';

interface EmployeeCardProps {
    emp: Employee;
    dept?: Department;
    title?: JobTitle;
    onEdit: (emp: Employee) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ emp, dept, title, onEdit, onDelete, onSelect }) => (
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
                    {emp.image
                        ? <img src={emp.image} alt={emp.name} className="w-full h-full object-cover" />
                        : emp.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-bold text-white group-hover:text-red-400 transition-colors">{emp.name}</h3>
                    <p className="text-xs text-slate-500">{emp.employeeId}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onEdit(emp)} className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-500 hover:text-emerald-500 transition-all">
                    <Edit2 size={16} />
                </button>
                <button onClick={() => onDelete(emp.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all">
                    <Trash2 size={16} />
                </button>
                <button onClick={() => onSelect(emp.id)} className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-500 transition-all">
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
                onClick={() => onSelect(emp.id)}
                className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-all"
            >
                الملف الشخصي
                <ChevronRight size={14} />
            </button>
        </div>
    </motion.div>
);

export default EmployeeCard;