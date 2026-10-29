/**
 * StockItemsPage.tsx — قائمة الأصناف المخزنية مع الفلترة والترقيم.
 * الحذف مرفوض من الخادم لصنف له حركات؛ عندها تُعرض رسالة الخادم ويُقترح الإيقاف.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Boxes, Link2, ChevronRight, ChevronLeft, Truck } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  inventoryService,
  inventoryErrorMessage,
  STOCK_ITEM_TYPE_LABELS,
  type InventoryLookups,
  type Paginated,
  type StockItem,
} from "../../../services/inventoryService";
import { flattenTree } from "./CategoriesPage";
import { StockItemFormModal } from "./StockItemFormModal";
import { ItemSuppliersModal } from "./ItemSuppliersModal";
import { EmptyBlock, IconButton, LoadingBlock, PageHeader, PrimaryButton, SearchBox, StatusBadge, inputClass } from "./ui";

const TYPE_STYLES: Record<StockItem["type"], string> = {
  raw: "bg-amber-500/15 text-amber-300",
  intermediate: "bg-sky-500/15 text-sky-300",
  finished: "bg-green-600/15 text-green-300",
  non_stock: "bg-slate-700 text-slate-300",
};

const qty = (v: string | number) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 3 });

interface Filters {
  search: string;
  type: string;
  categoryId: string;
  status: string;
}

export const StockItemsPage: React.FC = () => {
  // الصلاحيات المفصّلة، و items.manage القديمة تبقى تمنح الثلاث (مثل الخادم)
  const legacyManage = useCan(INVENTORY_PERMISSIONS.ITEMS_MANAGE);
  const canCreate = useCan(INVENTORY_PERMISSIONS.ITEMS_CREATE) || legacyManage;
  const canEdit = useCan(INVENTORY_PERMISSIONS.ITEMS_EDIT) || legacyManage;
  const canDelete = useCan(INVENTORY_PERMISSIONS.ITEMS_DELETE) || legacyManage;
  const [lookups, setLookups] = useState<InventoryLookups | null>(null);
  const [result, setResult] = useState<Paginated<StockItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<Filters>({ search: "", type: "", categoryId: "", status: "" });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<number | null | undefined>(undefined); // undefined = مغلق، null = جديد
  const [suppliersOf, setSuppliersOf] = useState<StockItem | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    inventoryService
      .lookups()
      .then(setLookups)
      .catch((e) => toast.error("تعذّر تحميل البيانات المرجعية", inventoryErrorMessage(e)));
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
      const data = await inventoryService.items({
        page,
        per_page: 25,
        search: filters.search || undefined,
        type: filters.type || undefined,
        category_id: filters.categoryId || undefined,
        is_active: filters.status === "" ? undefined : Number(filters.status),
      });
      if (seq === requestSeq.current) setResult(data);
    } catch (e) {
      if (seq === requestSeq.current) toast.error("تعذّر تحميل الأصناف", inventoryErrorMessage(e));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryTree = useMemo(() => flattenTree(lookups?.categories ?? []), [lookups]);

  const closeForm = useCallback(() => setEditing(undefined), []);
  const onSaved = useCallback(() => {
    setEditing(undefined);
    load();
  }, [load]);

  const remove = async (it: StockItem) => {
    if (!confirm(`حذف الصنف "${it.name}"؟`)) return;
    try {
      await inventoryService.deleteItem(it.id);
      toast.success("تم حذف الصنف");
      load();
    } catch (err) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(err));
    }
  };

  const items = result?.data ?? [];
  const filtered = Boolean(filters.search || filters.type || filters.categoryId || filters.status);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الأصناف المخزنية"
        subtitle="المواد الخام والمنتجات الوسيطة والنهائية، ووحداتها وتصنيفاتها."
        action={
          canCreate && (
            <PrimaryButton onClick={() => setEditing(null)} disabled={!lookups}>
              <Plus size={18} /> صنف جديد
            </PrimaryButton>
          )
        }
      />

      {/* ── الفلاتر ── */}
      <div className="flex flex-wrap gap-3">
        <SearchBox value={searchInput} onChange={setSearchInput} placeholder="بحث بالاسم أو الكود أو الباركود..." />
        <select
          className={`${inputClass} !w-auto`}
          value={filters.type}
          onChange={(e) => setFilter({ type: e.target.value })}
          aria-label="النوع"
        >
          <option value="">كل الأنواع</option>
          {Object.entries(STOCK_ITEM_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
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
        <select
          className={`${inputClass} !w-auto`}
          value={filters.status}
          onChange={(e) => setFilter({ status: e.target.value })}
          aria-label="الحالة"
        >
          <option value="">كل الحالات</option>
          <option value="1">نشط</option>
          <option value="0">موقوف</option>
        </select>
      </div>

      {loading && !result ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyBlock icon={Boxes} text={filtered ? "لا توجد أصناف مطابقة" : "لا توجد أصناف مخزنية بعد"} />
      ) : (
        <div className={`bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                <th className="text-right p-4">الكود</th>
                <th className="text-right p-4">الصنف</th>
                <th className="text-right p-4">النوع</th>
                <th className="text-right p-4">الوحدة الأساسية</th>
                <th className="text-right p-4">التصنيفات</th>
                <th className="text-right p-4">مخزون الأمان</th>
                <th className="text-right p-4">الحالة</th>
                <th className="p-4 w-32">
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <bdi className="font-mono text-xs text-slate-400">{it.code}</bdi>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-white">{it.name}</p>
                    {it.item && (
                      <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                        <Link2 size={11} /> {it.item.name_ar || it.item.name}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-black whitespace-nowrap ${TYPE_STYLES[it.type]}`}>
                      {STOCK_ITEM_TYPE_LABELS[it.type]}
                    </span>
                  </td>
                  <td className="p-4 text-slate-300">{it.base_unit?.name ?? "—"}</td>
                  <td className="p-4 text-slate-400 text-xs">{it.categories?.map((c) => c.name).join("، ") || "—"}</td>
                  <td className="p-4 text-slate-300 tabular-nums">{it.is_stored ? qty(it.safety_stock) : "—"}</td>
                  <td className="p-4">
                    <StatusBadge active={it.is_active} />
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1.5 justify-end">
                      {it.is_stored && (
                        <IconButton label="الموردون" onClick={() => setSuppliersOf(it)}>
                          <Truck size={15} />
                        </IconButton>
                      )}
                      {canEdit && (
                        <IconButton label="تعديل" onClick={() => setEditing(it.id)} disabled={!lookups}>
                          <Pencil size={15} />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton label="حذف" tone="danger" onClick={() => remove(it)}>
                          <Trash2 size={15} />
                        </IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── الترقيم ── */}
      {result && result.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 font-bold">
            {result.total} صنف — صفحة {result.current_page} من {result.last_page}
          </span>
          <div className="flex gap-1.5">
            <IconButton label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight size={16} />
            </IconButton>
            <IconButton
              label="الصفحة التالية"
              disabled={page >= result.last_page || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronLeft size={16} />
            </IconButton>
          </div>
        </div>
      )}

      {editing !== undefined && lookups && (
        <StockItemFormModal lookups={lookups} itemId={editing} onClose={closeForm} onSaved={onSaved} />
      )}
      {suppliersOf && (
        <ItemSuppliersModal item={suppliersOf} onClose={() => setSuppliersOf(null)} />
      )}
    </div>
  );
};
