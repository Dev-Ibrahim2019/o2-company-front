// src/hooks/useDepartments.ts

import { useState, useEffect, useCallback } from "react";
import {
  departmentService,
  type Department,
} from "../services/departmentService";

export const useDepartments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await departmentService.getAll();
      setDepartments(data);
    } catch {
      setError("فشل تحميل الأقسام");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const addDepartment = async (payload: Omit<Department, "id">) => {
    const newDept = await departmentService.create(payload);
    setDepartments((prev) => [...prev, newDept]);
  };

  const updateDepartment = async (id: number, payload: Partial<Department>) => {
    const updated = await departmentService.update(id, payload);
    setDepartments((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d)),
    );
  };

  const deleteDepartment = async (id: number) => {
    await departmentService.delete(id);
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  return {
    departments,
    loading,
    error,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    refetch: fetchDepartments,
  };
};
