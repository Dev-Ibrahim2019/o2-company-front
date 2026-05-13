import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Landmark, DollarSign,
  ArrowUpRight, ArrowDownRight, BarChart3, Activity,
  AlertTriangle, CheckCircle2, Clock, FileText,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend,
} from 'recharts';

interface Stats {
  totalAssets: number;
  totalLiabilities?: number;
  totalEquity?: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

interface Props { stats: Stats }

// ── custom tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl text-right">
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[11px] text-slate-300 font-bold">{p.name}:</span>
          <span className="text-[11px] font-black text-white">₪{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export const AccountingDashboard: React.FC<Props> = ({ stats }) => {
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'quarterly'>('monthly');

  const margin = stats.totalAssets - (stats.totalLiabilities ?? 0);
  const profitMargin = stats.totalRevenue > 0
    ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1)
    : '0.0';

  const kpis = [
    {
      label: 'إجمالي الأصول',
      value: stats.totalAssets,
      change: '+8.2%',
      up: true,
      icon: Landmark,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'shadow-blue-900/20',
    },
    {
      label: 'إجمالي الإيرادات',
      value: stats.totalRevenue,
      change: '+14.5%',
      up: true,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'shadow-emerald-900/20',
    },
    {
      label: 'إجمالي المصروفات',
      value: stats.totalExpenses,
      change: '+3.1%',
      up: false,
      icon: TrendingDown,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      glow: 'shadow-rose-900/20',
    },
    {
      label: 'صافي الربح',
      value: stats.netProfit,
      change: `${profitMargin}% هامش`,
      up: stats.netProfit >= 0,
      icon: DollarSign,
      color: stats.netProfit >= 0 ? 'text-amber-400' : 'text-rose-400',
      bg: stats.netProfit >= 0 ? 'bg-amber-500/10' : 'bg-rose-500/10',
      border: stats.netProfit >= 0 ? 'border-amber-500/20' : 'border-rose-500/20',
      glow: stats.netProfit >= 0 ? 'shadow-amber-900/20' : 'shadow-rose-900/20',
    },
  ];

  const monthlyData = [
    { name: 'يناير', revenue: 42000, expenses: 28000, profit: 14000 },
    { name: 'فبراير', revenue: 38000, expenses: 24000, profit: 14000 },
    { name: 'مارس', revenue: 55000, expenses: 31000, profit: 24000 },
    { name: 'أبريل', revenue: 47000, expenses: 29000, profit: 18000 },
    { name: 'مايو', revenue: 61000, expenses: 33000, profit: 28000 },
    { name: 'يونيو', revenue: 58000, expenses: 35000, profit: 23000 },
  ];

  const quarterlyData = [
    { name: 'Q1', revenue: 135000, expenses: 83000, profit: 52000 },
    { name: 'Q2', revenue: 166000, expenses: 97000, profit: 69000 },
    { name: 'Q3', revenue: 142000, expenses: 91000, profit: 51000 },
    { name: 'Q4', revenue: 189000, expenses: 104000, profit: 85000 },
  ];

  const chartData = chartPeriod === 'monthly' ? monthlyData : quarterlyData;

  const alerts = [
    { type: 'warning', msg: '٣ فواتير موردين متأخرة السداد', icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { type: 'success', msg: 'تم إغلاق السنة المالية 2024 بنجاح', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { type: 'info', msg: 'موعد تقديم التقرير الضريبي: ٣١ مارس', icon: Clock, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { type: 'info', msg: '١٢ قيد يومية في انتظار المراجعة', icon: FileText, color: 'text-slate-400 bg-white/5 border-white/10' },
  ];

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pb-10" dir="rtl">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
            className={`relative bg-slate-900/60 border ${kpi.border} rounded-3xl p-5 hover:scale-[1.02] transition-all duration-300 shadow-lg ${kpi.glow} overflow-hidden group`}
          >
            {/* subtle glow bg */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${kpi.bg} blur-2xl`} />

            <div className="relative flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-2xl ${kpi.bg} border ${kpi.border} flex items-center justify-center ${kpi.color}`}>
                <kpi.icon size={20} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${kpi.up ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                {kpi.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {kpi.change}
              </div>
            </div>
            <div className="relative">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.15em] leading-none mb-2">{kpi.label}</p>
              <p className="text-2xl font-black text-white font-mono leading-none">
                ₪{Math.abs(kpi.value).toLocaleString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area Chart */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Activity size={18} />
              </div>
              <div className="text-right">
                <h3 className="text-sm font-black text-white">تحليل الأداء المالي</h3>
                <p className="text-[10px] text-slate-500 font-bold">الإيرادات · المصروفات · الأرباح</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-950/60 border border-white/5 rounded-xl p-1">
              {(['monthly', 'quarterly'] as const).map(p => (
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${chartPeriod === p ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {p === 'monthly' ? 'شهري' : 'ربعي'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                  tickFormatter={v => `₪${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke="#10b981" strokeWidth={2.5} fill="url(#gRevenue)" />
                <Area type="monotone" dataKey="expenses" name="المصروفات" stroke="#ef4444" strokeWidth={2.5} fill="url(#gExpenses)" />
                <Area type="monotone" dataKey="profit" name="الأرباح" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gProfit)" strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - expense breakdown */}
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <BarChart3 size={18} />
            </div>
            <div className="text-right">
              <h3 className="text-sm font-black text-white">توزيع المصروفات</h3>
              <p className="text-[10px] text-slate-500 font-bold">حسب الفئة</p>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'رواتب', value: 45000 },
                { name: 'إيجارات', value: 18000 },
                { name: 'مواد', value: 32000 },
                { name: 'مرافق', value: 8000 },
                { name: 'أخرى', value: 12000 },
              ]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="المبلغ" fill="#ef4444" radius={[0, 6, 6, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Financial Ratios */}
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6">
          <h3 className="text-sm font-black text-white mb-5 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-red-500 rounded-full" />
            المؤشرات المالية الرئيسية
          </h3>
          <div className="space-y-4">
            {[
              { label: 'هامش الربح الصافي', value: `${profitMargin}%`, bar: parseFloat(profitMargin), color: 'bg-emerald-500' },
              { label: 'نسبة المصروفات', value: stats.totalRevenue > 0 ? `${((stats.totalExpenses / stats.totalRevenue) * 100).toFixed(1)}%` : '0%', bar: stats.totalRevenue > 0 ? (stats.totalExpenses / stats.totalRevenue) * 100 : 0, color: 'bg-rose-500' },
              { label: 'العائد على الأصول', value: stats.totalAssets > 0 ? `${((stats.netProfit / stats.totalAssets) * 100).toFixed(1)}%` : '0%', bar: stats.totalAssets > 0 ? Math.min((stats.netProfit / stats.totalAssets) * 100, 100) : 0, color: 'bg-blue-500' },
            ].map((r, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-300">{r.label}</span>
                  <span className="text-xs font-black text-white font-mono">{r.value}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(r.bar, 100))}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${r.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Summary */}
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6">
          <h3 className="text-sm font-black text-white mb-5 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
            ملخص الميزانية
          </h3>
          <div className="space-y-3">
            {[
              { label: 'إجمالي الأصول', value: stats.totalAssets, color: 'text-blue-400' },
              { label: 'إجمالي الخصوم', value: stats.totalLiabilities ?? 0, color: 'text-rose-400' },
              { label: 'حقوق الملكية', value: stats.totalEquity ?? margin, color: 'text-emerald-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <span className="text-[11px] font-black text-slate-400">{item.label}</span>
                <span className={`text-sm font-black font-mono ${item.color}`}>
                  ₪{Math.abs(item.value).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">المعادلة المحاسبية</span>
              <span className="text-[10px] font-black text-slate-500">أ = خ + ح.م</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6">
          <h3 className="text-sm font-black text-white mb-5 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
            التنبيهات والإشعارات
          </h3>
          <div className="space-y-3">
            {alerts.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className={`flex items-start gap-3 p-3 rounded-2xl border ${a.color} text-right`}
              >
                <a.icon size={14} className="mt-0.5 shrink-0" />
                <p className="text-[11px] font-bold leading-relaxed">{a.msg}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};