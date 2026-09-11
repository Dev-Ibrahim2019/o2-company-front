import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingCart, RefreshCw, Loader2, Search, AlertCircle,
  LayoutGrid, Rows3, Grid2x2,
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { callCenterService, type ActiveCallCenterOrder, type ActiveOrderScope } from "../services/callCenterService";
import { employeeService, type EmployeeFromApi } from "../../../services/employeeService";
import { orderService } from "../../../services/orderService";
import { toast } from "../../shared/Toast";
import {
  dedupeActiveOrders, deriveWorkflowStage, getOrderSlaLevel, type WorkflowStage,
} from "../activeOrdersView";
import { OrderSummaryBar } from "../components/OrderSummaryBar";
import { OrderFiltersBar, type OrderFilterValue } from "../components/OrderFiltersBar";
import { DriverSection, deriveDriverStatus } from "../components/DriverSection";
import { OrderCard, type CardDensity } from "../components/OrderCard";

// مدة التحضير الافتراضية (بالدقائق) قبل موعد الطلب المجدول — تنبيه بصري فقط لمن يشاهد الشاشة
// حاليًا؛ التنفيذ الفعلي (إرسال للأقسام + طباعة) من الباك اند عبر orders:execute-scheduled.
const SCHEDULED_PREP_MINUTES = 20;

const PAGE_SIZE = 24;
const DENSITY_STORAGE_KEY = "o2-cc-orders-density";

const emptyGroups = (): Record<ActiveOrderScope, ActiveCallCenterOrder[]> => ({
  operational_active: [], awaiting_payment: [], kitchen_active: [], delivery_active: [], no_branch: [],
});

const emptyStageCounts = (): Record<WorkflowStage, number> => ({
  new: 0, preparing: 0, ready: 0, out_for_delivery: 0, completed: 0,
});

// ============================================================================
// ACTIVE ORDERS PAGE — مركز تحكم تشغيلي: ملخص مضغوط، قسم سائقين، فلاتر حالة واضحة، شبكة كروت
// بكثافة قابلة للضبط، وترقيم صفحات بدل تحميل كل شي دفعة وحدة لو العدد كبير.
// ============================================================================

