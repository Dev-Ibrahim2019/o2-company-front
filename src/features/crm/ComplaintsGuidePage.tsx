import { ChevronLeft, ClipboardList, Flame, Layers, ShieldAlert, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  COMPLAINT_CHANNEL_DESCRIPTIONS, COMPLAINT_CHANNEL_LABELS, COMPLAINT_DEPARTMENT_DESCRIPTIONS,
  COMPLAINT_DEPARTMENT_LABELS, COMPLAINT_PILL, COMPLAINT_PRIORITY_DESCRIPTIONS,
  COMPLAINT_PRIORITY_TONE, COMPLAINT_SEVERITY_DESCRIPTIONS, COMPLAINT_SEVERITY_TONE,
  COMPLAINT_STATUS_DESCRIPTIONS, COMPLAINT_STATUS_TONE, CrmPageHeader,
} from "./customers-ui";
import type {
  CrmComplaintChannel, CrmComplaintDepartment, CrmComplaintPriority,
  CrmComplaintSeverity, CrmComplaintStatus,
} from "./types";

/**
 * دليل حالات وشارات الشكاوى — a static reference so every agent reads the same
 * meaning into a status, a priority or a severity badge. Pure display: it maps
 * over the same label/tone tables the working screens use, plus a description
 * string per key, so the guide can never drift from the pills it explains.
 */

const STATUS_ORDER: CrmComplaintStatus[] = [
  "new", "open", "in_progress", "waiting_customer", "resolved", "closed", "cancelled",
];
const PRIORITY_ORDER: CrmComplaintPriority[] = ["low", "normal", "high", "critical"];
const SEVERITY_ORDER: CrmComplaintSeverity[] = ["info", "warning", "critical"];
const CHANNEL_ORDER: CrmComplaintChannel[] = ["call_center", "crm", "website"];
const DEPARTMENT_ORDER = Object.keys(COMPLAINT_DEPARTMENT_LABELS) as CrmComplaintDepartment[];

function GuideCard({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5 shadow-[var(--crmx-shadow-sm)]">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]">
          {icon}
        </span>
        <div>
          <h2 className="text-[15px] font-extrabold text-[var(--crmx-text)]">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--crmx-text-secondary)]">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function GuideRow({ pill, description }: { pill: React.ReactNode; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[var(--crmx-neutral-soft)] px-3 py-2.5">
      <span className="shrink-0 pt-0.5">{pill}</span>
      <p className="text-[12.5px] leading-6 text-[var(--crmx-text-secondary)]">{description}</p>
    </div>
  );
}

