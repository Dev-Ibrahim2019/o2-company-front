// src/features/employees/components/EmployeeTable.tsx

import { Eye, Edit2, Trash2 } from "lucide-react";
import type { EmployeeFromApi } from "../../../../services/employeeService";
import { getStatusColor, getStatusLabel } from "../utils";

interface Props {
    employees: EmployeeFromApi[];
    departments: { id: number; name: string }[];
    onEdit: (emp: EmployeeFromApi) => void;
    onDelete: (id: number) => void;
    onSelect: (emp: EmployeeFromApi) => void;
}

const EmployeeTable = ({ employees, departments, onEdit, onDelete, onSelect }: Props) => (
    <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-right">
            <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-xs border-b border-white/5">
                    <th className="p-4 font-medium">الموظف</th>
                    <th className="p-4 font-medium">الدور</th>
                    <th className="p-4 font-medium">القسم</th>
                    <th className="p-4 font-medium">الهاتف</th>
                    <th className="p-4 font-medium">تاريخ التوظيف</th>
                    <th className="p-4 font-medium">الحالة</th>
                    <th className="p-4 font-medium">الإجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {employees.map((emp) => {
                    const dept = departments.find((d) => d.id === emp.department_id);
                    return (
                        <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                            {/* الموظف */}
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-red-500 overflow-hidden shrink-0">
                                        {emp.image
                                            ? <img src={emp.image} alt={emp.name} className="w-full h-full object-cover" />
                                            : emp.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                                            {emp.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-mono">
                                            {emp.employeeId || `#${emp.id}`}
                                        </p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-sm text-slate-300">{emp.role}</td>
                            <td className="p-4 text-sm text-slate-300">{dept?.name || "---"}</td>
                            <td className="p-4 text-sm text-slate-400 font-mono">{emp.phone}</td>
                            <td className="p-4 text-sm text-slate-400">
                                {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString("ar-SA") : "---"}
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${getStatusColor(emp.status)}`}>
                                    {getStatusLabel(emp.status)}
                                </span>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-1">
                                    <ActionBtn onClick={() => onSelect(emp)} color="blue" title="عرض"><Eye size={14} /></ActionBtn>
                                    <ActionBtn onClick={() => onEdit(emp)} color="emerald" title="تعديل"><Edit2 size={14} /></ActionBtn>
                                    <ActionBtn onClick={() => onDelete(emp.id)} color="red" title="حذف"><Trash2 size={14} /></ActionBtn>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

const COLOR_MAP = {
    blue: "hover:bg-blue-500/10 hover:text-blue-500",
    emerald: "hover:bg-emerald-500/10 hover:text-emerald-500",
    red: "hover:bg-red-500/10 hover:text-red-500",
};

const ActionBtn = ({
    onClick, color, title, children,
}: { onClick: () => void; color: keyof typeof COLOR_MAP; title: string; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        title={title}
        className={`p-1.5 rounded-lg text-slate-500 transition-all ${COLOR_MAP[color]}`}
    >
        {children}
    </button>
);

export default EmployeeTable;