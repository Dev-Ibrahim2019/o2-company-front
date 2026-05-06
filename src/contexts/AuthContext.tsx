// src/contexts/AuthContext.tsx
//
// Context عالمي لبيانات المصادقة — يُغني عن تمرير user عبر props
// استخدامه: useAuthContext() في أي مكون

import React, { createContext, useContext } from "react";
import { useAuth } from "../hooks/useAuth";
import type { AuthUser, LoginPayload } from "../services/authService";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    login: (payload: LoginPayload) => Promise<void>;
    logout: () => Promise<void>;
    refetchUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const auth = useAuth();

    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuthContext = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuthContext must be used inside <AuthProvider>");
    }
    return ctx;
};

export default AuthContext;