/**
 * InventorySettingsCard.tsx — قسم "المخزون" في الإعدادات العامة (/admin/settings).
 * يظهر لمن يملك inventory.access، والتعديل لمن يملك inventory.settings.manage فقط.
 */

import React, { useEffect, useState } from "react";
import { Boxes, Loader2 } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import { inventoryErrorMessage, inventoryService, type InventorySettings } from "../../../services/inventoryService";
import { Toggle } from "./ui";

export const InventorySettingsCard: React.FC = () => {
  const canManage = useCan(INVENTORY_PERMISSIONS.SETTINGS_MANAGE);
  const [settings, setSettings] = useState<InventorySettings | null>(null);
  const [saving, setSaving] = useState(false);

  const [threshold, setThreshold] = useState("3");

  useEffect(() => {
    inventoryService
      .settings()
      .then((s) => {
        setSettings(s);
        setThreshold(String(Number(s.variance_alert_percent ?? 3)));
      })
      .catch((e) => toast.error("تعذّر تحميل إعدادات المخزون", inventoryErrorMessage(e)));
  }, []);

  const saveThreshold = async () => {
    if (!settings || Number(threshold) === Number(settings.variance_alert_percent ?? 3)) return;
    const value = Number(threshold);
    if (!(value >= 0 && value <= 100)) {
      toast.warning("أدخل نسبة بين 0 و 100");
      setThreshold(String(Number(settings.variance_alert_percent ?? 3)));
      return;
    }
    setSaving(true);
    try {
      setSettings(await inventoryService.updateSettings({ variance_alert_percent: String(value) }));
      toast.success("تم حفظ حد التنبيه");
    } catch (e) {
      setThreshold(String(Number(settings.variance_alert_percent ?? 3)));
      toast.error("تعذّر الحفظ", inventoryErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleNegative = async (value: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, allow_negative_stock: value });
    setSaving(true);
    try {
      setSettings(await inventoryService.updateSettings({ allow_negative_stock: value }));
      toast.success("تم حفظ إعدادات المخزون");
    } catch (e) {
      setSettings(previous);
      toast.error("تعذّر الحفظ", inventoryErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Boxes size={24} className="text-amber-400" />
        إعدادات المخزون
        {saving && <Loader2 size={16} className="animate-spin text-slate-500" />}
      </h3>

      {!settings ? (
        <div className="flex justify-center p-6">
          <Loader2 size={24} className="animate-spin text-red-500" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/30 border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">السماح بالرصيد السالب</p>
              <p className="text-xs text-slate-500 mt-1">
                عند الإيقاف (الافتراضي) تُرفض أي حركة صادرة تجعل رصيد الصنف أقل من صفر. خصم المبيعات لاحقاً لا يوقف الكاشير في كل الأحوال.
              </p>
            </div>
            <Toggle
              checked={settings.allow_negative_stock}
              onChange={toggleNegative}
              disabled={!canManage || saving}
              label={settings.allow_negative_stock ? "مسموح" : "ممنوع"}
            />
          </div>
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/30 border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">حد تنبيه الفرق (فعلي − نظري)</p>
              <p className="text-xs text-slate-500 mt-1">
                في تحليلات المخزون يُعلَّم الصنف بالأحمر إذا زاد استهلاكه الفعلي عن النظري (حسب الوصفات) بأكثر من هذه النسبة.
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                className="w-20 bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm tabular-nums"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                onBlur={saveThreshold}
                disabled={!canManage || saving}
                dir="ltr"
                aria-label="حد تنبيه الفرق بالنسبة المئوية"
              />
              <span className="text-sm text-slate-400 font-bold">%</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5 space-y-3">
            <p className="text-sm font-bold text-white">الجودة والرقابة</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  ["expiry_warning_days", "تنبيه الصلاحية (برتقالي) — أيام", 1],
                  ["expiry_critical_days", "الصلاحية الحرجة (أحمر) — أيام", 1],
                  ["showroom_max_days", "أقصى مدة عرض في المعرض — أيام", 1],
                  ["spice_grams_per_kg", "البهار لكل كغ لحم — غرام", 0.5],
                ] as const
              ).map(([key, label, step]) => (
                <label key={key} className="space-y-1">
                  <span className="block text-[11px] text-slate-500 font-bold">{label}</span>
                  <input
                    type="number"
                    min={0}
                    step={step}
                    defaultValue={String(Number(settings[key] ?? 0))}
                    disabled={!canManage || saving}
                    dir="ltr"
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm tabular-nums"
                    onBlur={async (e) => {
                      if (Number(e.target.value) === Number(settings[key] ?? 0)) return;
                      setSaving(true);
                      try {
                        setSettings(await inventoryService.updateSettings({ [key]: key === "spice_grams_per_kg" ? e.target.value : Number(e.target.value) }));
                        toast.success("تم الحفظ");
                      } catch (err) {
                        toast.error("تعذّر الحفظ", inventoryErrorMessage(err));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  />
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">البهار المفترض = اللحوم المستهلكة (كغ) × هذه الغرامات (30 غ = 1.5 كغ لكل 50 كغ).</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
            <p className="text-sm font-bold text-white">اليوم المحاسبي</p>
            <p className="text-xs text-slate-500 mt-1">
              يبدأ الساعة <bdi className="font-bold text-slate-300">{settings.accounting_day_start}</bdi> بتوقيت{" "}
              <bdi className="font-bold text-slate-300">{settings.business_timezone}</bdi> وينتهي في الساعة نفسها من اليوم التالي.
              كل تقارير وفلاتر المخزون تعمل به.
            </p>
          </div>
          {!canManage && (
            <p className="text-[11px] text-slate-500 font-semibold">للعرض فقط — تعديل الإعدادات يحتاج صلاحية "إدارة إعدادات المخزون".</p>
          )}
        </div>
      )}
    </div>
  );
};
