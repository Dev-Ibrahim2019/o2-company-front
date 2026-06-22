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
  const effectiveBranchId = branchId ?? getBranchId();

  const [resolvedBranchId, setResolvedBranchId] = useState<number | null>(effectiveBranchId);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    // لا نبدأ الفيتش إلا إذا كان branch_id متوفراً
    if (!effectiveBranchId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/menu", {
        params: { branch_id: effectiveBranchId },
      });
      // الاستجابة: { data: { categories: [...] } }
      const rawCategories = data?.data?.categories ?? data?.categories ?? [];
      setCategories(Array.isArray(rawCategories) ? rawCategories : []);
    } catch {
      setError("فشل تحميل المنيو");
    } finally {
      setLoading(false);
    }
  }, [effectiveBranchId]);

  // جلب branch_id من /auth/me إذا لم يكن متوفراً في localStorage
  const fetchBranchIdFromApi = useCallback(async () => {
    const token = getToken();
    if (!token) return null;

    try {
      const { data } = await api.get("/auth/me");
      const userData = data.user || data.data?.user || data;
      return userData.branch_id ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (effectiveBranchId) {
      setResolvedBranchId(effectiveBranchId);
    } else {
      // إذا لم يكن branch_id متوفراً، نحاول جلبه من API
      fetchBranchIdFromApi().then((apiBranchId) => {
        if (apiBranchId) {
          // حفظه في localStorage للمرات القادمة
          localStorage.setItem("branch_id", String(apiBranchId));
          setResolvedBranchId(apiBranchId);
        }
      });
    }
  }, [effectiveBranchId, fetchBranchIdFromApi]);

  useEffect(() => {
    if (resolvedBranchId) {
      fetchMenu();
    }
  }, [resolvedBranchId, fetchMenu]);

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
    refetch: fetchMenu,
    findByCode,
  };
};