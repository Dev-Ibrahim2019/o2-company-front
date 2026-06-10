import { X } from "lucide-react";
import type { Transaction } from "../../../services/accounting";

interface Props {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function TransactionDetailsModal({
  open,
  onClose,
  transaction,
}: Props) {
  if (!open || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
      <div className="w-[900px] h-full bg-white overflow-y-auto shadow-2xl">

        {/* HEADER */}

        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold">
              تفاصيل القيد
            </h2>

            <p className="text-gray-500 mt-1">
              {transaction.transaction_number}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X />
          </button>
        </div>

        {/* INFO */}

        <div className="grid grid-cols-2 gap-4 p-6 border-b">

          <Info
            label="التاريخ"
            value={transaction.date}
          />

          <Info
            label="النوع"
            value={transaction.type_label}
          />

          <Info
            label="الحالة"
            value={transaction.status_label}
          />

          <Info
            label="المرجع"
            value={transaction.reference || "-"}
          />

          <Info
            label="الفرع"
            value={transaction.branch?.name || "-"}
          />

          <Info
            label="المستخدم"
            value={transaction.user?.name || "-"}
          />

        </div>

        {/* DESCRIPTION */}

        <div className="p-6 border-b">
          <h3 className="font-semibold mb-2">
            الوصف
          </h3>

          <p className="text-gray-700">
            {transaction.description || "-"}
          </p>
        </div>

        {/* ENTRIES */}

        <div className="p-6">

          <h3 className="font-bold text-lg mb-4">
            أسطر القيد
          </h3>

          <div className="overflow-hidden rounded-xl border">

            <table className="w-full text-sm">

              <thead className="bg-gray-50 border-b">
                <tr className="text-right">
                  <th className="p-4">الحساب</th>
                  <th className="p-4">الوصف</th>
                  <th className="p-4">مركز التكلفة</th>
                  <th className="p-4">Subledger</th>
                  <th className="p-4">مدين</th>
                  <th className="p-4">دائن</th>
                </tr>
              </thead>

              <tbody>
                {transaction.entries?.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b"
                  >
                    <td className="p-4">
                      <div className="font-medium">
                        {entry.account?.name}
                      </div>

                      <div className="text-xs text-gray-500">
                        {entry.account?.code}
                      </div>
                    </td>

                    <td className="p-4">
                      {entry.description || "-"}
                    </td>

                    <td className="p-4">
                      {entry.cost_center?.name || "-"}
                    </td>

                    <td className="p-4">
                      {entry.subledger?.name || "-"}
                    </td>

                    <td className="p-4 text-green-700 font-semibold">
                      {entry.debit > 0
                        ? entry.debit.toLocaleString()
                        : "-"}
                    </td>

                    <td className="p-4 text-red-700 font-semibold">
                      {entry.credit > 0
                        ? entry.credit.toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="bg-gray-50">
                <tr className="font-bold">
                  <td colSpan={4} className="p-4 text-left">
                    الإجمالي
                  </td>

                  <td className="p-4 text-green-700">
                    {transaction.total_debit.toLocaleString()}
                  </td>

                  <td className="p-4 text-red-700">
                    {transaction.total_credit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>

            </table>

          </div>

        </div>

      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-sm text-gray-500 mb-1">
        {label}
      </div>

      <div className="font-medium">
        {value}
      </div>
    </div>
  );
}
