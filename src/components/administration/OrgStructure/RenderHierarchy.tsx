
import React from 'react';
import { useApp } from '../../../../store';
import { 
  Building2, 
  Network, 
  Briefcase, 
  Users2, 
  ChevronRight, 
  MapPin,
  Layers,
  AlertTriangle,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';

const RenderHierarchy: React.FC = () => {
    const { 
        branches, departments, jobTitles, employees
      } = useApp();
    return (
    <div className="bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/5 min-h-[500px] flex flex-col items-center animate-in zoom-in duration-1000 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.15),transparent_60%)]"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      
      {/* Hierarchy Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-4xl mb-8 relative z-10">
        {[
          { label: 'كفاءة الهيكل', value: '98%', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'معدل الترابط', value: 'High', icon: Network, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'الاستقرار الإداري', value: 'Stable', icon: CheckCircle2, color: 'text-orange-500', bg: 'bg-orange-500/10' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/5 flex items-center gap-2 group hover:border-white/10 transition-all"
          >
            <div className={`w-6 h-6 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform`}>
              <stat.icon size={12} />
            </div>
            <div>
              <p className="text-base font-black text-white leading-none mb-1">{stat.value}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mb-12 relative z-10">
        <div className="inline-block px-6 py-2 bg-red-600/10 border border-red-600/20 rounded-full mb-4">
          <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Organizational Blueprint</span>
        </div>
        <h3 className="text-2xl font-black text-white tracking-tighter mb-3">الرؤية الهيكلية الشاملة</h3>
        <p className="text-slate-400 font-bold text-sm max-w-2xl mx-auto leading-relaxed">
          تمثيل بصري متقدم للعلاقات الإدارية والتبعية التنظيمية. تم تصميم هذا النظام ليعكس الكفاءة التشغيلية والترابط الوظيفي بين كافة الوحدات.
        </p>
      </div>
      
      <div className="relative w-full max-w-7xl z-10">
        {/* Root: Company */}
        <div className="flex justify-center mb-10 relative">
          <motion.div 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-600 p-1.5 rounded-xl shadow-[0_15px_30px_rgba(220,38,38,0.3)] text-center w-32 border border-white/20 relative group cursor-pointer"
          >
            <div className="absolute -inset-2 bg-red-600/20 blur-xl rounded-full group-hover:bg-red-600/40 transition-all duration-700 animate-pulse"></div>
            <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-1 relative z-10 backdrop-blur-md border border-white/20">
              <Building2 size={12} className="text-white" />
            </div>
            <h4 className="text-xs font-black text-white relative z-10 tracking-tight">المقر الرئيسي</h4>
            <p className="text-[10px] text-red-100 font-black uppercase tracking-widest mt-0.5 relative z-10 opacity-80">Global Management Hub</p>
            
            <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 w-[1px] h-10 bg-gradient-to-b from-red-600 via-red-600/50 to-transparent"></div>
          </motion.div>
        </div>

        {/* Level 1: Branches */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {branches.map((branch, idx) => {
            const branchDepts = departments.filter(d => d.branchId === branch.id && !d.parentId);
            const branchEmps = employees.filter(e => e.branchId === branch.id);

            return (
              <motion.div 
                key={branch.id} 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="relative flex flex-col items-center"
              >
                {/* Connector from top */}
                <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 w-[1px] h-10 bg-slate-800"></div>
                
                <div className="bg-slate-800/80 backdrop-blur-xl p-1.5 rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.2)] text-center w-full border border-white/10 hover:border-red-600/50 transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/0 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  
                  <div className="w-6 h-6 bg-red-600/10 text-red-500 rounded-lg flex items-center justify-center mx-auto mb-1 border border-red-600/20 group-hover:scale-110 transition-transform duration-500 relative z-10">
                    <MapPin size={12} />
                  </div>
                  <h5 className="text-xs font-black text-white relative z-10 tracking-tight">{branch.name}</h5>
                  <div className="flex items-center justify-center gap-2 mt-1.5 relative z-10">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider bg-slate-900/50 px-2 py-1 rounded-lg border border-white/5">
                      {branchEmps.length} Staff
                    </span>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider bg-slate-900/50 px-2 py-1 rounded-lg border border-white/5">
                      {branchDepts.length} Units
                    </span>
                  </div>
                </div>
                
                {/* Connector to Departments */}
                <div className="w-[1px] h-10 bg-gradient-to-b from-slate-800 to-slate-900/50"></div>
                
                <div className="bg-slate-950/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/5 w-full space-y-1 shadow-xl">
                  {branchDepts.map(dept => {
                    const deptEmps = employees.filter(e => e.departmentId === dept.id);
                    return (
                      <motion.div 
                        key={dept.id} 
                        whileHover={{ x: -3 }}
                        className="flex items-center justify-between p-0.5 bg-slate-900/50 rounded-lg border border-white/5 hover:bg-slate-800/80 transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border transition-transform group-hover:scale-110"
                            style={{ 
                              backgroundColor: dept.color ? `${dept.color}15` : 'rgba(59, 130, 246, 0.1)', 
                              color: dept.color || '#3b82f6',
                              borderColor: dept.color ? `${dept.color}30` : 'rgba(59, 130, 246, 0.2)'
                            }}
                          >
                            {dept.icon || <Layers size={8} />}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-200 block">{dept.nameAr || dept.name}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{deptEmps.length} Staff</span>
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-md bg-slate-800 flex items-center justify-center text-slate-600 group-hover:text-red-500 transition-colors">
                          <ChevronRight size={8} />
                        </div>
                      </motion.div>
                    );
                  })}
                  {branchDepts.length === 0 && (
                    <div className="py-3 text-center">
                      <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-1 text-slate-800 border border-white/5">
                        <AlertTriangle size={10} />
                      </div>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-wider">No Active Units</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl relative z-10">
        {[
          { label: 'Total Branches', value: branches.length, icon: Building2, color: 'text-red-500' },
          { label: 'Active Departments', value: departments.length, icon: Layers, color: 'text-blue-500' },
          { label: 'Total Workforce', value: employees.length, icon: Users2, color: 'text-emerald-500' },
          { label: 'Job Roles', value: jobTitles.length, icon: Briefcase, color: 'text-orange-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/50 backdrop-blur-md p-1.5 rounded-xl border border-white/5 text-center group hover:border-white/10 transition-all">
            <stat.icon size={10} className={`${stat.color} mx-auto mb-1 opacity-50 group-hover:opacity-100 transition-opacity`} />
            <p className="text-sm font-black text-white mb-1">{stat.value}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

  export default RenderHierarchy;