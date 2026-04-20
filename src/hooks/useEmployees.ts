// src/hooks/useEmployees.ts
//
// Hook مركزي يُدير حالة الموظفين + CRUD كامل.
// يُستخدَم مباشرةً داخل EmployeeManagement.

import { useState, useEffect, useCallback } from "react";
import {
  employeeService,
  type EmployeeFromApi,
  type EmployeePayload,
  type EmployeeFilters,
} from "../services/employeeService";

interface UseEmployeesReturn {
  employees: EmployeeFromApi[];
  loading: boolean;
  error: string | null;
  addEmployee: (payload: EmployeePayload) => Promise<EmployeeFromApi>;
  updateEmployee: (
    id: number,
    payload: Partial<EmployeePayload>,
  ) => Promise<EmployeeFromApi>;
  deleteEmployee: (id: number) => Promise<void>;
  refetch: (filters?: EmployeeFilters) => Promise<void>;
}

export const useEmployees = (
  initialFilters?: EmployeeFilters,
): UseEmployeesReturn => {
  const [employees, setEmployees] = useState<EmployeeFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const refetch = useCallback(async (filters?: EmployeeFilters) => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getAll(filters ?? initialFilters);
      setEmployees(data);
    } catch {
      setError("فشل تحميل قائمة الموظفين، يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const addEmployee = async (
    payload: EmployeePayload,
  ): Promise<EmployeeFromApi> => {
    const newEmployee = await employeeService.create(payload);
    setEmployees((prev) => [newEmployee, ...prev]);
    return newEmployee;
  };

  const updateEmployee = async (
    id: number,
    payload: Partial<EmployeePayload>,
  ): Promise<EmployeeFromApi> => {
    const updated = await employeeService.update(id, payload);
    setEmployees((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e)),
    );
    return updated;
  };

  const deleteEmployee = async (id: number): Promise<void> => {
    await employeeService.delete(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  return {
    employees,
    loading,
    error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refetch,
  };
};
