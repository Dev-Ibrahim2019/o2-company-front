// src/components/administration/GL/EmployeesTab.tsx
//
// ✅ إعادة تصميم كاملة — مستوى ERP احترافي
// ✅ دعم أنواع الرواتب الثلاثة: بالساعة / يومية / شهري
// ✅ تحليلات متقدمة + تكلفة حسب الفرع والقسم
// ✅ شاشة مالية متكاملة (سلف، رواتب، صافي مستحق)

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, DollarSign, Users, TrendingUp, Download,
  Wallet, LayoutGrid, Table2, Building2, PieChart,
  BarChart3, Clock, Calculator, UserCheck, AlertCircle,
  ChevronDown, ChevronUp, Briefcase, RefreshCw,
} from 'lucide-react';
import EntityFinanceActions from './EntityFinanceActions';
import { useEmployees } from '../../../hooks/useEmployees';
import type { EmployeeFromApi } from '../../../services/employeeService';

// ─── Gradient palette ───────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-blue-600 to-blue-800',
  'from-emerald-600 to-emerald-800',
  'from-purple-600 to-purple-800',
  'from-rose-600 to-rose-800',
  'from-amber-600 to-amber-800',
  'from-cyan-600 to-cyan-800',
] as const;

const getGradient = (index: number) => AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

// ─── تنسيق المبالغ ────────────────────────────────────────────────────

