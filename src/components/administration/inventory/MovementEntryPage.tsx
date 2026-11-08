/**
 * MovementEntryPage.tsx — "إدخال حركة مخزنية" (/inventory/movements/new): واجهة موحدة ببنية الأمين فوق المنطق
 * الموجود، بلا طريق جديد للكتابة في الدفتر:
 *   - رصيد أول المدة ← POST movements/opening (يُرحَّل فوراً، بتاريخ اليوم؛ يُعكس سطراً سطراً من كرت الصنف).
 *   - هالك ← مستند هالك (مسودة ثم ترحيل) بسبب لكل سطر، بمتوسط التكلفة.
 *   - استلام مباشر ← مستند استلام بلا فاتورة (بصلاحية خاصة) بسعر الوحدة المُدخل.
 *   - صرفية ← تفتح شاشة صرفيات الأصناف.
 * ?type=&wh= يحددان النوع والمخزن (بعد الحفظ يُفتح نموذج جديد بهما للإدخال المتتابع).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, LogOut, Plus, Save, Send, X } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type DocumentsMeta,
  type ItemStock,
  type StockItem,
  type Warehouse,
} from "../../../services/inventoryService";
import { DocToolbar, type ToolbarItem } from "./DocToolbar";
import { ExcelGrid, ItemCodeCell, ItemNameCell, gridInput, gridTd, gridText, useExcelGridNav, type GridColumn } from "./ExcelGrid";
import { parseQty } from "./TransferEntryPage";
import { inputClass } from "./ui";

type EntryType = "opening" | "waste" | "receipt" | "transfer";

const TYPE_LABELS: Record<EntryType, string> = {
  opening: "رصيد أول المدة",
  waste: "هالك",
  receipt: "استلام مشتريات مباشر",
  transfer: "صرفية أصناف",
};

interface Line {
  key: number;
  item: { id: number; name: string; code: string } | null;
  stock: ItemStock | null;
  loading: boolean;
  unitId: number | "";
  quantity: string;
  /** سعر الوحدة المختارة (رصيد أول المدة والاستلام)؛ الهالك بمتوسط التكلفة. */
  price: string;
  reason: string;
  inputError: string | null;
}

let nextKey = 1;
const emptyLine = (): Line => ({ key: nextKey++, item: null, stock: null, loading: false, unitId: "", quantity: "", price: "", reason: "", inputError: null });

const C = { code: 1, name: 2, unit: 3, qty: 5, price: 6, reason: 8 } as const;

