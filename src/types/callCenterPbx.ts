// ── Call Status ──
export type CallStatus = "ringing" | "answered" | "on_hold" | "transferred" | "finished";
export type CallDirection = "inbound" | "outbound" | "internal";
export type CallDisposition =
  | "ANSWERED"
  | "NO ANSWER"
  | "BUSY"
  | "FAILED"
  | "CANCELLED"
  | "CONGESTION";

// ── Channel State ──
export type ChannelState =
  | "Down"
  | "Rsrvd"
  | "OffHook"
  | "Ring"
  | "Ringing"
  | "Up"
  | "Busy"
  | "Dialing"
  | "Callwaiting";

// ── Extension / Device Types ──
export type ExtensionTech = "pjsip" | "sip" | "iax2" | "custom";
export type DeviceType = "fixed" | "mobile" | "pjsip" | "sip";

// ── Agent Status ──
export type AgentStatus =
  | "available"
  | "busy"
  | "on_call"
  | "paused"
  | "offline"
  | "wrap_up";

// ── Queue Member Membership ──
export type QueueMembership = "dynamic" | "static";

// ── Blacklist ──
export type BlacklistEntry = {
  id: number;
  number: string;
  reason: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  status: "active" | "inactive";
};

// ── Live Call ──
export interface LiveCall {
  channel: string;
  channel_state: string;
  channel_state_text: string;
  caller_id_num: string;
  caller_id_name: string;
  connected_line_num: string;
  connected_line_name: string;
  application: string;
  application_data: string;
  context: string;
  duration: number;
  bridge_id: string;
  // Enriched data
  customer_name?: string;
  customer_id?: number;
  direction: CallDirection;
  queue?: string;
  agent?: string;
  agent_extension?: string;
  status: CallStatus;
  ringing_duration: number;
  talking_duration: number;
  branch?: string;
  has_recording: boolean;
  priority: "normal" | "vip" | "urgent";
}

// ── Queue ──
export interface QueueInfo {
  name: string;
  callscompleted: number;
  callscompletedabandoned: number;
  callsdropped: number;
  callswaiting: number;
  members: QueueMember[];
  // Computed
  available_agents: number;
  busy_agents: number;
  paused_agents: number;
  avg_waiting_time: number;
  longest_waiting: number;
  sla_percent: number;
  health: "healthy" | "warning" | "critical";
}

export interface QueueMember {
  memberName: string;
  membership: QueueMembership;
  paused: boolean;
  callsTaken: number;
  lastCall: string;
  penalty: number;
  // Enriched
  extension?: string;
  status?: AgentStatus;
  current_call?: LiveCall;
}

// ── CDR Record ──
export interface CdrRecord {
  id: string;
  unique_id: string;
  calldate: string;
  clid: string;
  src: string;
  dst: string;
  dcontext: string;
  channel: string;
  dst_channel: string;
  duration: number;
  billsec: number;
  disposition: CallDisposition;
  recordingfile: string;
  account_code: string;
  userfield: string;
  did: string;
  cnum: string;
  outbound_cnum: string;
  outbound_cnam: string;
  dst_cnam: string;
  lastapp: string;
  lastdata: string;
  amaflags: number;
  callstart: string;
  // Enriched
  caller_name?: string;
  caller_customer_id?: number;
  callee_name?: string;
  callee_customer_id?: number;
  direction: CallDirection;
  queue?: string;
  agent?: string;
}

// ── Extension ──
export interface Extension {
  id: string;
  extension_id: string;
  tech: ExtensionTech;
  user?: ExtensionUser;
  core_device?: CoreDevice;
}

export interface ExtensionUser {
  id: string;
  extension: string;
  name: string;
  outbound_cid: string;
  sipname: string;
  voicemail: string;
  callwaiting: string;
  donotdisturb: string;
  callforward_all: string;
}

export interface CoreDevice {
  id: string;
  device_id: string;
  tech: ExtensionTech;
  dial: string;
  device_type: DeviceType;
  description: string;
  emergency_cid: string;
}

// ── Agent Performance ──
export interface AgentPerformance {
  extension: string;
  name: string;
  status: AgentStatus;
  answered_calls: number;
  missed_calls: number;
  outgoing_calls: number;
  total_calls: number;
  avg_talk_time: number;
  avg_wrap_time: number;
  avg_wait_time: number;
  transferred_calls: number;
  longest_call: number;
  shortest_call: number;
  total_talk_time: number;
  total_idle_time: number;
  occupancy_rate: number;
  productivity_score: number;
  calls_today: number;
  hours_today: number;
  current_call?: LiveCall;
}

// ── Call Analytics ──
export interface CallAnalytics {
  total_calls: number;
  answered_calls: number;
  missed_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  internal_calls: number;
  avg_talk_time: number;
  avg_wait_time: number;
  avg_handle_time: number;
  calls_per_hour: { hour: number; count: number }[];
  calls_per_day: { date: string; count: number }[];
  disposition_breakdown: { disposition: string; count: number; percent: number }[];
  queue_performance: {
    queue: string;
    answered: number;
    abandoned: number;
    avg_wait: number;
    sla: number;
  }[];
  peak_hours: { hour: number; calls: number }[];
  busiest_days: { date: string; calls: number }[];
  top_agents: { extension: string; name: string; answered: number; avg_time: number }[];
  top_customers: { phone: string; name: string; calls: number; last_call: string }[];
  branch_comparison: { branch: string; calls: number; answered: number }[];
}

