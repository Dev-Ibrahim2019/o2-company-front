import React, { useState } from "react";
import { AlertTriangle, Info, AlertCircle, X } from "lucide-react";
import type { CustomerAlert } from "../../services/callCenterService";

interface Props {
  alert: CustomerAlert;
  onDismiss?: () => void;
  compact?: boolean;
}

export const CustomerAlertBanner: React.FC<Props> = ({ alert, onDismiss, compact = false }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const severityConfig = {
    info: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", icon: Info },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: AlertTriangle },
    critical: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: AlertCircle },
  };

  const config = severityConfig[alert.severity] || severityConfig.info;
  const Icon = config.icon;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg} ${config.border} border`}>
        <Icon size={14} className={config.text} />
        <p className={`text-[11px] font-bold flex-1 ${config.text}`}>{alert.message}</p>
        {onDismiss && (
          <button onClick={handleDismiss} className={`${config.text} hover:opacity-70`}>
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${config.bg} ${config.border} border`}>
      <Icon size={18} className={`${config.text} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${config.text}`}>{alert.message}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          {alert.type === "open_complaint" ? "شكوى مفتوحة" : "مشكلة سابقة — يرجى الانتباه"}
        </p>
      </div>
      {onDismiss && (
        <button onClick={handleDismiss} className="text-slate-500 hover:text-white transition-colors shrink-0">
          <X size={14} />
        </button>
      )}
    </div>
  );
};