export const ActiveOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Record<ActiveOrderScope, ActiveCallCenterOrder[]>>(emptyGroups());
  const [drivers, setDrivers] = useState<EmployeeFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<OrderFilterValue>("all");
  const [density, setDensity] = useState<CardDensity>(() => {
    try { return (localStorage.getItem(DENSITY_STORAGE_KEY) as CardDensity) || "normal"; } catch { return "normal"; }
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await callCenterService.getActiveOrders();
      setOrders(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل الطلبات النشطة");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const list = await employeeService.getAll({ operational_role: "delivery_driver" });
      setDrivers(list);
    } catch { /* قسم السائقين اختياري بصريًا — فشل جلبه ما يوقف الصفحة */ }
  }, []);

  useEffect(() => { fetchOrders(); fetchDrivers(); }, [fetchOrders, fetchDrivers]);

  useEffect(() => {
    const interval = setInterval(() => { fetchOrders(); fetchDrivers(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchDrivers]);

  useEffect(() => {
    try { localStorage.setItem(DENSITY_STORAGE_KEY, density); } catch { /* تفضيل عرض بسيط — تجاهل لو التخزين غير متاح */ }
  }, [density]);

  // إعادة الترقيم لأول صفحة عند تغيير الفلتر/البحث — بدل ما يضل المستخدم على صفحة فاضية
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter, searchQuery]);

  // تنبيه بسيط عند اقتراب موعد الطلبات المجدولة (فرق موعد الجدولة عن الآن أقل من مدة التحضير الافتراضية).
  const notifiedScheduledIds = useRef<Set<number>>(new Set());
  useEffect(() => {
    const list = Object.values(orders).flat();
    const checkSchedule = () => {
      list.forEach(o => {
        if (o.status !== "scheduled" || !o.scheduled_at) return;
        const prepStartsAt = new Date(o.scheduled_at).getTime() - SCHEDULED_PREP_MINUTES * 60000;
        if (Date.now() >= prepStartsAt && !notifiedScheduledIds.current.has(o.id)) {
          notifiedScheduledIds.current.add(o.id);
          toast.info("طلب مجدول اقترب موعده", `#${o.order_number} — حان وقت بدء التحضير`);
        }
      });
    };
    checkSchedule();
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [orders]);

  // نفس الطلب ممكن يرجع بأكتر من نطاق (scope) — dedupeActiveOrders بتدمجهم بالاعتماد على id.
  const allOrders = useMemo(() => dedupeActiveOrders(orders), [orders]);

  const countsByStage = useMemo(() => {
    const counts = emptyStageCounts();
    allOrders.forEach(o => { counts[deriveWorkflowStage(o.status, o.order_type)]++; });
    return counts;
  }, [allOrders]);

  const delayedCount = useMemo(
    () => allOrders.filter(o => getOrderSlaLevel(o.created_at) !== "normal").length,
    [allOrders],
  );

  // عدد الطلبات النشطة (OUT_FOR_DELIVERY) لكل سائق — محسوب من نفس قائمة الطلبات المحمّلة، بدون
  // أي طلب شبكة إضافي.
  const driverOrderCounts = useMemo(() => {
    const map = new Map<number, number>();
    allOrders.forEach(o => {
      if (o.status === "OUT_FOR_DELIVERY" && o.driver) {
        map.set(o.driver.id, (map.get(o.driver.id) || 0) + 1);
      }
    });
    return map;
  }, [allOrders]);

  const availableDrivers = useMemo(
    () => drivers.filter(d => deriveDriverStatus(d, driverOrderCounts.get(d.id) || 0) === "available"),
    [drivers, driverOrderCounts],
  );

  const filtered = useMemo(() => {
    const list = allOrders.filter(o => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = (o.customer_name || "").toLowerCase().includes(q)
          || o.order_number.toLowerCase().includes(q)
          || (o.customer_phone || "").includes(q);
        if (!match) return false;
      }
      if (filter === "delayed") return getOrderSlaLevel(o.created_at) !== "normal";
      if (filter !== "all") return deriveWorkflowStage(o.status, o.order_type) === filter;
      return true;
    });

    // ترتيب مركّب: (1) المجدولة أولاً بالأقرب موعدًا، (2) تأخر حرج (🔥) > جديد/قيد التجهيز >
    // جاهز/مع السائق > الباقي، (3) الأقدم يظهر أولًا ضمن نفس الأولوية.
    return [...list].sort((a, b) => {
      const aScheduled = a.status === "scheduled" && a.scheduled_at;
      const bScheduled = b.status === "scheduled" && b.scheduled_at;
      if (aScheduled && bScheduled) return new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime();
      if (aScheduled) return -1;
      if (bScheduled) return 1;

      const rank = (o: ActiveCallCenterOrder) => {
        if (getOrderSlaLevel(o.created_at) === "critical") return 0;
        const stage = deriveWorkflowStage(o.status, o.order_type);
        if (stage === "new" || stage === "preparing") return 1;
        if (stage === "ready" || stage === "out_for_delivery") return 2;
        return 3;
      };
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [allOrders, searchQuery, filter]);

  const visible = filtered.slice(0, visibleCount);

  const handleAssignDriver = useCallback(async (orderId: number, driverId: number) => {
    try {
      await orderService.assignDelivery(orderId, driverId);
      toast.success("تم تعيين موظف التوصيل");
      fetchOrders();
    } catch (err: any) {
      toast.error("فشل تعيين موظف التوصيل", err?.response?.data?.message);
    }
  }, [fetchOrders]);

  const handleMarkDelivered = useCallback(async (orderId: number) => {
    try {
      await orderService.markDelivered(orderId);
      toast.success("تم تسليم الطلب");
      fetchOrders();
    } catch (err: any) {
      toast.error("فشل تسليم الطلب", err?.response?.data?.message);
    }
  }, [fetchOrders]);

  const densityMinWidth: Record<CardDensity, number> = { compact: 220, normal: 270, large: 330 };

  return (
    <div dir="rtl" style={{ fontFamily: typography.fontFamily.sans, minHeight: "100%" }}>
      {/* رأس الصفحة + الملخص التشغيلي + قسم السائقين + الفلاتر + البحث — ثابتة أعلى الشاشة
          (sticky) عشان تبقى مرئية أثناء تمرير شبكة الطلبات تحتها */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: colors.surface.page, paddingBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
              الطلبات النشطة
            </h1>
            <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>
              مركز تحكم العمليات — يتم التحديث تلقائيًا كل 30 ثانية
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* تحكم كثافة الكروت */}
            <div style={{ display: "flex", alignItems: "center", gap: 2, padding: 3, borderRadius: radius.lg, background: colors.neutral[100], border: `1px solid ${colors.border.subtle}` }}>
              {([
                { value: "compact" as CardDensity, icon: <Rows3 size={14} />, label: "مضغوط" },
                { value: "normal" as CardDensity, icon: <Grid2x2 size={14} />, label: "عادي" },
                { value: "large" as CardDensity, icon: <LayoutGrid size={14} />, label: "كبير" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDensity(opt.value)}
                  title={opt.label}
                  style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: radius.md,
                    background: density === opt.value ? colors.neutral[0] : "transparent",
                    boxShadow: density === opt.value ? shadows.xs : "none",
                    border: "none", color: density === opt.value ? colors.neutral[800] : colors.neutral[500],
                    fontSize: "11px", fontWeight: typography.weight.semibold, cursor: "pointer",
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { fetchOrders(); fetchDrivers(); }}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 16px", borderRadius: radius.lg,
                background: colors.neutral[0], border: `1px solid ${colors.border.default}`,
                color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                cursor: loading ? "not-allowed" : "pointer", transition: `all ${transitions.fast}`,
              }}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              تحديث
            </button>
          </div>
        </div>

        {/* الملخص التشغيلي */}
        <OrderSummaryBar total={allOrders.length} countsByStage={countsByStage} delayedCount={delayedCount} />

        {/* سائقو التوصيل */}
        <DriverSection drivers={drivers} driverOrderCounts={driverOrderCounts} />

        {/* الفلاتر */}
        <OrderFiltersBar active={filter} onChange={setFilter} total={allOrders.length} countsByStage={countsByStage} delayedCount={delayedCount} />

        {/* البحث */}
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب، اسم العميل، أو رقم الهاتف..."
            style={{
              width: "100%", height: 44, padding: "0 40px 0 12px",
              border: `1px solid ${colors.border.default}`, borderRadius: radius.lg,
              fontSize: typography.size.sm, outline: "none",
              background: colors.neutral[0], transition: `border-color ${transitions.fast}`,
            }}
            onFocus={e => e.currentTarget.style.borderColor = colors.brand[500]}
            onBlur={e => e.currentTarget.style.borderColor = colors.border.default}
          />
        </div>
      </div>

      {/* شبكة الطلبات */}
      {loading && allOrders.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: colors.brand[500] }} />
        </div>
      ) : error ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0",
          background: colors.semantic.errorBg, borderRadius: radius.xl, border: `1px solid ${colors.semantic.errorBorder}`,
        }}>
          <AlertCircle size={32} style={{ color: colors.semantic.error, marginBottom: 12 }} />
          <p style={{ fontSize: typography.size.sm, color: colors.semantic.error }}>{error}</p>
          <button onClick={fetchOrders} style={{
            marginTop: 12, padding: "8px 16px", borderRadius: radius.lg,
            background: colors.semantic.error, color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.semibold, cursor: "pointer",
          }}>
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0",
          background: colors.neutral[50], borderRadius: radius.xl,
        }}>
          <ShoppingCart size={32} style={{ color: colors.neutral[300], marginBottom: 12 }} />
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500] }}>
            {searchQuery ? "لا توجد نتائج مطابقة" : "لا توجد طلبات نشطة حاليًا"}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${densityMinWidth[density]}px, 1fr))`, gap: 16 }}>
            <AnimatePresence mode="popLayout">
              {visible.map(order => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <OrderCard
                    order={order}
                    density={density}
                    availableDrivers={availableDrivers}
                    onOpen={() => navigate(`/call-center/orders/${order.id}`)}
                    onAssignDriver={handleAssignDriver}
                    onMarkDelivered={handleMarkDelivered}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {visibleCount < filtered.length && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <button
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                style={{
                  padding: "10px 24px", borderRadius: radius.lg,
                  background: colors.neutral[0], border: `1px solid ${colors.border.default}`,
                  color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                  cursor: "pointer",
                }}
              >
                عرض المزيد ({filtered.length - visibleCount} متبقي)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActiveOrdersPage;
