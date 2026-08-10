import {
  UserAgent,
  UserAgentRegisterer,
  Inviter,
  Invitation,
  SessionState,
} from "sip.js";
import type { CallProvider, CallEvent, CallState } from "./callProvider";

export interface SipConfig {
  username: string;
  password: string;
  sipServer: string;
  domain?: string;
  transport?: "udp" | "tcp" | "tls";
  registerRefresh?: number;
  keepAlive?: number;
}

interface ActiveCall {
  session: Invitation | Inviter;
  startTime?: Date;
  callId: string;
}

export class SipCallProvider implements CallProvider {
  private userAgent: UserAgent | null = null;
  private registerer: UserAgentRegisterer | null = null;
  private listeners: Array<(call: CallEvent) => void> = [];
  private activeCalls: Map<string, ActiveCall> = new Map();
  private config: SipConfig | null = null;
  private isRegistered = false;
  private onRegistrationChange?: (registered: boolean) => void;

  constructor() {
    this.handleInvite = this.handleInvite.bind(this);
  }

  async initialize(
    config: SipConfig,
    callbacks?: {
      onRegistrationChange?: (registered: boolean) => void;
    }
  ): Promise<void> {
    this.config = config;
    this.onRegistrationChange = callbacks?.onRegistrationChange;

    const uri = UserAgent.makeURI(
      `sip:${config.username}@${config.domain || config.sipServer}`
    );
    if (!uri) {
      throw new Error("Failed to create SIP URI");
    }

    const wsUrl = `wss://${config.sipServer}:8089/ws`;

    this.userAgent = new UserAgent({
      uri,
      userAgent: "O2-CallCenter/1.0.0",
      transportOptions: {
        server: wsUrl,
        connectionTimeout: 10,
        maxReconnectionAttempts: 3,
        reconnectionTimeout: 3,
      },
      authorizationUsername: config.username,
      authorizationPassword: config.password,
      sessionDescriptionHandlerFactoryOptions: {
        constraints: {
          audio: true,
          video: false,
        },
      },
    });

    // Handle incoming invites
    this.userAgent.delegate = {
      onInvite: (invitation: Invitation) => {
        this.handleInvite({ invitation });
      },
    };

    this.userAgent.stateChange.addListener((state) => {
      console.log(`[SIP] UserAgent state: ${state}`);
    });

    await this.userAgent.start();
    console.log("[SIP] UserAgent started");
  }

  async register(): Promise<void> {
    if (!this.userAgent) {
      throw new Error("UserAgent not initialized");
    }

    this.registerer = new UserAgentRegisterer(this.userAgent);

    this.registerer.stateChange.addListener((state) => {
      console.log(`[SIP] Registration state: ${state}`);
      this.isRegistered = state === "Registered";
      this.onRegistrationChange?.(this.isRegistered);
    });

    await this.registerer.register();
    console.log("[SIP] Registration sent");
  }

  async unregister(): Promise<void> {
    if (this.registerer) {
      await this.registerer.unregister();
      this.registerer = null;
    }
  }

  async stop(): Promise<void> {
    await this.unregister();
    if (this.userAgent) {
      await this.userAgent.stop();
      this.userAgent = null;
    }
    this.activeCalls.clear();
    this.isRegistered = false;
  }

  startListening(onIncoming: (call: CallEvent) => void): void {
    this.listeners.push(onIncoming);
  }

  stopListening(): void {
    this.listeners = [];
  }

  async answer(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call || !(call.session instanceof Invitation)) {
      console.error(`[SIP] Cannot answer call ${callId}: not an invitation`);
      return;
    }

    const invitation = call.session;
    await invitation.accept();

    call.startTime = new Date();

    this.emit({
      id: callId,
      callerNumber: invitation.request.from.uri.user || "unknown",
      callerName: invitation.request.from.displayName,
      state: "connected",
      timestamp: new Date(),
    });

