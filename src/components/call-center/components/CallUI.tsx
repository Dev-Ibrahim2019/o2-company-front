import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, PhoneForwarded, Video, Loader2, User, Mic, MicOff, Volume2 } from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design";
import { useCallCenterStore } from "../store/callCenterStore";

// ============================================================================
// INCOMING CALL NOTIFICATION — Premium incoming call UI
// ============================================================================

interface IncomingCallProps {
  callerNumber: string;
  callerName?: string;
  callerExtension?: string;
  callerIp?: string;
  destination?: string;
  loading?: boolean;
  ticketReady?: boolean;
  ticketError?: string | null;
  onAnswer: () => void;
  onReject: () => void;
  onAnswerWithVideo?: () => void;
  onTransfer?: (extension: string) => void;
  onRetryTicket?: () => void;
  extensions?: Array<{ number: string; name: string }>;
}

export const IncomingCallNotification: React.FC<IncomingCallProps> = ({
  callerNumber,
  callerName,
  callerExtension,
  callerIp,
  destination,
  loading = false,
  ticketReady = false,
  ticketError = null,
  onAnswer,
  onReject,
  onAnswerWithVideo,
  onTransfer,
  onRetryTicket,
  extensions = [],
}) => {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div role="dialog" aria-modal="false" aria-label="مكالمة واردة" dir="rtl"
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 40, pointerEvents: "none" }}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />

      {/* Call Card */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 400,
        background: "#fff", borderRadius: 24,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 60px rgba(16, 185, 129, 0.15)",
        overflow: "hidden", pointerEvents: "auto",
        animation: "slideInDown .4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        {/* Header gradient */}
        <div style={{
          padding: "32px 24px 24px", textAlign: "center",
          background: `linear-gradient(180deg, ${colors.semantic.successBg} 0%, #fff 100%)`,
        }}>
          {/* Pulsing avatar */}
          <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 16px" }}>
            <div style={{
              position: "absolute", inset: -8,
              borderRadius: "50%",
              background: pulse ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.05)",
              transition: `all ${transitions.slow}`,
            }} />
            <div style={{
              position: "absolute", inset: -4,
              borderRadius: "50%",
              background: pulse ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.03)",
              transition: `all ${transitions.slow}`,
            }} />
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `linear-gradient(135deg, ${colors.semantic.success} 0%, #059669 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 16px rgba(16, 185, 129, 0.3)",
            }}>
              <User size={36} color="#fff" />
            </div>
            {/* Status indicator */}
            <div style={{
              position: "absolute", bottom: 2, right: 2,
              width: 18, height: 18, borderRadius: "50%",
              background: colors.semantic.success,
              border: "3px solid #fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Phone size={10} color="#fff" />
            </div>
          </div>

          {/* Call type */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 9999,
            background: colors.semantic.successBg,
            color: colors.semantic.success,
            fontSize: "12px", fontWeight: 600, marginBottom: 12,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.semantic.success, animation: "pulse 1s infinite" }} />
            مكالمة واردة
          </div>

          {/* Caller name */}
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: colors.neutral[900], marginBottom: 4, fontFamily: typography.fontFamily.arabic }}>
            {callerName || "مجهول"}
          </h2>

          {/* Caller number */}
          <p dir="ltr" style={{
            fontSize: "18px", fontWeight: 600, color: colors.neutral[500],
            fontFamily: typography.fontFamily.mono, letterSpacing: "0.05em",
          }}>
            {callerNumber}
          </p>

          {/* Technical details */}
          {(callerExtension || callerIp || destination) && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: radius.lg,
              background: colors.neutral[50], display: "flex", flexWrap: "wrap",
              gap: "8px 16px", justifyContent: "center",
            }}>
              {callerExtension && (
                <span style={{ fontSize: "11px", color: colors.neutral[500] }}>
                  ملحق: <span style={{ color: colors.neutral[700], fontWeight: 600 }}>{callerExtension}</span>
                </span>
              )}
              {callerIp && (
                <span style={{ fontSize: "11px", color: colors.neutral[500] }}>
                  IP: <span dir="ltr" style={{ color: colors.neutral[700], fontFamily: typography.fontFamily.mono }}>{callerIp}</span>
                </span>
              )}
              {destination && (
                <span style={{ fontSize: "11px", color: colors.neutral[500] }}>
                  الوجهة: <span style={{ color: colors.neutral[700], fontWeight: 600 }}>{destination}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Ticket error */}
        {ticketError && (
          <div style={{ margin: "0 16px", padding: "10px 12px", borderRadius: radius.lg, background: colors.semantic.errorBg, border: `1px solid ${colors.semantic.errorBorder}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "13px", color: "#991b1b", flex: 1 }}>{ticketError}</span>
            {onRetryTicket && (
              <button onClick={onRetryTicket} style={{ fontSize: "12px", fontWeight: 600, color: colors.semantic.error, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                إعادة المحاولة
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ padding: "16px 24px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* Answer */}
            <button onClick={onAnswer} disabled={loading || !ticketReady}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 16px", borderRadius: 14,
                background: loading || !ticketReady ? colors.neutral[200] : `linear-gradient(135deg, ${colors.semantic.success} 0%, #059669 100%)`,
                color: "#fff", fontSize: "14px", fontWeight: 700,
                border: "none", cursor: loading || !ticketReady ? "not-allowed" : "pointer",
                opacity: loading || !ticketReady ? 0.6 : 1,
                boxShadow: loading || !ticketReady ? "none" : "0 4px 12px rgba(16, 185, 129, 0.3)",
                transition: `all ${transitions.fast}`,
              }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><Phone size={18} /> رد</>}
            </button>

            {/* Reject */}
            <button onClick={onReject}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 16px", borderRadius: 14,
                background: `linear-gradient(135deg, ${colors.semantic.error} 0%, #dc2626 100%)`,
                color: "#fff", fontSize: "14px", fontWeight: 700,
                border: "none", cursor: "pointer",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                transition: `all ${transitions.fast}`,
              }}>
              <PhoneOff size={18} /> رفض
            </button>
          </div>

          {/* Video answer */}
          {onAnswerWithVideo && (
            <button onClick={onAnswerWithVideo} disabled={loading || !ticketReady}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 16px", borderRadius: 12,
                background: "transparent", border: `1px solid ${colors.semantic.infoBorder}`,
                color: colors.semantic.info, fontSize: "13px", fontWeight: 600,
                cursor: loading || !ticketReady ? "not-allowed" : "pointer",
                opacity: loading || !ticketReady ? 0.6 : 1,
                transition: `all ${transitions.fast}`,
              }}>
              <Video size={16} /> رد بالفيديو
            </button>
          )}

          {/* Loading message */}
          {!ticketReady && !ticketError && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <p style={{ fontSize: "13px", color: colors.neutral[500] }}>جارٍ تجهيز تذكرة المكالمة…</p>
            </div>
          )}

          {/* Transfer quick buttons */}
          {extensions.length > 0 && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 12 }}>
              <p style={{ fontSize: "11px", color: colors.neutral[500], marginBottom: 8, textAlign: "center" }}>تحويل سريع</p>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {extensions.slice(0, 4).map(ext => (
                  <button key={ext.number} onClick={() => onTransfer?.(ext.number)}
                    style={{
                      flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 12px", borderRadius: radius.lg,
                      background: colors.neutral[50], border: `1px solid ${colors.border.subtle}`,
                      fontSize: "12px", fontWeight: 500, color: colors.neutral[700],
                      cursor: "pointer", transition: `all ${transitions.fast}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${colors.brand[500]}08`; e.currentTarget.style.borderColor = `${colors.brand[500]}40`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = colors.neutral[50]; e.currentTarget.style.borderColor = colors.border.subtle; }}>
                    <PhoneForwarded size={14} color={colors.brand[500]} />
                    {ext.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ACTIVE CALL BAR — Sticky top bar during active call
// ============================================================================

interface ActiveCallBarProps {
  callerName: string;
  callerNumber: string;
  duration: number;
  ticketId?: number;
  phase: "customer" | "order" | "payment" | "kitchen";
  orderState?: string;
  paymentState?: string;
  invoiceState?: string;
  kitchenState?: string;
  isOnHold?: boolean;
  onHold?: () => void;
  onEnd?: () => void;
  onTransfer?: (extension: string) => void;
  onToggleProfile?: () => void;
  profileOpen?: boolean;
  extensions?: Array<{ number: string; name: string }>;
}

export const ActiveCallBar: React.FC<ActiveCallBarProps> = ({
  callerName, callerNumber, duration, ticketId, phase,
  orderState = "مسودة", paymentState = "غير مدفوع", invoiceState = "لم تُنشأ", kitchenState = "لم يُرسل",
  isOnHold, onHold, onEnd, onTransfer, onToggleProfile, profileOpen = false, extensions = [],
}) => {
  const steps = ["customer", "order", "payment", "kitchen"] as const;
  const labels = { customer: "العميل", order: "الطلب", payment: "الدفع", kitchen: "المطبخ" };
  const current = steps.indexOf(phase);

  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <header dir="rtl" style={{
      position: "sticky", top: 0, zIndex: 40,
      background: "#fff", borderBottom: `1px solid ${colors.border.subtle}`,
      padding: "0 16px", height: layout.callBarHeight,
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      {/* Caller info */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: radius.lg,
          background: isOnHold ? colors.call.onHoldBg : colors.call.connectedBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          <Phone size={18} color={isOnHold ? colors.call.onHold : colors.call.connected} />
          {!isOnHold && <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: colors.semantic.success, border: "2px solid #fff" }} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: colors.neutral[900], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{callerName}</p>
          <p style={{ fontSize: "12px", color: colors.neutral[500], fontFamily: typography.fontFamily.mono }}>
            {callerNumber} · {formatDuration(duration)} · #{ticketId || "—"}
          </p>
        </div>
      </div>

      {/* Progress stepper */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        {steps.map((step, i) => (
          <React.Fragment key={step}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: radius.md,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700,
                background: i < current ? colors.semantic.success : i === current ? colors.brand[500] : colors.neutral[200],
                color: i <= current ? "#fff" : colors.neutral[500],
                border: `2px solid ${i < current ? colors.semantic.success : i === current ? colors.brand[500] : colors.neutral[300]}`,
              }}>
                {i < current ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "12px", fontWeight: 500, color: i <= current ? colors.neutral[900] : colors.neutral[400] }}>
                {labels[step]}
              </span>
            </div>
            {i < 3 && <div style={{ width: 24, height: 2, background: i < current ? colors.semantic.success : colors.neutral[200], borderRadius: 1 }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Status chips */}
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { label: `T-${ticketId || "—"}`, color: colors.semantic.info },
          { label: orderState, color: colors.semantic.warning },
          { label: paymentState, color: colors.semantic.success },
          { label: invoiceState, color: "#8b5cf6" },
          { label: kitchenState, color: colors.semantic.error },
        ].map((chip, i) => (
          <span key={i} style={{
            padding: "2px 8px", borderRadius: radius.md,
            fontSize: "11px", fontWeight: 500,
            background: `${chip.color}12`, color: chip.color,
            border: `1px solid ${chip.color}20`,
          }}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        {onToggleProfile && (
          <button onClick={onToggleProfile} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: radius.lg,
            background: profileOpen ? `${colors.brand[500]}10` : "transparent",
            border: `1px solid ${profileOpen ? `${colors.brand[500]}40` : colors.border.default}`,
            color: profileOpen ? colors.brand[600] : colors.neutral[600],
            fontSize: "12px", fontWeight: 500, cursor: "pointer",
          }}>
            {profileOpen ? "إخفاء" : "الملف"}
          </button>
        )}
        {onHold && (
          <button onClick={onHold} style={{
            padding: "6px 10px", borderRadius: radius.lg,
            background: isOnHold ? colors.call.onHoldBg : "transparent",
            border: `1px solid ${isOnHold ? `${colors.call.onHold}40` : colors.border.default}`,
            color: isOnHold ? colors.call.onHold : colors.neutral[600],
            fontSize: "12px", fontWeight: 500, cursor: "pointer",
          }}>
            {isOnHold ? "استئناف" : "انتظار"}
          </button>
        )}
        {onTransfer && extensions.length > 0 && (
          <select onChange={e => { if (e.target.value) onTransfer(e.target.value); e.target.value = ""; }}
            style={{
              padding: "6px 10px", borderRadius: radius.lg,
              border: `1px solid ${colors.border.default}`, background: "#fff",
              fontSize: "12px", fontWeight: 500, color: colors.neutral[600], cursor: "pointer",
            }}>
            <option value="">تحويل</option>
            {extensions.map(ext => <option key={ext.number} value={ext.number}>{ext.name} · {ext.number}</option>)}
          </select>
        )}
        <button onClick={onEnd} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: radius.lg,
          background: colors.semantic.error, color: "#fff",
          fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer",
        }}>
          <PhoneOff size={14} /> إنهاء
        </button>
      </div>
    </header>
  );
};
