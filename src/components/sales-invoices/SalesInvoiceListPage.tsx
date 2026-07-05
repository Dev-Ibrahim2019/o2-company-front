import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, RefreshCw, Eye, Trash2, CheckCircle, XCircle,
  Search, ChevronRight, ChevronLeft, FileText, Loader2,
  DollarSign, AlertTriangle, ArrowDownToLine, Filter, X,
  CheckSquare, Square, Building2, SlidersHorizontal,
  Send, Layers, Archive, CheckCircle2,
} from "lucide-react";
import { salesInvoiceService } from "../../services/salesInvoiceService";
import { useApp } from "../../../store";
import { useAuth } from "../../auth/AuthContext";
import { InvoiceFilterModal, emptyFilters } from "../administration/InvoiceFilterModal";
import type { InvoiceFilters } from "../administration/InvoiceFilterModal";
import type { SalesInvoice } from "../../types/salesInvoice";
import {
  SALES_INVOICE_STATUS_LABELS,
  SALES_INVOICE_STATUS_COLORS,
  formatCurrency,
  INVOICE_TYPE_LABELS,
  INVOICE_TYPES,
} from "../../types/salesInvoice";

interface Props {
  onOpenForm: (id?: number) => void;
}

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "draft", label: "مسودة" },
  { key: "awaiting_approval", label: "بانتظار التعميد" },
  { key: "awaiting_payment", label: "بانتظار السداد" },
  { key: "partial", label: "سداد جزئي" },
  { key: "paid", label: "مدفوعة" },
  { key: "cancelled", label: "ملغاة" },
  { key: "pos", label: "نقاط البيع" },
];

