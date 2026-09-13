import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, CheckCircle, Info, X } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "success" | "info";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
  confirmBg: string;
  confirmHoverBg: string;
  borderColor: string;
  glowColor: string;
}> = {
  danger: {
    icon: Trash2,
    iconBg: "rgba(220, 38, 38, 0.12)",
    iconColor: "#dc2626",
    confirmBg: "#dc2626",
    confirmHoverBg: "#b91c1c",
    borderColor: "rgba(220, 38, 38, 0.25)",
    glowColor: "rgba(220, 38, 38, 0.4)",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "rgba(217, 119, 6, 0.12)",
    iconColor: "#d97706",
    confirmBg: "#d97706",
    confirmHoverBg: "#b45309",
    borderColor: "rgba(217, 119, 6, 0.25)",
    glowColor: "rgba(217, 119, 6, 0.4)",
  },
  success: {
    icon: CheckCircle,
    iconBg: "rgba(5, 150, 105, 0.12)",
    iconColor: "#059669",
    confirmBg: "#059669",
    confirmHoverBg: "#047857",
    borderColor: "rgba(5, 150, 105, 0.25)",
    glowColor: "rgba(5, 150, 105, 0.4)",
  },
  info: {
    icon: Info,
    iconBg: "rgba(37, 99, 235, 0.12)",
    iconColor: "#2563eb",
    confirmBg: "#2563eb",
    confirmHoverBg: "#1d4ed8",
    borderColor: "rgba(37, 99, 235, 0.25)",
    glowColor: "rgba(37, 99, 235, 0.4)",
  },
};

export const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, loading, onCancel]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === backdropRef.current && !loading) onCancel(); }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          dir="rtl"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
            style={{ borderColor: config.borderColor, borderWidth: 1, borderStyle: "solid" }}
          >
            {/* Glow accent */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: `linear-gradient(to right, transparent, ${config.iconColor}, transparent)`,
                opacity: 0.5,
              }}
            />

            {/* Close button */}
            <button
              onClick={onCancel}
              disabled={loading}
              className="absolute top-4 left-4 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition z-10 disabled:opacity-40"
            >
              <X size={16} />
            </button>

            {/* Content */}
            <div className="p-6">
              {/* Icon */}
              <div
                className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: config.iconBg }}
              >
                <Icon className="w-7 h-7" style={{ color: config.iconColor }} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-white text-center mb-2">
                {title}
              </h3>

              {/* Message */}
              <p className="text-sm text-center leading-relaxed whitespace-pre-line" style={{ color: "var(--o2-muted)" }}>
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 bg-slate-800/50" style={{ borderTop: "1px solid var(--o2-border)" }}>
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition disabled:opacity-40"
                style={{
                  color: "var(--o2-text)",
                  backgroundColor: "var(--o2-surface-raised)",
                  border: "1px solid var(--o2-border)",
                }}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: config.confirmBg }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = config.confirmHoverBg; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = config.confirmBg; }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري التنفيذ...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
