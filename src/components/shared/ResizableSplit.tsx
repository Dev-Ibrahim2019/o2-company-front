import React, { useState, useRef, useCallback, useEffect } from "react";

export interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialLeftPercent?: number;
  minLeftPercent?: number;
  minRightPercent?: number;
  direction?: "horizontal" | "vertical";
  storageKey?: string;
  className?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// ملاحظة RTL: الحاوية الرئيسية بتاخد dir="ltr" بشكل صريح عشان حسابات المسافة (getBoundingClientRect)
// وترتيب left/right يبقى منطقي وثابت دايمًا (يسار = يسار فعليًا)، بغض النظر عن اتجاه الصفحة الأب.
// محتوى كل قسم (left/right) بيحافظ على اتجاهه الخاص (rtl) لأنه بيجي جاهز من الأب بـ dir مستقل.
export const ResizableSplit: React.FC<ResizableSplitProps> = ({
  left,
  right,
  initialLeftPercent = 50,
  minLeftPercent = 20,
  minRightPercent = 20,
  direction = "horizontal",
  storageKey,
  className = "",
}) => {
  const isHorizontal = direction === "horizontal";
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const clampPercent = useCallback(
    (value: number) => clamp(value, minLeftPercent, 100 - minRightPercent),
    [minLeftPercent, minRightPercent]
  );

  const readStored = useCallback((): number | null => {
    if (!storageKey) return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw != null ? parseFloat(raw) : NaN;
      return Number.isFinite(parsed) ? clampPercent(parsed) : null;
    } catch {
      return null;
    }
  }, [storageKey, clampPercent]);

  const [leftPercent, setLeftPercent] = useState<number>(() => readStored() ?? clampPercent(initialLeftPercent));
  const [isDragging, setIsDragging] = useState(false);

  const persist = useCallback(
    (value: number) => {
      if (!storageKey) return;
      try {
        window.localStorage.setItem(storageKey, String(value));
      } catch {
        // خاص/quota ممتلئ — تجاهل، مش حرج لوظيفة التقسيم نفسها
      }
    },
    [storageKey]
  );

  const updateFromClientPos = useCallback(
    (clientPos: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const size = isHorizontal ? rect.width : rect.height;
      const start = isHorizontal ? rect.left : rect.top;
      if (size <= 0) return;
      const next = clampPercent(((clientPos - start) / size) * 100);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setLeftPercent(next));
    },
    [isHorizontal, clampPercent]
  );

  const stopDragging = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    setLeftPercent(current => {
      persist(current);
      return current;
    });
  }, [persist]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      updateFromClientPos(isHorizontal ? e.clientX : e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || e.touches.length === 0) return;
      e.preventDefault();
      updateFromClientPos(isHorizontal ? e.touches[0].clientX : e.touches[0].clientY);
    };
    const handleEnd = () => stopDragging();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isHorizontal, updateFromClientPos, stopDragging]);

  const startDragging = () => {
    draggingRef.current = true;
    setIsDragging(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDragging();
  };

  const handleTouchStart = () => {
    startDragging();
  };

  const handleDoubleClick = () => {
    const reset = clampPercent(initialLeftPercent);
    setLeftPercent(reset);
    persist(reset);
  };

  return (
    <div
      ref={containerRef}
      dir="ltr"
      data-direction={direction}
      className={`resizable-split flex ${isHorizontal ? "flex-row" : "flex-col"} min-h-0 min-w-0 w-full h-full ${className}`}
    >
      <div
        className="resizable-split-pane h-full min-w-0 min-h-0 overflow-auto shrink-0"
        style={isHorizontal ? { width: `${leftPercent}%` } : { height: `${leftPercent}%` }}
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation={isHorizontal ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(leftPercent)}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        className={`resizable-split-divider group shrink-0 relative z-10 flex items-center justify-center select-none ${
          isHorizontal ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize"
        }`}
      >
        <div
          className={`rounded-full transition-all duration-150 ${
            isDragging ? "bg-red-600" : "bg-white/15 group-hover:bg-red-500/60"
          } ${
            isHorizontal
              ? `h-full ${isDragging ? "w-1" : "w-0.5 group-hover:w-1"}`
              : `w-full ${isDragging ? "h-1" : "h-0.5 group-hover:h-1"}`
          }`}
        />
      </div>

      <div className="resizable-split-pane flex-1 h-full min-w-0 min-h-0 overflow-auto">{right}</div>

      {/* أقل من 1024px (نفس نقطة الكسر "lg" المستخدمة بباقي التطبيق): تقسيم أفقي قابل للسحب مش منطقي
          على شاشة ضيقة، فبنرجع لتكديس عادي فوق بعض (بدون خط فاصل) بدل صف جنب بعض. CSS فقط، بدون
          أي منطق JS إضافي — القسمين وحالة السحب يفضلوا زي ما هم، بس العرض بيرجع تكديس عمودي طبيعي. */}
      {isHorizontal && (
        <style>{`
          @media (max-width: 1023px) {
            .resizable-split[data-direction="horizontal"] {
              flex-direction: column !important;
            }
            .resizable-split[data-direction="horizontal"] > .resizable-split-pane {
              width: 100% !important;
              height: auto !important;
              flex: none !important;
            }
            .resizable-split[data-direction="horizontal"] > .resizable-split-divider {
              display: none !important;
            }
          }
        `}</style>
      )}
    </div>
  );
};

export default ResizableSplit;
