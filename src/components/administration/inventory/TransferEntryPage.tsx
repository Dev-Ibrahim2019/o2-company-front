/**
 * TransferEntryPage.tsx — إدخال "صرفية أصناف" بصفحة كاملة (/inventory/transfers/new و /inventory/transfers/:id)
 * ببنية شاشة الأمين: شريط أدوات، رأس مضغوط، جدول كثيف (ExcelGrid)، وتذييل للإجماليات.
 *
 * - السعر = متوسط تكلفة مخزن المصدر (للقراءة)، والإجمالي محسوب. الصنف المكرر في عدة أسطر يُجمع على رصيد
 *   المصدر، والتجاوز يظهر بالأحمر ويمنع الترحيل (والخادم يرفضه على كل حال).
 * - لكل سطر مخزن وجهة: افتراضياً مخزن الرأس، ويُغيَّر للسطر وحده. تغيير وجهة الرأس ينقل الأسطر التي تتبعه.
 * - Enter: رقم الصنف ← الكمية ← سطر جديد (مسار سريع). Tab والأسهم لكل الخانات. Ctrl+Delete يحذف السطر.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  LogOut,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useAuth, useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  DOCUMENT_STATUS_LABELS,
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type DocumentsMeta,
  type ItemStock,
  type StockDocument,
  type StockDocumentPayload,
  type StockItem,
  type Warehouse,
} from "../../../services/inventoryService";
import { DocToolbar, type ToolbarItem } from "./DocToolbar";
import { ExcelGrid, ItemCodeCell, ItemNameCell, gridInput, gridTd, gridText, useExcelGridNav, type GridColumn } from "./ExcelGrid";
import { DocumentStatusBadge } from "./StockDocumentsPage";
import { ReceiptStatusBadge, ReverseModal } from "./TransfersPage";
import { printTransferVoucher } from "./printTransferVoucher";
import { LoadingBlock, inputClass } from "./ui";
import { LayerAllocationModal } from "./LayerAllocationModal";
import type { LayerAllocation } from "../../../services/layersService";

/* ── السطر ── */

interface Line {
  key: number;
  item: { id: number; name: string; code: string } | null;
  stock: ItemStock | null;
  loading: boolean;
  unitId: number | "";
  quantity: string;
  notes: string;
  toWarehouseId: number | "";
  /** رسالة إدخال (رقم صنف أو مخزن غير موجود). */
  inputError: string | null;
  /** قيمة السطر المرحّلة (المستند المرحّل). */
  postedCost: string | null;
  /** التحديد المعيّن: توزيع السطر على الدفعات بالوحدة الأساسية (null = الأقدم أولاً عند الترحيل). */
  allocations: LayerAllocation[] | null;
}

/** توزيع السطر من المستند: المسودة (draft_allocations) أو المرحّل (layer_allocations). */
function layerRows(l: unknown): LayerAllocation[] | null {
  const line = l as { draft_allocations?: { layer_id: number; quantity: string }[]; layer_allocations?: { layer_id: number; quantity: string }[] };
  const rows = line.draft_allocations?.length ? line.draft_allocations : line.layer_allocations;
  return rows?.length ? rows.map((a) => ({ layer_id: a.layer_id, quantity: Number(a.quantity) })) : null;
}

let nextKey = 1;
const emptyLine = (toWarehouseId: number | "" = ""): Line => ({
  key: nextKey++,
  item: null,
  stock: null,
  loading: false,
  unitId: "",
  quantity: "",
  notes: "",
  toWarehouseId,
  inputError: null,
  postedCost: null,
  allocations: null,
});

const EPS = 1e-9;
const LAST_SOURCE_KEY = "inv.transfer.lastSource";

/** أرقام أعمدة الخانات (data-col). */
const C = { code: 1, name: 2, unit: 3, qty: 5, notes: 8, whCode: 9, wh: 10 } as const;

const readLastSource = (): number | "" => {
  try {
    const v = Number(localStorage.getItem(LAST_SOURCE_KEY));
    return v > 0 ? v : "";
  } catch {
    return "";
  }
};

/** الرقم كما كُتب (فاصلة عربية أو أرقام هندية). */
export const parseQty = (v: string) => Number(v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[٫,]/g, ".")) || 0;

interface LineCalc {
  factor: number;
  unitName: string;
  available: number | null;
  price: number | null;
  total: number | null;
  error: string | null;
  warning: string | null;
}

