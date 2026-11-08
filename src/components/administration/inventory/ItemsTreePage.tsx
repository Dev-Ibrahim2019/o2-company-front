/**
 * ItemsTreePage.tsx — "شجرة الأصناف" (/inventory/items/tree) ببنية شاشة الأمين: لوحة جانبية بالتصنيفات،
 * وجدول الأصناف للتصنيف المختار وكل ما تحته. الكمية = الرصيد الإجمالي في مخازن المستخدم بالوحدة الأساسية،
 * وسعر البيع من قائمة الطعام للصنف المرتبط (نطاق إن اختلف بين الفروع). الصنف الموقوف بلون مميز.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Boxes, ChevronLeft, ChevronRight, FolderTree, History, LogOut, Pencil, Plus, Printer, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  inventoryErrorMessage,
  inventoryService,
  type InventoryLookups,
  type Paginated,
  type StockCategory,
  type StockItem,
} from "../../../services/inventoryService";
import { DocToolbar, type ToolbarItem } from "./DocToolbar";
import { StockItemFormModal } from "./StockItemFormModal";
import { printReport } from "./printReport";
import { EmptyBlock, Field, IconButton, LoadingBlock, inputClass } from "./ui";

const PER_PAGE = 100;
const qty = (v: string | number | undefined | null) => Number(v ?? 0).toLocaleString("en-US", { maximumFractionDigits: 3 });

const salePrice = (it: StockItem) => {
  if (it.sale_price_min === null || it.sale_price_min === undefined) return "";
  const min = Number(it.sale_price_min);
  const max = Number(it.sale_price_max ?? min);
  return min === max ? qty(min) : `${qty(min)} – ${qty(max)}`;
};

const STATUS_LABEL: Record<string, string> = { "1": "نشط", "0": "موقوف", all: "الكل" };

export const ItemsTreePage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const legacyManage = useCan(INVENTORY_PERMISSIONS.ITEMS_MANAGE);
  const canCreate = useCan(INVENTORY_PERMISSIONS.ITEMS_CREATE) || legacyManage;
  const canEdit = useCan(INVENTORY_PERMISSIONS.ITEMS_EDIT) || legacyManage;
  const canDelete = useCan(INVENTORY_PERMISSIONS.ITEMS_DELETE) || legacyManage;

  const [lookups, setLookups] = useState<InventoryLookups | null>(null);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [result, setResult] = useState<Paginated<StockItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState<number | null | undefined>(undefined);
  const [printing, setPrinting] = useState(false);
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const categoryId = params.get("cat") ?? "";
  const subId = params.get("sub") ?? "";
  const status = params.get("status") ?? "1";
  const q = params.get("q") ?? "";

  const setParam = (patch: Record<string, string>) => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        return next;
      },
      { replace: true },
    );
    setPage(1);
    setSelected(0);
  };

  const loadCategories = useCallback(() => {
    inventoryService
      .categories()
      .then(setCategories)
      .catch((e) => toast.error("تعذّر تحميل التصنيفات", inventoryErrorMessage(e)));
  }, []);

  useEffect(() => {
    inventoryService.lookups().then(setLookups).catch((e) => toast.error("تعذّر تحميل البيانات المرجعية", inventoryErrorMessage(e)));
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const t = setTimeout(() => searchInput.trim() !== q && setParam({ q: searchInput.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const children = useMemo(() => {
    const map = new Map<number | null, StockCategory[]>();
    const ids = new Set(categories.map((c) => c.id));
    categories.forEach((c) => {
      const key = c.parent_id !== null && ids.has(c.parent_id) ? c.parent_id : null;
      map.set(key, [...(map.get(key) ?? []), c]);
    });
    return map;
  }, [categories]);
  const catName = (id: string) => categories.find((c) => String(c.id) === id)?.name ?? "";
  const subOptions = categoryId ? children.get(Number(categoryId)) ?? [] : [];

  const query = useCallback(
    (p: number, perPage = PER_PAGE) =>
      inventoryService.items({
        page: p,
        per_page: perPage,
        with_stock: 1,
        sort: "code",
        category_id: subId || categoryId || undefined,
        category_tree: subId || categoryId ? 1 : undefined,
        is_active: status === "all" ? undefined : Number(status),
        search: q || undefined,
      }),
    [categoryId, subId, status, q],
  );

  const load = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const data = await query(page);
      if (n !== seq.current) return;
      setResult(data);
      setSelected((s) => Math.min(s, Math.max(data.data.length - 1, 0)));
    } catch (e) {
      if (n === seq.current) toast.error("تعذّر تحميل الأصناف", inventoryErrorMessage(e));
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  // مرجع ثابت: نموذج الصنف يعيد التحميل إن تغيّر onClose (فيضيع ما كُتب).
  const closeForm = useCallback(() => setEditing(undefined), []);

  const rows = result?.data ?? [];
  const current = rows[selected] ?? null;
  const offset = ((result?.current_page ?? 1) - 1) * PER_PAGE;

  const select = (i: number) => {
    const idx = Math.max(0, Math.min(i, rows.length - 1));
    setSelected(idx);
    tableRef.current?.querySelector<HTMLElement>(`[data-index="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const remove = async () => {
    if (!current || !window.confirm(`حذف الصنف "${current.name}"؟ (الصنف الذي له حركات لا يُحذف — يُوقف من التعديل)`)) return;
    try {
      await inventoryService.deleteItem(current.id);
      toast.success("تم حذف الصنف");
      load();
      loadCategories();
    } catch (e) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(e));
    }
  };

  const printIndex = async () => {
    setPrinting(true);
    try {
      const all: StockItem[] = [];
      let p = 1;
      let last = 1;
      do {
        const r = await query(p, 200);
        all.push(...r.data);
        last = r.last_page;
        p++;
      } while (p <= last && p <= 25);
      printReport({
        title: "فهرس الأصناف",
        filters: [
          ["التصنيف", catName(subId || categoryId) || "الكل"],
          ["الحالة", STATUS_LABEL[status] ?? "الكل"],
          ...(q ? ([["بحث", q]] as [string, string][]) : []),
        ],
        columns: [{ label: "م", num: true }, { label: "رقم الصنف" }, { label: "الباركود" }, { label: "اسم الصنف" }, { label: "الوحدة" }, { label: "التصنيف" }, { label: "الكمية", num: true }, { label: "سعر البيع", num: true }, { label: "الحالة" }],
        rows: all.map((it, i) => [
          i + 1,
          it.code,
          it.barcode,
          it.name,
          it.base_unit?.name,
          it.categories?.map((c) => c.name).join("، "),
          it.is_stored ? qty(it.total_quantity) : null,
          salePrice(it) || null,
          it.is_active ? "نشط" : "موقوف",
        ]),
        totals: [["عدد الأصناف", String(result?.total ?? all.length)]],
        landscape: true,
      });
    } catch (e) {
      toast.error("تعذّرت طباعة الفهرس", inventoryErrorMessage(e));
    } finally {
      setPrinting(false);
    }
  };

  const items: ToolbarItem[] = [
    { id: "new", label: "جديد", icon: Plus, keys: "F3", tone: "primary", hidden: !canCreate, disabled: !lookups, onClick: () => setEditing(null) },
    { id: "edit", label: "تعديل", icon: Pencil, keys: "F11", hidden: !canEdit, disabled: !current || !lookups, onClick: () => current && setEditing(current.id) },
    { id: "delete", label: "حذف", icon: Trash2, keys: "F4", tone: "danger", hidden: !canDelete, disabled: !current, onClick: remove },
    "sep",
    { id: "print", label: "طباعة الفهرس", icon: Printer, keys: "Ctrl+P", disabled: rows.length === 0, loading: printing, onClick: printIndex },
    { id: "kardex", label: "مراجعة حركات الصنف", icon: History, keys: "F7", disabled: !current?.is_stored, onClick: () => current && navigate(`/inventory/kardex?stock_item_id=${current.id}`) },
    "sep",
    { id: "search", label: "بحث", icon: Search, keys: "Ctrl+F", onClick: () => searchRef.current?.focus() },
    {
      id: "reload",
      label: "إعادة تحميل",
      icon: RefreshCw,
      keys: "F8",
      onClick: () => {
        load();
        loadCategories();
      },
    },
    { id: "exit", label: "خروج", icon: LogOut, keys: "Esc", onClick: () => navigate("/inventory/dashboard") },
  ];

  const onTableKey = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      select(selected + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter" && current && canEdit) {
      e.preventDefault();
      setEditing(current.id);
    }
  };

  const renderTree = (parent: number | null, depth: number): React.ReactNode =>
    (children.get(parent) ?? []).map((c) => {
      const active = String(c.id) === categoryId;
      return (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => setParam({ cat: String(c.id), sub: "" })}
            aria-current={active ? "true" : undefined}
            className={`w-full flex items-center justify-between gap-2 py-1.5 rounded-lg text-right text-sm transition-colors ${
              active ? "bg-red-600 text-white font-black" : c.is_active ? "text-slate-300 hover:bg-white/5" : "text-slate-500 hover:bg-white/5"
            }`}
            style={{ paddingInlineStart: `${0.5 + depth * 0.9}rem`, paddingInlineEnd: "0.5rem" }}
          >
            <span className="truncate">{c.name}</span>
            {c.items_count !== undefined && <span className={`text-[11px] tabular-nums ${active ? "text-white/80" : "text-slate-500"}`}>{c.items_count}</span>}
          </button>
          {(children.get(c.id)?.length ?? 0) > 0 && <ul>{renderTree(c.id, depth + 1)}</ul>}
        </li>
      );
    });

  return (
    <div className="space-y-4" dir="rtl">
      <DocToolbar items={items} shortcutsEnabled={editing === undefined} title="شجرة الأصناف" />

      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-4 pt-2">
        <aside aria-label="التصنيفات" className="bg-slate-900 border border-white/5 rounded-2xl p-2 max-h-56 lg:max-h-[72vh] overflow-y-auto custom-scrollbar">
          <p className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-black text-slate-500">
            <FolderTree size={13} /> التصنيفات
          </p>
          <ul>
            <li>
              <button
                type="button"
                onClick={() => setParam({ cat: "", sub: "" })}
                className={`w-full text-right px-2 py-1.5 rounded-lg text-sm ${!categoryId ? "bg-red-600 text-white font-black" : "text-slate-300 hover:bg-white/5"}`}
              >
                كل الأصناف
              </button>
            </li>
            {renderTree(null, 0)}
          </ul>
        </aside>

        <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="التصنيف الفرعي">
              <select className={inputClass} value={subId} disabled={subOptions.length === 0} onChange={(e) => setParam({ sub: e.target.value })}>
                <option value="">{categoryId ? `كل ما تحت "${catName(categoryId)}"` : "اختر تصنيفاً من الشجرة"}</option>
                {subOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الحالة">
              <select className={inputClass} value={status} onChange={(e) => setParam({ status: e.target.value })}>
                <option value="1">نشط</option>
                <option value="0">موقوف</option>
                <option value="all">الكل</option>
              </select>
            </Field>
            <Field label="بحث">
              <input
                ref={searchRef}
                className={inputClass}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && searchInput) {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearchInput("");
                  } else if (e.key === "Enter" || e.key === "ArrowDown") {
                    e.preventDefault();
                    tableRef.current?.focus();
                  }
                }}
                placeholder="رقم الصنف أو اسمه أو الباركود..."
              />
            </Field>
          </div>

          {loading && !result ? (
            <LoadingBlock />
          ) : rows.length === 0 ? (
            <EmptyBlock icon={Boxes} text="لا توجد أصناف في هذا التصنيف" />
          ) : (
            <div
              ref={tableRef}
              tabIndex={0}
              onKeyDown={onTableKey}
              aria-label="جدول الأصناف — الأسهم للاختيار وEnter للتعديل"
              className={`rounded-xl border border-white/10 overflow-auto custom-scrollbar max-h-[62vh] bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-opacity ${loading ? "opacity-60" : ""}`}
            >
              <table className="w-full border-collapse text-sm min-w-[860px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {["م", "رقم الصنف", "الباركود", "اسم الصنف", "الوحدة", "التصنيف", "الكمية", "سعر البيع"].map((h) => (
                      <th key={h} scope="col" className="bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 text-right whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((it, i) => (
                    <tr
                      key={it.id}
                      data-index={i}
                      aria-selected={i === selected}
                      onClick={() => setSelected(i)}
                      onDoubleClick={() => canEdit && setEditing(it.id)}
                      className={`cursor-pointer ${i === selected ? "bg-red-600/15" : "hover:bg-white/5"}`}
                    >
                      <td className="border border-white/10 px-2 py-1.5 text-slate-500 tabular-nums">{offset + i + 1}</td>
                      <td className="border border-white/10 px-2 py-1.5">
                        <bdi className="font-mono text-xs text-slate-300">{it.code}</bdi>
                      </td>
                      <td className="border border-white/10 px-2 py-1.5">
                        <bdi className="font-mono text-xs text-slate-400">{it.barcode ?? ""}</bdi>
                      </td>
                      <td className={`border border-white/10 px-2 py-1.5 font-bold ${it.is_active ? "text-white" : "text-amber-300/80"}`}>
                        {it.name}
                        {!it.is_active && <span className="mr-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/15 text-amber-300">موقوف</span>}
                      </td>
                      <td className="border border-white/10 px-2 py-1.5 text-slate-300">{it.base_unit?.name}</td>
                      <td className="border border-white/10 px-2 py-1.5 text-slate-400 text-xs">{it.categories?.map((c) => c.name).join("، ")}</td>
                      <td className={`border border-white/10 px-2 py-1.5 tabular-nums text-left ${it.is_stored && Number(it.total_quantity ?? 0) < Number(it.safety_stock) ? "text-amber-300 font-bold" : "text-slate-200"}`}>
                        {it.is_stored ? qty(it.total_quantity) : "—"}
                      </td>
                      <td className="border border-white/10 px-2 py-1.5 tabular-nums text-left text-slate-300">{salePrice(it)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-2.5 bg-slate-950/95 backdrop-blur border-t border-white/5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold text-slate-400">
        <span>
          عدد الأصناف: <span className="text-white tabular-nums">{result?.total ?? 0}</span>
        </span>
        {categoryId && (
          <span>
            التصنيف: <span className="text-white">{catName(subId || categoryId)}</span>
          </span>
        )}
        {result && result.last_page > 1 && (
          <span className="flex items-center gap-1.5 mr-auto">
            <span className="text-xs">
              صفحة {result.current_page} من {result.last_page}
            </span>
            <IconButton label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight size={16} />
            </IconButton>
            <IconButton label="الصفحة التالية" disabled={page >= result.last_page || loading} onClick={() => setPage((p) => p + 1)}>
              <ChevronLeft size={16} />
            </IconButton>
          </span>
        )}
      </div>

      {editing !== undefined && lookups && (
        <StockItemFormModal
          lookups={lookups}
          itemId={editing}
          onClose={closeForm}
          onSaved={() => {
            setEditing(undefined);
            load();
            loadCategories();
          }}
        />
      )}
    </div>
  );
};
