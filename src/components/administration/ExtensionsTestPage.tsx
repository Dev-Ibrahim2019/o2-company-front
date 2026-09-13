import { useState, useCallback, useMemo } from "react";
import {
  Search, RefreshCw, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertTriangle, Package, Server,
  Shield, FileText, Route, Database, Settings, Activity,
  Puzzle, Heart,
} from "lucide-react";
import api from "../../api/axios";

// ── Types ──
type ExtensionStatus = "enabled" | "disabled" | "missing";
type HealthStatus = "healthy" | "failed" | "unknown";

type HealthCheck = {
  key: string;
  label: string;
  ok: boolean;
};

type Extension = {
  id: string;
  name: string;
  name_ar: string;
  display_name: string;
  description: string;
  version: string;
  status: ExtensionStatus;
  source: "internal" | "composer";
  type: string;
  route: string | null;
  permissions: string[];
  dependencies: string[];
  health: HealthStatus;
  health_checks: Record<string, boolean | null>;
  errors: string[];
  components: {
    controllers: string[];
    models: string[];
    services: string[];
    migrations: string[];
    config_files: string[];
  };
};

type ExtensionsResponse = {
  success: boolean;
  data: Extension[];
  meta: {
    total: number;
    enabled: number;
    disabled: number;
    missing: number;
    healthy: number;
    failed: number;
    scanned_at: string;
  };
};

// ── Constants ──
const HEALTH_CHECK_LABELS: Record<string, string> = {
  controllers_loadable: "يمكن تحميل الكنترولرات",
  routes_registered: "الرواتب مسجلة",
  apis_available: "واجهات API متاحة",
  migrations_applied: "الايرادات مطبقة",
  permissions_registered: "الصلاحيات مسجلة",
  config_present: "ملفات الإعدادات موجودة",
  services_initialized: "الخدمات مُهيأة",
  installed: "مثبت",
};

const STATUS_COLORS: Record<ExtensionStatus, { bg: string; text: string }> = {
  enabled: { bg: "#dcfce7", text: "#16a34a" },
  disabled: { bg: "#fef3c7", text: "#d97706" },
  missing: { bg: "#fee2e2", text: "#dc2626" },
};

const STATUS_LABELS: Record<ExtensionStatus, string> = {
  enabled: "مفعّل",
  disabled: "معطّل",
  missing: "غير موجود",
};

const HEALTH_COLORS: Record<HealthStatus, { bg: string; text: string }> = {
  healthy: { bg: "#dcfce7", text: "#16a34a" },
  failed: { bg: "#fee2e2", text: "#dc2626" },
  unknown: { bg: "#f3f4f6", text: "#6b7280" },
};

const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: "سليم",
  failed: "يحتاج صيانة",
  unknown: "غير معروف",
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  internal: Puzzle,
  composer: Package,
};

