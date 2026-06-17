// src/components/administration/customers/CustomerDirectory.tsx
// دليل العملاء — واجهة ERP حديثة ومتكاملة

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Wallet,
    Users,
    Building2,
    Phone,
    Mail,
    MapPin,
    Edit2,
    Trash2,
    Eye,
    DollarSign,
    AlertTriangle,
    ShieldCheck,
    Clock,
    CreditCard,
    X,
    Save,
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
} from "lucide-react";
import { customerService, type Customer, type CustomerForm } from "../../../services/customerService";

// ─── Helpers ───────────────────────────────────────────────

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

const riskBadge = (risk: string) => {
    const map: Record<string, string> = {
        low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        critical: "bg-red-600/10 text-red-400 border-red-600/20",
    };
    return map[risk] || map.low;
};

const balanceColor = (bal: number) =>
    bal > 0 ? "text-rose-400" : bal < 0 ? "text-emerald-400" : "text-slate-400";

// ─── Summary Card ──────────────────────────────────────────

const SummaryCard: React.FC<{
    label: string; value: string; icon: React.ElementType;
    color: string; bg: string; border: string; trend?: string;
}> = ({ label, value, icon: Icon, color, bg, border, trend }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${bg} border ${border} rounded-2xl p-4 hover:scale-[1.02] transition-all duration-300`}
    >
        <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center ${color}`}>
                <Icon size={18} />
            </div>
            {trend && (
                <span className="text-[10px] text-emerald-400 font-bold">{trend}</span>
            )}
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">{label}</p>
        <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
    </motion.div>
);

// ─── Customer Form Modal ───────────────────────────────────

