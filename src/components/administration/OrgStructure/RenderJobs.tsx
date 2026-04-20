import React, { useState } from "react";
import { useApp } from "../../../../store";
import {
  Briefcase,
  Users2,
  Plus,
  Edit3,
  Trash2,
  Layers,
  BadgeInfo,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  onAdd: (type: "JOB_TITLE") => void;
  onEdit: (type: "JOB_TITLE", id: string, data: any) => void;
};

const RenderJobs: React.FC<Props> = ({ onAdd, onEdit }) => {
  const { jobTitles, jobTypes, employees, deleteJobTitle, deleteJobType } =
    useApp();
  const [modalType, setModalType] = useState<
    "BRANCH" | "DEPT" | "JOB_TITLE" | "JOB_TYPE" | "EMP" | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const handleAddNew = (type: typeof modalType) => {
    setEditingId(null);
    setModalType(type);
    setFormData({});
  };
  const handleEdit = (type: typeof modalType, id: string, data: any) => {
    setEditingId(id);
    setModalType(type);
    setFormData(data);
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Titles */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-base font-black text-white tracking-tighter">
                  المسميات الوظيفية
                </h3>
                <p className="text-slate-500 font-bold text-xs mt-1 flex items-center gap-2">
                  <span className="w-3 h-[1px] bg-blue-600"></span>
                  توصيف الأدوار والمسؤوليات الإدارية
                </p>
              </div>
              <button
                onClick={() => onAdd("JOB_TITLE")}
                className="w-10 h-10 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-90 flex items-center justify-center group"
              >
                <Plus
                  size={18}
                  className="group-hover:rotate-90 transition-transform duration-500"
                />
              </button>
            </div>
            <div className="h-[1px] bg-gradient-to-r from-blue-600/50 to-transparent"></div>
          </div>

          <div className="grid gap-3">
            {jobTitles.map((jt, idx) => {
              const empCount = employees.filter(
                (e) => e.jobTitleId === jt.id,
              ).length;
              return (
                <motion.div
                  key={jt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-900/50 backdrop-blur-md p-1 rounded-lg border border-white/5 flex items-center justify-between group hover:border-blue-600/40 transition-all duration-500 shadow-md"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-blue-600/10 text-blue-500 rounded-md flex items-center justify-center shadow-inner border border-blue-600/20 group-hover:scale-110 transition-transform duration-500">
                      <Briefcase size={8} />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-xs tracking-tight">
                        {jt.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1">
                          <Layers size={10} className="text-blue-600" />{" "}
                          {jt.departmentIds.length} أقسام
                        </p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1">
                          <Users2 size={10} className="text-emerald-600" />{" "}
                          {empCount} موظف
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-500">
                    <button
                      onClick={() => onEdit("JOB_TITLE", jt.id, jt)}
                      className="p-1 bg-slate-800 text-slate-400 hover:text-white rounded-md transition-all border border-white/5 shadow-sm"
                    >
                      <Edit3 size={10} />
                    </button>
                    <button
                      onClick={() => deleteJobTitle(jt.id)}
                      className="p-1 bg-slate-800 text-slate-400 hover:text-red-500 rounded-md transition-all border border-white/5 shadow-sm"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Job Types */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-base font-black text-white tracking-tighter">
                  أنواع التوظيف
                </h3>
                <p className="text-slate-500 font-bold text-xs mt-1 flex items-center gap-2">
                  <span className="w-3 h-[1px] bg-emerald-600"></span>
                  أنظمة الدوام والتعاقد الوظيفي
                </p>
              </div>
              <button
                onClick={() => handleAddNew("JOB_TYPE")}
                className="w-10 h-10 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-90 flex items-center justify-center group"
              >
                <Plus
                  size={18}
                  className="group-hover:rotate-90 transition-transform duration-500"
                />
              </button>
            </div>
            <div className="h-[1px] bg-gradient-to-r from-emerald-600/50 to-transparent"></div>
          </div>

          <div className="grid gap-3">
            {jobTypes.map((type, idx) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-slate-900/50 backdrop-blur-md p-1 rounded-lg border border-white/5 flex items-center justify-between group hover:border-emerald-600/40 transition-all duration-500 shadow-md"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 bg-emerald-600/10 text-emerald-500 rounded-md flex items-center justify-center shadow-inner border border-emerald-600/20 group-hover:scale-110 transition-transform duration-500">
                    <Clock size={8} />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-xs tracking-tight">
                      {type.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1">
                        <BadgeInfo size={10} className="text-emerald-600" />{" "}
                        نظام عمل معتمد
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-500">
                  <button
                    onClick={() => handleEdit("JOB_TYPE", type.id, type)}
                    className="p-1 bg-slate-800 text-slate-400 hover:text-white rounded-md transition-all border border-white/5 shadow-sm"
                  >
                    <Edit3 size={10} />
                  </button>
                  <button
                    onClick={() => deleteJobType(type.id)}
                    className="p-1 bg-slate-800 text-slate-400 hover:text-red-500 rounded-md transition-all border border-white/5 shadow-sm"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenderJobs;
