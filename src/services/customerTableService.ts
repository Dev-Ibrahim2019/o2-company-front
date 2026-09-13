/**
 * customerTableService.ts — خدمة جلب بيانات الطاولة للزبائن (عامة)
 * ──────────────────────────────────────────────────────────────────
 * تُستخدم من صفحة الزبون عند مسح QR Code
 * لا تحتاج تسجيل دخول
 */
import publicApi from "../api/publicAxios";

// ── أنواع البيانات ────────────────────────────────────────────────────────────

export interface CustomerMenuItem {
  id: number;
  name: string;
  name_ar: string;
  code: string;
  image?: string;
  unit?: string;
  price: number;
  department_id: number;
}

export interface CustomerMenuCategory {
  id: number;
  name: string;
  name_ar: string;
  icon: string;
  color: string;
  type: string;
  items: CustomerMenuItem[];
}

export interface CustomerTableInfo {
  id: string;
  table_number: string;
  status: string;
  capacity: number;
  hall_name: string;
  hall_id: string;
  branch_id: number;
  branch_name: string;
}

export interface CustomerTableResponse {
  table: CustomerTableInfo;
  menu: {
    categories: CustomerMenuCategory[];
    total_items: number;
  };
  restaurant: {
    name: string;
    tagline?: string;
    currency: string;
    discount_rate: number;
  };
}

// ── الخدمة ────────────────────────────────────────────────────────────────────

// ── أنواع بيانات الطلب النشط ───────────────────────────────────────────────

export interface ActiveOrderItem {
  item_id: number;
  item_name: string;
  item_name_ar: string;
  quantity: number;
  price: number;
  total: number;
  notes: string | null;
}

export interface ActiveOrder {
  order_id: number;
  order_number: string;
  status: string;
  subtotal: number;
  discount_value: number;
  discount_amount: number;
  total: number;
  items: ActiveOrderItem[];
  created_at: string;
}

// ── الخدمة ────────────────────────────────────────────────────────────────────

export const customerTableService = {
  /**
   * جلب بيانات الطاولة والمنيو عبر QR Code
   * @param qrCode الرمز المميز للطاولة (مثل SO7RZLHK)
   */
  lookupByQrCode: async (qrCode: string): Promise<CustomerTableResponse> => {
    const { data } = await publicApi.get(`/customer/table/${qrCode}`);
    // الباك-إند يُرجع: { data: { table, menu, restaurant } }
    return data.data as CustomerTableResponse;
  },

  /**
   * جلب الطلب النشط للطاولة (إن وجد)
   * GET /api/customer/table/{qrCode}/active-order
   * @param qrCode الرمز المميز للطاولة
   */
  getActiveOrder: async (qrCode: string): Promise<ActiveOrder | null> => {
    const { data } = await publicApi.get(`/customer/table/${qrCode}/active-order`);
    if (data.success && data.data) {
      return data.data as ActiveOrder;
    }
    return null;
  },
};
