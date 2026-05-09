// src/components/auth/LoginPage.tsx
//
// صفحة تسجيل الدخول الحقيقية — تتصل بالـ API

import React, { useState } from "react";
import { useAuthContext } from "../../contexts/AuthContext";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

const LoginPage: React.FC = () => {
    const { login, loading, error } = useAuthContext();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!email || !password) {
            setLocalError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
            return;
        }

        try {
            await login({ email, password });
            // بعد نجاح الدخول، الـ App سيعيد التوجيه تلقائياً لأن user أصبح موجوداً
        } catch (e: any) {
            setLocalError(e.message);
        }
    };

    const displayError = localError || error;

    return (
        <div
            className="min-h-screen bg-slate-950 flex items-center justify-center p-4"
            dir="rtl"
        >
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-red-900/30">
                        <span className="text-white font-black text-2xl">R</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        RestoMaster
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm font-bold">
                        نظام إدارة المطاعم المتكامل
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl">
                    <h2 className="text-xl font-black text-white mb-6">تسجيل الدخول</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                البريد الإلكتروني
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                autoComplete="email"
                                className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold"
                                disabled={loading}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold pl-12"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {displayError && (
                            <div className="bg-red-600/10 border border-red-600/20 rounded-xl px-4 py-3 text-red-400 text-sm font-bold">
                                {displayError}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    جاري تسجيل الدخول...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    دخول
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs mt-6 font-bold">
                    RestoMaster © {new Date().getFullYear()} — جميع الحقوق محفوظة
                </p>
            </div>
        </div>
    );
};

export default LoginPage;