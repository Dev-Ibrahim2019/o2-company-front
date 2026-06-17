import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Wallet } from 'lucide-react';
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
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.07] bg-gradient-to-l from-red-950/25 to-transparent">
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            type="button"
                        >
                            <X size={15} />
                        </button>
                        <div className="text-right">
                            <h3 className="text-[17px] font-black text-white leading-tight">
                                {entityType === 'employee' ? 'السجل المالي للموظف' : 'كشف الحساب'}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{entityName}</p>
                        </div>
                    </div>

                    {/* Tabs for Employees — Dark Theme */}
                    {entityType === 'employee' && (
                        <div className="px-7 border-b border-white/[0.06] flex gap-1 bg-slate-950/30">
                            <button
                                onClick={() => setActiveTab('statement')}
                                className={`flex items-center gap-2 px-5 py-3.5 text-[12px] font-black border-b-2 transition-all ${activeTab === 'statement'
                                    ? 'border-red-500 text-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <FileText size={14} />
                                كشف الحساب العام
                            </button>
                            <button
                                onClick={() => setActiveTab('loans')}
                                className={`flex items-center gap-2 px-5 py-3.5 text-[12px] font-black border-b-2 transition-all ${activeTab === 'loans'
                                    ? 'border-red-500 text-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <Wallet size={14} />
                                سجل السلف والقروض
                            </button>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
                        {entityType === 'employee' ? (
                            activeTab === 'statement' ? (
                                <EmployeeStatement employeeId={entityId} employeeName={entityName} />
                            ) : (
                                <EmployeeLoansList employeeId={entityId} />
                            )
                        ) : (
                            <div className="text-center py-20 text-slate-600 font-bold">
                                <FileText size={40} className="mx-auto mb-3 text-slate-700" />
                                كشف حساب {entityType === 'customer' ? 'العميل' : 'المورد'} قيد التطوير...
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-4 border-t border-white/[0.07] bg-slate-950/50 flex justify-start">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl font-black text-xs transition-all"
                        >
                            إغلاق
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AccountStatementModal;