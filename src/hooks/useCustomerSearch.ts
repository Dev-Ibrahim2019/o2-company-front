import { useEffect, useRef, useState } from "react";
import { customerService, type Customer } from "../services/customerService";

export function useCustomerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await customerService.list({ search: query, per_page: 10 });
        setResults(res?.data?.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (c: Customer) => {
    setSelected(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const clear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return { query, setQuery, results, open, setOpen, selected, select, clear, wrapRef };
}
