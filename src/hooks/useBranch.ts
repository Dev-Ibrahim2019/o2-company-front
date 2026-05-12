// src/hooks/useBranch.ts
// ✅ إصلاح: الـ hook الآن يُرجع employees أيضاً

import { useState, useEffect, useCallback } from "react";
import { branchService, type Branch } from "../services/branchService";
import api from "../api/axios";

export const useBranch = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
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

  // ✅ جلب الموظفين
  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await api.get("/employees");
      setEmployees(data.data ?? []);
    } catch {
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    fetchEmployees();
  }, [fetchBranches, fetchEmployees]);

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
    employees, // ✅ مُضاف
    loading,
    error,
    addBranch,
    updateBranch,
    deleteBranch,
    refetch: fetchBranches,
  };
};
