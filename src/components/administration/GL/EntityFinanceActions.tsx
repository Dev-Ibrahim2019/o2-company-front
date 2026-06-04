// src/components/administration/GL/EntityFinanceActions.tsx
//
// إصلاحات:
// 1. تصميم متوافق مع الـ dark theme
// 2. إضافة salary_accrual (استحقاق راتب)
// 3. تصحيح أنواع الـ actions لتتطابق مع FinanceActionModal
// 4. تمرير entityType بشكل صحيح للـ modal

import React, { useState } from "react";
import AccountStatementModal from "./AccountStatementModal";
import FinanceActionModal from "./FinanceActionModal";

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

interface EntityFinanceActionsProps {
    entityType: EntityType;
    entityId: number | null;
    entityName: string;
    currentBalance: number;
    onActionSuccess?: () => void;
}

const EntityFinanceActions: React.FC<EntityFinanceActionsProps> = ({
    entityType,
    entityId,
    entityName,
    currentBalance,
    onActionSuccess,
}) => {
    const [isStatementOpen, setIsStatementOpen] = useState(false);
    const [currentAction, setCurrentAction] = useState<FinanceAction | null>(
        null,
    );

    const openAction = (action: FinanceAction) => setCurrentAction(action);

    const handleSuccess = () => {
        setCurrentAction(null);
        onActionSuccess?.();
    };

    const btnCls =
        "px-3 py-1.5 text-[10px] font-black rounded-xl border transition-all";

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>الرصيد الحالي</span>
                <span className={currentBalance > 0 ? "text-blue-400" : currentBalance < 0 ? "text-emerald-400" : "text-slate-500"}>
                    ₪{Math.abs(currentBalance).toLocaleString()}
                </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {entityType === "employee" && (
                    <>
                        <button
                            onClick={() => openAction("advance")}
                            className={`${btnCls} bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600 hover:text-white`}
                        >
                            سلفة
                        </button>
                        <button
                            onClick={() => openAction("advance_repayment")}
                            className={`${btnCls} bg-orange-600/20 border-orange-500/30 text-orange-400 hover:bg-orange-600 hover:text-white`}
                        >
                            سداد سلفة
                        </button>
                        <button
                            onClick={() => openAction("salary_accrual")}
                            className={`${btnCls} bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white`}
                        >
                            استحقاق راتب
                        </button>
                        <button
                            onClick={() => openAction("salary_payment")}
                            className={`${btnCls} bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white`}
                        >
                            دفع راتب
                        </button>
                    </>
                )}

                {entityType === "customer" && (
                    <>
                        <button
                            onClick={() => openAction("customer_invoice")}
                            className={`${btnCls} bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white`}
                        >
                            فاتورة
                        </button>
                        <button
                            onClick={() => openAction("customer_payment")}
                            className={`${btnCls} bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white`}
                        >
                            دفعة
                        </button>
                    </>
                )}

                {entityType === "supplier" && (
                    <>
                        <button
                            onClick={() => openAction("supplier_bill")}
                            className={`${btnCls} bg-rose-600/20 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white`}
                        >
                            فاتورة مورد
                        </button>
                        <button
                            onClick={() => openAction("supplier_payment")}
                            className={`${btnCls} bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white`}
                        >
                            دفعة للمورد
                        </button>
                    </>
                )}

                <button
                    onClick={() => setIsStatementOpen(true)}
                    className={`${btnCls} bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white`}
                >
                    كشف الحساب
                </button>
            </div>

            <AccountStatementModal
                isOpen={isStatementOpen}
                onClose={() => setIsStatementOpen(false)}
                entityType={entityType}
                entityId={entityId}
                entityName={entityName}
            />

            {currentAction && (
                <FinanceActionModal
                    isOpen={true}
                    onClose={() => setCurrentAction(null)}
                    onSuccess={handleSuccess}
                    action={currentAction}
                    entityType={entityType}
                    entityId={entityId}
                    entityName={entityName}
                />
            )}
        </div>
    );
};

export default EntityFinanceActions;
