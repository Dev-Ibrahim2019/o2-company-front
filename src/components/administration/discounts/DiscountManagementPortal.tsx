// src/components/administration/discounts/DiscountManagementPortal.tsx
// بوابة إدارة الخصومات — الواجهة الرئيسية

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Tag,
    Percent,
    List,
    Clock,
    BarChart3,
    Settings,
    Plus,
    AlertCircle,
    Loader2,
    Search,
    SlidersHorizontal,
    ChevronLeft,
} from "lucide-react";
import { discountService, type Discount, type DiscountTarget } from "../../../services/discountService";

// ── Tabs ──
type TabKey = "dashboard" | "active" | "all" | "expired" | "settings";

const TABS: { key: TabKey; label: string; icon: React.FC<any> }[] = [
    { key: "dashboard", label: "لوحة الخصومات", icon: BarChart3 },
    { key: "active", label: "الخصومات النشطة", icon: Percent },
    { key: "all", label: "جميع الخصومات", icon: List },
    { key: "expired", label: "الخصومات المنتهية", icon: Clock },
    { key: "settings", label: "إعدادات الخصومات", icon: Settings },
];

export const DiscountManagementPortal: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editDiscount, setEditDiscount] = useState<Discount | null>(null);
    const [dashboardStats, setDashboardStats] = useState<any>(null);

    const fetchDiscounts = useCallback(async (status?: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await discountService.getAll({ status, search: searchQuery || undefined });
            setDiscounts(response.data ?? []);
        } catch (err: any) {
            setError(err.message || "فشل تحميل الخصومات");
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const response = await discountService.dashboard();
            setDashboardStats(response.data);
        } catch (err: any) {
            setError(err.message || "فشل تحميل الإحصائيات");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "dashboard") {
            fetchDashboard();
        } else {
            const statusMap: Record<TabKey, string | undefined> = {
                dashboard: undefined,
                active: "active",
                all: undefined,
                expired: "expired",
                settings: undefined,
            };
            fetchDiscounts(statusMap[activeTab]);
        }
    }, [activeTab, fetchDiscounts, fetchDashboard]);

    const handleDelete = async (id: number) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا الخصم؟")) return;
        try {
            await discountService.delete(id);
            setDiscounts((prev) => prev.filter((d) => d.id !== id));
        } catch (err: any) {
            setError(err.message || "فشل حذف الخصم");
        }
    };

    const handleCreated = () => {
        setShowCreateModal(false);
        setEditDiscount(null);
        fetchDiscounts(activeTab === "dashboard" ? undefined : activeTab === "active" ? "active" : activeTab === "expired" ? "expired" : undefined);
    };

    const renderTabContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="text-purple-500 animate-spin" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center py-20">
                    <div className="bg-red-600/20 border border-red-500/30 rounded-xl px-6 py-4 flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-400" />
                        <span className="text-red-300">{error}</span>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case "dashboard":
                return <DashboardContent stats={dashboardStats} />;
            case "settings":
                return <SettingsContent />;
            default:
                return (
                    <DiscountListContent
                        discounts={discounts}
                        onEdit={(d) => { setEditDiscount(d); setShowCreateModal(true); }}
                        onDelete={handleDelete}
                        onToggleStatus={handleCreated}
                    />
                );
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <Tag className="text-purple-500" size={24} />
                    <h1 className="text-xl font-black">إدارة الخصومات</h1>
                </div>
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-800 border border-white/10 rounded-xl px-4 py-2 pr-10 text-sm text-white placeholder-white/30 w-48 focus:outline-none focus:border-purple-500/50"
                        />
                    </div>
                    {/* Create Button */}
                    <button
                        onClick={() => { setEditDiscount(null); setShowCreateModal(true); }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors"
                    >
                        <Plus size={16} />
                        خصم جديد
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 py-3 border-b border-white/5 overflow-x-auto">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.key
                                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {renderTabContent()}
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <DiscountFormModal
                        editDiscount={editDiscount}
                        onClose={() => { setShowCreateModal(false); setEditDiscount(null); }}
                        onSaved={handleCreated}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ═══════════════════════════════════════════════════════
// Dashboard Content
// ═══════════════════════════════════════════════════════
const DashboardContent: React.FC<{ stats: any }> = ({ stats }) => {
    if (!stats) return null;

    const cards = [
        { label: "إجمالي الخصومات", value: stats.stats?.total_discounts ?? 0, color: "from-blue-500 to-blue-700" },
        { label: "نشطة حالياً", value: stats.stats?.active_discounts ?? 0, color: "from-green-500 to-green-700" },
        { label: "منتهية", value: stats.stats?.expired_discounts ?? 0, color: "from-red-500 to-red-700" },
        { label: "نسبة مئوية", value: stats.stats?.percentage_discounts ?? 0, color: "from-purple-500 to-purple-700" },
        { label: "مبلغ ثابت", value: stats.stats?.fixed_discounts ?? 0, color: "from-yellow-500 to-yellow-700" },
        { label: "تجاوز سعر", value: stats.stats?.price_override_discounts ?? 0, color: "from-cyan-500 to-cyan-700" },
        { label: "مرات الاستخدام", value: stats.stats?.total_usage ?? 0, color: "from-orange-500 to-orange-700" },
        { label: "قيمة الخصومات", value: `${(stats.stats?.total_discount_amount ?? 0).toFixed(2)} ₪`, color: "from-pink-500 to-pink-700" },
    ];

    return (
        <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {cards.map((card) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 shadow-lg`}
                    >
                        <div className="text-3xl font-black mb-1">{card.value}</div>
                        <div className="text-sm text-white/70">{card.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Recent Usage */}
            {stats.recent_usage?.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold mb-4">آخر استخدامات الخصومات</h3>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-white/50">
                                    <th className="text-right p-3">الخصم</th>
                                    <th className="text-right p-3">المبلغ</th>
                                    <th className="text-right p-3">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent_usage.map((log: any, i: number) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-3">{log.discount?.name || log.discount_id}</td>
                                        <td className="p-3 text-yellow-400">{log.discount_amount} ₪</td>
                                        <td className="p-3 text-white/50">{new Date(log.created_at).toLocaleDateString("ar")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════
// Discount List Content
// ═══════════════════════════════════════════════════════
const DiscountListContent: React.FC<{
    discounts: Discount[];
    onEdit: (d: Discount) => void;
    onDelete: (id: number) => void;
    onToggleStatus: () => void;
}> = ({ discounts, onEdit, onDelete }) => {
    if (discounts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
                <Tag size={48} className="mb-4" />
                <p className="text-lg">لا توجد خصومات</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {discounts.map((discount) => (
                <motion.div
                    key={discount.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-white/10 rounded-2xl p-4 hover:border-purple-500/30 transition-all"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-bold text-lg">{discount.name_ar || discount.name}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${discount.is_valid ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
                                    }`}>
                                    {discount.is_valid ? "نشط" : "غير نشط"}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-purple-600/20 text-purple-400">
                                    {discount.discount_type_label}
                                </span>
                            </div>
                            <p className="text-white/50 text-sm mb-2">{discount.description}</p>
                            <div className="flex items-center gap-4 text-sm text-white/40">
                                <span>القيمة: <strong className="text-yellow-400">{discount.value}{discount.discount_type === 'percentage' ? '%' : ' ₪'}</strong></span>
                                <span>الكود: <strong className="text-white/60">{discount.code}</strong></span>
                                {discount.start_date && <span>من: {discount.start_date}</span>}
                                {discount.end_date && <span>إلى: {discount.end_date}</span>}
                            </div>
                            {discount.targets && discount.targets.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {discount.targets.map((t, i) => (
                                        <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded-lg text-white/50">
                                            {t.target_type_label}{t.target_name ? `: ${t.target_name}` : ''}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onEdit(discount)}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                title="تعديل"
                            >
                                <SlidersHorizontal size={16} className="text-white/40" />
                            </button>
                            <button
                                onClick={() => onDelete(discount.id)}
                                className="p-2 hover:bg-red-600/20 rounded-xl transition-colors"
                                title="حذف"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════
// Create/Edit Discount Form Modal (Wizard)
// ═══════════════════════════════════════════════════════
const DiscountFormModal: React.FC<{
    editDiscount: Discount | null;
    onClose: () => void;
    onSaved: () => void;
}> = ({ editDiscount, onClose, onSaved }) => {
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState(editDiscount?.name ?? "");
    const [nameAr, setNameAr] = useState(editDiscount?.name_ar ?? "");
    const [code, setCode] = useState(editDiscount?.code ?? "");
    const [description, setDescription] = useState(editDiscount?.description ?? "");
    const [discountType, setDiscountType] = useState<string>(editDiscount?.discount_type ?? "percentage");
    const [value, setValue] = useState(editDiscount?.value ?? 0);
    const [priority, setPriority] = useState(editDiscount?.priority ?? 0);
    const [startDate, setStartDate] = useState(editDiscount?.start_date ?? "");
    const [endDate, setEndDate] = useState(editDiscount?.end_date ?? "");
    const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | null>(editDiscount?.max_discount_amount ?? null);
    const [minOrderAmount, setMinOrderAmount] = useState<number | null>(editDiscount?.min_order_amount ?? null);

    // Targets
    const [targets, setTargets] = useState<DiscountTarget[]>(
        editDiscount?.targets?.map(t => ({
            target_type: t.target_type as DiscountTarget["target_type"],
            target_id: t.target_id ?? null
        })) ?? []
    );

    const handleSave = async () => {
        setSaving(true);
        setFormError(null);
        try {
            const payload = {
                name,
                name_ar: nameAr || undefined,
                code,
                description: description || undefined,
                discount_type: discountType as any,
                value,
                priority,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                max_discount_amount: maxDiscountAmount ?? undefined,
                min_order_amount: minOrderAmount ?? undefined,
                targets: targets.length > 0 ? targets : undefined,
            };

            if (editDiscount) {
                await discountService.update(editDiscount.id, payload);
            } else {
                await discountService.create(payload);
            }
            onSaved();
        } catch (err: any) {
            setFormError(err.message || "فشل حفظ الخصم");
        } finally {
            setSaving(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">البيانات الأساسية</h3>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">الاسم (عربي)</label>
                            <input value={nameAr} onChange={e => setNameAr(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
                        </div>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">الاسم (إنجليزي)</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
                        </div>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">كود الخصم</label>
                            <input value={code} onChange={e => setCode(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white font-mono" />
                        </div>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">الوصف</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white h-20" />
                        </div>
                    </div>
                );

            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">الفئة المستهدفة</h3>
                        {targets.map((target, i) => (
                            <div key={i} className="flex gap-2">
                                <select
                                    value={target.target_type}
                                    onChange={e => {
                                        const newTargets = [...targets];
                                        newTargets[i] = { ...newTargets[i], target_type: e.target.value as DiscountTarget["target_type"], target_id: null };
                                        setTargets(newTargets);
                                    }}
                                    className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white flex-1"
                                >
                                    <option value="customer">عميل</option>
                                    <option value="employee">موظف</option>
                                    <option value="supplier">مورد</option>
                                    <option value="department">قسم</option>
                                    <option value="item">صنف</option>
                                    <option value="all_customers">جميع العملاء</option>
                                    <option value="all_employees">جميع الموظفين</option>
                                    <option value="all_suppliers">جميع الموردين</option>
                                    <option value="all">الجميع</option>
                                </select>
                                {(target.target_type === 'customer' || target.target_type === 'employee' || target.target_type === 'supplier' || target.target_type === 'department' || target.target_type === 'item') && (
                                    <input
                                        type="number"
                                        placeholder="رقم المعرف"
                                        value={target.target_id ?? ''}
                                        onChange={e => {
                                            const newTargets = [...targets];
                                            newTargets[i] = { ...newTargets[i], target_id: parseInt(e.target.value) || null };
                                            setTargets(newTargets);
                                        }}
                                        className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white w-32"
                                    />
                                )}
                                <button onClick={() => setTargets(targets.filter((_, j) => j !== i))} className="p-2 text-red-400">
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setTargets([...targets, { target_type: 'all' as DiscountTarget["target_type"], target_id: null }])}
                            className="text-purple-400 text-sm font-bold hover:text-purple-300"
                        >
                            + إضافة مستهدف
                        </button>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">قيمة الخصم</h3>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">نوع الخصم</label>
                            <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white">
                                <option value="percentage">نسبة مئوية</option>
                                <option value="fixed_amount">مبلغ ثابت</option>
                                <option value="price_override">تجاوز السعر</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">
                                {discountType === 'percentage' ? 'نسبة الخصم (%)' : discountType === 'fixed_amount' ? 'قيمة الخصم (₪)' : 'السعر الجديد (₪)'}
                            </label>
                            <input type="number" value={value} onChange={e => setValue(parseFloat(e.target.value) || 0)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
                        </div>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">الحد الأقصى للخصم (₪) — اختياري</label>
                            <input type="number" value={maxDiscountAmount ?? ''} onChange={e => setMaxDiscountAmount(parseFloat(e.target.value) || null)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
                        </div>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">الحد الأدنى للطلب (₪) — اختياري</label>
                            <input type="number" value={minOrderAmount ?? ''} onChange={e => setMinOrderAmount(parseFloat(e.target.value) || null)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">فترة الصلاحية</h3>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">تاريخ البداية</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
                        </div>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">تاريخ النهاية</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
                        </div>
                        <div>
                            <label className="text-sm text-white/50 block mb-1">الأولوية (الأصغر = الأسبق)</label>
                            <input type="number" value={priority} onChange={e => setPriority(parseInt(e.target.value) || 0)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white" />
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">مراجعة وحفظ</h3>
                        <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-sm">
                            <p><span className="text-white/50">الاسم:</span> {nameAr || name}</p>
                            <p><span className="text-white/50">الكود:</span> {code}</p>
                            <p><span className="text-white/50">النوع:</span> {{ percentage: 'نسبة مئوية', fixed_amount: 'مبلغ ثابت', price_override: 'تجاوز السعر' }[discountType]}</p>
                            <p><span className="text-white/50">القيمة:</span> {value}{discountType === 'percentage' ? '%' : ' ₪'}</p>
                            <p><span className="text-white/50">الأولوية:</span> {priority}</p>
                            {startDate && <p><span className="text-white/50">من:</span> {startDate}</p>}
                            {endDate && <p><span className="text-white/50">إلى:</span> {endDate}</p>}
                            {targets.length > 0 && (
                                <div>
                                    <span className="text-white/50">المستهدفون:</span>
                                    <ul className="list-disc list-inside mr-4 mt-1">
                                        {targets.map((t, i) => (
                                            <li key={i}>{t.target_type}{t.target_id ? ` (${t.target_id})` : ''}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Steps indicator */}
                <div className="flex gap-2 mb-6">
                    {[0, 1, 2, 3, 4].map((s) => (
                        <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-purple-500' : 'bg-white/10'}`} />
                    ))}
                </div>

                {formError && (
                    <div className="bg-red-600/20 border border-red-500/30 rounded-xl px-4 py-2 mb-4 text-red-300 text-sm">
                        {formError}
                    </div>
                )}

                {renderStep()}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                    {step > 0 ? (
                        <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-white/50 hover:text-white">
                            <ChevronLeft size={16} />
                            السابق
                        </button>
                    ) : <div />}
                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold"
                        >
                            التالي
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            {editDiscount ? 'تحديث' : 'حفظ'}
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════
// Settings Content
// ═══════════════════════════════════════════════════════
const SettingsContent: React.FC = () => {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch settings from discount_settings via API if available
        setLoading(false);
    }, []);

    return (
        <div className="max-w-2xl">
            <h3 className="font-bold text-lg mb-4">إعدادات الخصومات</h3>
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                    <div>
                        <div className="font-bold">حساب خصومات المبيعات</div>
                        <div className="text-sm text-white/50">كود حساب خصومات المبيعات في شجرة الحسابات</div>
                    </div>
                    <code className="bg-slate-700 px-3 py-1 rounded-lg text-purple-400">4120</code>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                    <div>
                        <div className="font-bold">أقصى نسبة خصم</div>
                        <div className="text-sm text-white/50">الحد الأقصى المسموح به لنسبة الخصم</div>
                    </div>
                    <code className="bg-slate-700 px-3 py-1 rounded-lg text-yellow-400">100%</code>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                    <div>
                        <div className="font-bold">الخصومات المركبة</div>
                        <div className="text-sm text-white/50">السماح بتطبيق أكثر من خصم على نفس الصنف</div>
                    </div>
                    <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-lg text-sm">مفعل</span>
                </div>
            </div>
        </div>
    );
};

export default DiscountManagementPortal;