import { useRef, useState, useCallback } from "react";
import api from "../api/axios";
import type { PickedItem } from "../components/sales-invoices/ItemPickerModal";

export function useItemSearch() {
  const [quickResults, setQuickResults] = useState<PickedItem[]>([]);
  const [quickOpenIdx, setQuickOpenIdx] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [activeRow, setActiveRow] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickWrapRef = useRef<HTMLDivElement[]>([]);

  const searchNumeric = useCallback(async (value: string): Promise<PickedItem[]> => {
    try {
      const { data } = await api.get("/items", { params: { search: value } });
      const raw = data?.data?.data ?? data?.data ?? [];
      return raw.map((it: any) => ({
        id: it.id,
        name: it.name || it.name_ar || "",
        name_ar: it.name_ar,
        code: it.code || "",
        price: Number(it.price) || 0,
        stock: it.stock_balance ?? it.quantity ?? undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  const handleInput = useCallback(
    (idx: number, value: string, onItemSelected: (idx: number, item: PickedItem) => void) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (!value) {
        setQuickOpenIdx(null);
        setQuickResults([]);
        return;
      }

      if (/^\d+$/.test(value)) {
        timerRef.current = setTimeout(async () => {
          const mapped = await searchNumeric(value);
          const exact = mapped.find((it) => it.code === value || String(it.id) === value);
          if (exact) {
            onItemSelected(idx, exact);
            return;
          }
          setQuickResults(mapped);
          setQuickOpenIdx(mapped.length > 0 ? idx : null);
        }, 350);
        return;
      }

      setModalQuery(value);
      setActiveRow(idx);
      setModalOpen(true);
    },
    [searchNumeric]
  );

  const closeQuick = useCallback(() => {
    setQuickOpenIdx(null);
    setQuickResults([]);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const openModalForRow = useCallback((idx: number, query?: string) => {
    setActiveRow(idx);
    setModalQuery(query || "");
    setModalOpen(true);
  }, []);

  return {
    quickResults,
    quickOpenIdx,
    setQuickOpenIdx,
    modalOpen,
    modalQuery,
    activeRow,
    quickWrapRef,
    handleInput,
    closeQuick,
    closeModal,
    openModalForRow,
  };
}
