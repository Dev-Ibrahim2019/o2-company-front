
import React, { useState } from 'react';
import { 
  Building2, 
  Network, 
  Briefcase, 
  Users2, 
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RenderBranches from './RenderBranches';
import RenderDepartments from './RenderDepartments';
import RenderEmployees from './RenderEmployees';
import RenderHierarchy from './RenderHierarchy';
import RenderJobs from './RenderJobs';

type Props = {
  onAdd: (type: any) => void;
  onEdit: (type: any, id: string, data: any) => void;
};

const HeaderOrg: React.FC<Props> = ({
  onAdd,
  onEdit,
}) => {
    const [activeTab, setActiveTab] = useState<'branches' | 'departments' | 'jobs' | 'employees' | 'hierarchy'>('branches');
    
    return(
        <div>
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="absolute -left-8 -top-8 w-16 h-16 bg-red-600/10 blur-2xl rounded-full"></div>
          <div className="flex items-center gap-4 mb-2 relative z-10">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-[0_10px_20px_rgba(220,38,38,0.3)] border-2 border-white/10">
              <Network size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter leading-none">الهيكل التنظيمي</h2>
              <p className="text-slate-500 font-bold text-xs mt-1.5 uppercase tracking-[0.2em]">Enterprise Architecture</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex bg-slate-900/40 backdrop-blur-2xl p-1 rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] border border-white/5 overflow-x-auto scrollbar-hide w-full lg:w-auto"
        >
           {[
             { id: 'branches', label: 'الفروع', icon: Building2 },
             { id: 'departments', label: 'الأقسام', icon: Layers },
             { id: 'jobs', label: 'المسميات', icon: Briefcase },
             { id: 'employees', label: 'الموظفين', icon: Users2 },
             { id: 'hierarchy', label: 'الهيكل', icon: Network }
           ].map(t => (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap relative ${activeTab === t.id ? 'text-white' : 'text-slate-500 hover:text-slate-200'}`}
             >
               {activeTab === t.id && (
                 <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-red-600 rounded-lg shadow-[0_8px_16px_rgba(220,38,38,0.3)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                 />
               )}
               <span className="relative z-10 flex items-center gap-1">
                 <t.icon size={12}/> {t.label}
               </span>
             </button>
           ))}
        </motion.div>
      </header>
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          {activeTab === "branches" && (
        <RenderBranches onAdd={onAdd} onEdit={onEdit} />
      )}

      {activeTab === "departments" && (
        <RenderDepartments onAdd={onAdd} onEdit={onEdit} />
      )}

      {activeTab === "jobs" && (
        <RenderJobs onAdd={onAdd} onEdit={onEdit} />
      )}

      {activeTab === "employees" && (
        <RenderEmployees onAdd={onAdd} onEdit={onEdit} />
      )}

      {activeTab === "hierarchy" && (
        <RenderHierarchy />
      )}
        </motion.div>
      </AnimatePresence>
      </div>
    );
};

export default HeaderOrg;