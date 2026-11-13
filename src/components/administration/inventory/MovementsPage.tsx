/**
 * MovementsPage.tsx — "الحركات المخزنية" (/inventory/movements) ببنية شاشة الأمين: كل ما حرّك المخزون
 * (استلام، صرفية، هالك، تسوية جرد، رصيد أول المدة) مستنداً مستنداً، للقراءة.
 *
 * الفلاتر في الرابط (?from=&to=&type=&q=) والافتراضي اليوم المحاسبي. Enter أو النقر المزدوج يفتح المستند
 * الأصلي؛ رصيد أول المدة (بلا مستند) يُعرض في نافذة بأسطره. "إدخال حركة" يفتح الشاشة الموحدة.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ExternalLink, FileText, LogOut, Plus, RefreshCw, ScrollText, Search } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  JOURNAL_KIND_LABELS,
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  journalSourcePath,
  type JournalKind,
  type JournalOpening,
  type JournalRow,
} from "../../../services/inventoryService";
import { DocToolbar, type ToolbarItem } from "./DocToolbar";
import { printReport } from "./printReport";
import { EmptyBlock, Field, IconButton, LoadingBlock, Modal, inputClass } from "./ui";

const PER_PAGE = 100;

type JournalPage = Awaited<ReturnType<typeof inventoryService.journal>>;

export const MovementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const canDocuments = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_MANAGE);
  const canOpening = useCan(INVENTORY_PERMISSIONS.MOVEMENTS_OPENING);
  const canEnter = canDocuments || canOpening;
  const [today, setToday] = useState("");
  const [result, setResult] = useState<JournalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    inventoryService
      .documentsMeta()
      .then((m) => setToday(m.accounting_today))
      .catch((e) => toast.error("تعذّر تحميل البيانات", inventoryErrorMessage(e)));
  }, []);

  const filters = useMemo(
    () => ({
      from: params.has("from") ? params.get("from")! : today,
      to: params.has("to") ? params.get("to")! : today,
      type: params.get("type") ?? "",
      q: params.get("q") ?? "",
    }),
    [params, today],
  );

  const setFilter = (key: "from" | "to" | "type" | "q", value: string) => {
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
      inventoryService.journal({
        page: p,
        per_page: perPage,
        from: filters.from || undefined,
        to: filters.to || undefined,
        type: filters.type || undefined,
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
      if (n === seq.current) toast.error("تعذّر تحميل الحركات", inventoryErrorMessage(e));
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

  const open = (r: JournalRow | null) => {
    if (!r) return;
    const path = journalSourcePath(r);
    if (path) navigate(path);
    else setOpening(r.id);
  };

  const select = (i: number) => {
    const idx = Math.max(0, Math.min(i, rows.length - 1));
    setSelected(idx);
    tableRef.current?.querySelector<HTMLElement>(`[data-index="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const printStatement = async () => {
    setPrinting(true);
    try {
      const all: JournalRow[] = [];
      let p = 1;
      let last = 1;
      do {
        const r = await query(p, 200);
        all.push(...r.data);
        last = r.last_page;
        p++;
      } while (p <= last && p <= 25);
      const amount = result?.summary.amount;
      const withAmount = amount !== null && amount !== undefined;
      printReport({
        title: "كشف الحركات المخزنية",
        filters: [
          ["من تاريخ", filters.from || "—"],
          ["إلى تاريخ", filters.to || "—"],
          ["نوع الحركة", filters.type ? JOURNAL_KIND_LABELS[filters.type as JournalKind] : "الكل"],
          ...(filters.q ? ([["بحث", filters.q]] as [string, string][]) : []),
        ],
        columns: [
          { label: "م", num: true },
          { label: "رقم الحركة" },
          { label: "التاريخ" },
          { label: "الوقت" },
          { label: "رقم المرجع" },
          { label: "رقم الحساب" },
          { label: "اسم الحساب" },
          { label: "الوصف" },
          { label: "نوع الحركة" },
          ...(withAmount ? [{ label: "القيمة (₪)", num: true }] : []),
        ],
        rows: all.map((r, i) => [
          i + 1,
          r.number,
          r.day,
          r.time,
          r.reference_no,
          r.account_code,
          r.account_name,
          r.description,
          r.kind_label,
          ...(withAmount ? [r.amount !== null ? fmtNum(r.amount, 2) : null] : []),
        ]),
        totals: [
          ["عدد الحركات", String(result?.summary.count ?? all.length)],
          ...(withAmount ? ([["إجمالي القيمة (₪)", fmtNum(amount, 2)]] as [string, string][]) : []),
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
    { id: "new", label: "إدخال حركة", icon: Plus, keys: "F3", tone: "primary", hidden: !canEnter, onClick: () => navigate("/inventory/movements/new") },
    { id: "open", label: "فتح المستند الأصلي", icon: ExternalLink, keys: "F11", disabled: !current, onClick: () => open(current) },
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
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      select(e.key === "Home" ? 0 : rows.length - 1);
    }
  };

  const summary = result?.summary;

  return (
    <div className="space-y-4" dir="rtl">
      <DocToolbar items={items} shortcutsEnabled={opening === null} title="الحركات المخزنية" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        <Field label="من تاريخ">
          <input type="date" className={inputClass} value={filters.from} max={today || undefined} onChange={(e) => setFilter("from", e.target.value)} dir="ltr" />
        </Field>
        <Field label="إلى تاريخ">
          <input type="date" className={inputClass} value={filters.to} max={today || undefined} onChange={(e) => setFilter("to", e.target.value)} dir="ltr" />
        </Field>
        <Field label="نوع الحركة">
          <select className={inputClass} value={filters.type} onChange={(e) => setFilter("type", e.target.value)}>
            <option value="">الكل</option>
            {(Object.keys(JOURNAL_KIND_LABELS) as JournalKind[]).map((k) => (
              <option key={k} value={k}>
                {JOURNAL_KIND_LABELS[k]}
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
            placeholder="رقم الحركة أو المرجع أو الحساب..."
          />
        </Field>
      </div>

      {!today || (loading && !result) ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyBlock icon={FileText} text={filters.from === today && filters.to === today ? "لا توجد حركات اليوم" : "لا توجد حركات مطابقة"} />
      ) : (
        <div
          ref={tableRef}
          tabIndex={0}
          onKeyDown={onTableKey}
          aria-label="جدول الحركات — الأسهم للاختيار وEnter لفتح المستند الأصلي"
          className={`rounded-xl border border-white/10 overflow-auto custom-scrollbar max-h-[62vh] bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-opacity ${loading ? "opacity-60" : ""}`}
        >
          <table className="w-full border-collapse text-sm min-w-[1050px]">
            <thead className="sticky top-0 z-10">
              <tr>
                {["م", "رقم الحركة", "تاريخ الحركة", "وقت الحركة", "رقم المرجع", "رقم الحساب", "اسم الحساب", "الوصف", "نوع الحركة"].map((h) => (
                  <th key={h} scope="col" className="bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 text-right whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.source}-${r.id}`}
                  data-index={i}
                  aria-selected={i === selected}
                  onClick={() => setSelected(i)}
                  onDoubleClick={() => open(r)}
                  className={`cursor-pointer ${i === selected ? "bg-red-600/15" : "hover:bg-white/5"} ${r.status === "reversed" ? "opacity-60" : ""}`}
                >
                  <td className="border border-white/10 px-2 py-1.5 text-slate-500 tabular-nums">{offset + i + 1}</td>
                  <td className="border border-white/10 px-2 py-1.5">
                    <bdi className="font-mono text-xs font-bold text-white">{r.number}</bdi>
                  </td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-300 tabular-nums whitespace-nowrap">{r.day}</td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-300 tabular-nums">{r.time ?? ""}</td>
                  <td className="border border-white/10 px-2 py-1.5">
                    <bdi className="font-mono text-xs text-slate-400">{r.reference_no ?? ""}</bdi>
                  </td>
                  <td className="border border-white/10 px-2 py-1.5">
                    <bdi className="font-mono text-xs text-slate-300">{r.account_code ?? ""}</bdi>
                  </td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-300">{r.account_name}</td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-400 max-w-[260px] truncate" title={r.description}>
                    {r.description}
                  </td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-200 whitespace-nowrap">{r.kind_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sticky bottom-0 o2-bleed-b py-2.5 bg-slate-950/95 backdrop-blur border-t border-white/5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold text-slate-400">
        <span>
          عدد الحركات: <span className="text-white tabular-nums">{summary?.count ?? 0}</span>
        </span>
        {summary?.amount !== null && summary?.amount !== undefined && (
          <span>
            إجمالي القيمة: <span className="text-white tabular-nums">{fmtNum(summary.amount, 2)} ₪</span>
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

      {opening !== null && <OpeningDetailModal movementId={opening} onClose={() => setOpening(null)} />}
    </div>
  );
};

/** أسطر رصيد أول المدة المسجّلة معاً (لا مستند لها). العكس لكل سطر من سجل حركة الصنف. */
export const OpeningDetailModal: React.FC<{ movementId: number; onClose: () => void }> = ({ movementId, onClose }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<JournalOpening | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    inventoryService
      .journalOpening(movementId)
      .then(setData)
      .catch((e) => {
        toast.error("تعذّر تحميل رصيد أول المدة", inventoryErrorMessage(e));
        closeRef.current();
      });
  }, [movementId]);

  return (
    <Modal wide title={data ? `رصيد أول المدة ${data.number}` : "رصيد أول المدة"} onClose={onClose}>
      {!data ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            المخزن: <b>{data.warehouse?.name}</b> · التاريخ: <bdi className="tabular-nums">{data.day}</bdi> · بواسطة: {data.created_by ?? "—"}
            {data.notes && <span className="block text-slate-500 mt-1">{data.notes}</span>}
          </p>
          <div className="rounded-xl border border-white/10 overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[560px]">
              <thead>
                <tr>
                  {["رقم الصنف", "اسم الصنف", "الكمية", ...(data.costs_visible ? ["سعر الوحدة", "الإجمالي"] : []), ""].map((h, i) => (
                    <th key={i} className="bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.lines.map((l) => (
                  <tr key={l.movement_id} className={l.is_reversed ? "opacity-50" : ""}>
                    <td className="border border-white/10 px-2 py-1.5">
                      <bdi className="font-mono text-xs">{l.code}</bdi>
                    </td>
                    <td className="border border-white/10 px-2 py-1.5 text-white font-bold">
                      {l.name} {l.is_reversed && <span className="text-[11px] text-amber-300">(معكوس)</span>}
                    </td>
                    <td className="border border-white/10 px-2 py-1.5 tabular-nums">
                      {fmtNum(l.quantity)} <span className="text-xs text-slate-500">{l.unit}</span>
                    </td>
                    {data.costs_visible && (
                      <>
                        <td className="border border-white/10 px-2 py-1.5 tabular-nums">{fmtNum(l.unit_cost, 4)}</td>
                        <td className="border border-white/10 px-2 py-1.5 tabular-nums">{fmtNum(l.total_cost, 2)}</td>
                      </>
                    )}
                    <td className="border border-white/10 px-2 py-1.5">
                      <button
                        type="button"
                        className="text-xs text-sky-300 hover:underline"
                        onClick={() => navigate(`/inventory/kardex?warehouse_id=${data.warehouse?.id}&stock_item_id=${l.stock_item_id}`)}
                      >
                        كرت الصنف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
};
