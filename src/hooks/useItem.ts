// src/hooks/useItems.ts

import { useState, useEffect, useCallback } from 'react';
import {
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    type Item,
    type ItemFormData,
} from '../services/itemService';

export const useItems = () => {
    const [items, setItems]     = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchItems();
            setItems(data);
            return data;
        } catch (e: any) {
            setError(e.response?.data?.message ?? 'فشل تحميل الأصناف');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const addItem = async (data: ItemFormData) => {
        const created = await createItem(data);
        await load();
        return created;
    };

    const editItem = async (id: number, data: Partial<ItemFormData>) => {
        const updated = await updateItem(id, data);
        await load();
        return updated;
    };

    const removeItem = async (id: number) => {
        await deleteItem(id);
        setItems(prev => prev.filter(i => i.id !== id));
    };

    return { items, loading, error, reload: load, addItem, editItem, removeItem };
};
