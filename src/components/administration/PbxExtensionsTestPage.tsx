import { useState, useCallback, useMemo } from "react";
import {
  Search, RefreshCw, Loader2, Phone, Wifi, WifiOff,
  Server, Shield, Activity, ChevronDown, ChevronUp, XCircle,
  CheckCircle2, AlertTriangle, Eye, Zap, Settings,
} from "lucide-react";
import api from "../../api/axios";

type ExtStatus = "available" | "busy" | "unavailable" | "unknown";
type ConnStatus = "connected" | "disconnected" | "error";

type Extension = {
  extension: string;
  name: string;
  device: string;
  status: ExtStatus;
  caller_id: string;
  dial_string?: string | null;
  device_type?: string | null;
  description?: string | null;
  voicemail?: string | null;
  call_waiting?: boolean | null;
  do_not_disturb?: boolean | null;
  call_forward?: string | null;
  sip_name?: string | null;
  emergency_cid?: string | null;
};

type ConnectionInfo = {
  status: ConnStatus;
  message: string;
  method?: string;
  response_time_ms?: number;
};

type AuthInfo = {
  status: string;
  message: string;
  token_type?: string;
  http_status?: number;
};

type PbxResponse = {
  success: boolean;
  server: string;
  server_url: string;
  connection: ConnectionInfo;
  authentication: AuthInfo;
  extensions_count: number;
  total_count?: number;
  extensions: Extension[];
  last_sync: string | null;
  error: {
    type: string;
    message: string;
    suggested_solution: string;
  } | null;
};

const STATUS_COLORS: Record<ExtStatus, { bg: string; text: string; label: string }> = {
  available: { bg: "#dcfce7", text: "#16a34a", label: "متاح" },
  busy: { bg: "#fef3c7", text: "#d97706", label: "مشغول" },
  unavailable: { bg: "#fee2e2", text: "#dc2626", label: "غير متاح" },
  unknown: { bg: "#f3f4f6", text: "#6b7280", label: "غير معروف" },
};

const CONN_COLORS: Record<ConnStatus, { bg: string; text: string; label: string }> = {
  connected: { bg: "#dcfce7", text: "#16a34a", label: "متصل" },
  disconnected: { bg: "#f3f4f6", text: "#6b7280", label: "غير متصل" },
  error: { bg: "#fee2e2", text: "#dc2626", label: "خطأ" },
};

