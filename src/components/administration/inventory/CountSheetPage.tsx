/**
 * CountSheetPage.tsx — ورقة الجرد (/inventory/counts/:id) ببنية الأمين: رأس مضغوط، جدول ExcelGrid، وتذييل للإجماليات.
 *
 * الأعمدة: م، رقم الصنف، اسم الصنف، الوحدة، سعر الوحدة، الكمية بالمخزن، الكمية المجرودة، الفرق، الإجمالي، الحد الأدنى.
 * كل الكميات والسعر بالوحدة المختارة للسطر. الإجمالي = المجرود × سعر الوحدة. السعر = متوسط التكلفة الحالي
 * (وفي المثبّت: تكلفة التسوية المسجّلة). الفرق في المسودة تقديري؛ النهائي يُحسب لحظة التثبيت مقابل الرصيد عندها.
 *
 * الأدوات: فحص الأصناف (غير المجرود في الورقة، وأصناف لها رصيد وليست في الورقة)، إعادة احتساب الكمية بالمخزن،
 * تثبيت الجرد (الترحيل الحالي)، دمج مسودات المخزن نفسه، تكرار الكشف، طباعة، بحث عن صنف.
 * لا يوجد عكس لجرد مثبّت في النظام: الخطأ يُصحَّح بجرد جديد.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calculator, Combine, Copy, Loader2, LogOut, Plus, Printer, RefreshCw, Save, ScanSearch, Search, Send, Trash2 } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type CountMissingItem,
  type InventoryLookups,
  type StockCount,
  type StockCountLine,
  type Warehouse,
} from "../../../services/inventoryService";
import { DocToolbar, type ToolbarItem } from "./DocToolbar";
import { ExcelGrid, gridInput, gridTd, gridText, useExcelGridNav, type GridColumn } from "./ExcelGrid";
import { NewCountModal, StockCountStatus } from "./StockCountsPage";
import { parseQty } from "./TransferEntryPage";
import { printReport } from "./printReport";
import { LoadingBlock, Modal, PrimaryButton, SecondaryButton, inputClass } from "./ui";

interface Entry {
  unitId: number | "";
  quantity: string;
}

/** أرقام أعمدة الخانات القابلة للتركيز (data-col)، ثابتة ولو أُخفيت أعمدة التكلفة. */
const C = { unit: 3, qty: 6 } as const;

type Busy = "save" | "post" | "delete" | "recalc" | "duplicate" | "merge" | "add";

const unitOptions = (l: StockCountLine) => [
  { id: l.stock_item?.base_unit_id ?? 0, name: l.stock_item?.base_unit?.name ?? "", factor: 1 },
  ...(l.stock_item?.units ?? []).map((u) => ({ id: u.unit_id, name: u.unit?.name ?? "", factor: Number(u.factor) || 1 })),
];

const entriesOf = (c: StockCount): Record<number, Entry> => {
  const out: Record<number, Entry> = {};
  for (const l of c.lines ?? []) {
    out[l.stock_item_id] = {
      unitId: l.unit_id ?? l.stock_item?.base_unit_id ?? "",
      quantity: l.entered_quantity !== null ? String(Number(l.entered_quantity)) : "",
    };
  }
  return out;
};

