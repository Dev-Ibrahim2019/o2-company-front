import React, { useEffect, useState } from "react";
import { X, ShoppingCart, FileText, Star, AlertTriangle, MessageSquare, User, Phone, MapPin, ChevronLeft, Loader2, ExternalLink, Ban } from "lucide-react";
import type { CustomerSearchResult, CustomerAlert, CustomerProfile } from "../../services/callCenterService";
import { callCenterService } from "../../services/callCenterService";
import { CustomerAlertBanner } from "./CustomerAlertBanner";

interface Props {
  customer: CustomerSearchResult;
  alerts?: CustomerAlert[];
  onSelect: (customer: CustomerSearchResult) => void;
  onClose: () => void;
  onOpenFullProfile: (customer: CustomerSearchResult) => void;
}

export const CustomerQuickPreview: React.FC<Props> = ({ customer, alerts = [], onSelect, onClose, onOpenFullProfile }) => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(false);
      try {
        const res = await callCenterService.getCustomerProfile(customer.id);
        setProfile(res.data);
      } catch { setProfileError(true); } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [customer.id]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const hasWarning = customer.status === "blocked" || customer.status === "inactive";

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" dir="rtl" role="dialog" aria-modal="true" aria-label="معاينة العميل">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-sm max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                <User size={20} className="text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-black text-sm">{customer.name}</h3>
                  {customer.status === "active" && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">نشط</span>}
                  {customer.status === "inactive" && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">غير نشط</span>}
                  {customer.status === "blocked" && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">محظور</span>}
                </div>
                <p className="text-[11px] text-slate-400">{customer.code}</p>
                {customer.category?.toLowerCase() === "vip" && <span className="mt-1 inline-block rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-black text-amber-300">VIP</span>}
              </div>
            </div>
            <button onClick={onClose} aria-label="إغلاق معاينة العميل" className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          {hasWarning && (
            <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${customer.status === "blocked" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
              <AlertTriangle size={14} />
              {customer.status === "blocked" ? "هذا العميل محظور. لا يمكن إنشاء طلب له." : "هذا العميل غير نشط."}
            </div>
          )}

          {alerts.length > 0 && (
            <div className="mx-4 mt-3 space-y-2">
              {alerts.map((alert, idx) => (
                <CustomerAlertBanner key={idx} alert={alert} compact />
              ))}
            </div>
          )}

          {profileLoading ? (
            <div className="p-6 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-red-500" />
            </div>
          ) : profileError ? (
            <div className="p-5 text-center text-xs font-bold text-red-300">تعذر تحميل بيانات العميل. أغلق النافذة وحاول مرة أخرى.</div>
          ) : profile ? (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <QuickInfo icon={<Phone size={12} />} label="الهاتف" value={customer.phone || customer.mobile || "—"} />
                <QuickInfo icon={<ShoppingCart size={12} />} label="الطلبات السابقة" value={String(profile.total_orders)} />
                <QuickInfo icon={<AlertTriangle size={12} />} label="شكاوى مفتوحة" value={String(profile.open_complaints_count)} highlight={profile.open_complaints_count > 0} />
                {profile.last_order_at && (
                  <QuickInfo icon={<FileText size={12} />} label="آخر طلب" value={new Date(profile.last_order_at).toLocaleDateString("ar-SA")} />
                )}
                {customer.city && (
                  <QuickInfo icon={<MapPin size={12} />} label="المدينة" value={customer.city} />
                )}
                {customer.address && (
                  <QuickInfo icon={<MapPin size={12} />} label="العنوان" value={customer.address} />
                )}
              </div>
              {profile.latest_note && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-400 flex items-start gap-2">
                  <MessageSquare size={12} className="mt-0.5 shrink-0" />
                  <span>{profile.latest_note}</span>
                </div>
              )}
            </div>
          ) : null}

          <div className="p-4 border-t border-white/5 space-y-2">
            <button
              onClick={() => onSelect(customer)}
              disabled={customer.status === "blocked"}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${customer.status === "blocked" ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/30"}`}
            >
              <ShoppingCart size={16} />
              اختيار العميل للطلب
            </button>
            <button onClick={() => { onClose(); onOpenFullProfile(customer); }} className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all">
              <ExternalLink size={14} /> عرض الملف الكامل
            </button>
          </div>
        </div>
      </div>

    </>
  );
};

const QuickInfo: React.FC<{ icon: React.ReactNode; label: string; value: string; highlight?: boolean }> = ({ icon, label, value, highlight }) => (
  <div className={`bg-slate-800/50 rounded-xl p-2.5 ${highlight ? "border border-red-500/20" : ""}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-0.5">
      {icon} {label}
    </div>
    <div className={`text-sm font-black ${highlight ? "text-red-400 animate-pulse" : "text-white"}`}>{value}</div>
  </div>
);