export const PbxExtensionsTestPage: React.FC = () => {
  const [data, setData] = useState<PbxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedExt, setExpandedExt] = useState<string | null>(null);
  const [testingExt, setTestingExt] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Extension | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await api.get("/pbx/extensions");
      setData(res.data as PbxResponse);
      if (!(res.data as PbxResponse).success && (res.data as PbxResponse).error) {
        setError((res.data as PbxResponse).error!.message);
      }
    } catch (err: any) {
      setError(err?.message || "فشل الاتصال بالخادم");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useMemo(() => { fetchData(); }, [fetchData]);

  const testSingleExtension = async (ext: string) => {
    setTestingExt(ext);
    setTestResult(null);
    try {
      const res = await api.get(`/pbx/extensions/${ext}`);
      if ((res.data as any).success) {
        setTestResult((res.data as any).extension);
      }
    } catch { /* ignore */ }
    setTestingExt(null);
  };

  const filteredExtensions = useMemo(() => {
    if (!data?.extensions) return [];
    if (!search) return data.extensions;
    const q = search.toLowerCase();
    return data.extensions.filter(
      (e) =>
        e.extension.includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.caller_id.includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const connInfo = data?.connection;
  const authInfo = data?.authentication;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
            <Phone className="w-6 h-6" style={{ color: "#dc2626" }} />
            اختبار امتدادات PBX
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--o2-muted)" }}>
            فحص الاتصال مع FreePBX وعرض امتدادات الهاتف
          </p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
          style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          تحديث
        </button>
      </div>

      {/* Connection Card */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <h3 className="text-sm font-black mb-4 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
          <Server className="w-4 h-4" /> حالة الاتصال
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>عنوان الخادم</p>
            <p className="text-xs font-mono" style={{ color: "var(--o2-text)" }}>{data?.server_url || "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>حالة الاتصال</p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: CONN_COLORS[connInfo?.status ?? "disconnected"].bg, color: CONN_COLORS[connInfo?.status ?? "disconnected"].text }}>
              {connInfo?.status === "connected" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {CONN_COLORS[connInfo?.status ?? "disconnected"].label}
            </span>
            {connInfo?.message && <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>{connInfo.message}</p>}
            {connInfo?.method && <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>الطريقة: {connInfo.method.toUpperCase()}</p>}
            {connInfo?.response_time_ms !== undefined && <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>الاستجابة: {connInfo.response_time_ms}ms</p>}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>المصادقة</p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: authInfo?.status === "success" ? "#dcfce7" : "#fee2e2", color: authInfo?.status === "success" ? "#16a34a" : "#dc2626" }}>
              {authInfo?.status === "success" ? <Shield className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {authInfo?.status === "success" ? "ناجحة" : "فشلت"}
            </span>
            {authInfo?.message && <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>{authInfo.message}</p>}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>آخر مزامنة</p>
            <p className="text-xs" style={{ color: "var(--o2-text)" }}>
              {data?.last_sync ? new Date(data.last_sync).toLocaleString("ar-EG") : "—"}
            </p>
            <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>
              {data?.extensions_count ?? 0} امتداد
              {data?.total_count && data.total_count !== data.extensions_count ? ` / ${data.total_count} إجمالي` : ""}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border p-4" style={{ backgroundColor: "#fee2e2", borderColor: "#dc2626" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: "#dc2626" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#dc2626" }}>خطأ في الاتصال</p>
              <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{error}</p>
              {data?.error?.suggested_solution && (
                <p className="text-xs mt-2" style={{ color: "#991b1b" }}>الحل المقترح: {data.error.suggested_solution}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--o2-muted)" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالرقم أو الاسم..."
            className="w-full pr-9 pl-3 py-2 rounded-lg text-xs border"
            style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
        </div>
        <span className="text-xs" style={{ color: "var(--o2-muted)" }}>
          {filteredExtensions.length} امتداد
        </span>
      </div>

      {/* Extensions Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--o2-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "var(--o2-surface)" }}>
                {["رقم الامتداد", "الاسم", "البروتوكول", "النوع", "الحالة", "رقم المُتصل", "إجراءات"].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-bold" style={{ color: "var(--o2-muted)" }}>{h}</th>
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
                  {data?.success === false ? "لم يتم الاتصال بالخادم" : "لا توجد امتدادات"}
                </td></tr>
              ) : filteredExtensions.map((ext) => {
                const isExpanded = expandedExt === ext.extension;
                const st = STATUS_COLORS[ext.status] || STATUS_COLORS.unknown;
                return (
                  <ExtensionRow key={ext.extension} ext={ext} isExpanded={isExpanded}
                    onToggle={() => setExpandedExt(isExpanded ? null : ext.extension)}
                    onTest={() => testSingleExtension(ext.extension)}
                    testingExt={testingExt} testResult={testResult} />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ExtensionRow: React.FC<{
  ext: Extension;
  isExpanded: boolean;
  onToggle: () => void;
  onTest: () => void;
  testingExt: string | null;
  testResult: Extension | null;
}> = ({ ext, isExpanded, onToggle, onTest, testingExt, testResult }) => {
  const st = STATUS_COLORS[ext.status] || STATUS_COLORS.unknown;
  const isTesting = testingExt === ext.extension;
  const showDetail = isExpanded && testResult && testResult.extension === ext.extension;

  return (
    <>
      <tr className="border-t cursor-pointer hover:opacity-90 transition-opacity"
        style={{ borderColor: "var(--o2-border)" }} onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--o2-muted)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--o2-muted)" }} />}
            <span className="font-bold font-mono" style={{ color: "var(--o2-text)" }}>{ext.extension}</span>
          </div>
        </td>
        <td className="px-4 py-3 font-bold" style={{ color: "var(--o2-text)" }}>{ext.name || "—"}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
            style={{ backgroundColor: "#dbeafe", color: "#2563eb" }}>
            <Zap className="w-2.5 h-2.5" /> {ext.device}
          </span>
        </td>
        <td className="px-4 py-3 text-[11px]" style={{ color: "var(--o2-muted)" }}>{ext.device_type || "—"}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{ backgroundColor: st.bg, color: st.text }}>
            {ext.status === "available" && <CheckCircle2 className="w-3 h-3" />}
            {ext.status === "unavailable" && <XCircle className="w-3 h-3" />}
            {st.label}
          </span>
        </td>
        <td className="px-4 py-3 font-mono" style={{ color: "var(--o2-text)" }}>{ext.caller_id || "—"}</td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button onClick={onToggle} className="p-1.5 rounded hover:opacity-80" style={{ color: "var(--o2-brand)" }}>
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button onClick={onTest} disabled={isTesting}
              className="p-1.5 rounded hover:opacity-80 disabled:opacity-50" style={{ color: "#16a34a" }}>
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-6 py-4 border-t" style={{ borderColor: "var(--o2-border)", backgroundColor: "var(--o2-surface)" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-black flex items-center gap-1.5" style={{ color: "var(--o2-text)" }}>
                  <Phone className="w-3.5 h-3.5" /> بيانات الامتداد
                </h4>
                <DetailRow label="رقم الامتداد" value={ext.extension} />
                <DetailRow label="الاسم" value={ext.name} />
                <DetailRow label="البروتوكول" value={ext.device} />
                <DetailRow label="نوع الجهاز" value={ext.device_type ?? "—"} />
                <DetailRow label="رقم المُتصل" value={ext.caller_id || "—"} />
                <DetailRow label="الحالة" value={st.label} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-black flex items-center gap-1.5" style={{ color: "var(--o2-text)" }}>
                  <Settings className="w-3.5 h-3.5" /> معلومات إضافية
                </h4>
                <DetailRow label="الوصف" value={ext.description ?? "—"} />
                <DetailRow label="نطاق الاتصال" value={ext.dial_string ?? "—"} />
                <DetailRow label="SIP Name" value={ext.sip_name ?? "—"} />
                <DetailRow label="البريد الصوتي" value={ext.voicemail ?? "—"} />
                <DetailRow label="انتظار المكالمة" value={ext.call_waiting ? "مفعّل" : "معطّل"} />
                <DetailRow label="عدم الإزعاج" value={ext.do_not_disturb ? "مفعّل" : "معطّل"} />
                <DetailRow label="تحويل المكالمة" value={ext.call_forward || "—"} />
                <DetailRow label="رقم الطوارئ" value={ext.emergency_cid ?? "—"} />
              </div>
            </div>
            {showDetail && (
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "var(--o2-surface-raised)" }}>
                <p className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>
                  فحص الامتداد: تم بنجاح في {new Date().toLocaleTimeString("ar-EG")}
                </p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-3 py-1.5 rounded border"
    style={{ borderColor: "var(--o2-border)" }}>
    <span className="text-[10px] font-bold" style={{ color: "var(--o2-muted)" }}>{label}</span>
    <span className="text-xs font-bold" style={{ color: "var(--o2-text)" }}>{value}</span>
  </div>
);
