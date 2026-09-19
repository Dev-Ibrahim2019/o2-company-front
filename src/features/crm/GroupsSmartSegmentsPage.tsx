import {
  AlertCircle, Check, RotateCcw, Sparkles, Star,
  TrendingUp, User as UserIcon, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmPageHeader } from "./customers-ui";
import { num } from "./format";
import { GROUP_COLOR_SWATCH, GROUP_TYPE_LABELS } from "./GroupsPage";
import { CRM_GROUP_COLORS } from "./types";
import type { CrmGroupColor, CrmGroupSmartSuggestion, CrmGroupType } from "./types";

const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";
const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

const SUGGESTION_ICON: Record<CrmGroupSmartSuggestion["key"], typeof Star> = {
  vip_spend: Star,
  reactivation: AlertCircle,
  frequent: TrendingUp,
};

/** Confidence tiers — a real computed share (see backend), tinted like every other CRM confidence-style metric. */
function confidenceTone(confidence: number): { label: string; badge: string; border: string } {
  if (confidence >= 70) return { label: "ثقة عالية", badge: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]", border: "var(--crmx-success)" };
  if (confidence >= 40) return { label: "ثقة متوسطة", badge: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]", border: "var(--crmx-warning)" };
  return { label: "ثقة أولية", badge: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]", border: "var(--crmx-border)" };
}

