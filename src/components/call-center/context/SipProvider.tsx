import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { UserAgent, UserAgentRegisterer, Inviter, Invitation, SessionState } from "sip.js";
import api from "../../api/axios";

interface SipConfig {
  username: string;
  password: string;
  sipServer: string;
  domain?: string;
  transport?: "udp" | "tcp" | "tls";
  registerRefresh?: number;
  keepAlive?: number;
}

export interface SipAccount {
  id: number;
  account_name: string;
  username: string;
  sip_server: string;
  domain: string | null;
  transport: "udp" | "tcp" | "tls";
  register_refresh: number;
  keep_alive: number;
  is_active: boolean;
  is_registered: boolean;
}

interface SipContextType {
  isInitialized: boolean;
  isRegistered: boolean;
  isConnecting: boolean;
  error: string | null;
  activeAccount: SipAccount | null;
  initialize: (config: SipConfig) => Promise<void>;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  makeCall: (target: string) => Promise<void>;
  hangup: (callId: string) => Promise<void>;
  answer: (callId: string) => Promise<void>;
  reject: (callId: string) => Promise<void>;
  transfer: (callId: string, target: string) => Promise<void>;
  stop: () => Promise<void>;
  setActiveAccount: (account: SipAccount | null) => void;
  onIncomingCall?: (handler: (call: { callId: string; callerNumber: string; callerName?: string; session: Invitation }) => void) => () => void;
}

const SipContext = createContext<SipContextType | null>(null);

export const useSip = (): SipContextType => {
  const context = useContext(SipContext);
  if (!context) {
    throw new Error("useSip must be used within a SipProvider");
  }
  return context;
};

interface SipProviderProps {
  children: ReactNode;
}

export const SipProvider: React.FC<SipProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<SipAccount | null>(null);

  const userAgentRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<UserAgentRegisterer | null>(null);
  const incomingCallHandlersRef = useRef<Set<(call: any) => void>>(new Set());

  const initialize = useCallback(async (config: SipConfig) => {
    try {
      setIsConnecting(true);
      setError(null);

      // Stop existing user agent if any
      if (userAgentRef.current) {
        await userAgentRef.current.stop();
        userAgentRef.current = null;
      }
      if (registererRef.current) {
        registererRef.current = null;
      }

      const uri = UserAgent.makeURI(`sip:${config.username}@${config.domain || config.sipServer}`);
      if (!uri) {
        throw new Error("Failed to create SIP URI");
      }

      const wsUrl = `wss://${config.sipServer}:8089/ws`;

      const userAgent = new UserAgent({
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
      userAgent.delegate = {
        onInvite: (invitation: Invitation) => {
          const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const callerNumber = invitation.request.from.uri.user || "unknown";
          const callerName = invitation.request.from.displayName || callerNumber;

          incomingCallHandlersRef.current.forEach((handler) =>
            handler({ callId, callerNumber, callerName, session: invitation })
          );
        },
      };

      userAgent.stateChange.addListener((state) => {
        console.log(`[SIP] UserAgent state: ${state}`);
      });

      await userAgent.start();
      userAgentRef.current = userAgent;

      // Register
      const registerer = new UserAgentRegisterer(userAgent);
      registerer.stateChange.addListener((state) => {
        console.log(`[SIP] Registration state: ${state}`);
        setIsRegistered(state === "Registered");
      });

      await registerer.register();
      registererRef.current = registerer;

      setIsInitialized(true);
    } catch (err: any) {
      console.error("[SIP] Initialization error:", err);
      setError(err.message || "Failed to initialize SIP");
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const register = useCallback(async () => {
    if (!userAgentRef.current) {
      throw new Error("SIP not initialized");
    }

    try {
      const registerer = new UserAgentRegisterer(userAgentRef.current);
      registerer.stateChange.addListener((state) => {
        console.log(`[SIP] Registration state: ${state}`);
        setIsRegistered(state === "Registered");
      });

      await registerer.register();
      registererRef.current = registerer;
    } catch (err: any) {
      console.error("[SIP] Registration error:", err);
      setError(err.message || "Failed to register");
      throw err;
    }
  }, []);

  const unregister = useCallback(async () => {
    if (registererRef.current) {
      try {
        await registererRef.current.unregister();
      } catch (err) {
        console.warn("[SIP] Unregister error:", err);
      }
      registererRef.current = null;
    }
    setIsRegistered(false);
  }, []);

  const makeCall = useCallback(async (target: string) => {
    if (!userAgentRef.current) {
      throw new Error("SIP not initialized");
    }

    const targetUri = UserAgent.makeURI(`sip:${target}@${activeAccount?.domain || activeAccount?.sip_server || ""}`);
    if (!targetUri) {
      throw new Error("Failed to create target URI");
    }

    const inviter = new Inviter(userAgentRef.current, targetUri, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });

    await inviter.invite();
  }, [activeAccount]);

  const hangup = useCallback(async (callId: string) => {
    // In a real implementation, we'd need to track sessions by callId
    // For now, this is a placeholder
    console.log(`[SIP] Hanging up call ${callId}`);
  }, []);

  const answer = useCallback(async (callId: string) => {
    // In a real implementation, we'd need to track sessions by callId
    // For now, this is a placeholder
    console.log(`[SIP] Answering call ${callId}`);
  }, []);

  const reject = useCallback(async (callId: string) => {
    // In a real implementation, we'd need to track sessions by callId
    // For now, this is a placeholder
    console.log(`[SIP] Rejecting call ${callId}`);
  }, []);

  const transfer = useCallback(async (callId: string, target: string) => {
    // In a real implementation, we'd need to track sessions by callId
    // For now, this is a placeholder
    console.log(`[SIP] Transferring call ${callId} to ${target}`);
  }, []);

  const stop = useCallback(async () => {
    await unregister();
    if (userAgentRef.current) {
      await userAgentRef.current.stop();
      userAgentRef.current = null;
    }
    setIsInitialized(false);
  }, [unregister]);

  const onIncomingCall = useCallback((handler: (call: any) => void) => {
    incomingCallHandlersRef.current.add(handler);
    return () => {
      incomingCallHandlersRef.current.delete(handler);
    };
  }, []);

  const value: SipContextType = {
    isInitialized,
    isRegistered,
    isConnecting,
    error,
    activeAccount,
    initialize,
    register,
    unregister,
    makeCall,
    hangup,
    answer,
    reject,
    transfer,
    stop,
    setActiveAccount,
    onIncomingCall,
  };

  return <SipContext.Provider value={value}>{children}</SipContext.Provider>;
};
