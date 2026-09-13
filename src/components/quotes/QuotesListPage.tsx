import { useState, useMemo, useCallback } from "react";
import {
  Search, Filter, Plus, FileText, Trash2, Eye, Send, CheckCircle2,
  XCircle, Clock, Calendar, ChevronDown, Download, MoreHorizontal,
  ArrowRightLeft, AlertTriangle, Copy,
} from "lucide-react";
import { useApp } from "../../../store";
import { quoteService } from "../../services/quoteService";
import type { Quote, QuoteStatus } from "../../types/priceQuote";
import {
  QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, QUOTE_STATUS_BG, QUOTE_STATUSES,
  formatQuoteCurrency,
} from "../../types/priceQuote";

interface Props {
  onOpenForm: (id?: number) => void;
}

const TABS = QUOTE_STATUSES;

export const QuotesListPage = ({ onOpenForm }: Props) => {
  const { customers, currentUser } = useApp();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<QuoteStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<number | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedActions, setExpandedActions] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [stats, setStats] = useState({
    total: 0, draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0, converted: 0, total_value: 0,
  });

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (activeTab !== "all") params.status = activeTab;
      if (search) params.search = search;
      if (clientFilter !== "all") params.client_id = clientFilter;
      if (dateFrom) params.from_date = dateFrom;
      if (dateTo) params.to_date = dateTo;
      const res = await quoteService.getAll(params);
      setQuotes(Array.isArray(res) ? res : (res as any)?.data ?? []);
    } catch {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, clientFilter, dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await quoteService.getStats(currentUser?.branchId ? Number(currentUser.branchId) : undefined);
      setStats(s as any);
    } catch {
      // ignore
    }
  }, [currentUser]);

  useMemo(() => { fetchQuotes(); fetchStats(); }, [fetchQuotes, fetchStats]);

  const filteredQuotes = useMemo(() => {
    let list = [...quotes];
    if (activeTab !== "all") list = list.filter((q) => q.status === activeTab);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.quote_number.toLowerCase().includes(s) ||
          (q.client_name ?? "").toLowerCase().includes(s) ||
          q.total.toString().includes(s)
      );
    }
    if (clientFilter !== "all") list = list.filter((q) => q.client_id === clientFilter);
    if (dateFrom) list = list.filter((q) => q.issue_date >= dateFrom);
    if (dateTo) list = list.filter((q) => q.issue_date <= dateTo);
    return list;
  }, [quotes, activeTab, search, clientFilter, dateFrom, dateTo]);

  const handleDelete = async (id: number) => {
    try {
      await quoteService.delete(id);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setConfirmDelete(null);
    } catch {
      // ignore
    }
  };

  const handleSend = async (id: number) => {
    try {
      const updated = await quoteService.send(id);
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...updated, status: "sent" as QuoteStatus } : q)));
    } catch {
      // ignore
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      const newQuote = await quoteService.duplicate(id);
      setQuotes((prev) => [newQuote, ...prev]);
      onOpenForm(newQuote.id);
    } catch {
      // ignore
    }
  };

  const handleConvert = async (id: number) => {
    try {
      const result = await quoteService.convertToInvoice(id);
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, status: "converted" as QuoteStatus, converted_invoice_id: result.invoice?.id } : q
        )
      );
    } catch {
      // ignore
    }
  };

  const uniqueClients = useMemo(() => {
    const seen = new Map<number, string>();
    quotes.forEach((q) => {
      if (q.client_id && q.client_name) seen.set(q.client_id, q.client_name);
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [quotes]);

  const getStatusBadge = (status: QuoteStatus) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${QUOTE_STATUS_COLORS[status]} ${QUOTE_STATUS_BG[status]}`}
    >
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--o2-bg)" }} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
            <FileText className="w-6 h-6" style={{ color: "var(--o2-brand-text)" }} />
            عروض الأسعار
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--o2-muted)" }}>
            إدارة وإرسال عروض الأسعار للعملاء
          </p>
        </div>
        <button
          onClick={() => onOpenForm()}
          className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition"
          style={{ backgroundColor: "var(--o2-brand)", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          إنشاء عرض سعر
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: "الكل", value: stats.total, color: "var(--o2-text)" },
          { label: "مسودة", value: stats.draft, color: "#94a3b8" },
          { label: "مُرسل", value: stats.sent, color: "#3b82f6" },
          { label: "مقبول", value: stats.accepted, color: "#10b981" },
          { label: "مرفوض", value: stats.rejected, color: "#ef4444" },
          { label: "منتهي", value: stats.expired, color: "#f59e0b" },
          { label: "تم التحويل", value: stats.converted, color: "#a855f7" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-3" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
            <p className="text-xs" style={{ color: "var(--o2-muted)" }}>{s.label}</p>
            <p className="text-xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto custom-scrollbar pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${
              activeTab === tab.value ? "text-white" : ""
            }`}
            style={{
              backgroundColor: activeTab === tab.value ? "var(--o2-brand)" : "var(--o2-surface)",
              color: activeTab === tab.value ? "white" : "var(--o2-muted)",
              border: `1px solid ${activeTab === tab.value ? "var(--o2-brand)" : "var(--o2-border)"}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--o2-muted)" }} />
            <input
              type="text"
              placeholder="بحث برقم العرض، اسم العميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-offset-0"
              style={{
                backgroundColor: "var(--o2-surface)",
                borderColor: "var(--o2-border)",
                color: "var(--o2-text)",
                outline: "none",
                "--tw-ring-color": "var(--o2-brand)",
              } as React.CSSProperties}
            />
          </div>
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="px-3 py-2.5 rounded-xl text-sm border"
          style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
        >
          <option value="all">جميع العملاء</option>
          {uniqueClients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm border"
          style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
          placeholder="من تاريخ"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm border"
          style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
          placeholder="إلى تاريخ"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "var(--o2-surface-raised)" }}>
              <tr className="border-b" style={{ borderColor: "var(--o2-border)" }}>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>رقم العرض</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>العميل</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>التاريخ</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>الانتهاء</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>الإجمالي</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: "var(--o2-muted)" }}>الحالة</th>
                <th className="px-4 py-3 text-right font-medium w-20" style={{ color: "var(--o2-muted)" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: "var(--o2-muted)" }}>
                    جاري التحميل...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--o2-muted)" }} />
                    <p className="text-sm font-bold mb-1" style={{ color: "var(--o2-text)" }}>لا توجد عروض أسعار</p>
                    <p className="text-xs mb-4" style={{ color: "var(--o2-muted)" }}>
                      {search || activeTab !== "all" ? "جرّب تغيير معايير البحث" : "ابدأ بإنشاء عرض سعر جديد"}
                    </p>
                    {!search && activeTab === "all" && (
                      <button
                        onClick={() => onOpenForm()}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                        style={{ backgroundColor: "var(--o2-brand)" }}
                      >
                        <Plus className="w-4 h-4 inline ml-1" />
                        إنشاء عرض سعر
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b transition hover:opacity-80"
                    style={{ borderColor: "var(--o2-border)" }}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onOpenForm(quote.id)}
                        className="font-mono text-xs font-bold hover:underline"
                        style={{ color: "var(--o2-brand-text)" }}
                      >
                        {quote.quote_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--o2-text)" }}>
                      {quote.client_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--o2-text)" }}>
                      {quote.issue_date}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: quote.expiry_date && new Date(quote.expiry_date) < new Date() && quote.status !== "converted" ? "var(--o2-brand-text)" : "var(--o2-text)" }}>
                      {quote.expiry_date || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--o2-success-text)" }}>
                      {formatQuoteCurrency(quote.total, quote.currency)}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(quote.status)}</td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setExpandedActions(expandedActions === quote.id ? null : quote.id)}
                          className="p-1.5 rounded-lg transition"
                          style={{ color: "var(--o2-muted)" }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {expandedActions === quote.id && (
                          <div
                            className="absolute left-0 top-full mt-1 w-48 rounded-xl border shadow-xl z-50 py-1"
                            style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}
                          >
                            <button
                              onClick={() => { onOpenForm(quote.id); setExpandedActions(null); }}
                              className="w-full px-4 py-2 text-right text-xs flex items-center gap-2 hover:opacity-80"
                              style={{ color: "var(--o2-text)" }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              عرض / تعديل
                            </button>
                            {quote.status === "draft" && (
                              <button
                                onClick={() => { handleSend(quote.id); setExpandedActions(null); }}
                                className="w-full px-4 py-2 text-right text-xs flex items-center gap-2 hover:opacity-80"
                                style={{ color: "#3b82f6" }}
                              >
                                <Send className="w-3.5 h-3.5" />
                                إرسال
                              </button>
                            )}
                            {quote.status === "accepted" && (
                              <button
                                onClick={() => { handleConvert(quote.id); setExpandedActions(null); }}
                                className="w-full px-4 py-2 text-right text-xs flex items-center gap-2 hover:opacity-80"
                                style={{ color: "#a855f7" }}
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                تحويل إلى فاتورة
                              </button>
                            )}
                            <button
                              onClick={() => { handleDuplicate(quote.id); setExpandedActions(null); }}
                              className="w-full px-4 py-2 text-right text-xs flex items-center gap-2 hover:opacity-80"
                              style={{ color: "var(--o2-text)" }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                              تكرار
                            </button>
                            {quote.status === "draft" && (
                              <button
                                onClick={() => { setConfirmDelete(quote.id); setExpandedActions(null); }}
                                className="w-full px-4 py-2 text-right text-xs flex items-center gap-2 hover:opacity-80"
                                style={{ color: "#ef4444" }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                حذف
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="rounded-2xl border shadow-2xl p-6 max-w-sm w-full mx-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6" style={{ color: "#ef4444" }} />
              <h3 className="text-lg font-bold" style={{ color: "var(--o2-text)" }}>حذف عرض السعر</h3>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--o2-muted)" }}>
              هل أنت متأكد من حذف هذا العرض؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border"
                style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: "#ef4444" }}
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
