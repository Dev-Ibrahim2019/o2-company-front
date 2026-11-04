/**
 * StockDocumentsPage.tsx — قائمة مستندات نوع واحد (استلام مشتريات / تحويل / هالك) ونافذة عرضها.
 * المسودة تُعدَّل وتُحذف وتُرحَّل؛ المرحّل لا يُعدَّل ويُصحَّح بعكسه كاملاً مع ذكر السبب.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, ChevronRight, ChevronLeft, Pencil, Trash2, Send, Undo2, PackageCheck, Copy, Printer } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  DOCUMENT_STATUS_LABELS,
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type DocumentsMeta,
  type Paginated,
  type StockDocument,
  type StockDocumentStatus,
  type StockDocumentType,
  type Warehouse,
} from "../../../services/inventoryService";
import { DOCUMENT_TITLES, StockDocumentFormModal } from "./StockDocumentFormModal";
import { TransferDocumentForm } from "./TransferDocumentForm";
import { printTransferVoucher } from "./printTransferVoucher";
import {
  EmptyBlock,
  Field,
  IconButton,
  LoadingBlock,
  Modal,
  PageHeader,
  PrimaryButton,
  SearchBox,
  SecondaryButton,
  inputClass,
} from "./ui";

const SUBTITLES: Record<StockDocumentType, string> = {
  receipt: "سجل استلامات المخزن. الاستلام من المورّدين يتم بفاتورة المشتريات (تُنشئ الاستلام تلقائياً)؛ الاستلام المباشر هنا بصلاحية خاصة.",
  transfer: "نقل أصناف بين المخازن (مثلاً من المخزن الجاف إلى المطبخ) بمتوسط تكلفة المصدر.",
  waste: "إخراج التالف والمنتهي وهدر التحضير من المخزون مع سبب لكل سطر.",
};

const STATUS_STYLES: Record<StockDocumentStatus, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  posted: "bg-green-500/15 text-green-400",
  reversed: "bg-amber-500/15 text-amber-300",
};

export const DocumentStatusBadge: React.FC<{ status: StockDocumentStatus }> = ({ status }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-black whitespace-nowrap ${STATUS_STYLES[status]}`}>
    {DOCUMENT_STATUS_LABELS[status]}
  </span>
);

interface Filters {
  search: string;
  status: string;
  warehouseId: string;
  supplierId: string;
  /** حالة الاستلام (الصرف): "" الكل، "1" مستلَم، "0" غير مستلَم. */
  received: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = { search: "", status: "", warehouseId: "", supplierId: "", received: "", from: "", to: "" };

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });

/** شارة الاستلام لمستند الصرف المرحّل. */
const ReceiptBadge: React.FC<{ doc: StockDocument }> = ({ doc }) =>
  doc.status === "draft" ? (
    <span className="text-slate-600">—</span>
  ) : doc.received_at ? (
    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-black whitespace-nowrap bg-green-500/15 text-green-400">مستلَم</span>
  ) : (
    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-black whitespace-nowrap bg-red-500/15 text-red-400">غير مستلَم</span>
  );

