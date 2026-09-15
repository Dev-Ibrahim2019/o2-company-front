import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bike, Plus, Search, Loader2, AlertCircle, X, Save, Pencil, Trash2, RefreshCw,
  LayoutGrid, Rows3, Grid2x2, Power, PowerOff, Phone, Truck, PackageCheck,
  Users, CheckCircle2, WifiOff, Play, Square,
} from "lucide-react";
import { colors, typography, radius, shadows } from "../design/tokens";
import { employeeService, type EmployeeFromApi, type VehicleType } from "../../../services/employeeService";
import { branchService, type Branch } from "../../../services/branchService";
import { toast } from "../../shared/Toast";

// ============================================================================
// صفحة إدارة الديليفري — بديل صفحة الموظفين العامة (حُذفت بالكامل)، مخصصة لسائقي التوصيل
// فقط: نموذج توفر ثنائي البعد (Status نشط/غير نشط مستقل عن Availability متاح/مع التوصيل/غير
// متصل)، إحصاءات محسوبة حيًا من بيانات الطلبات الحقيقية (لا قيم وهمية)، نفس معمارية القابلية
// للتوسع الموجودة أصلاً بصفحة الطلبات النشطة (كثافة/بحث/فلترة/ترتيب/ترقيم صفحات).
// ============================================================================

const PAGE_SIZE = 24;
const DENSITY_STORAGE_KEY = "o2-cc-delivery-density";
type CardDensity = "compact" | "normal" | "large";

const VEHICLE_LABELS: Record<VehicleType, string> = {
  bicycle: "دراجة هوائية", electric_bike: "دراجة كهربائية", motorcycle: "دراجة نارية", external: "توصيل خارجي",
};

type AvailabilityFilter = "all" | "available" | "on_delivery" | "offline";
type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "current_orders" | "completed_deliveries" | "last_delivery";

const isActiveStatus = (d: EmployeeFromApi) => (d.status || "").toUpperCase() === "ACTIVE";

const AVAILABILITY_META: Record<"available" | "on_delivery" | "offline", { label: string; color: string; icon: React.ReactNode }> = {
  available: { label: "متاح", color: colors.semantic.success, icon: <CheckCircle2 size={12} /> },
  on_delivery: { label: "مع التوصيل", color: "#F97316", icon: <Bike size={12} /> },
  offline: { label: "غير متصل", color: colors.neutral[400], icon: <WifiOff size={12} /> },
};

const formatLastDelivery = (value?: string | null): string => {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
};

interface DriverFormPayload {
  name: string;
  phone: string;
  branch_id: number;
  role: string;
  operational_role: "delivery_driver";
  vehicle_type?: VehicleType;
  status: string;
  employee_code?: string;
}

