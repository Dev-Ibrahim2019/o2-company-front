import React, { useState } from "react";
import { useApp } from "../../../../store";
import {
  Building2,
  Users2,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  Phone,
  ArrowLeftRight,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  onAdd: (type: "BRANCH") => void;
  onEdit: (type: "BRANCH", id: string, data: any) => void;
};

const RenderBranches: React.FC<Props> = ({ onAdd, onEdit }) => {
  const { branches, departments, employees, addNotification, deleteBranch } =
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
      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الفروع', value: branches.length, icon: Building2, color: 'bg-red-600' },
          { label: 'القوى العاملة', value: employees.length, icon: Users2, color: 'bg-emerald-600' },
          { label: 'الوحدات التشغيلية', value: departments.length, icon: Layers, color: 'bg-blue-600' },
          { label: 'الفروع النشطة', value: branches.filter(b => b.status === 'ACTIVE').length, icon: CheckCircle2, color: 'bg-orange-600' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/40 backdrop-blur-md p-2 rounded-lg border border-white/5 flex items-center gap-2 group hover:border-white/10 transition-all"
          >
            <div className={`w-6 h-6 ${stat.color} rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              <stat.icon size={12} className="text-white" />
            </div>
            <div>
              <p className="text-base font-black text-white leading-none mb-1">{stat.value}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-white tracking-tighter">الفروع والانتشار</h3>
          <p className="text-slate-500 font-bold mt-1 flex items-center gap-2 text-[10px]">
            <span className="w-4 h-[1px] bg-red-600"></span>
            إدارة المواقع الجغرافية ومراكز التكلفة التشغيلية
          </p>
        </div>
        <button 
          onClick={() => onAdd("BRANCH")}
          className="bg-white text-black px-5 py-2.5 rounded-xl font-black text-xs shadow-lg hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center gap-2 group"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" /> تأسيس فرع جديد
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch, idx) => {
          const branchEmployees = employees.filter(e => e.branchId === branch.id);
          const branchDepts = departments.filter(d => d.branchId === branch.id);
          
          return (
            <motion.div 
              key={branch.id} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-slate-900/50 backdrop-blur-xl p-1.5 rounded-xl border border-white/5 shadow-xl hover:border-red-600/40 transition-all group relative overflow-hidden"
            >
              <div className="absolute -left-12 -top-12 w-24 h-24 bg-red-600/5 rounded-full blur-[40px] group-hover:bg-red-600/10 transition-colors duration-1000"></div>
              
              <div className="flex justify-between items-start mb-1.5 relative z-10">
                <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center shadow-lg border border-white/5 group-hover:scale-110 transition-transform duration-500">
                  <Building2 size={12} className="text-red-500" />
                </div>
                <div className="flex gap-1">
                   <button onClick={() =>
                      onEdit("BRANCH", branch.id, branch)
                    } className="p-1 bg-slate-800/80 text-slate-400 hover:text-white rounded-lg transition-all border border-white/5 backdrop-blur-md hover:border-red-600/30 shadow-md"><Edit3 size={10}/></button>
                   <button onClick={() => {
                     if (branchEmployees.length > 0) {
                       addNotification("لا يمكن حذف فرع يحتوي على موارد بشرية نشطة!");
                       return;
                     }
                     deleteBranch(branch.id);
                   }} className="p-1 bg-slate-800/80 text-slate-400 hover:text-red-500 rounded-lg transition-all border border-white/5 backdrop-blur-md hover:border-red-500/30 shadow-md"><Trash2 size={10}/></button>
                </div>
              </div>

              <h3 className="text-sm font-black text-white mb-1.5 relative z-10 tracking-tighter">{branch.name}</h3>
              
              <div className="space-y-1 mb-3 relative z-10">
                <div className="flex items-center gap-2 text-slate-400 group/item">
                  <div className="w-5 h-5 rounded-md bg-slate-800/50 flex items-center justify-center text-red-500 border border-white/5 group-hover/item:bg-red-600 group-hover/item:text-white transition-all"><MapPin size={10} /></div>
                  <span className="text-[10px] font-bold truncate">{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 group/item">
                  <div className="w-5 h-5 rounded-md bg-slate-800/50 flex items-center justify-center text-red-500 border border-white/5 group-hover/item:bg-red-600 group-hover/item:text-white transition-all"><Phone size={10} /></div>
                  <span className="text-[10px] font-bold">{branch.phone}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2 relative z-10">
                <div className="bg-slate-950/50 p-1.5 rounded-xl border border-white/5 group-hover:border-red-600/20 transition-colors">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Users2 size={10} className="text-red-500" /> Workforce
                  </p>
                  <p className="text-xs font-black text-white">{branchEmployees.length}</p>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded-xl border border-white/5 group-hover:border-red-600/20 transition-colors">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Layers size={10} className="text-blue-500" /> Units
                  </p>
                  <p className="text-xs font-black text-white">{branchDepts.length}</p>
                </div>
              </div>

              {/* Branch Health (Mocked) */}
              <div className="bg-slate-950/30 p-2 rounded-xl border border-white/5 mb-3 relative z-10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Operational Health</span>
                  <span className="text-[10px] font-black text-emerald-500">Optimal</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    className="h-full bg-gradient-to-r from-red-600 to-emerald-500"
                  ></motion.div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${branch.status === 'ACTIVE' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-slate-600'}`}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{branch.status === 'ACTIVE' ? 'Operational' : 'Inactive'}</span>
                </div>
                <button className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-600/10 transition-all border border-white/5">
                  <ArrowLeftRight size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
        <motion.button 
          whileHover={{ scale: 0.98 }}
          onClick={() => onAdd("BRANCH")} 
          className="bg-slate-900/20 border-2 border-dashed border-white/10 rounded-xl p-1.5 flex flex-col items-center justify-center gap-1.5 text-slate-700 hover:bg-slate-900/40 hover:border-red-600/40 hover:text-red-500 transition-all group shadow-lg"
        >
          <div className="w-6 h-6 bg-slate-800/50 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform border border-white/5 group-hover:bg-red-600/10 group-hover:border-red-600/20"><Plus size={12} /></div>
          <div className="text-center">
            <span className="font-black text-xs uppercase tracking-wider block mb-1">New Branch</span>
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-red-400 transition-colors">تأسيس وحدة تشغيلية جديدة</span>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default RenderBranches;