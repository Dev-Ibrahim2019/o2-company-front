// src/services/menuService.ts
//
// يجلب المنيو من الباك-إيند بدل constants
// يُستخدم في POS بدل MENU_ITEMS و CATEGORIES

import api from "../api/axios";

// ── أنواع البيانات ────────────────────────────────────────────────────────────

export interface ApiMenuItem {
  id: number;
  name: string;
  name_ar: string;
  code: string;
  image: string | null;
  unit: string | null;
  price: number | null; // السعر من pivot (branch_item)
  department_id: number;
}

export interface ApiMenuCategory {
  id: number;
  name: string;
  name_ar: string;
  icon: string;
  color: string;
  type: string;
  items: ApiMenuItem[];
}

export interface MenuResponse {
  categories: ApiMenuCategory[];
  total_items: number;
}

// ── الخدمة ────────────────────────────────────────────────────────────────────

export const menuService = {
  /**
   * جلب المنيو الكامل
   * @param branchId اختياري - إذا مُرِّر يُرجع السعر الخاص بالفرع
   */
  getMenu: async (branchId?: number): Promise<MenuResponse> => {
    const params = branchId ? { branch_id: branchId } : {};
    const { data } = await api.get("/menu", { params });
    // الباك-إيند يُرجع { data: { categories, total_items }, message, status }
    return data.data as MenuResponse;
  },
};
