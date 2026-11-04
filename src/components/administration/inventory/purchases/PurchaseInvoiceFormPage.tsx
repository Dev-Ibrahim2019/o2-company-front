/**
 * PurchaseInvoiceFormPage.tsx — فاتورة المشتريات الموحّدة (/inventory/purchases/new و /:id).
 *
 * مستند واحد أسطره أصناف مخزنية (ومصاريف غير مخزنية). الترحيل في الخادم ينفّذ في معاملة واحدة:
 * استلام المخزن (دفعات وصلاحية ومتوسط تكلفة) + ذمة المورّد + قيد اليومية + سند صرف للمدفوع.
 * الحساب الحي هنا (computePurchase) نسخة من قواعد الخادم للمعاينة فقط.
 *
 * لوحة المفاتيح: Enter للخانة التالية، ↑/↓ بين الصفوف، Ctrl+Delete يحذف السطر؛ F2 مسودة، F9 ترحيل، F3 فاتورة جديدة.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Plus, Printer, Receipt, Send, Trash2, Undo2, Wallet } from "lucide-react";
import { useCan } from "../../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../../auth/permissions";
import { toast } from "../../../shared/Toast";
import { inventoryService, type StockItem } from "../../../../services/inventoryService";
import {
  PAYMENT_MODE_LABELS,
  addDays,
  computePurchase,
  creditDays,
  fmtMoney,
  purchaseErrorMessage,
  purchaseInvoiceService,
  roundTo,
  type PaymentMode,
  type PurchaseBill,
  type PurchasePayload,
  type PurchasesMeta,
  type SupplierSummary,
} from "../../../../services/purchaseInvoiceService";
import { Field, LoadingBlock, Modal, PrimaryButton, SecondaryButton, inputClass } from "../ui";
import { ItemSearch, cellInput, useGridNavigation } from "../gridEntry";
import { PurchaseStatusBadge } from "./PurchaseStatusBadge";
import { PayBillModal } from "./PayBillModal";
import { printPurchaseInvoice } from "./printPurchaseInvoice";

interface Line {
  key: number;
  kind: "stock" | "expense";
  item: { id: number; name: string; code: string } | null;
  units: { id: number; name: string; factor: number }[];
  unitId: number | "";
  quantity: string;
  unitPrice: string;
  discountPct: string;
  taxRate: string;
  description: string;
  accountId: number | "";
}

let nextKey = 1;
const emptyLine = (kind: "stock" | "expense" = "stock", taxRate = "0"): Line => ({
  key: nextKey++,
  kind,
  item: null,
  units: [],
  unitId: "",
  quantity: kind === "expense" ? "1" : "",
  unitPrice: "",
  discountPct: "",
  taxRate,
  description: "",
  accountId: "",
});

/** ترتيب خانات سطر الصنف لـ Enter. */
const COLS = ["unit", "qty", "price", "disc", "tax"] as const;

async function loadItem(id: number) {
  const item = await inventoryService.item(id);
  return {
    item,
    units: [
      { id: item.base_unit_id, name: item.base_unit?.name ?? "الأساسية", factor: 1 },
      ...(item.units ?? []).map((u) => ({ id: u.unit_id, name: u.unit?.name ?? "", factor: Number(u.factor) })),
    ],
  };
}

