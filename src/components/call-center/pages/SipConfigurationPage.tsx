import React, { useState, useEffect } from "react";
import {
  Phone, Server, User, Lock, Wifi, Settings, Save, Loader2,
  Check, AlertTriangle, RefreshCw, Power, PowerOff, Trash2, Edit
} from "lucide-react";
import { colors, borderRadius, shadows, transitions, typography } from "../design-system";
import api from "../../../api/axios";

interface SipAccount {
  id: number;
  account_name: string;
  username: string;
  sip_server: string;
  domain: string | null;
  transport: "udp" | "tcp" | "tls";
  register_refresh: number;
  keep_alive: number;
  is_active: boolean;
  is_registered: boolean;
  created_at: string;
  updated_at: string;
}

interface SipFormData {
  account_name: string;
  username: string;
  password: string;
  sip_server: string;
  domain: string;
  transport: "udp" | "tcp" | "tls";
  register_refresh: number;
  keep_alive: number;
}

const defaultFormData: SipFormData = {
  account_name: "",
  username: "",
  password: "",
  sip_server: "192.168.2.250",
  domain: "192.168.2.250",
  transport: "udp",
  register_refresh: 300,
  keep_alive: 15,
};

interface SipConfigurationPageProps {
  onAccountSelect?: (account: SipAccount) => void;
  selectedAccountId?: number;
}

