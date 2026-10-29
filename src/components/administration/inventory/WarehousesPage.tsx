/**
 * WarehousesPage.tsx — المخازن وربط المستخدمين بها.
 *
 * القائمة تعرض فقط المخازن المسموحة للمستخدم (الخادم يفلتر: ربط warehouse_user أو
 * inventory.warehouses.all أو super-admin). قواعد الخادم (WarehouseService):
 *  - مخزن بيع افتراضي واحد لكل فرع؛ تعيين مخزن افتراضياً يُلغي السابق تلقائياً.
 *  - مخزن "قيد النقل" واحد فقط في النظام، بلا فرع ولا يكون افتراضياً.
 *  - المخزن الافتراضي لا يُوقَف ولا يُحذف؛ ومخزن له حركات لا يُحذف ولا يتغيّر نوعه أو فرعه.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon, Users, Star, Truck, Loader2, CheckSquare, Square } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import { departmentService, type Department } from "../../../services/departmentService";
import {
  inventoryService,
  inventoryErrorMessage,
  type InventoryLookups,
  type Warehouse,
  type WarehouseRole,
  type WarehouseUser,
  WAREHOUSE_ROLES,
} from "../../../services/inventoryService";
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
  StatusBadge,
  Toggle,
  inputClass,
} from "./ui";

interface Draft {
  id?: number;
  name: string;
  code: string;
  type: Warehouse["type"];
  branch_id: number | "";
  department_id: number | "";
  role: WarehouseRole;
  is_default_sales: boolean;
  is_active: boolean;
  notes: string;
}

const EMPTY: Draft = { name: "", code: "", type: "standard", branch_id: "", department_id: "", role: "department", is_default_sales: false, is_active: true, notes: "" };

export const WarehousesPage: React.FC = () => {
  const canManage = useCan(INVENTORY_PERMISSIONS.WAREHOUSES_MANAGE);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<InventoryLookups["branches"]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    departmentService.getAll().then(setDepartments).catch(() => undefined);
  }, []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [usersOf, setUsersOf] = useState<Warehouse | null>(null);

  const load = useCallback(async () => {
    try {
      setWarehouses(await inventoryService.warehouses());
    } catch (e) {
      toast.error("تعذّر تحميل المخازن", inventoryErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    inventoryService
      .lookups()
      .then((l) => setBranches(l.branches))
      .catch((e) => toast.error("تعذّر تحميل الفروع", inventoryErrorMessage(e)));
  }, [load]);

  const transitExists = warehouses.some((w) => w.type === "transit" && w.id !== draft?.id);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (draft.type === "standard" && draft.branch_id === "") {
      toast.warning("اختر الفرع الذي يتبعه المخزن");
      return;
    }
    const transit = draft.type === "transit";
    const payload: Partial<Warehouse> = {
      name: draft.name.trim(),
      code: draft.code.trim(),
      type: draft.type,
      branch_id: transit ? null : Number(draft.branch_id),
      department_id: transit || draft.department_id === "" ? null : draft.department_id,
      role: draft.role,
      is_default_sales: transit ? false : draft.is_default_sales,
      is_active: draft.is_active,
      notes: draft.notes.trim() || null,
    };
    setSaving(true);
    try {
      if (draft.id) await inventoryService.updateWarehouse(draft.id, payload);
      else await inventoryService.createWarehouse(payload);
      toast.success(draft.id ? "تم تحديث المخزن" : "تمت إضافة المخزن");
      setDraft(null);
      load();
    } catch (err) {
      toast.error("تعذّر الحفظ", inventoryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (w: Warehouse) => {
    if (!confirm(`حذف المخزن "${w.name}"؟`)) return;
    try {
      await inventoryService.deleteWarehouse(w.id);
      toast.success("تم حذف المخزن");
      load();
    } catch (err) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(err));
    }
  };

  const edit = (w: Warehouse) =>
    setDraft({
      id: w.id,
      name: w.name,
      code: w.code,
      type: w.type,
      branch_id: w.branch_id ?? "",
      department_id: w.department_id ?? "",
      role: w.role ?? "department",
      is_default_sales: w.is_default_sales,
      is_active: w.is_active,
      notes: w.notes ?? "",
    });

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="المخازن"
        subtitle="مخازن الفروع ومخزن البيع الافتراضي لكل فرع. تظهر هنا المخازن المسموح لك بها فقط."
        action={
          canManage && (
            <PrimaryButton onClick={() => setDraft({ ...EMPTY })}>
              <Plus size={18} /> مخزن جديد
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : warehouses.length === 0 ? (
        <EmptyBlock icon={WarehouseIcon} text="لا توجد مخازن متاحة لك" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div
              key={w.id}
              className="bg-slate-900 rounded-2xl border border-white/5 p-5 space-y-4 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      w.type === "transit" ? "bg-sky-500/15 text-sky-300" : "bg-red-600/20 text-red-400"
                    }`}
                  >
                    {w.type === "transit" ? <Truck size={18} /> : <WarehouseIcon size={18} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-black truncate">{w.name}</h3>
                    <p className="text-slate-500 text-xs font-semibold">
                      <bdi className="font-mono">{w.code}</bdi> · {w.type === "transit" ? "قيد النقل" : w.branch?.name ?? "—"}
                    </p>
                  </div>
                </div>
                <StatusBadge active={w.is_active} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {w.is_default_sales && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/15 text-amber-300">
                    <Star size={11} /> مخزن البيع الافتراضي
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-800 text-slate-400">
                  <Users size={11} /> {w.users_count ?? 0} مستخدم
                </span>
              </div>

              {canManage && (
                <div className="flex gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setUsersOf(w)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                  >
                    <Users size={14} /> المستخدمون
                  </button>
                  <div className="flex-1" />
                  <IconButton label="تعديل" onClick={() => edit(w)}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton label="حذف" tone="danger" onClick={() => remove(w)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? "تعديل مخزن" : "مخزن جديد"}
          onClose={() => setDraft(null)}
          footer={
            <>
              <SecondaryButton onClick={() => setDraft(null)}>إلغاء</SecondaryButton>
              <PrimaryButton type="submit" form="warehouse-form" loading={saving}>
                حفظ
              </PrimaryButton>
            </>
          }
        >
          <form id="warehouse-form" onSubmit={save} className="space-y-4">
            <fieldset>
              <legend className="text-xs font-black text-slate-400 tracking-wider mb-1.5">نوع المخزن</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["standard", "مخزن فرع"],
                    ["transit", "قيد النقل"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={draft.type === value}
                    disabled={value === "transit" && transitExists}
                    title={value === "transit" && transitExists ? "يوجد مخزن قيد النقل مسبقاً" : undefined}
                    onClick={() => setDraft({ ...draft, type: value })}
                    className={`p-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      draft.type === value
                        ? "bg-red-600/20 text-red-300 border-red-600/40"
                        : "bg-slate-800 text-slate-400 border-white/5 hover:border-white/15"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draft.type === "transit" && (
                <p className="text-[11px] text-slate-500 font-semibold mt-1.5">
                  مخزن وسيط للبضاعة أثناء التحويل بين الفروع. واحد فقط في النظام، لا يتبع فرعاً.
                </p>
              )}
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="اسم المخزن" required>
                <input
                  className={inputClass}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  required
                  autoFocus
                />
              </Field>
              <Field label="الكود" required>
                <input
                  className={inputClass}
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  required
                  dir="ltr"
                />
              </Field>
            </div>

            {draft.type === "standard" && (
              <>
                <Field label="الفرع" required>
                  <select
                    className={inputClass}
                    value={draft.branch_id}
                    onChange={(e) => setDraft({ ...draft, branch_id: e.target.value ? Number(e.target.value) : "" })}
                    required
                  >
                    <option value="">— اختر الفرع —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="القسم المرتبط" hint="مبيعات هذا القسم في الفرع تُنسب لمخزن القسم في الاستهلاك النظري (مثل: قسم الشاورما).">
                  <select
                    className={inputClass}
                    value={draft.department_id}
                    onChange={(e) => setDraft({ ...draft, department_id: e.target.value ? Number(e.target.value) : "" })}
                  >
                    <option value="">— بلا قسم —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nameAr || d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {draft.department_id !== "" && (
                  <Field label="دور المخزن في القسم" hint="القسم الواحد قد يملك مخزن مواد مصنع ومخزن منتجات ومعرضاً في الفرع نفسه.">
                    <select className={inputClass} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as WarehouseRole })}>
                      {(Object.keys(WAREHOUSE_ROLES) as WarehouseRole[]).map((r) => (
                        <option key={r} value={r}>
                          {WAREHOUSE_ROLES[r]}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <div className="space-y-1">
                  <Toggle
                    checked={draft.is_default_sales}
                    onChange={(v) => setDraft({ ...draft, is_default_sales: v, is_active: v ? true : draft.is_active })}
                    label="مخزن البيع الافتراضي للفرع"
                  />
                  <p className="text-[11px] text-slate-500 font-semibold">
                    منه تُصرف مكوّنات المبيعات لاحقاً. تعيينه يلغي المخزن الافتراضي السابق لنفس الفرع.
                  </p>
                </div>
              </>
            )}

            <Toggle
              checked={draft.is_active}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
              disabled={draft.type === "standard" && draft.is_default_sales}
              label={draft.type === "standard" && draft.is_default_sales ? "نشط (المخزن الافتراضي لا يُوقَف)" : "نشط"}
            />

            <Field label="ملاحظات">
              <textarea
                className={`${inputClass} min-h-[70px]`}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>
          </form>
        </Modal>
      )}

      {usersOf && (
        <WarehouseUsersModal
          warehouse={usersOf}
          onClose={() => setUsersOf(null)}
          onSaved={() => {
            setUsersOf(null);
            load();
          }}
        />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
 *  ربط المستخدمين بالمخزن
 * ══════════════════════════════════════════════════════════════ */

