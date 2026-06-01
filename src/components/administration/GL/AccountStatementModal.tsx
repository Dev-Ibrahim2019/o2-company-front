import React, { useState, useEffect } from 'react';
import { useAccountStatement } from "../../../hooks/useAccountStatement";
import type { StatementEntry } from "../../../services/financeService";

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
    const [fromDate, setFromDate] = useState<string>(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const { lines, closingBalance, isLoading, error, refetch } = useAccountStatement(
        entityType,
        entityId,
        fromDate,
        toDate
    );

    useEffect(() => {
        if (isOpen && entityId) {
            refetch();
        }
    }, [isOpen, entityId, refetch]);

    const handleExportCsv = () => {
        if (!lines.length) return;

        const headers = ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'];
        const csvRows = [
            headers.join(','),
            ...lines.map(line => [
                line.date,
                line.reference || '',
                line.description || '',
                line.debit,
                line.credit,
                line.balance,
            ].join(',')),
            ['', '', 'Closing Balance', '', '', closingBalance].join(','),
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${entityName}-${entityType}-statement-${fromDate}-${toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Account Statement for {entityName}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                        <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700">From Date</label>
                        <input
                            type="date"
                            id="fromDate"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                    </div>
                    <div className="flex-1">
                        <label htmlFor="toDate" className="block text-sm font-medium text-gray-700">To Date</label>
                        <input
                            type="date"
                            id="toDate"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={refetch}
                            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Apply Filter'}
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-auto border rounded-md">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">
                            <div className="animate-pulse flex flex-col gap-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                                <div className="h-4 bg-gray-200 rounded"></div>
                                <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
                            </div>
                            Loading statement...
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center text-red-500">Error: {error}</div>
                    ) : lines.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No transactions found for this period.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {lines.map((line, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{line.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.reference}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{line.debit.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{line.credit.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{line.balance.toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 font-bold">
                                    <td colSpan={3} className="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-900">Total Closing Balance:</td>
                                    <td colSpan={3} className="px-6 py-3 whitespace-nowrap text-left text-sm text-gray-900">{closingBalance.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleExportCsv}
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        disabled={!lines.length}
                    >
                        Export to CSV
                    </button>
                </div>
            </div>
        </div>
    );
};


export default AccountStatementModal;