const CustomerFormModal: React.FC<{
    isOpen: boolean;
    customer: Customer | null;
    onClose: () => void;
    onSaved: () => void;
}> = ({ isOpen, customer, onClose, onSaved }) => {
    const [form, setForm] = useState<CustomerForm>({ name: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (customer) {
                setForm({
                    name: customer.name,
                    name_en: customer.name_en || "",
                    code: customer.code,
                    phone: customer.phone || "",
                    mobile: customer.mobile || "",
                    email: customer.email || "",
                    website: customer.website || "",
                    address: customer.address || "",
                    city: customer.city || "",
                    country: customer.country || "",
                    category: customer.category || "retail",
                    currency: customer.currency || "ILS",
                    status: customer.status,
                    risk_level: customer.risk_level,
                    credit_limit: customer.credit_limit,
                    payment_terms: customer.payment_terms || "net30",
                    credit_days: customer.credit_days || 30,
                    notes: customer.notes || "",
                    gps_link: customer.gps_link || "",
                    branch_id: customer.branch_id,
                    salesperson_id: customer.salesperson_id,
                });
            } else {
                setForm({
                    name: "",
                    currency: "ILS",
                    status: "active",
                    risk_level: "low",
                    payment_terms: "net30",
                    credit_days: 30,
                });
            }
            setError(null);
        }
    }, [isOpen, customer]);

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            setError("اسم العميل مطلوب");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (customer) {
                await customerService.update(customer.id, form);
            } else {
                await customerService.create(form);
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
                            {customer ? "تعديل العميل" : "إضافة عميل جديد"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {customer ? "تحديث بيانات العميل" : "إنشاء حساب جديد للعميل"}
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
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">اسم العميل *</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    placeholder="اسم العميل"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">الاسم بالإنجليزية</label>
                                <input
                                    value={form.name_en || ""}
                                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    placeholder="Customer Name"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">كود العميل</label>
                                <input
                                    value={form.code || ""}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                    placeholder="CUS-0001"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">التصنيف</label>
                                <select
                                    value={form.category || "retail"}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                >
                                    <option value="retail">تجزئة</option>
                                    <option value="wholesale">جملة</option>
                                    <option value="corporate">شركة</option>
                                    <option value="government">حكومي</option>
                                    <option value="service">خدمي</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">رقم الضريبي</label>
                                <input
                                    value={form.tax_number || ""}
                                    onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">مستوى المخاطرة</label>
                                <select
                                    value={form.risk_level || "low"}
                                    onChange={(e) => setForm({ ...form, risk_level: e.target.value })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                >
                                    <option value="low">منخفض</option>
                                    <option value="medium">متوسط</option>
                                    <option value="high">مرتفع</option>
                                    <option value="critical">حرج</option>
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
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">الموقع الإلكتروني</label>
                                <input
                                    value={form.website || ""}
                                    onChange={(e) => setForm({ ...form, website: e.target.value })}
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
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">الدولة</label>
                                <input
                                    value={form.country || ""}
                                    onChange={(e) => setForm({ ...form, country: e.target.value })}
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
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">أيام الائتمان</label>
                                <input
                                    type="number"
                                    value={form.credit_days || 30}
                                    onChange={(e) => setForm({ ...form, credit_days: parseInt(e.target.value) || 30 })}
                                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                                />
                            </div>
                            {!customer && (
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
                        {saving ? "جاري الحفظ..." : customer ? "حفظ التغييرات" : "إضافة العميل"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ─── Customer Card ─────────────────────────────────────────

const CustomerCard: React.FC<{
    customer: Customer;
    onEdit: () => void;
    onView: () => void;
    onDelete: () => void;
}> = ({ customer, onEdit, onView, onDelete }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all group"
    >
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black text-lg shadow-lg">
                    {customer.name.charAt(0)}
                </div>
                <div>
                    <h4 className="font-bold text-white text-sm">{customer.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{customer.code}</p>
                </div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border ${statusBadge(customer.status)}`}>
                {customer.status === "active" ? "نشط" : customer.status === "inactive" ? "غير نشط" : "محظور"}
            </span>
        </div>

        <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-500 font-bold">الرصيد الحالي</span>
            <span className={`text-lg font-black font-mono ${balanceColor(customer.balance)}`}>
                ₪{money(Math.abs(customer.balance))}
            </span>
        </div>

        {customer.credit_limit > 0 && (
            <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>استخدام الائتمان</span>
                    <span>{customer.credit_usage_percent}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${customer.credit_usage_percent > 80 ? "bg-rose-500" :
                                customer.credit_usage_percent > 50 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                        style={{ width: `${customer.credit_usage_percent}%` }}
                    />
                </div>
            </div>
        )}

        <div className="space-y-2 mb-4">
            {customer.phone && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Phone size={11} /> {customer.phone}
                </div>
            )}
            {customer.email && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Mail size={11} /> {customer.email}
                </div>
            )}
            {customer.city && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <MapPin size={11} /> {customer.city}
                </div>
            )}
            <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black border ${riskBadge(customer.risk_level)}`}>
                    {customer.risk_level === "low" ? "منخفض" :
                        customer.risk_level === "medium" ? "متوسط" :
                            customer.risk_level === "high" ? "مرتفع" : "حرج"}
                </span>
                {customer.is_over_limit && (
                    <span className="px-2 py-0.5 rounded-lg text-[8px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/25">
                        تجاوز الحد
                    </span>
                )}
            </div>
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

// ─── Main Customer Directory ───────────────────────────────

const CustomerDirectory: React.FC<{
    onViewCustomer?: (id: number) => void;
}> = ({ onViewCustomer }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [summary, setSummary] = useState({
        total: 0,
        receivables: 0,
        overdue: 0,
        active: 0,
        at_risk: 0,
    });

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await customerService.list({ search, page, per_page: 20 });
            const data = res.data;
            const items = Array.isArray(data) ? data : data.data || [];
            setCustomers(items);
            setTotalPages((data as any).last_page || 1);
            setTotal((data as any).total || items.length);

            // Compute summary
            const receivables = items.reduce((s: number, c: Customer) => s + Math.max(c.balance, 0), 0);
            setSummary({
                total: items.length,
                receivables,
                overdue: items.filter((c: Customer) => c.balance > 0).length,
                active: items.filter((c: Customer) => c.status === "active").length,
                at_risk: items.filter((c: Customer) => c.risk_level === "high" || c.risk_level === "critical").length,
            });
        } catch (err) {
            console.error("Failed to load customers", err);
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا العميل؟")) return;
        try {
            await customerService.delete(id);
            fetchCustomers();
        } catch { }
    };

    return (
        <div className="space-y-5" dir="rtl">
            {/* ── Summary Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <SummaryCard
                    label="إجمالي العملاء"
                    value={total.toString()}
                    icon={Users}
                    color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20"
                />
                <SummaryCard
                    label="الذمم المدينة"
                    value={`₪${money(summary.receivables)}`}
                    icon={TrendingUp}
                    color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20"
                />
                <SummaryCard
                    label="عملاء نشطين"
                    value={summary.active.toString()}
                    icon={Building2}
                    color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20"
                />
                <SummaryCard
                    label="عليهم مستحقات"
                    value={summary.overdue.toString()}
                    icon={AlertTriangle}
                    color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20"
                />
                <SummaryCard
                    label="مخاطر عالية"
                    value={summary.at_risk.toString()}
                    icon={ShieldCheck}
                    color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20"
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
                                placeholder="بحث عن عميل..."
                                className="w-full bg-slate-950 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchCustomers} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all">
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>
                        <button
                            onClick={() => { setEditingCustomer(null); setShowForm(true); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                        >
                            <Plus size={14} /> إضافة عميل
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Customer Grid ──────────────────────────────────── */}
            {loading ? (
                <div className="bg-slate-900 border border-white/5 rounded-3xl flex items-center justify-center h-64">
                    <RefreshCw size={24} className="animate-spin text-slate-600" />
                </div>
            ) : customers.length === 0 ? (
                <div className="bg-slate-900 border border-white/5 rounded-3xl flex flex-col items-center justify-center h-64 gap-3">
                    <Users size={40} className="text-slate-700" />
                    <p className="text-slate-500 font-bold">لا يوجد عملاء</p>
                    <button onClick={() => setShowForm(true)} className="text-blue-400 text-sm hover:underline">
                        إضافة عميل جديد
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {customers.map((customer) => (
                            <CustomerCard
                                key={customer.id}
                                customer={customer}
                                onEdit={() => { setEditingCustomer(customer); setShowForm(true); }}
                                onView={() => onViewCustomer?.(customer.id)}
                                onDelete={() => handleDelete(customer.id)}
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
            <CustomerFormModal
                isOpen={showForm}
                customer={editingCustomer}
                onClose={() => { setShowForm(false); setEditingCustomer(null); }}
                onSaved={fetchCustomers}
            />
        </div>
    );
};

export default CustomerDirectory;