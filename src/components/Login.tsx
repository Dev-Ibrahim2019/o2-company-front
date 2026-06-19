import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../store";
import { useAuth } from "../auth";
import {
  User,
  Lock,
  ArrowRightCircle,
  Users,
  ShoppingBag,
  ShieldCheck,
  Fingerprint,
  Store,
  HeartHandshake,
  ChefHat,
  Mail,
} from "lucide-react";

/**
 * خريطة تحويل أدوار API (lowercase) → أدوار Store (UPPERCASE)
 * ت确保 التوافق بين نظام الصلاحيات الجديد والـ UI الحالي
 */
const API_ROLE_TO_STORE_ROLE: Record<string, string> = {
  "super-admin": "ADMIN",
  "branch-manager": "BRANCH_MANAGER",
  "accountant": "FINANCE",
  "cashier": "CASHIER",
  "hospitality": "HOSPITALITY",
  "dept-staff": "DEPARTMENT_STAFF",
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login: storeLogin, branches, departments } = useApp();
  const { login: apiLogin, isLoggedIn } = useAuth();

  // ── حالات تسجيل الدخول عبر API ──
  const [apiMode, setApiMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiError, setApiError] = useState("");
  const [apiLoading, setApiLoading] = useState(false);

  // ── حالات تسجيل الدخول المحلي (القديمة) ──
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("b1");
  const [selectedDept, setSelectedDept] = useState("");
  const [mode, setMode] = useState<
    | "SELECT"
    | "API_LOGIN"
    | "CASHIER"
    | "CUSTOMER"
    | "ADMIN"
    | "BRANCH_MANAGER"
    | "HOSPITALITY"
    | "DEPARTMENT_STAFF"
    | "ORDER_AGGREGATOR"
  >("SELECT");

  // ── تحويل المستخدم حسب دوره ──
  const redirectByRole = (roles: string[]) => {
    const primary = roles[0] || "";
    if (primary === "super-admin" || primary === "accountant" || primary === "branch-manager") {
      navigate("/admin/dashboard", { replace: true });
    } else {
      navigate("/pos", { replace: true });
    }
  };

  // ── تسجيل الدخول عبر API ──
  const handleApiLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setApiLoading(true);

    try {
      await apiLogin(username, password);

      // بعد نجاح API login، اقرأ الأدوار من localStorage
      const storedRoles = JSON.parse(localStorage.getItem("roles") || "[]");
      const primaryRole = storedRoles[0] || "cashier";
      const storeRole = (API_ROLE_TO_STORE_ROLE[primaryRole] || "CASHIER") as any;

      // سجّل الدخول في الـ store أيضاً للحفاظ على التوافق
      storeLogin(username, storeRole);

      // 🚀 تحويل تلقائي حسب الدور
      redirectByRole(storedRoles);
    } catch (err: any) {
      setApiError(
        err.response?.data?.message || "خطأ في تسجيل الدخول. تحقق من البيانات."
      );
    } finally {
      setApiLoading(false);
    }
  };

  // ── تسجيل الدخول المحلي (القديم) ──
  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "CASHIER") storeLogin(name, "CASHIER");
    else if (mode === "ADMIN") storeLogin(name, "ADMIN");
    else if (mode === "BRANCH_MANAGER")
      storeLogin(name, "BRANCH_MANAGER", "", selectedBranch);
    else if (mode === "HOSPITALITY") storeLogin(name, "HOSPITALITY");
    else if (mode === "DEPARTMENT_STAFF")
      storeLogin(name, "DEPARTMENT_STAFF", "", selectedBranch, selectedDept);
    else if (mode === "ORDER_AGGREGATOR")
      storeLogin(name, "ORDER_AGGREGATOR", "", selectedBranch);
    else if (mode === ("EMPLOYEE" as any)) storeLogin(name, "EMPLOYEE");
    else storeLogin(name, "CUSTOMER", phone);
  };

  // ── شاشة اختيار الطريقة ──
  if (mode === "SELECT") {
    return (
      <div
        className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100"
        dir="rtl"
      >
        <div className="max-w-7xl w-full">
          <div className="text-center mb-16">
            <div className="w-24 h-24 bg-red-600 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black mx-auto mb-8 shadow-2xl rotate-3 shadow-red-600/20">
              <span>
                0<span className="relative top-2 text-4xl">2</span>
              </span>
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter">
              مطعم{" "}
              <span className="text-red-600">
                0<span className="relative top-2 text-4xl">2</span>
              </span>
            </h1>
            <p className="text-slate-500 mt-4 text-xl font-bold">
              منصة متقدمة ترتقي بإدارة المطاعم والضيافة إلى مستوى جديد
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* ── زر تسجيل الدخول عبر API (الجديد) ── */}
            <button
              onClick={() => setMode("API_LOGIN")}
              className="group bg-red-600 p-8 rounded-[3.5rem] text-white shadow-2xl flex flex-col items-center gap-6 hover:bg-red-700 transition-all"
            >
              <div className="w-16 h-16 bg-white/20 text-white rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Lock size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black">دخول آمن (API)</h3>
                <p className="text-[10px] text-white/60 mt-2 font-black uppercase tracking-widest">
                  تسجيل دخول حقيقي
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("CASHIER")}
              className="group bg-slate-900 p-8 rounded-[3.5rem] border-2 border-white/5 hover:border-red-600 transition-all shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 bg-slate-800 text-red-500 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">نقطة البيع</h3>
                <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">
                  إدارة الصندوق
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("HOSPITALITY")}
              className="group bg-slate-900 p-8 rounded-[3.5rem] border-2 border-white/5 hover:border-red-600 transition-all shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 bg-slate-800 text-red-500 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <HeartHandshake size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">قسم الضيافة</h3>
                <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">
                  خدمة الزبائن
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("BRANCH_MANAGER")}
              className="group bg-slate-900 p-8 rounded-[3.5rem] border-2 border-white/5 hover:border-red-600 transition-all shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 bg-slate-800 text-red-500 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">إدارة الفرع</h3>
                <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">
                  الرقابة الميدانية
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("DEPARTMENT_STAFF")}
              className="group bg-slate-900 p-8 rounded-[3.5rem] border-2 border-white/5 hover:border-red-600 transition-all shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 bg-slate-800 text-red-500 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChefHat size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">شاشة الأقسام</h3>
                <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">
                  إدارة التحضير
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("ORDER_AGGREGATOR")}
              className="group bg-slate-900 p-8 rounded-[3.5rem] border-2 border-white/5 hover:border-red-600 transition-all shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 bg-slate-800 text-red-500 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">مجمع الطلبات</h3>
                <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">
                  تجميع وتغليف
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("ADMIN")}
              className="group bg-red-600 p-8 rounded-[3.5rem] text-white shadow-2xl flex flex-col items-center gap-6 hover:bg-red-700 transition-all"
            >
              <div className="w-16 h-16 bg-white/20 text-white rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black">الإدارة العامة</h3>
                <p className="text-[10px] text-white/60 mt-2 font-black uppercase tracking-widest">
                  هيكل المؤسسة
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("EMPLOYEE" as any)}
              className="group bg-slate-900 p-8 rounded-[3.5rem] border-2 border-white/5 hover:border-red-600 transition-all shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 bg-slate-800 text-red-500 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <User size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">بوابة الموظف</h3>
                <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">
                  ملفي الشخصي
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("CUSTOMER")}
              className="group bg-slate-900 p-8 rounded-[3.5rem] border-2 border-white/5 hover:border-red-600 transition-all shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 bg-slate-800 text-red-500 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">بوابة الزبون</h3>
                <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">
                  طلب ذكي
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── نموذج تسجيل الدخول عبر API ──
  if (mode === "API_LOGIN") {
    return (
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
              <Lock size={48} className="text-red-500" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              تسجيل الدخول الآمن
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-bold">
              أدخل بيانات حسابك للوصول إلى النظام
            </p>
          </div>

          {apiError && (
            <div className="bg-red-600/20 text-red-400 p-4 rounded-2xl text-sm font-bold text-center">
              {apiError}
            </div>
          )}

          <form onSubmit={handleApiLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">
                اسم المستخدم
              </label>
              <div className="relative">
                <User
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 bg-slate-800 border border-white/5 rounded-2xl outline-none font-black text-sm text-white focus:ring-2 focus:ring-red-600 transition-all"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 bg-slate-800 border border-white/5 rounded-2xl outline-none font-black text-sm text-white focus:ring-2 focus:ring-red-600 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={apiLoading}
              className="w-full py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 bg-red-600 text-white hover:bg-red-700 transition-all shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {apiLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الدخول...
                </>
              ) : (
                "دخول النظام الآمن"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── نماذج الدخول المحلي (الأصلي) ──
  return (
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
            {mode === "ADMIN" ? (
              <Fingerprint size={48} className="text-red-500" />
            ) : mode === "BRANCH_MANAGER" ? (
              <Store size={48} className="text-red-500" />
            ) : (
              <User size={48} className="text-red-500" />
            )}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            {mode === "BRANCH_MANAGER"
              ? "دخول المدير"
              : mode === "ADMIN"
                ? "صلاحيات الإدارة"
                : "تسجيل دخول"}
          </h1>
        </div>

        <form onSubmit={handleLocalSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">
              المعرف الشخصي
            </label>
            <div className="relative">
              <User
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pr-12 pl-4 py-4 bg-slate-800 border border-white/5 rounded-2xl outline-none font-black text-sm text-white focus:ring-2 focus:ring-red-600 transition-all"
                placeholder="أدخل اسمك"
              />
            </div>
          </div>

          {(mode === "BRANCH_MANAGER" ||
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
            )}

          {mode === "DEPARTMENT_STAFF" && (
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
          )}

          <button
            type="submit"
            className="w-full py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 bg-red-600 text-white hover:bg-red-700 transition-all shadow-red-900/20"
          >
            دخول النظام الآمن
          </button>
        </form>
      </div>
    </div>
  );
};