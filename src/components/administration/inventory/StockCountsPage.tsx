/**
 * StockCountsPage.tsx — مراجعة الجرد (/inventory/counts) ببنية شاشات الأمين: فلاتر التاريخ والمخزن، وجدول الأوراق
 * (مسودات ومثبّتة) وتذييل للإجماليات. Enter أو النقر المزدوج يفتح الورقة في /inventory/counts/:id.
 * "تاريخ الحركة" = يوم التثبيت، أو اليوم المحاسبي لإنشاء المسودة. الافتراضي آخر 30 يوماً.
 * ?open=ID (روابط قديمة) يُحوَّل إلى صفحة الورقة.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ClipboardCheck, ExternalLink, LogOut, Plus, RefreshCw, ScrollText, Search } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type InventoryLookups,
  type Paginated,
  type StockCount,
  type Warehouse,
} from "../../../services/inventoryService";
import { flattenTree } from "./CategoriesPage";
import { DocToolbar, type ToolbarItem } from "./DocToolbar";
import { printReport } from "./printReport";
import { EmptyBlock, Field, IconButton, LoadingBlock, Modal, PrimaryButton, SecondaryButton, inputClass } from "./ui";

const PER_PAGE = 100;

type CountsPage = Paginated<StockCount> & { summary?: { count: number; variance_value: string | null } };

const daysBefore = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

export const StockCountStatus: React.FC<{ status: StockCount["status"] }> = ({ status }) => (
  <span
    className={`px-2 py-0.5 rounded-md text-[11px] font-black whitespace-nowrap ${
      status === "posted" ? "bg-green-500/15 text-green-400" : status === "reversed" ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-300"
    }`}
  >
    {status === "posted" ? "مثبّت" : status === "reversed" ? "معكوس" : "مسودة"}
  </span>
);

export const StockCountsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const canManage = useCan(INVENTORY_PERMISSIONS.COUNTS_MANAGE);
  const [today, setToday] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lookups, setLookups] = useState<InventoryLookups | null>(null);
  const [result, setResult] = useState<CountsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(0);
  const [creating, setCreating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const legacyOpen = Number(params.get("open")) || null;

  useEffect(() => {
    inventoryService
      .documentsMeta()
      .then((m) => setToday(m.accounting_today))
      .catch((e) => toast.error("تعذّر تحميل البيانات", inventoryErrorMessage(e)));
    inventoryService
      .warehouses()
      .then((w) => setWarehouses(w.filter((x) => x.is_active)))
      .catch(() => undefined);
    inventoryService.lookups().then(setLookups).catch(() => undefined);
  }, []);

  const filters = useMemo(
    () => ({
      from: params.has("from") ? params.get("from")! : today ? daysBefore(today, 30) : "",
      to: params.has("to") ? params.get("to")! : today,
      wh: params.get("wh") ?? "",
      q: params.get("q") ?? "",
    }),
    [params, today],
  );

  const setFilter = (key: "from" | "to" | "wh" | "q", value: string) => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (key === "from" || key === "to" || value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(() => searchInput.trim() !== filters.q && setFilter("q", searchInput.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useCallback(
    (p: number, perPage = PER_PAGE) =>
      inventoryService.counts({
        page: p,
        per_page: perPage,
        from: filters.from || undefined,
        to: filters.to || undefined,
        warehouse_id: filters.wh || undefined,
        search: filters.q || undefined,
      }),
    [filters],
  );

  const load = useCallback(async () => {
    if (!today) return;
    const n = ++seq.current;
    setLoading(true);
    try {
      const data = await query(page);
      if (n !== seq.current) return;
      setResult(data);
      setSelected((s) => Math.min(s, Math.max(data.data.length - 1, 0)));
    } catch (e) {
      if (n === seq.current) toast.error("تعذّر تحميل أوراق الجرد", inventoryErrorMessage(e));
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [today, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = result?.data ?? [];
  const current = rows[selected] ?? null;
  const offset = ((result?.current_page ?? 1) - 1) * PER_PAGE;
  const summaryValue = result?.summary?.variance_value;
  // الخادم يعيد قيمة الفروق null لمن لا يملك صلاحية رؤية التكاليف.
  const costs = summaryValue !== null && summaryValue !== undefined;

  const select = (i: number) => {
    const idx = Math.max(0, Math.min(i, rows.length - 1));
    setSelected(idx);
    tableRef.current?.querySelector<HTMLElement>(`[data-index="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const open = (c: StockCount | null) => c && navigate(`/inventory/counts/${c.id}`);

  const printStatement = async () => {
    setPrinting(true);
    try {
      const all: StockCount[] = [];
      let p = 1;
      let last = 1;
      do {
        const r = await query(p, 200);
        all.push(...r.data);
        last = r.last_page;
        p++;
      } while (p <= last && p <= 25);
      printReport({
        title: "كشف أوراق الجرد",
        filters: [
          ["من تاريخ", filters.from || "—"],
          ["إلى تاريخ", filters.to || "—"],
          ["المخزن", warehouses.find((w) => String(w.id) === filters.wh)?.name ?? "الكل"],
          ...(filters.q ? ([["بحث", filters.q]] as [string, string][]) : []),
        ],
        columns: [
          { label: "م", num: true },
          { label: "رقم الحركة" },
          { label: "تاريخ الحركة" },
          { label: "اسم المخزن" },
          { label: "عدد الأصناف", num: true },
          ...(costs ? [{ label: "قيمة الفروق (₪)", num: true }] : []),
          { label: "الحالة" },
          { label: "ملاحظات" },
        ],
        rows: all.map((c, i) => [
          i + 1,
          c.number,
          c.day,
          c.warehouse?.name,
          c.counted_lines_count ?? 0,
          ...(costs ? [c.status !== "draft" ? fmtNum(c.variance_value, 2) : null] : []),
          c.status === "posted" ? "مثبّت" : c.status === "reversed" ? "معكوس" : "مسودة",
          c.notes,
        ]),
        totals: [
          ["عدد الأوراق", String(result?.summary?.count ?? all.length)],
          ...(costs ? ([["إجمالي قيمة الفروق (₪)", fmtNum(summaryValue, 2)]] as [string, string][]) : []),
        ],
        landscape: true,
      });
    } catch (e) {
      toast.error("تعذّرت طباعة الكشف", inventoryErrorMessage(e));
    } finally {
      setPrinting(false);
    }
  };

  const items: ToolbarItem[] = [
    { id: "new", label: "جديد", icon: Plus, keys: "F3", tone: "primary", hidden: !canManage, disabled: warehouses.length === 0, onClick: () => setCreating(true) },
    { id: "open", label: "فتح الورقة", icon: ExternalLink, keys: "F11", disabled: !current, onClick: () => open(current) },
    "sep",
    { id: "statement", label: "طباعة الكشف", icon: ScrollText, keys: "Ctrl+P", disabled: rows.length === 0, loading: printing, onClick: printStatement },
    "sep",
    { id: "first", label: "الأول", icon: ChevronFirst, keys: "Alt+Home", disabled: rows.length === 0, onClick: () => select(0) },
    { id: "prev", label: "السابق", icon: ChevronRight, keys: "Alt+PageUp", disabled: selected <= 0, onClick: () => select(selected - 1) },
    { id: "next", label: "التالي", icon: ChevronLeft, keys: "Alt+PageDown", disabled: selected >= rows.length - 1, onClick: () => select(selected + 1) },
    { id: "last", label: "الأخير", icon: ChevronLast, keys: "Alt+End", disabled: rows.length === 0, onClick: () => select(rows.length - 1) },
    "sep",
    { id: "search", label: "بحث", icon: Search, keys: "Ctrl+F", onClick: () => searchRef.current?.focus() },
    { id: "reload", label: "إعادة تحميل", icon: RefreshCw, keys: "F8", onClick: load },
    { id: "exit", label: "خروج", icon: LogOut, keys: "Esc", onClick: () => navigate("/inventory/dashboard") },
  ];

  const onTableKey = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      select(selected + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      open(current);
    }
  };

  if (legacyOpen) return <Navigate to={`/inventory/counts/${legacyOpen}`} replace />;

  return (
    <div className="space-y-4" dir="rtl">
      <DocToolbar items={items} shortcutsEnabled={!creating} title="الجرد" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        <Field label="من تاريخ">
          <input type="date" className={inputClass} value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from", e.target.value)} dir="ltr" />
        </Field>
        <Field label="إلى تاريخ">
          <input type="date" className={inputClass} value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to", e.target.value)} dir="ltr" />
        </Field>
        <Field label="المخزن">
          <select className={inputClass} value={filters.wh} onChange={(e) => setFilter("wh", e.target.value)}>
            <option value="">كل المخازن</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="بحث">
          <input
            ref={searchRef}
            className={inputClass}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && searchInput) {
                e.preventDefault();
                e.stopPropagation();
                setSearchInput("");
              } else if (e.key === "Enter" || e.key === "ArrowDown") {
                e.preventDefault();
                tableRef.current?.focus();
              }
            }}
            placeholder="رقم الحركة أو الملاحظات..."
          />
        </Field>
      </div>

      {!today || (loading && !result) ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyBlock icon={ClipboardCheck} text="لا توجد أوراق جرد في هذه الفترة" />
      ) : (
        <div
          ref={tableRef}
          tabIndex={0}
          onKeyDown={onTableKey}
          aria-label="أوراق الجرد — الأسهم للاختيار وEnter لفتح الورقة"
          className={`rounded-xl border border-white/10 overflow-auto custom-scrollbar max-h-[62vh] bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-opacity ${loading ? "opacity-60" : ""}`}
        >
          <table className="w-full border-collapse text-sm min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr>
                {["م", "رقم الحركة", "تاريخ الحركة", "اسم المخزن", "عدد الأصناف", ...(costs ? ["قيمة الفروق"] : []), "الحالة", "ملاحظات"].map((h) => (
                  <th key={h} scope="col" className="bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 text-right whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr
                  key={c.id}
                  data-index={i}
                  aria-selected={i === selected}
                  onClick={() => setSelected(i)}
                  onDoubleClick={() => open(c)}
                  className={`cursor-pointer ${i === selected ? "bg-red-600/15" : "hover:bg-white/5"}`}
                >
                  <td className="border border-white/10 px-2 py-1.5 text-slate-500 tabular-nums">{offset + i + 1}</td>
                  <td className="border border-white/10 px-2 py-1.5">
                    <bdi className="font-mono text-xs font-bold text-white">{c.number}</bdi>
                  </td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-300 tabular-nums whitespace-nowrap">{c.day}</td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-300">{c.warehouse?.name}</td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-300 tabular-nums">
                    {c.counted_lines_count ?? 0}
                    {c.status === "draft" && <span className="text-[11px] text-slate-500"> / {c.lines_count}</span>}
                  </td>
                  {costs && (
                    <td className={`border border-white/10 px-2 py-1.5 tabular-nums text-left font-bold ${Number(c.variance_value) < 0 ? "text-red-400" : "text-slate-300"}`}>
                      {c.status !== "draft" ? fmtNum(c.variance_value, 2) : ""}
                    </td>
                  )}
                  <td className="border border-white/10 px-2 py-1.5">
                    <StockCountStatus status={c.status} />
                  </td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-400 max-w-[280px] truncate" title={c.notes ?? undefined}>
                    {c.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sticky bottom-0 o2-bleed-b py-2.5 bg-slate-950/95 backdrop-blur border-t border-white/5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold text-slate-400">
        <span>
          عدد الأوراق: <span className="text-white tabular-nums">{result?.summary?.count ?? 0}</span>
        </span>
        {costs && (
          <span>
            إجمالي قيمة الفروق: <span className={`tabular-nums ${Number(summaryValue) < 0 ? "text-red-400" : "text-white"}`}>{fmtNum(summaryValue, 2)} ₪</span>
          </span>
        )}
        {result && result.last_page > 1 && (
          <span className="flex items-center gap-1.5 mr-auto">
            <span className="text-xs">
              صفحة {result.current_page} من {result.last_page}
            </span>
            <IconButton label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight size={16} />
            </IconButton>
            <IconButton label="الصفحة التالية" disabled={page >= result.last_page || loading} onClick={() => setPage((p) => p + 1)}>
              <ChevronLeft size={16} />
            </IconButton>
          </span>
        )}
      </div>

      {creating && (
        <NewCountModal
          warehouses={warehouses}
          lookups={lookups}
          defaultWarehouse={filters.wh ? Number(filters.wh) : undefined}
          onClose={() => setCreating(false)}
          onCreated={(c) => navigate(`/inventory/counts/${c.id}`)}
        />
      )}
    </div>
  );
};

/** ورقة جرد جديدة: المخزن، وتصنيف اختياري (فارغ = كل الأصناف المخزنية النشطة)، وملاحظات. */
export const NewCountModal: React.FC<{
  warehouses: Warehouse[];
  lookups: InventoryLookups | null;
  defaultWarehouse?: number;
  onClose: () => void;
  onCreated: (c: StockCount) => void;
}> = ({ warehouses, lookups, defaultWarehouse, onClose, onCreated }) => {
  const [warehouseId, setWarehouseId] = useState<number | "">(defaultWarehouse ?? (warehouses.length === 1 ? warehouses[0].id : ""));
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const tree = useMemo(() => flattenTree(lookups?.categories ?? []), [lookups]);

  const create = async () => {
    if (warehouseId === "") {
      toast.warning("اختر المخزن");
      return;
    }
    setSaving(true);
    try {
      const c = await inventoryService.createCount({ warehouse_id: warehouseId, category_id: categoryId === "" ? null : categoryId, notes: notes.trim() || null });
      toast.success(`أُنشئت ورقة الجرد ${c.number}`);
      onCreated(c);
    } catch (e) {
      toast.error("تعذّر إنشاء ورقة الجرد", inventoryErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="ورقة جرد جديدة"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton onClick={create} loading={saving}>
            إنشاء
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="المخزن" required>
          <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : "")} autoFocus>
            <option value="">— اختر —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="التصنيف" hint="فارغ = كل الأصناف المخزنية النشطة.">
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">كل التصنيفات</option>
            {tree.map(({ category, depth }) => (
              <option key={category.id} value={category.id}>
                {"  ".repeat(depth * 2)}
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ملاحظات" hint="مثلاً: الرفوف 1–4، أو اسم العدّاد (يمكن فتح أكثر من ورقة للمخزن ودمجها).">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
        </Field>
      </div>
    </Modal>
  );
};
