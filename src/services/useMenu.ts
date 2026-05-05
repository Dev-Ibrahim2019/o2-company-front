// src/hooks/useMenu.ts
//
// يجيب المنيو من API حسب branch_id
// يُستخدم في POS بدل MENU_ITEMS الثابتة

import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";

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

export const useMenu = (branchId: number | null) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    if (!branchId) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/menu", {
        params: { branch_id: branchId },
      });
      setCategories(data.data?.categories ?? []);
    } catch {
      setError("فشل تحميل المنيو");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

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
