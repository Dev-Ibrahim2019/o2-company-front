/**
 * HospitalityDevicesPage.tsx — صفحة إدارة أجهزة الضيافة (Hospitality Devices)
 * ──────────────────────────────────────────────────────
 * الميزات:
 * - عرض جدول بجميع أجهزة الضيافة مع حالة الربط
 * - إضافة جهاز ضيافة جديد (فرع + اسم)
 * - توليد كود تفعيل للأجهزة المعلقة (PENDING_ACTIVATION)
 * - إلغاء ربط الجهاز (Revoke) للأجهزة المفعلة (ACTIVE)
 * - عرض الكود المولد في مودال مع صلاحية 15 دقيقة
 */

import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  HeartHandshake,
  X,
  KeyRound,
  Unlink,
  Building2,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "../components/shared/Toast";
import { ConfirmModal } from "../components/shared/ConfirmModal";

/* ══════════════════════════════════════════════════════════════
 *  Types
 * ══════════════════════════════════════════════════════════════ */

interface BranchSummary {
  id: number;
  name: string;
  static_ip: string | null;
}

interface HospitalityDevice {
  id: number;
  branch_id: number;
  name: string;
  device_uuid: string | null;
  activation_token: string | null;
  token_expires_at: string | null;
  status: "ACTIVE" | "PENDING_ACTIVATION" | "INACTIVE" | "REVOKED";
  created_at: string;
  updated_at: string;
  branch: BranchSummary | null;
}

interface GeneratedToken {
  token: string;
  deviceName: string;
}

/* ══════════════════════════════════════════════════════════════
 *  Helper — الحصول على تنسيق الحالة
 * ══════════════════════════════════════════════════════════════ */

const STATUS_MAP: Record<
  HospitalityDevice["status"],
  { label: string; style: string; icon: React.ElementType }
> = {
  ACTIVE: {
    label: "مفعل",
    style:
      "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 shadow-emerald-900/20",
    icon: HeartHandshake,
  },
  PENDING_ACTIVATION: {
    label: "بانتظار التفعيل",
    style:
      "bg-amber-600/20 text-amber-300 border border-amber-600/30 shadow-amber-900/20",
    icon: KeyRound,
  },
  INACTIVE: {
    label: "معطل",
    style:
      "bg-red-600/20 text-red-300 border border-red-600/30 shadow-red-900/20",
    icon: X,
  },
  REVOKED: {
    label: "ملغي",
    style:
      "bg-purple-600/20 text-purple-300 border border-purple-600/30 shadow-purple-900/20",
    icon: X,
  },
};

/* ══════════════════════════════════════════════════════════════
 *  StatusBadge Component
 * ══════════════════════════════════════════════════════════════ */

