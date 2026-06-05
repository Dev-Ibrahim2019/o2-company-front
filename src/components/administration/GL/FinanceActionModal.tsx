// src/components/administration/GL/FinanceActionModal.tsx
//
// إصلاحات:
// 1. تصميم متوافق مع الـ dark theme (slate-900, slate-950)
// 2. إصلاح endpoints الـ API لتتطابق مع الباك
// 3. إصلاح أنواع الـ actions لتتطابق مع EntityFinanceActions
// 4. إصلاح منطق salary_payment (gross_amount بدل gross_salary)
// 5. إصلاح salary_accrual المفقود
// 6. إزالة ربط account_id بـ raw number input — استبدله بـ select

import React, { useState, useEffect } from "react";
import api from "../../../api/axios";

type EntityType = "employee" | "customer" | "supplier";

type FinanceAction =
    | "advance"
    | "advance_repayment"
    | "salary_accrual"
    | "salary_payment"
    | "customer_invoice"
    | "customer_payment"
    | "supplier_bill"
    | "supplier_payment";

interface Account {
    id: number;
    name: string;
    code: string;
    type: string;
    allow_posting: boolean;
    is_active: boolean;
}

interface FinanceActionModalProps {
    action: FinanceAction;
    entityType: EntityType;
    entityId: number | null;
    entityName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// ── تعريفات الإجراءات ─────────────────────────────────────────────────────────

const ACTION_META: Record<
    FinanceAction,
    {
        title: string;
        color: string;
        bg: string;
        border: string;
        btnColor: string;
        icon: string;
        desc: string;
    }
> = {
    advance: {
        title: "منح سلفة",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        btnColor: "bg-amber-600 hover:bg-amber-700",
        icon: "ti-wallet",
        desc: "صرف سلفة من الصندوق للموظف",
    },
    advance_repayment: {
        title: "سداد سلفة",
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        btnColor: "bg-orange-600 hover:bg-orange-700",
        icon: "ti-refresh",
        desc: "استرداد سلفة من الموظف",
    },
    salary_accrual: {
        title: "استحقاق راتب",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        btnColor: "bg-blue-600 hover:bg-blue-700",
        icon: "ti-calendar-due",
        desc: "تسجيل راتب مستحق في نهاية الشهر",
    },
    salary_payment: {
        title: "دفع راتب",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        btnColor: "bg-emerald-600 hover:bg-emerald-700",
        icon: "ti-cash",
        desc: "صرف راتب الموظف الشهري",
    },
    customer_invoice: {
        title: "فاتورة عميل",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        btnColor: "bg-blue-600 hover:bg-blue-700",
        icon: "ti-file-invoice",
        desc: "تسجيل فاتورة مبيعات للعميل",
    },
    customer_payment: {
        title: "دفعة عميل",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        btnColor: "bg-emerald-600 hover:bg-emerald-700",
        icon: "ti-receipt",
        desc: "استلام دفعة من العميل",
    },
    supplier_bill: {
        title: "فاتورة مورد",
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        btnColor: "bg-rose-600 hover:bg-rose-700",
        icon: "ti-file-invoice",
        desc: "تسجيل فاتورة مشتريات من المورد",
    },
    supplier_payment: {
        title: "دفعة للمورد",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        btnColor: "bg-emerald-600 hover:bg-emerald-700",
        icon: "ti-send",
        desc: "صرف دفعة للمورد",
    },
};

// ── مساعدات ───────────────────────────────────────────────────────────────────

const inputCls =
    "w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white text-right outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-slate-600";

const selectCls = `${inputCls} cursor-pointer`;

const labelCls =
    "block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1.5";

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className={labelCls}>{children}</label>
);

// ── Component ─────────────────────────────────────────────────────────────────

