// src/hooks/useCallCenterCall.ts
//
// Hook لإدارة دورة حياة المكالمة في الكول سنتر
// يستخدم CallProvider ويحافظ على حالات المكالمة الواضحة

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCallProvider,
  type CallEvent,
  type CallState,
} from "../services/callProvider";
import { sound } from "../services/soundService";
import { toast } from "../components/shared/Toast";

export type CallCenterPhase =
  | "waiting"      // في انتظار مكالمة
  | "incoming"     // مكالمة واردة ترن
  | "identifying"  // جاري التعرف على العميل
  | "ordering"     // جاري الطلب (POS مفتوح)
  | "completed"    // تم إتمام الطلب والمكالمة
  | "cancelled"    // ألغيت المكالمة
  | "missed";      // مكالمة فائتة

export interface CallSession {
  callId: string;
  callerNumber: string;
  phase: CallCenterPhase;
  startedAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration: number; // seconds
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
}

interface UseCallCenterCallReturn {
  session: CallSession | null;
  phase: CallCenterPhase;
  /** الرد على المكالمة */
  answer: () => Promise<void>;
  /** رفض المكالمة */
  reject: () => Promise<void>;
  /** إنهاء المكالمة */
  hangup: () => Promise<void>;
  /** تحويل المكالمة إلى ملحق آخر */
  transferCall: (target: string) => Promise<void>;
  /** تعيين العميل بعد التعرف عليه */
  setCustomer: (customerId: number, name: string, phone: string) => void;
  /** إعادة تعيين الحالة للانتظار */
  reset: () => void;
  /** محاكاة مكالمة واردة (للتطوير) */
  simulateCall: (phone: string) => void;
  /** وضع البريك (إجازة/استراحة) */
  isOnBreak: boolean;
  setBreak: (onBreak: boolean) => void;
}

export const useCallCenterCall = (): UseCallCenterCallReturn => {
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [session, setSession] = useState<CallSession | null>(null);
  const [phase, setPhase] = useState<CallCenterPhase>("waiting");
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const provider = getCallProvider();

  // تحديث المدة كل ثانية أثناء المكالمة
  useEffect(() => {
    if (phase === "ordering" && session) {
      durationRef.current = setInterval(() => {
        setSession((prev) => {
          if (!prev || !prev.answeredAt) return prev;
          return {
            ...prev,
            duration: Math.floor(
              (Date.now() - prev.answeredAt.getTime()) / 1000,
            ),
          };
        });
      }, 1000);
    } else {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    }
    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    };
  }, [phase, session?.answeredAt]);

  // الاستماع للمكالمات الواردة مع تشغيل الأصوات
  useEffect(() => {
    provider.startListening((call: CallEvent) => {
      if (call.state === "ringing") {
        // صوت رنين المكالمة
        sound.ringing();
        setSession({
          callId: call.id,
          callerNumber: call.callerNumber,
          phase: "incoming",
          startedAt: call.timestamp,
          duration: 0,
        });
        setPhase("incoming");
      } else if (call.state === "connected") {
        // صوت تم الرد على المكالمة
        sound.callConnected();
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phase: "identifying",
            answeredAt: new Date(),
            duration: 0,
          };
        });
        setPhase("identifying");
      } else if (call.state === "ended") {
        // صوت إنهاء المكالمة
        sound.callEnded();
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phase: "completed",
            endedAt: new Date(),
            duration: call.duration ?? prev.duration,
          };
        });
        setPhase("completed");
      } else if (call.state === "missed") {
        setPhase("missed");
        setSession((prev) => {
          if (!prev) return prev;
          return { ...prev, phase: "missed", endedAt: new Date() };
        });
      }
    });

    return () => {
      provider.stopListening();
    };
  }, [provider]);

  const answer = useCallback(async () => {
    if (!session || phase !== "incoming") return;
    await provider.answer(session.callId);
  }, [session, phase, provider]);

  const reject = useCallback(async () => {
    if (!session || phase !== "incoming") return;
    await provider.reject(session.callId);
  }, [session, phase, provider]);

  const hangup = useCallback(async () => {
    if (!session || phase !== "ordering") return;
    await provider.hangup(session.callId);
  }, [session, phase, provider]);

  const setCustomer = useCallback(
    (customerId: number, name: string, phone: string) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: "ordering",
          customerId,
          customerName: name,
          customerPhone: phone,
        };
      });
      setPhase("ordering");
    },
    [],
  );

  const reset = useCallback(() => {
    setSession(null);
    setPhase("waiting");
  }, []);

  const transferCall = useCallback(
    async (target: string) => {
      if (!session) return;
      await provider.transfer(session.callId, target);
      toast.success(`تم تحويل المكالمة إلى الملحق ${target}`);
      setTimeout(() => {
        reset();
      }, 2000);
    },
    [session, provider, reset],
  );

  const setBreak = useCallback(
    (onBreak: boolean) => {
      setIsOnBreak(onBreak);
      if (onBreak) {
        // عند تفعيل البريك، نوقف الاستماع للمكالمات الجديدة
        provider.stopListening();
        toast.info("تم تفعيل وضع الاستراحة - لن تستقبل مكالمات جديدة");
      } else {
        // عند إلغاء البريك، نبدأ الاستماع مجدداً
        // سيتم إعادة بدء الاستماع من useEffect
        toast.info("تم إلغاء وضع الاستراحة - أنت الآن جاهز لاستقبال المكالمات");
      }
    },
    [provider],
  );

  const simulateCall = useCallback(
    (phone: string) => {
      provider.simulateIncomingCall(phone);
    },
    [provider],
  );

  return {
    session,
    phase,
    answer,
    reject,
    hangup,
    transferCall,
    setCustomer,
    reset,
    simulateCall,
    isOnBreak,
    setBreak,
  };
};