export const DeliveryManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<EmployeeFromApi[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [density, setDensity] = useState<CardDensity>(() => {
    try { return (localStorage.getItem(DENSITY_STORAGE_KEY) as CardDensity) || "normal"; } catch { return "normal"; }
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeFromApi | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await employeeService.getAll({ operational_role: "delivery_driver" });
      setDrivers(list);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل بيانات السائقين");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  // تحديث دوري — الإتاحة (Availability) محسوبة حيًا بالباك اند من طلبات OUT_FOR_DELIVERY الفعلية،
  // فبدون هذا التحديث ستبقى الشاشة تعرض حالة قديمة لسائق بدأ/أنهى توصيلة من مكان آخر.
  useEffect(() => {
    const interval = setInterval(fetchDrivers, 30000);
    return () => clearInterval(interval);
  }, [fetchDrivers]);

  useEffect(() => { branchService.getAll().then(setBranches).catch(() => setBranches([])); }, []);

  useEffect(() => {
    try { localStorage.setItem(DENSITY_STORAGE_KEY, density); } catch { /* تفضيل عرض بسيط — تجاهل لو التخزين غير متاح */ }
  }, [density]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [statusFilter, availabilityFilter, search]);

  const stats = useMemo(() => ({
    total: drivers.length,
    active: drivers.filter(isActiveStatus).length,
    available: drivers.filter(d => d.availability === "available").length,
    onDelivery: drivers.filter(d => d.availability === "on_delivery").length,
    offline: drivers.filter(d => d.availability === "offline").length,
    totalDeliveries: drivers.reduce((sum, d) => sum + (d.completed_deliveries || 0), 0),
  }), [drivers]);

  const filtered = useMemo(() => {
    const list = drivers.filter(d => {
      if (search) {
        const q = search.trim().toLowerCase();
        const match = d.name.toLowerCase().includes(q) || d.phone.includes(q) || (d.employee_code || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter === "active" && !isActiveStatus(d)) return false;
      if (statusFilter === "inactive" && isActiveStatus(d)) return false;
      if (availabilityFilter !== "all" && d.availability !== availabilityFilter) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "current_orders": return (b.current_orders_count || 0) - (a.current_orders_count || 0);
        case "completed_deliveries": return (b.completed_deliveries || 0) - (a.completed_deliveries || 0);
        case "last_delivery": {
          const at = a.last_delivery_at ? new Date(a.last_delivery_at).getTime() : 0;
          const bt = b.last_delivery_at ? new Date(b.last_delivery_at).getTime() : 0;
          return bt - at;
        }
        default: return a.name.localeCompare(b.name, "ar");
      }
    });
  }, [drivers, search, statusFilter, availabilityFilter, sortKey]);

  const visible = filtered.slice(0, visibleCount);

  const handleToggleShift = async (driver: EmployeeFromApi) => {
    try {
      if (driver.on_shift_now) await employeeService.endShift(driver.id);
      else await employeeService.startShift(driver.id);
      fetchDrivers();
    } catch (err: any) {
      toast.error("فشل تحديث حالة الشفت", err?.response?.data?.message);
    }
  };

  // "غير نشط" هنا تعني موقوف إداريًا (SUSPENDED) — قابلة للعكس، بعكس TERMINATED/RESIGNED اللي
  // بتعني مغادرة نهائية وليست هذا المقصود من مفتاح Status البسيط بهذه الصفحة.
  const handleToggleActiveStatus = async (driver: EmployeeFromApi) => {
    const newStatus = isActiveStatus(driver) ? "SUSPENDED" : "ACTIVE";
    try {
      const updated = await employeeService.update(driver.id, {
        name: driver.name, phone: driver.phone, branch_id: driver.branch_id,
        role: driver.role, operational_role: "delivery_driver",
        vehicle_type: driver.vehicle_type, status: newStatus, employee_code: driver.employee_code,
      });
      setDrivers(current => current.map(d => d.id === driver.id ? updated : d));
      toast.success(newStatus === "ACTIVE" ? "تم تفعيل السائق" : "تم إيقاف السائق");
    } catch (err: any) {
      toast.error("فشل تحديث حالة السائق", err?.response?.data?.message);
    }
  };

  const handleDelete = async (driver: EmployeeFromApi) => {
    if (!confirm(`هل أنت متأكد من حذف السائق ${driver.name}؟`)) return;
    try {
      await employeeService.delete(driver.id);
      setDrivers(current => current.filter(d => d.id !== driver.id));
      toast.success("تم حذف السائق");
    } catch (err: any) {
      toast.error("فشل حذف السائق", err?.response?.data?.message);
    }
  };

  const handleSave = async (payload: DriverFormPayload) => {
    setSaving(true);
    try {
      const saved = editTarget
        ? await employeeService.update(editTarget.id, payload)
        : await employeeService.create(payload);
      setDrivers(current => editTarget
        ? current.map(d => d.id === saved.id ? saved : d)
        : [saved, ...current]);
      toast.success(editTarget ? "تم تحديث بيانات السائق" : "تمت إضافة السائق");
      setShowFormModal(false);
      setEditTarget(null);
    } catch (err: any) {
      toast.error("فشل حفظ بيانات السائق", err?.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  const densityMinWidth: Record<CardDensity, number> = { compact: 240, normal: 290, large: 340 };

  const statCards: { label: string; value: number; color: string; icon: React.ReactNode }[] = [
    { label: "إجمالي السائقين", value: stats.total, color: colors.neutral[700], icon: <Users size={16} /> },
    { label: "نشط", value: stats.active, color: colors.brand[600], icon: <Power size={16} /> },
    { label: "متاح الآن", value: stats.available, color: colors.semantic.success, icon: <CheckCircle2 size={16} /> },
    { label: "مع التوصيل", value: stats.onDelivery, color: "#F97316", icon: <Bike size={16} /> },
    { label: "غير متصل", value: stats.offline, color: colors.neutral[400], icon: <WifiOff size={16} /> },
    { label: "توصيلات مكتملة", value: stats.totalDeliveries, color: colors.semantic.info, icon: <PackageCheck size={16} /> },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: typography.fontFamily.sans, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: typography.size["2xl"], fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>
            إدارة الديليفري
          </h1>
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>
            سائقو التوصيل — التوفر محسوب حيًا من الطلبات الفعلية، يتحدث تلقائيًا كل 30 ثانية
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={fetchDrivers} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: radius.lg,
            background: colors.neutral[0], border: `1px solid ${colors.border.default}`,
            color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: loading ? "not-allowed" : "pointer",
          }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> تحديث
          </button>
          <button onClick={() => { setEditTarget(null); setShowFormModal(true); }} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: radius.lg,
            background: colors.brand[500], color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.bold, cursor: "pointer",
          }}>
            <Plus size={16} /> إضافة سائق
          </button>
        </div>
      </div>

      {/* شريط الإحصاءات — 6 مؤشرات محسوبة حيًا */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10,
        marginBottom: 16,
      }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            background: colors.neutral[0], borderRadius: radius.lg, border: `1px solid ${colors.border.subtle}`,
          }}>
            <span style={{
              width: 34, height: 34, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center",
              background: `color-mix(in srgb, ${card.color} 12%, transparent)`, color: card.color, flexShrink: 0,
            }}>
              {card.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.neutral[900], lineHeight: 1.2 }}>
                {card.value.toLocaleString("ar-EG")}
              </p>
              <p style={{ fontSize: "10px", fontWeight: typography.weight.bold, color: colors.neutral[500] }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* الفلاتر/البحث/الترتيب/الكثافة */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        padding: "10px 14px", marginBottom: 16, borderRadius: radius.lg,
        background: colors.neutral[0], border: `1px solid ${colors.border.subtle}`,
      }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <Search size={15} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الهاتف، أو كود السائق..."
            style={{
              width: "100%", height: 36, padding: "0 34px 0 10px",
              border: `1px solid ${colors.border.default}`, borderRadius: radius.md,
              fontSize: typography.size.xs, outline: "none", background: colors.neutral[0],
            }}
          />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} style={selectStyle}>
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>

        <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value as AvailabilityFilter)} style={selectStyle}>
          <option value="all">كل حالات التوفر</option>
          <option value="available">متاح</option>
          <option value="on_delivery">مع التوصيل</option>
          <option value="offline">غير متصل</option>
        </select>

        <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} style={selectStyle}>
          <option value="name">ترتيب: الاسم</option>
          <option value="current_orders">ترتيب: الطلبات الحالية</option>
          <option value="completed_deliveries">ترتيب: التوصيلات المكتملة</option>
          <option value="last_delivery">ترتيب: آخر توصيلة</option>
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 2, padding: 3, borderRadius: radius.lg, background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`, marginRight: "auto" }}>
          {([
            { value: "compact" as CardDensity, icon: <Rows3 size={13} /> },
            { value: "normal" as CardDensity, icon: <Grid2x2 size={13} /> },
            { value: "large" as CardDensity, icon: <LayoutGrid size={13} /> },
          ]).map(opt => (
            <button key={opt.value} onClick={() => setDensity(opt.value)} style={{
              display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: radius.md,
              background: density === opt.value ? colors.neutral[0] : "transparent",
              boxShadow: density === opt.value ? shadows.xs : "none",
              border: "none", color: density === opt.value ? colors.neutral[800] : colors.neutral[500], cursor: "pointer",
            }}>
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      {loading && drivers.length === 0 ? (
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
          <button onClick={fetchDrivers} style={{
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
          <Bike size={32} style={{ color: colors.neutral[300], marginBottom: 12 }} />
          <p style={{ fontSize: typography.size.sm, color: colors.neutral[500] }}>
            {search || statusFilter !== "all" || availabilityFilter !== "all" ? "لا توجد نتائج مطابقة" : "لا يوجد سائقو توصيل بعد"}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${densityMinWidth[density]}px, 1fr))`, gap: 14 }}>
            <AnimatePresence mode="popLayout">
              {visible.map(driver => (
                <motion.div
                  key={driver.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <DriverCard
                    driver={driver}
                    density={density}
                    onOpen={() => navigate(`/call-center/delivery/${driver.id}`)}
                    onEdit={() => { setEditTarget(driver); setShowFormModal(true); }}
                    onDelete={() => handleDelete(driver)}
                    onToggleShift={() => handleToggleShift(driver)}
                    onToggleActive={() => handleToggleActiveStatus(driver)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {visibleCount < filtered.length && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} style={{
                padding: "10px 24px", borderRadius: radius.lg,
                background: colors.neutral[0], border: `1px solid ${colors.border.default}`,
                color: colors.neutral[700], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
                cursor: "pointer",
              }}>
                عرض المزيد ({filtered.length - visibleCount} متبقي)
              </button>
            </div>
          )}
        </>
      )}

      {showFormModal && (
        <DriverFormModal
          driver={editTarget}
          branches={branches}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setShowFormModal(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
};

const selectStyle: React.CSSProperties = {
  height: 36, padding: "0 10px", borderRadius: radius.md,
  border: `1px solid ${colors.border.default}`, fontSize: "11px", fontWeight: typography.weight.semibold,
  background: colors.neutral[0], color: colors.neutral[700], cursor: "pointer",
};

// ── بطاقة السائق ──────────────────────────────────────────────────────────
const DriverCard: React.FC<{
  driver: EmployeeFromApi;
  density: CardDensity;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleShift: () => void;
  onToggleActive: () => void;
}> = ({ driver, density, onOpen, onEdit, onDelete, onToggleShift, onToggleActive }) => {
  const active = isActiveStatus(driver);
  const availability = driver.availability || "offline";
  const meta = AVAILABILITY_META[availability];
  const compact = density === "compact";

  return (
    <div style={{
      background: colors.neutral[0], borderRadius: radius.xl, border: `1px solid ${colors.border.subtle}`,
      boxShadow: shadows.xs, overflow: "hidden", display: "flex", flexDirection: "column",
      opacity: active ? 1 : 0.65,
    }}>
      <div onClick={onOpen} style={{ padding: compact ? "12px 14px" : "16px 18px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{
              width: compact ? 34 : 40, height: compact ? 34 : 40, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `color-mix(in srgb, #F97316 12%, transparent)`, color: "#F97316",
            }}>
              <Bike size={compact ? 16 : 18} />
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[900], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {driver.name}
              </p>
              <p style={{ fontSize: "10px", color: colors.neutral[400], fontFamily: typography.fontFamily.mono }}>
                {driver.employee_code || "—"}
              </p>
            </div>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: radius.full,
            background: `color-mix(in srgb, ${meta.color} 12%, transparent)`, color: meta.color,
            fontSize: "10px", fontWeight: typography.weight.bold, flexShrink: 0,
          }}>
            {meta.icon} {meta.label}
          </span>
        </div>

        {!compact && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", color: colors.neutral[500] }}>
              <Phone size={11} /> <span dir="ltr">{driver.phone}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", color: colors.neutral[500] }}>
              <Truck size={11} /> {driver.vehicle_type ? VEHICLE_LABELS[driver.vehicle_type] : "—"}
              {driver.branch?.name && <span style={{ color: colors.neutral[300] }}>· {driver.branch.name}</span>}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 12 }}>
          <MiniStat label="طلبات حالية" value={driver.current_orders_count ?? 0} />
          <MiniStat label="توصيلات" value={driver.completed_deliveries ?? 0} />
          <MiniStat label="آخر توصيلة" value={formatLastDelivery(driver.last_delivery_at)} isText />
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
        padding: "8px 12px", borderTop: `1px solid ${colors.border.subtle}`, background: colors.neutral[50],
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4, fontSize: "10px", fontWeight: typography.weight.bold,
          color: active ? colors.semantic.success : colors.neutral[400],
        }}>
          ● {active ? "نشط" : "غير نشط"}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={onToggleShift}
            disabled={availability === "on_delivery"}
            title={driver.on_shift_now ? "إنهاء الشفت" : "بدء الشفت"}
            style={{
              padding: 6, borderRadius: radius.md, background: "transparent", border: "none",
              color: driver.on_shift_now ? colors.semantic.warning : colors.semantic.success,
              cursor: availability === "on_delivery" ? "not-allowed" : "pointer",
              opacity: availability === "on_delivery" ? 0.4 : 1,
            }}
          >
            {driver.on_shift_now ? <Square size={13} /> : <Play size={13} />}
          </button>
          <button onClick={onToggleActive} title={active ? "إيقاف السائق" : "تفعيل السائق"} style={{
            padding: 6, borderRadius: radius.md, background: "transparent", border: "none",
            color: active ? colors.neutral[400] : colors.semantic.success, cursor: "pointer",
          }}>
            {active ? <PowerOff size={13} /> : <Power size={13} />}
          </button>
          <button onClick={onEdit} title="تعديل" style={{ padding: 6, borderRadius: radius.md, background: "transparent", border: "none", color: colors.neutral[400], cursor: "pointer" }}>
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} title="حذف" style={{ padding: 6, borderRadius: radius.md, background: "transparent", border: "none", color: colors.semantic.error, cursor: "pointer" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: number | string; isText?: boolean }> = ({ label, value, isText }) => (
  <div style={{ textAlign: "center", padding: "6px 4px", borderRadius: radius.md, background: colors.neutral[50] }}>
    <p style={{ fontSize: isText ? "10px" : typography.size.sm, fontWeight: typography.weight.extrabold, color: colors.neutral[800] }}>
      {value}
    </p>
    <p style={{ fontSize: "9px", color: colors.neutral[400], fontWeight: typography.weight.semibold, marginTop: 1 }}>{label}</p>
  </div>
);

// ── نموذج إضافة/تعديل سائق — مبسّط: بدون قسم/تاريخ تعيين (يُضبطان تلقائيًا بالباك اند) ──
const DriverFormModal: React.FC<{
  driver: EmployeeFromApi | null;
  branches: Branch[];
  saving: boolean;
  onSave: (payload: DriverFormPayload) => void;
  onClose: () => void;
}> = ({ driver, branches, saving, onSave, onClose }) => {
  const [name, setName] = useState(driver?.name ?? "");
  const [phone, setPhone] = useState(driver?.phone ?? "");
  const [branchId, setBranchId] = useState<number>(driver?.branch_id ?? branches[0]?.id ?? 0);
  const [vehicleType, setVehicleType] = useState<VehicleType | "">(driver?.vehicle_type ?? "");
  const [status, setStatus] = useState(driver?.status ?? "ACTIVE");

  const valid = name.trim() && phone.trim() && branchId;

  const handleSubmit = () => {
    if (!valid) return;
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      branch_id: branchId,
      role: "Delivery Driver",
      operational_role: "delivery_driver",
      vehicle_type: vehicleType || undefined,
      status,
      employee_code: driver?.employee_code,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
    }} onClick={() => { if (!saving) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: colors.neutral[0], borderRadius: radius.xl,
        boxShadow: shadows["2xl"], overflow: "hidden", display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border.subtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], display: "flex", alignItems: "center", gap: 8 }}>
            <Bike size={16} style={{ color: "#F97316" }} /> {driver ? "تعديل بيانات السائق" : "إضافة سائق توصيل"}
          </h3>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: colors.neutral[400] }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {driver?.employee_code && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderRadius: radius.lg, background: colors.neutral[50],
              fontSize: "11px", color: colors.neutral[500],
            }}>
              <span>كود السائق</span>
              <span style={{ fontFamily: typography.fontFamily.mono, fontWeight: typography.weight.bold, color: colors.neutral[700] }}>{driver.employee_code}</span>
            </div>
          )}
          <FormField label="الاسم الكامل *">
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="رقم الهاتف *">
            <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} dir="ltr" />
          </FormField>
          <FormField label="الفرع *">
            <select value={branchId} onChange={e => setBranchId(Number(e.target.value))} style={inputStyle}>
              <option value={0}>اختر الفرع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FormField>
          <FormField label="الدور">
            <input value="سائق توصيل" disabled style={{ ...inputStyle, background: colors.neutral[100], color: colors.neutral[500] }} />
          </FormField>
          <FormField label="نوع المركبة">
            <select value={vehicleType} onChange={e => setVehicleType(e.target.value as VehicleType | "")} style={inputStyle}>
              <option value="">بدون تحديد</option>
              {Object.entries(VEHICLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </FormField>
          <FormField label="الحالة">
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="ACTIVE">نشط</option>
              <option value="SUSPENDED">غير نشط</option>
            </select>
          </FormField>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "16px 20px", borderTop: `1px solid ${colors.border.subtle}`, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: "8px 16px", borderRadius: radius.lg,
            background: colors.neutral[100], border: `1px solid ${colors.border.subtle}`,
            color: colors.neutral[600], fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: saving ? "not-allowed" : "pointer",
          }}>
            إلغاء
          </button>
          <button onClick={handleSubmit} disabled={!valid || saving} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: radius.lg,
            background: colors.brand[500], color: "#fff", border: "none",
            fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            cursor: (!valid || saving) ? "not-allowed" : "pointer", opacity: (!valid || saving) ? 0.6 : 1,
          }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 12px", borderRadius: radius.lg,
  border: `1px solid ${colors.border.default}`, fontSize: typography.size.sm, outline: "none",
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: "block" }}>
    <span style={{ fontSize: "11px", fontWeight: typography.weight.bold, color: colors.neutral[500], marginBottom: 6, display: "block" }}>
      {label}
    </span>
    {children}
  </label>
);

export default DeliveryManagementPage;