const FinanceActionModal: React.FC<FinanceActionModalProps> = ({
    action,
    entityType,
    entityId,
    entityName,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const meta = ACTION_META[action];

    // ── form state ────────────────────────────────────────────────────────────
    const [amount, setAmount] = useState<string>("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState("");
    const [reference, setReference] = useState("");

    // حسابات النقدية/البنك
    const [cashAccountId, setCashAccountId] = useState<string>("");
    // حساب الإيرادات أو المصروفات
    const [offsetAccountId, setOffsetAccountId] = useState<string>("");
    // خصم السلف عند دفع الراتب
    const [advanceDeduction, setAdvanceDeduction] = useState<string>("0");

    // ── data ──────────────────────────────────────────────────────────────────
    const [cashAccounts, setCashAccounts] = useState<Account[]>([]);
    const [offsetAccounts, setOffsetAccounts] = useState<Account[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    // ── status ────────────────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    // ── جلب الحسابات عند الفتح ────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        // إعادة ضبط الفورم
        setAmount("");
        setDate(new Date().toISOString().split("T")[0]);
        setDescription("");
        setReference("");
        setCashAccountId("");
        setOffsetAccountId("");
        setAdvanceDeduction("0");
        setMessage(null);

        loadAccounts();
    }, [isOpen, action]);

    const loadAccounts = async () => {
        setLoadingAccounts(true);
        try {
            const { data } = await api.get("/accounting/accounts", {
                params: { is_active: true },
            });
            const accounts: Account[] = data.data ?? [];

            // حسابات النقدية والبنوك (1110xxx)
            const cash = accounts.filter(
                (a) =>
                    a.allow_posting &&
                    a.is_active &&
                    (a.code.startsWith("111") || a.type === "asset"),
            );
            setCashAccounts(cash);

            // حسابات الإيرادات أو المصروفات حسب الإجراء
            if (
                action === "customer_invoice" ||
                action === "supplier_bill"
            ) {
                const offset = accounts.filter(
                    (a) =>
                        a.allow_posting &&
                        a.is_active &&
                        (a.type === "revenue" || a.type === "expense"),
                );
                setOffsetAccounts(offset);
            }
        } catch (e) {
            console.error("Failed to load accounts", e);
        } finally {
            setLoadingAccounts(false);
        }
    };

    // ── إرسال الفورم ──────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entityId) return;

        setIsLoading(true);
        setMessage(null);

        try {
            let res;

            switch (action) {
                // ── الموظف ──────────────────────────────────────────────────
                case "advance":
                    // POST /api/employees/{id}/advance
                    res = await api.post(`/employees/${entityId}/advance`, {
                        amount: parseFloat(amount),
                        cash_account_id: parseInt(cashAccountId),
                        date,
                        description: description || undefined,
                    });
                    break;

                case "advance_repayment":
                    // POST /api/employees/{id}/advance-repayment
                    res = await api.post(
                        `/employees/${entityId}/advance-repayment`,
                        {
                            amount: parseFloat(amount),
                            cash_account_id: parseInt(cashAccountId),
                            date,
                            description: description || undefined,
                        },
                    );
                    break;

                case "salary_accrual":
                    // POST /api/employees/{id}/salary-accrual
                    res = await api.post(
                        `/employees/${entityId}/salary-accrual`,
                        {
                            amount: parseFloat(amount),
                            date,
                            description: description || undefined,
                        },
                    );
                    break;

                case "salary_payment":
                    // POST /api/employees/{id}/salary-payment
                    res = await api.post(
                        `/employees/${entityId}/salary-payment`,
                        {
                            gross_amount: parseFloat(amount),
                            cash_account_id: parseInt(cashAccountId),
                            date,
                            advance_deduction: parseFloat(advanceDeduction) || 0,
                            description: description || undefined,
                        },
                    );
                    break;

                // ── العميل ──────────────────────────────────────────────────
                case "customer_invoice":
                    // POST /api/customers/{id}/invoice
                    res = await api.post(`/customers/${entityId}/invoice`, {
                        amount: parseFloat(amount),
                        offset_account_id: parseInt(offsetAccountId),
                        date,
                        reference: reference || undefined,
                    });
                    break;

                case "customer_payment":
                    // POST /api/customers/{id}/payment
                    res = await api.post(`/customers/${entityId}/payment`, {
                        amount: parseFloat(amount),
                        cash_account_id: parseInt(cashAccountId),
                        date,
                        reference: reference || undefined,
                    });
                    break;

                // ── المورد ──────────────────────────────────────────────────
                case "supplier_bill":
                    // POST /api/suppliers/{id}/bill
                    res = await api.post(`/suppliers/${entityId}/bill`, {
                        amount: parseFloat(amount),
                        offset_account_id: parseInt(offsetAccountId),
                        date,
                        reference: reference || undefined,
                    });
                    break;

                case "supplier_payment":
                    // POST /api/suppliers/{id}/payment
                    res = await api.post(`/suppliers/${entityId}/payment`, {
                        amount: parseFloat(amount),
                        cash_account_id: parseInt(cashAccountId),
                        date,
                        reference: reference || undefined,
                    });
                    break;

                default:
                    throw new Error("Unknown action");
            }

            setMessage({
                type: "success",
                text: res?.data?.message || "تمت العملية بنجاح",
            });

            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1200);
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.errors?.[Object.keys(err?.response?.data?.errors ?? {})[0]]?.[0] ||
                err?.message ||
                "حدث خطأ غير متوقع";
            setMessage({ type: "error", text: msg });
        } finally {
            setIsLoading(false);
        }
    };

    // ── حقول الإيرادات/المصروفات للعميل والمورد ───────────────────────────────
    const needsCashAccount = [
        "advance",
        "advance_repayment",
        "salary_payment",
        "customer_payment",
        "supplier_payment",
    ].includes(action);

    const needsOffsetAccount = [
        "customer_invoice",
        "supplier_bill",
    ].includes(action);

    const needsReference = [
        "customer_invoice",
        "customer_payment",
        "supplier_bill",
        "supplier_payment",
    ].includes(action);

    const needsAdvanceDeduction = action === "salary_payment";
    const hideAmountForSalaryAccrual = false; // salary_accrual يحتاج amount

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            dir="rtl"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden text-right">

                {/* Header */}
                <div className="p-6 border-b border-white/5">
                    <button
                        onClick={onClose}
                        className="absolute top-5 left-5 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        type="button"
                    >
                        <i className="ti ti-x" style={{ fontSize: 14 }} />
                    </button>

                    <div className="flex items-center gap-4">
                        <div
                            className={`w-12 h-12 rounded-2xl ${meta.bg} border ${meta.border} flex items-center justify-center ${meta.color} shrink-0`}
                        >
                            <i
                                className={`ti ${meta.icon}`}
                                style={{ fontSize: 22 }}
                            />
                        </div>
                        <div>
                            <h3 className={`text-lg font-black ${meta.color}`}>
                                {meta.title}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-bold">
                                {entityName} — {meta.desc}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* رسالة النتيجة */}
                    {message && (
                        <div
                            className={`p-3 rounded-2xl border text-xs font-bold text-right ${message.type === "success"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                                }`}
                        >
                            {message.type === "success" ? (
                                <i className="ti ti-check ml-1" />
                            ) : (
                                <i className="ti ti-alert-circle ml-1" />
                            )}
                            {message.text}
                        </div>
                    )}

                    {/* المبلغ */}
                    {!hideAmountForSalaryAccrual && (
                        <div>
                            <FieldLabel>
                                {action === "salary_payment"
                                    ? "الراتب الإجمالي (₪)"
                                    : "المبلغ (₪)"}
                            </FieldLabel>
                            <input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={inputCls}
                                placeholder="0.000"
                                required
                            />
                        </div>
                    )}

                    {/* خصم السلف عند دفع الراتب */}
                    {needsAdvanceDeduction && (
                        <div>
                            <FieldLabel>خصم السلف (₪)</FieldLabel>
                            <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={advanceDeduction}
                                onChange={(e) =>
                                    setAdvanceDeduction(e.target.value)
                                }
                                className={inputCls}
                                placeholder="0.000"
                            />
                            {amount && advanceDeduction && (
                                <p className="text-[10px] text-emerald-400 mt-1 font-bold">
                                    صافي الراتب: ₪
                                    {(
                                        parseFloat(amount || "0") -
                                        parseFloat(advanceDeduction || "0")
                                    ).toFixed(3)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* حساب النقدية/البنك */}
                    {needsCashAccount && (
                        <div>
                            <FieldLabel>حساب الصندوق / البنك</FieldLabel>
                            {loadingAccounts ? (
                                <div className="h-10 bg-slate-800/50 rounded-xl animate-pulse" />
                            ) : (
                                <select
                                    value={cashAccountId}
                                    onChange={(e) =>
                                        setCashAccountId(e.target.value)
                                    }
                                    className={selectCls}
                                    required
                                >
                                    <option value="">— اختر الحساب —</option>
                                    {cashAccounts.map((acc) => (
                                        <option
                                            key={acc.id}
                                            value={String(acc.id)}
                                        >
                                            {acc.code} — {acc.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* حساب الإيرادات/المصروفات */}
                    {needsOffsetAccount && (
                        <div>
                            <FieldLabel>
                                {entityType === "customer"
                                    ? "حساب الإيرادات"
                                    : "حساب المصروفات"}
                            </FieldLabel>
                            {loadingAccounts ? (
                                <div className="h-10 bg-slate-800/50 rounded-xl animate-pulse" />
                            ) : (
                                <select
                                    value={offsetAccountId}
                                    onChange={(e) =>
                                        setOffsetAccountId(e.target.value)
                                    }
                                    className={selectCls}
                                    required
                                >
                                    <option value="">— اختر الحساب —</option>
                                    {offsetAccounts.map((acc) => (
                                        <option
                                            key={acc.id}
                                            value={String(acc.id)}
                                        >
                                            {acc.code} — {acc.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* التاريخ */}
                    <div>
                        <FieldLabel>التاريخ</FieldLabel>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={inputCls}
                            required
                        />
                    </div>

                    {/* الرقم المرجعي */}
                    {needsReference && (
                        <div>
                            <FieldLabel>الرقم المرجعي (اختياري)</FieldLabel>
                            <input
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                className={inputCls}
                                placeholder="رقم الفاتورة أو المرجع..."
                            />
                        </div>
                    )}

                    {/* البيان */}
                    <div>
                        <FieldLabel>البيان (اختياري)</FieldLabel>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={`${inputCls} resize-none h-16 py-2`}
                            placeholder="وصف العملية..."
                        />
                    </div>

                    {/* أزرار */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all"
                            disabled={isLoading}
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={
                                isLoading ||
                                !amount ||
                                (needsCashAccount && !cashAccountId) ||
                                (needsOffsetAccount && !offsetAccountId)
                            }
                            className={`flex-1 py-2.5 text-white rounded-2xl font-black text-sm transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${meta.btnColor}`}
                        >
                            {isLoading ? (
                                <>
                                    <i
                                        className="ti ti-refresh animate-spin"
                                        style={{ fontSize: 16 }}
                                    />
                                    جاري التنفيذ...
                                </>
                            ) : (
                                <>
                                    <i
                                        className={`ti ${meta.icon}`}
                                        style={{ fontSize: 16 }}
                                    />
                                    تأكيد {meta.title}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FinanceActionModal;