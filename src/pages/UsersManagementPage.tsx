/**
 * UsersManagementPage.tsx — إدارة المستخدمين والأدوار + ربط الفروع
 * ──────────────────────────────────────────────────────────────
 * يعرض: جدول المستخدمين + زر إضافة + مودال للتعديل/الإضافة
 */

import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { PERMISSIONS } from "../auth/permissions";
import { Can } from "../auth";
import { Shield, Loader2, CheckCircle, AlertCircle, UserX, UserCheck, Building2, Plus, Pencil } from "lucide-react";
import UserModal from "../components/administration/Items/UserModal";

interface UserRow {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  branch_id: number | null;
  branch_name: string;
  is_active: boolean;
}

interface RoleOption {
  id: number;
  name: string;
}

interface BranchOption {
  id: number;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  "super-admin": "مدير النظام",
  "branch-manager": "مدير الفرع",
  "accountant": "محاسب",
  "cashier": "كاشير",
  "hospitality": "ضيافة",
  "dept-staff": "موظف قسم",
};

const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        api.get("/users"),
        api.get("/roles"),
        api.get("/branches"),
      ]);
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
      const branchItems = branchesRes.data.data || branchesRes.data || [];
      setBranches(Array.isArray(branchItems) ? branchItems : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  // ── فتح مودال الإضافة ──
  const openAdd = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  // ── فتح مودال التعديل ──
  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setShowModal(true);
  };

  // ── تحديث الدور أو الفرع ──
  const handleUserUpdate = async (userId: number, field: "role" | "branch_id", value: string | number | null) => {
    setUpdatingUser(userId);
    setError("");
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const payload: Record<string, any> = {
        role: field === "role" ? value : user.role,
        branch_id: field === "branch_id" ? value : user.branch_id,
      };

      await api.put(`/users/${userId}/role`, payload);

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          if (field === "role") {
            const newRole = value as string;
            return { ...u, role: newRole, branch_name: newRole === "super-admin" ? "—" : u.branch_name };
          }
          if (field === "branch_id") {
            const branchId = value as number | null;
            const branchName = branches.find((b) => b.id === branchId)?.name ?? "—";
            return { ...u, branch_id: branchId, branch_name: branchName };
          }
          return u;
        })
      );
      showSuccess("تم التحديث بنجاح");
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في التحديث");
    } finally {
      setUpdatingUser(null);
    }
  };

  // ── تفعيل/تعطيل ──
  const handleToggle = async (userId: number) => {
    setToggling(userId);
    setError("");
    try {
      const { data: res } = await api.post(`/users/${userId}/toggle-status`);
      const newStatus = res.data?.is_active;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u))
      );
      showSuccess(newStatus ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في تغيير الحالة");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── العنوان + زر الإضافة ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-red-500" />
          <h1 className="text-2xl font-black text-white">إدارة المستخدمين والأدوار</h1>
        </div>
        <Can permission={PERMISSIONS.MANAGE_USERS}>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors shadow-lg">
            <Plus size={18} /> إضافة مستخدم
          </button>
        </Can>
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

      {/* ── الجدول ── */}
      <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 size={32} className="text-red-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center p-12 text-slate-500 font-bold">لا يوجد مستخدمون</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/50">
                  <th className="px-3 py-3 text-right text-slate-400 font-bold text-xs">#</th>
                  <th className="px-3 py-3 text-right text-slate-400 font-bold text-xs">الاسم</th>
                  <th className="px-3 py-3 text-right text-slate-400 font-bold text-xs">المستخدم</th>
                  <th className="px-3 py-3 text-center text-slate-400 font-bold text-xs">الدور</th>
                  <th className="px-3 py-3 text-center text-slate-400 font-bold text-xs">
                    <Building2 size={14} className="inline ml-1" />الفرع
                  </th>
                  <th className="px-3 py-3 text-center text-slate-400 font-bold text-xs">الحالة</th>
                  <Can permission={PERMISSIONS.MANAGE_USERS}>
                    <th className="px-3 py-3 text-center text-slate-400 font-bold text-xs">إجراءات</th>
                  </Can>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => {
                  const isSuperAdmin = user.role === "super-admin";
                  return (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-3 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-3 text-white font-bold">{user.name}</td>
                      <td className="px-3 py-3 text-slate-300 text-xs">{user.username}</td>

                      {/* ── Dropdown الدور ── */}
                      <td className="px-3 py-3 text-center">
                        <Can permission={PERMISSIONS.MANAGE_USERS}>
                          <select
                            value={user.role}
                            onChange={(e) => handleUserUpdate(user.id, "role", e.target.value)}
                            disabled={updatingUser === user.id || isSuperAdmin}
                            className="px-2 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white text-xs font-bold outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50 cursor-pointer"
                          >
                            {roles.map((r) => (
                              <option key={r.name} value={r.name}>
                                {ROLE_LABELS[r.name] || r.name}
                              </option>
                            ))}
                          </select>
                        </Can>
                      </td>

                      {/* ── Dropdown الفرع ── */}
                      <td className="px-3 py-3 text-center">
                        <Can permission={PERMISSIONS.MANAGE_USERS}>
                          <select
                            value={user.branch_id ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? null : Number(e.target.value);
                              handleUserUpdate(user.id, "branch_id", val);
                            }}
                            disabled={updatingUser === user.id || isSuperAdmin}
                            className="px-2 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white text-xs font-bold outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50 cursor-pointer"
                          >
                            <option value="">— عام / كل الفروع —</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </Can>
                      </td>

                      {/* ── الحالة ── */}
                      <td className="px-3 py-3 text-center">
                        <Can permission={PERMISSIONS.MANAGE_USERS}>
                          <button
                            onClick={() => handleToggle(user.id)}
                            disabled={toggling === user.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                              user.is_active
                                ? "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                                : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                            }`}
                          >
                            {toggling === user.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : user.is_active ? (
                              <UserCheck size={12} />
                            ) : (
                              <UserX size={12} />
                            )}
                            {user.is_active ? "نشط" : "معطّل"}
                          </button>
                        </Can>
                      </td>

                      {/* ── زر التعديل ── */}
                      <Can permission={PERMISSIONS.MANAGE_USERS}>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30"
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      </Can>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-slate-500 text-xs font-bold">إجمالي: {users.length} مستخدم</div>

      {/* ── المودال ── */}
      {showModal && (
        <UserModal
          user={editingUser}
          roles={roles}
          branches={branches}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSaved={fetchData}
        />
      )}
    </div>
  );
};

export default UsersManagementPage;