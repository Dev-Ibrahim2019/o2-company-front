/**
 * RolesPermissionsPage.tsx — إدارة الأدوار وصناعة مصفوفة الصلاحيات
 * ────────────────────────────────────────────────────────────────
 * القسم الأيسر: قائمة الأدوار (بطاقات قابلة للنقر + إضافة + حذف)
 * القسم الأيمن: مصفوفة الصلاحيات بـ Checkboxes مقسمة مجموعات
 */

import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { PERMISSIONS, ROLE_LABELS } from "../auth/permissions";
import { Can } from "../auth";
import {
  Shield,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  CheckSquare,
  Square,
  Users,
  Building2,
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  FileText,
  Settings,
  UserCog,
  Archive,
  Monitor,
} from "lucide-react";

/* ── Types ── */
interface Role {
  id: number;
  name: string;
  permissions: string[];
}

interface Permission {
  id: number;
  name: string;
}

/* ── تنظيم الصلاحيات في مجموعات ── */
const PERMISSION_GROUPS: { title: string; icon: React.ElementType; items: string[] }[] = [
  {
    title: "الأفراع والأقسام",
    icon: Building2,
    items: [PERMISSIONS.MANAGE_BRANCHES, PERMISSIONS.MANAGE_DEPARTMENTS],
  },
  {
    title: "الأصناف والطلبات",
    icon: Package,
    items: [PERMISSIONS.MANAGE_ITEMS, PERMISSIONS.MANAGE_ORDERS, PERMISSIONS.VIEW_ORDERS],
  },
  {
    title: "الموظفين والمستخدمين",
    icon: Users,
    items: [PERMISSIONS.MANAGE_EMPLOYEES, PERMISSIONS.MANAGE_USERS],
  },
  {
    title: "المحاسبة والفواتير",
    icon: Receipt,
    items: [PERMISSIONS.VIEW_ACCOUNTING, PERMISSIONS.MANAGE_ACCOUNTING, PERMISSIONS.MANAGE_INVOICES],
  },
  {
    title: "العملاء والموردين",
    icon: Wallet,
    items: [PERMISSIONS.MANAGE_CUSTOMERS, PERMISSIONS.MANAGE_SUPPLIERS],
  },
  {
    title: "التقارير والأرشيف",
    icon: FileText,
    items: [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_AUDIT_LOG, PERMISSIONS.VIEW_ARCHIVE],
  },
  {
    title: "الإعدادات",
    icon: Settings,
    items: [PERMISSIONS.MANAGE_SETTINGS],
  },
  {
    title: "نقاط البيع وأجهزة الضيافة والقاعات",
    icon: Monitor,
    items: [PERMISSIONS.MANAGE_POS_REGISTERS, PERMISSIONS.ACCESS_POS_INTERFACE, PERMISSIONS.MANAGE_HOSPITALITY_DEVICES, PERMISSIONS.MANAGE_DINING_ZONES],
  },
];

const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.MANAGE_BRANCHES]: "إدارة الأفراع",
  [PERMISSIONS.MANAGE_DEPARTMENTS]: "إدارة الأقسام",
  [PERMISSIONS.MANAGE_ITEMS]: "إدارة الأصناف",
  [PERMISSIONS.MANAGE_EMPLOYEES]: "إدارة الموظفين",
  [PERMISSIONS.VIEW_ACCOUNTING]: "عرض المحاسبة",
  [PERMISSIONS.MANAGE_ACCOUNTING]: "إدارة المحاسبة",
  [PERMISSIONS.MANAGE_ORDERS]: "إدارة الطلبات",
  [PERMISSIONS.VIEW_ORDERS]: "عرض الطلبات",
  [PERMISSIONS.VIEW_REPORTS]: "عرض التقارير",
  [PERMISSIONS.MANAGE_SETTINGS]: "إدارة الإعدادات",
  [PERMISSIONS.VIEW_AUDIT_LOG]: "عرض سجل التدقيق",
  [PERMISSIONS.VIEW_ARCHIVE]: "عرض الأرشيف",
  [PERMISSIONS.MANAGE_CUSTOMERS]: "إدارة العملاء",
  [PERMISSIONS.MANAGE_SUPPLIERS]: "إدارة الموردين",
  [PERMISSIONS.MANAGE_INVOICES]: "إدارة الفواتير",
  [PERMISSIONS.MANAGE_USERS]: "إدارة المستخدمين",
  [PERMISSIONS.MANAGE_POS_REGISTERS]: "إدارة نقاط البيع",
  [PERMISSIONS.MANAGE_HOSPITALITY_DEVICES]: "إدارة أجهزة الضيافة",
  [PERMISSIONS.MANAGE_DINING_ZONES]: "إدارة القاعات والطاولات",
  [PERMISSIONS.ACCESS_POS_INTERFACE]: "الوصول لواجهة الكاشير",
};

const RolesPermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [checkedPermissions, setCheckedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  /* ── جلب البيانات ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get("/roles-list"),
        api.get("/permissions-list"),
      ]);
      setRoles(rolesRes.data.data || []);
      setPermissions(permsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── تحديد الدور ── */
  const selectRole = (role: Role) => {
    setSelectedRole(role);
    setCheckedPermissions(new Set(role.permissions));
    setError("");
    setSuccess("");
  };

  /* ── تبديل صلاحية ── */
  const togglePermission = (permName: string) => {
    setCheckedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permName)) next.delete(permName);
      else next.add(permName);
      return next;
    });
  };

  /* ── تحديد الكل / إلغاء تحديد الكل ── */
  const toggleAllInGroup = (items: string[]) => {
    setCheckedPermissions((prev) => {
      const next = new Set(prev);
      const allChecked = items.every((i) => next.has(i));
      items.forEach((i) => {
        if (allChecked) next.delete(i);
        else next.add(i);
      });
      return next;
    });
  };

  /* ── حفظ الصلاحيات ── */
  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setError("");
    try {
      const permArray = Array.from(checkedPermissions);
      const { data: res } = await api.put(`/roles/${selectedRole.id}/permissions`, {
        permissions: permArray,
      });
      // تحديث الحالة المحلية
      setRoles((prev) =>
        prev.map((r) => (r.id === selectedRole.id ? { ...r, permissions: permArray } : r))
      );
      setSelectedRole({ ...selectedRole, permissions: permArray });
      setSuccess("تم حفظ الصلاحيات بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  /* ── إضافة دور جديد ── */
  const addRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    setError("");
    try {
      const { data: res } = await api.post("/roles", { name: newRoleName.trim() });
      setRoles((prev) => [...prev, res.data]);
      setNewRoleName("");
      setShowAddModal(false);
      setSuccess("تم إنشاء الدور بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في إنشاء الدور");
    } finally {
      setAddingRole(false);
    }
  };

  /* ── حذف دور ── */
  const deleteRole = async (role: Role) => {
    if (role.name === "super-admin") return;
    if (!confirm(`هل أنت متأكد من حذف دور "${role.name}"؟`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (selectedRole?.id === role.id) {
        setSelectedRole(null);
        setCheckedPermissions(new Set());
      }
      setSuccess("تم حذف الدور بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في الحذف");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20" dir="rtl">
        <Loader2 size={40} className="text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── العنوان ── */}
      <div className="flex items-center gap-3">
        <Shield size={28} className="text-red-500" />
        <h1 className="text-2xl font-black text-white">إدارة الأدوار والصلاحيات</h1>
      </div>

      {/* ── رسائل ── */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-600/20 text-green-400 rounded-xl text-sm font-bold">
          <CheckCircle size={18} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-600/20 text-red-400 rounded-xl text-sm font-bold">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* ── المحتوى الرئيسي: قائمة الأدوار + مصفوفة الصلاحيات ── */}
      <div className="flex gap-6 flex-col lg:flex-row">

        {/* ── القسم الأيسر: قائمة الأدوار ── */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider">الأدوار</h2>
              <Can permission={PERMISSIONS.MANAGE_USERS}>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="p-1.5 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
                  title="إضافة دور جديد"
                >
                  <Plus size={16} />
                </button>
              </Can>
            </div>

            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => selectRole(role)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                  selectedRole?.id === role.id
                    ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <div>
                  <p className="text-sm font-bold">{ROLE_LABELS[role.name] || role.name}</p>
                  <p className="text-xs opacity-60">{role.permissions.length} صلاحية</p>
                </div>
                {role.name !== "super-admin" && (
                  <Can permission={PERMISSIONS.MANAGE_USERS}>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRole(role); }}
                      className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Can>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── القسم الأيمن: مصفوفة الصلاحيات ── */}
        <div className="flex-1">
          {selectedRole ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">
                  صلاحيات الدور: <span className="text-red-400">{ROLE_LABELS[selectedRole.name] || selectedRole.name}</span>
                </h2>
                <Can permission={PERMISSIONS.MANAGE_USERS}>
                  <button
                    onClick={savePermissions}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    حفظ التغييرات
                  </button>
                </Can>
              </div>

              {/* ── مجموعات الصلاحيات ── */}
              {PERMISSION_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                const allChecked = group.items.every((i) => checkedPermissions.has(i));
                const someChecked = group.items.some((i) => checkedPermissions.has(i));

                return (
                  <div key={group.title} className="bg-slate-900 rounded-2xl border border-white/5 p-4">
                    {/* ── عنوان المجموعة ── */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <GroupIcon size={18} className="text-slate-500" />
                        <h3 className="text-sm font-black text-white">{group.title}</h3>
                      </div>
                      <button
                        onClick={() => toggleAllInGroup(group.items)}
                        className="text-xs font-bold text-slate-500 hover:text-white transition-colors"
                      >
                        {allChecked ? "إلغاء الكل" : "تحديد الكل"}
                      </button>
                    </div>

                    {/* ── الصلاحيات ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {group.items.map((permName) => (
                        <button
                          key={permName}
                          onClick={() => togglePermission(permName)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl text-sm transition-all ${
                            checkedPermissions.has(permName)
                              ? "bg-green-600/20 text-green-400 border border-green-600/30"
                              : "bg-slate-800 text-slate-400 border border-white/5 hover:border-white/10"
                          }`}
                        >
                          {checkedPermissions.has(permName) ? (
                            <CheckSquare size={16} className="text-green-400 shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-600 shrink-0" />
                          )}
                          <span className="font-bold">{PERMISSION_LABELS[permName] || permName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-white/5 p-12 text-center">
              <Shield size={48} className="text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">اختر دوراً من القائمة لتعديل صلاحياته</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal إضافة دور جديد ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">إضافة دور جديد</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={addRole} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">اسم الدور</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="مثال: shift-manager"
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={addingRole || !newRoleName.trim()}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingRole && <Loader2 size={16} className="animate-spin" />}
                  إضافة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-sm hover:text-white"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPermissionsPage;