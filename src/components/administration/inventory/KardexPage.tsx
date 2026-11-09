/**
 * KardexPage.tsx — "كرت الصنف" (/inventory/kardex): كل حركة على الصنف لفترة بالأيام المحاسبية (02:00 → 02:00)،
 * في مخزن واحد أو كل مخازن المستخدم (المخزن اختياري).
 *
 * الرصيد الجاري يحسبه الخادم: رصيد أول الفترة + مجموع الحركات حتى السطر. لكل حركة: المخزن، رقم المستند الأصلي،
 * والحساب المقابل. "مراجعة أصل الحركة" (Enter أو F11) يفتح المستند. الحركات لا تُعدَّل؛ التصحيح بحركة عكسية
 * (يدوياً لأرصدة أول المدة فقط). الحالة (المخزن، الصنف، الفترة، الصفحة) في الرابط.
 * غير مدعوم في النظام: رقم التشغيلة/السيريال (Lot/Serial) والتكلفة الإضافية على الحركة.
 *
 * حركات "استهلاك بيع" المتتالية تُعرض في سطر ملخص واحد قابل للفتح (kardexGroups.ts)، ضمن الصفحة الحالية فقط.
 * أسطر التفصيل حركات عادية (تحديد، مراجعة أصل، عكس)؛ سطر الملخص نفسه لا يُراجَع ولا يُعكس. الطباعة والعدّاد
 * بالحركات الفعلية دون تجميع.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, History, LogOut, Printer, RefreshCw, Undo2 } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  kardexSourcePath,
  type Kardex,
  type KardexRow,
  type StockItem,
  type Warehouse,
} from "../../../services/inventoryService";
import { DocToolbar, type ToolbarItem } from "./DocToolbar";
import { groupSaleRuns, summarizeSaleRun } from "./kardexGroups";
import { OpeningDetailModal } from "./MovementsPage";
import { StockItemPicker } from "./StockItemPicker";
import { printReport } from "./printReport";
import { EmptyBlock, Field, IconButton, LoadingBlock, Modal, PrimaryButton, SecondaryButton, inputClass } from "./ui";

const BUSINESS_TZ = "Asia/Gaza";

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: BUSINESS_TZ, hour: "2-digit", minute: "2-digit" });

const SummaryCard: React.FC<{ label: string; value: string; sub?: string; tone?: string }> = ({ label, value, sub, tone = "text-white" }) => (
  <div className="bg-slate-900 rounded-2xl border border-white/5 p-3">
    <p className="text-[11px] text-slate-500 font-black">{label}</p>
    <p className={`text-lg font-black tabular-nums mt-0.5 ${tone}`}>{value}</p>
    {sub && <p className="text-[11px] text-slate-500 font-semibold tabular-nums">{sub}</p>}
  </div>
);

const td = "border border-white/10 px-2 py-1.5";

/** سطر معروض في الجدول: حركة (ومنها أسطر تفصيل مجموعة مفتوحة)، أو ملخص مجموعة "استهلاك بيع". */
type Line = { kind: "row"; key: string; row: KardexRow; groupKey?: string } | { kind: "group"; key: string; rows: KardexRow[] };

