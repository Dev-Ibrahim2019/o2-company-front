// src/services/jobTitleService.ts
import api from "../api/axios";

export interface JobTitle {
    id: number;
    name: string;
    description?: string;
    is_active?: boolean;
}

export interface JobTitlePayload {
    name: string;
    description?: string;
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