import { useState, useCallback, useMemo } from "react";
import {
  Search, Plus, Filter, Eye, Trash2, Loader2, RefreshCw,
  Download, Printer, CheckCircle2, Clock, XCircle, AlertTriangle,
  Banknote, FileText,
} from "lucide-react";
import { purchaseBillService } from "../../services/purchaseBillService";
import { supplierService } from "../../services/supplierService";
import { useApp } from "../../../store";
import { toast } from "../shared/Toast";
import type { PurchaseBill, PurchaseBillStatus } from "../../types/purchaseBill";
import {
  PURCHASE_BILL_STATUS_LABELS, PURCHASE_BILL_STATUS_COLORS, PURCHASE_BILL_STATUS_BG,
  formatBillCurrency,
} from "../../types/purchaseBill";

interface Props {
  onCreate: () => void;
  onEdit: (id: number) => void;
  onView: (id: number) => void;
}

const SHEET_TABS = [
  { key: "all", label: "الكل" },
  { key: "draft", label: "مسودة" },
  { key: "unpaid", label: "غير مدفوعة" },
  { key: "partially_paid", label: "مدفوعة جزئيًا" },
  { key: "paid", label: "مدفوعة" },
  { key: "overdue", label: "متأخرة" },
] as const;

export const PurchaseBillsPage: React.FC<Props> = ({ onCreate, onEdit, onView }) => {
  const { currentUser } = useApp();

  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "sheet">("table");

  const fetchSuppliers = useCallback(async () => {
    const data = await supplierService.getAll().catch(() => []);
    setSuppliers(Array.isArray(data) ? data : []);
  }, []);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: 15 };
      if (search) params.search = search;
      if (activeTab !== "all") params.status = activeTab;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await purchaseBillService.getAll(params);
      const raw = (res as any)?.data ?? res;
      const list = Array.isArray(raw) ? raw : (Array.isArray((raw as any)?.data) ? (raw as any).data : []);
      setBills(list);
      setLastPage((res as any)?.last_page ?? (raw as any)?.last_page ?? 1);
      setTotal((res as any)?.total ?? (raw as any)?.total ?? 0);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab, filters]);

  useMemo(() => { fetchBills(); fetchSuppliers(); }, [fetchBills, fetchSuppliers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await purchaseBillService.delete(deleteId);
      toast.success("تم حذف الفاتورة");
      setDeleteId(null);
      fetchBills();
    } catch {
      toast.error("فشل حذف الفاتورة");
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await purchaseBillService.approve(id);
      toast.success("تم اعتماد الفاتورة");
      fetchBills();
    } catch {
      toast.error("فشل اعتماد الفاتورة");
    }
  };

  const getStatusBadge = (status: PurchaseBillStatus) => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ backgroundColor: PURCHASE_BILL_STATUS_BG[status], color: PURCHASE_BILL_STATUS_COLORS[status] }}>
      {status === "paid" && <CheckCircle2 className="w-3 h-3" />}
      {status === "draft" && <Clock className="w-3 h-3" />}
      {status === "cancelled" && <XCircle className="w-3 h-3" />}
      {status === "overdue" && <AlertTriangle className="w-3 h-3" />}
      {PURCHASE_BILL_STATUS_LABELS[status]}
    </span>
  );

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--o2-text)" }}>فواتير المشتريات</h1>
          <p className="text-xs mt-1" style={{ color: "var(--o2-muted)" }}>إدارة فواتير المشتريات من الموردين</p>
        </div>
        <button onClick={onCreate}
          className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white"
          style={{ backgroundColor: "#dc2626" }}>
          <Plus className="w-3.5 h-3.5" /> فاتورة مشتريات جديدة
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--o2-muted)" }} />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث بالرقم أو المورد..."
            className="w-full pr-9 pl-3 py-2 rounded-lg text-xs border"
            style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-lg border flex items-center gap-1.5 text-xs font-bold"
          style={{ borderColor: "var(--o2-border)", color: "var(--o2-muted)" }}>
          <Filter className="w-4 h-4" /> فلتر
        </button>
        <button onClick={fetchBills}
          className="p-2 rounded-lg border"
          style={{ borderColor: "var(--o2-border)", color: "var(--o2-muted)" }}>
          <RefreshCw className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-lg border"
          style={{ borderColor: "var(--o2-border)", color: "var(--o2-muted)" }}>
          <Download className="w-4 h-4" />
        </button>
        <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: "var(--o2-border)" }}>
          <button onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${viewMode === "table" ? "bg-red-600 text-white" : ""}`}
            style={viewMode !== "table" ? { color: "var(--o2-muted)" } : {}}>
            جدول
          </button>
          <button onClick={() => setViewMode("sheet")}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${viewMode === "sheet" ? "bg-red-600 text-white" : ""}`}
            style={viewMode !== "sheet" ? { color: "var(--o2-muted)" } : {}}>
            ورقة
          </button>
        </div>
      </div>

      {viewMode === "sheet" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SHEET_TABS.map((t) => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === t.key ? "bg-red-600 text-white" : "border"}`}
              style={activeTab !== t.key ? { borderColor: "var(--o2-border)", color: "var(--o2-muted)" } : {}}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="rounded-xl border p-4 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>المورد</label>
            <select value={filters.supplier_id || ""} onChange={(e) => setFilters(p => ({ ...p, supplier_id: e.target.value }))}
              className="w-full px-2 py-1.5 rounded text-xs border"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
              <option value="">الكل</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>من تاريخ</label>
            <input type="date" value={filters.from_date || ""} onChange={(e) => setFilters(p => ({ ...p, from_date: e.target.value }))}
              className="w-full px-2 py-1.5 rounded text-xs border"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>إلى تاريخ</label>
            <input type="date" value={filters.to_date || ""} onChange={(e) => setFilters(p => ({ ...p, to_date: e.target.value }))}
              className="w-full px-2 py-1.5 rounded text-xs border"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters({})}
              className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: "var(--o2-brand)" }}>
              مسح الفلاتر
            </button>
          </div>
        </div>
      )}

      {viewMode === "table" ? (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--o2-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "var(--o2-surface)" }}>
                  {["رقم الفاتورة", "التاريخ", "المورد", "الإجمالي", "المدفوع", "المتبقي", "تاريخ الاستحقاق", "الحالة", "إجراءات"].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-bold" style={{ color: "var(--o2-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "var(--o2-muted)" }} /></td></tr>
                ) : bills.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center" style={{ color: "var(--o2-muted)" }}>لا توجد فواتير مشتريات</td></tr>
                ) : bills.map((b) => {
                  const remaining = b.total - b.paid_amount;
                  return (
                    <tr key={b.id} className="border-t" style={{ borderColor: "var(--o2-border)" }}>
                      <td className="px-4 py-3 font-bold font-mono" style={{ color: "var(--o2-text)" }}>{b.bill_number}</td>
                      <td className="px-4 py-3" style={{ color: "var(--o2-muted)" }}>{b.bill_date}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: "var(--o2-text)" }}>{b.supplier?.name || "—"}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: "var(--o2-text)" }}>{formatBillCurrency(b.total, b.currency)}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: "#16a34a" }}>{formatBillCurrency(b.paid_amount, b.currency)}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: remaining > 0 ? "#dc2626" : "#16a34a" }}>{formatBillCurrency(remaining, b.currency)}</td>
                      <td className="px-4 py-3" style={{ color: "var(--o2-muted)" }}>{b.due_date}</td>
                      <td className="px-4 py-3">{getStatusBadge(b.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => onView(b.id)} className="p-1.5 rounded hover:opacity-80" style={{ color: "var(--o2-brand)" }}>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {b.status === "draft" && (
                            <button onClick={() => onEdit(b.id)} className="p-1.5 rounded hover:opacity-80" style={{ color: "#d97706" }}>
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {b.status === "draft" && (
                            <button onClick={() => handleApprove(b.id)} className="p-1.5 rounded hover:opacity-80" style={{ color: "#16a34a" }}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button className="p-1.5 rounded hover:opacity-80" style={{ color: "var(--o2-muted)" }}>
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {b.status === "draft" && (
                            <button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded hover:opacity-80" style={{ color: "#dc2626" }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "var(--o2-muted)" }} /></div>
          ) : bills.length === 0 ? (
            <div className="col-span-full py-12 text-center" style={{ color: "var(--o2-muted)" }}>لا توجد فواتير مشتريات</div>
          ) : bills.map((b) => {
            const remaining = b.total - b.paid_amount;
            return (
              <div key={b.id} className="rounded-xl border p-4 space-y-3 cursor-pointer hover:shadow-lg transition-shadow"
                style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}
                onClick={() => onView(b.id)}>
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-sm" style={{ color: "var(--o2-text)" }}>{b.bill_number}</span>
                  {getStatusBadge(b.status)}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--o2-muted)" }}>المورد</span>
                    <span className="font-bold" style={{ color: "var(--o2-text)" }}>{b.supplier?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--o2-muted)" }}>التاريخ</span>
                    <span style={{ color: "var(--o2-text)" }}>{b.bill_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--o2-muted)" }}>الاستحقاق</span>
                    <span style={{ color: "var(--o2-text)" }}>{b.due_date}</span>
                  </div>
                  <div className="border-t pt-1.5 flex justify-between" style={{ borderColor: "var(--o2-border)" }}>
                    <span style={{ color: "var(--o2-muted)" }}>الإجمالي</span>
                    <span className="font-bold" style={{ color: "var(--o2-text)" }}>{formatBillCurrency(b.total, b.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--o2-muted)" }}>المدفوع</span>
                    <span className="font-bold" style={{ color: "#16a34a" }}>{formatBillCurrency(b.paid_amount, b.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--o2-muted)" }}>المتبقي</span>
                    <span className="font-bold" style={{ color: remaining > 0 ? "#dc2626" : "#16a34a" }}>{formatBillCurrency(remaining, b.currency)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: "var(--o2-border)" }}
                  onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onView(b.id)} className="p-1.5 rounded hover:opacity-80" style={{ color: "var(--o2-brand)" }}>
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {b.status === "draft" && (
                    <button onClick={() => onEdit(b.id)} className="p-1.5 rounded hover:opacity-80" style={{ color: "#d97706" }}>
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {b.status === "draft" && (
                    <button onClick={() => handleApprove(b.id)} className="p-1.5 rounded hover:opacity-80" style={{ color: "#16a34a" }}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button className="p-1.5 rounded hover:opacity-80" style={{ color: "var(--o2-muted)" }}>
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {deleteId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-xl p-6 max-w-sm w-full mx-4" style={{ backgroundColor: "var(--o2-surface)" }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: "var(--o2-text)" }}>تأكيد الحذف</h3>
            <p className="text-xs mb-4" style={{ color: "var(--o2-muted)" }}>هل أنت متأكد من حذف فاتورة المشتريات هذه؟</p>
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
