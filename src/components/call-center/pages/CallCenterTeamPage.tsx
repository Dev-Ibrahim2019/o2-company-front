import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Headphones, Plus, Search, Loader2, AlertCircle, X, Save, RefreshCw,
  Power, PowerOff, Users, CheckCircle2, ShieldCheck, KeyRound,
} from "lucide-react";
import { colors, typography, radius, shadows } from "../design/tokens";
import {
  callCenterTeamService, CALL_CENTER_AGENT_PERMISSIONS, CALL_CENTER_PERMISSION_LABELS,
  type CallCenterAgent, type CallCenterAgentPayload, type CallCenterAgentPermission,
} from "../../../services/callCenterTeamService";
import { toast } from "../../shared/Toast";

// ============================================================================
// الفريق — إدارة حسابات موظفي الكول سنتر العاديين (role=call-center)، محصورة برئيس الكول
// سنتر. تدير حسابات User حقيقية تسجّل دخول فعليًا وتحمل صلاحيات مباشرة — وليس سجلات Employee
// إدارية (Employee لا يملك Authenticatable ولا يقدر يسجّل دخول أصلاً بهذا المشروع).
// كل صلاحية تُمنح من القائمة المقفلة CALL_CENTER_AGENT_PERMISSIONS فقط — الباك اند يرفض أي
// قيمة خارجها، وهذه الشاشة لا تعرض إطلاقاً خيار تغيير الدور (دائمًا "call-center" مفروض).
// ============================================================================

