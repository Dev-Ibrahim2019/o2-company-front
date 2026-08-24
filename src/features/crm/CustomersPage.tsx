import { AlertTriangle, Award, Download, Plus, UserCheck, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth";
import { branchService, type Branch } from "../../services/branchService";
import { crmApi } from "./api";
import { getCrmError } from "./components";
import "./customers-ui/crmx.css";
import {
  CrmEmptyState,
  CrmFilterBar,
  CrmFilterDrawer,
  CrmKpiCard,
  CrmPageHeader,
  CrmPagination,
  CrmQuickViewDrawer,
  CrmSearchBar,
  CrmTable,
  CrmTableSkeleton,
  CrmToolbarSkeleton,
} from "./customers-ui";
import type { CrmFilterDrawerValues } from "./customers-ui";
import type { CrmCustomer, CrmPage } from "./types";

function exportCsv(items: CrmCustomer[]) {
  const headers = ["الاسم", "الكود", "الهاتف", "التصنيف", "الحالة", "الفرع", "الطلبات", "آخر طلب"];
  const rows = items.map((c) => [
    c.name,
    c.code ?? "",
    String(c.primary_phone ?? c.mobile ?? c.phone ?? ""),
    c.category ?? "",
    c.status ?? "",
    c.branch?.name ?? "",
    String(c.orders_count ?? ""),
    c.last_order_at ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `customers-page-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CrmCustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isGlobal = !user?.branch_id;

  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<CrmPage<CrmCustomer>>();
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [quickViewCustomer, setQuickViewCustomer] = useState<CrmCustomer | null>(null);

  const [kpi, setKpi] = useState<{ total?: number; active?: number; recent?: number; vip?: number }>({});
  const [kpiLoading, setKpiLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setResult(await crmApi.customers(params));
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!isGlobal) return;
    branchService.getAll().then(setBranches).catch(() => setBranches([]));
  }, [isGlobal]);

  useEffect(() => {
    let cancelled = false;
    setKpiLoading(true);
    Promise.allSettled([
      crmApi.dashboard({}),
      crmApi.customers(new URLSearchParams({ category: "vip", per_page: "1" })),
    ]).then(([dashboardResult, vipResult]) => {
      if (cancelled) return;
      const dashboard = dashboardResult.status === "fulfilled" ? dashboardResult.value : undefined;
      const vip = vipResult.status === "fulfilled" ? vipResult.value.total : undefined;
      setKpi({
        total: dashboard?.customers_count,
        active: dashboard?.active_customers_count,
        recent: dashboard?.new_customers_count,
        vip,
      });
      setKpiLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const search = params.get("search") || "";
  const status = params.get("status") || "";
  const category = params.get("category") || "";
  const source = params.get("source") || "";
  const gender = params.get("gender") || "";
  const branchId = params.get("branch_id") || "";
  const perPage = Number(params.get("per_page") || 20);

  const hasFilters = Boolean(search || status || category || source || gender || branchId);
  const advancedActiveCount = useMemo(
    () => [status, category, source, gender, branchId].filter(Boolean).length,
    [status, category, source, gender, branchId],
  );

  const resetFilters = () => setParams(new URLSearchParams());

  const applyAdvanced = (values: CrmFilterDrawerValues) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    values.status ? next.set("status", values.status) : next.delete("status");
    values.category ? next.set("category", values.category) : next.delete("category");
    values.source ? next.set("source", values.source) : next.delete("source");
    values.gender ? next.set("gender", values.gender) : next.delete("gender");
    values.branchId ? next.set("branch_id", values.branchId) : next.delete("branch_id");
    setParams(next);
  };

  return (
    <section className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader
        breadcrumb="CRM / العملاء"
        title="إدارة العملاء"
        description="إدارة بيانات العملاء وعلاقاتهم ونشاطهم."
        actions={
          <>
            <button
              type="button"
              onClick={() => result?.items.length && exportCsv(result.items)}
              disabled={!result?.items.length}
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-white px-4 text-[14px] font-semibold text-[var(--crmx-text)] transition enabled:hover:border-[var(--crmx-navy)] disabled:opacity-40"
              title="تصدير الصفحة الحالية إلى CSV"
            >
              <Download className="h-4 w-4" /> تصدير
            </button>
            <Link
              to="/admin/crm/customers/new"
              className="flex h-11 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
            >
              <Plus className="h-4 w-4" /> إضافة عميل جديد
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CrmKpiCard
          icon={<Users className="h-5 w-5" />}
          label="إجمالي العملاء"
          value={(kpi.total ?? result?.total ?? 0).toLocaleString("ar")}
          tone="navy"
          loading={kpiLoading && !result}
        />
        <CrmKpiCard
          icon={<UserCheck className="h-5 w-5" />}
          label="العملاء النشطون"
          value={kpi.active != null ? kpi.active.toLocaleString("ar") : "—"}
          tone="success"
          loading={kpiLoading}
        />
        <CrmKpiCard
          icon={<UserPlus className="h-5 w-5" />}
          label="العملاء الجدد"
          value={kpi.recent != null ? kpi.recent.toLocaleString("ar") : "—"}
          hint="هذا الشهر"
          tone="warning"
          loading={kpiLoading}
        />
        <CrmKpiCard
          icon={<Award className="h-5 w-5" />}
          label="العملاء المميزون"
          value={kpi.vip != null ? kpi.vip.toLocaleString("ar") : "—"}
          hint="VIP"
          tone="accent"
          loading={kpiLoading}
        />
      </div>

      {loading && !result ? (
        <CrmToolbarSkeleton />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <CrmSearchBar value={search} onChange={(v) => set("search", v)} placeholder="ابحث بالاسم أو الهاتف أو الكود..." />
          <button
            type="button"
            onClick={() => setAdvancedOpen(true)}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--crmx-border)] bg-white text-[var(--crmx-text)] md:hidden"
            aria-label="فلاتر"
          >
            {advancedActiveCount > 0 && (
              <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--crmx-navy)] text-[10px] font-bold text-white">
                {advancedActiveCount}
              </span>
            )}
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
          <CrmFilterBar
            status={status}
            onStatusChange={(v) => set("status", v)}
            category={category}
            onCategoryChange={(v) => set("category", v)}
            source={source}
            onSourceChange={(v) => set("source", v)}
            branchId={branchId}
            onBranchChange={(v) => set("branch_id", v)}
            branches={branches}
            showBranchFilter={isGlobal}
            advancedActiveCount={advancedActiveCount}
            onOpenAdvanced={() => setAdvancedOpen(true)}
          />
        </div>
      )}

      {loading && !result ? (
        <CrmTableSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[var(--crmx-danger)]" />
          <p className="text-[15px] font-bold text-[var(--crmx-text)]">{error.message}</p>
          <button onClick={load} className="h-10 rounded-xl bg-[var(--crmx-navy)] px-4 text-[13px] font-bold text-white">إعادة المحاولة</button>
        </div>
      ) : !result?.items.length ? (
        <CrmEmptyState hasFilters={hasFilters} onResetFilters={resetFilters} onAddCustomer={() => navigate("/admin/crm/customers/new")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
          <CrmTable items={result.items} onQuickView={setQuickViewCustomer} onEdit={(c) => navigate(`/admin/crm/customers/${c.id}/edit`)} />
          <CrmPagination
            currentPage={result.currentPage}
            lastPage={result.lastPage}
            total={result.total}
            perPage={perPage}
            onPageChange={(p) => set("page", String(p))}
            onPerPageChange={(size) => set("per_page", String(size))}
          />
        </div>
      )}

      <CrmFilterDrawer
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        values={{ status, category, branchId, source, gender }}
        branches={branches}
        showBranchFilter={isGlobal}
        onApply={applyAdvanced}
        onReset={resetFilters}
      />

      <CrmQuickViewDrawer customer={quickViewCustomer} onClose={() => setQuickViewCustomer(null)} />
    </section>
  );
}
