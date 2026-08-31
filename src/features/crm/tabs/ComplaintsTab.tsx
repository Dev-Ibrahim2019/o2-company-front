import { Plus, ShieldAlert, ShieldOff } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../auth";
import { CRM_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../../components/shared/Toast";
import { crmApi } from "../api";
import { ComplaintDrawer } from "../ComplaintDrawer";
import { ComplaintFormDrawer } from "../ComplaintFormDrawer";
import { ComplaintStatusControl } from "../ComplaintStatusControl";
import { getCrmError } from "../components";
import type {
  CrmComplaintChannel, CrmComplaintCreateInput, CrmComplaintPriority,
  CrmComplaintStatus, CrmId,
} from "../types";
import {
  COMPLAINT_CHANNEL_LABELS, COMPLAINT_PILL, COMPLAINT_PRIORITY_TONE, COMPLAINT_STATUS_TONE,
} from "../customers-ui";
import { DomainTable, SectionFrame, date, text, unwrapRows, useCrmSection } from "./shared";

/**
 * Prefer the server's own sentence over a generic one.
 *
 * getCrmError() maps a status code to a fixed phrase and drops the response
 * body, which turns the lifecycle guard's "لا يمكن نقل الشكوى من «مفتوحة» إلى
 * «مغلقة» مباشرة." into "تحقق من القيم المدخلة" — the one message that tells
 * the reader nothing about what actually went wrong. Kept local rather than
 * changed inside getCrmError(), which every other CRM screen relies on.
 */
const serverMessage = (error: unknown): string => {
  const body = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  return typeof body?.message === "string" && body.message.trim() !== ""
    ? body.message
    : getCrmError(error).message;
};



export default function ComplaintsTab() {
  const { customerId = "" } = useParams();
  const state = useCrmSection("complaints");
  const { hasPermission } = useAuth();

  const canCreate = hasPermission(CRM_PERMISSIONS.COMPLAINTS_CREATE);
  const canUpdate = hasPermission(CRM_PERMISSIONS.COMPLAINTS_UPDATE);
  // Same two-part rule the notes tab applies to a sensitive note: the action
  // permission AND clearance for the category. Reclassifying is refused by the
  // server without crm.view-sensitive-notes in both directions, so a viewer
  // lacking it is shown no control at all rather than one that fails.
  const canReclassify = canUpdate && hasPermission(CRM_PERMISSIONS.VIEW_SENSITIVE_NOTES);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<CrmId | null>(null);
  const [openId, setOpenId] = useState<CrmId | null>(null);

  const create = async (targetCustomerId: CrmId, data: CrmComplaintCreateInput) => {
    setSaving(true);
    try {
      await crmApi.createComplaint(targetCustomerId, data);
      toast.success("تمت إضافة الشكوى");
      setDrawerOpen(false);
      await state.load();
    } catch (e) {
      toast.error("تعذّر حفظ الشكوى", serverMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: CrmId, status: CrmComplaintStatus, resolutionNotes?: string) => {
    setPendingId(id);
    try {
      await crmApi.updateComplaint(id, resolutionNotes ? { status, resolution_notes: resolutionNotes } : { status });
      toast.success(`تم نقل الشكوى إلى «${COMPLAINT_STATUS_TONE[status].label}»`);
      await state.load();
    } catch (e) {
      // The backend's own Arabic sentence names both statuses and is more use
      // to the reader than anything generic this layer could invent — and it
      // is the only accurate answer if this file's transition table has
      // drifted from the model's.
      toast.error("تعذّر تغيير حالة الشكوى", serverMessage(e));
    } finally {
      setPendingId(null);
    }
  };

  const toggleSensitive = async (id: CrmId, next: boolean) => {
    setPendingId(id);
    try {
      await crmApi.updateComplaint(id, { is_sensitive: next });
      toast.success(next ? "تم تصنيف الشكوى كحساسة" : "تم إلغاء تصنيف الشكوى");
      // Reloading rather than patching the row locally: classifying a complaint
      // as sensitive can remove it from this very list for the next reader, and
      // the server's filtered response is the honest picture of what is visible.
      await state.load();
    } catch (e) {
      toast.error("تعذّر تغيير تصنيف الشكوى", serverMessage(e));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {canCreate && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--crmx-border)] bg-white px-3.5 text-[13px] font-bold text-[var(--crmx-navy)] hover:bg-[var(--crmx-neutral-soft)]"
        >
          <Plus className="h-4 w-4" /> إضافة شكوى
        </button>
      )}

      <SectionFrame state={state}>
        {(d) => (
          <DomainTable
            empty="لا توجد شكاوى مسجلة"
            rows={unwrapRows(d, ["complaints"])}
            // The same drawer the CRM-wide screen opens — one component, so a
            // complaint reads identically wherever it is opened from.
            onRowClick={(row) => setOpenId(row.id as CrmId)}
            columns={[
              { key: "id", label: "رقم الشكوى", render: (v, r) => text(v ?? r.code) },
              {
                key: "title",
                label: "الموضوع",
                render: (v, r) => (
                  <span className="inline-flex items-center gap-2">
                    {text(v ?? r.subject)}
                    {r.is_sensitive ? (
                      <span className={`${COMPLAINT_PILL} gap-1 bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]`}>
                        <ShieldAlert className="h-3 w-3" /> حساسة
                      </span>
                    ) : null}
                  </span>
                ),
              },
              {
                key: "channel",
                label: "القناة",
                render: (v) => (
                  <span className={`${COMPLAINT_PILL} bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]`}>
                    {COMPLAINT_CHANNEL_LABELS[v as CrmComplaintChannel] ?? "—"}
                  </span>
                ),
              },
              {
                key: "priority",
                label: "الأولوية",
                render: (v) => {
                  const entry = COMPLAINT_PRIORITY_TONE[v as CrmComplaintPriority];
                  return entry ? <span className={`${COMPLAINT_PILL} ${entry.tone}`}>{entry.label}</span> : text(v);
                },
              },
              {
                key: "status",
                label: "الحالة",
                render: (v) => {
                  const entry = COMPLAINT_STATUS_TONE[v as CrmComplaintStatus];
                  return entry ? <span className={`${COMPLAINT_PILL} ${entry.tone}`}>{entry.label}</span> : text(v);
                },
              },
              { key: "created_at", label: "تاريخ التسجيل", render: date },
              ...(canUpdate
                ? [{
                    key: "status_action",
                    label: "تغيير الحالة",
                    render: (_v: unknown, r: Record<string, unknown>) => (
                      <ComplaintStatusControl
                        compact
                        status={r.status as CrmComplaintStatus}
                        disabled={pendingId === (r.id as CrmId)}
                        onChange={(next, resolutionNotes) => void changeStatus(r.id as CrmId, next, resolutionNotes)}
                      />
                    ),
                  }]
                : []),
              ...(canReclassify
                ? [{
                    key: "is_sensitive",
                    label: "التصنيف",
                    render: (v: unknown, r: Record<string, unknown>) => {
                      const sensitive = Boolean(v);
                      const id = r.id as CrmId;
                      return (
                        <button
                          onClick={() => toggleSensitive(id, !sensitive)}
                          disabled={pendingId === id}
                          title={sensitive ? "إلغاء تصنيف الشكوى كحساسة" : "تصنيف الشكوى كحساسة"}
                          className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[12px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            sensitive
                              ? "border-[var(--crmx-border)] text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
                              : "border-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)] hover:bg-[var(--crmx-danger-soft)]"
                          }`}
                        >
                          {sensitive ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                          {sensitive ? "إلغاء التصنيف" : "تصنيف كحساسة"}
                        </button>
                      );
                    },
                  }]
                : []),
            ]}
          />
        )}
      </SectionFrame>

      {openId !== null && (
        <ComplaintDrawer
          complaintId={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => void state.load()}
        />
      )}

      {drawerOpen && (
        // Inside a profile the subject is already known, so the shared drawer
        // is handed the customer and skips its search step.
        <ComplaintFormDrawer
          customer={{ id: customerId, name: "" }}
          saving={saving}
          onClose={() => setDrawerOpen(false)}
          onSubmit={create}
        />
      )}
    </div>
  );
}