export const StockDocumentsPage: React.FC<{ type: StockDocumentType }> = ({ type }) => {
  // الاستلام من المورّدين صار بفاتورة المشتريات؛ الاستلام بدون فاتورة بصلاحية خاصة.
  const canDirectReceipt = useCan(INVENTORY_PERMISSIONS.RECEIPTS_DIRECT);
  const canManage = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_MANAGE) && (type !== "receipt" || canDirectReceipt);
  const [meta, setMeta] = useState<DocumentsMeta | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [result, setResult] = useState<Paginated<StockDocument> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<StockDocument | "new" | null>(null);
  /** يتغير مع F3 (مستند جديد) ليُعاد بناء نموذج الصرف من الصفر. */
  const [formKey, setFormKey] = useState(0);
  const requestSeq = useRef(0);

  // الصفحة نفسها تُستخدم للأنواع الثلاثة: تغيير النوع يعيد الحالة.
  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setPage(1);
    setResult(null);
    setViewingId(null);
    setEditing(null);
  }, [type]);

  useEffect(() => {
    inventoryService.documentsMeta().then(setMeta).catch((e) => toast.error("تعذّر تحميل البيانات", inventoryErrorMessage(e)));
    inventoryService.warehouses().then(setWarehouses).catch((e) => toast.error("تعذّر تحميل المخازن", inventoryErrorMessage(e)));
  }, []);

  const setFilter = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      const search = searchInput.trim();
      if (search !== filters.search) setFilter({ search });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, filters.search]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await inventoryService.documents({
        type,
        page,
        per_page: 25,
        search: filters.search || undefined,
        status: filters.status || undefined,
        warehouse_id: filters.warehouseId || undefined,
        supplier_id: filters.supplierId || undefined,
        received: filters.received || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      if (seq === requestSeq.current) setResult(data);
    } catch (e) {
      if (seq === requestSeq.current) toast.error("تعذّر تحميل المستندات", inventoryErrorMessage(e));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [type, page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = result?.data ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title={DOCUMENT_TITLES[type]}
        subtitle={SUBTITLES[type]}
        action={
          canManage && (
            <PrimaryButton onClick={() => setEditing("new")} disabled={!meta || warehouses.length === 0}>
              <Plus size={18} /> مستند جديد
            </PrimaryButton>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={searchInput} onChange={setSearchInput} placeholder={type === "receipt" ? "رقم المستند أو فاتورة المورّد..." : type === "transfer" ? "رقم المستند أو رقم المرجع..." : "رقم المستند..."} />
        <select className={`${inputClass} !w-auto`} value={filters.status} onChange={(e) => setFilter({ status: e.target.value })} aria-label="الحالة">
          <option value="">كل الحالات</option>
          {(Object.keys(DOCUMENT_STATUS_LABELS) as StockDocumentStatus[]).map((s) => (
            <option key={s} value={s}>
              {DOCUMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select className={`${inputClass} !w-auto`} value={filters.warehouseId} onChange={(e) => setFilter({ warehouseId: e.target.value })} aria-label="المخزن">
          <option value="">كل المخازن</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {type === "receipt" && meta && (
          <select className={`${inputClass} !w-auto`} value={filters.supplierId} onChange={(e) => setFilter({ supplierId: e.target.value })} aria-label="المورّد">
            <option value="">كل الموردين</option>
            {meta.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {type === "transfer" && (
          <select className={`${inputClass} !w-auto`} value={filters.received} onChange={(e) => setFilter({ received: e.target.value })} aria-label="حالة الاستلام">
            <option value="">الاستلام: الكل</option>
            <option value="1">مستلَم</option>
            <option value="0">غير مستلَم</option>
          </select>
        )}
        <input type="date" className={`${inputClass} !w-auto`} value={filters.from} onChange={(e) => setFilter({ from: e.target.value })} aria-label="من يوم" dir="ltr" />
        <input type="date" className={`${inputClass} !w-auto`} value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} aria-label="إلى يوم" dir="ltr" />
      </div>

      {loading && !result ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyBlock icon={FileText} text="لا توجد مستندات مطابقة" />
      ) : (
        <div className={`bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                <th className="text-right p-4">الرقم</th>
                <th className="text-right p-4">التاريخ</th>
                <th className="text-right p-4">{type === "transfer" ? "من ← إلى" : "المخزن"}</th>
                {type === "receipt" && <th className="text-right p-4">المورّد / الفاتورة</th>}
                <th className="text-right p-4">الأصناف</th>
                <th className="text-right p-4">القيمة (₪)</th>
                <th className="text-right p-4">الحالة</th>
                {type === "transfer" && <th className="text-right p-4">الاستلام</th>}
                <th className="text-right p-4">بواسطة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => setViewingId(d.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setViewingId(d.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`عرض المستند ${d.number}`}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer focus:outline-none focus:bg-white/[0.05]"
                >
                  <td className="p-4">
                    <bdi className="font-mono text-xs font-bold text-white">{d.number}</bdi>
                    {d.reference_no && <bdi className="block text-[11px] text-slate-500 font-mono">مرجع {d.reference_no}</bdi>}
                  </td>
                  <td className="p-4 text-slate-300 tabular-nums">{d.document_date}</td>
                  <td className="p-4 text-slate-300">
                    {d.warehouse?.name}
                    {d.to_warehouse && <span className="text-slate-500"> ← {d.to_warehouse.name}</span>}
                  </td>
                  {type === "receipt" && (
                    <td className="p-4 text-slate-300">
                      {d.supplier?.name}
                      {d.supplier_invoice_no && <bdi className="block text-[11px] text-slate-500 font-mono">{d.supplier_invoice_no}</bdi>}
                    </td>
                  )}
                  <td className="p-4 text-slate-400 tabular-nums">{d.lines_count}</td>
                  <td className="p-4 text-slate-300 tabular-nums">{d.status === "draft" ? "—" : fmtNum(d.total_cost, 2)}</td>
                  <td className="p-4">
                    <DocumentStatusBadge status={d.status} />
                  </td>
                  {type === "transfer" && (
                    <td className="p-4">
                      <ReceiptBadge doc={d} />
                      {d.receiver && <span className="block text-[11px] text-slate-500 mt-0.5">{d.receiver.name}</span>}
                    </td>
                  )}
                  <td className="p-4 text-xs text-slate-400">{d.creator?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 font-bold">
            {result.total} مستند — صفحة {result.current_page} من {result.last_page}
          </span>
          <div className="flex gap-1.5">
            <IconButton label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight size={16} />
            </IconButton>
            <IconButton label="الصفحة التالية" disabled={page >= result.last_page || loading} onClick={() => setPage((p) => p + 1)}>
              <ChevronLeft size={16} />
            </IconButton>
          </div>
        </div>
      )}

      {viewingId !== null && (
        <StockDocumentViewModal
          id={viewingId}
          onClose={() => setViewingId(null)}
          onEdit={(doc) => {
            setViewingId(null);
            setEditing(doc);
          }}
          onChanged={load}
        />
      )}

      {editing !== null && meta && type === "transfer" && (
        <TransferDocumentForm
          key={formKey}
          document={editing === "new" ? null : editing}
          warehouses={warehouses}
          onNew={() => {
            setEditing("new");
            setFormKey((k) => k + 1);
          }}
          onClose={() => setEditing(null)}
          onSaved={(doc) => {
            setEditing(null);
            load();
            setViewingId(doc.id);
          }}
        />
      )}

      {editing !== null && meta && type !== "transfer" && (
        <StockDocumentFormModal
          type={type}
          document={editing === "new" ? null : editing}
          meta={meta}
          warehouses={warehouses}
          onClose={() => setEditing(null)}
          onSaved={(doc) => {
            setEditing(null);
            load();
            setViewingId(doc.id);
          }}
        />
      )}
    </div>
  );
};

/* ── نافذة عرض المستند ── */

const WASTE_REASONS_AR: Record<string, string> = {
  expired: "منتهي الصلاحية",
  damaged: "تالف",
  spoiled: "فاسد",
  prep_waste: "هدر تحضير",
  returned_dish: "طبق مرتجع",
  other: "أخرى",
};

const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-[11px] text-slate-500 font-black">{label}</p>
    <div className="text-slate-200 font-bold mt-0.5">{children}</div>
  </div>
);

const StockDocumentViewModal: React.FC<{
  id: number;
  onClose: () => void;
  onEdit: (doc: StockDocument) => void;
  onChanged: () => void;
}> = ({ id, onClose, onEdit, onChanged }) => {
  const canManage = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_MANAGE);
  const canPost = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_POST);
  const canReverse = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_REVERSE);
  const [doc, setDoc] = useState<StockDocument | null>(null);
  const [busy, setBusy] = useState<"post" | "delete" | "reverse" | "receive" | "duplicate" | null>(null);
  const [reversing, setReversing] = useState(false);
  const [reason, setReason] = useState("");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    let cancelled = false;
    inventoryService
      .document(id)
      .then((d) => !cancelled && setDoc(d))
      .catch((e) => {
        toast.error("تعذّر تحميل المستند", inventoryErrorMessage(e));
        closeRef.current();
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const duplicate = async () => {
    if (!doc) return;
    setBusy("duplicate");
    try {
      const copy = await inventoryService.duplicateDocument(doc.id);
      toast.success(`أُنشئت المسودة ${copy.number}`, "اختر الدفعات من جديد ثم احفظ.");
      onChanged();
      onEdit(copy);
    } catch (e) {
      toast.error("تعذّر التكرار", inventoryErrorMessage(e));
      setBusy(null);
    }
  };

  const run = async (kind: "post" | "delete" | "reverse" | "receive") => {
    if (!doc) return;
    if (kind === "delete" && !window.confirm(`حذف المسودة ${doc.number}؟`)) return;
    if (kind === "receive" && !window.confirm(`تأكيد استلام ${doc.number} في ${doc.to_warehouse?.name ?? "مخزن الوجهة"}؟ لا يمكن التراجع عن التأكيد.`)) return;
    setBusy(kind);
    try {
      if (kind === "receive") {
        setDoc(await inventoryService.confirmReceipt(doc.id));
        toast.success(`تم تأكيد استلام ${doc.number}`);
      } else if (kind === "post") {
        setDoc(await inventoryService.postDocument(doc.id));
        toast.success(`تم ترحيل ${doc.number}`);
      } else if (kind === "reverse") {
        setDoc(await inventoryService.reverseDocument(doc.id, reason.trim()));
        setReversing(false);
        toast.success(`تم عكس ${doc.number}`);
      } else {
        await inventoryService.deleteDocument(doc.id);
        toast.success("تم حذف المسودة");
        onChanged();
        onClose();
        return;
      }
      onChanged();
    } catch (e) {
      toast.error("تعذّرت العملية", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const isReceipt = doc?.type === "receipt";
  const isWaste = doc?.type === "waste";
  const showValues = Boolean(doc?.costs_visible && doc.status !== "draft");

  return (
    <Modal
      wide
      title={doc ? `${doc.type_label} ${doc.number}` : "المستند"}
      onClose={onClose}
      footer={
        doc && (
          <>
            {doc.status === "draft" && canManage && (
              <>
                <SecondaryButton onClick={() => run("delete")} disabled={busy !== null}>
                  <Trash2 size={15} className="inline ml-1" /> حذف
                </SecondaryButton>
                <SecondaryButton onClick={() => onEdit(doc)} disabled={busy !== null}>
                  <Pencil size={15} className="inline ml-1" /> تعديل
                </SecondaryButton>
              </>
            )}
            {doc.status === "draft" && canPost && (
              <PrimaryButton onClick={() => run("post")} loading={busy === "post"} disabled={busy !== null}>
                <Send size={15} /> ترحيل
              </PrimaryButton>
            )}
            {doc.type === "transfer" && !reversing && (
              <SecondaryButton onClick={() => printTransferVoucher(doc)}>
                <Printer size={15} className="inline ml-1" /> طباعة
              </SecondaryButton>
            )}
            {doc.type === "transfer" && doc.status !== "draft" && canManage && !reversing && (
              <SecondaryButton onClick={duplicate} disabled={busy !== null}>
                <Copy size={15} className="inline ml-1" /> {busy === "duplicate" ? "جارٍ التكرار..." : "تكرار"}
              </SecondaryButton>
            )}
            {doc.can_receive && !reversing && (
              <PrimaryButton onClick={() => run("receive")} loading={busy === "receive"} disabled={busy !== null}>
                <PackageCheck size={15} /> تأكيد الاستلام
              </PrimaryButton>
            )}
            {doc.status === "posted" && canReverse && !reversing && (
              <SecondaryButton
                onClick={() => setReversing(true)}
                disabled={doc.can_reverse === false}
                title={
                  doc.can_reverse === false
                    ? doc.purchase_bill
                      ? "جزء من فاتورة مشتريات — اعكس الفاتورة نفسها"
                      : "المستند مستلَم — عكسه للمدير فقط"
                    : undefined
                }
              >
                <Undo2 size={15} className="inline ml-1" /> عكس المستند
              </SecondaryButton>
            )}
            {reversing && (
              <PrimaryButton onClick={() => run("reverse")} loading={busy === "reverse"} disabled={!reason.trim() || busy !== null}>
                تأكيد العكس
              </PrimaryButton>
            )}
          </>
        )
      }
    >
      {!doc ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Info label="الحالة">
              <DocumentStatusBadge status={doc.status} />
            </Info>
            <Info label="التاريخ">{doc.document_date}</Info>
            <Info label={doc.type === "transfer" ? "من مخزن" : "المخزن"}>{doc.warehouse?.name}</Info>
            {doc.to_warehouse && <Info label="إلى مخزن">{doc.to_warehouse.name}</Info>}
            {doc.supplier && <Info label="المورّد">{doc.supplier.name}</Info>}
            {doc.supplier_invoice_no && (
              <Info label="فاتورة المورّد">
                <bdi className="font-mono">{doc.supplier_invoice_no}</bdi>
              </Info>
            )}
            {showValues && <Info label="القيمة">{fmtNum(doc.total_cost, 2)} ₪</Info>}
            <Info label="أنشأه">{doc.creator?.name ?? "—"}</Info>
            {doc.poster && <Info label="رحّله">{doc.poster.name}</Info>}
            {doc.reverser && <Info label="عكسه">{doc.reverser.name}</Info>}
            {doc.purchase_bill && (
              <Info label="فاتورة المشتريات">
                <Link to={`/inventory/purchases/${doc.purchase_bill.id}`} className="text-sky-300 hover:underline">
                  <bdi className="font-mono">{doc.purchase_bill.bill_number}</bdi>
                </Link>
              </Info>
            )}
            {doc.destination && <Info label="الجهة">{doc.destination}</Info>}
            {doc.reference_no && (
              <Info label="رقم المرجع">
                <bdi className="font-mono">{doc.reference_no}</bdi>
              </Info>
            )}
            {doc.type === "transfer" && (
              <Info label="الاستلام">
                <ReceiptBadge doc={doc} />
              </Info>
            )}
          </div>
          {doc.notes && <p className="text-sm text-slate-400">{doc.notes}</p>}
          {doc.received_at && (
            <p className="text-sm text-green-400 font-bold">
              استلمه: {doc.receiver?.name ?? "—"} · التاريخ: <bdi className="tabular-nums">{fmtDateTime(doc.received_at)}</bdi>
            </p>
          )}
          {doc.reversal_reason && <p className="text-sm text-amber-300 font-bold">سبب العكس: {doc.reversal_reason}</p>}

          <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                  <th className="text-right p-3">#</th>
                  <th className="text-right p-3">الصنف</th>
                  <th className="text-right p-3">الكمية</th>
                  {isReceipt && doc.costs_visible && <th className="text-right p-3">تكلفة الوحدة</th>}
                  {isWaste && <th className="text-right p-3">السبب</th>}
                  {showValues && <th className="text-right p-3">القيمة (₪)</th>}
                </tr>
              </thead>
              <tbody>
                {doc.lines?.map((l) => (
                  <tr key={l.id} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-slate-500 tabular-nums">{l.line_no}</td>
                    <td className="p-3 font-bold text-white">
                      {l.stock_item?.name} <bdi className="text-xs text-slate-500 font-mono">{l.stock_item?.code}</bdi>
                    </td>
                    <td className="p-3 text-slate-200 tabular-nums">
                      {fmtNum(l.quantity)} <span className="text-xs text-slate-500">{l.unit?.name}</span>
                    </td>
                    {isReceipt && doc.costs_visible && <td className="p-3 text-slate-300 tabular-nums">{fmtNum(l.unit_cost, 4)}</td>}
                    {isWaste && <td className="p-3 text-slate-300">{l.waste_reason ? (WASTE_REASONS_AR[l.waste_reason] ?? l.waste_reason) : "—"}</td>}
                    {showValues && <td className="p-3 text-slate-300 tabular-nums">{fmtNum(l.posted_cost, 2)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reversing && (
            <div className="space-y-2 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-sm text-slate-300">
                ستُسجَّل حركات عكسية لكل أصناف المستند بتكاليفها الأصلية، ويصبح المستند "معكوساً". لا يمكن التراجع عن العكس.
              </p>
              <Field label="سبب العكس" required>
                <textarea className={`${inputClass} min-h-[70px]`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus />
              </Field>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
