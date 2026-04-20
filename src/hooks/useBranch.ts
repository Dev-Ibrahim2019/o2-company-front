// src/hooks/useDepartments.ts

import { useState, useEffect, useCallback } from "react";
import { branchService, type Branch } from "../services/branchService";

export const useBranch = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await branchService.getAll();
      setBranches(data);
    } catch {
      setError("فشل تحميل الافرع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const addBranch = async (payload: Omit<Branch, "id">) => {
    const newBranch = await branchService.create(payload);
    setBranches((prev) => [...prev, newBranch]);
  };

  const updateBranch = async (id: number, payload: Partial<Branch>) => {
    const updated = await branchService.update(id, payload);
    setBranches((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const deleteBranch = async (id: number) => {
    await branchService.delete(id);
    setBranches((prev) => prev.filter((d) => d.id !== id));
  };

  return {
    branches,
    loading,
    error,
    addBranch,
    updateBranch,
    deleteBranch,
    refetch: fetchBranches,
  };
};
