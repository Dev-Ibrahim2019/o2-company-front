/**
 * DiningZonesPage.tsx — إدارة القاعات والطاولات
 */

import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  DoorOpen,
  X,
  Trash2,
  QrCode,
  Users,
  Building2,
  Hash,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
 *  Types
 * ══════════════════════════════════════════════════════════════ */

interface BranchSummary {
  id: number;
  name: string;
}

interface DiningTable {
  id: number;
  table_number: string;
  qr_code: string;
  qr_url: string;
  capacity: number;
  status: string;
}

interface DiningZone {
  id: number;
  branch_id: number;
  name: string;
  code: string;
  status: string;
  tables: DiningTable[];
  branch?: BranchSummary;
}

/* ══════════════════════════════════════════════════════════════
 *  Main Component
 * ══════════════════════════════════════════════════════════════ */

const DiningZonesPage: React.FC = () => {
  const [zones, setZones] = useState<DiningZone[]>([]);
  const [filtered, setFiltered] = useState<DiningZone[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Add Modal */
  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [form, setForm] = useState({
    branch_id: "",
    name: "",
    code: "",
    tables_count: "10",
    tables_capacity: "4",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  /* QR Modal */
  const [showQrModal, setShowQrModal] = useState<DiningTable | null>(null);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await api.get("/admin/dining-zones");
      const items = res.data ?? res;
      setZones(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل تحميل القاعات");
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
    fetchZones();
  }, [fetchZones]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(zones);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      zones.filter(
        (z) =>
          z.name.toLowerCase().includes(q) ||
          z.code.toLowerCase().includes(q) ||
          (z.branch?.name || "").toLowerCase().includes(q)
      )
    );
  }, [search, zones]);

  const openAddModal = () => {
    setError("");
    setForm({ branch_id: "", name: "", code: "", tables_count: "10", tables_capacity: "4" });
    fetchBranches();
    setShowAddModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { data: res } = await api.post("/admin/dining-zones", {
        branch_id: Number(form.branch_id),
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        tables_count: Number(form.tables_count),
        tables_capacity: Number(form.tables_capacity),
      });
      setSuccess(res.message || "تم إنشاء القاعة بنجاح");
      setShowAddModal(false);
      fetchZones();
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

  const handleDelete = async (zone: DiningZone) => {
    if (!confirm(`هل أنت متأكد من حذف القاعة "${zone.name}" و ${zone.tables.length} طاولة؟`)) return;
    setError("");
    try {
      await api.delete(`/admin/dining-zones/${zone.id}`);
      setSuccess("تم حذف القاعة بنجاح");
      fetchZones();
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل الحذف");
    }
  };

  const handleToggleStatus = async (zone: DiningZone) => {
    const newStatus = zone.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.put(`/admin/dining-zones/${zone.id}`, { status: newStatus });
      fetchZones();
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل التحديث");
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
          <h1 className="text-2xl font-black text-white">إدارة القاعات والطاولات</h1>
          <p className="text-sm text-slate-500 mt-1 font-semibold">
            إنشاء وإدارة قاعات الطعام والطاولات لكل فرع
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20"
        >
          <Plus size={18} /> إضافة قاعة
        </button>
      </div>

      {/* Alert Banners */}
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
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder="بحث باسم القاعة أو الكود أو الفرع..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 placeholder:text-slate-600"
        />
      </div>

      {/* Zones Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 size={36} className="text-red-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-16">
          <DoorOpen size={48} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-500 font-bold">
            {search ? "لا توجد نتائج للبحث" : "لا توجد قاعات بعد"}
          </p>
          {!search && (
            <button onClick={openAddModal} className="mt-4 text-sm text-red-400 hover:text-red-300 font-bold">
              + أضف أول قاعة
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((zone) => (
            <div
              key={zone.id}
              className="bg-slate-900 rounded-2xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors"
            >
              {/* Zone Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center">
                    <span className="text-red-400 font-black text-sm">{zone.code}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-black">{zone.name}</h3>
                    <p className="text-slate-500 text-xs">{zone.branch?.name || "—"}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus(zone)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    zone.status === "ACTIVE"
                      ? "text-green-400 hover:bg-green-400/10"
                      : "text-slate-500 hover:bg-slate-700"
                  }`}
                  title={zone.status === "ACTIVE" ? "تفعيل" : "تعطيل"}
                >
                  {zone.status === "ACTIVE" ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-white">{zone.tables.length}</p>
                  <p className="text-[10px] text-slate-500 font-bold">طاولة</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-green-400">
                    {zone.tables.filter((t) => t.status === "AVAILABLE").length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">فارغة</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-red-400">
                    {zone.tables.filter((t) => t.status === "OCCUPIED").length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">مشغولة</p>
                </div>
              </div>

              {/* Tables Preview */}
              <div className="flex flex-wrap gap-1.5">
                {zone.tables.slice(0, 15).map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setShowQrModal(table)}
                    className={`w-8 h-8 rounded-lg text-[10px] font-bold flex items-center justify-center transition-colors ${
                      table.status === "AVAILABLE"
                        ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        : table.status === "OCCUPIED"
                        ? "bg-emerald-600/30 text-emerald-400"
                        : "bg-slate-700 text-slate-500"
                    }`}
                    title={`${table.table_number} - ${table.capacity} أشخاص`}
                  >
                    {table.table_number}
                  </button>
                ))}
                {zone.tables.length > 15 && (
                  <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-500 text-[10px] font-bold flex items-center justify-center">
                    +{zone.tables.length - 15}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleDelete(zone)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-300 rounded-lg text-xs font-bold hover:bg-red-600/30 transition-colors border border-red-600/20"
                >
                  <Trash2 size={12} />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && (
        <div className="text-slate-500 text-xs font-bold">
          إجمالي: {filtered.length} قاعة | {filtered.reduce((sum, z) => sum + z.tables.length, 0)} طاولة
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL: إضافة قاعة جديدة
          ════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Plus size={20} className="text-green-400" />
                إضافة قاعة جديدة
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
              {/* الفرع */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={13} />
                  الفرع
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
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
                    </option>
                  ))}
                </select>
              </div>

              {/* اسم القاعة */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DoorOpen size={13} />
                  اسم القاعة
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: القاعة الرئيسية"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 placeholder:text-slate-600"
                />
              </div>

              {/* كود القاعة */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash size={13} />
                  كود القاعة (حرف واحد)
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={3}
                  placeholder="مثال: A"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 placeholder:text-slate-600 font-mono font-black text-center text-lg tracking-widest"
                />
                <p className="text-[10px] text-slate-500 font-bold">
                  الطاولات ستكون: {form.code || "X"}1, {form.code || "X"}2, ...
                </p>
              </div>

              {/* عدد الطاولات والسعة */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={13} />
                    عدد الطاولات
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={form.tables_count}
                    onChange={(e) => setForm({ ...form, tables_count: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={13} />
                    سعة كل طاولة
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.tables_capacity}
                    onChange={(e) => setForm({ ...form, tables_capacity: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-900/20"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? "جاري الإنشاء..." : "إنشاء القاعة والطاولات"}
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
          MODAL: عرض QR Code للطاولة
          ════════════════════════════════════════════════════════ */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-600/30">
              <QrCode size={32} className="text-blue-400" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white">QR Code</h2>
              <p className="text-sm text-slate-400 mt-1">
                الطاولة: <span className="text-slate-200 font-bold">{showQrModal.table_number}</span>
              </p>
            </div>

            {/* QR Code Display */}
            <div className="bg-white rounded-2xl p-4 mx-auto w-48 h-48 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(showQrModal.qr_url)}`}
                alt={`QR ${showQrModal.table_number}`}
                className="w-full h-full"
              />
            </div>

            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-bold mb-1">رابط QR</p>
              <p className="text-xs text-slate-300 font-mono break-all">{showQrModal.qr_url}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800 rounded-xl p-2">
                <p className="text-slate-500 font-bold">السعة</p>
                <p className="text-white font-black">{showQrModal.capacity} أشخاص</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-2">
                <p className="text-slate-500 font-bold">الحالة</p>
                <p className="text-white font-black">{showQrModal.status}</p>
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiningZonesPage;
