import { useCallback, useEffect, useRef, useState } from "react";
import { callCenterService, type SlotBoard } from "../components/call-center/services/callCenterService";
import { RELEASE_ANIMATION_MS, detectReleased, type ReleasingSlot } from "../components/call-center/slotBoardView";

// تحديث دوري كل 10 ثواني (بدل 30 لباقي الشاشة) لأن الخانة لازم تعكس الواقع بسرعة. الحل الأدق
// (WebSocket) هو الخطوة الجاية — هالـ hook هو المكان الوحيد اللي بيتغيّر لما نضيفه.
const POLL_MS = 10_000;

/**
 * لوحة الخانات لفرع: بتجلب الاستجابة وبتحدّثها دوريًا، وبتلقط الخانات اللي انحرّرت بين جلبين
 * (releasing) لعرض تلاشي "مدفوع" / وميض "ملغي" لثواني قبل ما تصير فاضية.
 */
export function useSlotBoard(branchId: number | null, enabled = true) {
  const [board, setBoard] = useState<SlotBoard | null>(null);
  const [releasing, setReleasing] = useState<Map<number, ReleasingSlot>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previous = useRef<SlotBoard | null>(null);
  const requestSeq = useRef(0);
  const releaseTimers = useRef<Set<number>>(new Set());

  const applyBoard = useCallback((next: SlotBoard) => {
    const released = detectReleased(previous.current, next);
    previous.current = next;
    setBoard(next);
    if (released.size === 0) return;

    setReleasing(prev => new Map([...prev, ...released]));
    const timer = window.setTimeout(() => {
      releaseTimers.current.delete(timer);
      setReleasing(prev => {
        const copy = new Map(prev);
        released.forEach((_, slotNumber) => copy.delete(slotNumber));
        return copy;
      });
    }, RELEASE_ANIMATION_MS);
    releaseTimers.current.add(timer);
  }, []);

  const refresh = useCallback(async () => {
    if (!branchId) return;
    const seq = ++requestSeq.current;
    try {
      setLoading(true);
      const res = await callCenterService.getSlotBoard(branchId);
      if (seq !== requestSeq.current) return; // رد قديم (تبدّل الفرع أو صار في طلب أحدث)
      applyBoard(res.data);
      setError(null);
    } catch (err: any) {
      if (seq !== requestSeq.current) return;
      setError(err?.response?.data?.message || "تعذر تحميل لوحة الخانات");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [branchId, applyBoard]);

  const setCapacity = useCallback(async (capacity: number) => {
    if (!branchId) return;
    const res = await callCenterService.updateSlotCapacity(branchId, capacity);
    applyBoard(res.data);
  }, [branchId, applyBoard]);

  // تبديل الفرع: صفّر كل شي عشان ما يظهر رد أو تلاشي من الفرع السابق
  useEffect(() => {
    requestSeq.current++;
    previous.current = null;
    setBoard(null);
    setReleasing(new Map());
    setError(null);
  }, [branchId]);

  useEffect(() => {
    if (!enabled || !branchId) return;
    void refresh();
    const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, POLL_MS);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, branchId, refresh]);

  useEffect(() => {
    const timers = releaseTimers.current;
    return () => { timers.forEach(t => window.clearTimeout(t)); timers.clear(); };
  }, []);

  return { board, releasing, loading, error, refresh, setCapacity };
}
