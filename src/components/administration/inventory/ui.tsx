/**
 * عناصر واجهة مشتركة لشاشات وحدة المخازن — بنفس أسلوب صفحات الإدارة القائمة
 * (DiningZonesPage / PosRegistersPage): خلفية slate داكنة، حواف دائرية، أزرار حمراء.
 */

import React from "react";
import { Loader2, X, Search } from "lucide-react";

export const inputClass =
  "w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600 placeholder:text-slate-600 disabled:opacity-50";

export const PageHeader: React.FC<{ title: string; subtitle: string; action?: React.ReactNode }> = ({
  title,
  subtitle,
  action,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-2xl font-black text-white">{title}</h1>
      <p className="text-sm text-slate-500 mt-1 font-semibold">{subtitle}</p>
    </div>
    {action}
  </div>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }> = ({
  loading,
  children,
  className = "",
  disabled,
  ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 ${className}`}
  >
    {loading && <Loader2 size={16} className="animate-spin" />}
    {children}
  </button>
);

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...rest }) => (
  <button
    type="button"
    {...rest}
    className={`px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors disabled:opacity-50 ${className}`}
  />
);

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({
  value,
  onChange,
  placeholder,
}) => (
  <div className="relative flex-1 min-w-[200px]">
    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${inputClass} pr-10`}
    />
  </div>
);

export const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({
  label,
  required,
  hint,
  children,
}) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-black text-slate-400 tracking-wider flex items-center gap-1">
      {label}
      {required && <span className="text-red-500">*</span>}
    </span>
    {children}
    {hint && <span className="block text-[11px] text-slate-500 font-semibold">{hint}</span>}
  </label>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({
  checked,
  onChange,
  label,
  disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="flex items-center gap-3 select-none disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? "bg-green-600" : "bg-slate-700"}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? "right-5" : "right-1"}`} />
    </span>
    <span className="text-sm font-bold text-slate-300">{label}</span>
  </button>
);

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, footer, wide }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onMouseDown={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`bg-slate-900 border border-white/10 rounded-3xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[92vh] flex flex-col shadow-2xl`}
    >
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <h2 className="text-lg font-black text-white">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">{children}</div>
      {footer && <div className="p-5 border-t border-white/5 flex gap-2 justify-end">{footer}</div>}
    </div>
  </div>
);

export const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-black whitespace-nowrap ${
      active ? "bg-green-600/20 text-green-400" : "bg-slate-700 text-slate-400"
    }`}
  >
    {active ? "نشط" : "موقوف"}
  </span>
);

export const LoadingBlock: React.FC = () => (
  <div className="flex items-center justify-center p-16">
    <Loader2 size={36} className="text-red-500 animate-spin" />
  </div>
);

export const EmptyBlock: React.FC<{ icon: React.ElementType; text: string; action?: React.ReactNode }> = ({
  icon: Icon,
  text,
  action,
}) => (
  <div className="text-center p-16 bg-slate-900 rounded-2xl border border-white/5">
    <Icon size={48} className="mx-auto text-slate-700 mb-3" />
    <p className="text-slate-500 font-bold">{text}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "default" | "danger" }
> = ({ label, tone = "default", className = "", children, ...rest }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    {...rest}
    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      tone === "danger"
        ? "bg-red-600/10 text-red-400 hover:bg-red-600/20"
        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
    } ${className}`}
  >
    {children}
  </button>
);
