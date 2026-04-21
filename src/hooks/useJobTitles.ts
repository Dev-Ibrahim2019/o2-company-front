// src/hooks/useJobTitles.ts

import { useState, useEffect, useCallback } from "react";
import {
  jobTitleService,
  type JobTitle,
  type JobTitlePayload,
} from "../services/jobTitleService";

export const useJobTitles = () => {
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobTitles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobTitleService.getAll();
      setJobTitles(data);
    } catch {
      setError("فشل تحميل المسميات الوظيفية");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobTitles();
  }, [fetchJobTitles]);

  const addJobTitle = async (payload: JobTitlePayload): Promise<JobTitle> => {
    const newItem = await jobTitleService.create(payload);
    setJobTitles((prev) => [...prev, newItem]);
    return newItem;
  };

  const updateJobTitle = async (
    id: number,
    payload: Partial<JobTitlePayload>,
  ): Promise<JobTitle> => {
    const updated = await jobTitleService.update(id, payload);
    setJobTitles((prev) =>
      prev.map((j) => (j.id === updated.id ? updated : j)),
    );
    return updated;
  };

  const deleteJobTitle = async (id: number): Promise<void> => {
    await jobTitleService.delete(id);
    setJobTitles((prev) => prev.filter((j) => j.id !== id));
  };

  return {
    jobTitles,
    loading,
    error,
    addJobTitle,
    updateJobTitle,
    deleteJobTitle,
    refetch: fetchJobTitles,
  };
};
