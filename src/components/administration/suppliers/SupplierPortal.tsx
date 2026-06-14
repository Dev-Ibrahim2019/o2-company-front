// src/components/administration/suppliers/SupplierPortal.tsx
// بوابة الموردين — تدير جميع الصفحات الفرعية لوحدة الموردين

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Truck,
    LayoutDashboard,
    Users,
    FileText,
    Wallet,
    Clock,
    TrendingUp,
    ChevronRight,
    BarChart3,
    Receipt,
} from 'lucide-react';
import SupplierDirectory from './SupplierDirectory';
import SupplierProfile from './SupplierProfile';

type SupplierView =
    | 'dashboard'
    | 'directory'
    | 'statements'
    | 'payments'
    | 'aging';

interface SupplierPortalProps {
    onNavigate?: (view: string) => void;
}

const SupplierPortal: React.FC<SupplierPortalProps> = ({ onNavigate }) => {
    const [activeView, setActiveView] = useState<SupplierView>('dashboard');
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

    const tabs: { key: SupplierView; label: string; icon: React.ElementType }[] = [
        { key: 'dashboard', label: 'لوحة الموردين', icon: LayoutDashboard },
        { key: 'directory', label: 'دليل الموردين', icon: Users },
        { key: 'statements', label: 'كشوفات الحساب', icon: FileText },
        { key: 'payments', label: 'المدفوعات', icon: Wallet },
        { key: 'aging', label: 'تحليل الأعمار', icon: Clock },
    ];

    return (
        <div className="space-y-5" dir="rtl">
            {/* Sub-navigation */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-2 flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveView(tab.key); setSelectedSupplierId(null); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${activeView === tab.key
                                ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {selectedSupplierId ? (
                <SupplierProfile
                    supplierId={selectedSupplierId}
                    onBack={() => setSelectedSupplierId(null)}
                />
            ) : activeView === 'directory' ? (
                <SupplierDirectory onViewSupplier={(id) => setSelectedSupplierId(id)} />
            ) : activeView === 'dashboard' ? (
                <SupplierDashboard />
            ) : activeView === 'statements' ? (
                <SupplierStatements />
            ) : activeView === 'payments' ? (
                <SupplierPayments />
            ) : activeView === 'aging' ? (
                <SupplierAgingReport />
            ) : null}
        </div>
    );
};

// ─── Supplier Dashboard ──────────────────────────────────────────────────

const SupplierDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);

    React.useEffect(() => {
        import('../../../services/supplierService').then(async ({ supplierService }) => {
            try {
                const [listRes, agingRes] = await Promise.all([
                    supplierService.list({ per_page: 100, status: 'active' }),
                    supplierService.getAgingReport(),
                ]);
                const items = Array.isArray(listRes.data) ? listRes.data : listRes.data?.data || [];
                setSuppliers(items);

                let totalPayables = 0;
                let overdueCount = 0;
                items.forEach((s: any) => {
                    if (s.balance > 0) {
                        totalPayables += s.balance;
                    }
                });

                setStats({
                    total_suppliers: items.length,
                    total_payables: totalPayables,
                    overdue_suppliers: items.filter((s: any) => s.balance > 0).length,
                    aging_totals: agingRes.data?.totals,
                });
            } catch { } finally { setLoading(false); }
        });
    }, []);

    const money = (v: number) => v?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00';

    if (loading) {
        return (
            <div className="bg-slate-900 border border-white/5 rounded-3xl h-64 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/20 rounded-3xl p-5">
                    <p className="text-[10px] text-blue-300 font-black mb-1">إجمالي الموردين</p>
                    <p className="text-2xl font-black text-white">{stats?.total_suppliers || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-600/20 to-rose-900/20 border border-rose-500/20 rounded-3xl p-5">
                    <p className="text-[10px] text-rose-300 font-black mb-1">المستحق للموردين</p>
                    <p className="text-2xl font-black text-rose-400">₪{money(stats?.total_payables)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-600/20 to-amber-900/20 border border-amber-500/20 rounded-3xl p-5">
                    <p className="text-[10px] text-amber-300 font-black mb-1">موردين عليهم مستحقات</p>
                    <p className="text-2xl font-black text-amber-400">{stats?.overdue_suppliers || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/20 rounded-3xl p-5">
                    <p className="text-[10px] text-emerald-300 font-black mb-1">الموردين النشطين</p>
                    <p className="text-2xl font-black text-emerald-400">{suppliers.length}</p>
                </div>
            </div>

            {/* Aging Summary */}
            {stats?.aging_totals && (
                <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-slate-500" /> تحليل الأعمار — جميع الموردين
                    </h4>
                    <div className="grid grid-cols-5 gap-3">
                        {[
                            { label: 'حالي', value: stats.aging_totals.current, color: 'emerald' },
                            { label: '1-30 يوم', value: stats.aging_totals['1_30'], color: 'blue' },
                            { label: '31-60 يوم', value: stats.aging_totals['31_60'], color: 'amber' },
                            { label: '61-90 يوم', value: stats.aging_totals['61_90'], color: 'orange' },
                            { label: '90+', value: stats.aging_totals.over_90, color: 'rose' },
                        ].map((item) => (
                            <div key={item.label} className={`bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-2xl p-4 text-center`}>
                                <p className="text-[10px] text-slate-500 font-black mb-1">{item.label}</p>
                                <p className={`text-lg font-black font-mono text-${item.color}-400`}>₪{money(item.value)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Suppliers */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-slate-500" /> أكبر الموردين (رصيد)
                </h4>
                <div className="space-y-3">
                    {suppliers
                        .sort((a: any, b: any) => Math.abs(b.balance) - Math.abs(a.balance))
                        .slice(0, 10)
                        .map((supplier: any, idx: number) => (
                            <div key={supplier.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-600 w-5">{idx + 1}</span>
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-bold text-xs">
                                        {supplier.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{supplier.name}</p>
                                        <p className="text-[10px] text-slate-500">{supplier.code}</p>
                                    </div>
                                </div>
                                <span className={`font-black font-mono ${supplier.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    ₪{money(Math.abs(supplier.balance))}
                                </span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

// ─── Supplier Statements ─────────────────────────────────────────────────

const SupplierStatements: React.FC = () => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        import('../../../services/supplierService').then(async ({ supplierService }) => {
            try {
                const res = await supplierService.list({ per_page: 50 });
                const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
                setSuppliers(items);
            } catch { } finally { setLoading(false); }
        });
    }, []);

    if (selectedId) {
        return <SupplierProfile supplierId={selectedId} onBack={() => setSelectedId(null)} />;
    }

    return (
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
            <h4 className="font-bold text-white mb-4">اختر المورد لعرض كشف الحساب</h4>
            {loading ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suppliers.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedId(s.id)}
                            className="flex items-center gap-3 p-4 bg-slate-800/50 border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all text-right"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-bold">
                                {s.name?.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white">{s.name}</p>
                                <p className="text-[10px] text-slate-500">{s.code}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-500" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Supplier Payments ───────────────────────────────────────────────────

const SupplierPayments: React.FC = () => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        import('../../../services/supplierService').then(async ({ supplierService }) => {
            try {
                const res = await supplierService.list({ per_page: 50 });
                const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
                setSuppliers(items.filter((s: any) => s.balance > 0));
            } catch { } finally { setLoading(false); }
        });
    }, []);

    const money = (v: number) => v?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00';

    return (
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
            <h4 className="font-bold text-white mb-4">الموردين المستحق عليهم دفعات</h4>
            {loading ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
            ) : suppliers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">لا يوجد موردين عليهم مستحقات</p>
            ) : (
                <div className="space-y-2">
                    {suppliers.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-4 bg-slate-800/30 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-bold">
                                    {s.name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{s.name}</p>
                                    <p className="text-[10px] text-slate-500">{s.code}</p>
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-rose-400">₪{money(s.balance)}</p>
                                <p className="text-[10px] text-slate-500">مستحق</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Supplier Aging Report ───────────────────────────────────────────────

const SupplierAgingReport: React.FC = () => {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        import('../../../services/supplierService').then(async ({ supplierService }) => {
            try {
                const res = await supplierService.getAgingReport();
                setReport(res.data);
            } catch { } finally { setLoading(false); }
        });
    }, []);

    const money = (v: number) => v?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00';

    if (loading) {
        return <div className="bg-slate-900 border border-white/5 rounded-3xl h-64 flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>;
    }

    return (
        <div className="space-y-5">
            {/* Totals */}
            {report?.totals && (
                <div className="grid grid-cols-5 gap-3">
                    {[
                        { label: 'حالي', value: report.totals.current, color: 'emerald' },
                        { label: '1-30 يوم', value: report.totals['1_30'], color: 'blue' },
                        { label: '31-60 يوم', value: report.totals['31_60'], color: 'amber' },
                        { label: '61-90 يوم', value: report.totals['61_90'], color: 'orange' },
                        { label: '90+', value: report.totals.over_90, color: 'rose' },
                    ].map((item) => (
                        <div key={item.label} className={`bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-2xl p-4 text-center`}>
                            <p className="text-[10px] text-slate-500 font-black mb-1">{item.label}</p>
                            <p className={`text-lg font-black font-mono text-${item.color}-400`}>₪{money(item.value)}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Supplier details */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden">
                <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/40 border-b border-white/5">
                        <tr className="text-slate-500 font-black text-[10px]">
                            <th className="px-4 py-3">المورد</th>
                            <th className="px-4 py-3 text-center">الرصيد</th>
                            <th className="px-4 py-3 text-center">حالي</th>
                            <th className="px-4 py-3 text-center">1-30</th>
                            <th className="px-4 py-3 text-center">31-60</th>
                            <th className="px-4 py-3 text-center">61-90</th>
                            <th className="px-4 py-3 text-center">90+</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {(report?.suppliers || []).map((s: any) => (
                            <tr key={s.id} className="hover:bg-white/[0.02]">
                                <td className="px-4 py-3 font-bold text-white">{s.name}</td>
                                <td className="px-4 py-3 text-center font-mono text-rose-400">₪{money(s.balance)}</td>
                                <td className="px-4 py-3 text-center font-mono text-emerald-400">₪{money(s.aging.current)}</td>
                                <td className="px-4 py-3 text-center font-mono text-blue-400">₪{money(s.aging['1_30'])}</td>
                                <td className="px-4 py-3 text-center font-mono text-amber-400">₪{money(s.aging['31_60'])}</td>
                                <td className="px-4 py-3 text-center font-mono text-orange-400">₪{money(s.aging['61_90'])}</td>
                                <td className="px-4 py-3 text-center font-mono text-rose-400">₪{money(s.aging.over_90)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SupplierPortal;