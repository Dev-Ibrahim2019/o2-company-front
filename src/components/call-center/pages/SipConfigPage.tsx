import React, { useState, useEffect } from "react";
import { Phone, Server, User, Lock, Wifi, Settings, Save, Loader2, Check, AlertTriangle, Trash2, Edit, Power, Plus } from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design";
import { Button, Input, Card, Badge, EmptyState, Select } from "../design";
import api from "../../../api/axios";

interface SipAccount {
  id: number;
  account_name: string;
  username: string;
  sip_server: string;
  websocket_port: number | null;
  server_path: string | null;
  domain: string | null;
  transport: "udp" | "tcp" | "tls";
  register_refresh: number;
  keep_alive: number;
  is_active: boolean;
  is_registered: boolean;
  user_id: number | null;
  user_name: string | null;
  created_at: string;
}

interface SipFormData {
  account_name: string;
  username: string;
  password: string;
  sip_server: string;
  websocket_port: number | "";
  server_path: string;
  domain: string;
  transport: "udp" | "tcp" | "tls";
  register_refresh: number;
  keep_alive: number;
  user_id: number | null;
}

interface UserOption {
  id: number;
  name: string;
}

// لا قيم اتصال حقيقية افتراضية — الحقول فارغة، يُدخلها المستخدم بنفسه لكل حساب
const defaultForm: SipFormData = {
  account_name: "", username: "", password: "", sip_server: "", websocket_port: "", server_path: "/ws",
  domain: "", transport: "udp", register_refresh: 300, keep_alive: 15, user_id: null,
};

