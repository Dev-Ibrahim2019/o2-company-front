// src/services/jobTitleService.ts
import api from "../api/axios";
import type { OperationalRole } from "./employeeService";

export interface JobTitle {
    id: number;
    name: string;
    description?: string;
    name_ar?: string;
    name_en?: string;
    department_id?: number | null;
    department?: { id: number; name: string };
    default_operational_role?: OperationalRole;
    requires_vehicle?: boolean;
    is_active?: boolean;
}

export interface JobTitlePayload {
    name: string;
    description?: string;
    name_ar?: string;
    name_en?: string;
    department_id?: number | null;
    default_operational_role?: OperationalRole;
    requires_vehicle?: boolean;
    is_active?: boolean;
}

export const jobTitleService = {
    getAll: async (): Promise<JobTitle[]> => {
        const { data } = await api.get("/job-titles");
        return data.data;
    },

    create: async (payload: JobTitlePayload): Promise<JobTitle> => {
        const { data } = await api.post("/job-titles", payload);
        return data.data ?? data;
    },

    update: async (id: number, payload: Partial<JobTitlePayload>): Promise<JobTitle> => {
        const { data } = await api.put(`/job-titles/${id}`, payload);
        return data.data ?? data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/job-titles/${id}`);
    },
};
