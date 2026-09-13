import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Headphones,
  X,
  KeyRound,
  Unlink,
  Building2,
  Hash,
  Tag,
} from "lucide-react";

interface BranchSummary {
  id: number;
  name: string;
  static_ip: string | null;
}

interface CallCenterRegister {
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

const STATUS_MAP: Record<
  CallCenterRegister["status"],
  { label: string; style: string; icon: React.ElementType }
> = {
  ACTIVE: {
    label: "مفعل",
    style:
      "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 shadow-emerald-900/20",
    icon: Headphones,
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

const StatusBadge: React.FC<{ status: CallCenterRegister["status"] }> = ({
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

const CallCenterDevicesPage: React.FC = () => {
  const [registers, setRegisters] = useState<CallCenterRegister[]>([]);
  const [filtered, setFiltered] = useState<CallCenterRegister[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [form, setForm] = useState({ branch_id: "", name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [tokenData, setTokenData] = useState<GeneratedToken | null>(null);

  const fetchRegisters = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await api.get("/admin/call-center-registers");
      const items = res.data ?? res;
      setRegisters(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "فشل تحميل أجهزة الكول سنتر"
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  const openAddModal = () => {
    setError("");
    setForm({ branch_id: "", name: "" });
    fetchBranches();
    setShowAddModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/admin/call-center-registers", {
        branch_id: Number(form.branch_id),
        name: form.name.trim(),
      });
      setSuccess("تم إنشاء جهاز الكول سنتر بنجاح");
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

  const handleGenerateToken = async (item: CallCenterRegister) => {
    setError("");
    setTokenData(null);
    try {
      const { data: res } = await api.post(
        `/admin/call-center-registers/${item.id}/generate-token`
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

  const handleRevoke = async (item: CallCenterRegister) => {
    if (
      !confirm(
        `هل أنت متأكد من إلغاء تفعيل الجهاز "${item.name}" (${item.code})؟\n\nسيتم مسح UUID الجهاز بالكامل ولن يعود صالحاً للاستخدام.`
      )
    )
      return;
    setError("");
    try {
      const { data: res } = await api.post(
        `/admin/call-center-registers/${item.id}/revoke`
      );
      setSuccess(res.message || "تم إلغاء ربط الجهاز بنجاح");
      fetchRegisters();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "فشل إلغاء ربط الجهاز"
      );
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">إدارة أجهزة الكول سنتر</h1>
          <p className="text-sm text-slate-500 mt-1 font-semibold">
            إدارة أجهزة الكول سنتر وتفعيلها
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl font-bold text-sm hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-900/20"
        >
          <Plus size={18} /> إضافة جهاز
        </button>
      </div>

      {/* Alerts */}
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

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          type="text"
          placeholder="بحث برمز أو اسم الجهاز أو اسم الفرع..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-cyan-600 placeholder:text-slate-600"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 size={36} className="text-cyan-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-16">
            <Headphones size={48} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-500 font-bold">
              {search ? "لا توجد نتائج للبحث" : "لا توجد أجهزة كول سنتر بعد"}
            </p>
            {!search && (
              <button
                onClick={openAddModal}
                className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 font-bold"
              >
                + أضف أول جهاز
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
                    كود الجهاز
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
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-slate-500 font-bold">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg text-slate-200 font-mono font-bold text-xs">
                        <Hash size={12} className="text-slate-500" />
                        {item.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-200 font-semibold whitespace-nowrap">
                      {item.name}
                    </td>
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
                    <td className="px-4 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && (
        <div className="text-slate-500 text-xs font-bold">
          إجمالي: {filtered.length} من {registers.length}
        </div>
      )}

      {/* MODAL: Add device */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Plus size={20} className="text-cyan-400" />
                إضافة جهاز كول سنتر جديد
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-600/20 text-red-400 rounded-xl text-sm font-bold">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
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
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-cyan-600 disabled:opacity-50 appearance-none"
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

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={13} />
                  اسم الجهاز
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: جهاز كول سنتر 1"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-cyan-600 placeholder:text-slate-600"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-bold text-sm hover:bg-cyan-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-900/20"
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

      {/* MODAL: Token display */}
      {tokenData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-amber-600/20 rounded-full flex items-center justify-center border border-amber-600/30">
              <KeyRound size={32} className="text-amber-400" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white">
                كود تفعيل جهاز الكول سنتر
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                الجهاز:{" "}
                <span className="text-slate-200 font-bold">
                  {tokenData.registerName}
                </span>{" "}
                <span className="text-slate-500 font-mono">
                  ({tokenData.registerCode})
                </span>
              </p>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-amber-600/30 p-4">
              <p className="text-4xl font-black tracking-[0.3em] text-amber-300 font-mono select-all">
                {tokenData.token}
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-emerald-600/10 rounded-xl border border-emerald-600/20 text-right">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <p className="text-xs text-emerald-300 font-semibold leading-relaxed">
                هذا الكود صالح لمدة <span className="font-black">30 يوم</span>{" "}
                من تاريخ التوليد. إذا لم يتم استخدامه، يجب توليد كود جديد.
              </p>
            </div>

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

export default CallCenterDevicesPage;
