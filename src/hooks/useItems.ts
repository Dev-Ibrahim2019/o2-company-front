// src/hooks/useItems.ts

import { useState, useEffect, useCallback } from "react";
import {
  itemService,
  type ItemFromApi,
  type ItemPayload,
  type ItemFilters,
} from "../services/itemService";

interface UseItemsReturn {
  items: ItemFromApi[];
  loading: boolean;
  error: string | null;
  addItem: (payload: ItemPayload) => Promise<ItemFromApi>;
  updateItem: (
    id: number,
    payload: Partial<ItemPayload>,
  ) => Promise<ItemFromApi>;
  deleteItem: (id: number) => Promise<void>;
  refetch: (filters?: ItemFilters) => Promise<void>;
}

export const useItems = (initialFilters?: ItemFilters): UseItemsReturn => {
  const [items, setItems] = useState<ItemFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (filters?: ItemFilters) => {
    try {
      setLoading(true);
      setError(null);
      const data = await itemService.getAll(filters ?? initialFilters);
      setItems(data);
    } catch {
      setError("فشل تحميل الأصناف، يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addItem = async (payload: ItemPayload): Promise<ItemFromApi> => {
    const newItem = await itemService.create(payload);
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  };

  const updateItem = async (
    id: number,
    payload: Partial<ItemPayload>,
  ): Promise<ItemFromApi> => {
    const updated = await itemService.update(id, payload);
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    return updated;
  };

  const deleteItem = async (id: number): Promise<void> => {
    await itemService.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return { items, loading, error, addItem, updateItem, deleteItem, refetch };
};
