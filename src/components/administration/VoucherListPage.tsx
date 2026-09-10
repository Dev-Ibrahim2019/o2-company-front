import { useState, useCallback, useMemo } from "react";
import {
  Search, Plus, Filter, FileText, Clock, CheckCircle2, XCircle,
  ChevronLeft, Eye, Trash2, Loader2, Receipt, Banknote, Download,
} from "lucide-react";
import { voucherService } from "../../services/voucherService";
import { useApp } from "../../../store";
import { toast } from "../shared/Toast";
import type { Voucher, VoucherType, VoucherStatus } from "../../types/voucher";
import {
  VOUCHER_TYPE_LABELS, VOUCHER_STATUS_LABELS, VOUCHER_STATUS_COLORS, VOUCHER_STATUS_BG,
  formatVoucherCurrency,
} from "../../types/voucher";

interface Props {
  onOpenForm: (type?: VoucherType, id?: number) => void;
  defaultTab?: string;
  title?: string;
  subtitle?: string;
}

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "receipt", label: "سندات القبض" },
  { key: "payment", label: "سندات الصرف" },
  { key: "draft", label: "مسودات" },
  { key: "active", label: "نشط" },
  { key: "cancelled", label: "ملغي" },
];

export const VoucherListPage: React.FC<Props> = ({ onOpenForm, defaultTab, title, subtitle }) => {
  const { currentUser } = useApp();
  const isAdmin = ["super-admin", "admin", "branch-manager"].includes(currentUser?.role || "");

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab || "all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 15 };
      if (activeTab === "receipt") params.type = "receipt";
      else if (activeTab === "payment") params.type = "payment";
      else if (["draft", "active", "cancelled"].includes(activeTab)) params.status = activeTab;
      if (search) params.search = search;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });

      const res = await voucherService.getAll(params);
      setVouchers(Array.isArray(res) ? res : (res as any)?.data ?? []);
      setLastPage((res as any)?.last_page ?? 1);
      setTotal((res as any)?.total ?? 0);
    } catch {
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await voucherService.getStats();
      setStats(s);
    } catch { /* ignore */ }
  }, []);

  useMemo(() => { fetchVouchers(); fetchStats(); }, [fetchVouchers, fetchStats]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await voucherService.delete(deleteId);
      toast.success("تم حذف السند");
      setDeleteId(null);
      fetchVouchers();
      fetchStats();
    } catch {
      toast.error("فشل حذف السند");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: VoucherStatus) => (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ backgroundColor: VOUCHER_STATUS_BG[status], color: VOUCHER_STATUS_COLORS[status] }}
    >
      {status === "active" && <CheckCircle2 className="w-3 h-3" />}
      {status === "draft" && <Clock className="w-3 h-3" />}
      {status === "cancelled" && <XCircle className="w-3 h-3" />}
      {VOUCHER_STATUS_LABELS[status]}
    </span>
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--o2-text)" }}>{title || "السندات المحاسبية"}</h1>
          <p className="text-xs mt-1" style={{ color: "var(--o2-muted)" }}>{subtitle || "سندات القبض والصرف"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onOpenForm("receipt")}
            className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white"
            style={{ backgroundColor: "#16a34a" }}>
            <Receipt className="w-3.5 h-3.5" /> سند قبض
          </button>
          <button onClick={() => onOpenForm("payment")}
            className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white"
            style={{ backgroundColor: "#dc2626" }}>
            <Banknote className="w-3.5 h-3.5" /> سند صرف
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "الكل", value: stats.total, color: "var(--o2-text)" },
            { label: "القبض", value: `${Number(stats.receipts).toFixed(0)} ₪`, color: "#16a34a" },
            { label: "الصرف", value: `${Number(stats.payments).toFixed(0)} ₪`, color: "#dc2626" },
            { label: "مسودات", value: stats.draft, color: "#6b7280" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border p-3" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
              <p className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>{s.label}</p>
              <p className="text-lg font-black mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === t.key ? "text-white" : ""}`}
              style={activeTab === t.key ? { backgroundColor: "var(--o2-brand)" } : { color: "var(--o2-muted)" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--o2-muted)" }} />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث بالرقم أو الاسم..."
              className="w-full pr-9 pl-3 py-2 rounded-lg text-xs border"
              style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg border"
            style={{ borderColor: "var(--o2-border)", color: "var(--o2-muted)" }}>
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border p-4 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>من تاريخ</label>
            <input type="date" value={filters.from_date || ""} onChange={(e) => setFilters(p => ({ ...p, from_date: e.target.value }))}
              className="w-full px-2 py-1.5 rounded text-xs border" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>إلى تاريخ</label>
            <input type="date" value={filters.to_date || ""} onChange={(e) => setFilters(p => ({ ...p, to_date: e.target.value }))}
              className="w-full px-2 py-1.5 rounded text-xs border" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>طريقة الدفع</label>
            <select value={filters.payment_method_id || ""} onChange={(e) => setFilters(p => ({ ...p, payment_method_id: e.target.value }))}
              className="w-full px-2 py-1.5 rounded text-xs border" style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
              <option value="">الكل</option>
              <option value="cash">نقدي</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="credit_card">بطاقة ائتمان</option>
              <option value="cheque">شيك</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters({})}
              className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: "var(--o2-brand)" }}>
              مسح الفلاتر
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--o2-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "var(--o2-surface)" }}>
                {["الرقم", "النوع", "الطرف", "المبلغ", "التاريخ", "الحالة", "أنشأه", "إجراءات"].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-bold" style={{ color: "var(--o2-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "var(--o2-muted)" }} /></td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: "var(--o2-muted)" }}>لا توجد سندات</td></tr>
              ) : vouchers.map((v) => (
                <tr key={v.id} className="border-t" style={{ borderColor: "var(--o2-border)" }}>
                  <td className="px-4 py-3 font-bold font-mono" style={{ color: "var(--o2-text)" }}>{v.number}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{ backgroundColor: v.type === "receipt" ? "#dcfce7" : "#fee2e2", color: v.type === "receipt" ? "#16a34a" : "#dc2626" }}>
                      {v.type === "receipt" ? <Receipt className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                      {VOUCHER_TYPE_LABELS[v.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: "var(--o2-text)" }}>{v.entity_name || "—"}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: v.type === "receipt" ? "#16a34a" : "#dc2626" }}>
                    {formatVoucherCurrency(v.amount, v.currency)}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--o2-muted)" }}>{v.voucher_date}</td>
                  <td className="px-4 py-3">{getStatusBadge(v.status)}</td>
                  <td className="px-4 py-3" style={{ color: "var(--o2-muted)" }}>{v.creator?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onOpenForm(v.type, v.id)} className="p-1.5 rounded hover:opacity-80" style={{ color: "var(--o2-brand)" }}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {v.status === "draft" && (
                        <button onClick={() => setDeleteId(v.id)} className="p-1.5 rounded hover:opacity-80" style={{ color: "#dc2626" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--o2-muted)" }}>إجمالي: {total}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded text-xs border disabled:opacity-50" style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
              السابق
            </button>
            <span className="px-3 py-1.5 text-xs font-bold" style={{ color: "var(--o2-text)" }}>{page}/{lastPage}</span>
            <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
              className="px-3 py-1.5 rounded text-xs border disabled:opacity-50" style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-xl p-6 max-w-sm w-full mx-4" style={{ backgroundColor: "var(--o2-surface)" }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: "var(--o2-text)" }}>تأكيد الحذف</h3>
            <p className="text-xs mb-4" style={{ color: "var(--o2-muted)" }}>هل أنت متأكد من حذف هذا السند؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>إلغاء</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50" style={{ backgroundColor: "#dc2626" }}>
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
