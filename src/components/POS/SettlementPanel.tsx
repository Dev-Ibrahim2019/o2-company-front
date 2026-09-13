// src/components/POS/SettlementPanel.tsx
// Unified Settlement & Payment Routing Panel for POS Cashier
// Supports: Cash, Bank, Card, Digital Wallet, Customer Account, Employee Account, Supplier Account
// Full mixed payment allocation with accounting integrity

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Banknote,
    CreditCard,
    Wallet,
    Zap,
    Users,
    UserCheck,
    Truck,
    CheckCircle,
    Trash2,
    X,
    Search,
    AlertCircle,
    FileText,
    UserPlus,
    Phone,
    Hash,
    Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { settlementService, type PaymentMethodDto, type PaymentEntryDto } from "../../services/settlementService";
import { customerService } from "../../services/customerService";
import { employeeService } from "../../services/employeeService";
import { supplierService } from "../../services/supplierService";

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const MONEY_EPSILON = 0.01;

// ── Types ──────────────────────────────────────────────────────────────────

export interface SettlementPayment {
    paymentMethodId: number;
    methodType: string;
    methodName: string;
    amount: number;
    referenceNumber: string;
    entityType: "customer" | "employee" | "supplier" | null;
    entityId: number | null;
    entityName: string;
}

interface EntityInfo {
    id: number;
    name: string;
    phone: string;
    balance: number;
    creditLimit?: number;
    isBlocked?: boolean;
    status?: string;
}

// ── Props ─────────────────────────────────────────────────────────────────