export const CallCenterTeamPage: React.FC = () => {
  const [agents, setAgents] = useState<CallCenterAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [permissionsTarget, setPermissionsTarget] = useState<CallCenterAgent | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await callCenterTeamService.getAll();
      setAgents(list);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل فريق الكول سنتر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const stats = useMemo(() => ({
    total: agents.length,
    active: agents.filter((a) => a.is_active).length,
    inactive: agents.filter((a) => !a.is_active).length,
  }), [agents]);

  const filtered = useMemo(() => {
    if (!search) return agents;
    const q = search.trim().toLowerCase();
    return agents.filter((a) => a.name.toLowerCase().includes(q) || a.username.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [agents, search]);

  const handleToggleStatus = async (agent: CallCenterAgent) => {
    try {
      const updated = await callCenterTeamService.toggleStatus(agent.id);
      setAgents((current) => current.map((a) => (a.id === agent.id ? updated : a)));
      toast.success(updated.is_active ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
    } catch (err: any) {
      toast.error("فشل تحديث حالة الحساب", err?.response?.data?.message);
    }
  };

  const handleCreate = async (payload: CallCenterAgentPayload) => {
    setSaving(true);
    try {
      const created = await callCenterTeamService.create(payload);
      setAgents((current) => [created, ...current]);
      toast.success("تمت إضافة الموظف");
      setShowAddModal(false);
    } catch (err: any) {
      toast.error("فشل إضافة الموظف", err?.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async (agent: CallCenterAgent, permissions: CallCenterAgentPermission[]) => {
    setSaving(true);
    try {
      const updated = await callCenterTeamService.updatePermissions(agent.id, permissions);
      setAgents((current) => current.map((a) => (a.id === agent.id ? updated : a)));
      toast.success("تم تحديث الصلاحيات");
      setPermissionsTarget(null);
    } catch (err: any) {
      toast.error("فشل تحديث الصلاحيات", err?.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" style={{ fontFamily: typography.fontFamily.sans, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
            الفريق
          </h1>
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>
            موظفو الكول سنتر — حسابات دخول حقيقية بصلاحيات فردية، متاحة فقط لرئيس الكول سنتر
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={fetchAgents} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: radius.lg,
            background: colors.neutral[0], border: `1px solid ${colors.border.default}`,
            color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: loading ? "not-allowed" : "pointer",
          }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> تحديث
          </button>
          <button onClick={() => setShowAddModal(true)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: radius.lg,
            background: colors.brand[500], color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.bold, cursor: "pointer",
          }}>
            <Plus size={16} /> إضافة موظف
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { label: "إجمالي الموظفين", value: stats.total, color: colors.neutral[700], icon: <Users size={16} /> },
          { label: "نشط", value: stats.active, color: colors.semantic.success, icon: <CheckCircle2 size={16} /> },
          { label: "غير نشط", value: stats.inactive, color: colors.neutral[400], icon: <PowerOff size={16} /> },
        ].map((card) => (
          <div key={card.label} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            background: colors.neutral[0], borderRadius: radius.lg, border: `1px solid ${colors.border.subtle}`,
          }}>
            <span style={{
              width: 34, height: 34, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center",
              background: `color-mix(in srgb, ${card.color} 12%, transparent)`, color: card.color, flexShrink: 0,
            }}>
              {card.icon}
            </span>
            <div>
              <p style={{ fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
                {card.value.toLocaleString("ar-EG")}
              </p>
              <p style={{ fontSize: "10px", fontWeight: typography.weight.bold, color: colors.neutral[500] }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم، اسم المستخدم، أو البريد..."
          style={{
            width: "100%", height: 42, padding: "0 40px 0 12px",
            border: `1px solid ${colors.border.default}`, borderRadius: radius.lg,
            fontSize: typography.size.sm, outline: "none", background: colors.neutral[0],
          }}
        />
      </div>

      <div style={{
        background: colors.neutral[0], borderRadius: radius.xl, border: `1px solid ${colors.border.subtle}`,
        boxShadow: shadows.sm, overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={28} className="animate-spin" style={{ color: colors.brand[500] }} />
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 40 }}>
            <AlertCircle size={28} style={{ color: colors.semantic.error, marginBottom: 8 }} />
            <p style={{ fontSize: typography.size.sm, color: colors.semantic.error }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 40 }}>
            <Headphones size={28} style={{ color: colors.neutral[300], marginBottom: 8 }} />
            <p style={{ fontSize: typography.size.sm, color: colors.neutral[500] }}>
              {search ? "لا توجد نتائج مطابقة" : "لا يوجد موظفو كول سنتر بعد"}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typography.size.sm, minWidth: 680 }}>
              <thead>
                <tr style={{ background: colors.neutral[50] }}>
                  <th style={thStyle}>الاسم</th>
                  <th style={thStyle}>اسم المستخدم</th>
                  <th style={thStyle}>الحالة</th>
                  <th style={thStyle}>الصلاحيات</th>
                  <th style={thStyle}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent, idx) => (
                  <tr key={agent.id} style={{ borderTop: `1px solid ${colors.border.subtle}`, background: idx % 2 === 1 ? colors.neutral[50] : "transparent" }}>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          background: `color-mix(in srgb, ${colors.brand[500]} 12%, transparent)`, color: colors.brand[600],
                        }}>
                          <Headphones size={14} />
                        </span>
                        <div>
                          <p style={{ fontWeight: typography.weight.semibold, color: colors.neutral[800] }}>{agent.name}</p>
                          <p style={{ fontSize: "11px", color: colors.neutral[400] }}>{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: typography.fontFamily.mono }} dir="ltr">{agent.username}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: radius.full,
                        background: agent.is_active ? `color-mix(in srgb, ${colors.semantic.success} 12%, transparent)` : colors.neutral[100],
                        color: agent.is_active ? colors.semantic.success : colors.neutral[400],
                        fontSize: "11px", fontWeight: typography.weight.bold,
                      }}>
                        ● {agent.is_active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "11px", color: colors.neutral[500] }}>
                        {agent.permissions.length} / {CALL_CENTER_AGENT_PERMISSIONS.length}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setPermissionsTarget(agent)} title="الصلاحيات" style={iconBtnStyle(colors.brand[600])}>
                          <ShieldCheck size={14} />
                        </button>
                        <button onClick={() => handleToggleStatus(agent)} title={agent.is_active ? "تعطيل" : "تفعيل"} style={iconBtnStyle(agent.is_active ? colors.neutral[400] : colors.semantic.success)}>
                          {agent.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddAgentModal saving={saving} onSave={handleCreate} onClose={() => setShowAddModal(false)} />
      )}

      {permissionsTarget && (
        <PermissionsModal
          agent={permissionsTarget}
          saving={saving}
          onSave={(permissions) => handleSavePermissions(permissionsTarget, permissions)}
          onClose={() => setPermissionsTarget(null)}
        />
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = { padding: "10px 14px", textAlign: "right", fontSize: "11px", color: colors.neutral[500], fontWeight: typography.weight.bold };
const tdStyle: React.CSSProperties = { padding: "10px 14px", color: colors.neutral[700] };
const iconBtnStyle = (color: string): React.CSSProperties => ({
  padding: 6, borderRadius: radius.md, background: "transparent", border: "none", color, cursor: "pointer",
});
const inputStyle: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 12px", borderRadius: radius.lg,
  border: `1px solid ${colors.border.default}`, fontSize: typography.size.sm, outline: "none",
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: "block" }}>
    <span style={{ fontSize: "11px", fontWeight: typography.weight.bold, color: colors.neutral[500], marginBottom: 6, display: "block" }}>
      {label}
    </span>
    {children}
  </label>
);

