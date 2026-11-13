/**
 * PurchaseInvoicesPage.tsx — قائمة فواتير المشتريات الموحّدة (/inventory/purchases).
 * بطاقات علوية، فلاتر وشرائح حالة، صف مجموع للفترة (بلا المسودات والمعكوسة)، وإجراءات لكل صف.
 * F3 فاتورة جديدة. الخادم يقصر القائمة على مخازن المستخدم.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Copy, Eye, FileText, MoreVertical, Plus, Printer, Undo2, Wallet } from "lucide-react";
import { useCan } from "../../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../../auth/permissions";
import { toast } from "../../../shared/Toast";
import {
  fmtMoney,
  purchaseErrorMessage,
  purchaseInvoiceService,
  type PurchaseBill,
  type PurchaseListResponse,
  type PurchaseStatusChip,
  type PurchasesMeta,
} from "../../../../services/purchaseInvoiceService";
import { EmptyBlock, Field, IconButton, LoadingBlock, Modal, PageHeader, PrimaryButton, SearchBox, SecondaryButton, inputClass } from "../ui";
import { PurchaseStatusBadge } from "./PurchaseStatusBadge";
import { PayBillModal } from "./PayBillModal";
import { printPurchaseInvoice } from "./printPurchaseInvoice";

const CHIPS: { value: PurchaseStatusChip; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "draft", label: "مسودة" },
  { value: "unpaid", label: "غير مدفوعة" },
  { value: "partial", label: "مدفوعة جزئياً" },
  { value: "overdue", label: "متأخرة" },
  { value: "paid", label: "مدفوعة" },
  { value: "reversed", label: "معكوسة" },
];

interface Filters {
  search: string;
  supplierId: string;
  warehouseId: string;
  status: PurchaseStatusChip;
  from: string;
  to: string;
}

const EMPTY: Filters = { search: "", supplierId: "", warehouseId: "", status: "", from: "", to: "" };

export const PurchaseInvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const canCreate = useCan(INVENTORY_PERMISSIONS.PURCHASES_CREATE);
  const canPay = useCan(INVENTORY_PERMISSIONS.PURCHASES_PAY);
  const canReverse = useCan(INVENTORY_PERMISSIONS.PURCHASES_REVERSE);
  const [meta, setMeta] = useState<PurchasesMeta | null>(null);
  const [data, setData] = useState<PurchaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [paying, setPaying] = useState<PurchaseBill | null>(null);
  const [reversing, setReversing] = useState<PurchaseBill | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    purchaseInvoiceService.meta().then(setMeta).catch((e) => toast.error("تعذّر تحميل البيانات", purchaseErrorMessage(e)));
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
    const n = ++seq.current;
    setLoading(true);
    try {
      const res = await purchaseInvoiceService.list({
        page,
        per_page: 25,
        search: filters.search || undefined,
        supplier_id: filters.supplierId || undefined,
        warehouse_id: filters.warehouseId || undefined,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      if (n === seq.current) setData(res);
    } catch (e) {
      if (n === seq.current) toast.error("تعذّر تحميل الفواتير", purchaseErrorMessage(e));
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  // F3: فاتورة جديدة
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F3" && !e.ctrlKey && !e.altKey && !e.metaKey && canCreate) {
        e.preventDefault();
        navigate("/inventory/purchases/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCreate, navigate]);

  useEffect(() => {
    if (menuId === null) return;
    const close = () => setMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuId]);

  const duplicate = async (b: PurchaseBill) => {
    try {
      const copy = await purchaseInvoiceService.duplicate(b.id);
      toast.success(`أُنشئت المسودة ${copy.bill_number}`);
      navigate(`/inventory/purchases/${copy.id}`);
    } catch (e) {
      toast.error("تعذّر التكرار", purchaseErrorMessage(e));
    }
  };

  const print = async (b: PurchaseBill) => {
    try {
      printPurchaseInvoice(await purchaseInvoiceService.get(b.id));
    } catch (e) {
      toast.error("تعذّرت الطباعة", purchaseErrorMessage(e));
    }
  };

  const reverse = async () => {
    if (!reversing) return;
    setBusy(true);
    try {
      await purchaseInvoiceService.reverse(reversing.id, reason.trim());
      toast.success(`تم عكس ${reversing.bill_number}`);
      setReversing(null);
      setReason("");
      load();
    } catch (e) {
      toast.error("تعذّر العكس", purchaseErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.list.data ?? [];
  const cards = data?.cards;
  const open = (b: PurchaseBill) => navigate(`/inventory/purchases/${b.id}`);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="فواتير المشتريات"
        subtitle="مستند واحد: ترحيله يُدخل الأصناف للمخزن ويسجّل ذمة المورّد والقيد وسند الصرف للمدفوع."
        action={
          canCreate && (
            <PrimaryButton onClick={() => navigate("/inventory/purchases/new")}>
              <Plus size={18} /> فاتورة جديدة (F3)
            </PrimaryButton>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="مشتريات الشهر" value={cards ? `${fmtMoney(cards.month_purchases)} ₪` : "—"} />
        <Card label="مستحق للمورّدين" value={cards ? `${fmtMoney(cards.payable)} ₪` : "—"} hint={cards?.overdue ? `${cards.overdue} متأخرة` : undefined} danger={Boolean(cards?.overdue)} />
        <Card label="مسودات بانتظار الترحيل" value={cards ? String(cards.drafts) : "—"} onClick={() => setFilter({ status: "draft" })} />
        <Card label="تستحق خلال 7 أيام" value={cards ? String(cards.due_soon) : "—"} onClick={() => setFilter({ status: "unpaid" })} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={searchInput} onChange={setSearchInput} placeholder="رقمنا، رقم فاتورة المورّد، المورّد..." />
        <select className={`${inputClass} !w-auto`} value={filters.supplierId} onChange={(e) => setFilter({ supplierId: e.target.value })} aria-label="المورّد">
          <option value="">كل الموردين</option>
          {meta?.suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select className={`${inputClass} !w-auto`} value={filters.warehouseId} onChange={(e) => setFilter({ warehouseId: e.target.value })} aria-label="المخزن">
          <option value="">كل المخازن</option>
          {meta?.warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <input type="date" className={`${inputClass} !w-auto`} value={filters.from} onChange={(e) => setFilter({ from: e.target.value })} aria-label="من يوم" dir="ltr" />
        <input type="date" className={`${inputClass} !w-auto`} value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} aria-label="إلى يوم" dir="ltr" />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="حالة الفاتورة">
        {CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            role="tab"
            aria-selected={filters.status === c.value}
            onClick={() => setFilter({ status: c.value })}
            className={`px-3 py-1.5 rounded-full text-xs font-black transition-colors ${filters.status === c.value ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyBlock icon={FileText} text="لا توجد فواتير مطابقة" />
      ) : (
        <div className={`bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                <th className="text-right p-3">الرقم</th>
                <th className="text-right p-3">التاريخ</th>
                <th className="text-right p-3">المورّد</th>
                <th className="text-right p-3">فاتورة المورّد</th>
                <th className="text-right p-3">المخزن</th>
                <th className="text-right p-3">الأصناف</th>
                <th className="text-right p-3">الإجمالي</th>
                <th className="text-right p-3">المدفوع</th>
                <th className="text-right p-3">المتبقي</th>
                <th className="text-right p-3">الاستحقاق</th>
                <th className="text-right p-3">الحالة</th>
                <th className="p-3">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => open(b)}
                  onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && open(b)}
                  tabIndex={0}
                  className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer focus:outline-none focus:bg-white/[0.05]"
                >
                  <td className="p-3">
                    <bdi className="font-mono text-xs font-bold text-white">{b.bill_number}</bdi>
                    {!b.is_inventory && <span className="block text-[10px] text-amber-300 font-bold">قديمة</span>}
                  </td>
                  <td className="p-3 text-slate-300 tabular-nums">{b.bill_date}</td>
                  <td className="p-3 text-slate-200 font-bold">{b.supplier?.name}</td>
                  <td className="p-3">
                    <bdi className="font-mono text-xs text-slate-400">{b.supplier_invoice_no ?? "—"}</bdi>
                  </td>
                  <td className="p-3 text-slate-300">{b.warehouse?.name ?? "—"}</td>
                  <td className="p-3 text-slate-400 tabular-nums">{b.items_count ?? "—"}</td>
                  <td className="p-3 text-slate-200 tabular-nums">
                    {fmtMoney(b.total)} {b.currency !== "ILS" && <span className="text-[10px] text-slate-500">{b.currency}</span>}
                  </td>
                  <td className="p-3 text-slate-400 tabular-nums">{fmtMoney(b.paid_amount)}</td>
                  <td className="p-3 tabular-nums font-bold text-white">{b.status === "draft" || b.status === "reversed" ? "—" : fmtMoney(b.remaining)}</td>
                  <td className={`p-3 tabular-nums ${b.effective_status === "overdue" ? "text-red-400 font-bold" : "text-slate-400"}`}>{b.status === "draft" ? "—" : b.due_date}</td>
                  <td className="p-3">
                    <PurchaseStatusBadge status={b.effective_status} />
                  </td>
                  <td className="p-3 relative" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      label={`إجراءات ${b.bill_number}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(menuId === b.id ? null : b.id);
                      }}
                      aria-haspopup="menu"
                      aria-expanded={menuId === b.id}
                    >
                      <MoreVertical size={16} />
                    </IconButton>
                    {menuId === b.id && (
                      <div role="menu" className="absolute left-3 top-full z-20 w-44 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-1 text-sm">
                        <MenuItem icon={Eye} label="عرض" onClick={() => open(b)} />
                        {b.is_inventory && canCreate && <MenuItem icon={Copy} label="تكرار" onClick={() => duplicate(b)} />}
                        <MenuItem icon={Printer} label="طباعة" onClick={() => print(b)} />
                        {b.is_inventory && canPay && ["unpaid", "partially_paid", "overdue"].includes(b.status) && (
                          <MenuItem icon={Wallet} label="تسديد" onClick={() => setPaying(b)} />
                        )}
                        {b.is_inventory && canReverse && ["unpaid", "partially_paid", "paid", "overdue"].includes(b.status) && (
                          <MenuItem icon={Undo2} label="عكس" danger onClick={() => setReversing(b)} />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {data && (
              <tfoot>
                <tr className="text-xs font-black text-slate-300 bg-white/[0.02]">
                  <td className="p-3" colSpan={6}>
                    مجموع الفترة ({data.summary.count} فاتورة مرحّلة، بلا المعكوسة)
                  </td>
                  <td className="p-3 tabular-nums">{fmtMoney(data.summary.total)}</td>
                  <td className="p-3 tabular-nums">{fmtMoney(data.summary.paid)}</td>
                  <td className="p-3 tabular-nums text-white">{fmtMoney(data.summary.remaining)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {data && data.list.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 font-bold">
            {data.list.total} فاتورة — صفحة {data.list.current_page} من {data.list.last_page}
          </span>
          <div className="flex gap-1.5">
            <IconButton label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight size={16} />
            </IconButton>
            <IconButton label="الصفحة التالية" disabled={page >= data.list.last_page || loading} onClick={() => setPage((p) => p + 1)}>
              <ChevronLeft size={16} />
            </IconButton>
          </div>
        </div>
      )}

      {paying && meta && (
        <PayBillModal
          bill={paying}
          cashAccounts={meta.cash_accounts}
          onClose={() => setPaying(null)}
          onPaid={() => {
            setPaying(null);
            load();
          }}
        />
      )}

      {reversing && (
        <Modal
          title={`عكس ${reversing.bill_number}`}
          onClose={() => setReversing(null)}
          footer={
            <>
              <SecondaryButton onClick={() => setReversing(null)}>إلغاء</SecondaryButton>
              <PrimaryButton onClick={reverse} loading={busy} disabled={!reason.trim() || busy}>
                تأكيد العكس
              </PrimaryButton>
            </>
          }
        >
          <p className="text-sm text-slate-300">يُعكس معاً: استلام المخزن، وقيد الفاتورة وذمة المورّد، وكل الدفعات وسنداتها.</p>
          <Field label="سبب العكس" required>
            <textarea className={`${inputClass} min-h-[70px]`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus />
          </Field>
        </Modal>
      )}
    </div>
  );
};

const Card: React.FC<{ label: string; value: string; hint?: string; danger?: boolean; onClick?: () => void }> = ({ label, value, hint, danger, onClick }) => {
  const body = (
    <>
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="text-xl font-black text-white tabular-nums mt-1">{value}</p>
      {hint && <p className={`text-[11px] font-bold mt-0.5 ${danger ? "text-red-400" : "text-slate-500"}`}>{hint}</p>}
    </>
  );
  const cls = "p-4 bg-slate-900 rounded-2xl border border-white/5 text-right";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:border-white/15 transition-colors`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
};

const MenuItem: React.FC<{ icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }> = ({ icon: Icon, label, onClick, danger }) => (
  <button type="button" role="menuitem" onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-2 text-right hover:bg-white/5 ${danger ? "text-red-400" : "text-slate-300"}`}>
    <Icon size={14} /> {label}
  </button>
);
