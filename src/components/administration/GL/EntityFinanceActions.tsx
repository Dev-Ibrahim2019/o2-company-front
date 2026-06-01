import React, { useState } from 'react';
import AccountStatementModal from './AccountStatementModal';
import FinanceActionModal from './FinanceActionModal';

type EntityType = 'employee' | 'customer' | 'supplier';

interface EntityFinanceActionsProps {
    entityType: EntityType;
    entityId: number | null;
    entityName: string;
    currentBalance: number;
    onActionSuccess?: () => void; // Callback to refetch data after a successful action
}

const EntityFinanceActions: React.FC<EntityFinanceActionsProps> = ({
    entityType,
    entityId,
    entityName,
    currentBalance,
    onActionSuccess,
}) => {
    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
    const [isFinanceActionModalOpen, setIsFinanceActionModalOpen] = useState(false);
    const [currentAction, setCurrentAction] = useState<any>(null); // Type will be FinanceAction

    const openFinanceActionModal = (action: any) => {
        setCurrentAction(action);
        setIsFinanceActionModalOpen(true);
    };

    const handleFinanceActionSuccess = () => {
        setIsFinanceActionModalOpen(false);
        if (onActionSuccess) {
            onActionSuccess();
        }
    };

    const balanceColorClass = currentBalance < 0 ? 'text-red-600' : 'text-green-600';

    return (
        <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">Financial Actions</h4>
                <span className={`text-xl font-bold ${balanceColorClass}`}>
                    Balance: {currentBalance.toFixed(2)}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {entityType === 'employee' && (
                    <>
                        <button
                            onClick={() => openFinanceActionModal('advance')}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            سلفة جديدة
                        </button>
                        <button
                            onClick={() => openFinanceActionModal('repayment')}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                        >
                            سداد سلفة
                        </button>
                        <button
                            onClick={() => openFinanceActionModal('salary_payment')}
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                            دفع راتب
                        </button>
                        <button
                            onClick={() => setIsStatementModalOpen(true)}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                            كشف الحساب
                        </button>
                    </>
                )}

                {entityType === 'customer' && (
                    <>
                        <button
                            onClick={() => openFinanceActionModal('customer_invoice')}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            فاتورة
                        </button>
                        <button
                            onClick={() => openFinanceActionModal('customer_payment')}
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                            دفعة
                        </button>
                        <button
                            onClick={() => setIsStatementModalOpen(true)}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                            كشف الحساب
                        </button>
                    </>
                )}

                {entityType === 'supplier' && (
                    <>
                        <button
                            onClick={() => openFinanceActionModal('supplier_bill')}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            فاتورة مورد
                        </button>
                        <button
                            onClick={() => openFinanceActionModal('supplier_payment')}
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                            دفعة للمورد
                        </button>
                        <button
                            onClick={() => setIsStatementModalOpen(true)}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                            كشف الحساب
                        </button>
                    </>
                )}
            </div>

            <AccountStatementModal
                isOpen={isStatementModalOpen}
                onClose={() => setIsStatementModalOpen(false)}
                entityType={entityType}
                entityId={entityId}
                entityName={entityName}
            />

            {isFinanceActionModalOpen && currentAction && (
                <FinanceActionModal
                    isOpen={isFinanceActionModalOpen}
                    onClose={() => setIsFinanceActionModalOpen(false)}
                    onSuccess={handleFinanceActionSuccess}
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
