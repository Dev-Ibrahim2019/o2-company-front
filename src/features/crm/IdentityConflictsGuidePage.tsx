import {
  Ban, ChevronLeft, PenSquare, ShieldAlert, ShieldCheck, TriangleAlert, UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CrmPageHeader, GuideRow } from "./customers-ui";

/**
 * دليل التعامل مع تعارضات الهوية — a static reference, same purpose and same
 * visual language as ComplaintsGuidePage: one place every reviewer reads the
 * same meaning into a ticket status and a resolution, described in the exact
 * words IdentityConflictsPage uses (STATUS_LABELS / RESOLUTION_LABELS there),
 * so the guide can never drift from the screen it explains.
 */

const STATUS_ROWS: Array<{ pill: string; tone: string; description: string }> = [
  {
    pill: "مفتوحة",
    tone: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
    description: "لم تُراجع بعد. الطلب الوارد يبقى غير مرتبط بعميل محدد حتى يُتخذ قرار.",
  },
  {
    pill: "تمت المعالجة",
    tone: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
    description: "اتُّخذ قرار فعلي — إبقاء، تحديث، أو رقم مشترك — ووُثّق أثره على سجلات العميل.",
  },
  {
    pill: "مُهمَلة",
    tone: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]",
    description: "أُغلقت التذكرة دون أي إجراء على البيانات — للتذاكر الاختبارية أو خطأ الإدخال الواضح فقط.",
  },
];

const DECISION_ROWS: Array<{
  icon: React.ReactNode;
  label: string;
  tone: string;
  when: string;
  effect: string;
}> = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    label: "إبقاء الاسم الأصلي",
    tone: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
    when: "الاسمان يخصان شخصاً واحداً — كنية، اسم مختصر، أو فرق إملائي بسيط لا يستدعي تعديل السجل.",
    effect: "لا تغيير على اسم العميل أو أي من بياناته الأخرى. تُغلَق التذكرة «تمت المعالجة» وتُوثَّق المراجعة والملاحظة فقط.",
  },
  {
    icon: <PenSquare className="h-5 w-5" />,
    label: "تحديث الاسم الرسمي",
    tone: "bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]",
    when: "الاسم الوارد في الطلب هو الصحيح، والاسم المسجَّل قديم أو أُدخل خطأً من البداية.",
    effect: "يُستبدَل اسم العميل في ملفه وكل السجلات المرتبطة (الطلبات، الفواتير) بالاسم الوارد. لا يتغيّران: رقم الهاتف ومعرّف العميل (CUS-xxxxxx).",
  },
  {
    icon: <UserPlus className="h-5 w-5" />,
    label: "رقم مشترك — عميل منفصل",
    tone: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
    when: "شخصان مختلفان فعلاً يشتركان بنفس الرقم — كأفراد العائلة الواحدة أو خط هاتف مشترك بمقر عمل.",
    effect: "يُنشأ عميل جديد بالاسم الوارد ويرتبط الطلب الوارد به بدل العميل الأصلي. يُعلَّم الرقم «مشترك» فيتحقّص النظام تلقائياً من تكرار التعارض مستقبلاً لكلا العميلين.",
  },
  {
    icon: <Ban className="h-5 w-5" />,
    label: "تجاهل",
    tone: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]",
    when: "لا محل لها — بيانات اختبار أو خطأ إدخال واضح لا يستحق مراجعة فعلية.",
    effect: "تُغلَق التذكرة «مُهمَلة» دون أي تغيير على أي سجل — تبقى محفوظة فقط للرجوع إليها عند الحاجة.",
  },
];

export function IdentityConflictsGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <div>
        <button
          onClick={() => navigate("/admin/crm/identity-conflicts")}
          className="mb-1 flex items-center gap-1 text-[12px] font-bold text-[var(--crmx-text-muted)] transition hover:text-[var(--crmx-primary)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> تعارضات الهوية
        </button>
        <CrmPageHeader
          title="دليل التعامل مع تعارضات الهوية"
          description="مرجع سريع لكل من يراجع تذاكر التعارض: متى يُفتح التعارض، ماذا تعني كل حالة، وماذا يحدث فعلياً في بيانات العميل عند اختيار كل قرار — حتى يكون كل قرار واثقاً وقابلاً للتنفيذ دون رجوع."
        />
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5 shadow-[var(--crmx-shadow-sm)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-[15px] font-extrabold text-[var(--crmx-text)]">متى يُفتح تعارض الهوية؟</h2>
          <p className="mt-1.5 text-[13px] leading-6 text-[var(--crmx-text-secondary)]">
            حين يَرِد رقم هاتف في طلب جديد من أي قناة (كاشير فوري، كاشير عائلات، كول سنتر، الموقع) — وهذا الرقم
            مسجّل مسبقاً لعميل باسم مختلف عن الاسم المكتوب في الطلب. النظام لا يُقرر بنفسه أي الاسمين صحيح؛
            الاسم المحفوظ يبقى المعتمد وقت الطلب نفسه، ويُفتح تذكرة تنتظر مراجعة بشرية — فقط يوثّق ما يعنيه
            الاختلاف لسجل العميل مستقبلاً.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {STATUS_ROWS.map((s) => (
          <div key={s.pill} className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5 shadow-[var(--crmx-shadow-sm)]">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold ${s.tone}`}>{s.pill}</span>
            <p className="mt-3 text-[12.5px] leading-6 text-[var(--crmx-text-secondary)]">{s.description}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-[16px] font-extrabold text-[var(--crmx-text)]">القرارات الأربعة وأثرها على بيانات العميل</h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {DECISION_ROWS.map((d) => (
            <div key={d.label} className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5 shadow-[var(--crmx-shadow-sm)]">
              <div className="mb-3 flex items-center gap-2.5">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${d.tone}`}>{d.icon}</span>
                <h3 className="text-[14.5px] font-extrabold text-[var(--crmx-text)]">{d.label}</h3>
              </div>
              <GuideRow pill={<span className="text-[11px] font-bold text-[var(--crmx-text-muted)]">متى تُستخدم</span>} description={d.when} />
              <GuideRow pill={<span className="text-[11px] font-bold text-[var(--crmx-text-muted)]">ماذا يحدث في النظام</span>} description={d.effect} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-[var(--crmx-warning)]/30 bg-[var(--crmx-warning-soft)] p-4">
        <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--crmx-warning-text)]" />
        <p className="text-[12.5px] leading-6 text-[var(--crmx-warning-text)]">
          <span className="font-extrabold">قرار نهائي: </span>
          كل قرار يُسجَّل باسم المستخدم ووقت المراجعة في سجل العميل، ولا تُتيح هذه الشاشة وقت الرجوع عنه. عميل
          مرتبط بطلب لا يُعاد ربطه بعميل آخر لاحقاً — لتغيير ذلك تُستخدم شاشة ملف العميل مباشرة.
        </p>
      </div>
    </div>
  );
}
