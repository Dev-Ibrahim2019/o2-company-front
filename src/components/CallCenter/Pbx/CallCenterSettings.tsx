import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Edit3,
  Hash,
  Loader2,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Server,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { callCenterPbxService } from "../../../services/callCenterPbxService";
import type {
  Extension,
  ExtensionTech,
  Trunk,
  BlacklistEntry,
} from "../../../types/callCenterPbx";
import { EmptyState, HealthIndicator, SearchInput } from "./PbxSharedComponents";

type TabKey = "extensions" | "trunks" | "blacklist";

const TAB_LABELS: Record<TabKey, { label: string; icon: React.ReactNode }> = {
  extensions: {
    label: "التحويلات",
    icon: <Hash className="w-4 h-4" />,
  },
  trunks: {
    label: "الخطوط",
    icon: <Server className="w-4 h-4" />,
  },
  blacklist: {
    label: "القائمة السوداء",
    icon: <Ban className="w-4 h-4" />,
  },
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10 placeholder:text-slate-600";
const labelCls = "mb-1.5 block text-[11px] font-black text-slate-400";

function techBadgeClass(tech: string): string {
  switch (tech) {
    case "pjsip":
      return "bg-blue-500/20 text-blue-400";
    case "sip":
      return "bg-purple-500/20 text-purple-400";
    case "iax2":
      return "bg-amber-500/20 text-amber-400";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
}

function deviceBadgeClass(type: string): string {
  switch (type) {
    case "fixed":
      return "bg-emerald-500/20 text-emerald-400";
    case "mobile":
      return "bg-cyan-500/20 text-cyan-400";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
}

function trunkHealthColor(status: string): string {
  switch (status) {
    case "registered":
      return "bg-green-500";
    case "unregistered":
      return "bg-red-500";
    default:
      return "bg-yellow-500";
  }
}

function trunkStatusLabel(status: string): string {
  switch (status) {
    case "registered":
      return "مسجل";
    case "unregistered":
      return "غير مسجل";
    default:
      return "غير معروف";
  }
}

/* ═══════════════════════════════════════════════════════════════
   TAB 1 — Extensions
   ═══════════════════════════════════════════════════════════════ */

const ExtensionsTab: React.FC = () => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTech, setFilterTech] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const fetchExtensions = useCallback(async () => {
    try {
      setLoading(true);
      const result = await callCenterPbxService.getExtensions({
        search: search || undefined,
      });
      setExtensions(result.data || []);
      setTotal(result.total || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchExtensions();
  }, [fetchExtensions]);

  const filtered = useMemo(() => {
    return extensions.filter((ext) => {
      if (filterTech !== "all" && ext.tech !== filterTech) return false;
      if (filterType !== "all") {
        const devType = ext.core_device?.device_type;
        if (devType !== filterType) return false;
      }
      return true;
    });
  }, [extensions, filterTech, filterType]);

  if (loading && extensions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 justify-center py-12">
          <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
          <span className="text-sm text-slate-400">جاري تحميل التحويلات...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="بحث بالاسم أو التحويل..."
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterTech}
            onChange={(e) => setFilterTech(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 outline-none"
          >
            <option value="all">جميع التقنيات</option>
            <option value="pjsip">PJSIP</option>
            <option value="sip">SIP</option>
            <option value="iax2">IAX2</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 outline-none"
          >
            <option value="all">جميع الأنواع</option>
            <option value="fixed">ثابت</option>
            <option value="mobile">محمول</option>
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/80">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-right py-3 px-4 text-slate-400 font-bold">
                التحويل
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-bold">
                الاسم
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-bold">
                الجهاز
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-bold">
                التقنية
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-bold">
                الحالة
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-bold">
                النوع
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-bold">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-600">
                  لا توجد تحويلات
                </td>
              </tr>
            ) : (
              filtered.map((ext) => (
                <tr
                  key={ext.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-4 text-white font-bold">
                    {ext.user?.extension || ext.extension_id}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {ext.user?.name || "—"}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {ext.core_device?.device_id || "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        "px-2 py-0.5 rounded-full text-[10px] font-bold " +
                        techBadgeClass(ext.tech)
                      }
                    >
                      {ext.tech.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[10px] text-green-400">نشط</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        "px-2 py-0.5 rounded-full text-[10px] font-bold " +
                        deviceBadgeClass(ext.core_device?.device_type || "")
                      }
                    >
                      {ext.core_device?.device_type === "fixed"
                        ? "ثابت"
                        : ext.core_device?.device_type === "mobile"
                          ? "محمول"
                          : ext.core_device?.device_type || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-600 text-xs">
            لا توجد تحويلات
          </div>
        ) : (
          filtered.map((ext) => (
            <div
              key={ext.id}
              className="rounded-xl border border-white/5 bg-slate-900/80 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-bold">
                  {ext.user?.extension || ext.extension_id}
                </span>
                <span
                  className={
                    "px-2 py-0.5 rounded-full text-[10px] font-bold " +
                    techBadgeClass(ext.tech)
                  }
                >
                  {ext.tech.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {ext.user?.name || "بدون اسم"}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] text-green-400">نشط</span>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span>
          عرض {filtered.length} من {total} تحويل
        </span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TAB 2 — Trunks
   ═══════════════════════════════════════════════════════════════ */

const TrunksTab: React.FC = () => {
  const [trunks, setTrunks] = useState<Trunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const fetchTrunks = useCallback(async () => {
    try {
      setLoading(true);
      const result = await callCenterPbxService.getTrunks();
      setTrunks(result || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrunks();
  }, [fetchTrunks]);

  const handleCheckNow = useCallback(
    async (trunkName: string) => {
      setCheckingId(trunkName);
      // Simulated check — in real app, call API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setCheckingId(null);
      fetchTrunks();
    },
    [fetchTrunks]
  );

  if (loading && trunks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 justify-center py-12">
          <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
          <span className="text-sm text-slate-400">جاري تحميل الخطوط...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {trunks.length} خط {trunks.filter((t) => t.status === "registered").length} مسجل
        </span>
        <button
          onClick={fetchTrunks}
          className="flex items-center gap-2 rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث
        </button>
      </div>

      {trunks.length === 0 ? (
        <EmptyState
          icon={<Server className="w-12 h-12 text-slate-600" />}
          title="لا توجد خطوط"
          description="لم يتم العثور على أي خطوط في النظام"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trunks.map((trunk) => (
            <div
              key={trunk.name}
              className="rounded-2xl border border-white/5 bg-slate-900/80 p-5 space-y-4 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {trunk.name}
                  </h4>
                  <span
                    className={
                      "mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold " +
                      techBadgeClass(trunk.tech)
                    }
                  >
                    {trunk.tech.toUpperCase()}
                  </span>
                </div>
                <HealthIndicator
                  status={
                    trunk.status === "registered"
                      ? "healthy"
                      : trunk.status === "unregistered"
                        ? "critical"
                        : "warning"
                  }
                />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">المزوّد</span>
                  <span className="text-slate-300">{trunk.provider || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">حالة التسجيل</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={
                        "w-2 h-2 rounded-full " +
                        trunkHealthColor(trunk.status)
                      }
                    />
                    <span
                      className={
                        trunk.status === "registered"
                          ? "text-green-400"
                          : trunk.status === "unregistered"
                            ? "text-red-400"
                            : "text-yellow-400"
                      }
                    >
                      {trunkStatusLabel(trunk.status)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">القنوات النشطة</span>
                  <span className="text-white font-bold">
                    {trunk.channel_count}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">آخر فحص</span>
                  <span className="text-slate-400">
                    {trunk.last_check || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleCheckNow(trunk.name)}
                  disabled={checkingId === trunk.name}
                  className={
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-colors " +
                    (checkingId === trunk.name
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20")
                  }
                >
                  {checkingId === trunk.name ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  فحص الآن
                </button>
                <button className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold bg-slate-800 text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
                  <Edit3 className="w-3 h-3" />
                  تعديل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TAB 3 — Blacklist
   ═══════════════════════════════════════════════════════════════ */

const BlacklistTab: React.FC = () => {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newReason, setNewReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const fetchBlacklist = useCallback(async () => {
    try {
      setLoading(true);
      const result = await callCenterPbxService.getBlacklist({
        search: search || undefined,
      });
      setEntries(result.data || []);
      setTotal(result.total || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchBlacklist();
  }, [fetchBlacklist]);

  const handleAdd = useCallback(async () => {
    if (!newNumber.trim()) return;
    try {
      setSubmitting(true);
      await callCenterPbxService.addToBlacklist({
        number: newNumber.trim(),
        reason: newReason.trim(),
      });
      setNewNumber("");
      setNewReason("");
      setShowAddForm(false);
      fetchBlacklist();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }, [newNumber, newReason, fetchBlacklist]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        setDeletingIds((prev) => new Set(prev).add(id));
        await callCenterPbxService.removeFromBlacklist(id);
        fetchBlacklist();
      } catch {
        // silently fail
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [fetchBlacklist]
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      await Promise.all(
        ids.map((id) => callCenterPbxService.removeFromBlacklist(id))
      );
      setSelectedIds(new Set());
      fetchBlacklist();
    } catch {
      // silently fail
    } finally {
      setDeletingIds(new Set());
    }
  }, [selectedIds, fetchBlacklist]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  }, [selectedIds.size, entries]);

  if (loading && entries.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 justify-center py-12">
          <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
          <span className="text-sm text-slate-400">
            جاري تحميل القائمة السوداء...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="بحث بالرقم أو السبب..."
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة رقم
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">إضافة رقم جديد</h4>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>الرقم</label>
              <input
                type="text"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="مثال: 0599123456"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>السبب</label>
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="سبب الحظر"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={!newNumber.trim() || submitting}
              className={
                "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors " +
                (!newNumber.trim() || submitting
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-500")
              }
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              إضافة
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/80">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-3 px-3 text-right">
                <input
                  type="checkbox"
                  checked={selectedIds.size === entries.length && entries.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-white/20 bg-slate-800"
                />
              </th>
              <th className="text-right py-3 px-3 text-slate-400 font-bold">
                الرقم
              </th>
              <th className="text-right py-3 px-3 text-slate-400 font-bold">
                السبب
              </th>
              <th className="text-right py-3 px-3 text-slate-400 font-bold">
                أضيف بواسطة
              </th>
              <th className="text-right py-3 px-3 text-slate-400 font-bold">
                تاريخ الإضافة
              </th>
              <th className="text-right py-3 px-3 text-slate-400 font-bold">
                الحالة
              </th>
              <th className="text-right py-3 px-3 text-slate-400 font-bold">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-600">
                  لا توجد أرقام محظورة
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleSelect(entry.id)}
                      className="rounded border-white/20 bg-slate-800"
                    />
                  </td>
                  <td className="py-3 px-3 text-white font-bold font-mono">
                    {entry.number}
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-[200px] truncate">
                    {entry.reason || "—"}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {entry.created_by_name || entry.created_by}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString("ar-EG")
                      : "—"}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={
                        "px-2 py-0.5 rounded-full text-[10px] font-bold " +
                        (entry.status === "active"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-slate-500/20 text-slate-400")
                      }
                    >
                      {entry.status === "active" ? "نشط" : "معطل"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingIds.has(entry.id)}
                        className={
                          "p-1.5 rounded-lg transition-colors " +
                          (deletingIds.has(entry.id)
                            ? "text-slate-600 cursor-not-allowed"
                            : "text-slate-400 hover:text-red-400 hover:bg-red-500/10")
                        }
                      >
                        {deletingIds.has(entry.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {entries.length === 0 ? (
          <div className="py-12 text-center text-slate-600 text-xs">
            لا توجد أرقام محظورة
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/5 bg-slate-900/80 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                    className="rounded border-white/20 bg-slate-800"
                  />
                  <span className="text-sm text-white font-bold font-mono">
                    {entry.number}
                  </span>
                </div>
                <span
                  className={
                    "px-2 py-0.5 rounded-full text-[10px] font-bold " +
                    (entry.status === "active"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-slate-500/20 text-slate-400")
                  }
                >
                  {entry.status === "active" ? "نشط" : "معطل"}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {entry.reason || "بدون سبب"}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  {entry.created_by_name || "—"},{" "}
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleDateString("ar-EG")
                    : "—"}
                </span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingIds.has(entry.id)}
                  className={
                    "p-1.5 rounded-lg transition-colors " +
                    (deletingIds.has(entry.id)
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-slate-400 hover:text-red-400 hover:bg-red-500/10")
                  }
                >
                  {deletingIds.has(entry.id) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span>
          عرض {entries.length} من {total} رقم محظور
        </span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN — CallCenterSettings
   ═══════════════════════════════════════════════════════════════ */

export const CallCenterSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("extensions");

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-red-500" />
          إعدادات مركز الاتصال
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          إدارة التحويلات والخطوط والقائمة السوداء
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-2xl bg-slate-900/80 border border-white/5 overflow-x-auto">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap " +
              (activeTab === tab
                ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800")
            }
          >
            {TAB_LABELS[tab].icon}
            {TAB_LABELS[tab].label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "extensions" && <ExtensionsTab />}
        {activeTab === "trunks" && <TrunksTab />}
        {activeTab === "blacklist" && <BlacklistTab />}
      </div>
    </div>
  );
};
