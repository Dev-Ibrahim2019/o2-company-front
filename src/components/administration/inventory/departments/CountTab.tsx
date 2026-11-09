/**
 * تبويب "الجرد": جرد مخزن القسم الآن.
 *
 *   الافتتاحي + الصرفيات − المحوّل من القسم − استهلاك البيع − الهالك ± أخرى = المتوقع (= رصيد كرت الصنف)
 *   ثم الفعلي (إدخال)، والفرق بالكمية والقيمة والنسبة — وهو ما ينزل تسويةً عند الاعتماد.
 *
 * الافتتاحي من آخر جرد معتمد شمل المادة، وإلا رصيد بداية الفترة. الضغط على أي رقم من المعادلة يعرض حركاته.
 * الحفظ مسودة (يُرجع لها من السجل أو الرابط ?count=)، والاعتماد بتأكيد صريح، والمعتمد لا يُعدَّل — يُصحَّح بعكسه.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, FilePlus2, History, Printer, RotateCcw, Save, ShieldAlert } from "lucide-react";
import { useCan } from "../../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../../auth/permissions";
import { toast } from "../../../shared/Toast";
import { fmtNum, inventoryErrorMessage } from "../../../../services/inventoryService";
import {
  departmentsService,
  varianceTone,
  type CountColumn,
  type CountHistoryRow,
  type CountLine,
  type CountMovementsResult,
  type CountPreview,
  type CountStatus,
  type DeptQuery,
  type PostedCount,
} from "../../../../services/departmentsService";
import { printReport } from "../printReport";
import { EmptyBlock, inputClass, Modal, PrimaryButton, SearchBox, SecondaryButton } from "../ui";
import type { TabProps } from "./DepartmentDetailPage";
import { Card, EmptyRow, ExportButton, kardexLink, Kpi, money, pct, qtyUnit, Spinner, tdNum, thClass, ToolButton } from "./shared";

const STATUS: Record<CountStatus, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-amber-500/10 text-amber-300" },
  posted: { label: "معتمد", cls: "bg-green-600/15 text-green-400" },
  reversed: { label: "معكوس", cls: "bg-slate-700 text-slate-400" },
};

const COLUMN_LABEL: Record<CountColumn, string> = {
  transfers_in: "الصرفيات الواردة",
  transfers_out: "المحوّل من القسم",
  sale: "استهلاك البيع",
  waste: "الهالك",
  other: "حركات أخرى",
};

type Filter = "all" | "counted" | "variance" | "big";

const FILTERS: [Filter, string][] = [
  ["all", "الكل"],
  ["counted", "المعدود"],
  ["variance", "بفرق"],
  ["big", "فرق كبير"],
];

const fmtAt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

const toneClass = (kind: string) => (kind === "shortage" ? "text-red-400" : kind === "surplus" ? "text-green-400" : "text-slate-500");
const bigRowClass = (tone: { kind: string; big: boolean }) => (tone.big ? (tone.kind === "shortage" ? "bg-red-500/[0.07]" : "bg-green-500/[0.07]") : "");

export const CountTab: React.FC<TabProps> = ({ departmentId, unit, query, onPeriod }) => {
  const [params, setParams] = useSearchParams();
  const countId = Number(params.get("count")) || null;
  const canManage = useCan(INVENTORY_PERMISSIONS.COUNTS_MANAGE) && unit.can_edit_warehouse;
  const canPost = useCan(INVENTORY_PERMISSIONS.COUNTS_POST) && unit.can_edit_warehouse;
  const canReverse = useCan(INVENTORY_PERMISSIONS.COUNTS_REVERSE) && unit.can_edit_warehouse;

  const [history, setHistory] = useState<CountHistoryRow[]>([]);
  const [preview, setPreview] = useState<CountPreview | null>(null);
  const [posted, setPosted] = useState<PostedCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "approve" | "reverse" | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [drill, setDrill] = useState<{ line: CountLine; column: CountColumn } | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReverse, setConfirmReverse] = useState(false);
  const inputsRef = useRef<Map<number, HTMLInputElement>>(new Map());
  const { from, to, branch_id } = query;
  const periodRef = useRef(onPeriod);
  periodRef.current = onPeriod;
  const warehouseId = unit.warehouse?.id ?? null;
  // إعادة تحميل الورقة بعد حفظ/اعتماد/عكس، والرد المتأخر من تحميل سابق يُتجاهل.
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);
  const loadSeq = useRef(0);

  const setCount = useCallback(
    (id: number | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set("count", String(id));
          else next.delete("count");
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const loadHistory = useCallback(() => {
    if (!warehouseId) return;
    departmentsService
      .countHistory(departmentId, { from, to, branch_id })
      .then((h) => setHistory(h.rows))
      .catch(() => undefined);
  }, [departmentId, warehouseId, from, to, branch_id]);

  // الورقة المعروضة: جرد جديد (معاينة)، أو مسودة (معاينة بمعدودها)، أو معتمد/معكوس (كما سُجّل).
  const load = useCallback(async () => {
    if (!warehouseId) {
      setLoading(false);
      return;
    }
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const q = { from, to, branch_id };
      const shown = countId ? await departmentsService.countShow(departmentId, q, countId) : null;
      if (seq !== loadSeq.current) return;
      if (shown && shown.count.status !== "draft") {
        setPosted(shown);
        setPreview(null);
        setNotes(shown.count.notes ?? "");
        periodRef.current({ from: shown.filters.from, to: shown.filters.to });
      } else {
        const p = await departmentsService.countPreview(departmentId, q, countId);
        if (seq !== loadSeq.current) return;
        setPosted(null);
        setPreview(p);
        setInputs(Object.fromEntries(p.lines.filter((l) => l.counted !== null).map((l) => [l.stock_item_id, String(Number(l.counted))])));
        setNotes(p.count?.notes ?? "");
        setDirty(false);
        periodRef.current({ from: p.filters.from, to: p.filters.to });
      }
    } catch (e) {
      if (seq !== loadSeq.current) return;
      toast.error("تعذّر تحميل الجرد", inventoryErrorMessage(e));
      if (countId) setCount(null);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
    // tick: إعادة التحميل الصريحة بعد العمليات.
  }, [departmentId, warehouseId, from, to, branch_id, countId, setCount, tick]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // تحذير قبل مغادرة الصفحة بمعدود غير محفوظ.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ── الفرق محسوباً لحظياً بعد الإدخال (المرجع النهائي هو الخادم لحظة الاعتماد) ── */
  const lines = useMemo(() => {
    if (!preview) return [];
    return preview.lines.map((l) => {
      const raw = inputs[l.stock_item_id];
      const has = raw !== undefined && raw.trim() !== "" && !Number.isNaN(Number(raw));
      if (!has) return { ...l, counted: null, variance_quantity: null, variance_value: null, variance_percent: null };
      const counted = Number(raw);
      const expected = Number(l.expected);
      const diff = counted - expected;
      const unitCost = l.unit_cost === null ? null : Number(l.unit_cost);
      return {
        ...l,
        counted: String(counted),
        variance_quantity: String(round(diff, 6)),
        variance_value: unitCost === null ? null : String(round(diff * unitCost, 6)),
        variance_percent: expected === 0 ? null : String(round((diff / expected) * 100, 2)),
      };
    });
  }, [preview, inputs]);

  const threshold = preview?.threshold ?? posted?.threshold ?? "3";

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return lines.filter((l) => {
      if (term && !l.name.toLowerCase().includes(term) && !l.code.toLowerCase().includes(term)) return false;
      const tone = varianceTone(l.variance_quantity, l.variance_percent, threshold);
      if (filter === "counted") return l.counted !== null;
      if (filter === "variance") return tone.kind === "shortage" || tone.kind === "surplus";
      if (filter === "big") return tone.big;
      return true;
    });
  }, [lines, search, filter, threshold]);

  const totals = useMemo(() => {
    const t = { counted: 0, value: 0, shortage: 0, surplus: 0, big: 0 };
    for (const l of lines) {
      if (l.counted === null) continue;
      t.counted++;
      const v = Number(l.variance_value ?? 0);
      t.value += v;
      if (v < 0) t.shortage += v;
      else t.surplus += v;
      if (varianceTone(l.variance_quantity, l.variance_percent, threshold).big) t.big++;
    }
    return t;
  }, [lines, threshold]);

  /* ── الإجراءات ── */

  const save = async (): Promise<number | null> => {
    if (!preview) return null;
    const body = preview.lines
      .filter((l) => inputs[l.stock_item_id] !== undefined || l.counted !== null)
      .map((l) => {
        const raw = (inputs[l.stock_item_id] ?? "").trim();
        return { stock_item_id: l.stock_item_id, quantity: raw === "" ? null : Number(raw) };
      });
    if (!preview.count && body.every((l) => l.quantity === null)) {
      toast.error("لم يُدخل أي معدود", "أدخل الكمية الفعلية لمادة واحدة على الأقل.");
      return null;
    }
    setBusy("save");
    try {
      const saved = await departmentsService.saveCount(departmentId, query, { count_id: preview.count?.id ?? null, notes: notes || null, lines: body });
      setDirty(false);
      toast.success("تم الحفظ", `الجرد ${saved.number} محفوظ كمسودة — تقدر ترجع له وتكمله.`);
      if (saved.id !== countId) setCount(saved.id);
      else reload();
      loadHistory();
      return saved.id;
    } catch (e) {
      toast.error("تعذّر حفظ الجرد", inventoryErrorMessage(e));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const approve = async () => {
    const id = await save();
    if (!id) return;
    setBusy("approve");
    try {
      await departmentsService.approveCount(id);
      toast.success("تم اعتماد الجرد", "نزلت تسويات الفروق في كرت الصنف.");
      setConfirmApprove(false);
      setCount(id);
      reload();
      loadHistory();
    } catch (e) {
      toast.error("تعذّر الاعتماد", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const reverse = async (reason: string) => {
    if (!posted) return;
    setBusy("reverse");
    try {
      await departmentsService.reverseCount(posted.count.id, reason);
      toast.success("تم عكس الجرد", "عُكست تسوياته في كرت الصنف.");
      setConfirmReverse(false);
      reload();
      loadHistory();
    } catch (e) {
      toast.error("تعذّر عكس الجرد", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const openCount = (id: number | null) => {
    if (dirty && !window.confirm("في معدود غير محفوظ. تجاهله والانتقال؟")) return;
    setCount(id);
  };

  const focusNext = (index: number) => {
    const next = visible[index + 1];
    if (next) inputsRef.current.get(next.stock_item_id)?.focus();
  };

  const closeDrill = useCallback(() => setDrill(null), []);

  /* ── الطباعة ── */

  const print = () => {
    const number = posted?.count.number ?? preview?.count?.number;
    const title = `جرد ${unit.department.name}${number ? ` — ${number}` : ""}`;
    const filters: [string, string][] = [
      ["المخزن", unit.warehouse?.name ?? ""],
      ["الفرع", unit.branch.name],
      ["الحالة", posted ? STATUS[posted.count.status].label : preview?.count ? "مسودة" : "جرد جديد (غير محفوظ)"],
    ];
    if (posted) {
      printReport({
        title,
        filters: [...filters, ["تاريخ الاعتماد", fmtAt(posted.count.posted_at)]],
        columns: [
          { label: "الكود" },
          { label: "المادة" },
          { label: "المتوقع", num: true },
          { label: "الفعلي", num: true },
          { label: "الفرق", num: true },
          { label: "الفرق ₪", num: true },
          { label: "الفرق %", num: true },
        ],
        rows: posted.lines.map((l) => [
          l.code,
          l.name,
          qtyUnit(l.expected, l.base_unit),
          qtyUnit(l.counted, l.base_unit),
          qtyUnit(l.variance_quantity, l.base_unit),
          money(l.variance_value),
          pct(l.variance_percent),
        ]),
        totals: [["صافي الفرق", money(posted.totals.variance_value ?? null)]],
        landscape: true,
      });
      return;
    }
    printReport({
      title,
      filters: [...filters, ["بداية الفترة", preview?.filters.from ?? ""]],
      columns: [
        { label: "الكود" },
        { label: "المادة" },
        { label: "الافتتاحي", num: true },
        { label: "+ الصرفيات", num: true },
        { label: "− المحوّل", num: true },
        { label: "− البيع", num: true },
        { label: "− الهالك", num: true },
        { label: "± أخرى", num: true },
        { label: "= المتوقع", num: true },
        { label: "الفعلي", num: true },
        { label: "الفرق", num: true },
        { label: "الفرق ₪", num: true },
      ],
      rows: visible.map((l) => [
        l.code,
        `${l.name} (${l.base_unit})`,
        fmtNum(l.opening),
        fmtNum(l.transfers_in),
        fmtNum(l.transfers_out),
        fmtNum(l.sale),
        fmtNum(l.waste),
        fmtNum(l.other),
        fmtNum(l.expected),
        l.counted === null ? "" : fmtNum(l.counted),
        l.variance_quantity === null ? "" : fmtNum(l.variance_quantity),
        l.variance_value === null ? "" : money(l.variance_value),
      ]),
      totals: [
        ["المعدود", `${totals.counted} من ${lines.length}`],
        ["العجز", money(totals.shortage)],
        ["الزيادة", money(totals.surplus)],
        ["صافي الفرق", money(totals.value)],
      ],
      landscape: true,
    });
  };

  if (!unit.warehouse || !warehouseId) {
    return (
      <div className="pt-3">
        <EmptyBlock icon={ShieldAlert} text="القسم غير مربوط بمخزن في هذا الفرع — اربطه من شاشة المخازن ليُجرد." />
      </div>
    );
  }

  const currentCount = posted?.count ?? preview?.count ?? null;
  const costs = (posted ?? preview)?.costs_visible ?? true;
  const editable = Boolean(preview) && canManage;

  return (
    <div className="space-y-4 pt-3">
      {/* رأس الورقة والأزرار */}
      <div className="flex flex-wrap items-center gap-2" data-print-hide>
        <div className="flex items-center gap-2 me-auto min-w-0">
          <ClipboardCheck size={18} className="text-red-400 shrink-0" aria-hidden />
          <span className="text-sm font-black text-white truncate">{currentCount ? `الجرد ${currentCount.number}` : "جرد جديد"}</span>
          {currentCount ? (
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${STATUS[currentCount.status].cls}`}>{STATUS[currentCount.status].label}</span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-800 text-slate-400">غير محفوظ</span>
          )}
          {dirty && <span className="text-[11px] font-bold text-amber-300">• تعديلات غير محفوظة</span>}
        </div>
        {currentCount && (
          <ToolButton icon={FilePlus2} onClick={() => openCount(null)}>
            جرد جديد
          </ToolButton>
        )}
        <ExportButton onExport={() => departmentsService.exportTable(departmentId, query, "count", currentCount?.id)} />
        <ToolButton icon={Printer} onClick={print} disabled={loading}>
          طباعة
        </ToolButton>
        {editable && (
          <ToolButton icon={Save} busy={busy === "save"} onClick={save} disabled={busy !== null}>
            حفظ كمسودة
          </ToolButton>
        )}
        {preview && canPost && (
          <PrimaryButton type="button" onClick={() => setConfirmApprove(true)} disabled={busy !== null || totals.counted === 0} className="!py-2 !px-4 !text-xs">
            <CheckCircle2 size={14} /> اعتماد
          </PrimaryButton>
        )}
        {posted?.count.status === "posted" && canReverse && (
          <ToolButton icon={RotateCcw} onClick={() => setConfirmReverse(true)} className="!bg-red-600/10 !text-red-400 hover:!bg-red-600/20">
            عكس الجرد
          </ToolButton>
        )}
      </div>

      {loading && !preview && !posted ? (
        <Spinner />
      ) : posted ? (
        <PostedView posted={posted} costs={costs} threshold={threshold} warehouseId={warehouseId} />
      ) : preview ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Kpi label="مواد المخزن" value={fmtNum(lines.length)} sub={`المعدود ${totals.counted}`} />
            <Kpi label="قيمة المتوقع" value={costs ? money(preview.totals.expected_value) : "—"} />
            <Kpi label="العجز" value={costs ? money(totals.shortage) : "—"} tone="text-red-400" />
            <Kpi label="الزيادة" value={costs ? money(totals.surplus) : "—"} tone="text-green-400" />
            <Kpi
              label="صافي الفرق"
              value={costs ? money(totals.value) : "—"}
              tone={totals.value < 0 ? "text-red-400" : totals.value > 0 ? "text-green-400" : "text-white"}
              sub={totals.big > 0 ? <span className="text-amber-300">{totals.big} فرق كبير (≥ {fmtNum(threshold)}%)</span> : undefined}
            />
          </div>

          <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
            المتوقع = رصيد كرت الصنف الآن. الافتتاحي من آخر جرد معتمد شمل المادة، وإلا رصيد بداية الفترة ({preview.filters.from}). الكميات بالوحدة
            الأساسية لكل مادة. اضغط على أي رقم لعرض حركاته. الفرق يُعاد احتسابه من الرصيد لحظة الاعتماد.
          </p>

          <div className="flex flex-wrap items-center gap-2" data-print-hide>
            <SearchBox value={search} onChange={setSearch} placeholder="ابحث بالمادة أو الكود..." />
            <div className="flex gap-1" role="group" aria-label="تصفية المواد">
              {FILTERS.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={filter === k}
                  onClick={() => setFilter(k)}
                  className={`px-3 py-2 rounded-lg text-xs font-black ${filter === k ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={`bg-slate-900 rounded-2xl border border-white/5 relative overflow-x-auto custom-scrollbar transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-sm min-w-[1180px]">
              <caption className="sr-only">ورقة جرد مخزن القسم</caption>
              <thead className="bg-slate-800/50 border-b border-white/5">
                <tr>
                  <th className={thClass}>المادة</th>
                  <th className={thClass}>الافتتاحي</th>
                  <th className={`${thClass} !text-green-400`}>+ الصرفيات</th>
                  <th className={`${thClass} !text-red-400`}>− المحوّل</th>
                  <th className={`${thClass} !text-red-400`}>− استهلاك البيع</th>
                  <th className={`${thClass} !text-red-400`}>− الهالك</th>
                  <th className={thClass}>± أخرى</th>
                  <th className={`${thClass} !font-black underline decoration-red-500/60 underline-offset-4`}>= المتوقع</th>
                  <th className={`${thClass} !font-black underline decoration-red-500/60 underline-offset-4`}>الفعلي</th>
                  <th className={thClass}>الفرق</th>
                  <th className={thClass}>الفرق ₪</th>
                  <th className={thClass}>الفرق %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.length === 0 && <EmptyRow colSpan={12} text={lines.length ? "لا توجد مادة مطابقة" : "لا توجد مواد في مخزن القسم"} />}
                {visible.map((l, i) => {
                  const tone = varianceTone(l.variance_quantity, l.variance_percent, threshold);
                  const toneText = toneClass(tone.kind);
                  const cell = (column: CountColumn, value: string, cls: string) => (
                    <td className={tdNum}>
                      {Number(value) === 0 ? (
                        <span className="text-slate-600">0</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDrill({ line: l, column })}
                          className={`${cls} underline decoration-dotted underline-offset-4 hover:decoration-solid`}
                          aria-label={`${COLUMN_LABEL[column]} لـ ${l.name}: ${fmtNum(value)} ${l.base_unit} — عرض الحركات`}
                        >
                          {fmtNum(value)}
                        </button>
                      )}
                    </td>
                  );
                  return (
                    <tr key={l.stock_item_id} className={`${bigRowClass(tone)} hover:bg-white/[0.03]`}>
                      <td className="px-3 py-2">
                        <div className="font-bold text-white">{l.name}</div>
                        <div className="text-[11px] text-slate-500">
                          <bdi className="font-mono">{l.code}</bdi> · {l.base_unit}
                        </div>
                      </td>
                      <td className={`${tdNum} text-slate-300`}>
                        <span title={l.start.kind === "count" ? `من الجرد ${l.start.number} (${fmtAt(l.start.at)})` : `رصيد بداية الفترة ${l.start.day}`}>
                          {fmtNum(l.opening)}
                        </span>
                        {l.start.kind === "count" && <div className="text-[10px] text-slate-500 font-bold">جرد {l.start.number}</div>}
                      </td>
                      {cell("transfers_in", l.transfers_in, "text-green-400")}
                      {cell("transfers_out", l.transfers_out, "text-red-400")}
                      {cell("sale", l.sale, "text-red-400")}
                      {cell("waste", l.waste, "text-red-400")}
                      {cell("other", l.other, "text-slate-300")}
                      <td className={`${tdNum} text-white font-black`}>{fmtNum(l.expected)}</td>
                      <td className="px-2 py-1.5">
                        {editable ? (
                          <input
                            ref={(el) => {
                              if (el) inputsRef.current.set(l.stock_item_id, el);
                              else inputsRef.current.delete(l.stock_item_id);
                            }}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            dir="ltr"
                            value={inputs[l.stock_item_id] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setInputs((prev) => ({ ...prev, [l.stock_item_id]: v }));
                              setDirty(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                focusNext(i);
                              }
                            }}
                            placeholder="—"
                            aria-label={`الفعلي لـ ${l.name} بـ ${l.base_unit}`}
                            className={`${inputClass} !w-28 !px-2 !py-1.5 text-left tabular-nums`}
                          />
                        ) : (
                          <span className="tabular-nums text-white">{l.counted === null ? "—" : fmtNum(l.counted)}</span>
                        )}
                      </td>
                      <td className={`${tdNum} font-bold ${toneText}`}>
                        {l.variance_quantity === null ? "—" : fmtNum(l.variance_quantity)}
                        {tone.kind === "shortage" && <span className="sr-only"> عجز</span>}
                        {tone.kind === "surplus" && <span className="sr-only"> زيادة</span>}
                      </td>
                      <td className={`${tdNum} ${toneText}`}>{l.variance_value === null || !costs ? "—" : money(l.variance_value)}</td>
                      <td className={`${tdNum} ${toneText}`}>
                        {l.variance_quantity === null ? "—" : l.variance_percent === null ? (tone.kind === "match" ? "0%" : "∞") : pct(l.variance_percent)}
                        {tone.big && (
                          <span
                            className={`ms-1.5 px-1.5 py-0.5 rounded text-[10px] font-black ${tone.kind === "shortage" ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"}`}
                          >
                            كبير
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {editable && (
            <label className="block space-y-1.5" data-print-hide>
              <span className="text-xs font-black text-slate-400">ملاحظات الجرد</span>
              <textarea
                className={`${inputClass} min-h-[64px]`}
                value={notes}
                maxLength={1000}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setDirty(true);
                }}
                placeholder="اختياري — من عدّ، ملاحظات على الفروق..."
              />
            </label>
          )}
        </>
      ) : null}

      <HistoryCard rows={history} currentId={currentCount?.id ?? null} onOpen={openCount} costs={costs} />

      {drill && (
        <MovementsModal departmentId={departmentId} query={query} line={drill.line} column={drill.column} warehouseId={warehouseId} onClose={closeDrill} />
      )}

      {confirmApprove && preview && (
        <Modal
          title="اعتماد الجرد"
          onClose={() => busy === null && setConfirmApprove(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setConfirmApprove(false)} disabled={busy !== null}>
                إلغاء
              </SecondaryButton>
              <ApproveButton busy={busy === "save" || busy === "approve"} onApprove={approve} />
            </>
          }
        >
          <div className="space-y-3 text-sm text-slate-300 font-semibold">
            <p>
              سيُعتمد الجرد لـ <b className="text-white">{totals.counted}</b> مادة معدودة، وتنزل حركات «تسوية جرد» في كرت الصنف بالفرق بين الفعلي ورصيد
              المخزن لحظة الاعتماد.
            </p>
            {costs && (
              <ul className="grid grid-cols-3 gap-2 text-xs">
                <li className="p-2 rounded-lg bg-red-500/10 text-red-300">العجز: {money(totals.shortage)}</li>
                <li className="p-2 rounded-lg bg-green-500/10 text-green-300">الزيادة: {money(totals.surplus)}</li>
                <li className="p-2 rounded-lg bg-slate-800 text-white">الصافي: {money(totals.value)}</li>
              </ul>
            )}
            <p className="text-amber-300 text-xs">الجرد المعتمد لا يُعدَّل بعد ذلك — تصحيحه يكون بعكسه ثم جرد جديد. المواد غير المعدودة لا تُسوّى.</p>
          </div>
        </Modal>
      )}

      {confirmReverse && posted && (
        <ReverseModal number={posted.count.number} busy={busy === "reverse"} onClose={() => setConfirmReverse(false)} onConfirm={reverse} />
      )}
    </div>
  );
};

/** زر الاعتماد يحتاج تأكيداً صريحاً (خانة اختيار) قبل التفعيل. */
const ApproveButton: React.FC<{ busy: boolean; onApprove: () => void }> = ({ busy, onApprove }) => {
  const [sure, setSure] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
        <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="w-4 h-4 accent-red-600" />
        أؤكد اعتماد الجرد وتسوية الفروق
      </label>
      <PrimaryButton type="button" loading={busy} disabled={!sure} onClick={onApprove}>
        اعتماد الآن
      </PrimaryButton>
    </div>
  );
};

const ReverseModal: React.FC<{ number: string; busy: boolean; onClose: () => void; onConfirm: (reason: string) => void }> = ({
  number,
  busy,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title={`عكس الجرد ${number}`}
      onClose={() => !busy && onClose()}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            إلغاء
          </SecondaryButton>
          <PrimaryButton type="button" loading={busy} disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>
            عكس الجرد
          </PrimaryButton>
        </>
      }
    >
      <p className="text-sm text-slate-300 font-semibold">
        تُعكس كل تسويات هذا الجرد بحركات معاكسة في كرت الصنف، فيعود الرصيد كما كان قبل الاعتماد، ويبقى الجرد في السجل بحالة «معكوس».
      </p>
      <label className="block space-y-1.5">
        <span className="text-xs font-black text-slate-400">
          سبب العكس <span className="text-red-500">*</span>
        </span>
        <input
          className={inputClass}
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          placeholder="مثلاً: خطأ في عدّ الدجاج"
          autoFocus
        />
      </label>
    </Modal>
  );
};

/** جرد معتمد أو معكوس كما سُجّل لحظة الاعتماد — للقراءة فقط. */
const PostedView: React.FC<{ posted: PostedCount; costs: boolean; threshold: string; warehouseId: number }> = ({ posted, costs, threshold, warehouseId }) => {
  const c = posted.count;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="المواد المعدودة" value={fmtNum(posted.totals.counted_lines ?? posted.lines.length)} />
        <Kpi label="العجز" value={costs ? money(posted.totals.shortage_value ?? null) : "—"} tone="text-red-400" />
        <Kpi label="الزيادة" value={costs ? money(posted.totals.surplus_value ?? null) : "—"} tone="text-green-400" />
        <Kpi label="صافي الفرق" value={costs ? money(posted.totals.variance_value ?? null) : "—"} />
      </div>
      <div className="text-xs text-slate-400 font-semibold space-y-0.5">
        <p>
          اعتُمد {fmtAt(c.posted_at)}
          {c.poster ? ` بواسطة ${c.poster}` : ""}. الأرقام كما سُجّلت لحظة الاعتماد (المتوقع = رصيد المخزن حينها).
        </p>
        {c.status === "reversed" && (
          <p className="text-amber-300">
            عُكس {fmtAt(c.reversed_at)}
            {c.reverser ? ` بواسطة ${c.reverser}` : ""} — السبب: {c.reversal_reason}
          </p>
        )}
        {c.notes && <p>ملاحظات: {c.notes}</p>}
      </div>
      <div className="bg-slate-900 rounded-2xl border border-white/5 relative overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm min-w-[760px]">
          <caption className="sr-only">أسطر الجرد المعتمد</caption>
          <thead className="bg-slate-800/50 border-b border-white/5">
            <tr>
              <th className={thClass}>المادة</th>
              <th className={thClass}>المتوقع</th>
              <th className={thClass}>الفعلي</th>
              <th className={thClass}>الفرق</th>
              <th className={thClass}>تكلفة الوحدة</th>
              <th className={thClass}>الفرق ₪</th>
              <th className={thClass}>الفرق %</th>
              <th className={thClass}>
                <span className="sr-only">كرت الصنف</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {posted.lines.length === 0 && <EmptyRow colSpan={8} text="لا توجد أسطر معدودة" />}
            {posted.lines.map((l) => {
              const tone = varianceTone(l.variance_quantity, l.variance_percent, threshold);
              const toneText = toneClass(tone.kind);
              return (
                <tr key={l.stock_item_id} className={bigRowClass(tone)}>
                  <td className="px-3 py-2">
                    <div className="font-bold text-white">{l.name}</div>
                    <div className="text-[11px] text-slate-500">
                      <bdi className="font-mono">{l.code}</bdi> · {l.base_unit}
                    </div>
                  </td>
                  <td className={`${tdNum} text-slate-300`}>{fmtNum(l.expected)}</td>
                  <td className={`${tdNum} text-white font-bold`}>{fmtNum(l.counted)}</td>
                  <td className={`${tdNum} font-bold ${toneText}`}>{fmtNum(l.variance_quantity)}</td>
                  <td className={`${tdNum} text-slate-400`}>{costs ? money(l.unit_cost) : "—"}</td>
                  <td className={`${tdNum} ${toneText}`}>{costs ? money(l.variance_value) : "—"}</td>
                  <td className={`${tdNum} ${toneText}`}>{l.variance_percent === null ? (Number(l.variance_quantity) ? "∞" : "0%") : pct(l.variance_percent)}</td>
                  <td className="px-3 py-2">
                    <Link
                      to={kardexLink(l.stock_item_id, warehouseId)}
                      className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-bold whitespace-nowrap"
                    >
                      <History size={12} aria-hidden /> كرت الصنف
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const HistoryCard: React.FC<{ rows: CountHistoryRow[]; currentId: number | null; onOpen: (id: number) => void; costs: boolean }> = ({
  rows,
  currentId,
  onOpen,
  costs,
}) => (
  <Card title="سجل جرود القسم">
    {rows.length === 0 ? (
      <p className="py-4 text-center text-xs text-slate-500 font-bold">لا توجد جرود سابقة لمخزن هذا القسم</p>
    ) : (
      <div className="relative overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="border-b border-white/5">
            <tr>
              <th className={thClass}>الرقم</th>
              <th className={thClass}>الحالة</th>
              <th className={thClass}>التاريخ</th>
              <th className={thClass}>المعدود</th>
              <th className={thClass}>صافي الفرق</th>
              <th className={thClass}>بواسطة</th>
              <th className={thClass}>
                <span className="sr-only">فتح</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.id} className={r.id === currentId ? "bg-red-500/[0.06]" : "hover:bg-white/[0.03]"}>
                <td className="px-3 py-2 font-mono text-white">
                  <bdi>{r.number}</bdi>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                </td>
                <td className="px-3 py-2 text-slate-400 tabular-nums whitespace-nowrap">{fmtAt(r.posted_at ?? r.created_at)}</td>
                <td className="px-3 py-2 text-slate-300 tabular-nums">
                  {r.counted_lines_count} / {r.lines_count}
                </td>
                <td
                  className={`px-3 py-2 tabular-nums ${Number(r.variance_value) < 0 ? "text-red-400" : Number(r.variance_value) > 0 ? "text-green-400" : "text-slate-400"}`}
                >
                  {costs && r.variance_value !== null ? money(r.variance_value) : "—"}
                </td>
                <td className="px-3 py-2 text-slate-400 text-xs">{r.poster ?? r.creator ?? "—"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onOpen(r.id)}
                    disabled={r.id === currentId}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300 disabled:text-slate-600"
                  >
                    {r.id === currentId ? "معروض" : r.status === "draft" ? "إكمال" : "فتح"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Card>
);

/** الحركات التي تكوّن رقماً من معادلة الجرد، مع روابط لمصدرها ولكرت الصنف. */
const MovementsModal: React.FC<{
  departmentId: number;
  query: DeptQuery;
  line: CountLine;
  column: CountColumn;
  warehouseId: number;
  onClose: () => void;
}> = ({ departmentId, query, line, column, warehouseId, onClose }) => {
  const [data, setData] = useState<CountMovementsResult | null>(null);
  const { from, to, branch_id } = query;

  useEffect(() => {
    let cancelled = false;
    departmentsService
      .countMovements(departmentId, { from, to, branch_id }, line.stock_item_id, column)
      .then((d) => !cancelled && setData(d))
      .catch((e) => {
        if (cancelled) return;
        toast.error("تعذّر تحميل الحركات", inventoryErrorMessage(e));
        onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [departmentId, from, to, branch_id, line.stock_item_id, column, onClose]);

  const sourceLink = (m: CountMovementsResult["rows"][number]): string | null => {
    if (!m.source) return null;
    if (m.source.kind === "count") return `/inventory/counts/${m.source.id}`;
    if (m.source.kind === "document") {
      if (m.source.type === "transfer") return `/inventory/transfers/${m.source.id}`;
      if (m.source.type === "receipt") return `/inventory/receipts?open=${m.source.id}`;
      if (m.source.type === "waste") return `/inventory/waste?open=${m.source.id}`;
    }
    return null;
  };

  return (
    <Modal title={`${COLUMN_LABEL[column]} — ${line.name}`} onClose={onClose} wide>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-400">
        <span>
          {line.start.kind === "count" ? `منذ الجرد ${line.start.number} (${fmtAt(line.start.at)})` : `منذ بداية الفترة ${line.start.day}`} · الكميات
          بـ{line.base_unit}
        </span>
        <Link
          to={kardexLink(line.stock_item_id, warehouseId, line.start.kind === "period" ? line.start.day : undefined)}
          className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300"
        >
          <History size={13} aria-hidden /> كرت الصنف
        </Link>
      </div>
      {!data ? (
        <Spinner />
      ) : (
        <div className="relative overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr>
                <th className={thClass}>رقم الحركة</th>
                <th className={thClass}>النوع</th>
                <th className={thClass}>التاريخ</th>
                <th className={thClass}>الكمية</th>
                <th className={thClass}>القيمة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.rows.length === 0 && <EmptyRow colSpan={5} text="لا توجد حركات" />}
              {data.rows.map((m) => {
                const link = sourceLink(m);
                const qtyCls =
                  Number(m.quantity) < 0 ? "text-amber-300" : column === "transfers_in" ? "text-green-400" : column === "other" ? "text-slate-200" : "text-red-400";
                return (
                  <tr key={m.id}>
                    <td className="px-3 py-2 font-mono">
                      {link ? (
                        <Link to={link} className="text-sky-400 hover:text-sky-300">
                          <bdi>{m.number ?? `#${m.id}`}</bdi>
                        </Link>
                      ) : (
                        <bdi className="text-slate-200">{m.number ?? `#${m.id}`}</bdi>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-xs font-bold ${m.is_reversal ? "text-amber-300" : "text-slate-300"}`}>{m.type_label}</td>
                    <td className="px-3 py-2 text-slate-400 tabular-nums whitespace-nowrap">{fmtAt(m.occurred_at)}</td>
                    <td className={`px-3 py-2 tabular-nums font-bold ${qtyCls}`}>{fmtNum(m.quantity)}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-400">{m.total_cost === null ? "—" : money(m.total_cost)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-white/10 font-black text-white">
              <tr>
                <td className="px-3 py-2" colSpan={3}>
                  الإجمالي {data.truncated && <span className="text-[11px] text-amber-300 font-bold">(أول 500 حركة معروضة)</span>}
                </td>
                <td className="px-3 py-2 tabular-nums">{qtyUnit(data.total, line.base_unit)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
};
