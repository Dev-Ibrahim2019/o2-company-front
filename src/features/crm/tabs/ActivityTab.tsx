import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { crmApi } from "../api";
import { CrmState, getCrmError } from "../components";
import { CrmActivityFeed } from "../customers-ui";
import type { CrmActivityEvent } from "../types";

export default function ActivityTab() {
  const { customerId = "" } = useParams();
  const [events, setEvents] = useState<CrmActivityEvent[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setEvents(await crmApi.activity(customerId));
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [customerId]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <CrmState kind="loading" title="جارٍ تحميل سجل النشاطات" />;
  if (error) return <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />;

  return (
    <div className="crmx-root rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
      <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">سجل النشاطات والتفاعلات</h3>
      <CrmActivityFeed events={events ?? []} />
    </div>
  );
}
