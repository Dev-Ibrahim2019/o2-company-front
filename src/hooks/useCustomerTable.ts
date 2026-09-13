/**
 * useCustomerTable.ts — Hook لجلب بيانات الطاولة عبر QR Code
 * ────────────────────────────────────────────────────────────
 * يستخدم عند فتح صفحة الزبون: /customer/:qrCode
 * يجلب بيانات الطاولة + المنيو من الباك-إند
 */
import { useState, useEffect, useCallback } from "react";
import {
  customerTableService,
  type CustomerTableInfo,
  type CustomerMenuCategory,
} from "../services/customerTableService";

type RestaurantInfo = {
  name: string;
  tagline?: string;
  currency: string;
  discountRate: number;
};

type UseCustomerTableResult = {
  table: CustomerTableInfo | null;
  categories: CustomerMenuCategory[];
  allItems: { id: number; name: string; name_ar: string; code: string; image?: string; image_url?: string; price: number; department_id: number; category_id: number; category_name: string }[];
  restaurant: RestaurantInfo;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useCustomerTable(qrCode: string | undefined): UseCustomerTableResult {
  const [table, setTable] = useState<CustomerTableInfo | null>(null);
  const [categories, setCategories] = useState<CustomerMenuCategory[]>([]);
  const [allItems, setAllItems] = useState<UseCustomerTableResult["allItems"]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantInfo>({
    name: "المطعم",
    currency: "₪",
    discountRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!qrCode) {
      setError("رمز QR غير صالح");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await customerTableService.lookupByQrCode(qrCode);

      setTable(response.table);
      setCategories(response.menu.categories);

      const flat = response.menu.categories.flatMap((cat) =>
        cat.items.map((item) => ({
          ...item,
          category_id: cat.id,
          category_name: cat.name_ar || cat.name,
        }))
      );
      setAllItems(flat);

      if (response.restaurant) {
        setRestaurant({
          name: response.restaurant.name,
          tagline: response.restaurant.tagline,
          currency: response.restaurant.currency,
          discountRate: response.restaurant.discount_rate,
        });
      }
    } catch (err: any) {
      console.error("🔴 [useCustomerTable] Error:", err);
      if (err.response?.status === 404) {
        setError("الطاولة غير موجودة أو رمز QR غير صحيح");
      } else {
        setError("فشل تحميل بيانات الطاولة");
      }
    } finally {
      setLoading(false);
    }
  }, [qrCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { table, categories, allItems, restaurant, loading, error, refetch: fetchData };
}