export const TransferEntryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_MANAGE);
  const canPost = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_POST);
  const canReverse = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_REVERSE);

  const isNew = !id;
  const [doc, setDoc] = useState<StockDocument | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [meta, setMeta] = useState<DocumentsMeta | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const initialSource = Number(new URLSearchParams(location.search).get("from")) || readLastSource();
  const [warehouseId, setWarehouseId] = useState<number | "">(isNew ? initialSource : "");
  const [toWarehouseId, setToWarehouseId] = useState<number | "">("");
  const [documentDate, setDocumentDate] = useState("");
  const [documentTime, setDocumentTime] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  // إعداد "السماح بالرصيد السالب": مفعّل = الكمية الأكبر من الرصيد تحذير فقط، والترحيل يمشي والرصيد يصير سالباً.
  const [allowNegative, setAllowNegative] = useState(false);
  // نافذة التحديد المعيّن (توزيع السطر على الدفعات).
  const [layerLine, setLayerLine] = useState<number | null>(null);
  const [quantitiesOnly, setQuantitiesOnly] = useState(false);
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [busy, setBusy] = useState<"draft" | "post" | "delete" | "duplicate" | "receive" | "nav" | null>(null);
  const [reversing, setReversing] = useState(false);
  const dirty = useRef(false);
  const toWarehouseRef = useRef<HTMLSelectElement>(null);

  const editable = canManage && (isNew || doc?.status === "draft");
  const activeWarehouses = useMemo(() => warehouses.filter((w) => w.is_active), [warehouses]);
  const whById = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);

  const markDirty = () => {
    dirty.current = true;
  };
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const edit = (key: number, patch: Partial<Line>) => {
    markDirty();
    update(key, patch);
  };

  /* ── التحميل ── */

  useEffect(() => {
    inventoryService.documentsMeta().then(setMeta).catch((e) => toast.error("تعذّر تحميل البيانات", inventoryErrorMessage(e)));
    inventoryService.warehouses().then(setWarehouses).catch((e) => toast.error("تعذّر تحميل المخازن", inventoryErrorMessage(e)));
    inventoryService.settings().then((s) => setAllowNegative(Boolean(s.allow_negative_stock))).catch(() => undefined);
  }, []);

  // المستند الجديد يبدأ باليوم المحاسبي ووقت الآن من الخادم.
  useEffect(() => {
    if (!isNew || !meta) return;
    setDocumentDate((d) => d || meta.accounting_today);
    setDocumentTime((t) => t || meta.now_time);
  }, [isNew, meta]);

  // المستند الجديد: التركيز على "إلى المخزن" إن كان المصدر معروفاً.
  useEffect(() => {
    if (isNew && warehouses.length > 0) toWarehouseRef.current?.focus();
  }, [isNew, warehouses.length]);

  /** رصيد الصنف في المصدر بوحداته. */
  const loadStock = useCallback(async (key: number, itemId: number, wh: number | "", keepUnit?: number | "") => {
    if (wh === "") return;
    update(key, { loading: true });
    try {
      const stock = await inventoryService.itemStock(itemId, wh);
      const unitId = keepUnit !== undefined && keepUnit !== "" && stock.units.some((u) => u.id === keepUnit) ? keepUnit : stock.units[0]?.id ?? "";
      update(key, { stock, unitId, loading: false });
    } catch (e) {
      update(key, { loading: false });
      toast.error("تعذّر تحميل رصيد الصنف", inventoryErrorMessage(e));
    }
  }, []);

  const applyDocument = useCallback(
    (d: StockDocument) => {
      setDoc(d);
      setWarehouseId(d.warehouse_id);
      setToWarehouseId(d.to_warehouse_id ?? "");
      setDocumentDate(d.document_date);
      setDocumentTime(d.document_time?.slice(0, 5) ?? "");
      setReferenceNo(d.reference_no ?? "");
      setDestination(d.destination ?? "");
      setNotes(d.notes ?? "");
      setQuantitiesOnly(Boolean(d.quantities_only));
      const loaded = (d.lines ?? []).map(
        (l): Line => ({
          ...emptyLine(l.to_warehouse_id ?? d.to_warehouse_id ?? ""),
          item: l.stock_item ? { id: l.stock_item.id, name: l.stock_item.name, code: l.stock_item.code } : null,
          unitId: l.unit_id,
          quantity: String(Number(l.quantity)),
          notes: l.notes ?? "",
          postedCost: l.posted_cost ?? null,
          // توزيع المسودة على الدفعات، أو ما خرج فعلاً من الدفعات بعد الترحيل.
          allocations: layerRows(l),
        }),
      );
      setLines(d.status === "draft" ? [...loaded, emptyLine(d.to_warehouse_id ?? "")] : loaded);
      loaded.forEach((l) => l.item && loadStock(l.key, l.item.id, d.warehouse_id, l.unitId));
      dirty.current = false;
    },
    [loadStock],
  );

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      applyDocument(await inventoryService.document(Number(id)));
    } catch (e) {
      toast.error("تعذّر تحميل الصرفية", inventoryErrorMessage(e));
      navigate("/inventory/transfers", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, applyDocument, navigate]);

  useEffect(() => {
    reload();
  }, [reload]);

  // تحذير قبل مغادرة الصفحة بتعديلات غير محفوظة (إغلاق التبويب أو تحديثه).
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  /* ── الحسابات ── */

  const filled = lines.filter((l) => l.item);

  const calcs = useMemo(() => {
    // مجموع المطلوب لكل صنف بالوحدة الأساسية (الصنف المكرر يُجمع على رصيد المصدر).
    const requested = new Map<number, number>();
    const firstRow = new Map<number, number>();
    lines.forEach((l, i) => {
      if (!l.item) return;
      const unit = l.stock?.units.find((u) => u.id === l.unitId);
      const factor = Number(unit?.factor ?? 1) || 1;
      requested.set(l.item.id, (requested.get(l.item.id) ?? 0) + parseQty(l.quantity) * factor);
      if (!firstRow.has(l.item.id)) firstRow.set(l.item.id, i);
    });
    const posted = Boolean(doc && doc.status !== "draft");

    return new Map(
      lines.map((l, i): [number, LineCalc] => {
        const unit = l.stock?.units.find((u) => u.id === l.unitId);
        const factor = Number(unit?.factor ?? 1) || 1;
        const unitName = unit?.name ?? l.stock?.unit ?? "";
        const qty = parseQty(l.quantity);
        let price: number | null = null;
        let total: number | null = null;
        if (posted) {
          total = l.postedCost !== null ? Number(l.postedCost) : null;
          price = total !== null && qty > 0 ? total / qty : null;
        } else if (l.stock && l.stock.avg_cost !== null) {
          price = Number(l.stock.avg_cost) * factor;
          total = qty * price;
        }
        const balance = l.stock ? Number(l.stock.qty) : null;

        let error: string | null = l.inputError;
        let warning: string | null = null;
        if (!error && l.item && !posted) {
          const need = requested.get(l.item.id) ?? 0;
          const first = firstRow.get(l.item.id) ?? i;
          if (balance !== null && qty > 0 && need > balance + EPS) {
            const msg = `الكمية أكبر من الرصيد المتاح (${fmtNum(balance / factor)} ${unitName})${first < i ? " — مع سطر سابق لنفس الصنف" : ""}`;
            if (allowNegative) warning = `${msg} — سيُرحَّل ويصبح الرصيد ${fmtNum((balance - need) / factor)} ${unitName}`;
            else error = msg;
          } else if (l.toWarehouseId !== "" && l.toWarehouseId === warehouseId) {
            error = "مخزن الوجهة هو مخزن المصدر نفسه";
          } else if (first < i) {
            warning = `الصنف مكرر — ورد في السطر ${first + 1}`;
          }
        }
        return [l.key, { factor, unitName, available: balance !== null ? balance / factor : null, price, total, error, warning }];
      }),
    );
  }, [lines, doc, warehouseId, allowNegative]);

  const costsVisible = doc ? doc.costs_visible : filled.every((l) => !l.stock || l.stock.avg_cost !== null);
  const showPrices = costsVisible && !quantitiesOnly;
  const grandTotal = filled.reduce((s, l) => s + (calcs.get(l.key)?.total ?? 0), 0);
  const hasErrors = filled.some((l) => calcs.get(l.key)?.error);
  const anyLoading = filled.some((l) => l.loading);

  /* ── الأسطر ── */

  const removeRow = (row: number) => {
    const l = lines[row];
    if (!l || !editable || !l.item) return;
    markDirty();
    setLines((ls) => {
      const next = ls.filter((x) => x.key !== l.key);
      return next.length === 0 || next[next.length - 1].item ? [...next, emptyLine(toWarehouseId)] : next;
    });
    grid.requestFocus(Math.max(0, Math.min(row, lines.length - 2)), C.code);
  };

  const grid = useExcelGridNav({
    enterCols: [C.code, C.qty],
    onDeleteRow: removeRow,
    onRowEnd: (row) => grid.requestFocus(row, C.code),
  });

  const pickItem = (row: number, item: StockItem) => {
    const l = lines[row];
    if (!l) return;
    markDirty();
    setLines((ls) => {
      const next = ls.map((x) => (x.key === l.key ? { ...x, item: { id: item.id, name: item.name, code: item.code }, inputError: null, stock: null } : x));
      return next[next.length - 1].item ? [...next, emptyLine(toWarehouseId)] : next;
    });
    grid.requestFocus(row, C.qty);
    loadStock(l.key, item.id, warehouseId);
  };

  const moveRow = (row: number, dir: -1 | 1) => {
    const target = row + dir;
    if (!editable || !lines[row]?.item || !lines[target]?.item) return;
    markDirty();
    setLines((ls) => {
      const next = [...ls];
      [next[row], next[target]] = [next[target], next[row]];
      return next;
    });
    grid.requestFocus(target, C.qty);
  };

  const activeRow = grid.activeRow ?? -1;

  const changeSource = (wh: number | "") => {
    markDirty();
    setWarehouseId(wh);
    for (const l of lines) {
      if (!l.item) continue;
      if (wh === "") update(l.key, { stock: null });
      else loadStock(l.key, l.item.id, wh, l.unitId);
    }
  };

  /** وجهة الرأس: الأسطر التي تتبع الوجهة السابقة (أو بلا وجهة) تنتقل معها. */
  const changeHeaderDestination = (wh: number | "") => {
    markDirty();
    const old = toWarehouseId;
    setToWarehouseId(wh);
    setLines((ls) => ls.map((l) => (l.toWarehouseId === old || l.toWarehouseId === "" ? { ...l, toWarehouseId: wh } : l)));
  };

  const setLineWarehouseByCode = (row: number, code: string) => {
    const l = lines[row];
    if (!l) return;
    const w = activeWarehouses.find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
    if (!w) {
      update(l.key, { inputError: `لا يوجد مخزن نشط برقم "${code}"` });
      return;
    }
    edit(l.key, { toWarehouseId: w.id, inputError: null });
  };

  /* ── الحفظ والترحيل ── */

  const buildPayload = (): StockDocumentPayload | null => {
    if (warehouseId === "") {
      toast.warning("اختر «من المخزن»");
      return null;
    }
    if (toWarehouseId === "") {
      toast.warning("اختر «إلى المخزن»");
      toWarehouseRef.current?.focus();
      return null;
    }
    if (filled.length === 0) {
      toast.warning("أضف صنفاً واحداً على الأقل");
      return null;
    }
    const bad = filled.find((l) => !(parseQty(l.quantity) > 0));
    if (bad) {
      const row = lines.indexOf(bad);
      toast.warning(`أدخل كمية أكبر من صفر في السطر ${row + 1}`);
      grid.requestFocus(row, C.qty);
      return null;
    }
    return {
      ...(doc ? {} : { type: "transfer" as const }),
      warehouse_id: warehouseId,
      to_warehouse_id: toWarehouseId,
      document_date: documentDate || null,
      document_time: documentTime || null,
      reference_no: referenceNo.trim() || null,
      destination: destination.trim() || null,
      notes: notes.trim() || null,
      quantities_only: quantitiesOnly,
      lines: filled.map((l) => ({
        stock_item_id: l.item!.id,
        to_warehouse_id: l.toWarehouseId === "" ? toWarehouseId : l.toWarehouseId,
        unit_id: l.unitId === "" ? null : l.unitId,
        quantity: parseQty(l.quantity),
        notes: l.notes.trim() || null,
        allocations: l.allocations,
      })),
    };
  };

  const save = async (andPost: boolean) => {
    if (busy || !editable) return;
    if (andPost && (hasErrors || anyLoading)) {
      toast.warning("لا يمكن الترحيل", "صحّح الأسطر المعلَّمة بالأحمر أولاً، أو احفظ كمسودة.");
      return;
    }
    let saved = doc;
    setBusy(andPost ? "post" : "draft");
    if (!doc || dirty.current) {
      const payload = buildPayload();
      if (!payload) {
        setBusy(null);
        return;
      }
      try {
        saved = doc ? await inventoryService.updateDocument(doc.id, payload) : await inventoryService.createDocument(payload);
        try {
          localStorage.setItem(LAST_SOURCE_KEY, String(payload.warehouse_id));
        } catch {
          /* التخزين المحلي غير متاح — تفضيل فقط */
        }
      } catch (err) {
        toast.error("تعذّر حفظ المسودة", inventoryErrorMessage(err));
        setBusy(null);
        return;
      }
    }
    if (!saved) {
      setBusy(null);
      return;
    }
    if (andPost) {
      try {
        saved = await inventoryService.postDocument(saved.id);
        toast.success(`تم ترحيل ${saved.number}`);
      } catch (err) {
        toast.error("حُفظت المسودة لكن تعذّر الترحيل", inventoryErrorMessage(err));
      }
    } else {
      toast.success(`تم حفظ المسودة ${saved.number}`);
    }
    dirty.current = false;
    setBusy(null);
    if (isNew) navigate(`/inventory/transfers/${saved.id}`, { replace: true });
    else applyDocument(saved);
  };

  const confirmDiscard = () => !dirty.current || window.confirm("توجد تعديلات غير محفوظة. تجاهلها؟");

  const go = (path: string) => {
    if (!confirmDiscard()) return;
    dirty.current = false;
    navigate(path);
  };

  const removeOrReverse = async () => {
    if (doc?.status === "posted") {
      if (doc.can_reverse) setReversing(true);
      else toast.warning("لا يمكن العكس", doc.receipt_status && doc.receipt_status !== "pending" ? "الصرفية مستلَمة — عكسها للمدير فقط." : undefined);
      return;
    }
    if (!doc) {
      // مستند جديد لم يُحفظ: "حذف" = تفريغ النموذج.
      go(`/inventory/transfers/new${warehouseId !== "" ? `?from=${warehouseId}` : ""}`);
      return;
    }
    if (doc.status !== "draft" || !window.confirm(`حذف المسودة ${doc.number}؟`)) return;
    setBusy("delete");
    try {
      await inventoryService.deleteDocument(doc.id);
      toast.success("تم حذف المسودة");
      dirty.current = false;
      navigate("/inventory/transfers");
    } catch (e) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(e));
      setBusy(null);
    }
  };

  const duplicate = async () => {
    if (!doc || !confirmDiscard()) return;
    setBusy("duplicate");
    try {
      const copy = await inventoryService.duplicateDocument(doc.id);
      toast.success(`أُنشئت المسودة ${copy.number}`, "الرصيد والتكلفة محسوبان من جديد.");
      dirty.current = false;
      navigate(`/inventory/transfers/${copy.id}`);
    } catch (e) {
      toast.error("تعذّر التكرار", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const print = () => {
    if (!doc) {
      toast.warning("احفظ الصرفية أولاً لطباعتها");
      return;
    }
    if (dirty.current) {
      toast.warning("توجد تعديلات غير محفوظة", "احفظ (F2) ثم اطبع.");
      return;
    }
    printTransferVoucher(doc);
  };

  const navigateTo = async (dir: "first" | "prev" | "next" | "last") => {
    if (!confirmDiscard()) return;
    setBusy("nav");
    try {
      const target = await inventoryService.navigateDocument({ type: "transfer", dir, id: doc?.id ?? (dir === "prev" ? Number.MAX_SAFE_INTEGER : 0) });
      if (!target) toast.warning(dir === "next" || dir === "last" ? "لا توجد صرفية بعدها" : "لا توجد صرفية قبلها");
      else if (target.id !== doc?.id) {
        dirty.current = false;
        navigate(`/inventory/transfers/${target.id}`);
      }
    } catch (e) {
      toast.error("تعذّر التنقل", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const receive = async (warehouse?: number) => {
    if (!doc) return;
    const names = (doc.destinations ?? [])
      .filter((d) => (warehouse ? d.id === warehouse : doc.receivable_warehouse_ids?.includes(d.id)))
      .map((d) => d.name)
      .join("، ");
    if (!window.confirm(`تأكيد استلام ${doc.number} في: ${names}؟ لا يمكن التراجع عن التأكيد.`)) return;
    setBusy("receive");
    try {
      applyDocument(await inventoryService.confirmReceipt(doc.id, warehouse));
      toast.success("تم تأكيد الاستلام");
    } catch (e) {
      toast.error("تعذّر تأكيد الاستلام", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const startEditing = () => {
    if (!editable) {
      toast.warning("المستند المرحّل لا يُعدَّل", "صحّحه بعكسه، أو كرّره كمسودة جديدة.");
      return;
    }
    grid.requestFocus(Math.max(0, filled.length - 1), filled.length ? C.qty : C.code);
  };

  /* ── شريط الأدوات ── */

  const posted = doc?.status === "posted";
  const items: ToolbarItem[] = [
    { id: "new", label: "جديد", icon: Plus, keys: "F3", hidden: !canManage, onClick: () => go(`/inventory/transfers/new${warehouseId !== "" ? `?from=${warehouseId}` : ""}`) },
    { id: "save", label: "حفظ", icon: Save, keys: "F2", hidden: !editable, loading: busy === "draft", disabled: busy !== null, onClick: () => save(false) },
    {
      id: "post",
      label: "ترحيل",
      icon: Send,
      keys: "F9",
      tone: "primary",
      hidden: !editable || !canPost,
      loading: busy === "post",
      disabled: busy !== null || hasErrors || anyLoading,
      hint: hasErrors ? "توجد أسطر تتجاوز الرصيد" : undefined,
      onClick: () => save(true),
    },
    posted
      ? { id: "reverse", label: "عكس", icon: Undo2, keys: "F4", tone: "danger", hidden: !canReverse, disabled: busy !== null || !doc?.can_reverse, onClick: removeOrReverse }
      : { id: "delete", label: "حذف", icon: Trash2, keys: "F4", tone: "danger", hidden: !editable, loading: busy === "delete", disabled: busy !== null, onClick: removeOrReverse },
    { id: "edit", label: "تعديل", icon: Pencil, keys: "F11", bindOnly: true, onClick: startEditing },
    "sep",
    { id: "print", label: "طباعة", icon: Printer, keys: "Ctrl+P", disabled: !doc, onClick: print },
    { id: "duplicate", label: "تكرار", icon: Copy, keys: "Ctrl+D", hidden: !canManage, disabled: !doc || busy !== null, loading: busy === "duplicate", onClick: duplicate },
    "sep",
    { id: "first", label: "الأول", icon: ChevronFirst, keys: "Alt+Home", disabled: busy !== null, onClick: () => navigateTo("first") },
    { id: "prev", label: "السابق", icon: ChevronRight, keys: "Alt+PageUp", disabled: busy !== null, onClick: () => navigateTo("prev") },
    { id: "next", label: "التالي", icon: ChevronLeft, keys: "Alt+PageDown", disabled: busy !== null || !doc, onClick: () => navigateTo("next") },
    { id: "last", label: "الأخير", icon: ChevronLast, keys: "Alt+End", disabled: busy !== null, onClick: () => navigateTo("last") },
    "sep",
    { id: "reload", label: "إعادة تحميل", icon: RefreshCw, keys: "F8", hidden: isNew, onClick: () => confirmDiscard() && reload() },
    { id: "exit", label: "خروج", icon: LogOut, keys: "Esc", onClick: () => go("/inventory/transfers") },
  ];

  /* ── العرض ── */

  if (loading || (!isNew && !doc)) return <LoadingBlock />;

  const keepers = (wh: number | "") => (wh === "" ? "—" : whById.get(wh)?.keepers?.join("، ") || "—");
  const columns: GridColumn[] = [
    { key: "n", label: "م", width: "2.5rem", align: "center" },
    { key: "code", label: "رقم الصنف", width: "7.5rem" },
    { key: "name", label: "اسم الصنف" },
    { key: "unit", label: "الوحدة", width: "7rem" },
    { key: "stock", label: "الكمية بالمخزن", width: "7.5rem", align: "end" },
    { key: "qty", label: "الكمية المحولة", width: "7rem", align: "end" },
    { key: "price", label: "السعر", width: "6.5rem", align: "end", hidden: !showPrices },
    { key: "total", label: "الإجمالي", width: "7rem", align: "end", hidden: !showPrices },
    { key: "notes", label: "ملاحظات", width: "10rem" },
    { key: "whcode", label: "رقم المخزن", width: "6rem" },
    { key: "wh", label: "المخزن المحول له", width: "11rem" },
  ];
  const span = columns.filter((c) => !c.hidden).length;
  const statusLine = doc ? `${doc.type_label} — ${DOCUMENT_STATUS_LABELS[doc.status]}` : "صرفية أصناف — جديدة";

  return (
    <div className="space-y-3 pb-2" dir="rtl">
      <DocToolbar
        items={items}
        shortcutsEnabled={!reversing}
        title={
          <span className="flex items-center gap-2">
            <Link to="/inventory/transfers" className="text-slate-400 hover:text-white">
              صرفيات الأصناف
            </Link>
            <span className="text-slate-600">/</span>
            <bdi className="font-mono">{doc?.number ?? "جديدة"}</bdi>
            {doc && <DocumentStatusBadge status={doc.status} />}
          </span>
        }
      />

      {/* رأس المستند */}
      <section aria-label="رأس الصرفية" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-x-3 gap-y-2 bg-slate-900 border border-white/5 rounded-2xl p-3 pt-2">
        <HeaderField label="رقم الصرفية">
          <div className={`${inputClass} !py-2 font-mono opacity-80`}>
            <bdi>{doc?.number ?? "—"}</bdi>
          </div>
        </HeaderField>
        <HeaderField label="تاريخ الحركة">
          <input type="date" className={`${inputClass} !py-2`} value={documentDate} max={meta?.accounting_today} disabled={!editable} onChange={(e) => (markDirty(), setDocumentDate(e.target.value))} dir="ltr" />
        </HeaderField>
        <HeaderField label="الوقت">
          <input type="time" className={`${inputClass} !py-2`} value={documentTime} disabled={!editable} onChange={(e) => (markDirty(), setDocumentTime(e.target.value))} dir="ltr" />
        </HeaderField>
        <HeaderField label="العملة / السعر">
          <div className={`${inputClass} !py-2 opacity-80 flex justify-between`} title="النظام بعملة واحدة">
            <span>شيكل</span>
            <span className="tabular-nums">1</span>
          </div>
        </HeaderField>
        <HeaderField label="رقم المرجع">
          <input className={`${inputClass} !py-2`} value={referenceNo} disabled={!editable} onChange={(e) => (markDirty(), setReferenceNo(e.target.value))} maxLength={64} dir="auto" placeholder="اختياري" />
        </HeaderField>
        <HeaderField label="الجهة" wide>
          <input className={`${inputClass} !py-2`} value={destination} disabled={!editable} onChange={(e) => (markDirty(), setDestination(e.target.value))} maxLength={150} placeholder="مثال: قسم الكيك (المعمل)" />
        </HeaderField>
        <HeaderField label="خيارات">
          <span className={`flex items-center gap-2 h-[38px] text-sm font-bold text-slate-300 ${editable ? "" : "opacity-70"}`}>
            <input type="checkbox" className="w-4 h-4 accent-red-600" checked={quantitiesOnly} disabled={!editable} onChange={(e) => (markDirty(), setQuantitiesOnly(e.target.checked))} />
            صرفية كميات فقط
          </span>
        </HeaderField>

        <HeaderField label="من المخزن" wide>
          <WarehouseSelect value={warehouseId} warehouses={editable ? activeWarehouses : warehouses} disabled={!editable} onChange={changeSource} />
        </HeaderField>
        <HeaderField label="أمين المخزن (المصدر)" wide>
          <div className={`${inputClass} !py-2 opacity-80 truncate`}>{keepers(warehouseId)}</div>
        </HeaderField>
        <HeaderField label="إلى المخزن" wide>
          <WarehouseSelect
            ref={toWarehouseRef}
            value={toWarehouseId}
            warehouses={(editable ? activeWarehouses : warehouses).filter((w) => w.id !== warehouseId)}
            disabled={!editable}
            onChange={changeHeaderDestination}
          />
        </HeaderField>
        <HeaderField label="أمين المخزن (الوجهة)" wide>
          <div className={`${inputClass} !py-2 opacity-80 truncate`}>{keepers(toWarehouseId)}</div>
        </HeaderField>
        <div className="col-span-2 md:col-span-4 xl:col-span-8">
          <HeaderField label="ملاحظات">
            <input className={`${inputClass} !py-2`} value={notes} disabled={!editable} onChange={(e) => (markDirty(), setNotes(e.target.value))} maxLength={1000} />
          </HeaderField>
        </div>
      </section>

      {/* تأكيد الاستلام */}
      {doc && doc.status !== "draft" && (
        <section aria-label="تأكيد بالاستلام" className="bg-slate-900 border border-white/5 rounded-2xl p-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-black text-slate-400">تأكيد بالاستلام:</span>
          <ReceiptStatusBadge status={doc.receipt_status} />
          {(doc.destinations ?? []).map((d) => (
            <span key={d.id} className="inline-flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-white/5">
              <span className="text-slate-200">{d.name}</span>
              {d.received_at ? (
                <span className="text-green-400">
                  ✓ {d.received_by ?? "—"} · <bdi className="tabular-nums">{new Date(d.received_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</bdi>
                </span>
              ) : doc.receivable_warehouse_ids?.includes(d.id) ? (
                <button type="button" onClick={() => receive(d.id)} disabled={busy !== null} className="text-sky-300 hover:underline disabled:opacity-50">
                  تأكيد الاستلام
                </button>
              ) : (
                <span className="text-red-400">{doc.status === "reversed" ? "—" : "بانتظار الاستلام"}</span>
              )}
            </span>
          ))}
          {(doc.receivable_warehouse_ids?.length ?? 0) > 1 && (
            <button
              type="button"
              onClick={() => receive()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {busy === "receive" ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />} تأكيد استلام كل وجهاتي
            </button>
          )}
          {doc.reversal_reason && <span className="text-xs text-amber-300 font-bold">سبب العكس: {doc.reversal_reason}</span>}
        </section>
      )}

      {/* الجدول */}
      <ExcelGrid ref={grid.gridRef} columns={columns} ariaLabel="أسطر الصرفية" minWidth={showPrices ? 1180 : 1000} maxHeight="52vh" onKeyDown={grid.onKeyDown} onFocus={grid.onFocus}>
        {lines.map((l, row) => {
          const c = calcs.get(l.key)!;
          const lineWh = l.toWarehouseId === "" ? undefined : whById.get(l.toWarehouseId);
          const isActive = row === activeRow;
          const message = l.item ? (c.error ?? c.warning) : l.inputError;
          const isError = Boolean(l.item ? c.error : l.inputError);
          return (
            <React.Fragment key={l.key}>
              <tr className={isError ? "bg-red-500/10" : isActive ? "bg-red-600/5" : ""}>
                <td className={`${gridTd} text-center text-slate-500 tabular-nums`}>{row + 1}</td>
                <td className={gridTd}>
                  <ItemCodeCell
                    row={row}
                    col={C.code}
                    code={l.item?.code ?? ""}
                    disabled={!editable || warehouseId === ""}
                    onPick={(item) => pickItem(row, item)}
                    onNotFound={(code) => update(l.key, { inputError: `لا يوجد صنف مخزني بالرقم أو الباركود "${code}"` })}
                  />
                </td>
                <td className={gridTd}>
                  <ItemNameCell
                    row={row}
                    col={C.name}
                    selectedName={l.item?.name ?? ""}
                    disabled={!editable || warehouseId === ""}
                    placeholder={warehouseId === "" ? "اختر «من المخزن» أولاً" : "اسم الصنف..."}
                    onPick={(item) => pickItem(row, item)}
                  />
                </td>
                <td className={gridTd}>
                  {l.item && (
                    <select
                      className={gridInput}
                      value={l.unitId}
                      disabled={!editable || !l.stock}
                      onChange={(e) => edit(l.key, { unitId: Number(e.target.value), allocations: null })}
                      data-row={row}
                      data-col={C.unit}
                      aria-label={`وحدة السطر ${row + 1}`}
                    >
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
                  <div className={`${gridText} justify-end tabular-nums ${c.error && c.available !== null ? "text-red-400 font-bold" : "text-slate-300"}`}>
                    {l.loading ? <Loader2 size={14} className="animate-spin text-slate-500" /> : l.item && c.available !== null ? fmtNum(c.available) : ""}
                    {l.item && warehouseId !== "" && (
                      <button
                        type="button"
                        onClick={() => setLayerLine(l.key)}
                        title={l.allocations ? "موزّع يدوياً على الدفعات" : "الأقدم أولاً — اضغط لاختيار الدفعات"}
                        aria-label={`دفعات ${l.item.name}`}
                        className={`ms-1.5 px-1.5 rounded text-[10px] font-black ${l.allocations ? "bg-sky-600/20 text-sky-300" : "bg-white/5 text-slate-500 hover:text-white"}`}
                      >
                        {l.allocations ? "يدوي" : "دفعات"}
                      </button>
                    )}
                  </div>
                </td>
                <td className={gridTd}>
                  {l.item && (
                    <input
                      className={`${gridInput} text-left tabular-nums ${c.error ? "!text-red-300" : ""}`}
                      inputMode="decimal"
                      dir="ltr"
                      value={l.quantity}
                      disabled={!editable}
                      onChange={(e) => edit(l.key, { quantity: e.target.value, allocations: null })}
                      data-row={row}
                      data-col={C.qty}
                      aria-label={`الكمية المحولة — السطر ${row + 1}`}
                      aria-invalid={Boolean(c.error)}
                    />
                  )}
                </td>
                {showPrices && (
                  <>
                    <td className={gridTd}>
                      <div className={`${gridText} justify-end tabular-nums text-slate-300`}>{l.item && c.price !== null ? fmtNum(c.price, 4) : ""}</div>
                    </td>
                    <td className={gridTd}>
                      <div className={`${gridText} justify-end tabular-nums font-bold text-white`}>{l.item && c.total !== null ? fmtNum(c.total, 2) : ""}</div>
                    </td>
                  </>
                )}
                <td className={gridTd}>
                  {l.item && (
                    <input
                      className={gridInput}
                      value={l.notes}
                      disabled={!editable}
                      maxLength={500}
                      onChange={(e) => edit(l.key, { notes: e.target.value })}
                      data-row={row}
                      data-col={C.notes}
                      aria-label={`ملاحظات السطر ${row + 1}`}
                    />
                  )}
                </td>
                <td className={gridTd}>
                  {l.item && <WarehouseCodeCell row={row} code={lineWh?.code ?? ""} disabled={!editable} onCommit={(code) => setLineWarehouseByCode(row, code)} />}
                </td>
                <td className={gridTd}>
                  {l.item &&
                    (editable ? (
                      <select
                        className={gridInput}
                        value={l.toWarehouseId}
                        onChange={(e) => edit(l.key, { toWarehouseId: e.target.value ? Number(e.target.value) : "", inputError: null })}
                        data-row={row}
                        data-col={C.wh}
                        aria-label={`المخزن المحول له — السطر ${row + 1}`}
                      >
                        <option value="">— مخزن الرأس —</option>
                        {activeWarehouses
                          .filter((w) => w.id !== warehouseId)
                          .map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <div className={`${gridText} text-slate-300`}>{lineWh?.name ?? ""}</div>
                    ))}
                </td>
              </tr>
              {message && (
                <tr className={isError ? "bg-red-500/10" : "bg-amber-500/5"}>
                  <td className={gridTd} />
                  <td colSpan={span - 1} className={`${gridTd} px-2 py-1`}>
                    <span role={isError ? "alert" : "status"} className={`flex items-center gap-1.5 text-xs font-bold ${isError ? "text-red-400" : "text-amber-300"}`}>
                      <AlertTriangle size={13} /> {message}
                    </span>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </ExcelGrid>

      {(() => {
        const l = lines.find((x) => x.key === layerLine);
        if (!l || !l.item || warehouseId === "") return null;
        const c = calcs.get(l.key);
        return (
          <LayerAllocationModal
            itemId={l.item.id}
            itemName={l.item.name}
            warehouseId={warehouseId}
            factor={c?.factor ?? 1}
            unitName={c?.unitName ?? ""}
            quantity={parseQty(l.quantity)}
            value={l.allocations}
            readOnly={!editable}
            onApply={(allocations) => {
              edit(l.key, { allocations });
              setLayerLine(null);
            }}
            onClose={() => setLayerLine(null)}
          />
        );
      })()}

      {editable && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="أدوات الأسطر">
          <RowButton icon={ArrowUp} label="أعلى" disabled={activeRow <= 0 || !lines[activeRow]?.item} onClick={() => moveRow(activeRow, -1)} />
          <RowButton icon={ArrowDown} label="أسفل" disabled={activeRow < 0 || !lines[activeRow]?.item || !lines[activeRow + 1]?.item} onClick={() => moveRow(activeRow, 1)} />
          <RowButton icon={Plus} label="إضافة" onClick={() => grid.requestFocus(lines.length - 1, C.code)} />
          <RowButton icon={X} label="إلغاء السطر" tone="danger" disabled={activeRow < 0 || !lines[activeRow]?.item} onClick={() => removeRow(activeRow)} />
          <span className="text-[11px] text-slate-500 font-semibold mr-2">Enter: رقم الصنف ← الكمية ← سطر جديد · Tab والأسهم لكل الخانات · Ctrl+Delete حذف السطر</span>
        </div>
      )}

      {/* التذييل */}
      <footer className="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-2 bg-slate-950/95 backdrop-blur border-t border-white/5">
        <dl className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-x-4 gap-y-1 text-xs">
          <FooterItem label="رقم الحركة" value={<bdi className="font-mono">{doc?.number ?? "—"}</bdi>} />
          <FooterItem label="اسم المستخدم" value={doc?.creator?.name ?? user?.name ?? "—"} />
          <FooterItem label="التاريخ" value={<bdi className="tabular-nums">{documentDate || "—"}</bdi>} />
          <FooterItem label="الوقت" value={<bdi className="tabular-nums">{documentTime || "—"}</bdi>} />
          <FooterItem label="رقم القيد" value={<span title="حركات المخزون لا تُنشئ قيداً محاسبياً في النظام حالياً">—</span>} />
          <FooterItem label="الحركة المخزنية" value={statusLine} />
          <FooterItem label="عدد الأصناف" value={<span className="tabular-nums">{filled.length}</span>} />
          <FooterItem label="الإجمالي" value={showPrices ? <span className="tabular-nums">{fmtNum(doc && doc.status !== "draft" ? doc.total_cost : grandTotal, 2)} ₪</span> : "—"} strong />
        </dl>
      </footer>

      {reversing && doc && (
        <ReverseModal
          doc={doc}
          onClose={() => setReversing(false)}
          onDone={() => {
            setReversing(false);
            reload();
          }}
        />
      )}
    </div>
  );
};

/* ── عناصر صغيرة ── */

const HeaderField: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => (
  <label className={`block space-y-1 ${wide ? "col-span-2" : ""}`}>
    <span className="text-[11px] font-black text-slate-500">{label}</span>
    {children}
  </label>
);

const WarehouseSelect = React.forwardRef<
  HTMLSelectElement,
  { value: number | ""; warehouses: Warehouse[]; disabled?: boolean; onChange: (v: number | "") => void }
>(({ value, warehouses, disabled, onChange }, ref) => (
  <select ref={ref} className={`${inputClass} !py-2`} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}>
    <option value="">— اختر —</option>
    {warehouses.map((w) => (
      <option key={w.id} value={w.id}>
        {w.code ? `${w.code} — ` : ""}
        {w.name}
      </option>
    ))}
  </select>
));
WarehouseSelect.displayName = "WarehouseSelect";

/** رقم مخزن الوجهة للسطر: كتابة الرقم ثم Enter تختار المخزن. */
const WarehouseCodeCell: React.FC<{ row: number; code: string; disabled?: boolean; onCommit: (code: string) => void }> = ({ row, code, disabled, onCommit }) => {
  const [value, setValue] = useState<string | null>(null);
  const commit = () => {
    if (value !== null && value.trim() !== "" && value.trim() !== code) onCommit(value.trim());
    setValue(null);
  };
  return (
    <input
      className={`${gridInput} font-mono`}
      dir="ltr"
      value={value ?? code}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      data-row={row}
      data-col={C.whCode}
      aria-label={`رقم المخزن — السطر ${row + 1}`}
    />
  );
};

const RowButton: React.FC<{ icon: React.ElementType; label: string; onClick: () => void; disabled?: boolean; tone?: "danger" }> = ({ icon: Icon, label, onClick, disabled, tone }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      tone === "danger" ? "bg-red-600/10 text-red-400 hover:bg-red-600/20 border-red-500/20" : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-white/5"
    }`}
  >
    <Icon size={14} /> {label}
  </button>
);

const FooterItem: React.FC<{ label: string; value: React.ReactNode; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="min-w-0">
    <dt className="text-slate-500 font-black">{label}</dt>
    <dd className={`truncate ${strong ? "text-white font-black text-sm" : "text-slate-200 font-bold"}`}>{value}</dd>
  </div>
);
