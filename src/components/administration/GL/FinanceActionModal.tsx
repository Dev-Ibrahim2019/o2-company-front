import React, { useState, useEffect } from 'react';
import { financeService } from "../../../services/financeService";
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
    const [grossAmount, setGrossAmount] = useState<number | string>('');
    const [advanceDeduction, setAdvanceDeduction] = useState<number | string>('');
    const [cashAccountId, setCashAccountId] = useState<number | string>('');
    const [offsetAccountId, setOffsetAccountId] = useState<number | string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setGrossAmount('');
            setAdvanceDeduction('');
            setCashAccountId('');
            setOffsetAccountId('');
            setDate(new Date().toISOString().split('T')[0]);
            setReference('');
            setDescription('');
            setMessage(null);
        }
    }, [isOpen, action]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entityId) return;

        setIsLoading(true);
        setMessage(null);

        try {
            let response: TransactionResponse | undefined;
            const commonData = { date, description, branch_id: 1 }; // Assuming branch_id 1 for now

            switch (action) {
                case 'advance':
                    if (typeof amount !== 'number' || amount <= 0 || typeof cashAccountId !== 'number') throw new Error('Invalid input');
                    response = await financeService.recordAdvance(entityId, { amount, cash_account_id: cashAccountId, ...commonData });
                    break;
                case 'repayment':
                    if (typeof amount !== 'number' || amount <= 0 || typeof cashAccountId !== 'number') throw new Error('Invalid input');
                    response = await financeService.recordAdvanceRepayment(entityId, { amount, cash_account_id: cashAccountId, ...commonData });
                    break;
                case 'salary_payment':
                    if (typeof grossAmount !== 'number' || grossAmount <= 0 || typeof advanceDeduction !== 'number' || typeof cashAccountId !== 'number') throw new Error('Invalid input');
                    response = await financeService.recordSalaryPayment(entityId, { gross_amount: grossAmount, advance_deduction: advanceDeduction, cash_account_id: cashAccountId, ...commonData });
                    break;
                case 'customer_invoice':
                    if (typeof amount !== 'number' || amount <= 0 || typeof offsetAccountId !== 'number') throw new Error('Invalid input');
                    response = await financeService.recordCustomerInvoice(entityId, { amount, offset_account_id: offsetAccountId, reference, ...commonData });
                    break;
                case 'customer_payment':
                    if (typeof amount !== 'number' || amount <= 0 || typeof cashAccountId !== 'number') throw new Error('Invalid input');
                    response = await financeService.recordCustomerPayment(entityId, { amount, cash_account_id: cashAccountId, reference, ...commonData });
                    break;
                case 'supplier_bill':
                    if (typeof amount !== 'number' || amount <= 0 || typeof offsetAccountId !== 'number') throw new Error('Invalid input');
                    response = await financeService.recordSupplierBill(entityId, { amount, offset_account_id: offsetAccountId, reference, ...commonData });
                    break;
                case 'supplier_payment':
                    if (typeof amount !== 'number' || amount <= 0 || typeof cashAccountId !== 'number') throw new Error('Invalid input');
                    response = await financeService.recordSupplierPayment(entityId, { amount, cash_account_id: cashAccountId, reference, ...commonData });
                    break;
                default:
                    throw new Error('Unknown action');
            }

            if (response?.success) {
                setMessage({ type: 'success', text: response.message });
                onSuccess();
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
            case 'advance': return `Record Advance for ${entityName}`;
            case 'repayment': return `Record Repayment for ${entityName}`;
            case 'salary_payment': return `Record Salary Payment for ${entityName}`;
            case 'customer_invoice': return `Record Invoice for ${entityName}`;
            case 'customer_payment': return `Record Payment from ${entityName}`;
            case 'supplier_bill': return `Record Bill for ${entityName}`;
            case 'supplier_payment': return `Record Payment to ${entityName}`;
            default: return 'Financial Action';
        }
    };

    const isEmployeeAction = entityType === 'employee';
    const isCustomerAction = entityType === 'customer';
    const isSupplierAction = entityType === 'supplier';

    const showAmount = !['salary_payment'].includes(action);
    const showGrossAmount = action === 'salary_payment';
    const showAdvanceDeduction = action === 'salary_payment';
    const showCashAccountId = ['advance', 'repayment', 'salary_payment', 'customer_payment', 'supplier_payment'].includes(action);
    const showOffsetAccountId = ['customer_invoice', 'supplier_bill'].includes(action);
    const showReference = ['customer_invoice', 'customer_payment', 'supplier_bill', 'supplier_payment'].includes(action);

    const netPay = (typeof grossAmount === 'number' && typeof advanceDeduction === 'number') ? grossAmount - advanceDeduction : 0;

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
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            id="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            required
                        />
                    </div>

                    {showGrossAmount && (
                        <div className="mb-4">
                            <label htmlFor="grossAmount" className="block text-sm font-medium text-gray-700">Gross Amount</label>
                            <input
                                type="number"
                                id="grossAmount"
                                value={grossAmount}
                                onChange={(e) => setGrossAmount(parseFloat(e.target.value) || '')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                min="0.01"
                                step="0.01"
                                required
                            />
                        </div>
                    )}

                    {showAdvanceDeduction && (
                        <div className="mb-4">
                            <label htmlFor="advanceDeduction" className="block text-sm font-medium text-gray-700">Advance Deduction</label>
                            <input
                                type="number"
                                id="advanceDeduction"
                                value={advanceDeduction}
                                onChange={(e) => setAdvanceDeduction(parseFloat(e.target.value) || '')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    )}

                    {showGrossAmount && showAdvanceDeduction && (
                        <div className="mb-4">
                            <label htmlFor="netPay" className="block text-sm font-medium text-gray-700">Net Pay</label>
                            <input
                                type="number"
                                id="netPay"
                                value={netPay.toFixed(2)}
                                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                                readOnly
                                disabled
                            />
                        </div>
                    )}

                    {showAmount && (
                        <div className="mb-4">
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
                            <input
                                type="number"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                min="0.01"
                                step="0.01"
                                required
                            />
                        </div>
                    )}

                    {showCashAccountId && (
                        <div className="mb-4">
                            <label htmlFor="cashAccountId" className="block text-sm font-medium text-gray-700">Cash/Bank Account ID</label>
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
