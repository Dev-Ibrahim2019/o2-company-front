import { AlertTriangle, Inbox, LoaderCircle, LockKeyhole } from "lucide-react";

export function CrmState({ kind, title, detail, retry }: { kind: "loading" | "empty" | "error" | "forbidden"; title: string; detail?: string; retry?: () => void }) {
  const Icon = kind === "loading" ? LoaderCircle : kind === "empty" ? Inbox : kind === "forbidden" ? LockKeyhole : AlertTriangle;
  return <div className="crm-state" role={kind === "error" ? "alert" : "status"}>
    <Icon className={kind === "loading" ? "crm-spin" : ""} aria-hidden />
    <strong>{title}</strong>{detail && <p>{detail}</p>}
    {retry && <button className="crm-button" onClick={retry}>إعادة المحاولة</button>}
  </div>;
}
export const getCrmError = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const messages: Record<number, string> = {
    401: "انتهت الجلسة. سجّل الدخول مجددًا.", 403: "لا تملك صلاحية عرض هذه البيانات.",
    404: "تعذر العثور على السجل المطلوب.", 409: "تعذر إتمام الطلب بسبب تعارض في البيانات.",
    422: "تحقق من القيم المدخلة ثم حاول مجددًا.", 500: "حدث خطأ في الخادم. حاول بعد قليل.",
  };
  return { status, message: messages[status ?? 0] ?? "تعذر الاتصال بالخدمة. تحقق من الشبكة وحاول مجددًا." };
};
export function StatusChip({ value }: { value?: string | null }) {
  const label: Record<string, string> = { active: "نشط", inactive: "غير نشط", blocked: "محظور", vip: "مميز", open: "مفتوحة", closed: "مغلقة" };
  return <span className={`crm-chip crm-chip--${value || "neutral"}`}>{label[value || ""] || value || "غير محدد"}</span>;
}
