/**
 * PosRegistersPage.tsx — صفحة إدارة نقاط البيع (POS Registers)
 * ──────────────────────────────────────────────────────
 * الميزات:
 * - عرض جدول بجميع نقاط البيع مع حالة الربط
 * - إضافة نقطة بيع جديدة (فرع + كود + اسم)
 * - توليد كود تفعيل للأجهزة المعلقة (PENDING_ACTIVATION)
 * - إلغاء ربط الجهاز (Revoke) للنقاط المفعلة (ACTIVE)
 * - عرض الكود المولد في مودال مع صلاحية 15 دقيقة
 */

import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Monitor,
  X,
  KeyRound,
  Unlink,
  Building2,
  Hash,
  Tag,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
 *  Types
 * ══════════════════════════════════════════════════════════════ */

interface BranchSummary {
  id: number;
  name: string;
  static_ip: string | null;
}

interface PosRegister {
  id: number;
  branch_id: number;
  code: string;
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
  registerName: string;
  registerCode: string;
}

/* ══════════════════════════════════════════════════════════════
 *  Helper — الحصول على تنسيق الحالة
 * ══════════════════════════════════════════════════════════════ */

const STATUS_MAP: Record<
  PosRegister["status"],
  { label: string; style: string; icon: React.ElementType }
