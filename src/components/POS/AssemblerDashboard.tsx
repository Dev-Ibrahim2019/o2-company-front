import { useEffect, useMemo, useState } from "react";
import {
  Bike,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
  RefreshCcw,
  Truck,
  Utensils,
  X,
} from "lucide-react";
import { useOrders } from "../../hooks/useOrders";
import { getOrderLifecycleStatus, orderService } from "../../services/orderService";
import type { AvailableDeliveryDriver, OrderFromApi, OrderItemFromApi } from "../../services/orderService";
import { toast } from "../shared/Toast";
import { useAuth } from "../../auth";
import { useApp } from "../../../store";

type PreparedCache = Record<string, { preparedAt: string; durationSeconds: number }>;
type AssembledCache = Record<string, { assembledAt: string; deliveryEmployeeName: string }>;
type OfflineDelivery = {
  order_id: number;
  delivered_at: string;
  recorded_locally_at: string;
};

const PREPARED_CACHE_KEY = "o2_assembler_prepared_items";
const ASSEMBLED_CACHE_KEY = "o2_assembler_assembled_orders";
const OFFLINE_DELIVERIES_KEY = "o2_delivery_offline_cache";

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const itemCacheKey = (orderId: number, itemId: number) => `${orderId}:${itemId}`;

const getTimerStart = (order: OrderFromApi) =>
  order.paid_at || order.updated_at || order.created_at;

