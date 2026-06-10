import React from 'react';
import EmployeeStatement from './EmployeeStatement';
import EmployeeLoansList from './EmployeeLoansList';

interface AccountStatementModalProps {
    entityType: 'employee' | 'customer' | 'supplier';
    entityId: number | null;
    entityName: string;
    isOpen: boolean;
    onClose: () => void;
}

const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
    entityType,
    entityId,
    entityName,
    isOpen,
    onClose,
}) => {
    const [activeTab, setActiveTab] = React.useState<'statement' | 'loans'>('statement');

    if (!isOpen || !entityId) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden" dir="rtl">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">
                            {entityType === 'employee' ? 'السجل المالي للموظف' : 'كشف الحساب'}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium">{entityName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors text-2xl"
                    >
                        &times;
                    </button>
                </div>

                {/* Tabs for Employees */}
                {entityType === 'employee' && (
                    <div className="px-6 border-b flex gap-6 bg-white">
                        <button
                            onClick={() => setActiveTab('statement')}
                            className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'statement'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            كشف الحساب العام
                        </button>
                        <button
                            onClick={() => setActiveTab('loans')}
                            className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'loans'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            سجل السلف والقروض
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-grow overflow-auto p-6 custom-scrollbar">
                    {entityType === 'employee' ? (
                        activeTab === 'statement' ? (
                            <EmployeeStatement employeeId={entityId} employeeName={entityName} />
                        ) : (
                            <EmployeeLoansList employeeId={entityId} />
                        )
                    ) : (
                        <div className="text-center py-20 text-gray-500">
                            كشف حساب {entityType === 'customer' ? 'العميل' : 'المورد'} قيد التطوير...
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountStatementModal;
