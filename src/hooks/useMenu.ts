// src/hooks/useMenu.ts
//
// يجيب المنيو من API حسب فرع المستخدم المسجل
// يُستخدم في POS — يُفلتر تلقائياً حسب فرع الكاشير

import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { getBranchId, getToken } from "../auth/authStorage";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: number;
  name: string;
  name_ar: string;
  code: string;
  image?: string;
  unit?: string;
  price: number; // السعر من pivot حسب الفرع
  department_id: number;
}

export interface MenuCategory {
  id: number;
  name: string;
  name_ar: string;
  icon: string;
  color: string;
  type: string;
  items: MenuItem[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useMenu = (branchId?: number | null) => {
  // نأخذ branch_id من: المعامل → localStorage
  const initialBranchId = branchId ?? getBranchId();

  const [resolvedBranchId, setResolvedBranchId] = useState<number | null>(
    initialBranchId,
  );
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/menu", {
        params: { branch_id: id },
      });
      // الاستجابة: { data: { categories: [...] } }
      const rawCategories = data?.data?.categories ?? data?.categories ?? [];
      setCategories(Array.isArray(rawCategories) ? rawCategories : []);
    } catch (err) {
      console.error("🔴 [useMenu] API Error:", err);
      setError("فشل تحميل المنيو");
    } finally {
      setLoading(false);
    }
  }, []);

  // جلب branch_id من /auth/me إذا لم يكن متوفراً في localStorage
  const fetchBranchIdFromApi = useCallback(async () => {
    const token = getToken();
    if (!token) return null;

    try {
      const { data } = await api.get("/auth/me");
      const userData = data.user || data.data?.user || data;
      const userId = userData.branch_id ?? null;
      return userId;
    } catch (err) {
      console.error("🔴 [useMenu] Failed to fetch branch_id:", err);
      return null;
    }
  }, []);

  // Effect 1: Resolve branchId
  useEffect(() => {
    if (initialBranchId) {
      setResolvedBranchId(initialBranchId);
    } else {
      // نعلّم إنه في جلب شغال قبل ما نطلق الطلب — وإلا Effect 3 (fallback) بيشتغل
      // بالتوازي بنفس اللحظة (loading لسا false) ويطلق /menu بدون فلترة فرع، وبيصير
      // في سباق بين الاستجابتين وممكن تظهر أسعار/أصناف فرع غلط حسب مين يوصل أخيراً.
      setLoading(true);
      // إذا لم يكن branch_id متوفراً، نحاول جلبه من API
      fetchBranchIdFromApi().then((apiBranchId) => {
        if (apiBranchId) {
          // حفظه في localStorage للمرات القادمة
          localStorage.setItem("branch_id", String(apiBranchId));
          setResolvedBranchId(apiBranchId);
        } else {
          console.warn(
            "🟡 [useMenu] No branch_id available, cannot fetch menu",
          );
          setLoading(false);
        }
      });
    }
  }, [initialBranchId, fetchBranchIdFromApi]);

  // Effect 2: Fetch menu when branchId is resolved
  useEffect(() => {
    if (resolvedBranchId) {
      fetchMenu(resolvedBranchId);
    }
  }, [resolvedBranchId, fetchMenu]);

  // Fetch on mount even if branchId is null (fallback)
  useEffect(() => {
    if (!resolvedBranchId && !loading) {
      // Try to fetch menu anyway without branch_id filter
      setLoading(true);
      console.warn(
        "🟡 [useMenu] No branch_id, fetching menu without branch filter",
      );
      api
        .get("/menu")
        .then(({ data }) => {
          const rawCategories =
            data?.data?.categories ?? data?.categories ?? [];
          setCategories(Array.isArray(rawCategories) ? rawCategories : []);
        })
        .catch((err) => {
          console.error("🔴 [useMenu] Fallback fetch failed:", err);
          setError("فشل تحميل المنيو");
        })
        .finally(() => setLoading(false));
    }
  }, [resolvedBranchId]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // كل الأصناف في قائمة مسطحة (للبحث والإضافة السريعة)
  const allItems: MenuItem[] = categories.flatMap((c) => c.items);

  // البحث بالكود أو الرقم
  const findByCode = (code: string): MenuItem | undefined =>
    allItems.find((i) => String(i.id) === code || i.code === code);

  return {
    categories,
    allItems,
    loading,
    error,
    refetch: () => resolvedBranchId && fetchMenu(resolvedBranchId),
    findByCode,
  };
};