export const PurchaseInvoiceFormPage: React.FC = () => {
  const { id } = useParams();
  const billId = id && id !== "new" ? Number(id) : null;
  const navigate = useNavigate();
  const canCreate = useCan(INVENTORY_PERMISSIONS.PURCHASES_CREATE);
  const canPostPerm = useCan(INVENTORY_PERMISSIONS.PURCHASES_POST);

  const [meta, setMeta] = useState<PurchasesMeta | null>(null);
  const [bill, setBill] = useState<PurchaseBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"draft" | "post" | null>(null);
  const [busy, setBusy] = useState<"duplicate" | "reverse" | null>(null);
  const [paying, setPaying] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [reason, setReason] = useState("");

  // رأس الفاتورة
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [supplier, setSupplier] = useState<SupplierSummary | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [duplicates, setDuplicates] = useState<{ id: number; bill_number: string }[]>([]);
  const [billDate, setBillDate] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("credit");
  const [dueDate, setDueDate] = useState("");
  const dueTouched = useRef(false);
  const [currency, setCurrency] = useState("ILS");
  const [rate, setRate] = useState("1");
  const [taxRecoverable, setTaxRecoverable] = useState(true);
  const [billDiscount, setBillDiscount] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [cashAccountId, setCashAccountId] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [lastPrices, setLastPrices] = useState<Record<number, number>>({});
  const dirty = useRef(false);

  const editable = !bill || (bill.status === "draft" && Boolean(bill.can?.edit ?? canCreate));
  const today = meta?.today ?? new Date().toISOString().slice(0, 10);
  const effectiveDate = billDate || today;
  const exRate = currency === "ILS" ? 1 : Number(rate) || 0;
  const defaultTax = taxRecoverable ? "16" : "0";

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const edit = (key: number, patch: Partial<Line>) => {
    dirty.current = true;
    update(key, patch);
  };
  const touched =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      dirty.current = true;
      set(v);
    };

  /* ── التحميل ── */

  const hydrate = useCallback(async (b: PurchaseBill) => {
    setBill(b);
    setSupplierId(b.supplier_id);
    setWarehouseId(b.warehouse_id ?? "");
    setInvoiceNo(b.supplier_invoice_no ?? "");
    setBillDate(b.bill_date);
    setPaymentMode(b.payment_mode ?? "credit");
    setDueDate(b.due_date);
    dueTouched.current = true;
    setCurrency(b.currency || "ILS");
    setRate(String(Number(b.exchange_rate)));
    setTaxRecoverable(b.tax_recoverable);
    setBillDiscount(Number(b.discount) ? String(Number(b.discount)) : "");
    setPaidNow(Number(b.paid_on_post) ? String(Number(b.paid_on_post)) : "");
    setCashAccountId(b.cash_account_id ?? "");
    setNotes(b.notes ?? "");
    const loaded = await Promise.all(
      (b.items ?? []).map(async (l): Promise<Line> => {
        const base: Line = {
          ...emptyLine(l.line_kind),
          quantity: String(Number(l.quantity)),
          unitPrice: String(Number(l.unit_price)),
          discountPct: Number(l.discount_pct) ? String(Number(l.discount_pct)) : "",
          taxRate: String(Number(l.tax_rate)),
          description: l.description,
          accountId: l.account_id ?? "",
          unitId: l.unit_id ?? "",
        };
        if (l.line_kind !== "stock" || !l.stock_item) return base;
        const { units } = await loadItem(l.stock_item.id).catch(() => ({ units: [] as Line["units"] }));
        return { ...base, item: { id: l.stock_item.id, name: l.stock_item.name, code: l.stock_item.code }, units };
      }),
    );
    setLines(b.status === "draft" ? [...loaded, emptyLine("stock", b.tax_recoverable ? "16" : "0")] : loaded);
    dirty.current = false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([meta ? Promise.resolve(meta) : purchaseInvoiceService.meta(), billId ? purchaseInvoiceService.get(billId) : Promise.resolve(null)])
      .then(async ([m, b]) => {
        if (cancelled) return;
        setMeta(m);
        if (b) await hydrate(b);
        else {
          setBill(null);
          setLines([emptyLine()]);
          if (m.warehouses.length === 1) setWarehouseId(m.warehouses[0].id);
          if (m.cash_accounts.length > 0) setCashAccountId(m.cash_accounts[0].id);
          dirty.current = false;
        }
      })
      .catch((e) => toast.error("تعذّر تحميل الفاتورة", purchaseErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // meta تُحمَّل مرة؛ التنقل بين الفواتير يعيد تحميل الفاتورة فقط.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billId]);

  // ملخّص المورّد: الرصيد وآخر فاتورة وأيام الاستحقاق والتسجيل الضريبي
  useEffect(() => {
    if (supplierId === "") {
      setSupplier(null);
      return;
    }
    let cancelled = false;
    purchaseInvoiceService
      .supplierSummary(supplierId)
      .then((s) => {
        if (cancelled) return;
        setSupplier(s);
        if (!bill) {
          setTaxRecoverable(s.tax_registered);
          setCurrency(s.currency || "ILS");
        }
      })
      .catch(() => !cancelled && setSupplier(null));
    return () => {
      cancelled = true;
    };
  }, [supplierId, bill]);

  // الاستحقاق الافتراضي: تاريخ الفاتورة + أيام شروط المورّد (أو 30)، ما لم يعدّله المستخدم
  useEffect(() => {
    if (dueTouched.current) return;
    setDueDate(addDays(effectiveDate, supplier ? supplier.credit_days : creditDays(null)));
  }, [effectiveDate, supplier]);

  // آخر سعر للمورّد نفسه لكل صنف في الفاتورة
  const itemIds = lines.filter((l) => l.item).map((l) => l.item!.id);
  const itemIdsKey = itemIds.join(",");
  useEffect(() => {
    if (supplierId === "" || itemIds.length === 0) {
      setLastPrices({});
      return;
    }
    let cancelled = false;
    purchaseInvoiceService
      .lastPrices(supplierId, itemIds)
      .then((r) => !cancelled && setLastPrices(Object.fromEntries(Object.entries(r).map(([k, v]) => [Number(k), Number(v.price_base)]))))
      .catch(() => !cancelled && setLastPrices({}));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, itemIdsKey]);

  // رقم فاتورة المورّد المكرّر: تحذير لا منع
  useEffect(() => {
    const no = invoiceNo.trim();
    if (supplierId === "" || !no) {
      setDuplicates([]);
      return;
    }
    const t = setTimeout(() => {
      purchaseInvoiceService
        .checkInvoiceNo(supplierId, no, bill?.id)
        .then(setDuplicates)
        .catch(() => setDuplicates([]));
    }, 400);
    return () => clearTimeout(t);
  }, [supplierId, invoiceNo, bill?.id]);

  /* ── الأسطر ── */

  const pickItem = async (key: number, picked: StockItem) => {
    dirty.current = true;
    setLines((ls) => {
      const next = ls.map((l) =>
        l.key === key ? { ...l, item: { id: picked.id, name: picked.name, code: picked.code } } : l,
      );
      return next[next.length - 1].item || next[next.length - 1].kind === "expense" ? [...next, emptyLine("stock", defaultTax)] : next;
    });
    grid.requestFocus({ key, col: "qty" });
    try {
      const { item, units } = await loadItem(picked.id);
      const unitId = item.purchase_unit_id ?? item.base_unit_id;
      // السعر المقترح = آخر سعر للمورّد (بالشيكل للأساسية) × معامل الوحدة ÷ سعر الصرف
      const factor = units.find((u) => u.id === unitId)?.factor ?? 1;
      const last = supplierId !== "" ? await purchaseInvoiceService.lastPrices(supplierId, [item.id]).catch(() => ({})) : {};
      const base = (last as Record<string, { price_base: string }>)[String(item.id)]?.price_base;
      update(key, {
        units,
        unitId,
        item: { id: item.id, name: item.name, code: item.code },
        unitPrice: base && exRate > 0 ? String(roundTo((Number(base) * factor) / exRate, 4)) : "",
      });
    } catch (e) {
      toast.error("تعذّر تحميل الصنف", purchaseErrorMessage(e));
    }
  };

  const removeLine = (key: number) => {
    dirty.current = true;
    setLines((ls) => {
      const next = ls.filter((l) => l.key !== key);
      return next.length === 0 || next[next.length - 1].item || next[next.length - 1].kind === "expense" ? [...next, emptyLine("stock", defaultTax)] : next;
    });
  };

  const addExpense = () => {
    dirty.current = true;
    setLines((ls) => {
      const tail = ls[ls.length - 1];
      const head = tail && !tail.item && tail.kind === "stock" ? ls.slice(0, -1) : ls;
      return [...head, emptyLine("expense", "0"), emptyLine("stock", defaultTax)];
    });
  };

  const grid = useGridNavigation({
    rows: lines.map((l) => ({ key: l.key, filled: l.kind === "expense" || Boolean(l.item) })),
    cols: COLS,
    upCol: "qty",
    onRemove: removeLine,
  });

  /* ── الحساب الحي ── */

  const filled = useMemo(() => lines.filter((l) => l.item || (l.kind === "expense" && (l.description || l.unitPrice))), [lines]);
  const calc = useMemo(
    () =>
      computePurchase(
        filled.map((l) => ({
          kind: l.kind,
          quantity: l.kind === "expense" ? 1 : Number(l.quantity) || 0,
          unitPrice: Number(l.unitPrice) || 0,
          discountPct: Number(l.discountPct) || 0,
          taxRate: Number(l.taxRate) || 0,
        })),
        Number(billDiscount) || 0,
        taxRecoverable,
        exRate || 1,
      ),
    [filled, billDiscount, taxRecoverable, exRate],
  );
  const calcByKey = new Map(filled.map((l, i) => [l.key, calc.lines[i]]));
  const alertPct = Number(meta?.price_alert_percent ?? 10);

  /** نسبة الزيادة عن آخر سعر للمورّد (بالوحدة المختارة وعملة الفاتورة)، أو null. */
  const priceRise = (l: Line): number | null => {
    if (!l.item) return null;
    const base = lastPrices[l.item.id];
    const price = Number(l.unitPrice);
    if (!base || !price || !exRate) return null;
    const factor = l.units.find((u) => u.id === l.unitId)?.factor ?? 1;
    const last = (base * factor) / exRate;
    const rise = ((price - last) / last) * 100;
    return rise > alertPct + 1e-9 ? rise : null;
  };

  const total = calc.totals.total;
  const paid = paymentMode === "cash" ? total : paymentMode === "credit" ? 0 : Number(paidNow) || 0;
  const remaining = roundTo(total - paid, 2);
  const priceAlerts = filled.filter((l) => priceRise(l) !== null);
  const postBlockers = [
    calc.error,
    paid > total + 1e-9 ? "المدفوع أكبر من الإجمالي." : null,
    paid > 0 && cashAccountId === "" ? "اختر الصندوق أو الحساب البنكي." : null,
  ].filter(Boolean) as string[];

  /* ── الحفظ ── */

  const buildPayload = (): PurchasePayload | null => {
    if (supplierId === "") return toast.warning("اختر المورّد"), null;
    if (warehouseId === "") return toast.warning("اختر المخزن المستلم"), null;
    if (filled.length === 0) return toast.warning("أضف صنفاً واحداً على الأقل"), null;
    const badQty = filled.find((l) => l.kind === "stock" && !(Number(l.quantity) > 0));
    if (badQty) return toast.warning(`أدخل كمية أكبر من صفر للصنف "${badQty.item?.name}"`), null;
    const badExpense = filled.find((l) => l.kind === "expense" && (!l.description.trim() || l.accountId === "" || !(Number(l.unitPrice) > 0)));
    if (badExpense) return toast.warning("أكمل سطر المصروف", "الوصف والحساب والمبلغ مطلوبة."), null;
    if (currency !== "ILS" && !(Number(rate) > 0)) return toast.warning("أدخل سعر الصرف"), null;
    return {
      supplier_id: supplierId,
      warehouse_id: warehouseId,
      supplier_invoice_no: invoiceNo.trim() || null,
      bill_date: billDate || null,
      due_date: paymentMode === "cash" ? null : dueDate || null,
      payment_mode: paymentMode,
      currency,
      exchange_rate: currency === "ILS" ? 1 : Number(rate),
      tax_recoverable: taxRecoverable,
      discount: Number(billDiscount) || 0,
      paid_on_post: paymentMode === "partial" ? Number(paidNow) || 0 : 0,
      cash_account_id: paymentMode === "credit" ? null : cashAccountId === "" ? null : cashAccountId,
      notes: notes.trim() || null,
      lines: filled.map((l) =>
        l.kind === "stock"
          ? {
              kind: "stock" as const,
              stock_item_id: l.item!.id,
              unit_id: l.unitId === "" ? null : l.unitId,
              quantity: Number(l.quantity),
              unit_price: Number(l.unitPrice) || 0,
              discount_pct: Number(l.discountPct) || 0,
              tax_rate: Number(l.taxRate) || 0,
            }
          : {
              kind: "expense" as const,
              description: l.description.trim(),
              account_id: l.accountId === "" ? null : l.accountId,
              unit_price: Number(l.unitPrice) || 0,
              tax_rate: Number(l.taxRate) || 0,
            },
      ),
    };
  };

  const save = async (andPost: boolean) => {
    if (saving || !editable) return;
    if (andPost && postBlockers.length > 0) {
      toast.warning("لا يمكن الترحيل", postBlockers[0]);
      return;
    }
    const payload = buildPayload();
    if (!payload) return;
    setSaving(andPost ? "post" : "draft");
    let saved: PurchaseBill;
    try {
      saved = bill ? await purchaseInvoiceService.update(bill.id, payload) : await purchaseInvoiceService.create(payload);
    } catch (e) {
      toast.error("تعذّر حفظ المسودة", purchaseErrorMessage(e));
      setSaving(null);
      return;
    }
    if (andPost) {
      try {
        saved = await purchaseInvoiceService.post(saved.id);
        toast.success(`تم ترحيل ${saved.bill_number}`, "استلام المخزن والذمة والقيد" + (Number(saved.paid_amount) > 0 ? " وسند الصرف" : ""));
      } catch (e) {
        toast.error("حُفظت المسودة لكن تعذّر الترحيل", purchaseErrorMessage(e));
      }
    } else {
      toast.success(`تم حفظ المسودة ${saved.bill_number}`);
    }
    setSaving(null);
    dirty.current = false;
    if (saved.id !== billId) navigate(`/inventory/purchases/${saved.id}`, { replace: !billId });
    else await hydrate(saved);
  };

  const confirmLeave = () => !dirty.current || window.confirm("توجد تغييرات غير محفوظة. تجاهلها؟");
  const go = (to: string) => confirmLeave() && navigate(to);

  const duplicate = async () => {
    if (!bill || !confirmLeave()) return;
    setBusy("duplicate");
    try {
      const copy = await purchaseInvoiceService.duplicate(bill.id);
      toast.success(`أُنشئت المسودة ${copy.bill_number}`);
      navigate(`/inventory/purchases/${copy.id}`);
    } catch (e) {
      toast.error("تعذّر التكرار", purchaseErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const reverse = async () => {
    if (!bill) return;
    setBusy("reverse");
    try {
      await hydrate(await purchaseInvoiceService.reverse(bill.id, reason.trim()));
      setReversing(false);
      toast.success(`تم عكس ${bill.bill_number}`, "عُكس الاستلام والقيد والدفعات.");
    } catch (e) {
      toast.error("تعذّر العكس", purchaseErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  // اختصارات الصفحة؛ أحدث الدوال عبر ref حتى لا يُعاد ربط المستمع كل رسم.
  const actions = useRef({ save, go });
  actions.current = { save, go };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "F2" || e.key === "F9") {
        e.preventDefault();
        actions.current.save(e.key === "F9");
      } else if (e.key === "F3") {
        e.preventDefault();
        actions.current.go("/inventory/purchases/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading || !meta) return <LoadingBlock />;

  const warehouseName = meta.warehouses.find((w) => w.id === warehouseId)?.name ?? bill?.warehouse?.name ?? "—";
  const cashName = meta.cash_accounts.find((a) => a.id === cashAccountId)?.name ?? "—";
  const ils = (v: number) => roundTo(v * (exRate || 1), 2);

  return (
    <div className="space-y-4" dir="rtl">
      {/* الشريط العلوي */}
      <div className="flex flex-wrap items-center gap-3">
        <nav className="text-sm text-slate-500 font-bold" aria-label="المسار">
          <Link to="/inventory/dashboard" className="hover:text-slate-300">المخازن</Link> ›{" "}
          <Link to="/inventory/purchases" className="hover:text-slate-300">فواتير المشتريات</Link>
        </nav>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Receipt size={20} className="text-red-500" />
          <bdi className="font-mono">{bill?.bill_number ?? "فاتورة جديدة"}</bdi>
        </h1>
        {bill && <PurchaseStatusBadge status={bill.effective_status} />}
        {bill && !bill.is_inventory && <span className="text-[11px] font-black text-amber-300">فاتورة قديمة — للقراءة</span>}
        <div className="flex flex-wrap items-center gap-2 mr-auto">
          {bill && (
            <>
              <button type="button" className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40" disabled={!bill.prev_id} onClick={() => go(`/inventory/purchases/${bill.prev_id}`)} aria-label="الفاتورة السابقة" title="السابقة">
                <ChevronRight size={16} />
              </button>
              <button type="button" className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40" disabled={!bill.next_id} onClick={() => go(`/inventory/purchases/${bill.next_id}`)} aria-label="الفاتورة التالية" title="التالية">
                <ChevronLeft size={16} />
              </button>
              {bill.is_inventory && canCreate && (
                <SecondaryButton onClick={duplicate} disabled={busy !== null}>
                  <Copy size={15} className="inline ml-1" /> {busy === "duplicate" ? "جارٍ التكرار..." : "تكرار"}
                </SecondaryButton>
              )}
              <SecondaryButton onClick={() => printPurchaseInvoice(bill)}>
                <Printer size={15} className="inline ml-1" /> طباعة
              </SecondaryButton>
              {bill.can?.pay && (
                <SecondaryButton onClick={() => setPaying(true)}>
                  <Wallet size={15} className="inline ml-1" /> تسديد
                </SecondaryButton>
              )}
              {bill.can?.reverse && !reversing && (
                <SecondaryButton onClick={() => setReversing(true)}>
                  <Undo2 size={15} className="inline ml-1" /> عكس
                </SecondaryButton>
              )}
            </>
          )}
          {editable && canCreate && (
            <SecondaryButton onClick={() => save(false)} disabled={saving !== null}>
              {saving === "draft" ? "جارٍ الحفظ..." : "حفظ كمسودة (F2)"}
            </SecondaryButton>
          )}
          {editable && canPostPerm && (
            <PrimaryButton onClick={() => save(true)} loading={saving === "post"} disabled={saving !== null || postBlockers.length > 0} title={postBlockers[0]}>
              <Send size={15} /> حفظ وترحيل (F9)
            </PrimaryButton>
          )}
        </div>
      </div>

      {bill?.status === "reversed" && (
        <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm font-bold text-amber-300">
          معكوسة{bill.reverser ? ` بواسطة ${bill.reverser.name}` : ""}: {bill.reversal_reason}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {/* رأس الفاتورة */}
          <fieldset disabled={!editable} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-900 rounded-2xl border border-white/5">
            <div className="sm:col-span-2">
              <Field label="المورّد" required>
                <SupplierPicker suppliers={meta.suppliers} value={supplierId} onChange={touched(setSupplierId)} />
              </Field>
              {supplier && (
                <p className="mt-1 text-[11px] text-slate-500 font-bold">
                  الرصيد الحالي: <span className="text-slate-300 tabular-nums">{fmtMoney(supplier.balance)} ₪</span> · آخر فاتورة:{" "}
                  <span className="text-slate-300 tabular-nums">{supplier.last_invoice_date ?? "—"}</span>
                  {!supplier.tax_registered && " · غير مسجّل ضريبياً"}
                </p>
              )}
            </div>
            <Field label="المخزن المستلم" required>
              <select className={inputClass} value={warehouseId} onChange={(e) => touched(setWarehouseId)(e.target.value ? Number(e.target.value) : "")}>
                <option value="">— اختر —</option>
                {meta.warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <Field label="رقم فاتورة المورّد">
                <input className={inputClass} value={invoiceNo} onChange={(e) => touched(setInvoiceNo)(e.target.value)} maxLength={64} dir="ltr" />
              </Field>
              {duplicates.length > 0 && (
                <p className="mt-1 text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <AlertTriangle size={12} /> مسجّل سابقاً: {duplicates.map((d) => d.bill_number).join("، ")}
                </p>
              )}
            </div>
            <Field label="تاريخ الفاتورة" hint="فارغ = اليوم المحاسبي.">
              <input type="date" className={inputClass} value={billDate} max={today} onChange={(e) => touched(setBillDate)(e.target.value)} dir="ltr" />
            </Field>
            <Field label="طريقة الدفع">
              <select className={inputClass} value={paymentMode} onChange={(e) => touched(setPaymentMode)(e.target.value as PaymentMode)}>
                {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_MODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </Field>
            {paymentMode !== "cash" && (
              <Field label="تاريخ الاستحقاق">
                <input
                  type="date"
                  className={inputClass}
                  value={dueDate}
                  min={effectiveDate}
                  onChange={(e) => {
                    dueTouched.current = true;
                    touched(setDueDate)(e.target.value);
                  }}
                  dir="ltr"
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="العملة">
                <select className={inputClass} value={currency} onChange={(e) => touched(setCurrency)(e.target.value)}>
                  {meta.currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="سعر الصرف">
                <input className={inputClass} type="number" min={0} step="any" dir="ltr" value={currency === "ILS" ? "1" : rate} disabled={currency === "ILS"} onChange={(e) => touched(setRate)(e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 self-end pb-3">
              <input type="checkbox" checked={taxRecoverable} onChange={(e) => touched(setTaxRecoverable)(e.target.checked)} className="w-4 h-4 accent-red-600" />
              الضريبة قابلة للخصم (لا تدخل التكلفة)
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <Field label="ملاحظات">
                <input className={inputClass} value={notes} onChange={(e) => touched(setNotes)(e.target.value)} maxLength={2000} />
              </Field>
            </div>
          </fieldset>

          {/* الأسطر */}
          <div ref={grid.tableRef} onKeyDown={grid.onKeyDown} className="bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm min-w-[1150px]">
              <thead>
                <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                  <th className="text-right p-2 w-8">#</th>
                  <th className="text-right p-2 w-24">رقم الصنف</th>
                  <th className="text-right p-2">اسم الصنف</th>
                  <th className="text-right p-2 w-28">الوحدة</th>
                  <th className="text-right p-2 w-24">الكمية</th>
                  <th className="text-right p-2 w-28">سعر الوحدة</th>
                  <th className="text-right p-2 w-24">آخر سعر</th>
                  <th className="text-right p-2 w-20">خصم %</th>
                  <th className="text-right p-2 w-20">الضريبة</th>
                  <th className="text-right p-2 w-28">الإجمالي</th>
                  <th className="p-2 w-10">
                    <span className="sr-only">حذف</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const c = calcByKey.get(l.key);
                  const n = idx + 1;
                  if (l.kind === "stock" && !l.item) {
                    if (!editable) return null;
                    return (
                      <tr key={l.key} className="border-t border-white/5">
                        <td className="p-2 text-slate-600 tabular-nums">{n}</td>
                        <td className="p-2" colSpan={2}>
                          <ItemSearch disabled={warehouseId === ""} disabledPlaceholder="اختر المخزن المستلم أولاً" excludeIds={[]} onPick={(item) => pickItem(l.key, item)} inputRef={grid.searchRef} />
                        </td>
                        <td colSpan={8} />
                      </tr>
                    );
                  }
                  if (l.kind === "expense") {
                    return (
                      <tr key={l.key} className="border-t border-white/5 align-top bg-sky-500/[0.03]">
                        <td className="p-2 pt-3.5 text-slate-500 tabular-nums">{n}</td>
                        <td className="p-2 pt-3.5 text-[11px] font-black text-sky-300">مصروف</td>
                        <td className="p-2">
                          <input className={cellInput} value={l.description} disabled={!editable} onChange={(e) => edit(l.key, { description: e.target.value })} placeholder="الوصف (نقل، تحميل...)" maxLength={255} data-key={l.key} data-col="unit" aria-label={`وصف السطر ${n}`} />
                        </td>
                        <td className="p-2" colSpan={2}>
                          <select className={cellInput} value={l.accountId} disabled={!editable} onChange={(e) => edit(l.key, { accountId: e.target.value ? Number(e.target.value) : "" })} data-key={l.key} data-col="qty" aria-label={`حساب السطر ${n}`}>
                            <option value="">— الحساب —</option>
                            {meta.expense_accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} {a.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input className={cellInput} type="number" min={0} step="any" dir="ltr" value={l.unitPrice} disabled={!editable} onChange={(e) => edit(l.key, { unitPrice: e.target.value })} data-key={l.key} data-col="price" aria-label={`مبلغ السطر ${n}`} />
                        </td>
                        <td />
                        <td />
                        <td className="p-2">
                          <TaxSelect value={l.taxRate} rates={meta.tax_rates} disabled={!editable} onChange={(v) => edit(l.key, { taxRate: v })} cellKey={l.key} n={n} />
                        </td>
                        <td className="p-2 pt-3.5 tabular-nums font-bold text-white">{c ? fmtMoney(c.total) : "—"}</td>
                        <td className="p-2">{editable && <RemoveButton n={n} onClick={() => removeLine(l.key)} />}</td>
                      </tr>
                    );
                  }
                  const rise = priceRise(l);
                  const factor = l.units.find((u) => u.id === l.unitId)?.factor ?? 1;
                  const lastBase = l.item ? lastPrices[l.item.id] : undefined;
                  return (
                    <React.Fragment key={l.key}>
                      <tr className={`border-t border-white/5 align-top ${rise !== null ? "bg-amber-500/[0.06]" : ""}`}>
                        <td className="p-2 pt-3.5 text-slate-500 tabular-nums">{n}</td>
                        <td className="p-2 pt-3.5">
                          <bdi className="font-mono text-xs text-slate-300">{l.item!.code}</bdi>
                        </td>
                        <td className="p-2 pt-3.5 font-bold text-white">{l.item!.name}</td>
                        <td className="p-2">
                          <select className={cellInput} value={l.unitId} disabled={!editable || l.units.length === 0} onChange={(e) => edit(l.key, { unitId: Number(e.target.value) })} data-key={l.key} data-col="unit" aria-label={`وحدة السطر ${n}`}>
                            {l.units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input className={cellInput} type="number" min={0} step="any" dir="ltr" value={l.quantity} disabled={!editable} onChange={(e) => edit(l.key, { quantity: e.target.value })} data-key={l.key} data-col="qty" aria-label={`كمية السطر ${n}`} />
                        </td>
                        <td className="p-2">
                          <input className={`${cellInput} ${rise !== null ? "!border-amber-400/60" : ""}`} type="number" min={0} step="any" dir="ltr" value={l.unitPrice} disabled={!editable} onChange={(e) => edit(l.key, { unitPrice: e.target.value })} data-key={l.key} data-col="price" aria-label={`سعر السطر ${n}`} />
                        </td>
                        <td className="p-2 pt-3.5 tabular-nums text-slate-400">{lastBase && exRate ? fmtMoney((lastBase * factor) / exRate) : "—"}</td>
                        <td className="p-2">
                          <input className={cellInput} type="number" min={0} max={100} step="any" dir="ltr" value={l.discountPct} disabled={!editable} onChange={(e) => edit(l.key, { discountPct: e.target.value })} data-key={l.key} data-col="disc" aria-label={`خصم السطر ${n}`} />
                        </td>
                        <td className="p-2">
                          <TaxSelect value={l.taxRate} rates={meta.tax_rates} disabled={!editable} onChange={(v) => edit(l.key, { taxRate: v })} cellKey={l.key} n={n} />
                        </td>
                        <td className="p-2 pt-3.5 tabular-nums font-bold text-white">{c ? fmtMoney(c.total) : "—"}</td>
                        <td className="p-2">{editable && <RemoveButton n={n} onClick={() => removeLine(l.key)} />}</td>
                      </tr>
                      {rise !== null && (
                        <tr className="bg-amber-500/[0.06]">
                          <td />
                          <td colSpan={10} className="px-2 pb-2">
                            <span role="alert" className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                              <AlertTriangle size={13} /> أعلى من آخر سعر بـ {fmtMoney(rise)}%
                            </span>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {editable && (
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={addExpense} className="flex items-center gap-1 text-xs font-bold text-sky-300 hover:text-sky-200">
                <Plus size={14} /> إضافة مصروف (نقل، تحميل...)
              </button>
              <span className="text-[11px] text-slate-500 font-semibold">
                Enter للخانة التالية · ↑/↓ بين الصفوف · Ctrl+Delete حذف السطر · F3 فاتورة جديدة
              </span>
            </div>
          )}
        </div>

        {/* العمود الجانبي */}
        <aside className="space-y-4 xl:sticky xl:top-4">
          <Panel title="الملخّص">
            <Row label="عدد الأصناف" value={String(calc.totals.itemsCount)} />
            <Row label="المجموع قبل الخصم" value={fmtMoney(calc.totals.gross)} />
            {calc.totals.lineDiscounts > 0 && <Row label="خصومات الأسطر" value={`− ${fmtMoney(calc.totals.lineDiscounts)}`} />}
            <div className="flex items-center justify-between gap-2 text-sm">
              <label htmlFor="bill-discount" className="text-slate-400 font-bold">
                خصم على الفاتورة
              </label>
              <input id="bill-discount" className={`${cellInput} !w-28`} type="number" min={0} step="any" dir="ltr" value={billDiscount} disabled={!editable} onChange={(e) => touched(setBillDiscount)(e.target.value)} />
            </div>
            <Row label="الصافي قبل الضريبة" value={fmtMoney(calc.totals.netBeforeTax)} />
            <Row label="الضريبة" value={fmtMoney(calc.totals.tax)} />
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="font-black text-white">الإجمالي</span>
              <span className="font-black text-white text-lg tabular-nums">
                {fmtMoney(total)} <span className="text-xs text-slate-400">{currency}</span>
              </span>
            </div>
            {calc.error && <p className="text-xs font-bold text-red-400">{calc.error}</p>}
          </Panel>

          <Panel title="الدفع">
            <Row label="طريقة الدفع" value={PAYMENT_MODE_LABELS[paymentMode]} />
            {paymentMode === "partial" && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <label htmlFor="paid-now" className="text-slate-400 font-bold">
                  المدفوع الآن
                </label>
                <input id="paid-now" className={`${cellInput} !w-28`} type="number" min={0} step="any" dir="ltr" value={paidNow} disabled={!editable} onChange={(e) => touched(setPaidNow)(e.target.value)} />
              </div>
            )}
            {paymentMode !== "credit" && (
              <select className={cellInput} value={cashAccountId} disabled={!editable} onChange={(e) => touched(setCashAccountId)(e.target.value ? Number(e.target.value) : "")} aria-label="من صندوق / حساب بنكي">
                <option value="">— من صندوق / حساب بنكي —</option>
                {meta.cash_accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} {a.name}
                  </option>
                ))}
              </select>
            )}
            {bill && bill.status !== "draft" ? (
              <>
                <Row label="المدفوع" value={fmtMoney(bill.paid_amount)} />
                <Row label="المتبقي على المورّد" value={fmtMoney(bill.remaining)} strong />
              </>
            ) : (
              <>
                <Row label="المدفوع" value={fmtMoney(paid)} />
                <Row label="المتبقي على المورّد" value={fmtMoney(remaining)} strong />
              </>
            )}
            {bill?.vouchers && bill.vouchers.length > 0 && (
              <ul className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-white/5">
                {bill.vouchers.map((v) => (
                  <li key={v.id} className={v.status === "cancelled" ? "line-through opacity-60" : ""}>
                    <bdi className="font-mono">{v.number}</bdi> · {fmtMoney(v.amount)} · {v.voucher_date?.slice(0, 10)}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {editable ? (
            <Panel title="عند الترحيل">
              <ul className="text-xs text-slate-300 space-y-1.5 font-semibold">
                <li>
                  يدخل <b>{calc.totals.itemsCount}</b> صنف مخزن <b>{warehouseName}</b> بقيمة <b className="tabular-nums">{fmtMoney(calc.totals.stockCost)} ₪</b>
                  {taxRecoverable ? " (بلا الضريبة)" : " (شاملة الضريبة)"}.
                </li>
                <li>
                  ذمة على المورّد: <b className="tabular-nums">{fmtMoney(ils(total))} ₪</b>
                  {paymentMode !== "cash" && dueDate ? ` تستحق ${dueDate}` : ""}.
                </li>
                {paid > 0 && (
                  <li>
                    سند صرف بـ <b className="tabular-nums">{fmtMoney(paid)}</b> من {cashName}.
                  </li>
                )}
                <li className="text-slate-400">
                  القيد: مدين مشتريات المواد {fmtMoney(calc.totals.stockCost)}
                  {calc.totals.expenses > 0 && ` + مصاريف ${fmtMoney(calc.totals.expenses)}`}
                  {calc.totals.inputVat > 0 && ` + ضريبة مدخلات ${fmtMoney(calc.totals.inputVat)}`} / دائن ذمم الموردين.
                </li>
              </ul>
              {(priceAlerts.length > 0 || duplicates.length > 0 || postBlockers.length > 0) && (
                <ul className="mt-2 pt-2 border-t border-white/5 text-[11px] font-bold space-y-1">
                  {priceAlerts.length > 0 && <li className="text-amber-300">⚠ {priceAlerts.length} صنف بسعر أعلى من آخر سعر بأكثر من {alertPct}%</li>}
                  {duplicates.length > 0 && <li className="text-amber-300">⚠ رقم فاتورة المورّد مسجّل سابقاً</li>}
                  {postBlockers.map((b) => (
                    <li key={b} className="text-red-400">
                      ✕ {b}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : (
            bill && (
              <Panel title="ما رُحّل">
                <ul className="text-xs text-slate-300 space-y-1.5 font-semibold">
                  {bill.stock_document && (
                    <li>
                      الاستلام: <bdi className="font-mono text-sky-300">{bill.stock_document.number}</bdi> ({bill.stock_document.status === "reversed" ? "معكوس" : "مرحّل"})
                    </li>
                  )}
                  {bill.poster && <li>رحّلها: {bill.poster.name}</li>}
                  <li>المخزن: {bill.warehouse?.name ?? "—"}</li>
                  <li>الاستحقاق: {bill.due_date}</li>
                </ul>
              </Panel>
            )
          )}
        </aside>
      </div>

      {reversing && bill && (
        <Modal
          title={`عكس ${bill.bill_number}`}
          onClose={() => setReversing(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setReversing(false)}>إلغاء</SecondaryButton>
              <PrimaryButton onClick={reverse} loading={busy === "reverse"} disabled={!reason.trim() || busy !== null}>
                تأكيد العكس
              </PrimaryButton>
            </>
          }
        >
          <p className="text-sm text-slate-300">
            يُعكس معاً: استلام المخزن، وقيد الفاتورة وذمة المورّد، وكل الدفعات وسنداتها. يُرفض العكس إن صُرف شيء من الأصناف ولم يعد الرصيد يكفي.
          </p>
          <Field label="سبب العكس" required>
            <textarea className={`${inputClass} min-h-[70px]`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus />
          </Field>
        </Modal>
      )}

      {paying && bill && (
        <PayBillModal
          bill={bill}
          cashAccounts={meta.cash_accounts}
          onClose={() => setPaying(false)}
          onPaid={async (b) => {
            setPaying(false);
            await hydrate(b);
          }}
        />
      )}
    </div>
  );
};

/* ── مكونات صغيرة ── */

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="p-4 bg-slate-900 rounded-2xl border border-white/5 space-y-2">
    <h2 className="text-xs font-black text-slate-500">{title}</h2>
    {children}
  </section>
);

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span className="text-slate-400 font-bold">{label}</span>
    <span className={`tabular-nums ${strong ? "font-black text-white" : "text-slate-200"}`}>{value}</span>
  </div>
);

const RemoveButton: React.FC<{ n: number; onClick: () => void }> = ({ n, onClick }) => (
  <button type="button" aria-label={`حذف السطر ${n}`} onClick={onClick} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20">
    <Trash2 size={14} />
  </button>
);

const TaxSelect: React.FC<{ value: string; rates: number[]; disabled: boolean; onChange: (v: string) => void; cellKey: number; n: number }> = ({ value, rates, disabled, onChange, cellKey, n }) => (
  <select className={cellInput} value={String(Number(value) || 0)} disabled={disabled} onChange={(e) => onChange(e.target.value)} data-key={cellKey} data-col="tax" aria-label={`ضريبة السطر ${n}`}>
    {rates.map((r) => (
      <option key={r} value={String(r)}>
        {r}%
      </option>
    ))}
  </select>
);

/** اختيار المورّد بالبحث (اسم أو كود). */
const SupplierPicker: React.FC<{
  suppliers: PurchasesMeta["suppliers"];
  value: number | "";
  onChange: (v: number | "") => void;
}> = ({ suppliers, value, onChange }) => {
  const selected = suppliers.find((s) => s.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const q = query.trim().toLowerCase();
  const results = suppliers.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q)).slice(0, 30);

  return (
    <div className="relative">
      <input
        className={inputClass}
        value={open ? query : (selected?.name ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setActive(0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            onChange(results[active].id);
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="ابحث باسم المورّد أو كوده..."
        role="combobox"
        aria-expanded={open}
        aria-label="المورّد"
      />
      {open && (
        <div role="listbox" className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-xl shadow-2xl divide-y divide-white/5">
          {results.length === 0 ? (
            <p className="p-3 text-xs text-slate-500 font-bold">لا يوجد مورّد مطابق</p>
          ) : (
            results.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
                className={`w-full text-right p-2.5 text-sm flex items-center justify-between gap-2 ${i === active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}
              >
                <span className="font-bold truncate">{s.name}</span>
                {s.code && <bdi className="text-xs text-slate-500 font-mono">{s.code}</bdi>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