export function ComplaintsGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <div>
        <button
          onClick={() => navigate("/admin/crm/complaints")}
          className="mb-1 flex items-center gap-1 text-[12px] font-bold text-[var(--crmx-text-muted)] transition hover:text-[var(--crmx-primary)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> الشكاوى
        </button>
        <CrmPageHeader
          title="دليل حالات وشارات الشكاوى"
          description="مرجع موحّد لمعاني الحالات والأولوية والخطورة وأنواع الشكاوى — حتى يقرأ كل الفريق الشارة نفسها بالمعنى نفسه."
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <GuideCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="حالة الشكوى — مسار المعالجة"
          subtitle="الحالة تتحرك عبر هذا المسار فقط؛ لا يمكن القفز بين الحالات عشوائياً."
        >
          {STATUS_ORDER.map((s) => (
            <GuideRow
              key={s}
              pill={<span className={`${COMPLAINT_PILL} ${COMPLAINT_STATUS_TONE[s].tone}`}>{COMPLAINT_STATUS_TONE[s].label}</span>}
              description={COMPLAINT_STATUS_DESCRIPTIONS[s]}
            />
          ))}
        </GuideCard>

        <GuideCard
          icon={<Flame className="h-5 w-5" />}
          title="الأولوية"
          subtitle="تقيس سرعة الاستجابة المطلوبة — لا حجم المشكلة نفسها."
        >
          {PRIORITY_ORDER.map((p) => (
            <GuideRow
              key={p}
              pill={<span className={`${COMPLAINT_PILL} ${COMPLAINT_PRIORITY_TONE[p].tone}`}>{COMPLAINT_PRIORITY_TONE[p].label}</span>}
              description={COMPLAINT_PRIORITY_DESCRIPTIONS[p]}
            />
          ))}
        </GuideCard>

        <GuideCard
          icon={<ShieldAlert className="h-5 w-5" />}
          title="الخطورة والعلامة الخاصة"
          subtitle="الخطورة تقيس حجم الضرر الفعلي. العلامة الخاصة «حساسة» تقيّد من يرى الشكوى."
        >
          {SEVERITY_ORDER.map((s) => (
            <GuideRow
              key={s}
              pill={<span className={`${COMPLAINT_PILL} ${COMPLAINT_SEVERITY_TONE[s].tone}`}>{COMPLAINT_SEVERITY_TONE[s].label}</span>}
              description={COMPLAINT_SEVERITY_DESCRIPTIONS[s]}
            />
          ))}
          <GuideRow
            pill={
              <span className={`${COMPLAINT_PILL} gap-1 bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]`}>
                <ShieldAlert className="h-3 w-3" /> حساسة
              </span>
            }
            description="علامة خاصة لا علاقة لها بالمسار: تُخفي الشكوى عن كل من لا يملك صلاحية «الاطلاع على الملاحظات الحساسة»، ويقتصر تعديلها على أصحاب هذه الصلاحية."
          />
        </GuideCard>

        <GuideCard
          icon={<Tag className="h-5 w-5" />}
          title="نوع الشكوى"
          subtitle="من أين وصلت الشكوى، وهل تخص عميلاً بعينه أم هي ملاحظة عامة."
        >
          <GuideRow
            pill={<span className={`${COMPLAINT_PILL} bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]`}>شكوى خاصة بعميل</span>}
            description="مرتبطة بسجل عميل محدّد (وغالباً بطلب أو صنف بعينه)، وتظهر ضمن ملف ذلك العميل تحت تبويب الشكاوى."
          />
          <GuideRow
            pill={<span className={`${COMPLAINT_PILL} bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]`}>شكوى عامة</span>}
            description="ملاحظة تشغيلية لا تخص عميلاً واحداً — نمط متكرّر أو خلل في الخدمة يُتابَع على مستوى القسم."
          />
          <div className="mt-4 border-t border-[var(--crmx-border)] pt-3">
            <p className="mb-2 text-[12px] font-bold text-[var(--crmx-text-muted)]">القناة</p>
            <div className="space-y-2.5">
              {CHANNEL_ORDER.map((c) => (
                <GuideRow
                  key={c}
                  pill={<span className={`${COMPLAINT_PILL} bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]`}>{COMPLAINT_CHANNEL_LABELS[c]}</span>}
                  description={COMPLAINT_CHANNEL_DESCRIPTIONS[c]}
                />
              ))}
            </div>
          </div>
        </GuideCard>

        <GuideCard
          icon={<Layers className="h-5 w-5" />}
          title="القسم المسؤول"
          subtitle="تصنيف تحليلي يوجّه الشكوى للفريق المعني ويغذّي رسم «تركّز الشكاوى حسب القسم»."
        >
          {DEPARTMENT_ORDER.map((d) => (
            <GuideRow
              key={d}
              pill={<span className={`${COMPLAINT_PILL} bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]`}>{COMPLAINT_DEPARTMENT_LABELS[d]}</span>}
              description={COMPLAINT_DEPARTMENT_DESCRIPTIONS[d]}
            />
          ))}
        </GuideCard>

        <GuideCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="قاعدة الإسناد"
          subtitle="من يعمل على الشكوى، ومتى تلتصق به، ومن يقرّر تحويلها."
        >
          <GuideRow
            pill={<span className={`${COMPLAINT_PILL} bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]`}>مسك الشكوى</span>}
            description="أي موظف يملك صلاحية معالجة الشكاوى يستطيع «مسك» شكوى غير مُسندة فتُسنَد إليه. كما أن بدء المعالجة (فتح / قيد المعالجة) يُسند الشكوى تلقائياً لمن بدأها إن لم تكن مُسندة."
          />
          <GuideRow
            pill={<span className={`${COMPLAINT_PILL} bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]`}>تلتصق به</span>}
            description="بمجرد أن تُسند الشكوى لموظف تبقى معه حتى يُغلقها؛ لا يستطيع رفعها عن نفسه ولا إعادتها للطابور — وهذا يدخل في تقييم أدائه."
          />
          <GuideRow
            pill={<span className={`${COMPLAINT_PILL} bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]`}>مدير CRM</span>}
            description="تحويل الشكوى من موظف لآخر، أو رفع الإسناد عنه، من صلاحية مدير قسم CRM وحده."
          />
          <GuideRow
            pill={<span className={`${COMPLAINT_PILL} bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]`}>إشعار</span>}
            description="يصل إشعار للمدير عند مسك الشكوى أو حلّها أو إلغائها، وإشعار للموظف عند إسناد شكوى إليه أو رفعها عنه."
          />
        </GuideCard>
      </div>
    </div>
  );
}
