import React, { useState, useEffect } from 'react';
import { financeService } from '../../../services/financeService';

interface Loan {
    id: number;
    amount: number;
    amount_paid: number;
    date_granted: string;
    repayment_date: string | null;
    status: 'pending' | 'repaid' | 'partially_repaid' | 'cancelled';
    notes: string | null;
}

interface EmployeeLoansListProps {
    employeeId: number;
}

const EmployeeLoansList: React.FC<EmployeeLoansListProps> = ({ employeeId }) => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLoans();
    }, [employeeId]);

    const fetchLoans = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await financeService.getEmployeeLoans(employeeId);
            const loansData = Array.isArray(response) ? response : response.data || [];
            setLoans(loansData);
        } catch (err: any) {
            setError(err.message || 'فشل في جلب السلف');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { bg: string; text: string; label: string }> = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'معلقة' },
            partially_repaid: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'مسددة جزئياً' },
            repaid: { bg: 'bg-green-100', text: 'text-green-800', label: 'مسددة' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'ملغاة' },
        };
        const statusInfo = statusMap[status] || statusMap.pending;
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}>
                {statusInfo.label}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-32">
                <div className="text-gray-600">جاري تحميل السلف...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    if (loans.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                لا توجد سلف للموظف
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden" dir="rtl">
            <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                    <tr>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">رقم السلفة</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">المبلغ الأصلي</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">المبلغ المدفوع</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">المبلغ المتبقي</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">تاريخ الاستحقاق</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">الحالة</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">النسبة المئوية</th>
                    </tr>
                </thead>
                <tbody>
                    {loans.map((loan) => {
                        const remaining = loan.amount - loan.amount_paid;
                        const percentage = (loan.amount_paid / loan.amount) * 100;

                        return (
                            <tr key={loan.id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-mono text-gray-800">#{loan.id}</td>
                                <td className="px-4 py-3 font-mono text-gray-800">
                                    ₪{loan.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 font-mono text-green-600 font-semibold">
                                    ₪{loan.amount_paid.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 font-mono text-orange-600 font-semibold">
                                    ₪{remaining.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {loan.repayment_date ? new Date(loan.repayment_date).toLocaleDateString('ar-SA') : '—'}
                                </td>
                                <td className="px-4 py-3">
                                    {getStatusBadge(loan.status)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600 w-10">
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Summary */}
            <div className="bg-gray-50 px-4 py-3 border-t grid grid-cols-4 gap-4">
                <div>
                    <p className="text-xs text-gray-600 font-semibold">إجمالي السلف</p>
                    <p className="text-lg font-bold text-gray-800">
                        ₪{loans.reduce((sum, l) => sum + l.amount, 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 font-semibold">المدفوع</p>
                    <p className="text-lg font-bold text-green-600">
                        ₪{loans.reduce((sum, l) => sum + l.amount_paid, 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 font-semibold">المتبقي</p>
                    <p className="text-lg font-bold text-orange-600">
                        ₪{loans.reduce((sum, l) => sum + (l.amount - l.amount_paid), 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-600 font-semibold">عدد السلف</p>
                    <p className="text-lg font-bold text-gray-800">{loans.length}</p>
                </div>
            </div>
        </div>
    );
};

export default EmployeeLoansList;