export const MovementEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  const canOpening = useCan(INVENTORY_PERMISSIONS.MOVEMENTS_OPENING);
  const canDocuments = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_MANAGE);
  const canPost = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_POST);
  const canDirectReceipt = useCan(INVENTORY_PERMISSIONS.RECEIPTS_DIRECT);

  const allowed = useMemo(
    () =>
      (Object.keys(TYPE_LABELS) as EntryType[]).filter((t) =>
        t === "opening" ? canOpening : t === "receipt" ? canDocuments && canDirectReceipt : canDocuments,
      ),
    [canOpening, canDocuments, canDirectReceipt],
  );

  const [meta, setMeta] = useState<DocumentsMeta | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [type, setType] = useState<EntryType>(() => {
    const t = qs.get("type") as EntryType | null;
    return t && t in TYPE_LABELS ? t : "waste";
  });
  const [warehouseId, setWarehouseId] = useState<number | "">(Number(qs.get("wh")) || "");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [documentDate, setDocumentDate] = useState("");
  const [documentTime, setDocumentTime] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [busy, setBusy] = useState<"draft" | "post" | null>(null);

  useEffect(() => {
    inventoryService.documentsMeta().then(setMeta).catch((e) => toast.error("تعذّر تحميل البيانات", inventoryErrorMessage(e)));
    inventoryService.warehouses().then(setWarehouses).catch((e) => toast.error("تعذّر تحميل المخازن", inventoryErrorMessage(e)));
  }, []);

  useEffect(() => {
    if (!meta) return;
    setDocumentDate((d) => d || meta.accounting_today);
    setDocumentTime((t) => t || meta.now_time);
  }, [meta]);

  // النوع غير المسموح للمستخدم يتحول لأول نوع مسموح.
  useEffect(() => {
    if (allowed.length && !allowed.includes(type)) setType(allowed[0]);
  }, [allowed, type]);

  useEffect(() => {
    if (type === "transfer") navigate(`/inventory/transfers/new${warehouseId !== "" ? `?from=${warehouseId}` : ""}`);
  }, [type, warehouseId, navigate]);

  const activeWarehouses = warehouses.filter((w) => w.is_active);
  const warehouse = warehouses.find((w) => w.id === warehouseId);
  const isOpening = type === "opening";
  const isWaste = type === "waste";
  const isReceipt = type === "receipt";
  const priceEditable = isOpening || isReceipt;

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const loadStock = useCallback(async (key: number, itemId: number, wh: number | "", keepUnit?: number | "") => {
    if (wh === "") return;
    update(key, { loading: true });
    try {
      const stock = await inventoryService.itemStock(itemId, wh);
      const unitId = keepUnit !== undefined && keepUnit !== "" && stock.units.some((u) => u.id === keepUnit) ? keepUnit : stock.units[0]?.id ?? "";
      update(key, { stock, unitId, loading: false });
    } catch (e) {
      update(key, { loading: false });
      toast.error("تعذّر تحميل الصنف", inventoryErrorMessage(e));
    }
  }, []);

  const changeWarehouse = (wh: number | "") => {
    setWarehouseId(wh);
    lines.forEach((l) => l.item && loadStock(l.key, l.item.id, wh, l.unitId));
  };

  const removeRow = (row: number) => {
    const l = lines[row];
    if (!l?.item) return;
    setLines((ls) => {
      const next = ls.filter((x) => x.key !== l.key);
      return next[next.length - 1]?.item ? [...next, emptyLine()] : next.length ? next : [emptyLine()];
    });
    grid.requestFocus(Math.max(0, row - 1), C.qty);
  };

  const grid = useExcelGridNav({
    enterCols: isWaste ? [C.code, C.qty, C.reason] : priceEditable ? [C.code, C.qty, C.price] : [C.code, C.qty],
    onDeleteRow: removeRow,
  });

  const pickItem = (row: number, item: StockItem) => {
    const l = lines[row];
    if (!l) return;
    setLines((ls) => {
      const next = ls.map((x) => (x.key === l.key ? { ...x, item: { id: item.id, name: item.name, code: item.code }, inputError: null, stock: null } : x));
      return next[next.length - 1].item ? [...next, emptyLine()] : next;
    });
    grid.requestFocus(row, C.qty);
    loadStock(l.key, item.id, warehouseId);
  };

  const filled = lines.filter((l) => l.item);
  const factorOf = (l: Line) => Number(l.stock?.units.find((u) => u.id === l.unitId)?.factor ?? 1) || 1;
  const priceOf = (l: Line): number | null => {
    if (priceEditable) return l.price.trim() === "" ? null : parseQty(l.price);
    return l.stock && l.stock.avg_cost !== null ? Number(l.stock.avg_cost) * factorOf(l) : null;
  };
  const total = filled.reduce((s, l) => s + parseQty(l.quantity) * (priceOf(l) ?? 0), 0);

  const lineError = (l: Line): string | null => {
    if (l.inputError) return l.inputError;
    if (!l.item || !l.stock) return null;
    if (isWaste && parseQty(l.quantity) * factorOf(l) > Number(l.stock.qty) + 1e-9) return `الكمية أكبر من الرصيد (${fmtNum(Number(l.stock.qty) / factorOf(l))})`;
    return null;
  };

  const submit = async (post: boolean) => {
    if (busy) return;
    if (warehouseId === "") return void toast.warning("اختر المخزن");
    if (isReceipt && supplierId === "") return void toast.warning("اختر المورّد (رقم الحساب)");
    if (filled.length === 0) return void toast.warning("أضف صنفاً واحداً على الأقل");
    for (const l of filled) {
      const row = lines.indexOf(l) + 1;
      if (!(parseQty(l.quantity) > 0)) return void toast.warning(`أدخل كمية أكبر من صفر في السطر ${row}`);
      if (priceEditable && (l.price.trim() === "" || parseQty(l.price) < 0)) return void toast.warning(`أدخل السعر في السطر ${row}`);
      if (isWaste && !l.reason) return void toast.warning(`اختر سبب الهالك في السطر ${row}`);
      const err = lineError(l);
      if (err) return void toast.warning(`السطر ${row}: ${err}`);
    }

    const withRef = [referenceNo.trim() ? `مرجع: ${referenceNo.trim()}` : "", notes.trim()].filter(Boolean).join(" — ");
    setBusy(post ? "post" : "draft");
    try {
      if (isOpening) {
        if (!window.confirm(`تسجيل رصيد أول المدة لـ ${filled.length} صنف في "${warehouse?.name}"؟ يُرحَّل مباشرة (يُصحَّح بالعكس من كرت الصنف).`)) {
          setBusy(null);
          return;
        }
        await inventoryService.postOpening({
          warehouse_id: warehouseId,
          notes: withRef || null,
          lines: filled.map((l) => ({ stock_item_id: l.item!.id, quantity: parseQty(l.quantity), unit_id: l.unitId === "" ? null : l.unitId, unit_cost: parseQty(l.price) })),
        });
        toast.success("تم تسجيل رصيد أول المدة");
      } else {
        let doc = await inventoryService.createDocument({
          type,
          warehouse_id: warehouseId,
          supplier_id: isReceipt ? (supplierId as number) : null,
          reference_no: referenceNo.trim() || null,
          document_date: documentDate || null,
          document_time: documentTime || null,
          notes: notes.trim() || null,
          lines: filled.map((l) => ({
            stock_item_id: l.item!.id,
            unit_id: l.unitId === "" ? null : l.unitId,
            quantity: parseQty(l.quantity),
            unit_cost: isReceipt ? parseQty(l.price) : null,
            waste_reason: isWaste ? l.reason : null,
          })),
        });
        if (post) {
          try {
            doc = await inventoryService.postDocument(doc.id);
            toast.success(`تم ترحيل ${doc.number}`);
          } catch (e) {
            toast.error(`حُفظت المسودة ${doc.number} لكن تعذّر الترحيل`, inventoryErrorMessage(e));
            navigate(`/inventory/${isWaste ? "waste" : "receipts"}?open=${doc.id}`);
            return;
          }
        } else {
          toast.success(`تم حفظ المسودة ${doc.number}`);
        }
      }
      // نموذج جديد بالنوع والمخزن نفسيهما للإدخال المتتابع.
      navigate(`/inventory/movements/new?type=${type}&wh=${warehouseId}`, { replace: true });
    } catch (e) {
      toast.error("تعذّر الحفظ", inventoryErrorMessage(e));
      setBusy(null);
    }
  };

  const items: ToolbarItem[] = [
    { id: "new", label: "جديد", icon: Plus, keys: "F3", onClick: () => window.confirm("تفريغ النموذج؟") && navigate(`/inventory/movements/new?type=${type}${warehouseId !== "" ? `&wh=${warehouseId}` : ""}`) },
    { id: "save", label: "حفظ", icon: Save, keys: "F2", hidden: isOpening, loading: busy === "draft", disabled: busy !== null, onClick: () => submit(false) },
    {
      id: "post",
      label: isOpening ? "تسجيل وترحيل" : "ترحيل",
      icon: Send,
      keys: "F9",
      tone: "primary",
      hidden: !isOpening && !canPost,
      loading: busy === "post",
      disabled: busy !== null,
      onClick: () => submit(true),
    },
    "sep",
    { id: "exit", label: "خروج", icon: LogOut, keys: "Esc", onClick: () => navigate("/inventory/movements") },
  ];

  const columns: GridColumn[] = [
    { key: "n", label: "م", width: "2.5rem", align: "center" },
    { key: "code", label: "رقم الصنف", width: "7.5rem" },
    { key: "name", label: "اسم الصنف" },
    { key: "unit", label: "الوحدة", width: "7rem" },
    { key: "wh", label: "اسم المخزن", width: "10rem" },
    { key: "qty", label: "الكمية", width: "7rem", align: "end" },
    { key: "price", label: isWaste ? "السعر (متوسط التكلفة)" : "السعر", width: "8rem", align: "end" },
    { key: "total", label: "الإجمالي", width: "7.5rem", align: "end" },
    { key: "reason", label: "سبب الهالك", width: "9rem", hidden: !isWaste },
  ];
  const span = columns.filter((c) => !c.hidden).length;

  if (allowed.length === 0) {
    return <p className="p-8 text-center text-slate-400 font-bold">لا تملك صلاحية إدخال حركات مخزنية.</p>;
  }

  return (
    <div className="space-y-3 pb-2" dir="rtl">
      <DocToolbar items={items} title="إدخال حركة مخزنية" />

      <section aria-label="رأس الحركة" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-x-3 gap-y-2 bg-slate-900 border border-white/5 rounded-2xl p-3 pt-2">
        <HeaderField label="رقم الحركة">
          <div className={`${inputClass} !py-2 opacity-80`}>يُرقَّم عند الحفظ</div>
        </HeaderField>
        <HeaderField label="النوع">
          <select className={`${inputClass} !py-2`} value={type} onChange={(e) => setType(e.target.value as EntryType)} autoFocus>
            {allowed.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </HeaderField>
        <HeaderField label="التاريخ">
          <input
            type="date"
            className={`${inputClass} !py-2`}
            value={isOpening ? meta?.accounting_today ?? "" : documentDate}
            max={meta?.accounting_today}
            disabled={isOpening}
            title={isOpening ? "رصيد أول المدة يُسجَّل باليوم المحاسبي الحالي" : undefined}
            onChange={(e) => setDocumentDate(e.target.value)}
            dir="ltr"
          />
        </HeaderField>
        <HeaderField label="الوقت">
          <input type="time" className={`${inputClass} !py-2`} value={documentTime} disabled={isOpening} onChange={(e) => setDocumentTime(e.target.value)} dir="ltr" />
        </HeaderField>
        <HeaderField label="رقم المرجع">
          <input className={`${inputClass} !py-2`} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} maxLength={64} dir="auto" placeholder="اختياري" />
        </HeaderField>
        <HeaderField label="المخزن" wide>
          <select className={`${inputClass} !py-2`} value={warehouseId} onChange={(e) => changeWarehouse(e.target.value ? Number(e.target.value) : "")}>
            <option value="">— اختر —</option>
            {activeWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code ? `${w.code} — ` : ""}
                {w.name}
              </option>
            ))}
          </select>
        </HeaderField>
        <HeaderField label={isReceipt ? "رقم الحساب (المورّد)" : "رقم الحساب"}>
          {isReceipt ? (
            <select className={`${inputClass} !py-2`} value={supplierId} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">— المورّد —</option>
              {meta?.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          ) : (
            <div className={`${inputClass} !py-2 opacity-80 font-mono`} title="المخزون لا يُنشئ قيداً؛ الحساب المقابل هو المخزن نفسه">
              {warehouse?.code ?? "—"}
            </div>
          )}
        </HeaderField>
        <div className="col-span-2 md:col-span-4 xl:col-span-8">
          <HeaderField label="ملاحظات">
            <input className={`${inputClass} !py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </HeaderField>
        </div>
      </section>

      <p className="text-[11px] text-slate-500 font-semibold">
        {isOpening && "رصيد أول المدة يُسجَّل حركةً مرحّلة فوراً بالسعر المُدخل لكل وحدة؛ تصحيحه بعكس السطر من كرت الصنف."}
        {isWaste && "الهالك يخرج بمتوسط تكلفة المخزن ولا يتجاوز رصيده (حسب إعداد الرصيد السالب). يُحفظ مسودة ثم يُرحَّل."}
        {isReceipt && "استلام بلا فاتورة مشتريات — الاستلام العادي يتم بفاتورة المشتريات."}
      </p>

      <ExcelGrid ref={grid.gridRef} columns={columns} ariaLabel="أسطر الحركة" minWidth={980} maxHeight="56vh" onKeyDown={grid.onKeyDown} onFocus={grid.onFocus}>
        {lines.map((l, row) => {
          const price = priceOf(l);
          const qty = parseQty(l.quantity);
          const err = lineError(l);
          return (
            <React.Fragment key={l.key}>
              <tr className={err ? "bg-red-500/10" : row === grid.activeRow ? "bg-red-600/5" : ""}>
                <td className={`${gridTd} text-center text-slate-500 tabular-nums`}>{row + 1}</td>
                <td className={gridTd}>
                  <ItemCodeCell
                    row={row}
                    col={C.code}
                    code={l.item?.code ?? ""}
                    disabled={warehouseId === ""}
                    onPick={(item) => pickItem(row, item)}
                    onNotFound={(code) => update(l.key, { inputError: `لا يوجد صنف مخزني بالرقم أو الباركود "${code}"` })}
                  />
                </td>
                <td className={gridTd}>
                  <ItemNameCell row={row} col={C.name} selectedName={l.item?.name ?? ""} disabled={warehouseId === ""} placeholder={warehouseId === "" ? "اختر المخزن أولاً" : "اسم الصنف..."} onPick={(item) => pickItem(row, item)} />
                </td>
                <td className={gridTd}>
                  {l.item && (
                    <select className={gridInput} value={l.unitId} disabled={!l.stock} onChange={(e) => update(l.key, { unitId: Number(e.target.value) })} data-row={row} data-col={C.unit} aria-label={`وحدة السطر ${row + 1}`}>
                      {l.stock?.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                      {!l.stock && <option value={l.unitId}>…</option>}
                    </select>
                  )}
                </td>
                <td className={gridTd}>
                  <div className={`${gridText} text-slate-400`}>{l.item ? warehouse?.name : ""}</div>
                </td>
                <td className={gridTd}>
                  {l.item && (
                    <input className={`${gridInput} text-left tabular-nums`} inputMode="decimal" dir="ltr" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} data-row={row} data-col={C.qty} aria-label={`الكمية — السطر ${row + 1}`} />
                  )}
                </td>
                <td className={gridTd}>
                  {l.item &&
                    (priceEditable ? (
                      <input className={`${gridInput} text-left tabular-nums`} inputMode="decimal" dir="ltr" value={l.price} onChange={(e) => update(l.key, { price: e.target.value })} data-row={row} data-col={C.price} aria-label={`السعر — السطر ${row + 1}`} />
                    ) : (
                      <div className={`${gridText} justify-end tabular-nums text-slate-300`}>{l.loading ? <Loader2 size={14} className="animate-spin" /> : price !== null ? fmtNum(price, 4) : "—"}</div>
                    ))}
                </td>
                <td className={gridTd}>
                  <div className={`${gridText} justify-end tabular-nums font-bold text-white`}>{l.item && price !== null && qty > 0 ? fmtNum(qty * price, 2) : ""}</div>
                </td>
                {isWaste && (
                  <td className={gridTd}>
                    {l.item && (
                      <select className={gridInput} value={l.reason} onChange={(e) => update(l.key, { reason: e.target.value })} data-row={row} data-col={C.reason} aria-label={`سبب الهالك — السطر ${row + 1}`}>
                        <option value="">— السبب —</option>
                        {meta?.waste_reasons.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                )}
              </tr>
              {err && (
                <tr className="bg-red-500/10">
                  <td className={gridTd} />
                  <td colSpan={span - 1} className={`${gridTd} px-2 py-1`}>
                    <span role="alert" className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                      <AlertTriangle size={13} /> {err}
                    </span>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </ExcelGrid>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => grid.activeRow !== null && removeRow(grid.activeRow)}
          disabled={grid.activeRow === null || !lines[grid.activeRow]?.item}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-bold bg-red-600/10 text-red-400 hover:bg-red-600/20 border-red-500/20 disabled:opacity-40"
        >
          <X size={14} /> إلغاء السطر
        </button>
        <span className="text-[11px] text-slate-500 font-semibold mr-2">Enter: رقم الصنف ← الكمية ← {isWaste ? "السبب" : priceEditable ? "السعر" : ""} ← سطر جديد</span>
      </div>

      <footer className="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-2.5 bg-slate-950/95 backdrop-blur border-t border-white/5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold text-slate-400">
        <span>
          النوع: <span className="text-white">{TYPE_LABELS[type]}</span>
        </span>
        <span>
          عدد الأصناف: <span className="text-white tabular-nums">{filled.length}</span>
        </span>
        <span>
          الإجمالي: <span className="text-white tabular-nums">{fmtNum(total, 2)} ₪</span>
        </span>
      </footer>
    </div>
  );
};

const HeaderField: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => (
  <label className={`block space-y-1 ${wide ? "col-span-2" : ""}`}>
    <span className="text-[11px] font-black text-slate-500">{label}</span>
    {children}
  </label>
);
