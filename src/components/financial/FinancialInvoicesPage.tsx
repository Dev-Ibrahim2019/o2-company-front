import { useCallback, useEffect, useState } from "react";
import {
  Plus, RefreshCw, Eye, Edit3, Trash2, CheckCircle, XCircle,
  Search, ChevronRight, ChevronLeft, FileText, Loader2, Upload,
} from "lucide-react";
import { financialInvoiceService } from "../../services/financialInvoiceService";
import type { FinancialInvoice } from "../../types/financialInvoice";
import { STATUS_LABELS, STATUS_COLORS, CURRENCIES, DEFAULT_CURRENCY } from "../../types/financialInvoice";

interface Props {
  onOpenForm: (id?: number) => void;
}

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "draft", label: "مسودة" },
  { key: "pending", label: "بانتظار التعميد" },
  { key: "partial", label: "بانتظار السداد" },
  { key: "paid", label: "مدفوعة" },
];

export const FinancialInvoicesPage = ({ onOpenForm }: Props) => {
  const [invoices, setInvoices] = useState<FinancialInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [currency] = useState(DEFAULT_CURRENCY);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 15 };
      if (activeTab !== "all") params.status = activeTab;
      if (search) params.search = search;

      const result = await financialInvoiceService.getAll(params);
      setInvoices(result.data || []);
      setLastPage(result.last_page || 1);
      setTotal(result.total || 0);
    } catch (err) {
      console.error("Failed to load invoices", err);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: number) => {
    if (!confirm("هل تريد تعميد الفاتورة؟")) return;
    try {
      await financialInvoiceService.approve(id);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل التعميد");
    }
  };

  const handleVoid = async (id: number) => {
    if (!confirm("هل تريد إلغاء الفاتورة؟")) return;
    try {
      await financialInvoiceService.void(id);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل الإلغاء");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل تريد حذف الفاتورة نهائياً؟")) return;
    try {
      await financialInvoiceService.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل الحذف");
    }
  };

  const symbolMap: Record<string, string> = { ILS: "₪", JOD: "JD", USD: "$" };
  const symbol = symbolMap[currency] || "₪";

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          فواتير المبيعات
        </h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            رفع
          </button>
          <button
            onClick={() => onOpenForm()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            فاتورة جديدة
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث..."
            className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <button onClick={fetchData} className="p-2 border rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-gray-400">لا توجد فواتير</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الرقم</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">النوع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إلى</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">تاريخ الاستحقاق</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ المتوقع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المدفوع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{inv.number}</td>
                  <td className="px-4 py-3 text-xs">{inv.type || "فاتورة ضريبية"}</td>
                  <td className="px-4 py-3 text-xs">{inv.entity_name || "-"}</td>
                  <td className="px-4 py-3 text-xs">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("ar") : "-"}</td>
                  <td className="px-4 py-3 text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString("ar") : "-"}</td>
                  <td className="px-4 py-3 text-xs">{inv.expected_payment_date ? new Date(inv.expected_payment_date).toLocaleDateString("ar") : "-"}</td>
                  <td className="px-4 py-3 font-bold text-xs">{symbol} {inv.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-green-600 text-xs">{symbol} {inv.paid_amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => onOpenForm(inv.id)} className="p-1 hover:bg-gray-100 rounded" title="عرض/تعديل">
                        <Eye className="w-4 h-4 text-blue-500" />
                      </button>
                      {inv.status === "draft" && (
                        <>
                          <button onClick={() => handleApprove(inv.id)} className="p-1 hover:bg-gray-100 rounded" title="تعميد">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </button>
                          <button onClick={() => handleDelete(inv.id)} className="p-1 hover:bg-gray-100 rounded" title="حذف">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </>
                      )}
                      {inv.status !== "cancelled" && inv.status !== "paid" && (
                        <button onClick={() => handleVoid(inv.id)} className="p-1 hover:bg-gray-100 rounded" title="إلغاء">
                          <XCircle className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 border rounded disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">صفحة {page} من {lastPage} — {total} فاتورة</span>
          <button disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="p-2 border rounded disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