export const CountSheetPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canManage = useCan(INVENTORY_PERMISSIONS.COUNTS_MANAGE);
  const canPost = useCan(INVENTORY_PERMISSIONS.COUNTS_POST);

  const [count, setCount] = useState<StockCount | null>(null);
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [onlyUncounted, setOnlyUncounted] = useState(false);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [dialog, setDialog] = useState<"check" | "merge" | "new" | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lookups, setLookups] = useState<InventoryLookups | null>(null);
  const dirty = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const apply = useCallback((c: StockCount, keepEntries = false) => {
    setCount(c);
    setNotes(c.notes ?? "");
    // الإبقاء على ما كُتب ولم يُحفظ (إعادة الاحتساب وإضافة أصناف لا تمس المعدود).
    setEntries((prev) => (keepEntries ? { ...entriesOf(c), ...prev } : entriesOf(c)));
    if (!keepEntries) dirty.current = false;
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await inventoryService.count(Number(id)));
    } catch (e) {
      toast.error("تعذّر تحميل ورقة الجرد", inventoryErrorMessage(e));
      navigate("/inventory/counts", { replace: true });
    }
  }, [id, apply, navigate]);

  useEffect(() => {
    load();
    inventoryService
      .warehouses()
      .then((w) => setWarehouses(w.filter((x) => x.is_active)))
      .catch(() => undefined);
    inventoryService.lookups().then(setLookups).catch(() => undefined);
  }, [load]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const draft = count?.status === "draft";
  const editable = draft && canManage;
  const costs = Boolean(count?.costs_visible);
  const lines = useMemo(() => count?.lines ?? [], [count]);

  const setEntry = (itemId: number, patch: Partial<Entry>) => {
    dirty.current = true;
    setEntries((s) => ({ ...s, [itemId]: { ...(s[itemId] ?? { unitId: "", quantity: "" }), ...patch } }));
  };

  /** قيم السطر بالوحدة المختارة. */
  const rowOf = (l: StockCountLine) => {
    const opts = unitOptions(l);
    const e = entries[l.stock_item_id];
    const unitId = draft ? (e === undefined || e.unitId === "" ? opts[0].id : e.unitId) : (l.unit_id ?? opts[0].id);
    const unit = opts.find((u) => u.id === unitId) ?? opts[0];
    const f = unit.factor;
    const baseCost = draft ? l.avg_cost : (l.unit_cost ?? l.avg_cost);
    const price = baseCost !== null && baseCost !== undefined ? Number(baseCost) * f : null;
    const expected = Number(l.expected_quantity) / f;
    const typed = draft && e !== undefined && e.quantity.trim() !== "";
    const counted = draft ? (typed ? parseQty(e.quantity) : null) : l.entered_quantity !== null ? Number(l.entered_quantity) : null;
    const diff = draft ? (counted === null ? null : counted - expected) : l.variance_quantity !== null ? Number(l.variance_quantity) / f : null;
    return {
      unit,
      opts,
      price,
      expected,
      counted,
      diff,
      total: counted !== null && price !== null ? counted * price : null,
      min: Number(l.stock_item?.safety_stock ?? 0) / f,
      // الفرق بالوحدة الأساسية × متوسط التكلفة (تقدير المسودة).
      diffValue: diff !== null && l.avg_cost ? diff * f * Number(l.avg_cost) : 0,
      invalid: typed && !(parseQty(e.quantity) >= 0),
    };
  };

  const isCounted = (l: StockCountLine) => (draft ? (entries[l.stock_item_id]?.quantity ?? "").trim() !== "" : l.counted_quantity !== null);
  const term = search.trim().toLowerCase();
  const visible = lines.filter(
    (l) =>
      (!term || (l.stock_item?.name ?? "").toLowerCase().includes(term) || (l.stock_item?.code ?? "").toLowerCase().includes(term)) &&
      (!onlyUncounted || !isCounted(l)),
  );

  const stats = useMemo(() => {
    let counted = 0;
    let countedValue = 0;
    let varianceValue = 0;
    for (const l of lines) {
      const r = rowOf(l);
      if (r.counted === null) continue;
      counted++;
      countedValue += r.total ?? 0;
      varianceValue += r.diffValue;
    }
    return { counted, countedValue, varianceValue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, entries, draft]);

  const grid = useExcelGridNav({ enterCols: [C.qty] });

  /* ── الإجراءات ── */

  const confirmDiscard = () => !dirty.current || window.confirm("توجد تعديلات غير محفوظة. تجاهلها؟");

  const go = (path: string) => {
    if (!confirmDiscard()) return;
    dirty.current = false;
    navigate(path);
  };

  /** يحفظ المعدود إن وُجدت تعديلات. يعيد null عند الفشل. */
  const persist = async (): Promise<StockCount | null> => {
    if (!count) return null;
    if (!dirty.current) return count;
    const bad = lines.find((l) => rowOf(l).invalid);
    if (bad) {
      toast.warning(`كمية غير صالحة للصنف "${bad.stock_item?.name ?? ""}"`);
      return null;
    }
    try {
      const saved = await inventoryService.saveCount(count.id, {
        notes: notes.trim() || null,
        lines: lines.map((l) => {
          const e = entries[l.stock_item_id];
          const filled = e !== undefined && e.quantity.trim() !== "";
          return {
            stock_item_id: l.stock_item_id,
            unit_id: filled && e.unitId !== "" ? e.unitId : null,
            entered_quantity: filled ? parseQty(e.quantity) : null,
          };
        }),
      });
      apply(saved);
      return saved;
    } catch (e) {
      toast.error("تعذّر حفظ المعدود", inventoryErrorMessage(e));
      return null;
    }
  };

  const save = async () => {
    if (!editable || busy) return;
    setBusy("save");
    dirty.current = true; // الملاحظات وحدها تُحفظ أيضاً
    if (await persist()) toast.success("تم حفظ المعدود");
    setBusy(null);
  };

  const post = async () => {
    if (!count || !draft || busy) return;
    if (stats.counted === 0) {
      toast.warning("لم يُدخل أي معدود", "أدخل الكمية المجرودة لصنف واحد على الأقل.");
      return;
    }
    if (
      !window.confirm(
        `تثبيت الجرد يسجّل تسوية لكل صنف مجرود (${stats.counted} صنف) مقابل الرصيد لحظة التثبيت. ` +
          "الأصناف غير المجرودة لا تُسوّى. لا يمكن تعديل الورقة أو عكسها بعد التثبيت — يُصحَّح الخطأ بجرد جديد. متابعة؟",
      )
    )
      return;
    setBusy("post");
    const saved = await persist();
    if (saved) {
      try {
        apply(await inventoryService.postCount(saved.id));
        toast.success("تم تثبيت الجرد وتسوية الفروق");
      } catch (e) {
        toast.error("تعذّر تثبيت الجرد", inventoryErrorMessage(e));
      }
    }
    setBusy(null);
  };

  const remove = async () => {
    if (!count || !editable || busy || !window.confirm(`حذف ورقة الجرد ${count.number}؟`)) return;
    setBusy("delete");
    try {
      await inventoryService.deleteCount(count.id);
      toast.success("تم حذف ورقة الجرد");
      dirty.current = false;
      navigate("/inventory/counts");
    } catch (e) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(e));
      setBusy(null);
    }
  };

  const recalc = async () => {
    if (!count || !editable || busy) return;
    setBusy("recalc");
    try {
      apply(await inventoryService.recalculateCount(count.id), true);
      toast.success("أُعيد احتساب الكمية بالمخزن والسعر", "من الرصيد ومتوسط التكلفة الحاليين.");
    } catch (e) {
      toast.error("تعذّرت إعادة الاحتساب", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async () => {
    if (!count || busy || !confirmDiscard()) return;
    setBusy("duplicate");
    try {
      const copy = await inventoryService.duplicateCount(count.id);
      toast.success(`أُنشئت ورقة الجرد ${copy.number}`, "بأصناف الورقة نفسها، بالرصيد الحالي وبلا معدود.");
      dirty.current = false;
      navigate(`/inventory/counts/${copy.id}`);
    } catch (e) {
      toast.error("تعذّر تكرار الكشف", inventoryErrorMessage(e));
      setBusy(null);
    }
  };

  const print = () => {
    if (!count) return;
    if (dirty.current) {
      toast.warning("توجد تعديلات غير محفوظة", "احفظ (F2) ثم اطبع.");
      return;
    }
    printReport({
      title: `ورقة جرد ${count.number}`,
      subtitle: `${count.warehouse?.name ?? ""} — ${count.day ?? ""}`,
      filters: [
        ["الحالة", draft ? "مسودة" : "مثبّت"],
        ["المخزن", count.warehouse?.name ?? "—"],
        ["تاريخ الحركة", count.day ?? "—"],
        ...(count.notes ? ([["ملاحظات", count.notes]] as [string, string][]) : []),
      ],
      columns: [
        { label: "م", num: true },
        { label: "رقم الصنف" },
        { label: "اسم الصنف" },
        { label: "الوحدة" },
        ...(costs ? [{ label: "سعر الوحدة", num: true }] : []),
        { label: "الكمية بالمخزن", num: true },
        { label: "الكمية المجرودة", num: true },
        { label: "الفرق", num: true },
        ...(costs ? [{ label: "الإجمالي", num: true }] : []),
        { label: "الحد الأدنى", num: true },
      ],
      rows: lines.map((l, i) => {
        const r = rowOf(l);
        return [
          i + 1,
          l.stock_item?.code,
          l.stock_item?.name,
          r.unit.name,
          ...(costs ? [r.price !== null ? fmtNum(r.price, 4) : null] : []),
          fmtNum(r.expected),
          r.counted !== null ? fmtNum(r.counted) : null,
          r.diff !== null ? fmtNum(r.diff) : null,
          ...(costs ? [r.total !== null ? fmtNum(r.total, 2) : null] : []),
          r.min ? fmtNum(r.min) : null,
        ];
      }),
      totals: [
        ["عدد الأصناف", String(lines.length)],
        ["المجرود", String(stats.counted)],
        ...(costs
          ? ([
              ["قيمة المجرود (₪)", fmtNum(stats.countedValue, 2)],
              [draft ? "قيمة الفروق التقديرية (₪)" : "قيمة الفروق (₪)", fmtNum(draft ? stats.varianceValue : count.variance_value, 2)],
            ] as [string, string][])
          : []),
      ],
      landscape: true,
    });
  };

  const otherDrafts = count?.other_drafts?.length ?? 0;
  const items: ToolbarItem[] = [
    { id: "new", label: "جديد", icon: Plus, keys: "F3", hidden: !canManage, onClick: () => confirmDiscard() && setDialog("new") },
    { id: "save", label: "حفظ", icon: Save, keys: "F2", hidden: !editable, loading: busy === "save", disabled: busy !== null, onClick: save },
    { id: "post", label: "تثبيت الجرد", icon: Send, keys: "F9", tone: "primary", hidden: !draft || !canPost, loading: busy === "post", disabled: busy !== null, onClick: post },
    { id: "delete", label: "حذف", icon: Trash2, keys: "F4", tone: "danger", hidden: !editable, loading: busy === "delete", disabled: busy !== null, onClick: remove },
    "sep",
    { id: "check", label: "فحص الأصناف", icon: ScanSearch, keys: "F6", disabled: !count, hint: "غير المجرود، وأصناف لها رصيد وليست في الورقة", onClick: () => setDialog("check") },
    {
      id: "recalc",
      label: "إعادة احتساب",
      icon: Calculator,
      keys: "F7",
      hidden: !editable,
      loading: busy === "recalc",
      disabled: busy !== null,
      hint: "الكمية بالمخزن والسعر من الرصيد الحالي",
      onClick: recalc,
    },
    {
      id: "merge",
      label: "دمج الجرد",
      icon: Combine,
      keys: "Alt+M",
      hidden: !editable,
      disabled: busy !== null || otherDrafts === 0,
      hint: otherDrafts ? undefined : "لا توجد مسودات أخرى لهذا المخزن",
      onClick: () => setDialog("merge"),
    },
    { id: "duplicate", label: "تكرار الكشف", icon: Copy, keys: "Ctrl+D", hidden: !canManage, disabled: !count || busy !== null, loading: busy === "duplicate", onClick: duplicate },
    { id: "print", label: "طباعة", icon: Printer, keys: "Ctrl+P", disabled: !count, onClick: print },
    "sep",
    { id: "search", label: "بحث عن صنف", icon: Search, keys: "Ctrl+F", onClick: () => searchRef.current?.focus() },
    { id: "reload", label: "إعادة تحميل", icon: RefreshCw, keys: "F8", onClick: () => confirmDiscard() && load() },
    { id: "exit", label: "خروج", icon: LogOut, keys: "Esc", onClick: () => go("/inventory/counts") },
  ];

  if (!count) return <LoadingBlock />;

  const columns: GridColumn[] = [
    { key: "n", label: "م", width: "2.75rem", align: "center" },
    { key: "code", label: "رقم الصنف", width: "7rem" },
    { key: "name", label: "اسم الصنف" },
    { key: "unit", label: "الوحدة", width: "7rem" },
    { key: "price", label: "سعر الوحدة", width: "7rem", align: "end", hidden: !costs },
    { key: "stock", label: "الكمية بالمخزن", width: "7.5rem", align: "end" },
    { key: "qty", label: "الكمية المجرودة", width: "7.5rem", align: "end" },
    { key: "diff", label: "الفرق", width: "7rem", align: "end" },
    { key: "total", label: "الإجمالي", width: "8rem", align: "end", hidden: !costs },
    { key: "min", label: "الحد الأدنى", width: "6.5rem", align: "end" },
  ];
  const varianceShown = draft ? stats.varianceValue : Number(count.variance_value);

  return (
    <div className="space-y-3 pb-2" dir="rtl">
      <DocToolbar
        items={items}
        shortcutsEnabled={dialog === null}
        title={
          <span className="flex items-center gap-2">
            ورقة جرد <bdi className="font-mono">{count.number}</bdi>
            <StockCountStatus status={count.status} />
          </span>
        }
      />

      <section aria-label="رأس الجرد" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-3 gap-y-2 bg-slate-900 border border-white/5 rounded-2xl p-3 pt-2">
        <HeaderValue label="رقم الحركة" value={<bdi className="font-mono">{count.number}</bdi>} />
        <HeaderValue label="المخزن" value={count.warehouse?.name ?? "—"} />
        <HeaderValue label="تاريخ الحركة" value={<bdi className="tabular-nums">{count.day ?? "—"}</bdi>} />
        <HeaderValue label="أنشأها" value={count.creator?.name ?? "—"} />
        <HeaderValue label={draft ? "الحالة" : "ثبّتها"} value={draft ? "مسودة — لم تُسوَّ الفروق بعد" : (count.poster?.name ?? "—")} />
        <label className="block space-y-1 col-span-2 md:col-span-4 xl:col-span-1">
          <span className="text-[11px] font-black text-slate-500">ملاحظات</span>
          <input
            className={`${inputClass} !py-2`}
            value={notes}
            disabled={!editable}
            maxLength={1000}
            onChange={(e) => {
              dirty.current = true;
              setNotes(e.target.value);
            }}
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={searchRef}
          type="search"
          className={`${inputClass} !py-2 !w-72 max-w-full`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && search) {
              e.preventDefault();
              e.stopPropagation();
              setSearch("");
            } else if (e.key === "Enter" || e.key === "ArrowDown") {
              e.preventDefault();
              grid.requestFocus(0, C.qty);
            }
          }}
          placeholder="بحث عن صنف بالرقم أو الاسم..."
          aria-label="بحث عن صنف"
        />
        <label className="flex items-center gap-2 text-sm font-bold text-slate-300 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-red-600" checked={onlyUncounted} onChange={(e) => setOnlyUncounted(e.target.checked)} />
          غير المجرود فقط
        </label>
        <span className="text-[11px] text-slate-500 font-semibold">
          {draft
            ? "اترك الكمية فارغة للصنف الذي لم يُجرد — لا تُسجَّل له تسوية. Enter ينزل للسطر التالي."
            : `ثُبّت في ${count.day ?? ""}. لا يوجد عكس لتسوية الجرد في النظام — الخطأ يُصحَّح بجرد جديد.`}
        </span>
      </div>

      <ExcelGrid ref={grid.gridRef} columns={columns} ariaLabel="أصناف الجرد" minWidth={1000} maxHeight="58vh" onKeyDown={grid.onKeyDown} onFocus={grid.onFocus}>
        {visible.length === 0 ? (
          <tr>
            <td colSpan={columns.filter((c) => !c.hidden).length} className={`${gridTd} p-6 text-center text-slate-500 font-bold`}>
              {onlyUncounted ? "كل الأصناف مجرودة" : "لا توجد أصناف مطابقة"}
            </td>
          </tr>
        ) : (
          visible.map((l, row) => {
            const r = rowOf(l);
            const e = entries[l.stock_item_id] ?? { unitId: "", quantity: "" };
            const belowMin = r.counted !== null && r.min > 0 && r.counted < r.min;
            return (
              <tr key={l.id} className={r.invalid ? "bg-red-500/10" : row === grid.activeRow ? "bg-red-600/5" : r.counted === null ? "" : "bg-white/[0.02]"}>
                <td className={`${gridTd} text-center text-slate-500 tabular-nums`}>{row + 1}</td>
                <td className={gridTd}>
                  <div className={gridText}>
                    <bdi className="font-mono text-xs text-slate-300">{l.stock_item?.code}</bdi>
                  </div>
                </td>
                <td className={gridTd}>
                  <div className={`${gridText} font-bold ${r.counted === null ? "text-slate-300" : "text-white"}`}>{l.stock_item?.name}</div>
                </td>
                <td className={gridTd}>
                  {editable && r.opts.length > 1 ? (
                    <select
                      className={gridInput}
                      value={r.unit.id}
                      onChange={(ev) => setEntry(l.stock_item_id, { unitId: Number(ev.target.value) })}
                      data-row={row}
                      data-col={C.unit}
                      aria-label={`وحدة ${l.stock_item?.name ?? ""}`}
                    >
                      {r.opts.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={`${gridText} text-slate-300`}>{r.unit.name}</div>
                  )}
                </td>
                {costs && (
                  <td className={gridTd}>
                    <div className={`${gridText} justify-end tabular-nums text-slate-300`}>{r.price !== null ? fmtNum(r.price, 4) : "—"}</div>
                  </td>
                )}
                <td className={gridTd}>
                  <div className={`${gridText} justify-end tabular-nums text-slate-300`}>{fmtNum(r.expected)}</div>
                </td>
                <td className={gridTd}>
                  {editable ? (
                    <input
                      className={`${gridInput} text-left tabular-nums`}
                      inputMode="decimal"
                      dir="ltr"
                      value={e.quantity}
                      onChange={(ev) => setEntry(l.stock_item_id, { quantity: ev.target.value, unitId: e.unitId === "" ? r.unit.id : e.unitId })}
                      data-row={row}
                      data-col={C.qty}
                      aria-label={`الكمية المجرودة — ${l.stock_item?.name ?? ""}`}
                      aria-invalid={r.invalid || undefined}
                      placeholder="—"
                    />
                  ) : (
                    <div className={`${gridText} justify-end tabular-nums ${r.counted === null ? "text-slate-500" : "text-white font-bold"}`}>
                      {r.counted === null ? "لم يُجرد" : fmtNum(r.counted)}
                    </div>
                  )}
                </td>
                <td className={gridTd}>
                  <div
                    className={`${gridText} justify-end tabular-nums font-bold ${
                      r.diff === null ? "text-slate-600" : r.diff < 0 ? "text-red-400" : r.diff > 0 ? "text-green-400" : "text-slate-400"
                    }`}
                  >
                    {r.diff === null ? "" : `${r.diff > 0 ? "+" : ""}${fmtNum(r.diff)}`}
                  </div>
                </td>
                {costs && (
                  <td className={gridTd}>
                    <div className={`${gridText} justify-end tabular-nums text-white`}>{r.total !== null ? fmtNum(r.total, 2) : ""}</div>
                  </td>
                )}
                <td className={gridTd}>
                  <div
                    className={`${gridText} justify-end tabular-nums ${belowMin ? "text-amber-300 font-bold" : "text-slate-400"}`}
                    title={belowMin ? "المجرود أقل من الحد الأدنى" : undefined}
                  >
                    {r.min ? fmtNum(r.min) : ""}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </ExcelGrid>

      <footer className="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-2.5 bg-slate-950/95 backdrop-blur border-t border-white/5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold text-slate-400">
        <span>
          عدد الأصناف: <span className="text-white tabular-nums">{lines.length}</span>
        </span>
        <span>
          المجرود: <span className="text-white tabular-nums">{stats.counted}</span>
        </span>
        <span>
          غير المجرود: <span className="text-white tabular-nums">{lines.length - stats.counted}</span>
        </span>
        {costs && (
          <>
            <span>
              قيمة المجرود: <span className="text-white tabular-nums">{fmtNum(stats.countedValue, 2)} ₪</span>
            </span>
            <span>
              {draft ? "قيمة الفروق (تقديرية)" : "قيمة الفروق"}:{" "}
              <span className={`tabular-nums ${varianceShown < 0 ? "text-red-400" : "text-white"}`}>{fmtNum(varianceShown, 2)} ₪</span>
            </span>
          </>
        )}
      </footer>

      {dialog === "check" && (
        <CheckItemsModal
          count={count}
          uncounted={lines.length - stats.counted}
          canAdd={editable}
          onShowUncounted={() => {
            setOnlyUncounted(true);
            setSearch("");
            setDialog(null);
          }}
          onAdded={(c) => {
            apply(c, true);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "merge" && (
        <MergeModal
          count={count}
          busy={busy === "merge"}
          onClose={() => setDialog(null)}
          onMerge={async (ids) => {
            setBusy("merge");
            const saved = await persist();
            if (saved) {
              try {
                apply(await inventoryService.mergeCounts(saved.id, ids));
                toast.success("تم دمج الجرد", "جُمعت كميات الأصناف المشتركة وحُذفت الأوراق المدموجة.");
                setDialog(null);
              } catch (e) {
                toast.error("تعذّر الدمج", inventoryErrorMessage(e));
              }
            }
            setBusy(null);
          }}
        />
      )}
      {dialog === "new" && (
        <NewCountModal
          warehouses={warehouses}
          lookups={lookups}
          defaultWarehouse={count.warehouse_id}
          onClose={() => setDialog(null)}
          onCreated={(c) => {
            dirty.current = false;
            setDialog(null);
            navigate(`/inventory/counts/${c.id}`);
          }}
        />
      )}
    </div>
  );
};

const HeaderValue: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="space-y-1 min-w-0">
    <span className="text-[11px] font-black text-slate-500">{label}</span>
    <div className={`${inputClass} !py-2 opacity-90 truncate`}>{value}</div>
  </div>
);

/** فحص الأصناف: غير المجرود في الورقة، وأصناف لها رصيد في المخزن وليست في الورقة (مع إضافتها). */
const CheckItemsModal: React.FC<{
  count: StockCount;
  uncounted: number;
  canAdd: boolean;
  onShowUncounted: () => void;
  onAdded: (c: StockCount) => void;
  onClose: () => void;
}> = ({ count, uncounted, canAdd, onShowUncounted, onAdded, onClose }) => {
  const draft = count.status === "draft";
  const [missing, setMissing] = useState<CountMissingItem[] | null>(draft ? null : []);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!draft) return;
    inventoryService
      .countMissing(count.id)
      .then((m) => {
        setMissing(m);
        setPicked(new Set(m.map((x) => x.id)));
      })
      .catch((e) => {
        setMissing([]);
        toast.error("تعذّر فحص الأصناف", inventoryErrorMessage(e));
      });
  }, [count.id, draft]);

  const toggle = (itemId: number) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });

  const add = async () => {
    if (picked.size === 0) return;
    setAdding(true);
    try {
      onAdded(await inventoryService.addCountLines(count.id, [...picked]));
      toast.success(`أُضيف ${picked.size} صنف للورقة`);
    } catch (e) {
      toast.error("تعذّرت الإضافة", inventoryErrorMessage(e));
      setAdding(false);
    }
  };

  return (
    <Modal
      wide
      title="فحص الأصناف"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إغلاق</SecondaryButton>
          {canAdd && (missing?.length ?? 0) > 0 && (
            <PrimaryButton onClick={add} loading={adding} disabled={picked.size === 0}>
              إضافة المحدد للورقة ({picked.size})
            </PrimaryButton>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/60 border border-white/5">
          <p className="text-sm text-slate-300">
            أصناف في الورقة لم تُجرد: <span className="font-black text-white tabular-nums">{uncounted}</span>
            <span className="block text-[11px] text-slate-500">لا تُسجَّل لها تسوية عند التثبيت.</span>
          </p>
          {uncounted > 0 && <SecondaryButton onClick={onShowUncounted}>عرض غير المجرود فقط</SecondaryButton>}
        </div>

        {draft && (
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400">أصناف لها رصيد في {count.warehouse?.name} وليست في الورقة</p>
            {missing === null ? (
              <Loader2 size={22} className="mx-auto my-4 text-red-500 animate-spin" />
            ) : missing.length === 0 ? (
              <p className="text-sm text-green-400 font-bold">لا يوجد — كل الأصناف التي لها رصيد موجودة في الورقة.</p>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-auto max-h-72 custom-scrollbar">
                <table className="w-full border-collapse text-sm min-w-[480px]">
                  <thead className="sticky top-0">
                    <tr>
                      {["", "رقم الصنف", "اسم الصنف", "الرصيد"].map((h, i) => (
                        <th key={i} className="bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 text-right">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {missing.map((m) => (
                      <tr key={m.id}>
                        <td className="border border-white/10 px-2 py-1.5 w-8">
                          <input type="checkbox" className="accent-red-600" disabled={!canAdd} checked={picked.has(m.id)} onChange={() => toggle(m.id)} aria-label={`اختيار ${m.name}`} />
                        </td>
                        <td className="border border-white/10 px-2 py-1.5">
                          <bdi className="font-mono text-xs">{m.code}</bdi>
                        </td>
                        <td className="border border-white/10 px-2 py-1.5 text-white font-bold">{m.name}</td>
                        <td className="border border-white/10 px-2 py-1.5 tabular-nums">
                          {fmtNum(m.quantity)} <span className="text-xs text-slate-500">{m.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

/** دمج مسودات المخزن نفسه في هذه الورقة، بعد التأكيد. */
const MergeModal: React.FC<{
  count: StockCount;
  busy: boolean;
  onMerge: (ids: number[]) => void;
  onClose: () => void;
}> = ({ count, busy, onMerge, onClose }) => {
  const drafts = count.other_drafts ?? [];
  const [picked, setPicked] = useState<Set<number>>(new Set(drafts.map((d) => d.id)));
  const names = drafts
    .filter((d) => picked.has(d.id))
    .map((d) => d.number)
    .join("، ");

  const toggle = (draftId: number) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(draftId)) next.delete(draftId);
      else next.add(draftId);
      return next;
    });

  const submit = () => {
    if (picked.size === 0) return;
    if (!window.confirm(`دمج ${names} في ${count.number}؟ تُجمع كميات الأصناف المشتركة وتُحذف الأوراق المدموجة، ولا يمكن التراجع.`)) return;
    onMerge([...picked]);
  };

  return (
    <Modal
      title={`دمج الجرد في ${count.number}`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton onClick={submit} loading={busy} disabled={picked.size === 0}>
            دمج
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          مسودات أخرى للمخزن <b>{count.warehouse?.name}</b>. الصنف المجرود في أكثر من ورقة تُجمع كمياته (رفوف أو عدّادون مختلفون)، والصنف غير الموجود هنا يُضاف.
        </p>
        <div className="space-y-1.5">
          {drafts.map((d) => (
            <label key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-white/5 cursor-pointer hover:border-white/15">
              <input type="checkbox" className="w-4 h-4 accent-red-600" checked={picked.has(d.id)} onChange={() => toggle(d.id)} />
              <bdi className="font-mono text-xs font-bold text-white">{d.number}</bdi>
              <span className="text-xs text-slate-400">مجرود: {d.counted_lines_count}</span>
              {d.notes && <span className="text-xs text-slate-500 truncate">{d.notes}</span>}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 font-semibold">التعديلات غير المحفوظة في هذه الورقة تُحفظ أولاً.</p>
      </div>
    </Modal>
  );
};