export const SalesInvoiceListPage = ({ onOpenForm }: Props) => {
  const { branches } = useApp();
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r) => ["super-admin", "admin", "branch-manager"].includes(r));

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);

  // ── Filters ──
  const [filters, setFilters] = useState<InvoiceFilters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // ── Bulk selection ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkPosting, setBulkPosting] = useState(false);
  const [bulkGrouping, setBulkGrouping] = useState(false);
  const [postedInvoiceIds, setPostedInvoiceIds] = useState<number[]>([]);

  // POS state
  const [posInvoices, setPosInvoices] = useState<any[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [posPage, setPosPage] = useState(1);
  const [posLastPage, setPosLastPage] = useState(1);
  const [posTotal, setPosTotal] = useState(0);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // Effective selected count on current tab (only specific statuses support bulk approve)
  const approvableSelected = useMemo(
    () => invoices.filter((i) => selectedIds.has(i.id) && ["draft", "awaiting_approval"].includes(i.status)),
    [invoices, selectedIds]
  );

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "search") return false;
    return value !== "" && value !== "all";
  }).length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 15 };
      if (activeTab !== "all" && activeTab !== "pos") params.status = activeTab;
      if (search) params.search = search;
      if (filters.from) params.from_date = filters.from;
      if (filters.to) params.to_date = filters.to;
      if (filters.paymentStatus !== "all") params.payment_status = filters.paymentStatus;
      if (filters.paymentMethod !== "all") params.payment_method = filters.paymentMethod;
      if (filters.minTotal) params.min_total = filters.minTotal;
      if (filters.maxTotal) params.max_total = filters.maxTotal;

      const result = await salesInvoiceService.getAll(params);
      setInvoices(result.data || []);
      setLastPage(result.last_page || 1);
      setTotal(result.total || 0);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to load sales invoices", err);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search, filters]);

  const fetchStats = useCallback(async (params?: Record<string, any>) => {
    try {
      const s = await salesInvoiceService.getStats(params);
      setStats(s);
    } catch {}
  }, []);

  const fetchPosInvoices = useCallback(async () => {
    setPosLoading(true);
    try {
      const result = await salesInvoiceService.getPosInvoices({ page: posPage, per_page: 15 });
      setPosInvoices(result.data || []);
      setPosLastPage(result.last_page || 1);
      setPosTotal(result.total || 0);
    } catch (err) {
      console.error("Failed to load POS invoices", err);
    } finally {
      setPosLoading(false);
    }
  }, [posPage]);

  useEffect(() => {
    if (activeTab === "pos") {
      fetchPosInvoices();
    } else {
      fetchData();
    }
  }, [activeTab, fetchData, fetchPosInvoices]);

  // Refetch stats when filters change
  useEffect(() => {
    const params: Record<string, any> = {};
    if (filters.from) params.from_date = filters.from;
    if (filters.to) params.to_date = filters.to;
    fetchStats(params);
  }, [filters.from, filters.to, fetchStats]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleApprove = async (id: number) => {
    if (!confirm("هل تريد تعميد الفاتورة؟ سيتم إنشاء القيود المحاسبية.")) return;
    try {
      await salesInvoiceService.approve(id);
      fetchData();
      fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل التعميد");
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("هل تريد إلغاء الفاتورة؟ سيتم عكس القيود المحاسبية.")) return;
    try {
      await salesInvoiceService.cancel(id);
      fetchData();
      fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل الإلغاء");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل تريد حذف الفاتورة نهائياً؟")) return;
    try {
      await salesInvoiceService.delete(id);
      fetchData();
      fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل الحذف");
    }
  };

  // ── Selection helpers ──
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    const pageIds = invoices.map((i) => i.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBulkApprove = async () => {
    if (approvableSelected.length === 0) {
      alert("لم تختر أي فاتورة بانتظار التعميد");
      return;
    }
    if (!confirm(`هل تريد تعميد ${approvableSelected.length} فاتورة دفعة واحدة؟`)) return;
    setBulkApproving(true);
    try {
      const result: any = await salesInvoiceService.bulkApprove(approvableSelected.map((i) => i.id));
      const approved = result?.approved ?? 0;
      const skipped = result?.skipped ?? 0;
      alert(`تم تعميد ${approved} فاتورة${skipped > 0 ? ` (تم تخطي ${skipped})` : ""}`);
      setSelectedIds(new Set());
      fetchData();
      fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل التعميد المجمّع");
    } finally {
      setBulkApproving(false);
    }
  };

  const selectedRows = useMemo(
    () => invoices.filter((i) => selectedIds.has(i.id)),
    [invoices, selectedIds],
  );

  const handleBulkPostJournal = async () => {
    const payables = selectedRows.filter(
      (r) => Number(r.paid_amount) > 0 && !postedInvoiceIds.includes(r.id),
    );
    if (payables.length === 0) {
      alert("لم تختر أي فاتورة مدفوعة غير مرحّلة");
      return;
    }
    if (!confirm(`هل تريد ترحيل ${payables.length} فاتورة دفعة واحدة؟`)) return;
    setBulkPosting(true);
    try {
      const result: any = await salesInvoiceService.bulkPost(payables.map((i) => i.id));
      const posted = result?.posted ?? payables.length;
      const skipped = result?.skipped ?? 0;
      setPostedInvoiceIds((prev) => [...new Set([...prev, ...payables.map((i) => i.id)])]);
      alert(`تم ترحيل ${posted} فاتورة${skipped > 0 ? ` (تم تخطي ${skipped})` : ""}`);
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل الترحيل المجمّع");
    } finally {
      setBulkPosting(false);
    }
  };

  const handleGroupInvoices = async () => {
    if (selectedRows.length < 2) {
      alert("اختر فاتورتين على الأقل لتجميعهما");
      return;
    }
    const totals = selectedRows.reduce((sum, r) => sum + Number(r.total || 0), 0);
    const customers = [...new Set(selectedRows.map((r) => r.customer_name || "عميل"))];
    if (!confirm(`تجميع ${selectedRows.length} فاتورة\nالإجمالي: ${formatCurrency(totals)}\nالعملاء: ${customers.join(", ")}\n\nهل تريد المتابعة؟`)) return;
    setBulkGrouping(true);
    try {
      await salesInvoiceService.bulkApprove(selectedRows.map((i) => i.id));
      alert("تم تجميع الفواتير بنجاح");
      setSelectedIds(new Set());
      fetchData();
      fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل تجميع الفواتير");
    } finally {
      setBulkGrouping(false);
    }
  };

  const handleSyncPos = async (posInvoiceId: number) => {
    setSyncingId(posInvoiceId);
    try {
      await salesInvoiceService.syncPosInvoice(posInvoiceId);
      fetchPosInvoices();
      fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل المزامنة");
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAllPos = async () => {
    if (!confirm("هل تريد مزامنة جميع فواتير نقطة البيع غير المزامنة؟")) return;
    try {
      const result = await salesInvoiceService.syncPosEndOfDay({ branch_id: 0 });
      alert(`تم مزامنة ${(result as any)?.synced || 0} فاتورة`);
      fetchPosInvoices();
      fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل المزامنة");
    }
  };

  const isPos = activeTab === "pos";

  return (
    <div className="p-6 bg-slate-950 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <FileText className="w-6 h-6 text-red-500" />
          فواتير المبيعات
        </h1>
        <div className="flex gap-2">
          {!isPos && (
            <button
              onClick={() => onOpenForm()}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              فاتورة جديدة
            </button>
          )}
          {isPos && (
            <button
              onClick={handleSyncAllPos}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <ArrowDownToLine className="w-4 h-4" />
              مزامنة الكل
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards (only for non-POS tabs) */}
      {!isPos && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">الإجمالي</span>
            </div>
            <p className="text-xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">فاتورة</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">بانتظار السداد</span>
            </div>
            <p className="text-xl font-bold text-orange-500">{stats.awaitingPayment}</p>
            <p className="text-xs text-slate-500 mt-1">فاتورة</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">المدفوع الإجمالي</span>
            </div>
            <p className="text-xl font-bold text-green-500">{formatCurrency(stats.paidAmount)}</p>
          </div>
          <div className="bg-slate-900 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">متأخرات</span>
            </div>
            <p className="text-xl font-bold text-red-500">{formatCurrency(stats.overdueAmount)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-white/10 pb-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); setPosPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-red-600 text-white"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter (only for non-POS tabs) */}
      {!isPos && (
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchData(); } }}
              placeholder="بحث بالرقم أو اسم العميل..."
              className="w-full pr-10 pl-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition ${
              activeFilterCount > 0
                ? "bg-red-600 border-red-600 text-white"
                : "bg-slate-800 border-white/10 text-slate-300 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            فلاتر
            {activeFilterCount > 0 && (
              <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-md text-[10px]">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowBulkActions((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition ${
              selectedIds.size > 0
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-slate-800 border-white/10 text-slate-300 hover:text-white"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            عمليات مجمّعة
          </button>
          <button onClick={fetchData} className="p-2 bg-slate-800 border border-white/10 rounded-lg hover:bg-white/5">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {!isPos && showBulkActions && (
        <div className="flex items-center gap-3 bg-slate-900/80 border border-white/10 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <CheckSquare className="w-4 h-4 text-red-500" />
            <span>{selectedIds.size} فاتورة محددة</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={handleBulkApprove}
            disabled={bulkApproving || approvableSelected.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg text-xs font-bold transition disabled:opacity-40"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            تعميد مجمّع
          </button>
          <button
            onClick={handleBulkPostJournal}
            disabled={bulkPosting}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600/20 text-orange-400 hover:bg-orange-600/40 rounded-lg text-xs font-bold transition disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            ترحيل مجمّع
          </button>
          <button
            onClick={handleGroupInvoices}
            disabled={bulkGrouping || selectedRows.length < 2}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 rounded-lg text-xs font-bold transition disabled:opacity-40"
          >
            <Layers className="w-3.5 h-3.5" />
            تجميع
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition"
            title="إلغاء التحديد"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* POS Invoices Table */}
      {isPos ? (
        posLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : posInvoices.length === 0 ? (
          <div className="text-center py-20 text-slate-500">لا توجد فواتير نقطة البيع غير المزامنة</div>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">الرقم</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">الفرع</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">العميل</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">التاريخ</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">الإجمالي</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">المدفوع</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {posInvoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-white">{inv.number}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{inv.branch?.name || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{inv.customer?.name || inv.customer_name || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("ar") : "-"}
                    </td>
                    <td className="px-4 py-3 font-bold text-xs text-white">{formatCurrency(Number(inv.total))}</td>
                    <td className="px-4 py-3 text-green-500 text-xs">{formatCurrency(Number(inv.paid_amount || inv.total))}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSyncPos(inv.id)}
                        disabled={syncingId === inv.id}
                        className="flex items-center gap-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                      >
                        {syncingId === inv.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        )}
                        مزامنة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* POS Pagination */}
            {posLastPage > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-white/10">
                <button disabled={posPage <= 1} onClick={() => setPosPage(posPage - 1)} className="p-2 bg-slate-800 border border-white/10 rounded disabled:opacity-50 hover:bg-white/5">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <span className="text-sm text-slate-400">صفحة {posPage} من {posLastPage} — {posTotal} فاتورة</span>
                <button disabled={posPage >= posLastPage} onClick={() => setPosPage(posPage + 1)} className="p-2 bg-slate-800 border border-white/10 rounded disabled:opacity-50 hover:bg-white/5">
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        /* Sales Invoices Table */
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20 text-slate-500">لا توجد فواتير مبيعات</div>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-slate-400 w-10">
                    <button onClick={toggleSelectPage} title="اختر الكل في الصفحة" className="text-slate-400 hover:text-white">
                      {invoices.length > 0 && invoices.every((i) => selectedIds.has(i.id)) ? (
                        <CheckSquare className="w-4 h-4 text-red-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">الرقم</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">النوع</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">إلى</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">التاريخ</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">الإجمالي</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">المدفوع</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">المتبقي</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.map((inv) => (
                  <tr key={inv.id} className={`hover:bg-white/[0.02] ${selectedIds.has(inv.id) ? "bg-red-500/5" : ""}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(inv.id)} className="text-slate-400 hover:text-white">
                        {selectedIds.has(inv.id) ? (
                          <CheckSquare className="w-4 h-4 text-red-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white">{inv.number}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {INVOICE_TYPE_LABELS[inv.type] || inv.type?.replace('_', ' ') || "فاتورة"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {inv.customer_name || inv.customer?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("ar") : "-"}
                    </td>
                    <td className="px-4 py-3 font-bold text-xs text-white">{formatCurrency(Number(inv.total) || 0, inv.currency)}</td>
                    <td className="px-4 py-3 text-green-500 text-xs">{formatCurrency(Number(inv.paid_amount) || 0, inv.currency)}</td>
                    <td className="px-4 py-3 text-red-500 text-xs">{formatCurrency(Number(inv.remaining_amount) || 0, inv.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${SALES_INVOICE_STATUS_COLORS[inv.status]}`}>
                        {SALES_INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => onOpenForm(inv.id)} className="p-1.5 hover:bg-white/5 rounded-lg" title="عرض/تعديل">
                          <Eye className="w-4 h-4 text-slate-400 hover:text-red-500" />
                        </button>
                        {(inv.status === "draft" || inv.status === "awaiting_approval") && (
                          <>
                            <button onClick={() => handleApprove(inv.id)} className="p-1.5 hover:bg-white/5 rounded-lg" title="تعميد">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </button>
                            {inv.status === "draft" && (
                              <button onClick={() => handleDelete(inv.id)} className="p-1.5 hover:bg-white/5 rounded-lg" title="حذف">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </>
                        )}
                        {inv.status !== "cancelled" && inv.status !== "paid" && (
                          <button onClick={() => handleCancel(inv.id)} className="p-1.5 hover:bg-white/5 rounded-lg" title="إلغاء">
                            <XCircle className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Pagination (non-POS) */}
      {!isPos && lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 bg-slate-800 border border-white/10 rounded disabled:opacity-50 hover:bg-white/5">
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          <span className="text-sm text-slate-400">صفحة {page} من {lastPage} — {total} فاتورة</span>
          <button disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="p-2 bg-slate-800 border border-white/10 rounded disabled:opacity-50 hover:bg-white/5">
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* Filter Modal */}
      {showFilters && (
        <InvoiceFilterModal
          filters={filters}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setPage(1);
          }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
};
