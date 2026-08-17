// src/components/administration/Items/UserModal.tsx
// مودال إضافة وتعديل المستخدمين

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import api from '../../../api/axios';
import { toast } from '../../shared/Toast';
import { ROLE_LABELS } from '../../../auth/permissions';

interface User {
    id?: number;
    name: string;
    username: string;
    email: string;
    password?: string;
    role: string;
    branch_id: number | null;
    is_active: boolean;
}

interface Props {
    user?: User | null;
    roles: { id: number; name: string }[];
    branches: { id: number; name: string }[];
    onClose: () => void;
    onSaved: () => void;
}

const inputCls = "w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

const UserModal = ({ user, roles, branches, onClose, onSaved }: Props) => {
    const [form, setForm] = useState({
        name: user?.name ?? '',
        username: user?.username ?? '',
        email: user?.email ?? '',
        password: '',
        role: user?.role ?? 'cashier',
        branch_id: user?.branch_id ?? null,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.username.trim() || !form.email.trim()) {
            toast.error('الاسم واسم المستخدم والبريد الإلكتروني مطلوبة');
            return;
        }

        const payload: any = {
            name: form.name,
            username: form.username,
            email: form.email,
            role: form.role,
            branch_id: form.branch_id,
        };

        // كلمة المرور فقط في حالة الإضافة أو إذا تم تغييرها
        if (!user && form.password) {
            payload.password = form.password;
        } else if (user && form.password) {
            payload.password = form.password;
        }

        setSaving(true);
        try {
            if (user) {
                await api.put(`/users/${user.id}`, payload);
            } else {
                if (!form.password) { toast.error('كلمة المرور مطلوبة للمستخدم الجديد'); return; }
                await api.post('/users', payload);
            }
            onSaved();
            onClose();
        } catch (e: any) {
            toast.error('فشل الحفظ', e.response?.data?.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white">
                        {user ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <Field label="الاسم الكامل">
                        <input
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            className={inputCls}
                            placeholder="أحمد محمد"
                            dir="rtl"
                        />
                    </Field>

                    <Field label="اسم المستخدم">
                        <input
                            value={form.username}
                            onChange={e => set('username', e.target.value)}
                            className={inputCls}
                            placeholder="ahmed"
                            dir="ltr"
                        />
                    </Field>

                    <Field label="البريد الإلكتروني">
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => set('email', e.target.value)}
                            className={inputCls}
                            placeholder="ahmed@example.com"
                            dir="ltr"
                        />
                    </Field>

                    <Field label={user ? 'كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={form.password}
                                onChange={e => set('password', e.target.value)}
                                className={inputCls + " pr-10"}
                                placeholder="••••••••"
                                dir="ltr"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </Field>

                    <Field label="الدور">
                        <select
                            value={form.role}
                            onChange={e => set('role', e.target.value)}
                            className={inputCls}
                        >
                            {roles.map((r) => (
                                <option key={r.id} value={r.name}>{ROLE_LABELS[r.name] || r.name}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="الفرع">
                        <select
                            value={form.branch_id ?? ""}
                            onChange={e => set('branch_id', e.target.value === "" ? null : Number(e.target.value))}
                            className={inputCls}
                        >
                            <option value="">— عام / كل الفروع —</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
                        إلغاء
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50">
                        {saving ? 'جاري الحفظ...' : user ? 'حفظ التغييرات' : 'إضافة المستخدم'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserModal;