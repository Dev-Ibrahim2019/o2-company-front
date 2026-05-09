import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Landmark, ArrowDownRight, DollarSign } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface Stats {
  totalAssets: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

interface Props { stats: Stats }

export const AccountingDashboard: React.FC<Props> = ({ stats }) => {
  const statCards = [
    { label: 'إجمالي الأصول',     value: stats.totalAssets,   icon: Landmark,     color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
    { label: 'إجمالي الإيرادات',  value: stats.totalRevenue,  icon: TrendingUp,   color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'إجمالي المصروفات',  value: stats.totalExpenses, icon: ArrowDownRight,color: 'text-red-500',    bg: 'bg-red-500/10'    },
    { label: 'صافي الربح',         value: stats.netProfit,     icon: DollarSign,   color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  const chartData = [
    { name: 'Jan', revenue: 4000, expenses: 2400 },
    { name: 'Feb', revenue: 3000, expenses: 1398 },
    { name: 'Mar', revenue: 2000, expenses: 9800 },
  ];

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 hover:border-red-500/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-white leading-none">₪{stat.value.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 text-right">
          <h3 className="text-lg font-black text-white mb-6 flex items-center justify-end gap-2">
            <TrendingUp size={20} className="text-red-500" /> تحليل الإيرادات والمصروفات
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="#10b98120" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fill="#ef444420" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
