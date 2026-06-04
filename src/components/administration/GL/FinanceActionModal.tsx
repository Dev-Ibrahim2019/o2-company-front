import { useState, useEffect } from 'react';
import { financeService } from "../../../services/financeService";
import type { EmployeeLoan } from "../../../services/financeService";
import type { TransactionResponse } from "../../../services/financeService";

type EntityType = 'employee' | 'customer' | 'supplier';
type FinanceAction =
    | 'advance'
    | 'repayment'
    | 'salary_payment'
    | 'customer_invoice'
    | 'customer_payment'
    | 'supplier_bill'
    | 'supplier_payment';

interface FinanceActionModalProps {
    action: FinanceAction;
    entityType: EntityType;
    entityId: number | null;
    entityName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const FinanceActionModal: React.FC<FinanceActionModalProps> = ({
    action,
    entityType,
    entityId,
    entityName,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [amount, setAmount] = useState<number | string>('');
    const [grossSalary, setGrossSalary] = useState<number | string>('');
    const [cashAccountId, setCashAccountId] = useState<number | string>('');
    const [offsetAccountId, setOffsetAccountId] = useState<number | string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedLoanId, setSelectedLoanId] = useState<number | string>('');
    const [loans, setLoans] = useState<EmployeeLoan[]>([]);
    const [deductedLoansAmount, setDeductedLoansAmount] = useState<number>(0);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setGrossSalary('');
            setCashAccountId('');
            setOffsetAccountId('');
            setDate(new Date().toISOString().split('T')[0]);
            setReference('');
            setDescription('');
            setSelectedLoanId('');
            setMessage(null);
            setDeductedLoansAmount(0);

            // جلب السلف للموظف إذا كان الإجراء repayment
            if (action === 'repayment' && entityId && entityType === 'employee') {
                loadEmployeeLoans(entityId);
            }
        }
    }, [isOpen, action, entityId, entityType]);

    const loadEmployeeLoans = async (employeeId: number) => {
        try {
            const loansList = await financeService.getEmployeeLoans(employeeId);
            const pendingLoans = loansList.filter(l => l.status !== 'repaid' && l.status !== 'cancelled');
            setLoans(pendingLoans);
        } catch (err) {
            console.error('Failed to load loans:', err);
        }
    };

    // حساب مبلغ السلف المخصومة من الراتب
    useEffect(() => {
        if (action === 'salary_payment' && entityId && entityType === 'employee') {
            loadEmployeeLoans(entityId).then(() => {
                financeService.getEmployeeLoans(entityId).then(loansList => {
                    const pendingLoans = loansList.filter(l => l.status !== 'repaid' && l.status !== 'cancelled');
                    const totalDeducted = pendingLoans.reduce((sum, loan) => sum + (loan.remaining_amount || 0), 0);
                    setDeductedLoansAmount(totalDeducted);
                });
            });
        }
    }, [action, entityId, entityType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entityId) return;

        setIsLoading(true);
        setMessage(null);

        try {
            let response: TransactionResponse | undefined;

            switch (action) {
                case 'advance':
                    if (typeof amount !== 'number' || amount <= 0 || typeof cashAccountId !== 'number') {
                        throw new Error('Invalid input');
                    }
                    response = await financeService.recordAdvance(entityId, {
                        amount,
                        cash_bank_account_id: cashAccountId,
                        date_granted: date,
                        notes: description,
                    });
                    break;

                case 'repayment':
                    if (typeof amount !== 'number' || amount <= 0 || typeof cashAccountId !== 'number' || !selectedLoanId) {
                        throw new Error('Invalid input');
                    }
                    response = await financeService.recordRepayment(entityId, selectedLoanId as number, {
                        amount,
                        cash_bank_account_id: cashAccountId,
                        repayment_date: date,
                        notes: description,
                    });
                    break;

                case 'salary_payment':
                    if (typeof grossSalary !== 'number' || grossSalary <= 0 || typeof cashAccountId !== 'number') {
                        throw new Error('Invalid input');
                    }
                    response = await financeService.recordSalaryPayment(entityId, {
                        gross_salary: grossSalary,
                        cash_bank_account_id: cashAccountId,
                        payment_date: date,
                        notes: description,
                    });
                    break;

                case 'customer_invoice':
                    if (typeof amount !== 'number' || amount <= 0 || typeof offsetAccountId !== 'number') {
                        throw new Error('Invalid input');
                    }
                    response = await financeService.recordCustomerInvoice(entityId, {
                        amount,
                        offset_account_id: offsetAccountId,
                        date,
                        reference,
                    });
                    break;

                case 'customer_payment':
                    if (typeof amount !== 'number' || amount <= 0 || typeof cashAccountId !== 'number') {
                        throw new Error('Invalid input');
                    }
                    response = await financeService.recordCustomerPayment(entityId, {
                        amount,
                        cash_account_id: cashAccountId,
                        date,
                        reference,
                    });
                    break;

                case 'supplier_bill':
                    if (typeof amount !== 'number' || amount <= 0 || typeof offsetAccountId !== 'number') {
                        throw new Error('Invalid input');
                    }
                    response = await financeService.recordSupplierBill(entityId, {
                        amount,
                        offset_account_id: offsetAccountId,
                        date,
                        reference,
                    });
                    break;

                case 'supplier_payment':
                    if (typeof amount !== 'number' || amount <= 0 || typeof cashAccountId !== 'number') {
                        throw new Error('Invalid input');
                    }
                    response = await financeService.recordSupplierPayment(entityId, {
                        amount,
                        cash_account_id: cashAccountId,
                        date,
                        reference,
                    });
                    break;

                default:
                    throw new Error('Unknown action');
            }

            if (response?.success || response?.message) {
                setMessage({ type: 'success', text: response?.message || 'Operation completed successfully' });
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
            } else {
                setMessage({ type: 'error', text: response?.message || 'An unknown error occurred.' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    };

    const getTitle = () => {
        switch (action) {
            case 'advance': return `منح سلفة - ${entityName}`;
            case 'repayment': return `سداد سلفة - ${entityName}`;
            case 'salary_payment': return `دفع راتب - ${entityName}`;
            case 'customer_invoice': return `فاتورة عميل - ${entityName}`;
            case 'customer_payment': return `دفعة عميل - ${entityName}`;
            case 'supplier_bill': return `فاتورة مورد - ${entityName}`;
            case 'supplier_payment': return `دفعة مورد - ${entityName}`;
            default: return 'إجراء مالي';
        }
    };

    const isEmployeeAction = entityType === 'employee';
    const isCustomerAction = entityType === 'customer';
    const isSupplierAction = entityType === 'supplier';

    const showAmount = !['salary_payment'].includes(action);
    const showGrossSalary = action === 'salary_payment';
    const showCashAccountId = ['advance', 'repayment', 'salary_payment', 'customer_payment', 'supplier_payment'].includes(action);
    const showOffsetAccountId = ['customer_invoice', 'supplier_bill'].includes(action);
    const showReference = ['customer_invoice', 'customer_payment', 'supplier_bill', 'supplier_payment'].includes(action);
    const showLoanSelector = action === 'repayment' && isEmployeeAction;

    const netSalary = (typeof grossSalary === 'number' ? grossSalary : 0) - deductedLoansAmount;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">{getTitle()}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-grow overflow-auto">
                    {message && (
                        <div className={`p-3 mb-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="mb-4">
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">التاريخ</label>
                        <input
                            type="date"
                            id="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2"
                            required
                        />
                    </div>

                    {showLoanSelector && (
                        <div className="mb-4">
                            <label htmlFor="loanId" className="block text-sm font-medium text-gray-700">اختر السلفة</label>
                            <select
                                id="loanId"
                                value={selectedLoanId}
                                onChange={(e) => setSelectedLoanId(parseInt(e.target.value) || '')}
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2"
                                required
                            >
                                <option value="">-- اختر سلفة --</option>
                                {loans.map(loan => (
                                    <option key={loan.id} value={loan.id}>
                                        السلفة #{loan.id} - المبلغ: {loan.remaining_amount} (الحالة: {loan.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {showGrossSalary && (
                        <div className="mb-4">
                            <label htmlFor="grossSalary" className="block text-sm font-medium text-gray-700">الراتب الإجمالي</label>
                            <input
                                type="number"
                                id="grossSalary"
                                value={grossSalary}
                                onChange={(e) => setGrossSalary(parseFloat(e.target.value) || '')}
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2"
                                min="0.01"
                                step="0.01"
                                required
                            />
                        </div>
                    )}

                    {showGrossSalary && (
                        <div className="mb-4">
                            <label htmlFor="deductions" className="block text-sm font-medium text-gray-700">خصم السلف</label>
                            <input
                                type="number"
                                id="deductions"
                                value={deductedLoansAmount.toFixed(2)}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 shadow-sm px-3 py-2"
                                readOnly
                                disabled
                            />
                        </div>
                    )}

                    {showGrossSalary && (
                        <div className="mb-4">
                            <label htmlFor="netPay" className="block text-sm font-medium text-gray-700">صافي الراتب</label>
                            <input
                                type="number"
                                id="netPay"
                                value={netSalary.toFixed(2)}
                                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 shadow-sm px-3 py-2"
                                readOnly
                                disabled
                            />
                        </div>
                    )}

                    {showAmount && (
                        <div className="mb-4">
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">المبلغ</label>
                            <input
                                type="number"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2"
                                min="0.01"
                                step="0.01"
                                required
                            />
                        </div>
                    )}

                    {showCashAccountId && (
                        <div className="mb-4">
                            <label htmlFor="cashAccountId" className="block text-sm font-medium text-gray-700">حساب النقدية/البنك</label>
                            <input
                                type="number"
                                id="cashAccountId"
                                value={cashAccountId}
                                onChange={(e) => setCashAccountId(parseInt(e.target.value) || '')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                required
                            />
                        </div>
                    )}

                    {showOffsetAccountId && (
                        <div className="mb-4">
                            <label htmlFor="offsetAccountId" className="block text-sm font-medium text-gray-700">
                                {isCustomerAction ? 'Revenue Account ID' : 'Expense Account ID'}
                            </label>
                            <input
                                type="number"
                                id="offsetAccountId"
                                value={offsetAccountId}
                                onChange={(e) => setOffsetAccountId(parseInt(e.target.value) || '')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                required
                            />
                        </div>
                    )}

                    {showReference && (
                        <div className="mb-4">
                            <label htmlFor="reference" className="block text-sm font-medium text-gray-700">Reference</label>
                            <input
                                type="text"
                                id="reference"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                        </div>
                    )}

                    <div className="mb-4">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        ></textarea>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FinanceActionModal;