> = {
  ACTIVE: {
    label: "مفعل",
    style:
      "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 shadow-emerald-900/20",
    icon: Monitor,
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

const StatusBadge: React.FC<{ status: PosRegister["status"] }> = ({
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

const PosRegistersPage: React.FC = () => {
  /* ── State ── */
  const [registers, setRegisters] = useState<PosRegister[]>([]);
  const [filtered, setFiltered] = useState<PosRegister[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Add Modal */
  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [form, setForm] = useState({ branch_id: "", code: "", name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  /* Token Modal */
  const [tokenData, setTokenData] = useState<GeneratedToken | null>(null);

  /* ── جلب نقاط البيع ── */
  const fetchRegisters = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await api.get("/admin/pos-registers");
      const items = res.data ?? res;
      setRegisters(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "فشل تحميل نقاط البيع"
      );
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
    fetchRegisters();
  }, [fetchRegisters]);

  /* ── فلترة البحث ── */
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(registers);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      registers.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.branch?.name || "").toLowerCase().includes(q)
      )
    );
  }, [search, registers]);

  /* ── فتح مودال الإضافة ── */
  const openAddModal = () => {
    setError("");
    setForm({ branch_id: "", code: "", name: "" });
    fetchBranches();
    setShowAddModal(true);
  };

  /* ── إرسال نموذج الإضافة ── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/admin/pos-registers", {
        branch_id: Number(form.branch_id),
        name: form.name.trim(),
      });
      setSuccess("تم إنشاء نقطة البيع بنجاح");
      setShowAddModal(false);
      fetchRegisters();
    } catch (err: any) {
      const errs = err.response?.data?.errors;
      if (errs) {
        const k = Object.keys(errs)[0];
        setError(errs[k]?.[0] || "خطأ في التحقق");
      } else {
        setError(err.response?.data?.message || "حدث خطأ أثناء الإضافة");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ── توليد كود التفعيل ── */
  const handleGenerateToken = async (item: PosRegister) => {
    setError("");
    setTokenData(null);
    try {
      const { data: res } = await api.post(
        `/admin/pos-registers/${item.id}/generate-token`
      );
      setTokenData({
        token: res.token,
        registerName: item.name,
        registerCode: item.code,
      });
      setSuccess(res.message || "تم توليد الكود بنجاح");
      fetchRegisters();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "فشل توليد الكود"
      );
    }
  };

  /* ── إلغاء ربط الجهاز (Revoke) ── */
  const handleRevoke = async (item: PosRegister) => {
    if (
      !confirm(
        `⚠️ هل أنت متأكد من إلغاء تفعيل الجهاز لنقطة البيع "${item.name}" (${item.code})؟\n\nسيتم مسح UUID الجهاز الحالي بالكامل، ولن يعود الجهاز صالحاً للاستخدام. ستحتاج إلى إنشاء نقطة بيع جديدة أو تفعيلها من البداية.`
      )
    )
      return;
    setError("");
    try {
      const { data: res } = await api.post(
        `/admin/pos-registers/${item.id}/revoke`
      );
      setSuccess(res.message || "تم إلغاء ربط الجهاز بنجاح");
      fetchRegisters();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "فشل إلغاء ربط الجهاز"
      );
    }
  };

  /* ── إخفاء رسائل النجاح/الخطأ ── */
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  /* ============================================================
   *  Render
   * ============================================================ */

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">إدارة نقاط البيع</h1>
          <p className="text-sm text-slate-500 mt-1 font-semibold">
            إدارة أجهزة نقاط البيع (POS Registers) والفروع
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20"
        >
          <Plus size={18} /> إضافة نقطة بيع
        </button>
      </div>

      {/* ── Alert Banners ── */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-600/20 text-emerald-400 rounded-xl text-sm font-bold border border-emerald-600/20">
          <CheckCircle size={18} className="shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-600/20 text-red-400 rounded-xl text-sm font-bold border border-red-600/20">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          type="text"
          placeholder="بحث برمز أو اسم نقطة البيع أو اسم الفرع..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 placeholder:text-slate-600"
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 size={36} className="text-red-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-16">
            <Monitor size={48} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-500 font-bold">
              {search ? "لا توجد نتائج للبحث" : "لا توجد نقاط بيع بعد"}
            </p>
            {!search && (
              <button
                onClick={openAddModal}
                className="mt-4 text-sm text-red-400 hover:text-red-300 font-bold"
              >
                + أضف أول نقطة بيع
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
                    كود POS
                  </th>
                  <th className="px-4 py-3.5 text-right text-slate-400 font-bold text-xs uppercase tracking-wider">
                    اسم نقطة البيع
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
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-white/5 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-slate-500 font-bold">
                        {idx + 1}
                      </td>

                      {/* كود POS */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg text-slate-200 font-mono font-bold text-xs">
                          <Hash size={12} className="text-slate-500" />
                          {item.code}
                        </span>
                      </td>

                      {/* الاسم */}
                      <td className="px-4 py-3.5 text-slate-200 font-semibold whitespace-nowrap">
                        {item.name}
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
                              onClick={() => handleRevoke(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-300 rounded-lg text-xs font-bold hover:bg-red-600/30 transition-colors border border-red-600/20"
                              title="إلغاء ربط الجهاز"
                            >
                              <Unlink size={13} />
                              فصل الجهاز
                            </button>
                          )}

                          {(item.status === "INACTIVE" || item.status === "REVOKED") && (
                            <span className="text-xs text-slate-600 font-bold">
                              —
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

      {/* ── Footer count ── */}
      {!loading && (
        <div className="text-slate-500 text-xs font-bold">
          إجمالي: {filtered.length} من {registers.length}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL: إضافة نقطة بيع جديدة
          ════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Plus size={20} className="text-green-400" />
                إضافة نقطة بيع جديدة
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error inside modal */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-600/20 text-red-400 rounded-xl text-sm font-bold">
                <AlertCircle size={16} />
                {error}
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
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50 appearance-none"
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
                  اسم نقطة البيع
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: كاشير رئيسي"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 placeholder:text-slate-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-900/20"
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
                لنقطة البيع:{" "}
                <span className="text-slate-200 font-bold">
                  {tokenData.registerName}
                </span>{" "}
                <span className="text-slate-500 font-mono">
                  ({tokenData.registerCode})
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
                فقط. يرجى إدخاله في جهاز نقطة البيع خلال المدة المحددة. بعد
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
    </div>
  );
};

export default PosRegistersPage;