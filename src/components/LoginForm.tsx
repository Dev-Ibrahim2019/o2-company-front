import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import InputField from "./InputField";
import { ArrowRightCircle, Fingerprint } from "lucide-react";

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<any>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const e: any = {};
    if (!email) e.email = "Email is required";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setApiError("");
    setLoading(true);
    try {
      const { data } = await api.post("/login", { email, password });
      localStorage.setItem("token", data.data.token);
      onLogin(data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setApiError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    // <div className="card-inner">
    //   <div className="form-header">
    //     <div className="badge">SIGN IN</div>
    //     <h1>
    //       Welcome
    //       <br />
    //       back.
    //     </h1>
    //     <p>Enter your credentials to continue.</p>
    //   </div>
    //   {apiError && <div className="api-error">{apiError}</div>}
    //   <InputField
    //     label="Email address"
    //     type="email"
    //     value={email}
    //     onChange={setEmail}
    //     placeholder="you@example.com"
    //     error={errors.email}
    //   />
    //   <InputField
    //     label="Password"
    //     type="password"
    //     value={password}
    //     onChange={setPassword}
    //     placeholder="••••••••"
    //     error={errors.password}
    //   />
    //   <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
    //     {loading ? <span className="spinner" /> : "Sign In →"}
    //   </button>
    //   <p className="switch-text">
    //     Don't have an account?{" "}
    //     <button className="link-btn" onClick={() => navigate("/register")}>
    //       Create one
    //     </button>
    //   </p>
    // </div>
    <div
      className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100"
      dir="rtl"
    >
      <div className="max-w-md w-full p-10 space-y-10 bg-slate-900 rounded-[4rem] border border-white/5 shadow-2xl">
        <button
          onClick={() => setMode("SELECT")}
          className="text-slate-500 flex items-center gap-2 font-black hover:text-red-500 transition-colors uppercase text-[10px] tracking-widest"
        >
          <ArrowRightCircle size={18} /> العودة للرئيسية
        </button>

        <div className="text-center">
          <div className="inline-block p-5 bg-slate-800 rounded-[2rem] mb-6 shadow-inner">
            <Fingerprint size={48} className="text-red-500" />
            {/* {mode === "ADMIN" ? (
              <Fingerprint size={48} className="text-red-500" />
            ) : mode === "BRANCH_MANAGER" ? (
              <Store size={48} className="text-red-500" />
            ) : (
              <User size={48} className="text-red-500" />
            )} */}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            دخول المدير
            {/* {mode === "BRANCH_MANAGER"
              ? "دخول المدير"
              : mode === "ADMIN"
              ? "صلاحيات الإدارة"
              : "تسجيل دخول"} */}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* تنبيه الخطأ العام */}
          {apiError && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-[11px] font-black uppercase text-center">
              {apiError}
            </div>
          )}

          {/* حقل المعرف الشخصي */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">
              المعرف الشخصي
            </label>
            <InputField
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="اسم المستخدم"
              error={errors.email}
            />
          </div>

          {/* حقل كلمة المرور */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">
              كلمة المرور
            </label>
            <InputField
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              error={errors.password}
            />
          </div>

          {/* {(mode === "BRANCH_MANAGER" ||
            mode === "DEPARTMENT_STAFF" ||
            mode === "ORDER_AGGREGATOR") && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">
                اختر الفرع
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full p-4 bg-slate-800 border border-white/5 rounded-2xl outline-none font-black text-sm text-white focus:ring-2 focus:ring-red-600 transition-all appearance-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )} */}

          {/* {mode === "DEPARTMENT_STAFF" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">
                اختر القسم
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                required
                className="w-full p-4 bg-slate-800 border border-white/5 rounded-2xl outline-none font-black text-sm text-white focus:ring-2 focus:ring-red-600 transition-all appearance-none"
              >
                <option value="">اختر القسم...</option>
                {departments
                  .filter((d) => d.branchId === selectedBranch)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
          )} */}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 bg-red-600 text-white hover:bg-red-700 transition-all shadow-red-900/20"
          >
            {loading ? <span className="spinner" /> : "→ دخول النظام الآمن"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginForm;
