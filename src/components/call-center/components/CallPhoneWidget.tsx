import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, X, PhoneIncoming, WifiOff, Wifi } from "lucide-react";
import { colors, radius, shadows, transitions, typography } from "../design/tokens";
import { getToken } from "../../../auth/authStorage";
import { toast } from "../../shared/Toast";

// ============================================================================
// CALL PHONE WIDGET — لوحة اتصال Browser-Phone (iframe معزول تماماً، AGPL منفصل
// عن bundle React — انظر public/call-phone/NOTICE.md). أيقونة سماعة ثابتة تفتح
// لوحة عائمة بدون مغادرة الصفحة الحالية، مع استقبال أحداث المكالمات/الدردشة عبر
// postMessage من الـ iframe.
// ============================================================================

type ConnectionStatus = "connecting" | "registered" | "unregistered" | "error";

interface BridgeMessage {
  source?: string;
  type?: string;
  number?: string | null;
  displayName?: string | null;
  from?: string | null;
  body?: string | null;
  reason?: string | null;
  username?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const CallPhoneWidget: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [unreadChat, setUnreadChat] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const token = getToken();
  const iframeSrc = token
    ? `/call-phone/index.html?token=${encodeURIComponent(token)}&api=${encodeURIComponent(API_BASE)}`
    : null;

  useEffect(() => {
    const handleMessage = (event: MessageEvent<BridgeMessage>) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== "restomaster-browser-phone") return;

      switch (data.type) {
        case "registered":
          setStatus("registered");
          break;
        case "unregistered":
          setStatus("unregistered");
          break;
        case "registration_failed":
        case "transport_error":
          setStatus("error");
          break;
        case "provisioning_failed":
          if (data.reason === "no_token") break; // won't happen — we always pass a token
          toast.error("لا يوجد حساب SIP مرتبط بك", "تواصل مع المشرف لربط حساب SIP من صفحة الإعدادات");
          break;
        case "incoming_call": {
          const number = data.number;
          if (!number) break;
          toast.info("مكالمة واردة", data.displayName || number);
          // Screen-pop: افتح صفحة الطلب مع تعبئة رقم المتصل تلقائياً (بحث فوري عن العميل)
          navigate(`/call-center/order?phone=${encodeURIComponent(number)}`);
          break;
        }
        case "chat_message":
          setUnreadChat(n => n + 1);
          toast.info("رسالة داخلية جديدة", data.from ? `من: ${data.from}` : undefined);
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  useEffect(() => {
    if (open) setUnreadChat(0);
  }, [open]);

  if (!token) return null;

  const statusMeta: Record<ConnectionStatus, { label: string; color: string; icon: React.ReactNode }> = {
    connecting: { label: "جارِ الاتصال...", color: colors.neutral[400], icon: <Wifi size={11} /> },
    registered: { label: "متصل", color: colors.semantic.success, icon: <Wifi size={11} /> },
    unregistered: { label: "غير متصل", color: colors.neutral[400], icon: <WifiOff size={11} /> },
    error: { label: "تعذّر الاتصال", color: colors.semantic.error, icon: <WifiOff size={11} /> },
  };

  return (
    <>
      {/* ── الزر العائم الثابت ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "إغلاق لوحة الاتصال" : "فتح لوحة الاتصال"}
        style={{
          position: "fixed", bottom: 20, left: 20, zIndex: 900,
          width: 52, height: 52, borderRadius: "50%",
          background: open ? colors.neutral[800] : colors.brand[500],
          color: "#fff", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: shadows.lg, transition: `all ${transitions.fast}`,
        }}
      >
        {open ? <X size={20} /> : <Headphones size={20} />}
        {!open && (
          <span style={{
            position: "absolute", top: -2, right: -2, width: 12, height: 12, borderRadius: "50%",
            background: statusMeta[status].color, border: "2px solid #fff",
          }} />
        )}
        {!open && unreadChat > 0 && (
          <span style={{
            position: "absolute", bottom: -2, left: -2, minWidth: 18, height: 18, borderRadius: 9999,
            background: colors.semantic.error, color: "#fff", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
          }}>{unreadChat}</span>
        )}
      </button>

      {/* ── اللوحة العائمة ── */}
      {open && (
        <div
          dir="rtl"
          style={{
            position: "fixed", bottom: 84, left: 20, zIndex: 899,
            width: 380, maxWidth: "calc(100vw - 40px)", height: 640, maxHeight: "calc(100vh - 120px)",
            background: "#fff", borderRadius: radius["2xl"], boxShadow: shadows["2xl"],
            border: `1px solid ${colors.border.subtle}`, overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderBottom: `1px solid ${colors.border.subtle}`, background: colors.neutral[50],
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PhoneIncoming size={14} style={{ color: colors.brand[500] }} />
              <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>السماعة</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: statusMeta[status].color, fontSize: "11px", fontWeight: 600 }}>
              {statusMeta[status].icon}
              {statusMeta[status].label}
            </div>
          </div>
          {iframeSrc && (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="Browser Phone"
              style={{ flex: 1, border: "none", width: "100%" }}
              allow="microphone; camera; autoplay"
            />
          )}
        </div>
      )}
    </>
  );
};

export default CallPhoneWidget;