export const KardexPage: React.FC = () => {
  const navigate = useNavigate();
  const canReverse = useCan(INVENTORY_PERMISSIONS.MOVEMENTS_REVERSE);
  const [params, setParams] = useSearchParams();
  const warehouseId = Number(params.get("warehouse_id")) || null;
  const itemId = Number(params.get("stock_item_id")) || null;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const page = Number(params.get("page")) || 1;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [data, setData] = useState<Kardex | null>(null);
  const [pickedItem, setPickedItem] = useState<Pick<StockItem, "id" | "name" | "code"> | null>(null);
  const [loading, setLoading] = useState(false);
  // التحديد بمفتاح السطر لا برقمه: فتح مجموعة أو إغلاقها يزيح أرقام الأسطر.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [reversing, setReversing] = useState<KardexRow | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);
  const requestSeq = useRef(0);
  const tableRef = useRef<HTMLDivElement>(null);

  const setParam = useCallback(
    (patch: Record<string, string | number | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === "") next.delete(k);
            else next.set(k, String(v));
          }
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  useEffect(() => {
    inventoryService
      .warehouses()
      .then((list) => {
        setWarehouses(list);
        // مستخدم بمخزن واحد: يُختار تلقائياً.
        if (list.length === 1) setParam({ warehouse_id: list[0].id });
      })
      .catch((e) => toast.error("تعذّر تحميل المخازن", inventoryErrorMessage(e)));
  }, [setParam]);

  const fetchKardex = useCallback(
    (p: number, perPage = 50) =>
      inventoryService.kardex({
        warehouse_id: warehouseId ?? undefined,
        stock_item_id: itemId!,
        from: from || undefined,
        to: to || undefined,
        page: p,
        per_page: perPage,
      }),
    [warehouseId, itemId, from, to],
  );

  const load = useCallback(async () => {
    if (!itemId) {
      setData(null);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const k = await fetchKardex(page);
      if (seq !== requestSeq.current) return;
      setData(k);
      setPickedItem({ id: k.item.id, name: k.item.name, code: k.item.code });
    } catch (e) {
      if (seq === requestSeq.current) {
        setData(null);
        toast.error("تعذّر تحميل كرت الصنف", inventoryErrorMessage(e));
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [itemId, fetchKardex, page]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const entries = useMemo(() => groupSaleRuns(rows), [rows]);
  const lines = useMemo<Line[]>(
    () =>
      entries.flatMap((e): Line[] =>
        e.kind === "row"
          ? [{ kind: "row", key: `m${e.row.id}`, row: e.row }]
          : [
              { kind: "group", key: e.key, rows: e.rows },
              ...(expanded.has(e.key) ? e.rows.map((r): Line => ({ kind: "row", key: `m${r.id}`, row: r, groupKey: e.key })) : []),
            ],
      ),
    [entries, expanded],
  );
  // سطر محدد اختفى (إعادة تحميل، صفحة أخرى) ← أول سطر.
  const selectedIndex = Math.max(0, lines.findIndex((l) => l.key === selectedKey));
  const selectedLine = lines[selectedIndex] ?? null;
  const current = selectedLine?.kind === "row" ? selectedLine.row : null;
  const groupSelected = selectedLine?.kind === "group";
  const unit = data?.item.base_unit ?? "";
  const costs = Boolean(data?.costs_visible);

  const openSource = (r: KardexRow | null) => {
    if (!r?.source) return void toast.warning("لا مستند أصلي لهذه الحركة");
    const path = kardexSourcePath(r.source);
    if (path) navigate(path);
    else setOpening(r.source.id);
  };

  const select = (i: number) => {
    const line = lines[Math.max(0, Math.min(i, lines.length - 1))];
    if (!line) return;
    setSelectedKey(line.key);
    tableRef.current?.querySelector<HTMLElement>(`[data-key="${line.key}"]`)?.scrollIntoView({ block: "nearest" });
  };

  /** فتح مجموعة أو إغلاقها؛ عند الإغلاق ينتقل التحديد من سطر تفصيل إلى الملخص نفسه. */
  const toggleGroup = (key: string, open?: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open ?? !prev.has(key)) next.add(key);
      else next.delete(key);
      return next;
    });
    setSelectedKey(key);
  };

  const printCard = async () => {
    if (!data) return;
    setPrinting(true);
    try {
      const all: KardexRow[] = [];
      let p = 1;
      let last = 1;
      do {
        const r = await fetchKardex(p, 200);
        all.push(...r.rows);
        last = r.last_page;
        p++;
      } while (p <= last && p <= 25);
      printReport({
        title: `كرت الصنف — ${data.item.name}`,
        subtitle: `رقم الصنف ${data.item.code} · الوحدة ${unit}`,
        filters: [
          ["المخزن", data.warehouse?.name ?? "كل المخازن"],
          ["من", data.from],
          ["إلى", data.to],
          ["رصيد أول الفترة", fmtNum(data.opening.quantity)],
        ],
        columns: [
          { label: "رقم الحركة" },
          { label: "اسم المخزن" },
          { label: "التاريخ" },
          ...(costs ? [{ label: "سعر الوحدة", num: true }] : []),
          { label: "الوارد", num: true },
          { label: "الصادر", num: true },
          { label: "الرصيد", num: true },
          { label: "الوصف" },
          { label: "اسم الحساب" },
        ],
        rows: all.map((r) => [
          r.number,
          r.warehouse?.name,
          r.accounting_day,
          ...(costs ? [fmtNum(r.unit_cost, 4)] : []),
          Number(r.quantity_in) ? fmtNum(r.quantity_in) : null,
          Number(r.quantity_out) ? fmtNum(r.quantity_out) : null,
          fmtNum(r.running_quantity),
          r.description,
          r.account_name,
        ]),
        totals: [
          ["الوارد", fmtNum(data.totals.quantity_in)],
          ["الصادر", fmtNum(data.totals.quantity_out)],
          ["رصيد آخر الفترة", `${fmtNum(data.totals.closing_quantity)} ${unit}`],
        ],
        landscape: true,
      });
    } catch (e) {
      toast.error("تعذّرت الطباعة", inventoryErrorMessage(e));
    } finally {
      setPrinting(false);
    }
  };

  const items: ToolbarItem[] = [
    {
      id: "source",
      label: "مراجعة أصل الحركة",
      icon: ExternalLink,
      keys: "F11",
      disabled: !current?.source,
      hint: groupSelected ? "سطر مجمّع — افتحه واختر حركة" : undefined,
      onClick: () => openSource(current),
    },
    {
      id: "reverse",
      label: "عكس الحركة",
      icon: Undo2,
      keys: "F4",
      tone: "danger",
      hidden: !canReverse,
      disabled: !current?.can_reverse,
      hint: groupSelected ? "سطر مجمّع — افتحه واختر حركة" : "لأرصدة أول المدة فقط",
      onClick: () => current && setReversing(current),
    },
    "sep",
    { id: "print", label: "طباعة الكرت", icon: Printer, keys: "Ctrl+P", disabled: !data || rows.length === 0, loading: printing, onClick: printCard },
    { id: "reload", label: "إعادة تحميل", icon: RefreshCw, keys: "F8", disabled: !itemId, onClick: load },
    { id: "exit", label: "خروج", icon: LogOut, keys: "Esc", onClick: () => navigate("/inventory/dashboard") },
  ];

  const onTableKey = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const line = selectedLine;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      select(selectedIndex + (e.key === "ArrowDown" ? 1 : -1));
    } else if (line?.kind === "group" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      toggleGroup(line.key);
    } else if (line?.kind === "group" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      // RTL: ← يفتح (للأمام)، → يغلق
      e.preventDefault();
      toggleGroup(line.key, e.key === "ArrowLeft");
    } else if (line?.kind === "row" && line.groupKey && e.key === "ArrowRight") {
      e.preventDefault();
      toggleGroup(line.groupKey, false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      openSource(current);
    }
  };

  const movementRow = (r: KardexRow, key: string, child: boolean) => {
    const isSelected = key === selectedLine?.key;
    return (
      <tr
        key={key}
        data-key={key}
        aria-selected={isSelected}
        onClick={() => setSelectedKey(key)}
        onDoubleClick={() => openSource(r)}
        className={`cursor-pointer ${isSelected ? "bg-red-600/15" : child ? "bg-slate-950/30 hover:bg-white/5" : "hover:bg-white/5"} ${r.is_reversed ? "opacity-60" : ""}`}
      >
        <td className={`${td} ${child ? "pr-6 border-r-2 border-r-red-500/40" : ""}`}>
          <bdi className="font-mono text-xs font-bold text-white">{r.number}</bdi>
          {r.reversal_of_id && <span className="block text-[10px] text-amber-300 font-bold">عكس #{r.reversal_of_id}</span>}
          {r.is_reversed && <span className="block text-[10px] text-slate-500 font-bold">معكوسة</span>}
        </td>
        <td className={`${td} text-slate-300 whitespace-nowrap`}>{r.warehouse?.name}</td>
        <td className={`${td} whitespace-nowrap tabular-nums`}>
          <span className="text-slate-200">{r.accounting_day}</span>
          <span className="text-[11px] text-slate-500 mr-1.5">{timeOf(r.occurred_at)}</span>
        </td>
        {costs && <td className={`${td} tabular-nums text-left text-slate-300`}>{fmtNum(r.unit_cost, 4)}</td>}
        <td className={`${td} tabular-nums text-left font-bold text-green-400`}>{Number(r.quantity_in) ? fmtNum(r.quantity_in) : ""}</td>
        <td className={`${td} tabular-nums text-left font-bold text-red-400`}>{Number(r.quantity_out) ? fmtNum(r.quantity_out) : ""}</td>
        <td className={`${td} tabular-nums text-left font-black ${Number(r.running_quantity) < 0 ? "text-red-400" : "text-white"}`}>{fmtNum(r.running_quantity)}</td>
        <td className={`${td} text-xs text-slate-400 max-w-[260px]`}>
          <span className="block font-bold text-slate-300">{r.type_label}</span>
          <span className="block truncate" title={r.description}>
            {r.description !== r.type_label ? r.description : ""}
          </span>
          {r.entered_unit && r.entered_quantity && (
            <span className="block">
              أُدخل: {fmtNum(r.entered_quantity)} {r.entered_unit}
            </span>
          )}
        </td>
        <td className={`${td} text-slate-300`}>{r.account_name ?? ""}</td>
      </tr>
    );
  };

  const groupRow = (key: string, groupRows: KardexRow[]) => {
    const s = summarizeSaleRun(groupRows);
    const open = expanded.has(key);
    const isSelected = key === selectedLine?.key;
    return (
      <tr
        key={key}
        data-key={key}
        aria-selected={isSelected}
        aria-expanded={open}
        title={open ? "اضغط لإغلاق التفاصيل" : "اضغط لعرض حركات المجموعة"}
        onClick={() => toggleGroup(key)}
        className={`cursor-pointer ${isSelected ? "bg-red-600/15" : "bg-slate-800/50 hover:bg-slate-800"}`}
      >
        <td className={td}>
          <span className="font-bold text-xs text-white whitespace-nowrap">استهلاك بيع ({s.orders} طلب)</span>
          {s.movements !== s.orders && <span className="block text-[10px] text-slate-500 font-bold">{s.movements} حركة</span>}
        </td>
        <td className={`${td} text-slate-300 whitespace-nowrap`}>{s.warehouse ?? <span className="text-slate-500">عدة مخازن</span>}</td>
        <td className={`${td} whitespace-nowrap tabular-nums`}>
          {s.firstDay === s.lastDay ? (
            <>
              <span className="text-slate-200">{s.firstDay}</span>
              <bdi dir="ltr" className="text-[11px] text-slate-500 mr-1.5">
                {timeOf(s.firstAt)}–{timeOf(s.lastAt)}
              </bdi>
            </>
          ) : (
            <span className="text-slate-200">
              {s.firstDay} <span className="text-slate-500 text-[11px]">إلى</span> {s.lastDay}
            </span>
          )}
        </td>
        {costs && (
          <td className={`${td} tabular-nums text-left text-slate-300`} title={s.uniformCost ? undefined : "متوسط مرجّح بالكمية الصادرة"}>
            {fmtNum(s.unitCost, 4)}
            {!s.uniformCost && <span className="block text-[10px] text-slate-500">متوسط</span>}
          </td>
        )}
        <td className={`${td} tabular-nums text-left font-bold text-green-400`}>{s.quantityIn ? fmtNum(s.quantityIn) : ""}</td>
        <td className={`${td} tabular-nums text-left font-bold text-red-400`}>{fmtNum(s.quantityOut)}</td>
        <td className={`${td} tabular-nums text-left font-black ${Number(s.runningQuantity) < 0 ? "text-red-400" : "text-white"}`}>{fmtNum(s.runningQuantity)}</td>
        <td className={`${td} text-xs`}>
          <span className="flex items-center gap-1.5 font-bold text-slate-300">
            {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronLeft size={14} className="text-slate-400 shrink-0" />}
            استهلاك بيع - إجمالي
          </span>
        </td>
        <td className={`${td} text-slate-300`}>{s.account ?? ""}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      <DocToolbar items={items} shortcutsEnabled={!reversing && opening === null} title="كرت الصنف" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end pt-2">
        <Field label="المخزن">
          <select className={inputClass} value={warehouseId ?? ""} onChange={(e) => setParam({ warehouse_id: e.target.value || null })}>
            <option value="">كل المخازن</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="space-y-1.5">
          <span className="text-xs font-black text-slate-400 tracking-wider">الصنف</span>
          <StockItemPicker
            value={pickedItem}
            onChange={(item) => {
              setPickedItem(item);
              setParam({ stock_item_id: item?.id ?? null });
            }}
            ariaLabel="الصنف"
          />
        </div>
        <Field label="من يوم">
          <input type="date" className={inputClass} value={from || data?.from || ""} max={to || data?.to || undefined} onChange={(e) => setParam({ from: e.target.value })} dir="ltr" />
        </Field>
        <Field label="إلى يوم">
          <input type="date" className={inputClass} value={to || data?.to || ""} min={from || data?.from || undefined} onChange={(e) => setParam({ to: e.target.value })} dir="ltr" />
        </Field>
      </div>

      {!itemId ? (
        <EmptyBlock icon={History} text="اختر الصنف لعرض كرته (المخزن اختياري)" />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="رصيد أول الفترة" value={`${fmtNum(data.opening.quantity)} ${unit}`} sub={costs ? `${fmtNum(data.opening.value, 2)} ₪` : undefined} />
            <SummaryCard label="الوارد" value={`${fmtNum(data.totals.quantity_in)} ${unit}`} tone="text-green-400" />
            <SummaryCard label="الصادر" value={`${fmtNum(data.totals.quantity_out)} ${unit}`} tone="text-red-400" />
            <SummaryCard
              label="رصيد آخر الفترة"
              value={`${fmtNum(data.totals.closing_quantity)} ${unit}`}
              sub={costs ? `${fmtNum(data.totals.closing_value, 2)} ₪` : undefined}
              tone={Number(data.totals.closing_quantity) < 0 ? "text-red-400" : "text-white"}
            />
          </div>

          {rows.length === 0 ? (
            <EmptyBlock icon={History} text="لا توجد حركات في هذه الفترة" />
          ) : (
            <div
              ref={tableRef}
              tabIndex={0}
              onKeyDown={onTableKey}
              aria-label="حركات الصنف — الأسهم للاختيار، Enter لمراجعة أصل الحركة أو لفتح سطر استهلاك البيع المجمّع"
              className={`rounded-xl border border-white/10 overflow-auto custom-scrollbar max-h-[60vh] bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-opacity ${loading ? "opacity-60" : ""}`}
            >
              <table className="w-full border-collapse text-sm min-w-[1080px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {["رقم الحركة", "اسم المخزن", "التاريخ", ...(costs ? ["سعر الوحدة"] : []), "الكمية الواردة", "الكمية الصادرة", "الرصيد", "الوصف", "اسم الحساب"].map((h) => (
                      <th key={h} scope="col" className="bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 text-right whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{lines.map((l) => (l.kind === "group" ? groupRow(l.key, l.rows) : movementRow(l.row, l.key, Boolean(l.groupKey))))}</tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 font-bold text-xs">
              {data.total} حركة{data.last_page > 1 ? ` — صفحة ${data.current_page} من ${data.last_page}` : ""} · غير مدعوم: رقم التشغيلة/السيريال والتكلفة الإضافية
            </span>
            {data.last_page > 1 && (
              <div className="flex gap-1.5">
                <IconButton label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => setParam({ page: page - 1 })}>
                  <ChevronRight size={16} />
                </IconButton>
                <IconButton label="الصفحة التالية" disabled={page >= data.last_page || loading} onClick={() => setParam({ page: page + 1 })}>
                  <ChevronLeft size={16} />
                </IconButton>
              </div>
            )}
          </div>
        </>
      ) : null}

      {reversing && (
        <ReverseModal
          row={reversing}
          unit={unit}
          onClose={() => setReversing(null)}
          onDone={() => {
            setReversing(null);
            load();
          }}
        />
      )}
      {opening !== null && <OpeningDetailModal movementId={opening} onClose={() => setOpening(null)} />}
    </div>
  );
};

const ReverseModal: React.FC<{ row: KardexRow; unit: string; onClose: () => void; onDone: () => void }> = ({ row, unit, onClose, onDone }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await inventoryService.reverseMovement(row.id, reason.trim());
      toast.success("تم عكس الحركة");
      onDone();
    } catch (err) {
      toast.error("تعذّر عكس الحركة", inventoryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`عكس الحركة #${row.id}`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton type="submit" form="reverse-form" loading={saving} disabled={!reason.trim()}>
            تأكيد العكس
          </PrimaryButton>
        </>
      }
    >
      <form id="reverse-form" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-300">
          ستُسجَّل حركة جديدة بكمية <span className="font-black tabular-nums">{fmtNum(-Number(row.quantity))} {unit}</span> وبتكلفة الحركة الأصلية نفسها ({fmtNum(row.unit_cost, 4)} ₪). الحركة
          الأصلية تبقى كما هي، ولا يمكن عكسها مرة ثانية.
        </p>
        <Field label="سبب العكس" required>
          <textarea className={`${inputClass} min-h-[80px]`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required autoFocus />
        </Field>
      </form>
    </Modal>
  );
};
