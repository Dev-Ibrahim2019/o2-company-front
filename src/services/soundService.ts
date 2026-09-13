type SoundType = "success" | "error" | "warning" | "info" | "click" | "ringing" | "callConnected" | "callEnded";

let audioCtx: AudioContext | null = null;
const lastPlayed: Partial<Record<SoundType, number>> = {};
const THROTTLE_MS = 400;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.25,
) {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;

    const sustain = Math.min(0.04, duration * 0.3);
    const release = duration - sustain;

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.005);
    gain.gain.setValueAtTime(volume, t + sustain);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  } catch {
    // Audio not available
  }
}

function throttled(type: SoundType, fn: () => void) {
  const now = Date.now();
  if (now - (lastPlayed[type] ?? 0) < THROTTLE_MS) return;
  lastPlayed[type] = now;
  fn();
}

export const sound = {
  success() {
    throttled("success", () => {
      playTone(523.25, 0.14, "sine", 0.3);
      setTimeout(() => playTone(659.25, 0.14, "sine", 0.3), 80);
      setTimeout(() => playTone(783.99, 0.2, "sine", 0.3), 160);
    });
  },

  error() {
    throttled("error", () => {
      playTone(311.13, 0.18, "sawtooth", 0.2);
      setTimeout(() => playTone(233.08, 0.3, "sawtooth", 0.2), 180);
    });
  },

  warning() {
    throttled("warning", () => {
      playTone(440, 0.1, "triangle", 0.2);
      setTimeout(() => playTone(440, 0.1, "triangle", 0.2), 150);
      setTimeout(() => playTone(440, 0.18, "triangle", 0.15), 300);
    });
  },

  info() {
    throttled("info", () => {
      playTone(660, 0.08, "sine", 0.18);
      setTimeout(() => playTone(880, 0.16, "sine", 0.18), 100);
    });
  },

  click() {
    throttled("click", () => {
      playTone(1200, 0.03, "sine", 0.08);
    });
  },

  /** صوت رنين المكالمة الواردة - نغمتين متتاليتين */
  ringing() {
    throttled("ringing", () => {
      playTone(440, 0.25, "sine", 0.3);
      setTimeout(() => playTone(440, 0.25, "sine", 0.3), 300);
      setTimeout(() => playTone(440, 0.25, "sine", 0.3), 600);
      setTimeout(() => playTone(440, 0.25, "sine", 0.3), 900);
    });
  },

  /** صوت عند الرد على المكالمة */
  callConnected() {
    throttled("callConnected", () => {
      playTone(600, 0.08, "sine", 0.25);
      setTimeout(() => playTone(800, 0.12, "sine", 0.25), 80);
    });
  },

  /** صوت عند إنهاء المكالمة */
  callEnded() {
    throttled("callEnded", () => {
      playTone(500, 0.1, "sine", 0.2);
      setTimeout(() => playTone(400, 0.1, "sine", 0.2), 100);
      setTimeout(() => playTone(300, 0.2, "sine", 0.15), 200);
    });
  },

  init() {
    try {
      const ctx = getContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
    } catch {
      // Audio not available
    }
  },
};
