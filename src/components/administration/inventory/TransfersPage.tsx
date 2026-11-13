/**
 * TransfersPage.tsx — مراجعة "صرفيات الأصناف" (/inventory/transfers) ببنية شاشة الأمين.
 *
 * الفلاتر في الرابط (?from=&to=&to_wh=&receipt=&q=) فتبقى عند الرجوع وتُشارك. الافتراضي = اليوم المحاسبي
 * من الخادم (من = إلى = اليوم)، فتظهر صرفيات اليوم فقط. ↑/↓ لاختيار سطر، Enter أو النقر المزدوج لفتحه.
 * التعديل والحذف للمسودات فقط؛ المرحّل يُعكس بسبب.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ScrollText,
  Trash2,
  Undo2,
} from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  DOCUMENT_STATUS_LABELS,
  RECEIPT_STATUS_LABELS,
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type DocumentsMeta,
  type Paginated,
  type ReceiptStatus,
  type StockDocument,
  type Warehouse,
} from "../../../services/inventoryService";
import { DocToolbar, type ToolbarItem } from "./DocToolbar";
import { DocumentStatusBadge } from "./StockDocumentsPage";
import { printReport } from "./printReport";
import { printTransferVoucher } from "./printTransferVoucher";
import { EmptyBlock, Field, IconButton, LoadingBlock, Modal, PrimaryButton, SecondaryButton, inputClass } from "./ui";

const PER_PAGE = 100;

const RECEIPT_STYLES: Record<ReceiptStatus, string> = {
  received: "bg-green-500/15 text-green-400",
  partial: "bg-amber-500/15 text-amber-300",
  pending: "bg-red-500/15 text-red-400",
};

export const ReceiptStatusBadge: React.FC<{ status: ReceiptStatus | null | undefined }> = ({ status }) =>
  status ? (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-black whitespace-nowrap ${RECEIPT_STYLES[status]}`}>
      {RECEIPT_STATUS_LABELS[status]}
    </span>
  ) : (
    <span className="text-slate-600">—</span>
  );

const destinationLabel = (d: StockDocument) =>
  `${d.to_warehouse?.name ?? "—"}${(d.destinations_count ?? 1) > 1 ? ` +${(d.destinations_count ?? 1) - 1}` : ""}`;

export const TransfersPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const canManage = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_MANAGE);
  const canReverse = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_REVERSE);
  const [meta, setMeta] = useState<DocumentsMeta | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [result, setResult] = useState<Paginated<StockDocument> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState<"delete" | "print" | "statement" | null>(null);
  const [reversing, setReversing] = useState<StockDocument | null>(null);
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);

  const today = meta?.accounting_today ?? "";
  // غياب المفتاح من الرابط = اليوم؛ القيمة الفارغة = بلا حد (اختارها المستخدم).
  const filters = useMemo(
    () => ({
      from: params.has("from") ? params.get("from")! : today,
      to: params.has("to") ? params.get("to")! : today,
      toWh: params.get("to_wh") ?? "",
      receipt: params.get("receipt") ?? "",
      q: params.get("q") ?? "",
    }),
    [params, today],
  );

  const setFilter = (key: "from" | "to" | "to_wh" | "receipt" | "q", value: string) => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (key === "from" || key === "to") next.set(key, value);
        else if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
    setPage(1);
  };

  useEffect(() => {
    inventoryService.documentsMeta().then(setMeta).catch((e) => toast.error("تعذّر تحميل البيانات", inventoryErrorMessage(e)));
    inventoryService.warehouses().then(setWarehouses).catch((e) => toast.error("تعذّر تحميل المخازن", inventoryErrorMessage(e)));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== filters.q) setFilter("q", searchInput.trim());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useCallback(
    (p: number, perPage = PER_PAGE) =>
      inventoryService.documents({
        type: "transfer",
        order: "asc",
        page: p,
        per_page: perPage,
        from: filters.from || undefined,
        to: filters.to || undefined,
        to_warehouse_id: filters.toWh || undefined,
        receipt: filters.receipt || undefined,
        search: filters.q || undefined,
      }),
    [filters],
  );

  const load = useCallback(async () => {
    if (!meta) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await query(page);
      if (seq !== requestSeq.current) return;
      setResult(data);
      setSelected((s) => Math.min(s, Math.max(data.data.length - 1, 0)));
    } catch (e) {
      if (seq === requestSeq.current) toast.error("تعذّر تحميل الصرفيات", inventoryErrorMessage(e));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [meta, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = result?.data ?? [];
  const current = rows[selected] ?? null;
  const offset = ((result?.current_page ?? 1) - 1) * PER_PAGE;

  const open = (doc: StockDocument | null) => doc && navigate(`/inventory/transfers/${doc.id}`);

  const select = (i: number) => {
    const idx = Math.max(0, Math.min(i, rows.length - 1));
    setSelected(idx);
    tableRef.current?.querySelector<HTMLElement>(`[data-index="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const removeOrReverse = async () => {
    if (!current) return;
    if (current.status === "posted") {
      setReversing(current);
      return;
    }
    if (current.status !== "draft" || !window.confirm(`حذف المسودة ${current.number}؟`)) return;
    setBusy("delete");
    try {
      await inventoryService.deleteDocument(current.id);
      toast.success("تم حذف المسودة");
      load();
    } catch (e) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const printVoucher = async () => {
    if (!current) return;
    setBusy("print");
    try {
      printTransferVoucher(await inventoryService.document(current.id));
    } catch (e) {
      toast.error("تعذّرت الطباعة", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  /** كشف الصرفيات بكل الصفحات المطابقة للفلاتر. */
  const printStatement = async () => {
    setBusy("statement");
    try {
      const all: StockDocument[] = [];
      let p = 1;
      let last = 1;
      do {
        const r = await query(p, 200);
        all.push(...r.data);
        last = r.last_page;
        p++;
      } while (p <= last && p <= 25);
      const total = result?.summary?.posted_total;
      const toName = warehouses.find((w) => String(w.id) === filters.toWh)?.name;
      printReport({
        title: "كشف صرفيات الأصناف",
        filters: [
          ["من تاريخ", filters.from || "—"],
          ["إلى تاريخ", filters.to || "—"],
          ...(toName ? ([["إلى المخزن", toName]] as [string, string][]) : []),
          ...(filters.receipt ? ([["الاستلام", RECEIPT_STATUS_LABELS[filters.receipt as ReceiptStatus]]] as [string, string][]) : []),
          ...(filters.q ? ([["بحث", filters.q]] as [string, string][]) : []),
        ],
        columns: [
          { label: "م", num: true },
          { label: "رقم الصرفية" },
          { label: "التاريخ" },
          { label: "رقم المرجع" },
          { label: "من المخزن" },
          { label: "إلى المخزن" },
          { label: "المبلغ (₪)", num: true },
          { label: "ملاحظات" },
          { label: "الحالة" },
          { label: "الاستلام" },
        ],
        rows: all.map((d, i) => [
          i + 1,
          d.number,
          d.document_date,
          d.reference_no,
          d.warehouse?.name,
          destinationLabel(d),
          d.status === "draft" || d.total_cost === null ? null : fmtNum(d.total_cost, 2),
          d.notes,
          DOCUMENT_STATUS_LABELS[d.status],
          d.receipt_status ? RECEIPT_STATUS_LABELS[d.receipt_status] : null,
        ]),
        totals: [
          ["عدد الصرفيات", String(result?.summary?.count ?? all.length)],
          ...(total !== null && total !== undefined ? ([["إجمالي المرحّل (₪)", fmtNum(total, 2)]] as [string, string][]) : []),
        ],
        landscape: true,
      });
    } catch (e) {
      toast.error("تعذّرت طباعة الكشف", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const isDraft = current?.status === "draft";
  const items: ToolbarItem[] = [
    { id: "new", label: "جديد", icon: Plus, keys: "F3", tone: "primary", hidden: !canManage, onClick: () => navigate("/inventory/transfers/new") },
    { id: "edit", label: "تعديل", icon: Pencil, keys: "F11", disabled: !isDraft || !canManage, hint: "للمسودات فقط", onClick: () => open(current) },
    isDraft || !current
      ? { id: "delete", label: "حذف", icon: Trash2, keys: "F4", tone: "danger", disabled: !isDraft || !canManage, loading: busy === "delete", hint: "للمسودات فقط", onClick: removeOrReverse }
      : { id: "reverse", label: "عكس", icon: Undo2, keys: "F4", tone: "danger", disabled: current.status !== "posted" || !canReverse, onClick: removeOrReverse },
    "sep",
    { id: "print", label: "طباعة الصرفية", icon: Printer, keys: "Ctrl+P", disabled: !current, loading: busy === "print", onClick: printVoucher },
    { id: "statement", label: "طباعة الكشف", icon: ScrollText, disabled: rows.length === 0, loading: busy === "statement", onClick: printStatement },
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
      <DocToolbar items={items} shortcutsEnabled={!reversing} title="صرفيات الأصناف" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 pt-2">
        <Field label="من تاريخ">
          <input type="date" className={inputClass} value={filters.from} max={today || undefined} onChange={(e) => setFilter("from", e.target.value)} dir="ltr" />
        </Field>
        <Field label="إلى تاريخ">
          <input type="date" className={inputClass} value={filters.to} max={today || undefined} onChange={(e) => setFilter("to", e.target.value)} dir="ltr" />
        </Field>
        <Field label="إلى المخزن">
          <select className={inputClass} value={filters.toWh} onChange={(e) => setFilter("to_wh", e.target.value)}>
            <option value="">كل المخازن</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="حالة الاستلام">
          <select className={inputClass} value={filters.receipt} onChange={(e) => setFilter("receipt", e.target.value)}>
            <option value="">الكل</option>
            {(Object.keys(RECEIPT_STATUS_LABELS) as ReceiptStatus[]).map((s) => (
              <option key={s} value={s}>
                {RECEIPT_STATUS_LABELS[s]}
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
            placeholder="رقم الصرفية أو المرجع أو ملاحظة..."
          />
        </Field>
      </div>

      {!meta || (loading && !result) ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyBlock
          icon={FileText}
          text={filters.from === today && filters.to === today ? "لا توجد صرفيات اليوم" : "لا توجد صرفيات مطابقة"}
        />
      ) : (
        <div
          ref={tableRef}
          tabIndex={0}
          onKeyDown={onTableKey}
          aria-label="جدول الصرفيات — الأسهم للاختيار وEnter للفتح"
          className={`rounded-xl border border-white/10 overflow-auto custom-scrollbar max-h-[62vh] focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-opacity ${loading ? "opacity-60" : ""}`}
        >
          <table className="w-full border-collapse text-sm min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr>
                {["م", "رقم الصرفية", "تاريخ الصرفية", "رقم المرجع", "من المخزن", "إلى المخزن", "مبلغ الصرفية (₪)", "ملاحظات", "الحالة", "الاستلام"].map((h) => (
                  <th key={h} scope="col" className="bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 text-right whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => (
                <tr
                  key={d.id}
                  data-index={i}
                  aria-selected={i === selected}
                  onClick={() => setSelected(i)}
                  onDoubleClick={() => open(d)}
                  className={`cursor-pointer ${i === selected ? "bg-red-600/15" : "hover:bg-white/5"}`}
                >
                  <td className="border border-white/10 px-2 py-1.5 text-slate-500 tabular-nums">{offset + i + 1}</td>
                  <td className="border border-white/10 px-2 py-1.5">
                    <bdi className="font-mono text-xs font-bold text-white">{d.number}</bdi>
                  </td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-300 tabular-nums whitespace-nowrap">{d.document_date}</td>
                  <td className="border border-white/10 px-2 py-1.5">
                    <bdi className="font-mono text-xs text-slate-400">{d.reference_no ?? ""}</bdi>
                  </td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-300">{d.warehouse?.name}</td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-300">{destinationLabel(d)}</td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-200 tabular-nums text-left">
                    {d.status === "draft" || d.total_cost === null ? "—" : fmtNum(d.total_cost, 2)}
                  </td>
                  <td className="border border-white/10 px-2 py-1.5 text-slate-400 max-w-[220px] truncate" title={d.notes ?? undefined}>
                    {d.notes}
                  </td>
                  <td className="border border-white/10 px-2 py-1.5">
                    <DocumentStatusBadge status={d.status} />
                  </td>
                  <td className="border border-white/10 px-2 py-1.5">
                    <ReceiptStatusBadge status={d.receipt_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sticky bottom-0 o2-bleed-b py-2.5 bg-slate-950/95 backdrop-blur border-t border-white/5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold text-slate-400">
        <span>
          عدد الصرفيات: <span className="text-white tabular-nums">{summary?.count ?? 0}</span>
        </span>
        {summary?.posted_total !== null && summary?.posted_total !== undefined && (
          <span>
            إجمالي المبلغ (المرحّل): <span className="text-white tabular-nums">{fmtNum(summary.posted_total, 2)} ₪</span>
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

      {reversing && (
        <ReverseModal
          doc={reversing}
          onClose={() => setReversing(null)}
          onDone={() => {
            setReversing(null);
            load();
          }}
        />
      )}
    </div>
  );
};

/** نافذة عكس مستند مرحّل بسبب (مشتركة بين المراجعة وصفحة الإدخال). */
export const ReverseModal: React.FC<{ doc: StockDocument; onClose: () => void; onDone: (doc: StockDocument) => void }> = ({ doc, onClose, onDone }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      const reversed = await inventoryService.reverseDocument(doc.id, reason.trim());
      toast.success(`تم عكس ${doc.number}`);
      onDone(reversed);
    } catch (e) {
      toast.error("تعذّر العكس", inventoryErrorMessage(e));
      setSaving(false);
    }
  };
  return (
    <Modal
      title={`عكس ${doc.number}`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!reason.trim()}>
            تأكيد العكس
          </PrimaryButton>
        </>
      }
    >
      <p className="text-sm text-slate-300">
        ستُسجَّل حركات عكسية لكل أصناف الصرفية بتكاليفها الأصلية، فتعود الأرصدة كما كانت، ويصبح المستند "معكوساً". لا يمكن التراجع عن العكس.
      </p>
      <Field label="سبب العكس" required>
        <textarea className={`${inputClass} min-h-[70px]`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus />
      </Field>
    </Modal>
  );
};
