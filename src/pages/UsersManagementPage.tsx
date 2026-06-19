/**
 * UsersManagementPage.tsx — إدارة المستخدمين والأدوار
 * يعرض جدول المستخدمين مع Dropdown للدور وToggle للتفعيل
 */

import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { PERMISSIONS } from "../auth/permissions";
import { Can } from "../auth";
import { Shield, Loader2, CheckCircle, AlertCircle, UserX, UserCheck } from "lucide-react";

interface UserRow {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface RoleOption {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingRole, setUpdatingRole] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get("/users"),
        api.get("/roles"),
      ]);
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
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

  // ── تحديث الدور ──
  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdatingRole(userId);
    setError("");
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showSuccess("تم تحديث الدور بنجاح");
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في تحديث الدور");
    } finally {
      setUpdatingRole(null);
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
      {/* ── العنوان ── */}
      <div className="flex items-center gap-3">
        <Shield size={28} className="text-red-500" />
        <h1 className="text-2xl font-black text-white">إدارة المستخدمين والأدوار</h1>
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
                  <th className="px-4 py-3 text-right text-slate-400 font-bold text-xs">#</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-bold text-xs">الاسم</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-bold text-xs">اسم المستخدم</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-bold text-xs">البريد</th>
                  <th className="px-4 py-3 text-center text-slate-400 font-bold text-xs">الدور</th>
                  <th className="px-4 py-3 text-center text-slate-400 font-bold text-xs">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-white font-bold">{user.name}</td>
                    <td className="px-4 py-3 text-slate-300">{user.username}</td>
                    <td className="px-4 py-3 text-slate-400">{user.email}</td>

                    {/* ── Dropdown الدور ── */}
                    <td className="px-4 py-3 text-center">
                      <Can permission={PERMISSIONS.MANAGE_USERS}>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={updatingRole === user.id}
                          className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-xs font-bold outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50 cursor-pointer"
                        >
                          {roles.map((r) => (
                            <option key={r.name} value={r.name}>
                              {ROLE_LABELS[r.name] || r.name}
                            </option>
                          ))}
                        </select>
                      </Can>
                      {updatingRole === user.id && (
                        <Loader2 size={14} className="inline mr-1 text-red-500 animate-spin" />
                      )}
                    </td>

                    {/* ── زر التفعيل/التعطيل ── */}
                    <td className="px-4 py-3 text-center">
                      <Can permission={PERMISSIONS.MANAGE_USERS}>
                        <button
                          onClick={() => handleToggle(user.id)}
                          disabled={toggling === user.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-slate-500 text-xs font-bold">إجمالي: {users.length} مستخدم</div>
    </div>
  );
};

export default UsersManagementPage;