import { useState, useCallback, useRef } from "react";
import type { CustomerSearchResult, CustomerProfile, CustomerAlert, CustomerOrder, FavoriteItem } from "../services/callCenterService";
import { callCenterService } from "../services/callCenterService";

export function useCustomerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setQuery(q);

    if (!q || q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      try {
        const res = await callCenterService.searchCustomers(q.trim());
        setResults(res.data ?? []);
      } catch (err: any) {
        setError(err?.response?.data?.message || "فشل البحث");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    setLoading(false);
  }, []);

  return { query, setQuery: search, results, loading, error, clear };
}

export function useCustomerProfile() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [alerts, setAlerts] = useState<CustomerAlert[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (customerId: number) => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, alertsRes] = await Promise.all([
        callCenterService.getCustomerProfile(customerId),
        callCenterService.getCustomerAlerts(customerId),
      ]);
      setProfile(profileRes.data);
      setAlerts(alertsRes.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تحميل بيانات العميل");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async (customerId: number) => {
    try {
      const res = await callCenterService.getCustomerOrders(customerId);
      setOrders(res.data?.data ?? []);
    } catch { }
  }, []);

  const loadFavorites = useCallback(async (customerId: number) => {
    try {
      const res = await callCenterService.getCustomerFavorites(customerId);
      setFavorites(res.data ?? []);
    } catch { }
  }, []);

  const clear = useCallback(() => {
    setProfile(null);
    setAlerts([]);
    setOrders([]);
    setFavorites([]);
    setError(null);
  }, []);

  return { profile, alerts, orders, favorites, loading, error, loadProfile, loadOrders, loadFavorites, clear };
}
