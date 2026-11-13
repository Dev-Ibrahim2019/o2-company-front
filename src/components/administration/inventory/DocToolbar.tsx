/**
 * DocToolbar.tsx — شريط أدوات المستندات (بنية شاشات الأمين بهوية النظام).
 *
 * مصدر واحد للأزرار والاختصارات: كل إجراء يحمل keys (مثل "F3" أو "Ctrl+P" أو "Alt+PageDown")، فيُعرض
 * الاختصار على الزر ويُربط بلوحة المفاتيح من القائمة نفسها — لا يختلف المعروض عن المربوط.
 * الإجراء المخفي أو المعطّل لا يستجيب لاختصاره. زر "?" يعرض دليل الاختصارات.
 *
 * داخل خانات الكتابة: مفاتيح F وEsc وتركيبات Ctrl/Alt تعمل (لا تكتب نصاً)، أما المفتاح المنفرد فلا.
 * Ctrl+N وCtrl+T وCtrl+W وأحياناً F11 يحجزها المتصفح، لذلك لا تُستخدم هنا.
 */

import React, { useEffect, useRef, useState } from "react";
import { HelpCircle, Loader2 } from "lucide-react";
import { Modal } from "./ui";

export interface ToolbarAction {
  id: string;
  label: string;
  icon: React.ElementType;
  /** الاختصار بصيغة العرض: "F3" أو "Ctrl+P" أو "Alt+PageDown". */
  keys?: string;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
  /** اختصار فعّال يظهر في الدليل بلا زر في الشريط (مثل F11 للتعديل). */
  bindOnly?: boolean;
  loading?: boolean;
  tone?: "primary" | "danger" | "default";
  /** سبب التعطيل أو شرح إضافي يظهر في التلميح. */
  hint?: string;
}

export type ToolbarItem = ToolbarAction | "sep";

/** "ctrl+alt+shift+key" بأحرف صغيرة، بنفس ترتيب المعدِّلات دائماً. */
export function comboOf(e: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "key">): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(e.key.toLowerCase());
  return parts.join("+");
}

/** "Ctrl+P" → "ctrl+p" (نفس صيغة comboOf). */
export function normalizeKeys(keys: string): string {
  const parts = keys.split("+").map((p) => p.trim().toLowerCase());
  const key = parts.pop() ?? "";
  const mods = ["ctrl", "alt", "shift"].filter((m) => parts.includes(m));
  return [...mods, key === "del" ? "delete" : key === "esc" ? "escape" : key].join("+");
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable));
};

/**
 * يربط اختصارات قائمة الإجراءات بالنافذة. أحدث القائمة عبر ref فلا يُعاد ربط المستمع كل رسم.
 * enabled=false (مثلاً ونافذة حوار مفتوحة فوق الصفحة) يوقف كل الاختصارات.
 */
export function useActionShortcuts(items: ToolbarItem[], enabled = true) {
  const ref = useRef(items);
  ref.current = items;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current || e.defaultPrevented) return;
      const combo = comboOf(e);
      // داخل خانة كتابة: الحروف (ولو مع Shift مثل "?") نص لا اختصار؛ يعمل فقط Ctrl/Alt ومفاتيح F وEsc.
      const key = e.key.toLowerCase();
      const fnKey = /^f\d{1,2}$/.test(key) || key === "escape";
      if (isTyping(e.target) && !(e.ctrlKey || e.metaKey || e.altKey) && !fnKey) return;
      for (const item of ref.current) {
        if (item === "sep" || !item.keys || item.hidden) continue;
        if (normalizeKeys(item.keys) !== combo) continue;
        e.preventDefault();
        if (!item.disabled && !item.loading) item.onClick();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const TONES: Record<NonNullable<ToolbarAction["tone"]>, string> = {
  primary: "bg-red-600 text-white hover:bg-red-700 border-red-700/50",
  danger: "bg-red-600/10 text-red-400 hover:bg-red-600/20 border-red-500/20",
  default: "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-white/5",
};

export const DocToolbar: React.FC<{
  items: ToolbarItem[];
  /** يوقف الاختصارات (نافذة حوار مفتوحة فوق الصفحة). */
  shortcutsEnabled?: boolean;
  /** يمين الشريط (عنوان المستند أو رقمه). */
  title?: React.ReactNode;
  className?: string;
}> = ({ items, shortcutsEnabled = true, title, className = "" }) => {
  const [guideOpen, setGuideOpen] = useState(false);
  const all: ToolbarItem[] = [
    ...items,
    "sep",
    { id: "help", label: "دليل الاختصارات", icon: HelpCircle, keys: "Shift+?", onClick: () => setGuideOpen((o) => !o) },
  ];
  useActionShortcuts(all, shortcutsEnabled && !guideOpen);

  const visible = all.filter((i) => i === "sep" || (!i.hidden && !i.bindOnly));
  // لا فاصلين متتاليين ولا فاصل في الطرفين.
  const compact = visible.filter((i, idx) => i !== "sep" || (idx > 0 && idx < visible.length - 1 && visible[idx - 1] !== "sep"));

  return (
    <>
      <div
        role="toolbar"
        aria-label="أدوات المستند"
        className={`sticky top-0 z-20 o2-bleed-t py-2 bg-slate-950/95 backdrop-blur border-b border-white/5 flex flex-wrap items-center gap-1.5 ${className}`}
      >
        {title && <div className="ml-2 text-sm font-black text-white whitespace-nowrap">{title}</div>}
        {compact.map((item, idx) =>
          item === "sep" ? (
            <span key={`sep-${idx}`} aria-hidden className="w-px h-6 bg-white/10 mx-0.5" />
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled || item.loading}
              title={[item.label, item.keys ? `(${item.keys})` : "", item.hint ?? ""].filter(Boolean).join(" ")}
              aria-keyshortcuts={item.keys?.replace("Ctrl", "Control")}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${TONES[item.tone ?? "default"]}`}
            >
              {item.loading ? <Loader2 size={14} className="animate-spin" /> : <item.icon size={14} />}
              <span className={item.id === "help" ? "sr-only" : "hidden sm:inline"}>{item.label}</span>
              {item.keys && item.id !== "help" && (
                <kbd className="hidden xl:inline font-mono text-[10px] font-semibold opacity-60" dir="ltr">
                  {item.keys}
                </kbd>
              )}
            </button>
          ),
        )}
      </div>

      {guideOpen && (
        <Modal title="دليل الاختصارات" onClose={() => setGuideOpen(false)}>
          <ul className="divide-y divide-white/5 text-sm">
            {all
              .filter((i): i is ToolbarAction => i !== "sep" && Boolean(i.keys) && !i.hidden)
              .map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="font-bold text-slate-300">{a.label}</span>
                  <kbd className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-white/10" dir="ltr">
                    {a.keys}
                  </kbd>
                </li>
              ))}
          </ul>
          <p className="text-[11px] text-slate-500 font-semibold">
            في الجدول: Enter وTab للخانة التالية، Shift+Enter للسابقة، والأسهم بين الخلايا، وCtrl+Delete يحذف السطر.
          </p>
        </Modal>
      )}
    </>
  );
};
