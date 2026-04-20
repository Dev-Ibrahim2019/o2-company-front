import React, { useState } from "react";
import { useApp } from "../../../../store";
import {
  Building2,
  Network,
  Users2,
  Plus,
  Search,
  Edit3,
  Trash2,
  Mail,
  Smartphone,
  Shield,
  Clock,
  CheckCircle2,
  Hash,
} from "lucide-react";
import { EmployeeStatus } from "../../../../types";
import { motion } from "framer-motion";

type Props = {
  onAdd: (type: "EMP") => void;
  onEdit: (type: "EMP", id: string, data: any) => void;
};

const RenderEmployees: React.FC<Props> = ({ onAdd, onEdit }) => {
  const { branches, departments, jobTitles, employees, deleteEmployee } =
    useApp();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/20 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
        <div>
          <h3 className="text-lg font-black text-white tracking-tighter">
            سجل الموظفين
          </h3>
          <p className="text-slate-500 font-bold mt-1 flex items-center gap-2 text-[10px]">
            <span className="w-4 h-[1px] bg-emerald-600"></span>
            إدارة بيانات الكادر الوظيفي، الصلاحيات، والوصول الآمن
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="بحث بالاسم، المعرف، أو الهاتف..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-2.5 pr-11 pl-4 text-xs text-white focus:ring-2 focus:ring-emerald-600 outline-none transition-all backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => onAdd("EMP")}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={18} /> إضافة موظف
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees
          .filter(
            (e) => e.name.includes(searchQuery) || e.id.includes(searchQuery),
          )
          .map((emp, idx) => {
            const job = jobTitles.find((j) => j.id === emp.jobTitleId);
            const dept = departments.find((d) => d.id === emp.departmentId);
            const branch = branches.find((b) => b.id === emp.branchId);

            return (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/5 shadow-xl group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-xl -mr-12 -mt-12 group-hover:bg-emerald-600/10 transition-colors duration-700"></div>

                <div className="flex items-start justify-between mb-2 relative z-10">
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <div className="w-7 h-7 bg-slate-800 rounded-lg overflow-hidden border border-white/5 shadow-lg flex items-center justify-center text-slate-600 group-hover:border-emerald-600/50 transition-all duration-500">
                        {emp.image ? (
                          <img
                            src={emp.image}
                            alt={emp.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users2 size={12} />
                        )}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-md flex items-center justify-center border border-slate-900 shadow-md ${emp.status === EmployeeStatus.ACTIVE ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"}`}
                      >
                        {emp.status === EmployeeStatus.ACTIVE ? (
                          <CheckCircle2 size={5} />
                        ) : (
                          <Clock size={5} />
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white leading-tight tracking-tight">
                        {emp.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-emerald-600/10 text-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-600/20">
                          {job?.name || "Unassigned Role"}
                        </span>
                      </div>
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                        <Hash size={10} className="text-slate-700" /> ID:{" "}
                        {emp.employeeId}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <button
                      onClick={() => onEdit("EMP", emp.id, emp)}
                      className="p-1 bg-slate-800/80 text-slate-400 hover:text-white rounded-lg shadow-md border border-white/5 backdrop-blur-md hover:border-emerald-600/30"
                    >
                      <Edit3 size={10} />
                    </button>
                    <button
                      onClick={() => deleteEmployee(emp.id)}
                      className="p-1 bg-slate-800/80 text-slate-400 hover:text-red-500 rounded-lg shadow-md border border-white/5 backdrop-blur-md hover:border-red-500/30"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 relative z-10">
                  <div className="bg-slate-950/50 p-1.5 rounded-xl border border-white/5 group-hover:border-emerald-600/20 transition-colors">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                      <Network size={10} className="text-blue-500" /> Dept
                    </p>
                    <p className="text-xs font-black text-white truncate">
                      {dept?.nameAr || dept?.name || "General"}
                    </p>
                  </div>
                  <div className="bg-slate-950/50 p-1.5 rounded-xl border border-white/5 group-hover:border-emerald-600/20 transition-colors">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                      <Building2 size={10} className="text-red-500" /> Branch
                    </p>
                    <p className="text-xs font-black text-white truncate">
                      {branch?.name || "HQ"}
                    </p>
                  </div>
                </div>

                {/* Performance Metrics (Mocked for UI Enhancement) */}
                <div className="bg-slate-950/30 p-2 rounded-xl border border-white/5 mb-3 relative z-10 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Performance
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div
                          key={star}
                          className={`w-1 h-1 rounded-full ${star <= 4 ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-slate-800"}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-0.5">
                      Attendance
                    </span>
                    <span className="text-xs font-black text-emerald-500">
                      98.4%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                        <Smartphone size={10} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400">
                        {emp.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors">
                        <Mail size={10} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 truncate max-w-[70px]">
                        {emp.email || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-lg border border-white/5">
                    <Shield size={10} className="text-slate-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      {emp.role}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
};

export default RenderEmployees;
