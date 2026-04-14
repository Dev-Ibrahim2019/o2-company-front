import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import type { Employee, Department, JobTitle } from '../../../../../types';
import { getStatusColor, getStatusLabel } from '../utils';

interface EmployeeTableProps {
    employees: Employee[];
    departments: Department[];
    jobTitles: JobTitle[];
    onEdit: (emp: Employee) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees, departments, jobTitles, onEdit, onDelete, onSelect }) => (
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
                {employees.map(emp => {
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
                                    <button onClick={() => onSelect(emp.id)} className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-500 transition-all">
                                        <Eye size={16} />
                                    </button>
                                    <button onClick={() => onEdit(emp)} className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-500 hover:text-emerald-500 transition-all">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => onDelete(emp.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all">
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

export default EmployeeTable;