// ── Trunk ──
export interface Trunk {
  name: string;
  tech: string;
  status: "registered" | "unregistered" | "unknown";
  provider: string;
  registration_status: string;
  last_check: string;
  channel_count: number;
}

// ══════════════════════════════════════════════════════════════
//  Constants — Arabic labels & Tailwind color classes
// ══════════════════════════════════════════════════════════════

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  ringing: "رنين",
  answered: "تم الرد",
  on_hold: "في الانتظار",
  transferred: "تحويل",
  finished: "انتهت",
};

export const CALL_STATUS_COLORS: Record<CallStatus, string> = {
  ringing: "bg-blue-100 text-blue-700",
  answered: "bg-green-100 text-green-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  transferred: "bg-purple-100 text-purple-700",
  finished: "bg-gray-100 text-gray-700",
};

export const CALL_DIRECTION_LABELS: Record<CallDirection, string> = {
  inbound: "وارد",
  outbound: "صادر",
  internal: "داخلي",
};

export const CALL_DIRECTION_ICONS: Record<CallDirection, string> = {
  inbound: "arrow-down-left",
  outbound: "arrow-up-right",
  internal: "arrow-left-right",
};

export const DISPOSITION_LABELS: Record<CallDisposition, string> = {
  ANSWERED: "تم الرد",
  "NO ANSWER": "لم يتم الرد",
  BUSY: "مشغول",
  FAILED: "فشل",
  CANCELLED: "ملغي",
  CONGESTION: "ازدحام",
};

export const DISPOSITION_COLORS: Record<CallDisposition, string> = {
  ANSWERED: "bg-green-100 text-green-700",
  "NO ANSWER": "bg-yellow-100 text-yellow-700",
  BUSY: "bg-orange-100 text-orange-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-700",
  CONGESTION: "bg-red-100 text-red-700",
};

export const CHANNEL_STATE_LABELS: Record<ChannelState, string> = {
  Down: "غير نشط",
  Rsrvd: "محجوز",
  OffHook: "رفعت سماعة",
  Ring: "رنين",
  Ringing: "رنين",
  Up: "متصل",
  Busy: "مشغول",
  Dialing: "طلب اتصال",
  Callwaiting: "في الانتظار",
};

export const CHANNEL_STATE_COLORS: Record<ChannelState, string> = {
  Down: "bg-gray-100 text-gray-700",
  Rsrvd: "bg-blue-100 text-blue-700",
  OffHook: "bg-orange-100 text-orange-700",
  Ring: "bg-blue-100 text-blue-700",
  Ringing: "bg-blue-100 text-blue-700",
  Up: "bg-green-100 text-green-700",
  Busy: "bg-red-100 text-red-700",
  Dialing: "bg-yellow-100 text-yellow-700",
  Callwaiting: "bg-purple-100 text-purple-700",
};

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  available: "متاح",
  busy: "مشغول",
  on_call: "في مكالمة",
  paused: "متوقف",
  offline: "غير متصل",
  wrap_up: "إعداد المكالمة",
};

export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  available: "bg-green-100 text-green-700",
  busy: "bg-red-100 text-red-700",
  on_call: "bg-blue-100 text-blue-700",
  paused: "bg-yellow-100 text-yellow-700",
  offline: "bg-gray-100 text-gray-700",
  wrap_up: "bg-orange-100 text-orange-700",
};

export const EXTENSION_TECH_LABELS: Record<ExtensionTech, string> = {
  pjsip: "PJSIP",
  sip: "SIP",
  iax2: "IAX2",
  custom: "مخصص",
};

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  fixed: "ثابت",
  mobile: "محمول",
  pjsip: "PJSIP",
  sip: "SIP",
};

export const QUEUE_HEALTH_LABELS: Record<string, string> = {
  healthy: "سليم",
  warning: "تحذير",
  critical: "حرج",
};

export const QUEUE_HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  critical: "bg-red-100 text-red-700",
};

export const PRIORITY_LABELS: Record<string, string> = {
  normal: "عادي",
  vip: "مميز",
  urgent: "عاجل",
};

export const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-gray-100 text-gray-700",
  vip: "bg-yellow-100 text-yellow-700",
  urgent: "bg-red-100 text-red-700",
};

export const TRUNK_STATUS_LABELS: Record<string, string> = {
  registered: "مسجل",
  unregistered: "غير مسجل",
  unknown: "غير معروف",
};

export const TRUNK_STATUS_COLORS: Record<string, string> = {
  registered: "bg-green-100 text-green-700",
  unregistered: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-700",
};

// ══════════════════════════════════════════════════════════════
//  Helper Functions
// ══════════════════════════════════════════════════════════════

export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDurationArabic(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h} ساعة ${m} دقيقة ${s} ثانية`;
  }
  if (m > 0) {
    return `${m} دقيقة ${s} ثانية`;
  }
  return `${s} ثانية`;
}

export function formatTime(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("970") || cleaned.startsWith("972")) {
    const local = cleaned.slice(3);
    if (local.length === 9) {
      return `+${cleaned.slice(0, 3)} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString("ar-EG");
}