export const ExtensionsTestPage: React.FC = () => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [meta, setMeta] = useState<ExtensionsResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"name" | "version" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchExtensions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/system/extensions");
      const payload = res.data as ExtensionsResponse;
      setExtensions(payload.data ?? []);
      setMeta(payload.meta ?? null);
    } catch (err: any) {
      setError(err?.message || "فشل تحميل البيانات");
      setExtensions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useMemo(() => { fetchExtensions(); }, [fetchExtensions]);

  const filteredExtensions = useMemo(() => {
    let list = [...extensions];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.name_ar.includes(search) ||
          e.id.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((e) => e.status === statusFilter);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "version") cmp = a.version.localeCompare(b.version);
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [extensions, search, statusFilter, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  const getHealthChecks = (ext: Extension): HealthCheck[] => {
    return Object.entries(ext.health_checks).map(([key, ok]) => ({
      key,
      label: HEALTH_CHECK_LABELS[key] || key,
      ok: ok === null ? true : ok,
    }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
            <Puzzle className="w-6 h-6" style={{ color: "#dc2626" }} />
            اختبار الإضافات
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--o2-muted)" }}>
            فحص وعرض جميع الوحدات والإضافات المسجلة في النظام
          </p>
        </div>
        <button onClick={fetchExtensions} disabled={loading}
          className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
          style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          تحديث
        </button>
      </div>

      {/* Summary Cards */}
      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "الكل", value: meta.total, icon: Server, color: "#6b7280" },
            { label: "مفعّل", value: meta.enabled, icon: CheckCircle2, color: "#16a34a" },
            { label: "معطّل", value: meta.disabled, icon: AlertTriangle, color: "#d97706" },
            { label: "غير موجود", value: meta.missing, icon: XCircle, color: "#dc2626" },
            { label: "يحتاج صيانة", value: meta.failed, icon: Activity, color: "#dc2626" },
            { label: "سليم", value: meta.healthy, icon: Heart, color: "#16a34a" },
          ].map((card) => (
            <div key={card.label}
              className="rounded-xl border p-4 flex items-center gap-3"
              style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-lg font-black" style={{ color: "var(--o2-text)" }}>{card.value}</p>
                <p className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--o2-muted)" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو المعرّف..."
            className="w-full pr-9 pl-3 py-2 rounded-lg text-xs border"
            style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
        </div>
        <div className="flex items-center gap-2">
          {(["all", "enabled", "disabled", "missing"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === s ? "bg-red-600 text-white" : "border"}`}
              style={statusFilter !== s ? { borderColor: "var(--o2-border)", color: "var(--o2-muted)" } : {}}>
              {s === "all" ? "الكل" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border p-4 text-xs" style={{ backgroundColor: "#fee2e2", borderColor: "#dc2626", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {/* Extensions Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--o2-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "var(--o2-surface)" }}>
                {[
                  { key: "name" as const, label: "الاسم" },
                  { key: null, label: "الوصف" },
                  { key: "version" as const, label: "الإصدار" },
                  { key: "status" as const, label: "الحالة" },
                  { key: null, label: "المصدر" },
                  { key: null, label: "المسار" },
                  { key: null, label: "الصحة" },
                ].map((col) => (
                  <th key={col.label}
                    className={`px-4 py-3 text-right font-bold ${col.key ? "cursor-pointer select-none" : ""}`}
                    style={{ color: "var(--o2-muted)" }}
                    onClick={col.key ? () => toggleSort(col.key!) : undefined}>
                    {col.label} {col.key && <SortIcon field={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "var(--o2-muted)" }} />
                </td></tr>
              ) : filteredExtensions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center" style={{ color: "var(--o2-muted)" }}>
                  لا توجد إضافات
                </td></tr>
              ) : filteredExtensions.map((ext) => {
                const isExpanded = expandedId === ext.id;
                const SourceIcon = SOURCE_ICONS[ext.source] || Package;
                return (
                  <ExtensionRow key={ext.id} ext={ext} isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : ext.id)}
                    SourceIcon={SourceIcon} getHealthChecks={getHealthChecks} />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last scanned */}
      {meta?.scanned_at && (
        <p className="text-[10px] text-center" style={{ color: "var(--o2-muted)" }}>
          آخر فحص: {new Date(meta.scanned_at).toLocaleString("ar-EG")}
        </p>
      )}
    </div>
  );
};

// ── Extension Row Component ──
const ExtensionRow: React.FC<{
  ext: Extension;
  isExpanded: boolean;
  onToggle: () => void;
  SourceIcon: React.ElementType;
  getHealthChecks: (ext: Extension) => HealthCheck[];
}> = ({ ext, isExpanded, onToggle, SourceIcon, getHealthChecks }) => {
  const healthChecks = getHealthChecks(ext);
  const passedChecks = healthChecks.filter((c) => c.ok).length;

  return (
    <>
      <tr className="border-t cursor-pointer hover:opacity-90 transition-opacity"
        style={{ borderColor: "var(--o2-border)" }}
        onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--o2-muted)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--o2-muted)" }} />}
            <div>
              <p className="font-bold" style={{ color: "var(--o2-text)" }}>{ext.name_ar}</p>
              <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>{ext.id}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: "var(--o2-muted)" }}>{ext.description}</td>
        <td className="px-4 py-3 font-mono" style={{ color: "var(--o2-text)" }}>{ext.version}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{ backgroundColor: STATUS_COLORS[ext.status].bg, color: STATUS_COLORS[ext.status].text }}>
            {ext.status === "enabled" && <CheckCircle2 className="w-3 h-3" />}
            {ext.status === "missing" && <XCircle className="w-3 h-3" />}
            {STATUS_LABELS[ext.status]}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: "var(--o2-muted)" }}>
            <SourceIcon className="w-3.5 h-3.5" /> {ext.source === "internal" ? "داخلي" : "Composer"}
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--o2-muted)" }}>{ext.route || "—"}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{ backgroundColor: HEALTH_COLORS[ext.health].bg, color: HEALTH_COLORS[ext.health].text }}>
            {ext.health === "healthy" ? <CheckCircle2 className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
            {passedChecks}/{healthChecks.length}
          </span>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-6 py-4 border-t" style={{ borderColor: "var(--o2-border)", backgroundColor: "var(--o2-surface)" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Health Checks */}
              <div className="space-y-3">
                <h4 className="text-xs font-black flex items-center gap-1.5" style={{ color: "var(--o2-text)" }}>
                  <Activity className="w-3.5 h-3.5" /> فحوصات الصحة
                </h4>
                <div className="space-y-2">
                  {healthChecks.map((check) => (
                    <div key={check.key} className="flex items-center justify-between px-3 py-2 rounded-lg border"
                      style={{ borderColor: "var(--o2-border)" }}>
                      <span className="text-xs" style={{ color: "var(--o2-text)" }}>{check.label}</span>
                      {check.ok ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: "#16a34a" }}>
                          <CheckCircle2 className="w-3 h-3" /> ناجح
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: "#dc2626" }}>
                          <XCircle className="w-3 h-3" /> فشل
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {ext.errors.length > 0 && (
                  <div className="rounded-lg border p-3" style={{ backgroundColor: "#fee2e2", borderColor: "#dc2626" }}>
                    <p className="text-xs font-bold mb-1" style={{ color: "#dc2626" }}>الأخطاء:</p>
                    {ext.errors.map((err, i) => (
                      <p key={i} className="text-[11px]" style={{ color: "#dc2626" }}>{err}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Components */}
              <div className="space-y-3">
                <h4 className="text-xs font-black flex items-center gap-1.5" style={{ color: "var(--o2-text)" }}>
                  <Puzzle className="w-3.5 h-3.5" /> المكونات
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "الكنترولرات", items: ext.components.controllers, icon: Server },
                    { label: "النماذج", items: ext.components.models, icon: Database },
                    { label: "الخدمات", items: ext.components.services, icon: Settings },
                    { label: "الايرادات", items: ext.components.migrations, icon: FileText },
                  ].map((group) => (
                    <div key={group.label} className="rounded-lg border p-3" style={{ borderColor: "var(--o2-border)" }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <group.icon className="w-3 h-3" style={{ color: "var(--o2-muted)" }} />
                        <span className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>{group.label} ({group.items.length})</span>
                      </div>
                      <div className="space-y-1">
                        {group.items.slice(0, 5).map((item) => (
                          <p key={item} className="text-[10px] font-mono truncate" style={{ color: "var(--o2-text)" }}>{item}</p>
                        ))}
                        {group.items.length > 5 && (
                          <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>+{group.items.length - 5} أخرى...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {ext.permissions.length > 0 && (
                  <div className="rounded-lg border p-3" style={{ borderColor: "var(--o2-border)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Shield className="w-3 h-3" style={{ color: "var(--o2-muted)" }} />
                      <span className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>الصلاحيات</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ext.permissions.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: "#dbeafe", color: "#2563eb" }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {ext.components.config_files.length > 0 && (
                  <div className="rounded-lg border p-3" style={{ borderColor: "var(--o2-border)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText className="w-3 h-3" style={{ color: "var(--o2-muted)" }} />
                      <span className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>ملفات الإعدادات</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ext.components.config_files.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded text-[10px] font-mono"
                          style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
                          {f}.php
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
