import { useEffect, useRef } from "react";

/**
 * Like setInterval, but pauses while the tab is hidden/backgrounded so an
 * unattended POS/kitchen terminal stops polling the backend. Fires once
 * immediately when the tab becomes visible again to catch up.
 */
export function useVisibilityInterval(callback: () => void, delayMs: number | null) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (delayMs === null) return;

    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id !== null) return;
      id = setInterval(() => savedCallback.current(), delayMs);
    };
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };

    if (document.visibilityState === "visible") {
      start();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        savedCallback.current();
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [delayMs]);
}
