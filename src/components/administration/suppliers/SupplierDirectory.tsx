// src/components/administration/suppliers/SupplierDirectory.tsx
// دليل الموردين — واجهة ERP حديثة ومتكاملة

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Filter,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Wallet,
    Users,
    Truck,
    Phone,
    Mail,
    MapPin,
    Edit2,
    Trash2,
    Eye,
    MoreHorizontal,
    DollarSign,
    AlertTriangle,
    Building2,
    Globe,
    ChevronLeft,
    ChevronRight,
    X,
    Save,
    Clock,
    CreditCard,
} from "lucide-react";
import { supplierService, type Supplier, type SupplierForm } from "../../../services/supplierService";

// ─── Helpers ───────────────────────────────────────────────────────────────

const money = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateFmt = (d: string) => {
    try {
        return new Date(d).toLocaleDateString("ar-SA", {
            day: "numeric", month: "short", year: "numeric",
        });
    } catch { return d; }
};

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
        inactive: "bg-slate-500/15 text-slate-400 border-slate-500/25",
        blocked: "bg-rose-500/15 text-rose-400 border-rose-500/25",
    };
    return map[status] || map.inactive;
};

const balanceColor = (bal: number) =>
    bal > 0 ? "text-rose-400" : bal < 0 ? "text-emerald-400" : "text-slate-400";

// ─── Summary Card ──────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
    label: string; value: string; icon: React.ElementType;
    color: string; bg: string; border: string;
}> = ({ label, value, icon: Icon, color, bg, border }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${bg} border ${border} rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300`}
    >
        <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center ${color}`}>
                <Icon size={18} />
            </div>
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">{label}</p>
        <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
    </motion.div>
);

// ─── Supplier Form Modal ───────────────────────────────────────────────────