const WarehouseUsersModal: React.FC<{ warehouse: Warehouse; onClose: () => void; onSaved: () => void }> = ({
  warehouse,
  onClose,
  onSaved,
}) => {
  const [users, setUsers] = useState<WarehouseUser[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // مستوى صلاحية كل مستخدم على المخزن (= القسم في الفرع): مشاهدة فقط، أو مشاهدة وتعديل.
  const [levels, setLevels] = useState<Record<number, "view" | "edit">>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    inventoryService
      .warehouseUsers(warehouse.id)
      .then((list) => {
        if (cancelled) return;
        setUsers(list);
        setSelected(new Set(list.filter((u) => u.assigned).map((u) => u.id)));
        setLevels(Object.fromEntries(list.filter((u) => u.assigned).map((u) => [u.id, u.access_level ?? "edit"])));
      })
      .catch((e) => !cancelled && toast.error("تعذّر تحميل المستخدمين", inventoryErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [warehouse.id]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
  }, [users, search]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      await inventoryService.syncWarehouseUsers(warehouse.id, Array.from(selected), levels);
      toast.success("تم تحديث مستخدمي المخزن");
      onSaved();
    } catch (err) {
      toast.error("تعذّر الحفظ", inventoryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`مستخدمو مخزن: ${warehouse.name}`}
      onClose={onClose}
      footer={
        <>
          <span className="text-xs text-slate-500 font-bold self-center ml-auto">{selected.size} محدد</span>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton onClick={save} loading={saving} disabled={loading}>
            حفظ
          </PrimaryButton>
        </>
      }
    >
      <p className="text-xs text-slate-500 font-semibold">
        المستخدم المربوط يرى هذا المخزن ويعمل عليه. مدير النظام ومن يملك صلاحية "الوصول لكل المخازن" لا يحتاجون ربطاً.
      </p>
      <SearchBox value={search} onChange={setSearch} placeholder="بحث بالاسم أو اسم المستخدم..." />
      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 size={28} className="text-red-500 animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 divide-y divide-white/5 max-h-[45vh] overflow-y-auto custom-scrollbar">
          {visible.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 font-bold text-center">لا يوجد مستخدمون مطابقون</p>
          ) : (
            visible.map((u) => {
              const on = selected.has(u.id);
              return (
                <div key={u.id} className={`flex items-center gap-2 pl-3 ${on ? "bg-green-600/10" : ""}`}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(u.id)}
                    className={`flex-1 flex items-center gap-3 p-3 text-right transition-colors ${on ? "" : "hover:bg-white/[0.03]"}`}
                  >
                    {on ? <CheckSquare size={18} className="text-green-400 shrink-0" /> : <Square size={18} className="text-slate-600 shrink-0" />}
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-white truncate">{u.name}</span>
                      <span className="block text-[11px] text-slate-500 font-semibold">
                        <bdi>{u.username}</bdi>
                        {u.branch ? ` · ${u.branch}` : ""}
                      </span>
                    </span>
                  </button>
                  {on && (
                    <select
                      className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                      value={levels[u.id] ?? "edit"}
                      onChange={(e) => setLevels((l) => ({ ...l, [u.id]: e.target.value as "view" | "edit" }))}
                      aria-label={`مستوى ${u.name}`}
                    >
                      <option value="edit">مشاهدة وتعديل</option>
                      <option value="view">مشاهدة فقط</option>
                    </select>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </Modal>
  );
};