const getSecondsBetween = (start?: string | null, end?: string | null) => {
  const startMs = start ? new Date(start).getTime() : NaN;
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const getDepartmentName = (item: OrderItemFromApi) =>
  item.department?.name || `قسم #${item.department_id || "-"}`;

const getDeliveryIcon = (order: OrderFromApi) =>
  order.order_type === "delivery" ? <Bike size={16} /> : <Truck size={16} />;
const isUrgent = (order: OrderFromApi) => Boolean(order.is_urgent || order.expedited_at || String(order.priority ?? "").toLowerCase().includes("urgent") || (order.note ?? "").toLowerCase().includes("مستعجل"));

export const AssemblerDashboard = () => {
  const { orders, loading, error, refetch } = useOrders();
  const { user: authUser } = useAuth();
  const { currentUser } = useApp();
  const [, setNowTick] = useState(Date.now());
  const [preparedCache, setPreparedCache] = useState<PreparedCache>(() =>
    readJson(PREPARED_CACHE_KEY, {}),
  );
  const [assembledCache, setAssembledCache] = useState<AssembledCache>(() =>
    readJson(ASSEMBLED_CACHE_KEY, {}),
  );
  const [offlineDeliveries, setOfflineDeliveries] = useState<OfflineDelivery[]>(() =>
    readJson(OFFLINE_DELIVERIES_KEY, []),
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deliveryTarget, setDeliveryTarget] = useState<OrderFromApi | null>(null);
  const [drivers, setDrivers] = useState<AvailableDeliveryDriver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [assigningDriverId, setAssigningDriverId] = useState<number | null>(null);
  const [assemblers, setAssemblers] = useState<Array<{ id: number; name: string; branch_id?: number | null }>>([]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => { orderService.getActiveAssemblers().then(setAssemblers).catch(() => setActionError('تعذر تحميل مجمعي الطلبات النشطين.')); }, []);

  const currentAssemblerId = (order: OrderFromApi) => {
    if (order.assembler_id) return Number(order.assembler_id);
    const currentName = authUser?.name || currentUser?.name;
    const matchedAssembler = assemblers.find((assembler) =>
      (authUser?.id && assembler.id === authUser.id) ||
      (currentName && assembler.name.trim() === currentName.trim()),
    );
    return Number(matchedAssembler?.id || authUser?.id || currentUser?.id || 0);
  };

  const activeOrders = useMemo(
    () =>
      orders
        .filter((order) => {
          const lifecycle = getOrderLifecycleStatus(order);
          return lifecycle === "PREPARATION" || lifecycle === "OUT_FOR_DELIVERY";
        })
        .sort((a, b) => {
          if (isUrgent(a) !== isUrgent(b)) return isUrgent(a) ? -1 : 1;
          const aTime = Date.parse(getTimerStart(a));
          const bTime = Date.parse(getTimerStart(b));
          return aTime - bTime;
        }),
    [orders],
  );

  const isItemPrepared = (order: OrderFromApi, item: OrderItemFromApi) =>
    Boolean(item.item_prepared_at || preparedCache[itemCacheKey(order.id, item.id)]);

  const getPreparedMeta = (order: OrderFromApi, item: OrderItemFromApi) => {
    const cached = preparedCache[itemCacheKey(order.id, item.id)];
    if (cached) return cached;
    if (item.item_prepared_at) {
      return {
        preparedAt: item.item_prepared_at,
        durationSeconds:
          item.prepared_duration_seconds ??
          getSecondsBetween(getTimerStart(order), item.item_prepared_at),
      };
    }
    return null;
  };

  const markItemPrepared = async (order: OrderFromApi, item: OrderItemFromApi) => {
    const key = itemCacheKey(order.id, item.id);
    if (preparedCache[key] || item.item_prepared_at) return;

    const assemblerId = currentAssemblerId(order);
    if (!assemblerId) {
      setActionError("تعذر ربط حسابك بموظف مجمّع طلبات نشط. تحقق من أن المستخدم الحالي مسجل كـ مجمّع طلبات.");
      return;
    }

    const preparedAt = new Date().toISOString();
    const durationSeconds = getSecondsBetween(getTimerStart(order), preparedAt);
    const nextCache = {
      ...preparedCache,
      [key]: { preparedAt, durationSeconds },
    };

    setBusyKey(key);
    setActionError(null);

    try {
      if (!order.assembly_started_at) {
        await orderService.startAssembly(order.id, assemblerId);
      }
      await orderService.markItemPrepared(order.id, item.id, {
        item_prepared_at: preparedAt,
        duration_seconds: durationSeconds,
      });
      setPreparedCache(nextCache);
      writeJson(PREPARED_CACHE_KEY, nextCache);
      toast.success("تم استلام الصنف", item.item_name_ar || item.item_name);
      await refetch();
    } catch (error: any) {
      const response = error?.response?.data;
      const message = response?.errors
        ? Object.values(response.errors as Record<string, string[]>).flat()[0]
        : response?.message;
      setActionError(message || error?.message || "تعذر تسجيل استلام الصنف.");
    } finally {
      setBusyKey(null);
    }
  };

  const markOrderAssembled = async (order: OrderFromApi) => {
    const allPrepared = order.items.length > 0 && order.items.every((item) => isItemPrepared(order, item));
    if (!allPrepared) {
      setActionError("يجب تحديد جميع أصناف الطلب كجاهزة قبل التسليم للدليفري.");
      return;
    }
    const assemblerId = currentAssemblerId(order);
    if (!assemblerId) { setActionError('تعذر تحديد مستخدم مجمّع الطلبات الحالي.'); return; }
    const assembledAt = new Date().toISOString();
    const nextCache = {
      ...assembledCache,
      [String(order.id)]: { assembledAt, deliveryEmployeeName: "" },
    };

    setBusyKey(`assembled:${order.id}`);
    setActionError(null);

    try {
      await orderService.completeAssembly(order.id, assemblerId);
      setAssembledCache(nextCache);
      writeJson(ASSEMBLED_CACHE_KEY, nextCache);
      await refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "تعذر تسليم الطلب للدليفري.");
    } finally {
      setBusyKey(null);
    }
  };

  const loadAvailableDrivers = async (order: OrderFromApi) => {
    setDriversLoading(true); setActionError(null);
    try { setDrivers(await orderService.getAvailableDeliveryDrivers({ branch_id: order.branch_id, order_id: order.id })); }
    catch (error) { setActionError(error instanceof Error ? error.message : "تعذر تحميل الدليفري المتاحين."); }
    finally { setDriversLoading(false); }
  };

  const openDeliveryModal = (order: OrderFromApi) => { setDeliveryTarget(order); setDrivers([]); void loadAvailableDrivers(order); };

  const assignDriver = async (driver: AvailableDeliveryDriver) => {
    if (!deliveryTarget) return;
    setAssigningDriverId(driver.id); setActionError(null);
    try {
      await orderService.assignDeliveryDriver(deliveryTarget.id, driver.id);
      toast.success("تم استدعاء الدليفري", `${driver.name} — بدأ التوصيل الآن`);
      setDeliveryTarget(null); await refetch();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      setActionError(message?.errors ? Object.values(message.errors).flat()[0] : message?.message || "تعذر تعيين الدليفري.");
      await loadAvailableDrivers(deliveryTarget);
    } finally { setAssigningDriverId(null); }
  };

  const vehicleLabel = (value?: string | null) => ({ bicycle: "دراجة هوائية", electric_bike: "دراجة كهربائية", motorcycle: "موتوسيكل", external: "دليفري خارجي" }[value || ""] || "غير محدد");

  const syncOfflineDeliveries = async () => {
    if (offlineDeliveries.length === 0) return;
    setBusyKey("offline-sync");
    setActionError(null);
    try {
      await orderService.syncOfflineDeliveries(offlineDeliveries);
      setOfflineDeliveries([]);
      writeJson(OFFLINE_DELIVERIES_KEY, []);
      await refetch();
    } catch {
      setActionError("تعذرت مزامنة تسليمات الدليفري المحفوظة محليا.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto rounded-[2rem] bg-slate-950 p-4 text-white custom-scrollbar" dir="rtl">
      <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black text-blue-300">Assembler KDS</p>
          <h1 className="text-2xl font-black">مجمّع الطلبات</h1>
          <p className="mt-1 text-xs font-bold text-slate-500">
            تتبع الأصناف حسب القسم، أوقف مؤقت الصنف عند الاستلام، ثم سلّم الطلب للدليفري.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-xs font-black text-slate-300 hover:bg-slate-800"
          >
            <RefreshCcw size={14} />
            تحديث
          </button>
          <button
            type="button"
            onClick={syncOfflineDeliveries}
            disabled={offlineDeliveries.length === 0 || busyKey === "offline-sync"}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {busyKey === "offline-sync" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            مزامنة Offline ({offlineDeliveries.length})
          </button>
        </div>
      </header>

      {(actionError || error) && (
        <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-100">
          {actionError || error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 size={32} className="animate-spin text-blue-400" />
          <p className="text-sm font-black">جاري تحميل طلبات التجميع...</p>
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 bg-slate-900/40">
          <PackageCheck size={54} className="text-slate-700" />
          <div className="text-center">
            <h2 className="text-lg font-black">لا توجد طلبات قيد التجميع</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">ستظهر هنا الطلبات بعد تأكيد الدفع وإرسالها للمطبخ.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {activeOrders.map((order) => {
            const allPrepared = order.items.every((item) => isItemPrepared(order, item));
            const assembled = Boolean(order.assembled_at || assembledCache[String(order.id)]);
            const assemblyStarted = Boolean(order.assembly_started_at);
            const assemblySeconds = order.assembly_started_at ? getSecondsBetween(order.assembly_started_at, order.assembled_at) : null;
            const liveAssemblySeconds = order.assembly_started_at && !order.assembled_at ? getSecondsBetween(order.assembly_started_at) : null;
            const assemblyDuration = order.assembly_duration_seconds ?? assemblySeconds ?? liveAssemblySeconds;
            const totalSeconds = assembled
              ? getSecondsBetween(getTimerStart(order), order.assembled_at || assembledCache[String(order.id)]?.assembledAt)
              : getSecondsBetween(getTimerStart(order));

            return (
              <article
                key={order.id}
                className={`overflow-hidden rounded-3xl border shadow-2xl ${isUrgent(order) ? "border-red-400/70 bg-red-500/10 shadow-red-950/30" : "border-blue-400/20 bg-blue-500/10 shadow-blue-950/20"}`}
              >
                <div className="border-b border-white/10 bg-slate-900/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {isUrgent(order) && <span className="mb-2 inline-flex rounded-lg bg-red-500 px-2 py-1 text-[10px] font-black text-white">طلب مستعجل — أولوية قصوى</span>}
                      <p className="text-[10px] font-black text-slate-500">رقم الطلب</p>
                      <h2 className="mt-1 text-xl font-black">#{order.order_number}</h2>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-[10px] font-black text-slate-200">
                        {getDeliveryIcon(order)}
                        {order.order_type === "delivery" ? "دليفري" : "استلام/سفري"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-1.5 text-[11px] font-black text-white">
                        <Clock3 size={13} />
                        {formatDuration(totalSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  {order.items.map((item) => {
                    const meta = getPreparedMeta(order, item);
                    const itemSeconds = meta
                      ? meta.durationSeconds
                      : getSecondsBetween(getTimerStart(order));
                    const done = Boolean(meta);
                    const key = itemCacheKey(order.id, item.id);

                    return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border p-3 ${
                          done
                            ? "border-emerald-400/25 bg-emerald-500/10"
                            : "border-white/10 bg-slate-950/55"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => markItemPrepared(order, item)}
                          disabled={done || assembled || Boolean(order.driver_id) || busyKey !== null}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border text-white ${
                            done
                              ? "border-emerald-400/30 bg-emerald-500"
                              : "border-white/10 bg-slate-800 hover:bg-blue-600"
                          } disabled:opacity-60`}
                        >
                          {busyKey === key ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        </button>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{item.item_name_ar || item.item_name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Utensils size={11} />
                              {getDepartmentName(item)}
                            </span>
                            <span>المؤقت: {formatDuration(itemSeconds)} د</span>
                          </div>
                        </div>
                        <span className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black">
                          x{item.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-white/10 bg-slate-900/75 p-4">
                  {assemblyStarted && <div className="mb-3 flex items-center justify-between rounded-xl bg-blue-500/10 px-3 py-2 text-[10px]"><span className="font-black text-blue-300">المجمع: {order.assembler?.name || assemblers.find(a=>a.id===Number(order.assembler_id))?.name || 'غير محدد'}</span><span className="font-black text-white">{assembled ? 'مدة التجميع' : 'بدأ التجميع منذ'}: {formatDuration(assemblyDuration ?? 0)}</span></div>}
                  {order.driver_id ? (
                    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3">
                      <p className="text-[10px] font-black text-emerald-300">خارج للتوصيل</p>
                      <p className="mt-1 text-sm font-black">{order.driver?.name || order.delivery_employee_name}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{vehicleLabel(order.driver?.vehicle_type)} · {order.delivery_started_at ? new Date(order.delivery_started_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </div>
                  ) : assembled ? (
                    <button type="button" onClick={() => openDeliveryModal(order)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-500">
                      <Bike size={16} /> استدعاء دليفري
                    </button>
                  ) : !assemblyStarted ? (
                    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-3 text-center text-[11px] font-bold text-blue-200">ضع علامة على أول صنف مستلم لبدء التجميع تلقائياً باسم المستخدم الحالي.</div>
                  ) : (
                    <button type="button" onClick={() => markOrderAssembled(order)} disabled={!allPrepared || busyKey === `assembled:${order.id}`} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-500 py-3 text-xs font-black text-slate-950 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40">
                      {busyKey === `assembled:${order.id}` ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                      إنهاء التجميع
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {deliveryTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div><h2 className="text-lg font-black">استدعاء دليفري</h2><p className="mt-1 text-xs text-slate-500">الطلب #{deliveryTarget.order_number}</p></div>
              <button type="button" onClick={() => setDeliveryTarget(null)} className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="min-h-52 flex-1 overflow-y-auto p-5 custom-scrollbar">
              {driversLoading ? <div className="flex min-h-48 items-center justify-center gap-3 text-slate-400"><Loader2 className="animate-spin" /> جاري البحث عن دليفري متاح...</div>
                : drivers.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"><Bike size={42} className="text-slate-700" /><p className="font-black">لا يوجد دليفري متاح حالياً</p><button type="button" onClick={() => loadAvailableDrivers(deliveryTarget)} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-black">تحديث القائمة</button></div>
                : <div className="grid gap-3 sm:grid-cols-2">{drivers.map(driver => <div key={driver.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{driver.name}</h3><p className="mt-1 text-[10px] text-slate-500">{driver.branch?.name || 'بدون فرع'} · {vehicleLabel(driver.vehicle_type)}</p></div><span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-300">متاح</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-[9px]"><div className="rounded-lg bg-white/5 p-2"><b className="block text-sm">{driver.today_delivered_orders_count}</b>اليوم</div><div className="rounded-lg bg-white/5 p-2"><b className="block text-sm">{driver.active_orders_count}</b>نشط</div><div className="rounded-lg bg-white/5 p-2"><b className="block text-sm">{driver.average_delivery_minutes ?? '--'}</b>دقيقة</div></div><button type="button" onClick={() => assignDriver(driver)} disabled={assigningDriverId !== null} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-black hover:bg-emerald-500 disabled:opacity-50">{assigningDriverId === driver.id && <Loader2 size={14} className="animate-spin" />}اختيار</button></div>)}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
