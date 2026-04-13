import React from 'react';
import { Building2, CheckCircle2, XCircle, Users } from 'lucide-react';

interface BranchStatsProps {
  total: number;
  active: number;
  inactive: number;
  totalEmployees: number;
}

const BranchStats: React.FC<BranchStatsProps> = ({ total, active, inactive, totalEmployees }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <StatCard icon={<Building2 size={24} />} color="blue" label="إجمالي الأفرع" value={total} />
    <StatCard icon={<CheckCircle2 size={24} />} color="emerald" label="أفرع نشطة" value={active} />
    <StatCard icon={<XCircle size={24} />} color="red" label="أفرع متوقفة" value={inactive} />
    <StatCard icon={<Users size={24} />} color="purple" label="إجمالي الموظفين" value={totalEmployees} />
  </div>
);

const StatCard: React.FC<{icon: React.ReactNode, color: string, label: string, value: number}> = ({ icon, color, label, value }) => (
  <div className={`bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4`}>
    <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center text-${color}-500`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
    </div>
  </div>
);

export default BranchStats;