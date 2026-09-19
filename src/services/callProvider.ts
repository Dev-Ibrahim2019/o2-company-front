// src/services/callProvider.ts
//
// طبقة مجردة لإدارة المكالمات (Call Provider Abstraction)
// تفصل منطق الاتصالات عن واجهة المستخدم
// تدعم Mock Data وSipCallProvider للربط مع FreePBX

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

// ── Provider Type ─────────────────────────────────────────────────────────────
export type ProviderType = "mock" | "sip";

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

  async transfer(callId: string, target: string): Promise<void> {
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
    console.log(`📞 تم تحويل المكالمة ${callId} إلى الملحق ${target}`);
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
let currentProviderType: ProviderType = "mock";

/**
 * Get the current call provider instance.
 * Returns MockCallProvider by default, or SipCallProvider if initialized.
 */
export const getCallProvider = (): CallProvider => {
  if (!instance) {
    instance = new MockCallProvider();
  }
  return instance;
};

/**
 * Set the call provider instance.
 * Used to swap between MockCallProvider and SipCallProvider.
 */
export const setCallProvider = (provider: CallProvider): void => {
  if (instance) {
    instance.stopListening();
  }
  instance = provider;
};

/**
 * Get the current provider type
 */
export const getProviderType = (): ProviderType => currentProviderType;

/**
 * Set the provider type (for switching between mock and SIP)
 */
export const setProviderType = (type: ProviderType): void => {
  currentProviderType = type;
};

/**
 * Initialize SIP provider with configuration
 */
export const initializeSipProvider = async (config: {
  username: string;
  password: string;
  sipServer: string;
  domain?: string;
  transport?: "udp" | "tcp" | "tls";
  registerRefresh?: number;
  keepAlive?: number;
}): Promise<void> => {
  const { SipCallProvider } = await import("./sipCallProvider");
  const sipProvider = new SipCallProvider();
  await sipProvider.initialize(config, {
    onRegistrationChange: (registered) => {
      console.log(`[CallProvider] SIP registration changed: ${registered}`);
    },
  });
  await sipProvider.register();
  setCallProvider(sipProvider);
  currentProviderType = "sip";
};

/**
 * Switch back to mock provider
 */
export const useMockProvider = (): void => {
  const mockProvider = new MockCallProvider();
  setCallProvider(mockProvider);
  currentProviderType = "mock";
};
