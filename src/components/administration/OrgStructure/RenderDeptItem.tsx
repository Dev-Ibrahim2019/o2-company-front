import { useState } from "react";
import { useApp } from "../../../../store";
import type { Department } from "../../../../types";
import { motion } from "framer-motion";
import {
  Network,
  Users2,
  ChevronRight,
  ChevronDown,
  Edit3,
  Trash2,
  Clock,
  Zap,
} from "lucide-react";

interface Props {
  dept: Department;
  level?: number;
  onEdit: (type: "DEPT", id: string, data: any) => void;
}

const RenderDeptItem: React.FC<Props> = ({ dept, level = 0 , onEdit}) => {
  const { departments, employees, deleteDepartment, addNotification } =
    useApp();
  const buildDeptTree = (parentId?: string) =>
    departments.filter((d) => d.parentId === parentId);
  const children = buildDeptTree(dept.id);
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  const isExpanded = expandedDepts.includes(dept.id);
  const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
  const toggleDept = (id: string) => {
    setExpandedDepts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const [modalType, setModalType] = useState<
    "BRANCH" | "DEPT" | "JOB_TITLE" | "JOB_TYPE" | "EMP" | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const handleEdit = (type: typeof modalType, id: string, data: any) => {
    setEditingId(id);
    setModalType(type);
    setFormData(data);
  };

  return (
    <div key={dept.id} className="relative">
      {level > 0 && (
        <div
          className="absolute right-[-1.5rem] top-0 bottom-0 w-[1px] bg-slate-800/50"
          style={{ marginRight: `${(level - 1) * 2}rem` }}
        >
          <div className="absolute top-8 right-0 w-4 h-[1px] bg-slate-800/50"></div>
        </div>
      )}
      <div className="space-y-2">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -3 }}
          className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-500 ${
            level === 0
              ? "bg-slate-900 shadow-lg border-white/10"
              : "bg-slate-900/40 border-white/5 backdrop-blur-sm"
          } group hover:border-red-600/40 relative overflow-hidden`}
          style={{ marginRight: `${level * 1.5}rem` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/0 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => toggleDept(dept.id)}
              className={`p-1 rounded-md transition-all duration-300 ${
                children.length > 0
                  ? "bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white shadow-lg border border-white/5"
                  : "opacity-0 cursor-default"
              }`}
            >
              {isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} className="rotate-180" />
              )}
            </button>

            <div className="relative">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110"
                style={{
                  backgroundColor: dept.color
                    ? `${dept.color}15`
                    : "rgba(220, 38, 38, 0.1)",
                  color: dept.color || "#dc2626",
                  border: `1px solid ${dept.color ? `${dept.color}30` : "rgba(220, 38, 38, 0.2)"}`,
                }}
              >
                <span className="text-lg">
                  {dept.icon || <Network size={14} />}
                </span>
              </div>
              {dept.hasKds && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <Zap size={5} className="text-white fill-white" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-white text-base tracking-tight">
                  {dept.nameAr || dept.name}
                </h4>
                <div className="flex gap-1">
                  <span className="bg-slate-800 text-slate-400 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-white/5 shadow-inner">
                    {dept.shortName || "UNIT"}
                  </span>
                  {dept.type && (
                    <span className="bg-red-600/10 text-red-500 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-red-600/20">
                      {dept.type}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1 text-slate-500 group-hover:text-slate-400 transition-colors">
                  <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]"></div>
                  <p className="text-xs font-black uppercase tracking-widest flex items-center gap-1">
                    <Users2 size={12} className="text-slate-600" />{" "}
                    {deptEmployees.length} موظف
                  </p>
                </div>
                <div className="flex items-center gap-1 text-slate-500 group-hover:text-slate-400 transition-colors">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"></div>
                  <p className="text-xs font-black uppercase tracking-widest flex items-center gap-1">
                    <Clock size={12} className="text-slate-600" />{" "}
                    {dept.defaultPrepTime || 15} دقيقة
                  </p>
                </div>
                <div className="flex items-center gap-1 text-slate-500 group-hover:text-slate-400 transition-colors">
                  <div className="w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.5)]"></div>
                  <p className="text-xs font-black uppercase tracking-widest flex items-center gap-1">
                    <Zap size={12} className="text-slate-600" /> 92% كفاءة
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0 transition-all duration-500 relative z-10">
            <button
              onClick={() =>
                onEdit("DEPT", dept.id, dept)
              }
              className="p-2 bg-slate-800 text-slate-400 hover:text-blue-400 rounded-xl transition-all shadow-xl border border-white/5 hover:border-blue-400/30"
            >
              <Edit3 size={12} />
            </button>
            <button
              onClick={() => {
                if (deptEmployees.length > 0 || children.length > 0) {
                  addNotification(
                    "لا يمكن حذف قسم يحتوي على موارد بشرية أو تبعيات هيكلية!",
                  );
                  return;
                }
                deleteDepartment(dept.id);
              }}
              className="p-2 bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all shadow-xl border border-white/5 hover:border-red-500/30"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </motion.div>
        {isExpanded && children.length > 0 && (
          <div className="space-y-2 pt-1">
            {children.map((child) => (
              <RenderDeptItem key={child.id} dept={child} level={level + 1} onEdit={onEdit}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RenderDeptItem;