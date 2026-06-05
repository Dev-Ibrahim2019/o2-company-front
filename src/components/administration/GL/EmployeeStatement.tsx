import React, { useState, useEffect } from 'react';
import { financeService } from '../../../services/financeService';

interface StatementEntry {
    id: number;
    date: string;
    reference: string | null;
    description: string | null;
    debit: number;
    credit: number;
    balance: number;
}

interface EmployeeStatementProps {
    employeeId: number;
    employeeName: string;
}

const EmployeeStatement: React.FC<EmployeeStatementProps> = ({ employeeId, employeeName }) => {
    const [entries, setEntries] = useState<StatementEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');

    useEffect(() => {
        // Set default date range (current month)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFromDate(firstDay.toISOString().split('T')[0]);
        setToDate(lastDay.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (fromDate && toDate) {
            fetchStatement();
        }
    }, [employeeId, fromDate, toDate]);

    const fetchStatement = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await financeService.getEmployeeStatement(employeeId, fromDate, toDate);
            const statementData = Array.isArray(response) ? response : response.data || [];
            setEntries(statementData);
        } catch (err: any) {
            setError(err.message || 'فشل في جلب كشف الحساب');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyFilter = () => {
        fetchStatement();
    };

    const calculateBalance = (index: number): number => {
        let balance = 0;
        for (let i = 0; i <= index; i++) {
            balance += entries[i].debit - entries[i].credit;
        }
        return balance;
    };

    const openingBalance = entries.length > 0 ? calculateBalance(0) - (entries[0].debit - entries[0].credit) : 0;
    const closingBalance = entries.length > 0 ? calculateBalance(entries.length - 1) : 0;
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    return (
        <div className="bg-white rounded-lg shadow-md p-6" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">كشف حساب الموظف</h2>
                <p className="text-gray-600 mt-1">{employeeName}</p>
            </div>

            {/* Filter */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">من التاريخ</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">إلى التاريخ</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleApplyFilter}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                        تطبيق الفلتر
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-600 font-semibold">الرصيد الافتتاحي</p>
                    <p className="text-xl font-bold text-blue-600">
                        ₪{openingBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 font-semibold">إجمالي المدين</p>
                    <p className="text-xl font-bold text-green-600">
                        ₪{totalDebit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-xs text-gray-600 font-semibold">إجمالي الدائن</p>
                    <p className="text-xl font-bold text-orange-600">
                        ₪{totalCredit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-600 font-semibold">الرصيد الختامي</p>
                    <p className={`text-xl font-bold ${closingBalance >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                        ₪{closingBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Statement Table */}
            {isLoading ? (
                <div className="flex justify-center items-center h-32">
                    <div className="text-gray-600">جاري تحميل البيانات...</div>
                </div>
            ) : error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    لا توجد معاملات في هذه الفترة
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">التاريخ</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">المرجع</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">البيان</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-700">مدين</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-700">دائن</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-700">الرصيد</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => {
                                const balance = calculateBalance(index);
                                return (
                                    <tr key={entry.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-800">
                                            {new Date(entry.date).toLocaleDateString('ar-SA')}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-600">
                                            {entry.reference || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {entry.description || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            {entry.debit > 0 ? (
                                                <span className="text-green-600 font-semibold">
                                                    ₪{entry.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono">
                                            {entry.credit > 0 ? (
                                                <span className="text-orange-600 font-semibold">
                                                    ₪{entry.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono font-bold">
                                            <span className={balance >= 0 ? 'text-blue-600' : 'text-red-600'}>
                                                ₪{balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EmployeeStatement;