const StatusBadge: React.FC<{ status: HospitalityDevice["status"] }> = ({
  status,
}) => {
  const cfg = STATUS_MAP[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${cfg.style}`}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════
 *  Main Component
 * ══════════════════════════════════════════════════════════════ */

const HospitalityDevicesPage: React.FC = () => {
  /* ── State ── */
  const [devices, setDevices] = useState<HospitalityDevice[]>([]);
  const [filtered, setFiltered] = useState<HospitalityDevice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /* Add Modal */
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState("");
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [form, setForm] = useState({ branch_id: "", name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  /* Token Modal */
  const [tokenData, setTokenData] = useState<GeneratedToken | null>(null);

  /* Confirm Modals (revoke / delete) */
  const [confirmAction, setConfirmAction] = useState<
    { type: "revoke" | "delete"; device: HospitalityDevice } | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  /* ── جلب أجهزة الضيافة ── */
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/admin/hospitality-devices");
      const items = res.data ?? res;
      setDevices(Array.isArray(items) ? items : []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل تحميل أجهزة الضيافة");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── جلب الفروع للمودال ── */
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const { data: res } = await api.get("/branches");
      const items = res.data ?? res;
      setBranches(Array.isArray(items) ? items : []);
    } catch {
      // silence
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  /* ── فلترة البحث ── */
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(devices);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      devices.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.branch?.name || "").toLowerCase().includes(q)
      )
    );
  }, [search, devices]);

  /* ── فتح مودال الإضافة ── */
  const openAddModal = () => {
    setAddError("");
    setForm({ branch_id: "", name: "" });
    fetchBranches();
    setShowAddModal(true);
  };

  /* ── إرسال نموذج الإضافة ── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAddError("");
    try {
      await api.post("/admin/hospitality-devices", {
        branch_id: Number(form.branch_id),
        name: form.name.trim(),
      });
      toast.success("تم إنشاء جهاز الضيافة بنجاح");
      setShowAddModal(false);
      fetchDevices();
    } catch (err: any) {
      const errs = err.response?.data?.errors;
      if (errs) {
        const k = Object.keys(errs)[0];
        setAddError(errs[k]?.[0] || "خطأ في التحقق");
      } else {
        setAddError(err.response?.data?.message || "حدث خطأ أثناء الإضافة");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── توليد كود التفعيل ── */
  const handleGenerateToken = async (item: HospitalityDevice) => {
    setTokenData(null);
    try {
      const { data: res } = await api.post(
        `/admin/hospitality-devices/${item.id}/generate-token`
      );
      setTokenData({
        token: res.token,
        deviceName: item.name,
      });
      toast.success(res.message || "تم توليد الكود بنجاح");
      fetchDevices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل توليد الكود");
    }
  };

  /* ── تنفيذ الإجراء المؤكد (إلغاء ربط / حذف) ── */
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, device } = confirmAction;
    setConfirmLoading(true);
    try {
      if (type === "revoke") {
        const { data: res } = await api.post(
          `/admin/hospitality-devices/${device.id}/revoke`
        );
        toast.success(res.message || "تم إلغاء ربط الجهاز بنجاح");
      } else {
        const { data: res } = await api.delete(
          `/admin/hospitality-devices/${device.id}`
        );
        toast.success(res.message || "تم حذف جهاز الضيافة بنجاح");
      }
      setConfirmAction(null);
      fetchDevices();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          (type === "revoke" ? "فشل إلغاء ربط الجهاز" : "فشل حذف الجهاز")
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /* ============================================================
   *  Render
   * ============================================================ */

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">إدارة أجهزة الضيافة</h1>
          <p className="text-sm text-slate-500 mt-1 font-semibold">
            إدارة أجهزة قسم الضيافة (Hospitality Devices) والفروع
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20"
        >
          <Plus size={18} /> إضافة جهاز ضيافة
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          type="text"
          placeholder="بحث باسم الجهاز أو اسم الفرع..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-rose-600 placeholder:text-slate-600"
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 size={36} className="text-rose-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-16">
            <HeartHandshake size={48} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-500 font-bold">
              {search ? "لا توجد نتائج للبحث" : "لا توجد أجهزة ضيافة بعد"}
            </p>
            {!search && (
              <button
                onClick={openAddModal}
                className="mt-4 text-sm text-rose-400 hover:text-rose-300 font-bold"
              >
                + أضف أول جهاز ضيافة
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/50">
                  <th className="px-4 py-3.5 text-right text-slate-400 font-bold text-xs uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3.5 text-right text-slate-400 font-bold text-xs uppercase tracking-wider">
                    اسم الجهاز
                  </th>
                  <th className="px-4 py-3.5 text-right text-slate-400 font-bold text-xs uppercase tracking-wider">
                    الفرع
                  </th>
                  <th className="px-4 py-3.5 text-right text-slate-400 font-bold text-xs uppercase tracking-wider">
                    حالة الربط
                  </th>
                  <th className="px-4 py-3.5 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const statusCfg = STATUS_MAP[item.status];
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-white/5 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-slate-500 font-bold">
                        {idx + 1}
                      </td>

                      {/* الاسم */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-rose-600/20 rounded-lg flex items-center justify-center">
                            <HeartHandshake size={14} className="text-rose-400" />
                          </div>
                          <span className="text-slate-200 font-semibold whitespace-nowrap">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* الفرع مع IP */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-slate-200 font-semibold text-sm">
                            {item.branch?.name || (
                              <span className="text-slate-600">—</span>
                            )}
                          </span>
                          {item.branch?.static_ip && (
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                              IP: {item.branch.static_ip}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* حالة الربط */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* الإجراءات */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          {item.status === "PENDING_ACTIVATION" && (
                            <button
                              onClick={() => handleGenerateToken(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 text-amber-300 rounded-lg text-xs font-bold hover:bg-amber-600/30 transition-colors border border-amber-600/20"
                              title="توليد كود تفعيل"
                            >
                              <KeyRound size={13} />
                              توليد كود
                            </button>
                          )}

                          {item.status === "ACTIVE" && (
                            <button
                              onClick={() =>
                                setConfirmAction({ type: "revoke", device: item })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-300 rounded-lg text-xs font-bold hover:bg-red-600/30 transition-colors border border-red-600/20"
                              title="إلغاء ربط الجهاز"
                            >
                              <Unlink size={13} />
                              فصل الجهاز
                            </button>
                          )}

                          {(item.status === "INACTIVE" || item.status === "REVOKED") && (
                            <button
                              onClick={() =>
                                setConfirmAction({ type: "delete", device: item })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold hover:bg-red-600/20 hover:text-red-300 transition-colors border border-white/5"
                              title="حذف الجهاز نهائياً"
                            >
                              <Trash2 size={13} />
                              حذف
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
        )}
      </div>

      {/* ── Footer count ── */}
      {!loading && (
        <div className="text-slate-500 text-xs font-bold">
          إجمالي: {filtered.length} من {devices.length}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL: إضافة جهاز ضيافة جديد
          ════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Plus size={20} className="text-green-400" />
                إضافة جهاز ضيافة جديد
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error inside modal */}
            {addError && (
              <div className="flex items-center gap-2 p-3 bg-red-600/20 text-red-400 rounded-xl text-sm font-bold">
                <AlertCircle size={16} />
                {addError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAdd} className="space-y-4">
              {/* الفرع */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={13} />
                  الفرع
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.branch_id}
                  onChange={(e) =>
                    setForm({ ...form, branch_id: e.target.value })
                  }
                  required
                  disabled={loadingBranches}
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-rose-600 disabled:opacity-50 appearance-none"
                >
                  <option value="">
                    {loadingBranches ? "جاري التحميل..." : "اختر الفرع..."}
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.static_ip ? ` (${b.static_ip})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* الاسم */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={13} />
                  اسم جهاز الضيافة
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: جهاز الضيافة الرئيسي"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-rose-600 placeholder:text-slate-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-900/20"
                >
                  {submitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {submitting ? "جاري الإضافة..." : "إضافة"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm hover:text-white transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL: عرض كود التفعيل (Token)
          ════════════════════════════════════════════════════════ */}
      {tokenData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto bg-amber-600/20 rounded-full flex items-center justify-center border border-amber-600/30">
              <KeyRound size={32} className="text-amber-400" />
            </div>

            {/* Title */}
            <div>
              <h2 className="text-lg font-black text-white">
                كود التفعيل
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                لجهاز الضيافة:{" "}
                <span className="text-slate-200 font-bold">
                  {tokenData.deviceName}
                </span>
              </p>
            </div>

            {/* Token */}
            <div className="bg-slate-800 rounded-2xl border border-amber-600/30 p-4">
              <p className="text-4xl font-black tracking-[0.3em] text-amber-300 font-mono select-all">
                {tokenData.token}
              </p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-red-600/10 rounded-xl border border-red-600/20 text-right">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <p className="text-xs text-red-300 font-semibold leading-relaxed">
                هذا الكود صالح لمدة <span className="font-black">15 دقيقة</span>{" "}
                فقط. يرجى إدخاله في جهاز الضيافة خلال المدة المحددة. بعد
                انتهاء الصلاحية، يجب توليد كود جديد.
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setTokenData(null)}
              className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors shadow-lg shadow-amber-900/20"
            >
              تم — إغلاق
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmAction}
        title={
          confirmAction?.type === "revoke"
            ? "إلغاء ربط الجهاز"
            : "حذف جهاز الضيافة"
        }
        message={
          confirmAction?.type === "revoke"
            ? `هل أنت متأكد من إلغاء تفعيل جهاز الضيافة "${confirmAction.device.name}"؟\nسيتم مسح UUID الجهاز الحالي بالكامل، ولن يعود الجهاز صالحاً للاستخدام. ستحتاج إلى تفعيله من البداية.`
            : `هل أنت متأكد من حذف جهاز الضيافة "${confirmAction?.device.name}" نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`
        }
        confirmLabel={confirmAction?.type === "revoke" ? "إلغاء الربط" : "حذف نهائياً"}
        variant="danger"
        loading={confirmLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};

export default HospitalityDevicesPage;