// ── نموذج إضافة موظف كول سنتر — بدون أي حقل دور أو فرع (call-center مفروض دائمًا، وDepartment
// مقفل على "كل الفروع" (null) إلزاميًا بالباك اند — غير معروض هنا حتى لا يظن أحد أنه قابل للتغيير) ──
const AddAgentModal: React.FC<{
  saving: boolean;
  onSave: (payload: CallCenterAgentPayload) => void;
  onClose: () => void;
}> = ({ saving, onSave, onClose }) => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const valid = name.trim() && username.trim() && email.trim() && password.trim().length >= 6;

  const handleSubmit = () => {
    if (!valid) return;
    onSave({ name: name.trim(), username: username.trim(), email: email.trim(), password });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
    }} onClick={() => { if (!saving) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: colors.neutral[0], borderRadius: radius.xl,
        boxShadow: shadows["2xl"], overflow: "hidden", display: "flex", flexDirection: "column",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], display: "flex", alignItems: "center", gap: 8 }}>
            <Headphones size={16} style={{ color: colors.brand[600] }} /> إضافة موظف كول سنتر
          </h3>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: colors.neutral[400] }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <FormField label="الاسم الكامل *">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="اسم المستخدم *">
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} dir="ltr" />
          </FormField>
          <FormField label="البريد الإلكتروني *">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} dir="ltr" />
          </FormField>
          <FormField label="كلمة المرور * (6 أحرف على الأقل)">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} dir="ltr" />
          </FormField>
          <p style={{ fontSize: "11px", color: colors.neutral[400], display: "flex", alignItems: "center", gap: 6 }}>
            <KeyRound size={12} /> يُنشأ الحساب بدور "موظف كول سنتر" دائمًا، بلا فرع محدد (يخدم كل الفروع) — يبدأ بصلاحية عرض الطلبات النشطة فقط، وباقي الصلاحيات تُمنح لاحقًا من لوحة الصلاحيات.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "16px 20px", borderTop: `1px solid ${colors.border.subtle}`, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: "8px 16px", borderRadius: radius.lg,
            background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
            color: colors.neutral[600], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: saving ? "not-allowed" : "pointer",
          }}>
            إلغاء
          </button>
          <button onClick={handleSubmit} disabled={!valid || saving} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: radius.lg,
            background: colors.brand[500], color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: (!valid || saving) ? "not-allowed" : "pointer", opacity: (!valid || saving) ? 0.6 : 1,
          }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};

// ── لوحة الصلاحيات الفردية — Checkboxes من القائمة المقفلة فقط ──
const PermissionsModal: React.FC<{
  agent: CallCenterAgent;
  saving: boolean;
  onSave: (permissions: CallCenterAgentPermission[]) => void;
  onClose: () => void;
}> = ({ agent, saving, onSave, onClose }) => {
  const [selected, setSelected] = useState<Set<CallCenterAgentPermission>>(new Set(agent.permissions));

  const toggle = (permission: CallCenterAgentPermission) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
    }} onClick={() => { if (!saving) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 460, maxHeight: "80vh",
        background: colors.neutral[0], borderRadius: radius.xl,
        boxShadow: shadows["2xl"], overflow: "hidden", display: "flex", flexDirection: "column",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={16} style={{ color: colors.brand[600] }} /> صلاحيات {agent.name}
            </h3>
            <p style={{ fontSize: "11px", color: colors.neutral[400], marginTop: 4 }}>@{agent.username}</p>
          </div>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: colors.neutral[400] }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {CALL_CENTER_AGENT_PERMISSIONS.map((permission) => (
            <label key={permission} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: radius.lg, border: `1px solid ${colors.border.subtle}`,
              background: selected.has(permission) ? `color-mix(in srgb, ${colors.brand[500]} 6%, transparent)` : colors.neutral[0],
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                checked={selected.has(permission)}
                onChange={() => toggle(permission)}
                style={{ width: 16, height: 16, accentColor: colors.brand[500] }}
              />
              <span style={{ fontSize: typography.size.sm, color: colors.neutral[800] }}>
                {CALL_CENTER_PERMISSION_LABELS[permission]}
              </span>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "16px 20px", borderTop: `1px solid ${colors.border.subtle}`, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: "8px 16px", borderRadius: radius.lg,
            background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
            color: colors.neutral[600], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: saving ? "not-allowed" : "pointer",
          }}>
            إلغاء
          </button>
          <button onClick={() => onSave(Array.from(selected))} disabled={saving} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: radius.lg,
            background: colors.brand[500], color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
          }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ الصلاحيات
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallCenterTeamPage;
