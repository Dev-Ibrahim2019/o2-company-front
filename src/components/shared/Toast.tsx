import { forwardRef, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
} from "lucide-react";
import { sound } from "../../services/soundService";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const TOAST_STYLES: Record<ToastType, { icon: typeof CheckCircle2; bg: string; border: string; iconColor: string }> = {
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-950/90",
    border: "border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-950/90",
    border: "border-red-500/30",
    iconColor: "text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-950/90",
    border: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  info: {
    icon: Info,
    bg: "bg-blue-950/90",
    border: "border-blue-500/30",
    iconColor: "text-blue-400",
  },
};

let toastCounter = 0;
const listeners: Array<(items: ToastItem[]) => void> = [];
let toastsState: ToastItem[] = [];

function notifyListeners() {
  listeners.forEach((l) => l([...toastsState]));
}

function addToast(type: ToastType, title: string, message?: string, duration = 5000) {
  const id = `toast-${++toastCounter}`;
  const item: ToastItem = { id, type, title, message, duration };
  toastsState = [...toastsState, item];
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
  return id;
}

function removeToast(id: string) {
  toastsState = toastsState.filter((t) => t.id !== id);
  notifyListeners();
}

export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    sound.success();
    return addToast("success", title, message, duration);
  },
  error: (title: string, message?: string, duration?: number) => {
    sound.error();
    return addToast("error", title, message, duration ?? 7000);
  },
  warning: (title: string, message?: string, duration?: number) => {
    sound.warning();
    return addToast("warning", title, message, duration ?? 6000);
  },
  info: (title: string, message?: string, duration?: number) => {
    sound.info();
    return addToast("info", title, message, duration);
  },
};

const ToastItemComponent = forwardRef<HTMLDivElement, { item: ToastItem; onClose: () => void }>(
  function ToastItemComponent({ item, onClose }, ref) {
    const style = TOAST_STYLES[item.type];
    const Icon = style.icon;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const pauseTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    const resumeTimer = () => {
      if (item.duration && item.duration > 0) {
        timerRef.current = setTimeout(onClose, 3000);
      }
    };

    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: -12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.95, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onMouseEnter={pauseTimer}
        onMouseLeave={resumeTimer}
        className={`flex items-start gap-3 w-[380px] max-w-[calc(100vw-2rem)] px-4 py-3.5 rounded-xl border backdrop-blur-xl shadow-2xl ${style.bg} ${style.border}`}
      >
        <div className={`mt-0.5 shrink-0 ${style.iconColor}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-snug">{item.title}</p>
          {item.message && (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition"
        >
          <X size={14} />
        </button>
      </motion.div>
    );
  }
);

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      const idx = listeners.indexOf(setItems);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <ToastItemComponent
            key={item.id}
            item={item}
            onClose={() => removeToast(item.id)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
