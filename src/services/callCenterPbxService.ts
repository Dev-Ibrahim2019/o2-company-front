import api from "../api/axios";
import type {
  LiveCall,
  QueueInfo,
  CdrRecord,
  Extension,
  AgentPerformance,
  CallAnalytics,
  Trunk,
  BlacklistEntry,
} from "../types/callCenterPbx";

const BASE = "/pbx";

async function unwrap<T>(p: Promise<{ data: { data?: T } | T }>): Promise<T> {
  const { data } = await p;
  return (data as any).data !== undefined ? (data as any).data : (data as T);
}

export const callCenterPbxService = {
  // ── Live Calls ──
  getLiveCalls: () =>
    unwrap<{ calls: LiveCall[]; queues: QueueInfo[]; timestamp: string }>(
      api.get(`${BASE}/live-calls`)
    ),

  // ── CDR / Call History ──
  getCallHistory: (
    params?: {
      page?: number;
      per_page?: number;
      start_date?: string;
      end_date?: string;
      caller?: string;
      destination?: string;
      disposition?: string;
      direction?: string;
    }
  ) =>
    unwrap<{ data: CdrRecord[]; current_page: number; last_page: number; total: number }>(
      api.get(`${BASE}/cdr`, { params })
    ),

  getCdrById: (id: string) =>
    unwrap<CdrRecord>(api.get(`${BASE}/cdr/${id}`)),

  // ── Queues ──
  getQueues: () =>
    unwrap<QueueInfo[]>(api.get(`${BASE}/queues`)),

  getQueueByName: (name: string) =>
    unwrap<QueueInfo>(api.get(`${BASE}/queues/${encodeURIComponent(name)}`)),

  // ── Agents ──
  getAgents: () =>
    unwrap<AgentPerformance[]>(api.get(`${BASE}/agents`)),

  getAgentByExtension: (extension: string) =>
    unwrap<AgentPerformance>(api.get(`${BASE}/agents/${encodeURIComponent(extension)}`)),

  // ── Analytics ──
  getAnalytics: (
    params?: {
      period?: string;
      start_date?: string;
      end_date?: string;
    }
  ) =>
    unwrap<CallAnalytics>(api.get(`${BASE}/analytics`, { params })),

  // ── Extensions ──
  getExtensions: (
    params?: {
      page?: number;
      per_page?: number;
      search?: string;
    }
  ) =>
    unwrap<{ data: Extension[]; total: number }>(
      api.get(`${BASE}/extensions`, { params })
    ),

  getExtensionById: (id: string) =>
    unwrap<Extension>(api.get(`${BASE}/extensions/${id}`)),

  // ── Trunks ──
  getTrunks: () =>
    unwrap<Trunk[]>(api.get(`${BASE}/trunks`)),

  // ── Blacklist ──
  getBlacklist: (
    params?: {
      page?: number;
      search?: string;
    }
  ) =>
    unwrap<{ data: BlacklistEntry[]; total: number }>(
      api.get(`${BASE}/blacklist`, { params })
    ),

  addToBlacklist: (data: { number: string; reason: string }) =>
    unwrap<BlacklistEntry>(api.post(`${BASE}/blacklist`, data)),

  removeFromBlacklist: (id: number) =>
    unwrap<void>(api.delete(`${BASE}/blacklist/${id}`)),

  // ── Recordings ──
  getRecordings: (
    params?: {
      page?: number;
      per_page?: number;
      start_date?: string;
      end_date?: string;
    }
  ) =>
    unwrap<{ recordings: any[]; total: number }>(
      api.get(`${BASE}/recordings`, { params })
    ),

  playRecording: (fileName: string) =>
    `${api.defaults.baseURL}/pbx/recordings/${encodeURIComponent(fileName)}/play`,

  downloadRecording: (fileName: string) =>
    `${api.defaults.baseURL}/pbx/recordings/${encodeURIComponent(fileName)}/download`,
};
