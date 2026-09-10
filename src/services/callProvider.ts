// src/services/callProvider.ts
//
// طبقة مجردة لإدارة المكالمات (Call Provider Abstraction)
// تفصل منطق الاتصالات عن واجهة المستخدم
// تدعم حالياً Mock Data، وجاهزة للربط مع FreePBX/AMI/WebSocket لاحقاً

export type CallState = "idle" | "ringing" | "connected" | "ended" | "missed";

export interface CallEvent {
  id: string;
  callerNumber: string;
  callerName?: string;
  state: CallState;
  timestamp: Date;
  duration?: number; // seconds
}

export interface CallProvider {
  /** بدء الاستماع للمكالمات الواردة */
  startListening: (onIncoming: (call: CallEvent) => void) => void;
  /** إيقاف الاستماع */
  stopListening: () => void;
  /** الرد على المكالمة */
  answer: (callId: string) => Promise<void>;
  /** إنهاء المكالمة */
  hangup: (callId: string) => Promise<void>;
  /** رفض المكالمة */
  reject: (callId: string) => Promise<void>;
  /** تحويل المكالمة إلى رقم/ملحق آخر */
  transfer: (callId: string, target: string) => Promise<void>;
  /** الحصول على مدة المكالمة بالثواني */
  getDuration: (callId: string) => number;
  /** محاكاة مكالمة واردة (للتطوير) */
  simulateIncomingCall: (phoneNumber: string) => void;
}

// ── قائمة الملحقات الداخلية (Internal Extensions) ────────────────────────────
export interface CallCenterExtension {
  number: string;
  name: string;
  status: "available" | "busy" | "break";
}

export const DEFAULT_EXTENSIONS: CallCenterExtension[] = [
  { number: "202", name: "موظف 1", status: "available" },
  { number: "210", name: "موظف 2", status: "available" },
  { number: "222", name: "موظف 3", status: "available" },
  { number: "555", name: "مشرف", status: "available" },
];

// ── Mock Provider ────────────────────────────────────────────────────────────

class MockCallProvider implements CallProvider {
  private listeners: Array<(call: CallEvent) => void> = [];
  private activeCalls: Map<string, { startTime?: Date }> = new Map();

  startListening(onIncoming: (call: CallEvent) => void): void {
    this.listeners.push(onIncoming);
  }

  stopListening(): void {
    this.listeners = [];
  }

  async answer(callId: string): Promise<void> {
    this.activeCalls.set(callId, { startTime: new Date() });
    this.emit({
      id: callId,
      callerNumber: "",
      state: "connected",
      timestamp: new Date(),
    });
  }

  async hangup(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    const duration = call?.startTime
      ? Math.floor((Date.now() - call.startTime.getTime()) / 1000)
      : 0;
    this.activeCalls.delete(callId);
    this.emit({
      id: callId,
      callerNumber: "",
      state: "ended",
      timestamp: new Date(),
      duration,
    });
  }

  async reject(callId: string): Promise<void> {
    this.activeCalls.delete(callId);
    this.emit({
      id: callId,
      callerNumber: "",
      state: "missed",
      timestamp: new Date(),
    });
  }

  async transfer(callId: string, _target: string): Promise<void> {
    // محاكاة تحويل المكالمة - تنهي المكالمة الحالية
    const call = this.activeCalls.get(callId);
    const duration = call?.startTime
      ? Math.floor((Date.now() - call.startTime.getTime()) / 1000)
      : 0;
    this.activeCalls.delete(callId);
    this.emit({
      id: callId,
      callerNumber: "",
      state: "ended",
      timestamp: new Date(),
      duration,
    });
  }

  getDuration(callId: string): number {
    const call = this.activeCalls.get(callId);
    if (!call?.startTime) return 0;
    return Math.floor((Date.now() - call.startTime.getTime()) / 1000);
  }

  simulateIncomingCall(phoneNumber: string): void {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.emit({
      id: callId,
      callerNumber: phoneNumber,
      state: "ringing",
      timestamp: new Date(),
    });
  }

  private emit(event: CallEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

let instance: CallProvider | null = null;

export const getCallProvider = (): CallProvider => {
  if (!instance) {
    instance = new MockCallProvider();
  }
  return instance;
};

/** لإعادة تعيين المزود (للاستخدام في المستقبل مع FreePBX) */
export const setCallProvider = (provider: CallProvider): void => {
  if (instance) {
    instance.stopListening();
  }
  instance = provider;
};