/** The small popup that names/types/colours a suggestion before it becomes a real group. */
function ApplySuggestionModal({
  suggestion, saving, onClose, onConfirm,
}: {
  suggestion: CrmGroupSmartSuggestion;
  saving: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string; group_type: CrmGroupType; color?: CrmGroupColor | null }) => void;
}) {
  const [name, setName] = useState(suggestion.title);
  const [groupType, setGroupType] = useState<CrmGroupType>(suggestion.suggested_group_type);
  const [color, setColor] = useState<CrmGroupColor | null>(null);

  return (
    <div className="crmx-root fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="إنشاء مجموعة من اقتراح">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onClose} />
      <div dir="rtl" className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-md)]">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">إنشاء مجموعة من الاقتراح</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-5 px-5 py-4">
          <p className="rounded-xl bg-[var(--crmx-neutral-soft)] px-3.5 py-2.5 text-[12.5px] text-[var(--crmx-text-secondary)]">
            سيتم إنشاء مجموعة جديدة وإسناد <strong className="text-[var(--crmx-text)]">{num(suggestion.matched_count)}</strong> عميلاً مطابقاً إليها مباشرة.
          </p>
          <div>
            <label className={labelCls}>اسم المجموعة</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={255} autoFocus />
          </div>
          <div>
            <label className={labelCls}>النوع</label>
            <select className={inputCls} value={groupType} onChange={(e) => setGroupType(e.target.value as CrmGroupType)}>
              {(Object.keys(GROUP_TYPE_LABELS) as CrmGroupType[]).map((v) => (
                <option key={v} value={v}>{GROUP_TYPE_LABELS[v]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>لون المجموعة</label>
            <div className="flex flex-wrap gap-2.5">
              {CRM_GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  aria-pressed={color === c}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: GROUP_COLOR_SWATCH[c], outline: color === c ? "2px solid var(--crmx-text)" : undefined, outlineOffset: 2 }}
                >
                  {color === c && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            disabled={saving || !name.trim()}
            onClick={() => onConfirm({ name: name.trim(), group_type: groupType, color })}
            className="h-11 flex-1 rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جارٍ الإنشاء..." : "إنشاء المجموعة"}
          </button>
          <button onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-[var(--crmx-border)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]">
            إلغاء
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * "التصنيف الذكي للعملاء" — rule-based, real-data segment suggestions.
 *
 * Deliberately not framed as machine-learning anywhere in the copy: every
 * suggestion here is a plain, reproducible SQL rule over real Customer/Order
 * data (CustomerGroupController::smartSuggestions()), and "confidence" is a
 * second, stricter pass of that same rule — not a cosmetic score. The
 * methodology card at the bottom says exactly that, so a manager acting on
 * a suggestion knows precisely what it means.
 */
export function GroupsSmartSegmentsPage() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<CrmGroupSmartSuggestion[]>();
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<CrmGroupSmartSuggestion | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError(null);
    try {
      setSuggestions(await crmApi.groupSmartSuggestions());
    } catch (e) {
      setError(getCrmError(e));
    }
  };

  useEffect(() => { void load(); }, []);

  const apply = async (data: { name: string; group_type: CrmGroupType; color?: CrmGroupColor | null }) => {
    if (!applying) return;
    setSaving(true);
    try {
      const group = await crmApi.applyGroupSmartSuggestion({ key: applying.key, ...data });
      toast.success("تم إنشاء المجموعة", `تمت إضافة ${applying.matched_count} عميلاً إليها`);
      setApplying(null);
      navigate(`/admin/crm/groups/${group.id}`);
    } catch (e) {
      toast.error("تعذّر إنشاء المجموعة", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const visible = (suggestions ?? []).filter((s) => !dismissed.has(s.key));

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader
        title="التصنيف الذكي للعملاء"
        description="اقتراحات مجموعات مبنية على سلوك شراء حقيقي — كل رقم هنا محسوب من طلبات فعلية، وليس تقديراً."
        actions={
          <Link
            to="/admin/crm/groups"
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            المجموعات
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--crmx-navy)] p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-[var(--crmx-primary)] px-2 py-0.5 text-[11px] font-bold">تحليل تلقائي</span>
            </div>
            <h2 className="text-[17px] font-bold">اقتراحات مبنية على بيانات المشتريات الفعلية</h2>
            <p className="mt-1 max-w-xl text-[13px] text-white/70">
              نحسب هذه المجموعات من إنفاق العملاء الحقيقي وتكرار طلباتهم — لا نماذج ذكاء اصطناعي، فقط قواعد واضحة يمكن التحقق منها.
            </p>
          </div>
        </div>
        <button
          onClick={() => { setSuggestions(undefined); void load(); }}
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-white/10 px-3.5 text-[13px] font-bold text-white transition hover:bg-white/20"
        >
          <RotateCcw className="h-3.5 w-3.5" /> تحديث التحليل
        </button>
      </div>

      {error ? (
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      ) : suggestions === undefined ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="crmx-skeleton h-44 w-full rounded-2xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <Sparkles className="h-8 w-8 text-[var(--crmx-text-muted)]" />
          <p className="text-[15px] font-bold text-[var(--crmx-text)]">لا توجد اقتراحات حالياً</p>
          <p className="max-w-sm text-[13px] text-[var(--crmx-text-secondary)]">
            إما أن كل العملاء المتاحين مصنَّفون بالفعل، أو أن سجل الطلبات ما زال صغيراً جداً لاستخراج نمط واضح منه.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map((s) => {
            const Icon = SUGGESTION_ICON[s.key];
            const tone = confidenceTone(s.confidence);
            return (
              <div key={s.key} className={`${cardCls} border-e-4 p-5`} style={{ borderInlineEndColor: tone.border }}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold ${tone.badge}`}>
                    {tone.label} · {num(s.confidence)}٪
                  </span>
                </div>
                <h3 className="text-[15px] font-bold text-[var(--crmx-text)]">{s.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--crmx-text-secondary)]">{s.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--crmx-text-muted)]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--crmx-neutral-soft)] px-2 py-1 font-bold text-[var(--crmx-text-secondary)]">
                    <UserIcon className="h-3 w-3" /> {num(s.matched_count)} عميل مقترح
                  </span>
                  {s.sample_names.slice(0, 2).map((n) => (
                    <span key={n} className="truncate rounded-full bg-[var(--crmx-neutral-soft)] px-2 py-1">{n}</span>
                  ))}
                  {s.matched_count > s.sample_names.slice(0, 2).length && (
                    <span>و{num(s.matched_count - s.sample_names.slice(0, 2).length)} آخرين</span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setApplying(s)}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--crmx-primary)] text-[13px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
                  >
                    <Check className="h-3.5 w-3.5" /> إنشاء المجموعة
                  </button>
                  <button
                    onClick={() => setDismissed((prev) => new Set(prev).add(s.key))}
                    className="h-10 rounded-xl border border-[var(--crmx-border)] px-3.5 text-[13px] font-bold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
                  >
                    تجاهل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={`${cardCls} p-5`}>
        <h3 className="mb-3 text-[14px] font-bold text-[var(--crmx-text)]">كيف نحسب هذه الاقتراحات؟</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-2.5">
            <Star className="mt-0.5 h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
            <p className="text-[12.5px] leading-relaxed text-[var(--crmx-text-secondary)]"><strong className="text-[var(--crmx-text)]">إنفاق مرتفع:</strong> أعلى 25٪ من العملاء بإجمالي الطلبات المدفوعة.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
            <p className="text-[12.5px] leading-relaxed text-[var(--crmx-text-secondary)]"><strong className="text-[var(--crmx-text)]">إعادة تنشيط:</strong> عملاء بطلبين سابقين فأكثر، بلا طلب منذ 45 يوماً.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
            <p className="text-[12.5px] leading-relaxed text-[var(--crmx-text-secondary)]"><strong className="text-[var(--crmx-text)]">شراء متكرر:</strong> ثلاثة طلبات فأكثر خلال آخر 90 يوماً.</p>
          </div>
        </div>
        <p className="mt-4 border-t border-[var(--crmx-border)] pt-3 text-[12px] text-[var(--crmx-text-muted)]">
          نسبة "الثقة" تعبّر عن حصة العملاء المطابقين الذين يتجاوزون المعيار بوضوح (وليس بالحد الأدنى فقط) — كلما زادت، كان الاقتراح أوضح.
        </p>
      </div>

      {applying && (
        <ApplySuggestionModal suggestion={applying} saving={saving} onClose={() => setApplying(null)} onConfirm={apply} />
      )}
    </div>
  );
}
