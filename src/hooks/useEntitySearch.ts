import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api/axios";

export type EntityType = "customer" | "supplier" | "employee";

export interface EntityItem {
  id: number;
  name: string;
  code?: string;
  phone?: string;
  mobile?: string;
  balance?: number;
  is_over_limit?: boolean;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  customer: "عميل",
  supplier: "مورد",
  employee: "موظف",
};

const ENTITY_ENDPOINTS: Record<EntityType, string> = {
  customer: "/customers",
  supplier: "/suppliers",
  employee: "/employees",
};

export const getEntityLabel = (type: EntityType) => ENTITY_LABELS[type];

function mapResponse(raw: any, type: EntityType): EntityItem {
  return {
    id: raw.id,
    name: raw.name || raw.name_ar || "",
    code: raw.code || "",
    phone: raw.phone || raw.mobile || "",
    mobile: raw.mobile,
    balance: Number(raw.balance) || 0,
    is_over_limit: raw.is_over_limit ?? false,
  };
}

export function useEntitySearch() {
  const [entityType, setEntityType] = useState<EntityType>("customer");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntityItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<EntityItem | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear selection when entity type changes
  const changeEntityType = useCallback((type: EntityType) => {
    setEntityType(type);
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query || query.length < 1) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const endpoint = ENTITY_ENDPOINTS[entityType];
        const { data } = await api.get(endpoint, { params: { search: query, per_page: 15 } });
        const raw = data?.data?.data ?? data?.data ?? [];
        setResults(raw.map((it: any) => mapResponse(it, entityType)));
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, entityType]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = useCallback((item: EntityItem) => {
    setSelected(item);
    setQuery("");
    setResults([]);
    setOpen(false);
  }, []);

  const clear = useCallback(() => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }, []);

  // Numeric search: find by exact code/id
  const searchNumeric = useCallback(async (value: string): Promise<EntityItem | null> => {
    try {
      const endpoint = ENTITY_ENDPOINTS[entityType];
      const { data } = await api.get(endpoint, { params: { search: value } });
      const raw = data?.data?.data ?? data?.data ?? [];
      const items: EntityItem[] = raw.map((it: any) => mapResponse(it, entityType));
      return items.find((it) => String(it.id) === value || it.code === value) || null;
    } catch {
      return null;
    }
  }, [entityType]);

  return {
    entityType,
    setEntityType: changeEntityType,
    query,
    setQuery,
    results,
    open,
    setOpen,
    selected,
    select,
    clear,
    wrapRef,
    searchNumeric,
    ENTITY_LABELS,
  };
}