    console.log(`[SIP] Call ${callId} answered`);
  }

  async hangup(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      console.error(`[SIP] Cannot hangup call ${callId}: not found`);
      return;
    }

    const duration = call.startTime
      ? Math.floor((Date.now() - call.startTime.getTime()) / 1000)
      : 0;

    try {
      if (call.session instanceof Invitation) {
        await call.session.bye();
      } else if (call.session instanceof Inviter) {
        await call.session.bye();
      }
    } catch (err) {
      console.warn(`[SIP] Error hanging up call ${callId}:`, err);
    }

    this.activeCalls.delete(callId);

    this.emit({
      id: callId,
      callerNumber: "",
      state: "ended",
      timestamp: new Date(),
      duration,
    });

    console.log(`[SIP] Call ${callId} hung up, duration: ${duration}s`);
  }

  async reject(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call || !(call.session instanceof Invitation)) {
      console.error(`[SIP] Cannot reject call ${callId}: not an invitation`);
      return;
    }

    try {
      await call.session.reject();
    } catch (err) {
      console.warn(`[SIP] Error rejecting call ${callId}:`, err);
    }

    this.activeCalls.delete(callId);

    this.emit({
      id: callId,
      callerNumber: call.session.request.from.uri.user || "unknown",
      state: "missed",
      timestamp: new Date(),
    });

    console.log(`[SIP] Call ${callId} rejected`);
  }

  async transfer(callId: string, target: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call || !this.userAgent || !this.config) {
      console.error(`[SIP] Cannot transfer call ${callId}`);
      return;
    }

    const targetUri = UserAgent.makeURI(
      `sip:${target}@${this.config.domain || this.config.sipServer}`
    );
    if (!targetUri) {
      throw new Error("Failed to create transfer target URI");
    }

    const inviter = new Inviter(this.userAgent, targetUri, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });

    await inviter.invite();

    const duration = call.startTime
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

    console.log(`[SIP] Call ${callId} transferred to ${target}`);
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
      callerName: "Test Caller",
      state: "ringing",
      timestamp: new Date(),
    });
  }

  async makeCall(target: string): Promise<void> {
    if (!this.userAgent || !this.config) {
      throw new Error("SIP not initialized");
    }

    const targetUri = UserAgent.makeURI(
      `sip:${target}@${this.config.domain || this.config.sipServer}`
    );
    if (!targetUri) {
      throw new Error("Failed to create target URI");
    }

    const inviter = new Inviter(this.userAgent, targetUri, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });

    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    this.activeCalls.set(callId, { session: inviter, startTime: new Date() });

    inviter.stateChange.addListener((state) => {
      console.log(`[SIP] Outgoing call ${callId} state: ${state}`);

      if (state === SessionState.Established) {
        this.emit({
          id: callId,
          callerNumber: target,
          state: "connected",
          timestamp: new Date(),
        });
      } else if (state === SessionState.Terminated) {
        this.activeCalls.delete(callId);
        this.emit({
          id: callId,
          callerNumber: target,
          state: "ended",
          timestamp: new Date(),
        });
      }
    });

    await inviter.invite();

    this.emit({
      id: callId,
      callerNumber: target,
      state: "ringing",
      timestamp: new Date(),
    });
  }

  private handleInvite({ invitation }: { invitation: Invitation }): void {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const callerNumber = invitation.request.from.uri.user || "unknown";
    const callerName = invitation.request.from.displayName || callerNumber;

    console.log(`[SIP] Incoming call from ${callerNumber} (${callerName})`);

    this.activeCalls.set(callId, { session: invitation, callId });

    invitation.stateChange.addListener((state) => {
      console.log(`[SIP] Invitation state: ${state}`);

      if (state === SessionState.Terminated) {
        const call = this.activeCalls.get(callId);
        if (call) {
          const duration = call.startTime
            ? Math.floor((Date.now() - call.startTime.getTime()) / 1000)
            : 0;

          this.activeCalls.delete(callId);

          this.emit({
            id: callId,
            callerNumber,
            state: "ended",
            timestamp: new Date(),
            duration,
          });
        }
      }
    });

    this.emit({
      id: callId,
      callerNumber,
      callerName,
      state: "ringing",
      timestamp: new Date(),
    });
  }

  getIsRegistered(): boolean {
    return this.isRegistered;
  }

  private emit(event: CallEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