export const SipConfigurationPage: React.FC = () => {
  const [accounts, setAccounts] = useState<SipAccount[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SipAccount | null>(null);
  const [form, setForm] = useState<SipFormData>(defaultForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/call-center/sip-accounts");
      setAccounts(res.data.data);
      setError(null);
    } catch {
      // لا نعرض نص الاستثناء الخام من الـ backend للمستخدم أبداً — رسالة عربية ثابتة فقط.
      setAccounts([]);
      setError("تعذّر تحميل حسابات SIP، حاول لاحقًا");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data.data ?? res.data);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => { fetchAccounts(); fetchUsers(); }, []);

  const validate = (): boolean => {
    if (!form.account_name.trim()) { setFormError("اسم الحساب مطلوب"); return false; }
    if (!form.username.trim()) { setFormError("اسم المستخدم مطلوب"); return false; }
    if (!form.password.trim() && !editing) { setFormError("كلمة المرور مطلوبة"); return false; }
    if (!form.sip_server.trim()) { setFormError("عنوان SIP Server مطلوب"); return false; }
    setFormError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setFormLoading(true);
    try {
      const payload = { ...form, websocket_port: form.websocket_port === "" ? undefined : form.websocket_port };
      if (editing && !payload.password) delete (payload as any).password;
      if (editing) {
        await api.put(`/call-center/sip-accounts/${editing.id}`, payload);
      } else {
        await api.post("/call-center/sip-accounts", payload);
      }
      await fetchAccounts();
      setShowForm(false);
      setEditing(null);
      setForm(defaultForm);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "تعذر حفظ حساب SIP");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (account: SipAccount) => {
    setEditing(account);
    setForm({
      account_name: account.account_name, username: account.username, password: "",
      sip_server: account.sip_server, websocket_port: account.websocket_port ?? "", server_path: account.server_path ?? "/ws",
      domain: account.domain || account.sip_server, transport: account.transport,
      register_refresh: account.register_refresh, keep_alive: account.keep_alive, user_id: account.user_id,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;
    try { await api.delete(`/call-center/sip-accounts/${id}`); await fetchAccounts(); }
    catch (err: any) { setError(err?.response?.data?.message || "تعذر حذف حساب SIP"); }
  };

  const transportColors: Record<string, string> = { udp: colors.semantic.success, tcp: colors.semantic.info, tls: colors.brand[500] };

  return (
    <div dir="rtl" style={{ minHeight: "100%", fontFamily: typography.fontFamily.sans }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.bold, color: colors.neutral[900] }}>إعدادات SIP</h1>
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>إدارة حسابات الاتصال الهاتفي عبر SIP</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => { setEditing(null); setForm(defaultForm); setShowForm(true); }}>حساب جديد</Button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: radius.lg, border: `1px solid ${colors.semantic.errorBorder}`, background: colors.semantic.errorBg, color: "#991b1b", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={18} /><span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: colors.dark.overlay }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ width: "100%", maxWidth: 420, maxHeight: "90vh", overflow: "auto", background: colors.surface.raised, borderRadius: 20, boxShadow: shadows["2xl"] }}>
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${colors.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>{editing ? "تعديل حساب SIP" : "حساب SIP جديد"}</h2>
                <p style={{ fontSize: typography.size.xs, color: colors.neutral[500], marginTop: 2 }}>أدخل بيانات حساب الاتصال</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: radius.lg, border: `1px solid ${colors.border.default}`, background: "transparent", color: colors.neutral[400], cursor: "pointer" }}>✕</button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px" }}>
              {formError && (
                <div style={{ padding: "10px 12px", borderRadius: radius.lg, background: colors.semantic.errorBg, color: "#991b1b", fontSize: "13px", marginBottom: 16 }}>{formError}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Input label="اسم الحساب *" value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} placeholder="مثال: 208" />
                <Input label="اسم المستخدم / الملحق *" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="مثال: 208" icon={<User size={14} />} />
                <Input label={editing ? "كلمة المرور (اتركه فارغًا للاحتفاظ بالحالي)" : "كلمة المرور *"} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" icon={<Lock size={14} />} />
                <Input label="SIP Server (WSS Host) *" value={form.sip_server} onChange={e => setForm({ ...form, sip_server: e.target.value })} placeholder="مثال: pbx.yourdomain.com" icon={<Server size={14} />} />
                <div className="flex flex-col sm:flex-row" style={{ gap: 12 }}>
                  <Input label="WebSocket Port" type="number" value={form.websocket_port} onChange={e => setForm({ ...form, websocket_port: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="مثال: 8089" />
                  <Input label="Server Path" value={form.server_path} onChange={e => setForm({ ...form, server_path: e.target.value })} placeholder="/ws" />
                </div>
                <Input label="النطاق (Domain)" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} placeholder="يُترك فارغاً لاستخدام SIP Server نفسه" icon={<Wifi size={14} />} />

                {/* الموظف المرتبط — سماعة هذا الموظف تلتقط هذا الحساب تلقائياً عند تسجيل دخوله */}
                <Select
                  label="الموظف المرتبط بهذا الحساب"
                  value={form.user_id ?? ""}
                  onChange={v => setForm({ ...form, user_id: v ? Number(v) : null })}
                  options={[{ value: "", label: "— بدون ربط —" }, ...users.map(u => ({ value: u.id, label: u.name }))]}
                />

                {/* Transport */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: colors.neutral[600], marginBottom: 6 }}>البروتوكول (Transport)</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {(["udp", "tcp", "tls"] as const).map(p => (
                      <button key={p} onClick={() => setForm({ ...form, transport: p })} style={{
                        padding: "10px", borderRadius: radius.lg,
                        border: `1px solid ${form.transport === p ? transportColors[p] : colors.border.default}`,
                        background: form.transport === p ? `color-mix(in srgb, ${transportColors[p]} 6%, transparent)` : colors.neutral[50],
                        color: form.transport === p ? transportColors[p] : colors.neutral[600],
                        fontSize: "13px", fontWeight: 600, textTransform: "uppercase", cursor: "pointer",
                        transition: `all ${transitions.fast}`,
                      }}>{p}</button>
                    ))}
                  </div>
                </div>

                {/* Refresh & Keep-Alive */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Input label="تحديث التسجيل (ثانية)" type="number" value={String(form.register_refresh)} onChange={e => setForm({ ...form, register_refresh: parseInt(e.target.value) || 300 })} />
                  <Input label="Keep-Alive (ثانية)" type="number" value={String(form.keep_alive)} onChange={e => setForm({ ...form, keep_alive: parseInt(e.target.value) || 15 })} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${colors.border.subtle}`, display: "flex", gap: 10 }}>
              <Button variant="secondary" fullWidth onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button fullWidth loading={formLoading} icon={<Save size={16} />} onClick={handleSubmit}>{editing ? "تحديث" : "حفظ"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 180, borderRadius: radius.xl, background: colors.neutral[100], animation: "shimmer 1.5s infinite" }} />)}
        </div>
      ) : error ? (
        // حالة فشل الطلب — مميّزة بصرياً عن "لا توجد بيانات" الفعلية (البانر الأحمر أعلاه يوضّح الخطأ)
        <EmptyState icon={<AlertTriangle size={24} />} title="تعذّر عرض حسابات SIP" description="حدث خطأ أثناء التحميل — راجع الرسالة أعلاه" />
      ) : accounts.length === 0 ? (
        <EmptyState icon={<Phone size={24} />} title="لا توجد حسابات SIP" description="أضف حساب SIP للبدء في استقبال المكالمات" action={{ label: "إضافة حساب", onClick: () => setShowForm(true) }} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {accounts.map(account => (
            <Card key={account.id} hover padding="20px" style={{ position: "relative" }}>
              {/* Status badge */}
              <div style={{ position: "absolute", top: 16, left: 16 }}>
                <Badge variant={account.is_registered ? "success" : "default"} dot>
                  {account.is_registered ? "مسجل" : "غير مسجل"}
                </Badge>
              </div>

              {/* Account info */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: radius.lg,
                  background: `color-mix(in srgb, ${colors.brand[500]} 6%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", fontWeight: 800, color: colors.brand[500],
                }}>
                  {account.username.slice(0, 2)}
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, color: colors.neutral[900] }}>{account.account_name}</h3>
                  <p dir="ltr" style={{ fontSize: "13px", color: colors.neutral[500], fontFamily: typography.fontFamily.mono }}>
                    {account.username}@{account.domain || account.sip_server}
                  </p>
                </div>
              </div>

              {/* الموظف المرتبط */}
              <div style={{ marginBottom: 12 }}>
                {account.user_name ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: radius.md, background: colors.semantic.successBg, color: colors.semantic.success, fontSize: "12px", fontWeight: 600 }}>
                    <User size={12} /> {account.user_name}
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: radius.md, background: colors.semantic.warningBg, color: colors.semantic.warning, fontSize: "12px", fontWeight: 600 }}>
                    <AlertTriangle size={12} /> غير مرتبط بموظف
                  </span>
                )}
              </div>

              {/* Server info */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: radius.md, background: colors.neutral[50], color: colors.neutral[600], fontSize: "12px" }}>
                  <Server size={12} /> {account.sip_server}
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: radius.md,
                  background: `color-mix(in srgb, ${transportColors[account.transport]} 6%, transparent)`, color: transportColors[account.transport],
                  fontSize: "12px", fontWeight: 600, textTransform: "uppercase",
                }}>
                  {account.transport}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 12 }}>
                <Button variant="secondary" size="sm" icon={<Edit size={14} />} fullWidth onClick={() => handleEdit(account)}>تعديل</Button>
                <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(account.id)} style={{ color: colors.neutral[500] }} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
