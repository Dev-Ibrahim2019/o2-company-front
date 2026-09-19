import {
  AlertTriangle, BarChart3, Building2, Clock, Gift, KeyRound, Loader2, Power, ShieldAlert, Target, UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmConfirmDialog, CrmPageHeader, CrmSwitch } from "./customers-ui";
import "./customers-ui/crmx.css";
import type { CrmSettings } from "./types";

function apiErrorMessage(e: unknown): string {
  const data = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const fieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return fieldError || data?.message || getCrmError(e).message;
}

const QUICK_LINKS = [
  { to: "/admin/crm/reports", icon: BarChart3, title: "التقارير والتحليلات", description: "الإيرادات، التنبيهات، ولوحة دعم القرار." },
  { to: "/admin/crm/orders/delayed", icon: Clock, title: "حدّ تأخر الطلبات", description: "بعد كم دقيقة يُعتبر الطلب النشط متأخرًا ويُرسَل تنبيه." },
  { to: "/admin/crm/loyalty", icon: Gift, title: "برنامج الولاء", description: "قواعد نقاط الولاء والاستثناءات." },
  { to: "/admin/crm/groups", icon: Building2, title: "مجموعات العملاء", description: "إنشاء المجموعات وتصنيف العملاء." },
  { to: "/admin/crm/identity-conflicts", icon: ShieldAlert, title: "تعارضات الهوية", description: "طابور مراجعة الأرقام المكررة يدويًا." },
  { to: "/admin/crm/staff-permissions", icon: KeyRound, title: "صلاحيات الفريق", description: "منح ومنع صلاحيات كل موظف في CRM." },
];

const COMING_SOON = [
  "اسم افتراضي للمطعم ولغة تواصل تُستخدم في رسائل SMS/بريد للعملاء — بانتظار بناء نظام قوالب رسائل فعلي.",
  "حقول بيانات مخصّصة لملف العميل.",
  "الوسوم (Tags) الحرة على العملاء.",
  "تكاملات مع خدمات خارجية (واتساب، بريد، مزوّدات SMS).",
];

export function CrmSettingsPage() {
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<keyof CrmSettings | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const [revenueTargetDraft, setRevenueTargetDraft] = useState("");
  const [cancellationTargetDraft, setCancellationTargetDraft] = useState("");
  const [savingTargets, setSavingTargets] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const data = await crmApi.crmSettings();
      setSettings(data);
      setRevenueTargetDraft(data.monthly_revenue_target != null ? String(data.monthly_revenue_target) : "");
      setCancellationTargetDraft(data.max_cancellation_rate_pct != null ? String(data.max_cancellation_rate_pct) : "");
      setState("ready");
    } catch (e) {
      setError(getCrmError(e).message);
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<CrmSettings>, key: keyof CrmSettings) => {
    setSavingKey(key);
    try {
      const updated = await crmApi.updateCrmSettings(patch);
      setSettings(updated);
      toast.success("تم حفظ الإعداد");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSavingKey(null);
    }
  };

  const targetsDirty = settings
    ? revenueTargetDraft !== (settings.monthly_revenue_target != null ? String(settings.monthly_revenue_target) : "")
      || cancellationTargetDraft !== (settings.max_cancellation_rate_pct != null ? String(settings.max_cancellation_rate_pct) : "")
    : false;

  const saveTargets = async () => {
    setSavingTargets(true);
    try {
      const updated = await crmApi.updateCrmSettings({
        monthly_revenue_target: revenueTargetDraft.trim() === "" ? null : Number(revenueTargetDraft),
        max_cancellation_rate_pct: cancellationTargetDraft.trim() === "" ? null : Number(cancellationTargetDraft),
      });
      setSettings(updated);
      setRevenueTargetDraft(updated.monthly_revenue_target != null ? String(updated.monthly_revenue_target) : "");
      setCancellationTargetDraft(updated.max_cancellation_rate_pct != null ? String(updated.max_cancellation_rate_pct) : "");
      toast.success("تم حفظ الأهداف");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSavingTargets(false);
    }
  };

  if (state === "loading") return <div className="crmx-root"><CrmState kind="loading" title="جارٍ تحميل الإعدادات..." /></div>;
  if (state === "error" || !settings) return <div className="crmx-root"><CrmState kind="error" title="تعذر تحميل الإعدادات" detail={error} retry={load} /></div>;

  return (
    <div className="crmx-root space-y-6" dir="rtl">
      <CrmPageHeader
        title="إعدادات CRM"
        description="مفتاحان فقط لهما تأثير فعلي حقيقي على النظام — كل ما عداهما إما رابط لشاشة قائمة فعلاً، أو ميزة غير مبنية بعد ومعروضة بصراحة كذلك."
        breadcrumb="CRM / الإدارة"
      />

      {!settings.enabled && (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--crmx-danger)]/30 bg-[var(--crmx-danger-soft)] p-4">
          <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--crmx-danger-text)]" />
          <p className="text-[13px] font-bold text-[var(--crmx-danger-text)]">
            وحدة CRM معطّلة حاليًا — كل موظفي الفريق يفقدون الوصول إليها فورًا، ولا يبقى مسموحًا لك بالدخول سوى من هذه الشاشة.
          </p>
        </div>
      )}

      {/* ── الإعدادات العامة ── */}
      <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
        <h2 className="mb-4 text-[14px] font-extrabold text-[var(--crmx-text)]">الإعدادات العامة</h2>

        <div className="flex items-center justify-between gap-4 border-b border-[var(--crmx-border)] pb-4">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${settings.enabled ? "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]" : "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]"}`}>
              <Power className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13.5px] font-bold text-[var(--crmx-text)]">تفعيل نظام CRM بالكامل</p>
              <p className="mt-0.5 max-w-md text-[12px] text-[var(--crmx-text-secondary)]">
                تعطيله يمنع كل موظفي CRM (كول سنتر، مدراء CRM) من الوصول لأي شاشة فورًا. أنت فقط (بصلاحية إدارة الإعدادات) تبقى قادرًا على الدخول لإعادة تفعيلها.
              </p>
            </div>
          </div>
          <CrmSwitch
            checked={settings.enabled}
            disabled={savingKey === "enabled"}
            tone="success"
            onChange={() => (settings.enabled ? setConfirmDisable(true) : save({ enabled: true }, "enabled"))}
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-info-soft)] text-[var(--crmx-info)]">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13.5px] font-bold text-[var(--crmx-text)]">التسجيل التلقائي لعملاء الكاشير</p>
              <p className="mt-0.5 max-w-md text-[12px] text-[var(--crmx-text-secondary)]">
                عند إغلاقه، لا يُنشئ الكاشير عميلاً جديدًا تلقائيًا عند إدخال اسم وهاتف غير معروفين — تكتمل عملية البيع كطلب "حضور مباشر" غير مرتبط بعميل. لا يؤثر على الكول سنتر (يحتاج دائمًا عميلاً حقيقيًا لعنوان التوصيل).
              </p>
            </div>
          </div>
          <CrmSwitch
            checked={settings.auto_register_pos_customers}
            disabled={savingKey === "auto_register_pos_customers"}
            tone="success"
            onChange={() => save({ auto_register_pos_customers: !settings.auto_register_pos_customers }, "auto_register_pos_customers")}
          />
        </div>
      </div>

      {/* ── أهداف التقارير ── */}
      <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
        <div className="mb-1 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent-text)]">
            <Target className="h-4.5 w-4.5" />
          </span>
          <h2 className="text-[14px] font-extrabold text-[var(--crmx-text)]">أهداف التقارير</h2>
        </div>
        <p className="mb-4 mr-11.5 text-[12px] text-[var(--crmx-text-secondary)]">
          اختياريان — بدونهما تعرض صفحة التقارير الاتجاهات فقط دون مقارنة بهدف. عند ضبطهما، تُبنى عليهما تنبيهات حقيقية (تجاوز حد الإلغاء، مقارنة الإيراد بالمستهدف).
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-bold text-[var(--crmx-text-secondary)]">الإيراد الشهري المستهدف (ريال)</label>
            <input
              type="number" min={0} step={100}
              value={revenueTargetDraft}
              onChange={(e) => setRevenueTargetDraft(e.target.value)}
              placeholder="بدون هدف"
              className="h-10 w-full rounded-lg border border-[var(--crmx-border)] bg-white px-3 text-[13.5px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-bold text-[var(--crmx-text-secondary)]">أقصى معدل إلغاء مسموح (%)</label>
            <input
              type="number" min={0} max={100} step={0.5}
              value={cancellationTargetDraft}
              onChange={(e) => setCancellationTargetDraft(e.target.value)}
              placeholder="بدون حد"
              className="h-10 w-full rounded-lg border border-[var(--crmx-border)] bg-white px-3 text-[13.5px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
            />
          </div>
        </div>
        <button
          onClick={saveTargets}
          disabled={!targetsDirty || savingTargets}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 py-2.5 text-[13px] font-bold text-white transition-opacity disabled:opacity-40"
        >
          {savingTargets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          حفظ الأهداف
        </button>
      </div>

      {/* ── روابط سريعة لإعدادات فعلية موجودة أصلاً ── */}
      <div>
        <h2 className="mb-3 text-[14px] font-extrabold text-[var(--crmx-text)]">إعدادات أخرى موجودة فعلاً</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ to, icon: Icon, title, description }) => (
            <Link
              key={to}
              to={to}
              className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 transition-colors hover:border-[var(--crmx-primary)]"
            >
              <span className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <p className="text-[13px] font-bold text-[var(--crmx-text)]">{title}</p>
              <p className="mt-1 text-[11.5px] text-[var(--crmx-text-muted)]">{description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── قريبًا ── */}
      <div className="rounded-2xl border border-dashed border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--crmx-text-muted)]" />
          <h2 className="text-[13.5px] font-extrabold text-[var(--crmx-text)]">قريبًا — غير مبنية بعد</h2>
        </div>
        <ul className="space-y-2">
          {COMING_SOON.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[12.5px] text-[var(--crmx-text-secondary)]">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--crmx-text-muted)]" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <CrmConfirmDialog
        open={confirmDisable}
        title="تعطيل وحدة CRM بالكامل؟"
        description="سيفقد كل موظفي فريق CRM الوصول فورًا. يمكنك إعادة تفعيلها من هذه الشاشة نفسها في أي وقت."
        confirmLabel={savingKey === "enabled" ? "جارٍ التعطيل..." : "تعطيل الوحدة"}
        busy={savingKey === "enabled"}
        danger
        onConfirm={async () => { await save({ enabled: false }, "enabled"); setConfirmDisable(false); }}
        onCancel={() => setConfirmDisable(false)}
      />
    </div>
  );
}