const money = (v: number) => {
  if (!v && v !== 0) return '0.00';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── BalanceDisplay ────────────────────────────────────────────────────

const BalanceDisplay: React.FC<{ balance: number; size?: 'sm' | 'base' }> = ({
  balance, size = 'base',
}) => {
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  if (balance === 0)
    return <span className={`font-black font-mono text-slate-600 ${textSize}`}>مصفّر</span>;
  return (
    <span className={`font-black font-mono ${textSize} ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
      ₪{money(Math.abs(balance))}
      <span className="text-[9px] mr-1 opacity-70">{balance > 0 ? 'عليه' : 'له'}</span>
    </span>
  );
};

// ─── Salary Type Badge ─────────────────────────────────────────────────

const SalaryTypeBadge: React.FC<{ salaryType?: string; calculatedSalary?: number }> = ({
  salaryType, calculatedSalary,
}) => {
  if (!salaryType || salaryType === 'monthly') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black">
        <Clock size={10} /> شهري
      </span>
    );
  }
  if (salaryType === 'hourly') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black">
        <Clock size={10} /> بالساعة
        {calculatedSalary && <span className="text-[8px] opacity-70">(₪{money(calculatedSalary)})</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black">
      <Calculator size={10} /> يومية
      {calculatedSalary && <span className="text-[8px] opacity-70">(₪{money(calculatedSalary)})</span>}
    </span>
  );
};

// ─── Loading Skeleton ──────────────────────────────────────────────────

const CardSkeleton: React.FC = () => (
  <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden animate-pulse">
    <div className="p-5 flex items-center gap-4 border-b border-white/5">
      <div className="w-14 h-14 rounded-2xl bg-slate-800" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-800 rounded-lg w-3/4" />
        <div className="h-2.5 bg-slate-800/70 rounded-lg w-1/2" />
        <div className="h-2 bg-slate-800/50 rounded-lg w-1/3" />
      </div>
    </div>
    <div className="grid grid-cols-2 divide-x divide-x-reverse divide-white/5">
      <div className="p-4 space-y-2"><div className="h-2 bg-slate-800/60 rounded w-2/3" /><div className="h-3.5 bg-slate-800 rounded w-1/2" /></div>
      <div className="p-4 space-y-2"><div className="h-2 bg-slate-800/60 rounded w-2/3" /><div className="h-3.5 bg-slate-800 rounded w-1/2" /></div>
    </div>
    <div className="p-4 border-t border-white/5"><div className="h-8 bg-slate-800/60 rounded-xl" /></div>
  </div>
);

// ─── KPI Card ──────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  subtitle?: string;
  index: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, color, bg, border, subtitle, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07, type: 'spring', stiffness: 200 }}
    className={`${bg} border ${border} rounded-3xl p-5 hover:scale-[1.02] transition-all duration-300`}
  >
    <div className={`w-11 h-11 rounded-2xl ${bg} border ${border} flex items-center justify-center ${color} mb-3`}>
      <Icon size={20} />
    </div>
    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-2xl font-black font-mono ${color} leading-tight`}>{value}</p>
    {subtitle && <p className="text-[10px] text-slate-600 font-bold mt-1.5">{subtitle}</p>}
  </motion.div>
);

// ─── Employee Card ─────────────────────────────────────────────────────

interface EmployeeCardProps {
  employee: EmployeeFromApi;
  index: number;
  balance?: number;
  onActionSuccess: () => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee: emp, index, balance = 0, onActionSuccess }) => {
  const grad = getGradient(index);
  const salaryDetails = emp.salary_details;
  const salaryLabel = salaryDetails
    ? `${salaryDetails.type_label} · ₪${money(salaryDetails.total)}`
    : `₪${money(emp.salary || 0)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), type: 'spring', stiffness: 200 }}
      className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden hover:border-white/15 transition-all group"
    >
      {/* Header */}
      <div className="p-5 flex items-center gap-4 border-b border-white/5">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0`}>
          {getInitials(emp.name)}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-end gap-2">
            <h4 className="text-sm font-black text-white truncate">{emp.name}</h4>
            <SalaryTypeBadge salaryType={emp.salary_type} calculatedSalary={emp.calculated_salary} />
          </div>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5 truncate">{emp.role}</p>
          <div className="flex items-center gap-1.5 mt-1.5 justify-end flex-wrap">
            <span className="bg-slate-950 px-2 py-0.5 rounded-lg text-[10px] text-red-500 font-mono font-black border border-red-500/20">
              {emp.employeeId}
            </span>
            {emp.status && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${emp.status === 'active'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-slate-800 border-white/5 text-slate-500'
                }`}>
                {emp.status === 'active' ? 'نشط' : emp.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-white/5 text-right">
        <div className="p-4">
          <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">الراتب</p>
          <p className="text-sm font-black text-white font-mono">{salaryLabel}</p>
          {emp.salary_type === 'hourly' && emp.hourly_rate && (
            <p className="text-[9px] text-slate-600 font-bold mt-0.5">{emp.hourly_rate}₪/ساعة × {emp.working_hours || 176} ساعة</p>
          )}
          {emp.salary_type === 'daily' && emp.daily_rate && (
            <p className="text-[9px] text-slate-600 font-bold mt-0.5">{emp.daily_rate}₪/يوم × {emp.working_days || 22} يوم</p>
          )}
        </div>
        <div className="p-4">
          <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">رصيد الحساب</p>
          <BalanceDisplay balance={balance} />
          {emp.outstanding_advance !== undefined && emp.outstanding_advance > 0 && (
            <p className="text-[9px] text-amber-400 font-bold mt-0.5">سلف: ₪{money(emp.outstanding_advance)}</p>
          )}
        </div>
      </div>

      {/* Department / Branch */}
      {(emp.department?.name || emp.branch?.name) && (
        <div className="px-4 pb-3 flex items-center justify-end gap-3 text-[10px] text-slate-600 font-bold">
          {emp.department?.name && <span><Building2 size={10} className="inline ml-1" />{emp.department.name}</span>}
          {emp.branch?.name && <span><Briefcase size={10} className="inline ml-1" />{emp.branch.name}</span>}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-white/5">
        <EntityFinanceActions
          entityType="employee"
          entityId={emp.id}
          entityName={emp.name}
          currentBalance={balance}
          onActionSuccess={onActionSuccess}
        />
      </div>
    </motion.div>
  );
};

// ─── Employee Table Row ────────────────────────────────────────────────

interface EmployeeTableRowProps {
  employee: EmployeeFromApi;
  index: number;
  balance?: number;
  onActionSuccess: () => void;
}

const EmployeeTableRow: React.FC<EmployeeTableRowProps> = ({ employee: emp, index, balance = 0, onActionSuccess }) => {
  const grad = getGradient(index);
  const salaryDetails = emp.salary_details;
  const salaryLabel = salaryDetails
    ? `${salaryDetails.type_label} · ₪${money(salaryDetails.total)}`
    : `₪${money(emp.salary || 0)}`;

  return (
    <motion.tr
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="hover:bg-white/[0.02] transition-colors group border-b border-white/5 last:border-0"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-xs shrink-0`}>
            {getInitials(emp.name)}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-white text-xs">{emp.name}</p>
              <SalaryTypeBadge salaryType={emp.salary_type} />
            </div>
            {emp.branch?.name && <p className="text-[10px] text-slate-600 font-bold">{emp.branch.name}</p>}
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-slate-400 font-bold text-xs">{emp.role || '—'}</td>
      <td className="px-5 py-4">
        <span className="font-mono text-slate-500 text-[11px] bg-slate-950 px-2 py-0.5 rounded-lg border border-red-500/10 text-red-500">
          {emp.employeeId || '—'}
        </span>
      </td>
      <td className="px-5 py-4 text-center">
        <span className="font-black font-mono text-white text-xs">{salaryLabel}</span>
      </td>
      <td className="px-5 py-4 text-center">
        <span className="font-bold font-mono text-amber-400 text-[11px]">
          {emp.outstanding_advance ? `₪${money(emp.outstanding_advance)}` : '—'}
        </span>
      </td>
      <td className="px-5 py-4 text-center">
        <BalanceDisplay balance={balance} size="sm" />
      </td>
      <td className="px-5 py-4">
        {emp.status && (
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${emp.status === 'active'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-slate-800 border-white/5 text-slate-500'
            }`}>
            {emp.status === 'active' ? 'نشط' : emp.status}
          </span>
        )}
      </td>
      <td className="px-5 py-4">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <EntityFinanceActions
            entityType="employee"
            entityId={emp.id}
            entityName={emp.name}
            currentBalance={balance}
            onActionSuccess={onActionSuccess}
          />
        </div>
      </td>
    </motion.tr>
  );
};

// ─── شاشة التحليلات المالية ────────────────────────────────────────────

interface AnalyticsPanelProps {
  employees: EmployeeFromApi[];
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ employees }) => {
  const [expanded, setExpanded] = useState(false);

  // تحليل حسب الفرع
  const branchCosts = useMemo(() => {
    const map = new Map<string, { count: number; total: number; advances: number }>();
    employees.forEach(e => {
      const branchName = e.branch?.name || 'غير محدد';
      const existing = map.get(branchName) || { count: 0, total: 0, advances: 0 };
      existing.count++;
      existing.total += e.calculated_salary ?? e.salary ?? 0;
      existing.advances += e.outstanding_advance ?? 0;
      map.set(branchName, existing);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [employees]);

  // تحليل حسب القسم
  const deptCosts = useMemo(() => {
    const map = new Map<string, { count: number; total: number; advances: number }>();
    employees.forEach(e => {
      const deptName = e.department?.name || 'غير محدد';
      const existing = map.get(deptName) || { count: 0, total: 0, advances: 0 };
      existing.count++;
      existing.total += e.calculated_salary ?? e.salary ?? 0;
      existing.advances += e.outstanding_advance ?? 0;
      map.set(deptName, existing);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [employees]);

  const grandTotal = branchCosts.reduce((s, b) => s + b.total, 0);
  const totalAdvances = branchCosts.reduce((s, b) => s + b.advances, 0);

  const maxBranchCost = Math.max(...branchCosts.map(b => b.total), 1);

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            <BarChart3 size={18} />
          </div>
          <div className="text-right">
            <h3 className="text-sm font-black text-white">التحليلات المالية</h3>
            <p className="text-[10px] text-slate-500 font-bold">تكلفة الرواتب · السلف · توزيع الموظفين</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-6">
              {/* ── Summary Row ──────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-500 font-black mb-1">إجمالي تكلفة الرواتب</p>
                  <p className="text-xl font-black font-mono text-indigo-400">₪{money(grandTotal)}</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-500 font-black mb-1">إجمالي السلف القائمة</p>
                  <p className="text-xl font-black font-mono text-amber-400">₪{money(totalAdvances)}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-500 font-black mb-1">عدد الموظفين</p>
                  <p className="text-xl font-black font-mono text-emerald-400">{employees.length}</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-500 font-black mb-1">متوسط الراتب</p>
                  <p className="text-xl font-black font-mono text-purple-400">
                    ₪{employees.length > 0 ? money(Math.round(grandTotal / employees.length)) : '0'}
                  </p>
                </div>
              </div>

              {/* ── تكلفة الرواتب حسب الفرع ───────────────────── */}
              <div>
                <h4 className="text-[11px] font-black text-slate-400 mb-3 flex items-center gap-2">
                  <Building2 size={13} /> تكلفة الرواتب حسب الفرع
                </h4>
                <div className="space-y-2">
                  {branchCosts.map((branch) => {
                    const pct = (branch.total / maxBranchCost) * 100;
                    return (
                      <div key={branch.name} className="bg-slate-950/50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-black text-white">{branch.name}</span>
                          <span className="text-[11px] font-black font-mono text-indigo-400">₪{money(branch.total)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              className="h-full bg-gradient-to-l from-indigo-500 to-indigo-600 rounded-full"
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold w-8 text-left">{Math.round(pct)}%</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-600 font-bold">
                          <span>{branch.count} موظف</span>
                          <span>سلف: ₪{money(branch.advances)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── تكلفة الرواتب حسب القسم ───────────────────── */}
              <div>
                <h4 className="text-[11px] font-black text-slate-400 mb-3 flex items-center gap-2">
                  <PieChart size={13} /> تكلفة الرواتب حسب القسم
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {deptCosts.map((dept) => (
                    <div key={dept.name} className="bg-slate-950/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-black text-white">{dept.name}</span>
                        <span className="text-[11px] font-black font-mono text-indigo-400">₪{money(dept.total)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-600 font-bold">
                        <UserCheck size={10} /> {dept.count} موظف
                        {dept.advances > 0 && <span>· سلف: ₪{money(dept.advances)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────

export const EmployeesTab: React.FC = () => {
  const { employees, loading, refetch } = useEmployees();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [showFilters, setShowFilters] = useState(false);

  const handleActionSuccess = useCallback(() => refetch(), [refetch]);

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.role && e.role.toLowerCase().includes(search.toLowerCase())) ||
        (e.employeeId && e.employeeId.includes(search));
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, search, statusFilter]);

  // ✅ استخدام calculated_salary بدلاً من salary فقط
  const totalPayroll = useMemo(
    () => employees.reduce((s, e) => s + Number(e.calculated_salary ?? e.salary ?? 0), 0),
    [employees],
  );
  const avgSalary = employees.length > 0 ? totalPayroll / employees.length : 0;
  const totalAdvances = useMemo(
    () => employees.reduce((s, e) => s + Number(e.outstanding_advance ?? 0), 0),
    [employees],
  );

  // توزيع أنواع الرواتب
  const salaryTypeDist = useMemo(() => {
    const hourly = employees.filter(e => e.salary_type === 'hourly').length;
    const daily = employees.filter(e => e.salary_type === 'daily').length;
    const monthly = employees.filter(e => !e.salary_type || e.salary_type === 'monthly').length;
    return { hourly, daily, monthly };
  }, [employees]);

  const kpis: KpiCardProps[] = [
    {
      label: 'إجمالي الرواتب الشهرية',
      value: `₪${money(totalPayroll)}`,
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      subtitle: `${employees.length} موظف`,
      index: 0,
    },
    {
      label: 'عدد الموظفين',
      value: `${employees.length}`,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      subtitle: `${salaryTypeDist.monthly} شهري · ${salaryTypeDist.hourly} بالساعة · ${salaryTypeDist.daily} يومية`,
      index: 1,
    },
    {
      label: 'إجمالي السلف',
      value: totalAdvances > 0 ? `₪${money(totalAdvances)}` : '—',
      icon: Wallet,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      subtitle: totalAdvances > 0 ? 'السلف القائمة على الموظفين' : 'لا توجد سلف قائمة',
      index: 2,
    },
    {
      label: 'متوسط الراتب',
      value: `₪${money(avgSalary)}`,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      subtitle: 'لكل موظف شهرياً',
      index: 3,
    },
  ];

  const uniqueStatuses = useMemo(
    () => ['all', ...Array.from(new Set(employees.map(e => e.status).filter(Boolean)))],
    [employees],
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-10 space-y-6" dir="rtl">
      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ── Analytics ───────────────────────────────────────── */}
      <AnalyticsPanel employees={employees} />

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search + Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث باسم أو وظيفة أو رقم..."
                className="bg-slate-900 border border-white/5 rounded-xl py-2.5 pr-9 pl-4 text-xs text-white outline-none focus:border-red-500/50 transition-colors w-64"
              />
            </div>
            <button
              onClick={() => setShowFilters(p => !p)}
              className={`p-2.5 border rounded-xl text-slate-400 hover:text-white transition-all ${showFilters
                ? 'bg-red-600/20 border-red-500/30 text-red-400'
                : 'bg-slate-900 border-white/5'
                }`}
            >
              <Filter size={14} />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-900 border border-white/5 rounded-xl p-1 gap-0.5">
              <button
                onClick={() => setView('cards')}
                className={`p-2 rounded-lg transition-all ${view === 'cards' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutGrid size={13} />
              </button>
              <button
                onClick={() => setView('table')}
                className={`p-2 rounded-lg transition-all ${view === 'table' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Table2 size={13} />
              </button>
            </div>

            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-xl text-xs font-black transition-all">
              <Download size={12} /> تصدير
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all">
              <DollarSign size={13} /> صرف رواتب
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest shrink-0">الحالة:</span>
                {uniqueStatuses.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${statusFilter === s
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'
                      }`}
                  >
                    {s === 'all' ? 'الكل' : s === 'active' ? 'نشط' : s}
                  </button>
                ))}
                {filtered.length !== employees.length && (
                  <span className="mr-auto text-[11px] text-slate-600 font-bold">{filtered.length} من {employees.length}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Loading ──────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* ── Cards View ───────────────────────────────────────── */}
      {!loading && view === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((emp, i) => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                index={i}
                balance={0}
                onActionSuccess={handleActionSuccess}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-3 py-20 text-center">
              <Users size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="text-slate-600 font-black italic text-sm">لا يوجد موظفون مطابقون للبحث</p>
            </div>
          )}
        </div>
      )}

      {/* ── Table View ────────────────────────────────────────── */}
      {!loading && view === 'table' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/40 border-b border-white/5">
                <tr className="text-slate-500 font-black uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">الموظف</th>
                  <th className="px-5 py-3.5">الوظيفة</th>
                  <th className="px-5 py-3.5">الرقم الوظيفي</th>
                  <th className="px-5 py-3.5 text-center">الراتب</th>
                  <th className="px-5 py-3.5 text-center">السلف</th>
                  <th className="px-5 py-3.5 text-center">الرصيد</th>
                  <th className="px-5 py-3.5 text-center">الحالة</th>
                  <th className="px-5 py-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => (
                  <EmployeeTableRow
                    key={emp.id}
                    employee={emp}
                    index={i}
                    balance={0}
                    onActionSuccess={handleActionSuccess}
                  />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-20 text-center">
                <Users size={32} className="mx-auto text-slate-700 mb-2" />
                <p className="text-slate-600 font-black text-sm">لا يوجد موظفون مطابقون</p>
              </div>
            )}
          </div>
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between bg-slate-950/20">
              <span className="text-[11px] text-slate-600 font-bold">{filtered.length} موظف</span>
              <span className="text-[11px] text-slate-600 font-bold font-mono">
                إجمالي الرواتب: ₪{money(filtered.reduce((s, e) => s + (e.calculated_salary ?? e.salary ?? 0), 0))}
                · السلف: ₪{money(filtered.reduce((s, e) => s + (e.outstanding_advance ?? 0), 0))}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default EmployeesTab;