/**
 * BalancesPage.tsx — أرصدة المخزون: الرصيد ومتوسط التكلفة والقيمة لكل صنف في كل مخزن.
 * الأرصدة نتيجة الحركات فقط (لا تُعدَّل من هنا). النقر على صف يفتح سجل حركة الصنف.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Scale, ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type InventoryLookups,
  type Paginated,
  type StockBalanceRow,
  type Warehouse,
} from "../../../services/inventoryService";
import { flattenTree } from "./CategoriesPage";
import { OpeningBalanceModal } from "./OpeningBalanceModal";
import { EmptyBlock, IconButton, LoadingBlock, PageHeader, PrimaryButton, SearchBox, Toggle, inputClass } from "./ui";

interface Filters {
  search: string;
  warehouseId: string;
  categoryId: string;
  nonzero: boolean;
}

export const BalancesPage: React.FC = () => {
  const navigate = useNavigate();
  const canOpen = useCan(INVENTORY_PERMISSIONS.MOVEMENTS_OPENING);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lookups, setLookups] = useState<InventoryLookups | null>(null);
  const [result, setResult] = useState<Paginated<StockBalanceRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<Filters>({ search: "", warehouseId: "", categoryId: "", nonzero: true });
  const [page, setPage] = useState(1);
  const [openingOpen, setOpeningOpen] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    inventoryService.warehouses().then(setWarehouses).catch((e) => toast.error("تعذّر تحميل المخازن", inventoryErrorMessage(e)));
    inventoryService.lookups().then(setLookups).catch(() => undefined);
  }, []);

  // أي تغيير في الفلاتر يعيد للصفحة الأولى في نفس التحديث (طلب واحد لا طلبان).
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
      const data = await inventoryService.balances({
        page,
        per_page: 50,
        search: filters.search || undefined,
        warehouse_id: filters.warehouseId || undefined,
        category_id: filters.categoryId || undefined,
        nonzero: filters.nonzero ? 1 : undefined,
      });
      if (seq === requestSeq.current) setResult(data);
    } catch (e) {
      if (seq === requestSeq.current) toast.error("تعذّر تحميل الأرصدة", inventoryErrorMessage(e));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryTree = useMemo(() => flattenTree(lookups?.categories ?? []), [lookups]);
  const rows = result?.data ?? [];
  // قيمة الصفحة الحالية = مجموع (الرصيد × متوسط التكلفة) للصفوف المعروضة
  const pageValue = rows.reduce((s, r) => s + Number(r.value), 0);

  const openKardex = (r: StockBalanceRow) =>
    navigate(`/inventory/kardex?warehouse_id=${r.warehouse_id}&stock_item_id=${r.stock_item_id}`);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="أرصدة المخزون"
        subtitle="الرصيد ومتوسط التكلفة المرجّح لكل صنف في كل مخزن. الرصيد لا يتغيّر إلا عبر حركة مسجّلة."
        action={
          canOpen && (
            <PrimaryButton onClick={() => setOpeningOpen(true)} disabled={warehouses.length === 0}>
              <Plus size={18} /> رصيد أول المدة
            </PrimaryButton>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={searchInput} onChange={setSearchInput} placeholder="بحث بالاسم أو الكود أو الباركود..." />
        <select
          className={`${inputClass} !w-auto`}
          value={filters.warehouseId}
          onChange={(e) => setFilter({ warehouseId: e.target.value })}
          aria-label="المخزن"
        >
          <option value="">كل المخازن</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          className={`${inputClass} !w-auto`}
          value={filters.categoryId}
          onChange={(e) => setFilter({ categoryId: e.target.value })}
          aria-label="التصنيف"
        >
          <option value="">كل التصنيفات</option>
          {categoryTree.map(({ category, depth }) => (
            <option key={category.id} value={category.id}>
              {"  ".repeat(depth * 2)}
              {category.name}
            </option>
          ))}
        </select>
        <Toggle checked={filters.nonzero} onChange={(v) => setFilter({ nonzero: v })} label="إخفاء الأرصدة الصفرية" />
      </div>

      {loading && !result ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyBlock icon={Scale} text="لا توجد أرصدة مطابقة. تبدأ الأرصدة بإدخال رصيد أول المدة." />
      ) : (
        <div className={`bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                <th className="text-right p-4">المخزن</th>
                <th className="text-right p-4">الكود</th>
                <th className="text-right p-4">الصنف</th>
                <th className="text-right p-4">الرصيد</th>
                <th className="text-right p-4">متوسط التكلفة</th>
                <th className="text-right p-4">القيمة (₪)</th>
                <th className="text-right p-4">مخزون الأمان</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const negative = Number(r.quantity) < 0;
                return (
                  <tr
                    key={`${r.warehouse_id}-${r.stock_item_id}`}
                    onClick={() => openKardex(r)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openKardex(r)}
                    tabIndex={0}
                    role="link"
                    aria-label={`سجل حركة ${r.name} في ${r.warehouse_name}`}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer focus:outline-none focus:bg-white/[0.05]"
                  >
                    <td className="p-4 text-slate-400">{r.warehouse_name}</td>
                    <td className="p-4">
                      <bdi className="font-mono text-xs text-slate-400">{r.code}</bdi>
                    </td>
                    <td className="p-4 font-bold text-white">{r.name}</td>
                    <td className={`p-4 font-bold tabular-nums ${negative ? "text-red-400" : "text-white"}`}>
                      {fmtNum(r.quantity)} <span className="text-xs text-slate-500 font-semibold">{r.base_unit}</span>
                    </td>
                    <td className="p-4 text-slate-300 tabular-nums">{fmtNum(r.avg_cost, 4)}</td>
                    <td className="p-4 text-slate-300 tabular-nums">{fmtNum(r.value, 2)}</td>
                    <td className="p-4">
                      {r.below_safety ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/15 text-amber-300 whitespace-nowrap">
                          <AlertTriangle size={11} /> تحت الحد ({fmtNum(r.safety_stock)})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 tabular-nums">{fmtNum(r.safety_stock)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {result && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-500 font-bold">
            {result.total} رصيد — قيمة الصفحة {fmtNum(pageValue, 2)} ₪
            {result.last_page > 1 && ` — صفحة ${result.current_page} من ${result.last_page}`}
          </span>
          {result.last_page > 1 && (
            <div className="flex gap-1.5">
              <IconButton label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                <ChevronRight size={16} />
              </IconButton>
              <IconButton label="الصفحة التالية" disabled={page >= result.last_page || loading} onClick={() => setPage((p) => p + 1)}>
                <ChevronLeft size={16} />
              </IconButton>
            </div>
          )}
        </div>
      )}

      {openingOpen && (
        <OpeningBalanceModal
          warehouses={warehouses}
          defaultWarehouseId={filters.warehouseId ? Number(filters.warehouseId) : undefined}
          onClose={() => setOpeningOpen(false)}
          onSaved={() => {
            setOpeningOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
};