interface SettlementPanelProps {
    orderId: number;
    total: number;
    onSettleComplete: (result: any) => void;
    onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export const SettlementPanel: React.FC<SettlementPanelProps> = ({
    orderId,
    total,
    onSettleComplete,
    onClose,
}) => {
    // ── State ──────────────────────────────────────────────────────────────────
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDto[]>([]);
    const [settlementPayments, setSettlementPayments] = useState<SettlementPayment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Entity selection state
    const [entitySearchQuery, setEntitySearchQuery] = useState("");
    const [showEntitySearch, setShowEntitySearch] = useState(false);
    const [entityResults, setEntityResults] = useState<EntityInfo[]>([]);
    const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number | null>(null);
    const [isSearchingEntity, setIsSearchingEntity] = useState(false);

    // ── Computed ───────────────────────────────────────────────────────────────
    const totalAllocated = useMemo(
        () => roundMoney(settlementPayments.reduce((sum, p) => sum + p.amount, 0)),
        [settlementPayments],
    );

    const remainingAmount = useMemo(
        () => Math.max(0, roundMoney(total - totalAllocated)),
        [total, totalAllocated],
    );

    const isBalanced = useMemo(
        () => Math.abs(totalAllocated - total) <= MONEY_EPSILON,
        [totalAllocated, total],
    );

    const progress = total > 0 ? Math.min(100, (totalAllocated / total) * 100) : 0;

    // ── Load payment methods on mount ─────────────────────────────────────────
    useEffect(() => {
        settlementService
            .getPaymentMethods()
            .then((methods) => {
                setPaymentMethods(methods.filter((m) => m.is_active));
            })
            .catch((err) => {
                console.error("Failed to load payment methods:", err);
                setError("فشل تحميل طرق الدفع");
            });
    }, []);

    // ── Entity Search ──────────────────────────────────────────────────────────
    const searchEntities = useCallback(
        async (query: string, type: "customer" | "employee" | "supplier") => {
            if (!query || query.length < 1) return [];

            setIsSearchingEntity(true);
            try {
                switch (type) {
                    case "customer": {
                        const res = await customerService.list({ search: query, per_page: 10 });
                        const customers = res?.data?.data || [];
                        return customers.map((c: any) => ({
                            id: c.id,
                            name: c.name,
                            phone: c.phone || '',
                            balance: c.balance || 0,
                            creditLimit: c.credit_limit || 0,
                            isBlocked: c.status === 'blocked' || false,
                        }));
                    }
                    case "employee": {
                        const res = await employeeService.getAll({ search: query });
                        const employees = Array.isArray(res) ? res : [];
                        return employees.map((e: any) => ({
                            id: e.id,
                            name: e.name,
                            phone: e.phone || '',
                            balance: e.outstanding_advance || 0,
                            status: e.employment_status,
                        }));
                    }
                    case "supplier": {
                        const res = await supplierService.list({ search: query, per_page: 10 });
                        const suppliers = res?.data?.data || [];
                        return suppliers.map((s: any) => ({
                            id: s.id,
                            name: s.name,
                            phone: s.phone || '',
                            balance: s.balance || 0,
                        }));
                    }
                }
            } catch (err) {
                console.error("Entity search failed:", err);
                return [];
            } finally {
                setIsSearchingEntity(false);
            }
        },
        [],
    );

    // ── Add Payment Method ────────────────────────────────────────────────────
    const handleAddPayment = useCallback(
        async (method: PaymentMethodDto) => {
            if (remainingAmount <= MONEY_EPSILON) return;

            const newPayment: SettlementPayment = {
                paymentMethodId: method.id,
                methodType: method.type,
                methodName: method.name,
                amount: roundMoney(remainingAmount),
                referenceNumber: "",
                entityType: method.is_entity ? (method.type as any) : null,
                entityId: null,
                entityName: "",
            };

            // For entity types, open search automatically
            if (method.is_entity) {
                setSettlementPayments((prev) => [...prev, newPayment]);
                setSelectedPaymentIndex(settlementPayments.length);
                setShowEntitySearch(true);
                setEntitySearchQuery("");
            } else {
                setSettlementPayments((prev) => [...prev, newPayment]);
            }

            // Auto-dismiss error
            setError(null);
        },
        [remainingAmount, settlementPayments.length],
    );

    // ── Update Payment Amount ─────────────────────────────────────────────────
    const handleAmountChange = useCallback(
        (index: number, value: string) => {
            const amount = parseFloat(value) || 0;
            setSettlementPayments((prev) =>
                prev.map((p, i) => (i === index ? { ...p, amount: roundMoney(amount) } : p)),
            );
        },
        [],
    );

    // ── Update Reference Number ────────────────────────────────────────────────
    const handleReferenceChange = useCallback(
        (index: number, value: string) => {
            setSettlementPayments((prev) =>
                prev.map((p, i) => (i === index ? { ...p, referenceNumber: value } : p)),
            );
        },
        [],
    );

    // ── Remove Payment ─────────────────────────────────────────────────────────
    const handleRemovePayment = useCallback((index: number) => {
        setSettlementPayments((prev) => prev.filter((_, i) => i !== index));
        setSelectedPaymentIndex(null);
        setShowEntitySearch(false);
    }, []);

    // ── Select Entity ─────────────────────────────────────────────────────────
    const handleSelectEntity = useCallback(
        (entity: EntityInfo) => {
            if (selectedPaymentIndex === null) return;

            setSettlementPayments((prev) =>
                prev.map((p, i) =>
                    i === selectedPaymentIndex
                        ? {
                            ...p,
                            entityId: entity.id,
                            entityName: entity.name,
                        }
                        : p,
                ),
            );
            setShowEntitySearch(false);
            setSelectedPaymentIndex(null);
            setEntitySearchQuery("");
        },
        [selectedPaymentIndex],
    );

    // ── Quick Fill Remaining ───────────────────────────────────────────────────
    const handleQuickFill = useCallback(
        (method: PaymentMethodDto) => {
            if (remainingAmount <= MONEY_EPSILON) return;

            const newPayment: SettlementPayment = {
                paymentMethodId: method.id,
                methodType: method.type,
                methodName: method.name,
                amount: roundMoney(remainingAmount),
                referenceNumber: "",
                entityType: method.is_entity ? (method.type as any) : null,
                entityId: null,
                entityName: "",
            };

            if (method.is_entity) {
                setSettlementPayments((prev) => [...prev, newPayment]);
                setSelectedPaymentIndex(settlementPayments.length);
                setShowEntitySearch(true);
                setEntitySearchQuery("");
            } else {
                setSettlementPayments((prev) => [...prev, newPayment]);
            }
        },
        [remainingAmount, settlementPayments.length],
    );

    // ── Balance Amounts ────────────────────────────────────────────────────────
    const handleBalanceAmounts = useCallback(() => {
        if (settlementPayments.length === 0) return;

        // Distribute remaining amount equally across existing payments
        const count = settlementPayments.length;
        const baseAmount = roundMoney(total / count);
        let remainder = total;

        setSettlementPayments((prev) =>
            prev.map((p, i) => {
                const amount = i === count - 1 ? roundMoney(remainder) : baseAmount;
                remainder -= baseAmount;
                return { ...p, amount };
            }),
        );
    }, [total, settlementPayments.length]);

    // ── Submit Settlement ──────────────────────────────────────────────────────
    const handleSettle = useCallback(async () => {
        if (!isBalanced) {
            setError(`المبلغ المدفوع (${totalAllocated}) لا يساوي إجمالي الفاتورة (${total})`);
            return;
        }

        // Validate entity payments
        for (const payment of settlementPayments) {
            if (payment.entityType && !payment.entityId) {
                setError(`الدفعة "${payment.methodName}" تتطلب اختيار ${payment.entityType === "customer" ? "عميل" : payment.entityType === "employee" ? "موظف" : "مورد"}`);
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const payments: PaymentEntryDto[] = settlementPayments.map((p) => ({
                payment_method_id: p.paymentMethodId,
                amount: p.amount,
                reference_number: p.referenceNumber || undefined,
                entity_type: p.entityType || undefined,
                entity_id: p.entityId || undefined,
                subledger_type: p.entityType || undefined,
                subledger_id: p.entityId || undefined,
            }));

            console.debug("SettlementPanel.handleSettle", {
                orderId,
                received_entity_type: payments.map((payment) => payment.entity_type ?? null),
                received_entity_id: payments.map((payment) => payment.entity_id ?? null),
                received_subledger_type: payments.map((payment) => payment.subledger_type ?? null),
                received_subledger_id: payments.map((payment) => payment.subledger_id ?? null),
            });

            const result = await settlementService.settle(orderId, payments);
            setSuccess(true);
            setTimeout(() => onSettleComplete(result), 1500);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "فشلت تسوية الفاتورة";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    }, [isBalanced, settlementPayments, orderId, total, totalAllocated, onSettleComplete]);

    // ── Entity Search Trigger ─────────────────────────────────────────────────
    useEffect(() => {
        if (!entitySearchQuery || selectedPaymentIndex === null) {
            setEntityResults([]);
            return;
        }

        const payment = settlementPayments[selectedPaymentIndex];
        if (!payment || !payment.entityType) return;

        const timer = setTimeout(async () => {
            const results = await searchEntities(entitySearchQuery, payment.entityType!);
            setEntityResults(results);
        }, 300);

        return () => clearTimeout(timer);
    }, [entitySearchQuery, selectedPaymentIndex, settlementPayments, searchEntities]);

    // ── Icons Map ─────────────────────────────────────────────────────────────
    const getMethodIcon = (type: string) => {
        switch (type) {
            case "cash":
                return <Banknote size={18} className="text-emerald-500" />;
            case "bank":
                return <Zap size={18} className="text-amber-500" />;
            case "card":
                return <CreditCard size={18} className="text-blue-500" />;
            case "wallet":
                return <Wallet size={18} className="text-purple-500" />;
            case "customer":
                return <Users size={18} className="text-cyan-500" />;
            case "employee":
                return <UserCheck size={18} className="text-rose-500" />;
            case "supplier":
                return <Truck size={18} className="text-orange-500" />;
            default:
                return <Banknote size={18} className="text-slate-500" />;
        }
    };

    const getMethodColor = (type: string) => {
        switch (type) {
            case "cash":
                return "border-emerald-500/30 hover:bg-emerald-500/10";
            case "bank":
                return "border-amber-500/30 hover:bg-amber-500/10";
            case "card":
                return "border-blue-500/30 hover:bg-blue-500/10";
            case "wallet":
                return "border-purple-500/30 hover:bg-purple-500/10";
            case "customer":
                return "border-cyan-500/30 hover:bg-cyan-500/10";
            case "employee":
                return "border-rose-500/30 hover:bg-rose-500/10";
            case "supplier":
                return "border-orange-500/30 hover:bg-orange-500/10";
            default:
                return "border-white/10 hover:bg-white/5";
        }
    };

    // ── Group methods by category ─────────────────────────────────────────────
    const directMethods = paymentMethods.filter((m) => !m.is_entity);
    const entityMethods = paymentMethods.filter((m) => m.is_entity);

    // ── Render ────────────────────────────────────────────────────────────────
    if (success) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-slate-900 border border-emerald-500/30 rounded-[2rem] p-10 max-w-md w-full text-center shadow-2xl"
                >
                    <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                        <CheckCircle size={48} className="text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">تمت التسوية بنجاح</h3>
                    <p className="text-slate-400 text-sm font-bold">
                        تم ترحيل القيد المحاسبي للفاتورة رقم #{orderId}
                    </p>
                    <div className="mt-6 text-4xl font-black text-emerald-500 font-mono">
                        {total.toFixed(2)} ₪
                    </div>
                    {settlementPayments.map((p, i) => (
                        <div key={i} className="flex items-center justify-between mt-3 text-sm text-slate-400">
                            <span>{p.methodName}</span>
                            <span className="font-mono font-bold text-white">{p.amount.toFixed(2)} ₪</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-slate-900 border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
            >
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 z-10 p-4 sm:p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-white">
                            تسوية الفاتورة #{orderId}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            Settlement & Payment Routing Engine
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mx-4 sm:mx-6 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-500 text-xs font-bold"
                        >
                            <AlertCircle size={14} />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="p-4 sm:p-6 space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                التحصيل
                            </span>
                            <div className="text-left">
                                <span className="text-lg sm:text-xl font-mono font-black text-white">
                                    {totalAllocated.toLocaleString()}{" "}
                                </span>
                                <span className="text-slate-500 text-xs font-bold">/ {total.toFixed(2)} ₪</span>
                            </div>
                        </div>
                        <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-white/5 flex p-0.5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className={`h-full rounded-full transition-all duration-700 ease-out ${isBalanced
                                    ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                    : "bg-red-600"
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Payment Methods Grid - Direct */}
                    {directMethods.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    طرق الدفع المباشر
                                </h4>
                                {settlementPayments.length > 0 && (
                                    <button
                                        onClick={handleBalanceAmounts}
                                        className="text-[9px] font-bold text-red-500 hover:text-red-400 transition-colors"
                                    >
                                        توزيع بالتساوي
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {directMethods.map((method) => (
                                    <button
                                        key={method.id}
                                        disabled={remainingAmount <= MONEY_EPSILON}
                                        onClick={() => handleQuickFill(method)}
                                        className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-white/5 bg-slate-900/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-20 disabled:grayscale overflow-hidden ${getMethodColor(method.type)}`}
                                    >
                                        {getMethodIcon(method.type)}
                                        <span className="text-[10px] font-black text-slate-300 text-center leading-tight">
                                            {method.name}
                                        </span>
                                        {method.account && (
                                            <span className="text-[7px] font-bold text-slate-600">
                                                {method.account.code}
                                            </span>
                                        )}
                                    </button>
                                ))}
                                {/* Quick fill remaining */}
                                {remainingAmount > MONEY_EPSILON && (
                                    <button
                                        onClick={() => {
                                            const cashMethod = directMethods.find((m) => m.type === "cash");
                                            if (cashMethod) handleQuickFill(cashMethod);
                                        }}
                                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-all text-[9px] font-bold"
                                    >
                                        <Banknote size={16} />
                                        الباقي كاش
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Payment Methods Grid - Entity */}
                    {entityMethods.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                حسابات الكيانات
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {entityMethods.map((method) => (
                                    <button
                                        key={method.id}
                                        disabled={remainingAmount <= MONEY_EPSILON}
                                        onClick={() => handleAddPayment(method)}
                                        className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-white/5 bg-slate-900/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-20 disabled:grayscale overflow-hidden ${getMethodColor(method.type)}`}
                                    >
                                        {getMethodIcon(method.type)}
                                        <span className="text-[10px] font-black text-slate-300 text-center leading-tight">
                                            {method.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Entity Search Modal */}
                    <AnimatePresence>
                        {showEntitySearch && selectedPaymentIndex !== null && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden"
                            >
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {settlementPayments[selectedPaymentIndex]?.entityType === "customer"
                                                ? "اختيار عميل"
                                                : settlementPayments[selectedPaymentIndex]?.entityType === "employee"
                                                    ? "اختيار موظف"
                                                    : "اختيار مورد"}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setShowEntitySearch(false);
                                                setSelectedPaymentIndex(null);
                                            }}
                                            className="text-[9px] font-bold text-slate-500 hover:text-white"
                                        >
                                            إلغاء
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={entitySearchQuery}
                                            onChange={(e) => setEntitySearchQuery(e.target.value)}
                                            placeholder="ابحث بالاسم أو رقم الجوال..."
                                            className="w-full p-3 bg-slate-900 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-xs text-white transition-all pr-10"
                                            autoFocus
                                        />
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    </div>

                                    {isSearchingEntity && (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 size={20} className="text-red-500 animate-spin" />
                                        </div>
                                    )}

                                    {!isSearchingEntity && entityResults.length > 0 && (
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                            {entityResults.map((entity) => (
                                                <button
                                                    key={entity.id}
                                                    onClick={() => handleSelectEntity(entity)}
                                                    className="w-full text-right p-3 flex items-center justify-between hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400">
                                                            <UserPlus size={16} />
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-black text-white">{entity.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                                                <Phone size={8} /> {entity.phone}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-mono font-bold text-slate-500">
                                                            رصيد: {entity.balance.toFixed(2)}
                                                        </p>
                                                        {entity.creditLimit && entity.creditLimit > 0 && (
                                                            <p className="text-[8px] text-slate-600">
                                                                حد ائتماني: {entity.creditLimit.toFixed(2)}
                                                            </p>
                                                        )}
                                                        {entity.isBlocked && (
                                                            <p className="text-[8px] text-red-500 font-bold">⚠ محظور</p>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {!isSearchingEntity && entitySearchQuery && entityResults.length === 0 && (
                                        <p className="text-center text-slate-500 text-xs font-bold py-4">
                                            لا توجد نتائج
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Allocated Payments List */}
                    <AnimatePresence mode="popLayout">
                        {settlementPayments.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    تفاصيل الدفعات
                                </h4>

                                {settlementPayments.map((payment, index) => (
                                    <motion.div
                                        layout
                                        key={`${payment.paymentMethodId}-${index}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white/[0.02] p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
                                                {getMethodIcon(payment.methodType)}
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-black text-white truncate">
                                                        {payment.methodName}
                                                    </p>
                                                    {payment.entityName && (
                                                        <span className="text-[9px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                                                            {payment.entityName}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Reference */}
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="رقم المرجع (اختياري)"
                                                        value={payment.referenceNumber}
                                                        onChange={(e) => handleReferenceChange(index, e.target.value)}
                                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[9px] font-bold text-slate-300 outline-none focus:border-blue-500/30 transition-all placeholder:text-slate-700"
                                                    />
                                                    <Hash size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700" />
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <div className="relative w-24">
                                                    <input
                                                        type="number"
                                                        value={payment.amount}
                                                        onChange={(e) => handleAmountChange(index, e.target.value)}
                                                        className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 text-right text-xs font-mono font-bold text-emerald-500 outline-none focus:border-emerald-500/50 transition-all [appearance:textfield]"
                                                    />
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-600 font-black">
                                                        ₪
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemovePayment(index)}
                                                    className="text-[9px] font-bold text-slate-600 hover:text-red-500 transition-colors flex items-center gap-1"
                                                >
                                                    <Trash2 size={10} /> حذف
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-900 border-t border-white/5 p-4 sm:p-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-black text-slate-400">الإجمالي</p>
                        <p className="text-xl font-mono font-black text-white">{total.toFixed(2)} ₪</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-800 border border-white/5 rounded-xl text-xs font-black text-slate-400 hover:text-white transition-all"
                            disabled={isSubmitting}
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSettle}
                            disabled={!isBalanced || isSubmitting || settlementPayments.length === 0}
                            className="px-8 py-3 bg-red-600 border border-red-500/30 rounded-xl text-xs font-black text-white hover:bg-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" /> جاري التسوية...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={14} /> تأكيد الدفع
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