export const SipConfigurationPage: React.FC<SipConfigurationPageProps> = ({
  onAccountSelect,
  selectedAccountId,
}) => {
  const [accounts, setAccounts] = useState<SipAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SipAccount | null>(null);
  const [formData, setFormData] = useState<SipFormData>(defaultFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/call-center/sip-accounts");
      setAccounts(response.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل حسابات SIP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleFormChange = (field: keyof SipFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
    setConnectionStatus("idle");
  };

  const validateForm = (): boolean => {
    if (!formData.account_name.trim()) {
      setFormError("اسم الحساب مطلوب");
      return false;
    }
    if (!formData.username.trim()) {
      setFormError("اسم المستخدم مطلوب");
      return false;
    }
    if (!formData.password.trim() && !editingAccount) {
      setFormError("كلمة المرور مطلوبة");
      return false;
    }
    if (!formData.sip_server.trim()) {
      setFormError("عنوان SIP Server مطلوب");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setFormLoading(true);
    setFormError(null);

    try {
      const payload = { ...formData };
      if (editingAccount && !payload.password) {
        delete (payload as any).password;
      }

      if (editingAccount) {
        await api.put(`/call-center/sip-accounts/${editingAccount.id}`, payload);
      } else {
        await api.post("/call-center/sip-accounts", payload);
      }

      await fetchAccounts();
      setShowForm(false);
      setEditingAccount(null);
      setFormData(defaultFormData);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "تعذر حفظ حساب SIP");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (account: SipAccount) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name,
      username: account.username,
      password: "",
      sip_server: account.sip_server,
      domain: account.domain || account.sip_server,
      transport: account.transport,
      register_refresh: account.register_refresh,
      keep_alive: account.keep_alive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;

    try {
      await api.delete(`/call-center/sip-accounts/${id}`);
      await fetchAccounts();
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر حذف حساب SIP");
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus("idle");

    try {
      // Simulate connection test - in real implementation, this would test SIP registration
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setConnectionStatus("success");
    } catch {
      setConnectionStatus("error");
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: colors.bg.primary,
        fontFamily: typography.fontFamily.sans,
      }}
    >
      <div
        style={{
          maxWidth: "64rem",
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: typography.fontSize["2xl"][0],
                fontWeight: typography.fontWeight.black,
                color: colors.neutral[50],
                marginBottom: "0.25rem",
              }}
            >
              إعدادات SIP
            </h1>
            <p
              style={{
                fontSize: typography.fontSize.sm[0],
                color: colors.neutral[400],
              }}
            >
              إدارة حسابات الاتصال الهاتفي عبر SIP
            </p>
          </div>

          <button
            onClick={() => {
              setEditingAccount(null);
              setFormData(defaultFormData);
              setShowForm(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.25rem",
              borderRadius: borderRadius.lg,
              border: "none",
              background: colors.brand.primary,
              color: colors.neutral[50],
              fontSize: typography.fontSize.sm[0],
              fontWeight: typography.fontWeight.bold,
              cursor: "pointer",
              transition: `all ${transitions.fast}`,
            }}
          >
            <Phone size={18} />
            حساب جديد
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: "1rem",
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.status.errorBorder}`,
              background: colors.status.errorLight,
              color: colors.neutral[200],
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <AlertTriangle size={20} style={{ color: colors.status.error }} />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                marginRight: "auto",
                background: "transparent",
                border: "none",
                color: colors.neutral[400],
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Account form modal */}
        {showForm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: colors.bg.overlay,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForm(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "32rem",
                maxHeight: "90vh",
                overflow: "auto",
                background: colors.bg.secondary,
                borderRadius: borderRadius["2xl"],
                border: `1px solid ${colors.border.default}`,
                boxShadow: shadows["2xl"],
              }}
            >
              {/* Form header */}
              <div
                style={{
                  padding: "1.5rem",
                  borderBottom: `1px solid ${colors.border.subtle}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: typography.fontSize.lg[0],
                      fontWeight: typography.fontWeight.bold,
                      color: colors.neutral[50],
                    }}
                  >
                    {editingAccount ? "تعديل حساب SIP" : "حساب SIP جديد"}
                  </h2>
                  <p
                    style={{
                      fontSize: typography.fontSize.xs[0],
                      color: colors.neutral[400],
                      marginTop: "0.25rem",
                    }}
                  >
                    أدخل بيانات حساب الاتصال
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.border.default}`,
                    background: "transparent",
                    color: colors.neutral[400],
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Form body */}
              <div style={{ padding: "1.5rem" }}>
                {formError && (
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: borderRadius.lg,
                      border: `1px solid ${colors.status.errorBorder}`,
                      background: colors.status.errorLight,
                      color: colors.neutral[200],
                      fontSize: typography.fontSize.xs[0],
                      marginBottom: "1rem",
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Account Name */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: typography.fontSize.sm[0],
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.neutral[300],
                        marginBottom: "0.5rem",
                      }}
                    >
                      اسم الحساب *
                    </label>
                    <input
                      value={formData.account_name}
                      onChange={(e) => handleFormChange("account_name", e.target.value)}
                      placeholder="مثال: 208"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: borderRadius.lg,
                        border: `1px solid ${colors.border.default}`,
                        background: colors.bg.tertiary,
                        color: colors.neutral[50],
                        fontSize: typography.fontSize.sm[0],
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: typography.fontSize.sm[0],
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.neutral[300],
                        marginBottom: "0.5rem",
                      }}
                    >
                      اسم المستخدم / الملحق *
                    </label>
                    <div style={{ position: "relative" }}>
                      <User
                        size={16}
                        style={{
                          position: "absolute",
                          right: "1rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: colors.neutral[500],
                        }}
                      />
                      <input
                        value={formData.username}
                        onChange={(e) => handleFormChange("username", e.target.value)}
                        placeholder="مثال: 208"
                        dir="ltr"
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem 0.75rem 2.5rem",
                          borderRadius: borderRadius.lg,
                          border: `1px solid ${colors.border.default}`,
                          background: colors.bg.tertiary,
                          color: colors.neutral[50],
                          fontSize: typography.fontSize.sm[0],
                          fontFamily: typography.fontFamily.mono,
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: typography.fontSize.sm[0],
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.neutral[300],
                        marginBottom: "0.5rem",
                      }}
                    >
                      كلمة المرور {editingAccount ? "(اتركه فارغًا للاحتفاظ بالحالي)" : "*"}
                    </label>
                    <div style={{ position: "relative" }}>
                      <Lock
                        size={16}
                        style={{
                          position: "absolute",
                          right: "1rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: colors.neutral[500],
                        }}
                      />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleFormChange("password", e.target.value)}
                        placeholder="••••••••"
                        dir="ltr"
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem 0.75rem 2.5rem",
                          borderRadius: borderRadius.lg,
                          border: `1px solid ${colors.border.default}`,
                          background: colors.bg.tertiary,
                          color: colors.neutral[50],
                          fontSize: typography.fontSize.sm[0],
                          fontFamily: typography.fontFamily.mono,
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* SIP Server */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: typography.fontSize.sm[0],
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.neutral[300],
                        marginBottom: "0.5rem",
                      }}
                    >
                      SIP Server *
                    </label>
                    <div style={{ position: "relative" }}>
                      <Server
                        size={16}
                        style={{
                          position: "absolute",
                          right: "1rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: colors.neutral[500],
                        }}
                      />
                      <input
                        value={formData.sip_server}
                        onChange={(e) => handleFormChange("sip_server", e.target.value)}
                        placeholder="192.168.2.250"
                        dir="ltr"
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem 0.75rem 2.5rem",
                          borderRadius: borderRadius.lg,
                          border: `1px solid ${colors.border.default}`,
                          background: colors.bg.tertiary,
                          color: colors.neutral[50],
                          fontSize: typography.fontSize.sm[0],
                          fontFamily: typography.fontFamily.mono,
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Domain */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: typography.fontSize.sm[0],
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.neutral[300],
                        marginBottom: "0.5rem",
                      }}
                    >
                      النطاق (Domain)
                    </label>
                    <div style={{ position: "relative" }}>
                      <Wifi
                        size={16}
                        style={{
                          position: "absolute",
                          right: "1rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: colors.neutral[500],
                        }}
                      />
                      <input
                        value={formData.domain}
                        onChange={(e) => handleFormChange("domain", e.target.value)}
                        placeholder="192.168.2.250"
                        dir="ltr"
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem 0.75rem 2.5rem",
                          borderRadius: borderRadius.lg,
                          border: `1px solid ${colors.border.default}`,
                          background: colors.bg.tertiary,
                          color: colors.neutral[50],
                          fontSize: typography.fontSize.sm[0],
                          fontFamily: typography.fontFamily.mono,
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Transport */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: typography.fontSize.sm[0],
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.neutral[300],
                        marginBottom: "0.5rem",
                      }}
                    >
                      البروتوكول (Transport)
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "0.5rem",
                      }}
                    >
                      {(["udp", "tcp", "tls"] as const).map((protocol) => (
                        <button
                          key={protocol}
                          onClick={() => handleFormChange("transport", protocol)}
                          style={{
                            padding: "0.75rem",
                            borderRadius: borderRadius.lg,
                            border: `1px solid ${
                              formData.transport === protocol
                                ? colors.brand.primaryBorder
                                : colors.border.default
                            }`,
                            background:
                              formData.transport === protocol
                                ? colors.brand.primaryLight
                                : colors.bg.tertiary,
                            color:
                              formData.transport === protocol
                                ? colors.brand.primary
                                : colors.neutral[300],
                            fontSize: typography.fontSize.sm[0],
                            fontWeight: typography.fontWeight.semibold,
                            textTransform: "uppercase",
                            cursor: "pointer",
                            transition: `all ${transitions.fast}`,
                          }}
                        >
                          {protocol}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Register Refresh & Keep Alive */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: typography.fontSize.sm[0],
                          fontWeight: typography.fontWeight.semibold,
                          color: colors.neutral[300],
                          marginBottom: "0.5rem",
                        }}
                      >
                        تحديث التسجيل (ثانية)
                      </label>
                      <input
                        type="number"
                        value={formData.register_refresh}
                        onChange={(e) =>
                          handleFormChange("register_refresh", parseInt(e.target.value) || 300)
                        }
                        min={30}
                        max={3600}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          borderRadius: borderRadius.lg,
                          border: `1px solid ${colors.border.default}`,
                          background: colors.bg.tertiary,
                          color: colors.neutral[50],
                          fontSize: typography.fontSize.sm[0],
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: typography.fontSize.sm[0],
                          fontWeight: typography.fontWeight.semibold,
                          color: colors.neutral[300],
                          marginBottom: "0.5rem",
                        }}
                      >
                        Keep-Alive (ثانية)
                      </label>
                      <input
                        type="number"
                        value={formData.keep_alive}
                        onChange={(e) =>
                          handleFormChange("keep_alive", parseInt(e.target.value) || 15)
                        }
                        min={5}
                        max={300}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          borderRadius: borderRadius.lg,
                          border: `1px solid ${colors.border.default}`,
                          background: colors.bg.tertiary,
                          color: colors.neutral[50],
                          fontSize: typography.fontSize.sm[0],
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form footer */}
              <div
                style={{
                  padding: "1.5rem",
                  borderTop: `1px solid ${colors.border.subtle}`,
                  display: "flex",
                  gap: "0.75rem",
                }}
              >
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.border.default}`,
                    background: "transparent",
                    color: colors.neutral[300],
                    fontSize: typography.fontSize.sm[0],
                    fontWeight: typography.fontWeight.semibold,
                    cursor: "pointer",
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={formLoading}
                  style={{
                    flex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    borderRadius: borderRadius.lg,
                    border: "none",
                    background: formLoading ? colors.neutral[700] : colors.brand.primary,
                    color: colors.neutral[50],
                    fontSize: typography.fontSize.sm[0],
                    fontWeight: typography.fontWeight.bold,
                    cursor: formLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {formLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      {editingAccount ? "تحديث" : "حفظ"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Accounts list */}
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4rem",
            }}
          >
            <Loader2 size={32} className="animate-spin" style={{ color: colors.brand.primary }} />
          </div>
        ) : accounts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              background: colors.bg.secondary,
              borderRadius: borderRadius["2xl"],
              border: `1px dashed ${colors.border.default}`,
            }}
          >
            <Phone
              size={48}
              style={{ color: colors.neutral[600], margin: "0 auto 1rem" }}
            />
            <h3
              style={{
                fontSize: typography.fontSize.lg[0],
                fontWeight: typography.fontWeight.bold,
                color: colors.neutral[300],
                marginBottom: "0.5rem",
              }}
            >
              لا توجد حسابات SIP
            </h3>
            <p
              style={{
                fontSize: typography.fontSize.sm[0],
                color: colors.neutral[500],
                marginBottom: "1.5rem",
              }}
            >
              أضف حساب SIP للبدء في استقبال المكالمات
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: borderRadius.lg,
                border: "none",
                background: colors.brand.primary,
                color: colors.neutral[50],
                fontSize: typography.fontSize.sm[0],
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
              }}
            >
              <Phone size={18} />
              إضافة حساب
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(20rem, 1fr))",
            }}
          >
            {accounts.map((account) => (
              <div
                key={account.id}
                onClick={() => onAccountSelect?.(account)}
                style={{
                  background: colors.bg.secondary,
                  borderRadius: borderRadius.xl,
                  border: `1px solid ${
                    selectedAccountId === account.id
                      ? colors.brand.primaryBorder
                      : colors.border.subtle
                  }`,
                  padding: "1.25rem",
                  cursor: "pointer",
                  transition: `all ${transitions.fast}`,
                  position: "relative",
                }}
              >
                {/* Status badge */}
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    left: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.25rem 0.625rem",
                    borderRadius: borderRadius.full,
                    background: account.is_registered
                      ? colors.status.successLight
                      : colors.neutral[800],
                    color: account.is_registered
                      ? colors.status.success
                      : colors.neutral[500],
                    fontSize: typography.fontSize.xs[0],
                    fontWeight: typography.fontWeight.semibold,
                  }}
                >
                  {account.is_registered ? (
                    <>
                      <Check size={12} />
                      مسجل
                    </>
                  ) : (
                    <>
                      <PowerOff size={12} />
                      غير مسجل
                    </>
                  )}
                </div>

                {/* Account info */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: borderRadius.lg,
                      background: colors.brand.primaryLight,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: typography.fontSize.xl[0],
                        fontWeight: typography.fontWeight.black,
                        color: colors.brand.primary,
                      }}
                    >
                      {account.username.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: typography.fontSize.base[0],
                        fontWeight: typography.fontWeight.bold,
                        color: colors.neutral[50],
                      }}
                    >
                      {account.account_name}
                    </h3>
                    <p
                      dir="ltr"
                      style={{
                        fontSize: typography.fontSize.sm[0],
                        color: colors.neutral[400],
                        fontFamily: typography.fontFamily.mono,
                      }}
                    >
                      {account.username}@{account.domain || account.sip_server}
                    </p>
                  </div>
                </div>

                {/* Server info */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: borderRadius.md,
                      background: colors.bg.tertiary,
                      color: colors.neutral[400],
                      fontSize: typography.fontSize.xs[0],
                    }}
                  >
                    <Server size={12} />
                    {account.sip_server}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: borderRadius.md,
                      background: colors.bg.tertiary,
                      color: colors.neutral[400],
                      fontSize: typography.fontSize.xs[0],
                      textTransform: "uppercase",
                    }}
                  >
                    {account.transport}
                  </span>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    borderTop: `1px solid ${colors.border.subtle}`,
                    paddingTop: "1rem",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(account);
                    }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem",
                      padding: "0.5rem",
                      borderRadius: borderRadius.lg,
                      border: `1px solid ${colors.border.default}`,
                      background: "transparent",
                      color: colors.neutral[300],
                      fontSize: typography.fontSize.xs[0],
                      fontWeight: typography.fontWeight.semibold,
                      cursor: "pointer",
                    }}
                  >
                    <Edit size={14} />
                    تعديل
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(account.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "2.5rem",
                      borderRadius: borderRadius.lg,
                      border: `1px solid ${colors.border.default}`,
                      background: "transparent",
                      color: colors.neutral[400],
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
