import {
    Eye,
    CheckCircle,
    XCircle,
    Clock3,
} from "lucide-react";

import type { Transaction } from "../../../services/accounting";

interface Props {
    transactions: Transaction[];
    loading?: boolean;
    onView: (trx: Transaction) => void;
}

const statusColors = {
    draft: "bg-yellow-100 text-yellow-700",
    posted: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

export default function JournalEntriesTable({
    transactions,
    loading,
    onView,
}: Props) {
    if (loading) {
        return (
            <div className="p-10 text-center text-gray-500">
                جاري تحميل القيود...
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-right">
                            <th className="p-4">رقم القيد</th>
                            <th className="p-4">التاريخ</th>
                            <th className="p-4">الوصف</th>
                            <th className="p-4">النوع</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">المرجع</th>
                            <th className="p-4">مدين</th>
                            <th className="p-4">دائن</th>
                            <th className="p-4">الأسطر</th>
                            <th className="p-4">الفرع</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>

                    <tbody>
                        {transactions.map((trx) => (
                            <tr
                                key={trx.id}
                                className="border-b hover:bg-gray-50 transition"
                            >
                                <td className="p-4 font-medium">
                                    {trx.transaction_number}
                                </td>

                                <td className="p-4">
                                    {trx.date}
                                </td>

                                <td className="p-4 max-w-[250px] truncate">
                                    {trx.description || "-"}
                                </td>

                                <td className="p-4">
                                    {trx.type_label}
                                </td>

                                <td className="p-4">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[trx.status]}`}
                                    >
                                        {trx.status === "posted" && (
                                            <CheckCircle size={14} className="inline ml-1" />
                                        )}

                                        {trx.status === "draft" && (
                                            <Clock3 size={14} className="inline ml-1" />
                                        )}

                                        {trx.status === "cancelled" && (
                                            <XCircle size={14} className="inline ml-1" />
                                        )}

                                        {trx.status_label}
                                    </span>
                                </td>

                                <td className="p-4">
                                    {trx.reference || "-"}
                                </td>

                                <td className="p-4 font-semibold text-green-700">
                                    {trx.total_debit.toLocaleString()}
                                </td>

                                <td className="p-4 font-semibold text-red-700">
                                    {trx.total_credit.toLocaleString()}
                                </td>

                                <td className="p-4">
                                    {trx.entries_count}
                                </td>

                                <td className="p-4">
                                    {trx.branch?.name || "-"}
                                </td>

                                <td className="p-4">
                                    <button
                                        onClick={() => onView(trx)}
                                        className="p-2 rounded-lg hover:bg-gray-100"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