const SupplierFormModal: React.FC<{
    isOpen: boolean;
    supplier: Supplier | null;
    onClose: () => void;
    onSaved: () => void;
}> = ({ isOpen, supplier, onClose, onSaved }) => {
    const [form, setForm] = useState<SupplierForm>({ name: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (supplier) {
                setForm({
                    name: supplier.name,
                    name_en: supplier.name_en || "",
                    code: supplier.code,
                    phone: supplier.phone || "",
                    mobile: supplier.mobile || "",
                    email: supplier.email || "",
                    address: supplier.address || "",
                    city: supplier.city || "",
                    category: supplier.category || "local",
                    currency: supplier.currency || "ILS",
                    status: supplier.status,
                    credit_limit: supplier.credit_limit,
                    payment_terms: supplier.payment_terms || "net30",
                    opening_balance: supplier.opening_balance,
                    notes: supplier.notes || "",
                    gps_link: supplier.gps_link || "",
                    branch_id: supplier.branch_id,
                });
            } else {
                setForm({ name: "", currency: "ILS", status: "active", payment_terms: "net30" });
            }
            setError(null);
        }
    }, [isOpen, supplier]);

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            setError("اسم المورد مطلوب");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (supplier) {
                await supplierService.update(supplier.id, form);
            } else {
                await supplierService.create(form);
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || "فشل الحفظ");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-white/5 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div>
                        <h3 className="text-lg font-black text-white">
                            {supplier ? "تعديل المورد" : "إضافة مورد جديد"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {supplier ? "تحديث بيانات المورد" : "إنشاء حساب جديد للمورد"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Basic Information */}
                    <div>
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Building2 size={16} className="text-blue-400" /> المعلومات الأساسية
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">اسم المورد *</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    placeholder="اسم المورد"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">الاسم بالإنجليزية</label>
                                <input
                                    value={form.name_en || ""}
                                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    placeholder="Supplier Name"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">كود المورد</label>
                                <input
                                    value={form.code || ""}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    placeholder="SUP-0001"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">التصنيف</label>
                                <select
                                    value={form.category || "local"}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                >
                                    <option value="local">محلي</option>
                                    <option value="international">دولي</option>
                                    <option value="service">خدمي</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="pt-4 border-t border-white/5">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Phone size={16} className="text-emerald-400" /> معلومات الاتصال
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">رقم الهاتف</label>
                                <input
                                    value={form.phone || ""}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">الجوال</label>
                                <input
                                    value={form.mobile || ""}
                                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">البريد الإلكتروني</label>
                                <input
                                    value={form.email || ""}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">المدينة</label>
                                <input
                                    value={form.city || ""}
                                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">العنوان</label>
                                <input
                                    value={form.address || ""}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Information */}
                    <div className="pt-4 border-t border-white/5">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <DollarSign size={16} className="text-amber-400" /> المعلومات المالية
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">العملة</label>
                                <select
                                    value={form.currency || "ILS"}
                                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                >
                                    <option value="ILS">₪ شيكل</option>
                                    <option value="USD">$ دولار</option>
                                    <option value="JOD">د.أ دينار</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">الحد الائتماني</label>
                                <input
                                    type="number"
                                    value={form.credit_limit || 0}
                                    onChange={(e) => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">شروط الدفع</label>
                                <select
                                    value={form.payment_terms || "net30"}
                                    onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                >
                                    <option value="immediate">فوري</option>
                                    <option value="net15">15 يوم</option>
                                    <option value="net30">30 يوم</option>
                                    <option value="net60">60 يوم</option>
                                    <option value="net90">90 يوم</option>
                                </select>
                            </div>
                            {!supplier && (
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold mb-1 block">الرصيد الافتتاحي</label>
                                    <input
                                        type="number"
                                        value={form.opening_balance || 0}
                                        onChange={(e) => setForm({ ...form, opening_balance: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">الحالة</label>
                                <select
                                    value={form.status || "active"}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                >
                                    <option value="active">نشط</option>
                                    <option value="inactive">غير نشط</option>
                                    <option value="blocked">محظور</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="pt-4 border-t border-white/5">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" /> إضافات
                        </h4>
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold mb-1 block">ملاحظات</label>
                            <textarea
                                value={form.notes || ""}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                rows={3}
                                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/5">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
                        إلغاء
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Save size={14} />
                        {saving ? "جاري الحفظ..." : supplier ? "حفظ التغييرات" : "إضافة المورد"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ─── Supplier Card ─────────────────────────────────────────────────────────

const SupplierCard: React.FC<{
    supplier: Supplier;
    onEdit: () => void;
    onView: () => void;
    onDelete: () => void;
}> = ({ supplier, onEdit, onView, onDelete }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all group"
    >
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-black text-lg shadow-lg">
                    {supplier.name.charAt(0)}
                </div>
                <div>
                    <h4 className="font-bold text-white text-sm">{supplier.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{supplier.code}</p>
                </div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border ${statusBadge(supplier.status)}`}>
                {supplier.status === "active" ? "نشط" : supplier.status === "inactive" ? "غير نشط" : "محظور"}
            </span>
        </div>

        <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-500 font-bold">الرصيد الحالي</span>
            <span className={`text-lg font-black font-mono ${balanceColor(supplier.balance)}`}>
                ₪{money(Math.abs(supplier.balance))}
            </span>
        </div>

        <div className="space-y-2 mb-4">
            {supplier.phone && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Phone size={11} /> {supplier.phone}
                </div>
            )}
            {supplier.email && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Mail size={11} /> {supplier.email}
                </div>
            )}
            {supplier.city && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <MapPin size={11} /> {supplier.city}
                </div>
            )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
            <button onClick={onView} className="flex-1 py-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-1.5">
                <Eye size={12} /> عرض
            </button>
            <button onClick={onEdit} className="flex-1 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[10px] font-black hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-1.5">
                <Edit2 size={12} /> تعديل
            </button>
            <button onClick={onDelete} className="py-2 px-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all">
                <Trash2 size={12} />
            </button>
        </div>
    </motion.div>
);

// ─── Main Supplier Directory ───────────────────────────────────────────────

const SupplierDirectory: React.FC<{
    onViewSupplier?: (id: number) => void;
}> = ({ onViewSupplier }) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [summary, setSummary] = useState({ total: 0, payables: 0, overdue: 0, active: 0 });

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await supplierService.list({ search, page, per_page: 20 });
            const data = res.data;
            const items = Array.isArray(data) ? data : data.data || [];
            setSuppliers(items);
            setTotalPages((data as any).last_page || 1);
            setTotal((data as any).total || items.length);

            // Compute summary
            const payables = items.reduce((s: number, sup: Supplier) => s + Math.max(sup.balance, 0), 0);
            setSummary({
                total: items.length,
                payables,
                overdue: items.filter((s: Supplier) => s.balance > 0).length,
                active: items.filter((s: Supplier) => s.status === "active").length,
            });
        } catch (err) {
            console.error("Failed to load suppliers", err);
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا المورد؟")) return;
        try {
            await supplierService.delete(id);
            fetchSuppliers();
        } catch { }
    };

    return (
        <div className="space-y-5" dir="rtl">
            {/* ── Summary Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard
                    label="إجمالي الموردين"
                    value={total.toString()}
                    icon={Users}
                    color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20"
                />
                <SummaryCard
                    label="المستحق للموردين"
                    value={`₪${money(summary.payables)}`}
                    icon={TrendingUp}
                    color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20"
                />
                <SummaryCard
                    label="موردين نشطين"
                    value={summary.active.toString()}
                    icon={Truck}
                    color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20"
                />
                <SummaryCard
                    label="موردين عليهم مستحقات"
                    value={summary.overdue.toString()}
                    icon={AlertTriangle}
                    color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20"
                />
            </div>

            {/* ── Filters ────────────────────────────────────────── */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 w-full">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="بحث عن مورد..."
                                className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchSuppliers} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all">
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>
                        <button
                            onClick={() => { setEditingSupplier(null); setShowForm(true); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                        >
                            <Plus size={14} /> إضافة مورد
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Supplier Grid ──────────────────────────────────── */}
            {loading ? (
                <div className="bg-slate-900 border border-white/5 rounded-3xl flex items-center justify-center h-64">
                    <RefreshCw size={24} className="animate-spin text-slate-600" />
                </div>
            ) : suppliers.length === 0 ? (
                <div className="bg-slate-900 border border-white/5 rounded-3xl flex flex-col items-center justify-center h-64 gap-3">
                    <Truck size={40} className="text-slate-700" />
                    <p className="text-slate-500 font-bold">لا يوجد موردين</p>
                    <button onClick={() => setShowForm(true)} className="text-blue-400 text-sm hover:underline">
                        إضافة مورد جديد
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {suppliers.map((supplier) => (
                            <SupplierCard
                                key={supplier.id}
                                supplier={supplier}
                                onEdit={() => { setEditingSupplier(supplier); setShowForm(true); }}
                                onView={() => onViewSupplier?.(supplier.id)}
                                onDelete={() => handleDelete(supplier.id)}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <span className="text-sm text-slate-500">
                                {page} / {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Form Modal */}
            <SupplierFormModal
                isOpen={showForm}
                supplier={editingSupplier}
                onClose={() => { setShowForm(false); setEditingSupplier(null); }}
                onSaved={fetchSuppliers}
            />
        </div>
    );
};

export default SupplierDirectory;