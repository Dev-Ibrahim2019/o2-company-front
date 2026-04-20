// src/features/employees/components/EmployeeCard.tsx

import { Briefcase, Building2, Calendar, Edit2, Trash2, Eye, ChevronRight } from "lucide-react";
import type { EmployeeFromApi } from "../../../../services/employeeService";
import { getStatusColor, getStatusLabel } from "../utils";

interface Props {
    emp: EmployeeFromApi;
    departments: { id: number; name: string }[];
    onEdit: (emp: EmployeeFromApi) => void;
    onDelete: (id: number) => void;
    onSelect: (emp: EmployeeFromApi) => void;
}

const EmployeeCard = ({ emp, departments, onEdit, onDelete, onSelect }: Props) => {
    const dept = departments.find((d) => d.id === emp.department_id);

    return (
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 hover:border-red-500/30 transition-all group relative overflow-hidden">

            {/* Glow خلفي عند الـ hover */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-red-500/10 transition-all pointer-events-none" />

            {/* ── رأس الكارت ── */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    {/* الصورة أو الحرف الأول */}
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-2xl font-bold text-red-500 overflow-hidden shrink-0">
                        {emp.image
                            ? <img src={emp.image} alt={emp.name} className="w-full h-full object-cover" />
                            : emp.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-white group-hover:text-red-400 transition-colors leading-tight">
                            {emp.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {emp.employeeId || `#${emp.id}`}
                        </p>
                    </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => onEdit(emp)}
                        className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-slate-500 hover:text-emerald-500 transition-all"
                        title="تعديل"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        onClick={() => onDelete(emp.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
                        title="حذف"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={() => onSelect(emp)}
                        className="p-1.5 hover:bg-blue-500/10 rounded-lg text-slate-500 hover:text-blue-500 transition-all"
                        title="عرض الملف"
                    >
                        <Eye size={14} />
                    </button>
                </div>
            </div>

            {/* ── تفاصيل ── */}
            <div className="space-y-2 mb-4 relative z-10">
                <InfoRow icon={<Briefcase size={13} />} text={emp.role} />
                <InfoRow icon={<Building2 size={13} />} text={dept?.name || "بدون قسم"} />
                <InfoRow
                    icon={<Calendar size={13} />}
                    text={emp.hireDate ? `توظيف: ${new Date(emp.hireDate).toLocaleDateString("ar-SA")}` : "---"}
                    muted
                />
            </div>

            {/* ── تذييل ── */}
            <div className="flex items-center justify-between relative z-10">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusColor(emp.status)}`}>
                    {getStatusLabel(emp.status)}
                </span>
                <button
                    onClick={() => onSelect(emp)}
                    className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-all"
                >
                    الملف الشخصي
                    <ChevronRight size={12} />
                </button>
            </div>
        </div>
    );
};

// مكوّن مساعد لصف المعلومات
const InfoRow = ({
    icon, text, muted = false,
}: { icon: React.ReactNode; text: string; muted?: boolean }) => (
    <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500 shrink-0">{icon}</span>
        <span className={`truncate ${muted ? "text-slate-400 text-xs" : "text-slate-300"}`}>{text}</span>
    </div>
);

export default EmployeeCard;