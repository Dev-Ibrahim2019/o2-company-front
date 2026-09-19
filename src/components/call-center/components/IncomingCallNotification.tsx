import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, PhoneForwarded, Video, Loader2, User } from "lucide-react";
import { colors, borderRadius, shadows, transitions, typography } from "../design-system";

export interface IncomingCallData {
  callerNumber: string;
  callerName?: string;
  callerExtension?: string;
  callerIp?: string;
  destination?: string;
  destinationName?: string;
  callerPhoto?: string;
  callType?: "video" | "audio";
}

interface IncomingCallNotificationProps {
  call: IncomingCallData;
  loading?: boolean;
  ticketReady?: boolean;
  ticketError?: string | null;
  onAnswer: () => void;
  onReject: () => void;
  onAnswerWithVideo?: () => void;
  onTransfer?: (extension: string) => void;
  onRetryTicket?: () => void;
  extensions?: Array<{ extension: string; name: string }>;
}

export const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  call,
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
  const [isPulsing, setIsPulsing] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsPulsing((prev) => !prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="مكالمة واردة"
      dir="rtl"
      style={{
        position: "fixed",
        top: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "100%",
        maxWidth: "28rem",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: colors.bg.secondary,
          borderRadius: borderRadius["2xl"],
          border: `1px solid ${colors.status.successBorder}`,
          boxShadow: `${shadows["2xl"]}, 0 0 40px rgba(16, 185, 129, 0.2)`,
          overflow: "hidden",
        }}
      >
        {/* Header with caller info */}
        <div
          style={{
            padding: "1.5rem",
            textAlign: "center",
            background: `linear-gradient(180deg, ${colors.status.successLight} 0%, transparent 100%)`,
          }}
        >
          {/* Caller avatar */}
          <div
            style={{
              width: "5rem",
              height: "5rem",
              margin: "0 auto 1rem",
              borderRadius: borderRadius.full,
              background: colors.status.successLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `3px solid ${colors.status.success}`,
              boxShadow: isPulsing
                ? `0 0 0 8px ${colors.status.successLight}`
                : "none",
              transition: `box-shadow ${transitions.slow}`,
            }}
          >
            {call.callerPhoto ? (
              <img
                src={call.callerPhoto}
                alt={call.callerName || "Caller"}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: borderRadius.full,
                  objectFit: "cover",
                }}
              />
            ) : (
              <User
                size={32}
                style={{ color: colors.status.success }}
              />
            )}
          </div>

          {/* Call type badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.75rem",
              borderRadius: borderRadius.full,
              background: colors.status.successLight,
              color: colors.status.success,
              fontSize: typography.fontSize.xs[0],
              fontWeight: typography.fontWeight.semibold,
              marginBottom: "0.75rem",
            }}
          >
            <Phone size={12} />
            مكالمة واردة
          </div>

          {/* Caller name */}
          <h2
            style={{
              fontSize: typography.fontSize.xl[0],
              fontWeight: typography.fontWeight.black,
              color: colors.neutral[50],
              marginBottom: "0.25rem",
            }}
          >
            {call.callerName || "مجهول"}
          </h2>

          {/* Caller number */}
          <p
            dir="ltr"
            style={{
              fontSize: typography.fontSize.lg[0],
              fontWeight: typography.fontWeight.semibold,
              color: colors.neutral[300],
              fontFamily: typography.fontFamily.mono,
            }}
          >
            {call.callerNumber}
          </p>

          {/* Caller details */}
          {(call.callerExtension || call.callerIp || call.destination) && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.5rem",
                borderRadius: borderRadius.lg,
                background: colors.bg.tertiary,
                fontSize: typography.fontSize.xs[0],
                color: colors.neutral[400],
              }}
            >
              {call.callerExtension && (
                <div style={{ marginBottom: "0.25rem" }}>
                  <span style={{ color: colors.neutral[500] }}>الملحق: </span>
                  <span style={{ color: colors.neutral[200], fontWeight: typography.fontWeight.semibold }}>
                    {call.callerExtension}
                  </span>
                </div>
              )}
              {call.callerIp && (
                <div style={{ marginBottom: "0.25rem" }}>
                  <span style={{ color: colors.neutral[500] }}>IP: </span>
                  <span dir="ltr" style={{ color: colors.neutral[200], fontFamily: typography.fontFamily.mono }}>
                    {call.callerIp}
                  </span>
                </div>
              )}
              {call.destination && (
                <div>
                  <span style={{ color: colors.neutral[500] }}>الوجهة: </span>
                  <span style={{ color: colors.neutral[200], fontWeight: typography.fontWeight.semibold }}>
                    {call.destinationName || call.destination}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ticket error */}
        {ticketError && (
          <div
            style={{
              margin: "0 1rem",
              padding: "0.75rem",
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.status.errorBorder}`,
              background: colors.status.errorLight,
              color: colors.neutral[200],
              fontSize: typography.fontSize.xs[0],
            }}
          >
            <p>{ticketError}</p>
            {onRetryTicket && (
              <button
                onClick={onRetryTicket}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.status.errorBorder}`,
                  background: "transparent",
                  color: colors.neutral[200],
                  fontSize: typography.fontSize.xs[0],
                  fontWeight: typography.fontWeight.semibold,
                  cursor: "pointer",
                }}
              >
                إعادة محاولة إنشاء التذكرة
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            padding: "1rem 1.5rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          {/* Answer button */}
          <button
            onClick={onAnswer}
            disabled={loading || !ticketReady}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.875rem",
              borderRadius: borderRadius.lg,
              border: "none",
              background: loading || !ticketReady
                ? colors.neutral[700]
                : colors.status.success,
              color: colors.neutral[50],
              fontSize: typography.fontSize.sm[0],
              fontWeight: typography.fontWeight.bold,
              cursor: loading || !ticketReady ? "not-allowed" : "pointer",
              opacity: loading || !ticketReady ? 0.6 : 1,
              transition: `all ${transitions.fast}`,
            }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Phone size={18} />
                رد
              </>
            )}
          </button>

          {/* Reject button */}
          <button
            onClick={onReject}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.875rem",
              borderRadius: borderRadius.lg,
              border: "none",
              background: colors.status.error,
              color: colors.neutral[50],
              fontSize: typography.fontSize.sm[0],
              fontWeight: typography.fontWeight.bold,
              cursor: "pointer",
              transition: `all ${transitions.fast}`,
            }}
          >
            <PhoneOff size={18} />
            رفض
          </button>
        </div>

        {/* Video answer (if supported) */}
        {onAnswerWithVideo && (
          <div
            style={{
              padding: "0 1.5rem 1rem",
            }}
          >
            <button
              onClick={onAnswerWithVideo}
              disabled={loading || !ticketReady}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: borderRadius.lg,
                border: `1px solid ${colors.status.infoBorder}`,
                background: colors.status.infoLight,
                color: colors.status.info,
                fontSize: typography.fontSize.sm[0],
                fontWeight: typography.fontWeight.semibold,
                cursor: loading || !ticketReady ? "not-allowed" : "pointer",
                opacity: loading || !ticketReady ? 0.6 : 1,
                transition: `all ${transitions.fast}`,
              }}
            >
              <Video size={18} />
              رد بالفيديو
            </button>
          </div>
        )}

        {/* Transfer options */}
        {!ticketReady && !ticketError && (
          <div
            style={{
              padding: "0 1.5rem 1rem",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: typography.fontSize.xs[0],
                color: colors.neutral[400],
              }}
            >
              جارٍ تجهيز تذكرة المكالمة…
            </p>
          </div>
        )}

        {/* Quick transfer buttons */}
        {extensions.length > 0 && (
          <div
            style={{
              padding: "0 1.5rem 1.25rem",
              display: "flex",
              gap: "0.5rem",
              overflowX: "auto",
            }}
          >
            {extensions.slice(0, 3).map((ext) => (
              <button
                key={ext.extension}
                onClick={() => onTransfer?.(ext.extension)}
                style={{
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.5rem 0.75rem",
                  borderRadius: borderRadius.lg,
                  border: `1px solid ${colors.border.default}`,
                  background: colors.bg.tertiary,
                  color: colors.neutral[300],
                  fontSize: typography.fontSize.xs[0],
                  fontWeight: typography.fontWeight.semibold,
                  cursor: "pointer",
                  transition: `all ${transitions.fast}`,
                }}
              >
                <PhoneForwarded size={14} />
                {ext.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
