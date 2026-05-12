import React from "react";
import type { Branch } from "../../../../types";
import {
  Users,
  Edit2,
  Trash2,
  Building2,
  Map,
  Shield,
  Smartphone,
} from "lucide-react";

// ✅ تعريف Employee بشكل مبسط (من الـ API)
interface EmployeeFromApi {
  id: number;
  name: string;
  branch_id?: number;
  branchId?: number;
  department_id?: number;
}

interface BranchTableProps {
  branches: Branch[];
  employees: EmployeeFromApi[];
  onEdit: (branch: Branch) => void;
  onDelete: (id: number) => void;
}

const BranchTable: React.FC<BranchTableProps> = ({
  branches,
  employees,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5 bg-white/5">
                <th className="p-6">معلومات الفرع</th>
                <th className="p-6">الموقع والتواصل</th>
                <th className="p-6 text-center">القوى العاملة</th>
                <th className="p-6">الحالة التشغيلية</th>
                <th className="p-6 text-center">العمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {branches.map((branch) => {
                // ✅ مقارنة branch_id أو branchId (كلاهما ممكن يأتي من الـ API)
                const employeeCount = employees.filter(
                  (e) =>
                    e.branch_id === branch.id || e.branchId === branch.id
                ).length;

                return (
                  <tr
                    key={branch.id}
                    className="group hover:bg-white/[0.02] transition-all duration-300"
                  >
                    {/* Branch Info */}
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-500 ${branch.isMainBranch
                              ? "bg-gradient-to-br from-red-500 to-red-700 shadow-red-900/20"
                              : "bg-slate-800 shadow-black/20"
                            }`}
                        >
                          <Building2 size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-white text-base">
                              {branch.name}
                            </p>
                            {branch.isMainBranch && (
                              <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-red-500/20 uppercase tracking-tighter">
                                الرئيسي
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-mono">
                            #{branch.code}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Location & Contact */}
                    <td className="p-6 space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Map size={14} className="text-slate-500" />
                        <span className="text-sm font-bold">
                          {branch.address || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Smartphone size={14} />
                        <span className="text-xs">{branch.phone || "—"}</span>
                      </div>
                    </td>

                    {/* Employees */}
                    <td className="p-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex -space-x-2 rtl:space-x-reverse">
                          {[...Array(Math.min(3, employeeCount))].map(
                            (_, i) => (
                              <div
                                key={i}
                                className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400"
                              >
                                <Users size={12} />
                              </div>
                            )
                          )}
                          {employeeCount > 3 && (
                            <div className="w-7 h-7 rounded-full border-2 border-slate-900 bg-red-600 flex items-center justify-center text-[8px] font-bold text-white">
                              +{employeeCount - 3}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase">
                          {employeeCount} موظف
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-6">
                      {/* ✅ استخدام is_active بدل status */}
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${branch.is_active
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${branch.is_active ? "bg-emerald-500" : "bg-red-500"
                            }`}
                        />
                        {branch.is_active ? "نشط" : "غير نشط"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEdit(branch)}
                          className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-lg shadow-blue-900/5"
                          title="تعديل البيانات"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "هل أنت متأكد من حذف هذا الفرع؟ سيؤدي ذلك لإخفائه من النظام."
                              )
                            ) {
                              onDelete(branch.id);
                            }
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 shadow-lg shadow-red-900/5"
                          title="حذف الفرع"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {branches.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-600 mx-auto mb-6 rotate-12">
              <Building2 size={40} />
            </div>
            <h3 className="text-xl font-black text-white mb-2">
              لا يوجد أفرع مطابقة
            </h3>
            <p className="text-slate-500 font-medium">
              جرب البحث بكلمات أخرى أو أضف فرعاً جديداً
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchTable;