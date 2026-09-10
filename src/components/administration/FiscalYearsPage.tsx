import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Calendar, Plus, Lock, Unlock, CheckCircle2, AlertTriangle,
  X, Loader2, DollarSign, Clock, Eye,
} from "lucide-react";
import { fiscalYearService } from "../../services/fiscalYearService";
import { toast } from "../shared/Toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FiscalYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "active" | "closed";
  created_by: number | null;
  shifts_count: number;
  shifts_total_sales_sum: number | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
  };
}

// ── Helper ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: {
    label: "نشطة",
    color: "var(--o2-success-text)",
    bg: "var(--o2-success-soft)",
    icon: Unlock,
  },
  closed: {
    label: "مغلقة",
    color: "var(--o2-danger-text)",
    bg: "var(--o2-danger-soft)",
    icon: Lock,
  },
};

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return "0";
  return amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
};

const extractError = (err: any): string => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "حدث خطأ غير متوقع"
  );
};

// ── Component ──────────────────────────────────────────────────────────────────

export const FiscalYearsPage = () => {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState<FiscalYear | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──
  const fetchFiscalYears = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fiscalYearService.getAll();
      setFiscalYears(data);
    } catch (err: any) {
      const msg = extractError(err);
      setError(msg);
      toast.error("فشل جلب السنوات المالية", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  // ── Close Fiscal Year ──
  const handleClose = async (fy: FiscalYear) => {
    try {
      setClosingId(fy.id);
      await fiscalYearService.close(fy.id);
      toast.success("تم إغلاق السنة المالية", `تم إغلاق "${fy.name}" بنجاح`);
      await fetchFiscalYears();
      setShowCloseConfirm(null);
    } catch (err: any) {
      const msg = extractError(err);
      setError(msg);
      toast.error("فشل إغلاق السنة المالية", msg);
    } finally {
      setClosingId(null);
    }
  };

  // ── Create Fiscal Year ──
  const handleCreate = async (data: { name: string; start_date: string; end_date: string }) => {
    try {
      await fiscalYearService.create(data);
      toast.success("تم إنشاء السنة المالية", `تم إنشاء "${data.name}" بنجاح`);
      await fetchFiscalYears();
      setShowCreateModal(false);
    } catch (err: any) {
      const msg = extractError(err);
      toast.error("فشل إنشاء السنة المالية", msg);
      throw err;
    }
  };

  // ── Stats ──
  const activeFY = fiscalYears.find((fy) => fy.status === "active");
  const totalShifts = fiscalYears.reduce((sum, fy) => sum + (fy.shifts_count || 0), 0);
  const totalSales = fiscalYears.reduce((sum, fy) => sum + (fy.shifts_total_sales_sum || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--o2-primary-soft)]">
            <Calendar className="w-6 h-6 text-[var(--o2-primary-text)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--o2-text-primary)]">السنوات المالية</h1>
            <p className="text-sm text-[var(--o2-text-secondary)]">
              إدارة فترات المحاسبة وإغلاقها
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--o2-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>سنة مالية جديدة</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-[var(--o2-danger-soft)] border border-[var(--o2-danger)]/20 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--o2-danger-text)]" />
          <span className="text-[var(--o2-danger-text)]">{error}</span>
          <button onClick={() => setError(null)} className="mr-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-[var(--o2-card)] rounded-xl border border-[var(--o2-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--o2-success-soft)]">
              <Unlock className="w-5 h-5 text-[var(--o2-success-text)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--o2-text-secondary)]">السنة النشطة</p>
              <p className="text-lg font-bold text-[var(--o2-text-primary)]">
                {activeFY?.name || "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-[var(--o2-card)] rounded-xl border border-[var(--o2-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--o2-primary-soft)]">
              <Clock className="w-5 h-5 text-[var(--o2-primary-text)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--o2-text-secondary)]">إجمالي الورديات</p>
              <p className="text-lg font-bold text-[var(--o2-text-primary)]">{totalShifts}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-[var(--o2-card)] rounded-xl border border-[var(--o2-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--o2-warning-soft)]">
              <DollarSign className="w-5 h-5 text-[var(--o2-warning-text)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--o2-text-secondary)]">إجمالي المبيعات</p>
              <p className="text-lg font-bold text-[var(--o2-text-primary)]">
                {formatCurrency(totalSales)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--o2-card)] rounded-xl border border-[var(--o2-border)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--o2-primary)]" />
          </div>
        ) : fiscalYears.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-[var(--o2-text-secondary)]">
            <Calendar className="w-12 h-12 mb-3 opacity-50" />
            <p>لا توجد سنوات مالية بعد</p>
            <p className="text-sm">أنشئ سنة مالية جديدة للبدء</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--o2-border)] bg-[var(--o2-bg-secondary)]">
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--o2-text-secondary)]">
                    الاسم
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--o2-text-secondary)]">
                    تاريخ البداية
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[var(--o2-text-secondary)]">
                    تاريخ النهاية
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--o2-text-secondary)]">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--o2-text-secondary)]">
                    الورديات
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--o2-text-secondary)]">
                    المبيعات
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--o2-text-secondary)]">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {fiscalYears.map((fy) => {
                  const statusCfg = STATUS_CONFIG[fy.status];
                  const StatusIcon = statusCfg.icon;

                  return (
                    <tr
                      key={fy.id}
                      className="border-b border-[var(--o2-border)] last:border-b-0 hover:bg-[var(--o2-bg-secondary)]/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--o2-text-primary)]">{fy.name}</div>
                        {fy.creator && (
                          <div className="text-xs text-[var(--o2-text-secondary)]">
                            أنشأه: {fy.creator.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--o2-text-primary)]">
                        {formatDate(fy.start_date)}
                      </td>
                      <td className="px-4 py-3 text-[var(--o2-text-primary)]">
                        {formatDate(fy.end_date)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--o2-text-primary)]">
                        {fy.shifts_count}
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--o2-text-primary)]">
                        {formatCurrency(fy.shifts_total_sales_sum)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <NavLink
                            to={`/admin/fiscal-years/${fy.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--o2-primary-text)] bg-[var(--o2-primary-soft)] rounded-lg hover:opacity-80 transition-opacity"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            استعراض
                          </NavLink>
                          {fy.status === "active" && (
                            <button
                              onClick={() => setShowCloseConfirm(fy)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--o2-danger-text)] bg-[var(--o2-danger-soft)] rounded-lg hover:opacity-80 transition-opacity"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              إغلاق
                            </button>
                          )}
                          {fy.status === "closed" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--o2-text-secondary)] bg-[var(--o2-bg-secondary)] rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              مغلقة
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateFiscalYearModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <CloseConfirmModal
          fiscalYear={showCloseConfirm}
          isClosing={closingId === showCloseConfirm.id}
          onClose={() => setShowCloseConfirm(null)}
          onConfirm={() => handleClose(showCloseConfirm)}
        />
      )}
    </div>
  );
};

// ── Create Modal ───────────────────────────────────────────────────────────────

const CreateFiscalYearModal = ({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; start_date: string; end_date: string }) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      await onCreate({
        name,
        start_date: startDate,
        end_date: endDate,
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "فشل إنشاء السنة المالية"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--o2-card)] rounded-xl border border-[var(--o2-border)] shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--o2-border)]">
          <h2 className="text-lg font-bold text-[var(--o2-text-primary)]">سنة مالية جديدة</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--o2-bg-secondary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--o2-danger-soft)] text-[var(--o2-danger-text)] rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--o2-text-secondary)] mb-1">
              اسم السنة المالية
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: 2026"
              className="w-full px-3 py-2 bg-[var(--o2-bg)] border border-[var(--o2-border)] rounded-lg text-[var(--o2-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--o2-primary)]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--o2-text-secondary)] mb-1">
                تاريخ البداية
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--o2-bg)] border border-[var(--o2-border)] rounded-lg text-[var(--o2-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--o2-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--o2-text-secondary)] mb-1">
                تاريخ النهاية
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--o2-bg)] border border-[var(--o2-border)] rounded-lg text-[var(--o2-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--o2-primary)]"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-[var(--o2-text-secondary)] bg-[var(--o2-bg-secondary)] rounded-lg hover:opacity-80 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !name || !startDate || !endDate}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--o2-primary)] rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              إنشاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Close Confirmation Modal ───────────────────────────────────────────────────

const CloseConfirmModal = ({
  fiscalYear,
  isClosing,
  onClose,
  onConfirm,
}: {
  fiscalYear: FiscalYear;
  isClosing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--o2-card)] rounded-xl border border-[var(--o2-border)] shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[var(--o2-danger-soft)] flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-[var(--o2-danger-text)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--o2-text-primary)] mb-2">
            إغلاق السنة المالية
          </h3>
          <p className="text-sm text-[var(--o2-text-secondary)] mb-1">
            هل أنت متأكد من إغلاق سنة المالية <strong>{fiscalYear.name}</strong>؟
          </p>
          <p className="text-xs text-[var(--o2-danger-text)]">
            لن تتمكن من إنشاء أو تعديل طلبات خلال هذه الفترة بعد الإغلاق.
          </p>
        </div>

        <div className="flex justify-center gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={isClosing}
            className="px-4 py-2 text-sm font-medium text-[var(--o2-text-secondary)] bg-[var(--o2-bg-secondary)] rounded-lg hover:opacity-80 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={isClosing}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--o2-danger)] rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {isClosing && <Loader2 className="w-4 h-4 animate-spin" />}
            نعم، إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiscalYearsPage;
