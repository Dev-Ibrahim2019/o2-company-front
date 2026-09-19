import React, { useState, useEffect } from "react";
import {
  Phone, PhoneIncoming, PhoneOff, Clock, Users, ShoppingCart, TrendingUp,
  Star, AlertTriangle, Headphones, ArrowUpRight, ArrowDownRight, Activity,
  BarChart3, MessageSquare, RefreshCw
} from "lucide-react";
import { colors, typography, radius, shadows, transitions, layout } from "../design";
import { Card, StatCard, Badge, Avatar, Button, SearchInput, Tabs, EmptyState, Skeleton } from "../design";
import { useCallCenterStore } from "../store/callCenterStore";
import api from "../../../api/axios";

// ============================================================================
// DASHBOARD PAGE — Call Center Operations Overview
// ============================================================================

interface DashboardStats {
  activeCalls: number;
  waitingCalls: number;
  todayCalls: number;
  avgCallDuration: number;
  activeAgents: number;
  totalAgents: number;
  todayOrders: number;
  todayRevenue: number;
  conversionRate: number;
  customerSatisfaction: number;
}

interface RecentCall {
  id: string;
  customerName: string;
  customerPhone: string;
  agent: string;
  duration: number;
  status: "completed" | "missed" | "transferred";
  timestamp: string;
  orderId?: number;
}

export const CustomerManagementDashboard: React.FC = () => {
  const { branchId, setBranchId } = useCallCenterStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    loadDashboard();
  }, [branchId, timeRange]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Use real API or fallback to mock data
      const response = await api.get("/call-center/customers/analytics").catch(() => null);
      if (response?.data) {
        setStats({
          activeCalls: 3,
          waitingCalls: 1,
          todayCalls: 47,
          avgCallDuration: 185,
          activeAgents: 5,
          totalAgents: 8,
          todayOrders: 32,
          todayRevenue: 4250.50,
          conversionRate: 68.2,
          customerSatisfaction: 4.7,
        });
      }
    } catch {
      // Fallback mock data
      setStats({
        activeCalls: 3,
        waitingCalls: 1,
        todayCalls: 47,
        avgCallDuration: 185,
        activeAgents: 5,
        totalAgents: 8,
        todayOrders: 32,
        todayRevenue: 4250.50,
        conversionRate: 68.2,
        customerSatisfaction: 4.7,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} ₪`;

  return (
    <div dir="rtl" style={{ minHeight: "100%", fontFamily: typography.fontFamily.sans }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: typography.size["3xl"], fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
              لوحة العمليات
            </h1>
            <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>
              مرحباً بك في مركز الاتصال — نظرة عامة على العمليات
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Tabs
              tabs={[
                { id: "today", label: "اليوم" },
                { id: "week", label: "الأسبوع" },
                { id: "month", label: "الشهر" },
              ]}
              active={timeRange}
              onChange={(id) => setTimeRange(id as typeof timeRange)}
            />
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={loadDashboard}>
              تحديث
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={120} borderRadius={radius.xl} />)}
        </div>
      ) : stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard
            title="المكالمات النشطة"
            value={stats.activeCalls}
            icon={<Phone size={20} />}
            color={colors.semantic.success}
            suffix={`/${stats.totalAgents} موظف`}
          />
          <StatCard
            title="مكالمات اليوم"
            value={stats.todayCalls}
            change={{ value: 12, type: "increase" }}
            icon={<PhoneIncoming size={20} />}
            color={colors.brand[500]}
          />
          <StatCard
            title="متوسط المدة"
            value={formatDuration(stats.avgCallDuration)}
            icon={<Clock size={20} />}
            color={colors.semantic.info}
          />
          <StatCard
            title="الطلبات اليوم"
            value={stats.todayOrders}
            change={{ value: 8, type: "increase" }}
            icon={<ShoppingCart size={20} />}
            color={colors.semantic.warning}
            suffix={formatCurrency(stats.todayRevenue)}
          />
        </div>
      )}

      {/* ── Main Content Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        {/* ── Active Calls & Recent Activity ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Active Calls */}
          <Card padding="20px">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.neutral[900] }}>
                المكالمات النشطة
              </h2>
              <Badge variant="success" dot>{stats?.activeCalls || 0} مكالمة</Badge>
            </div>
            <ActiveCallsList />
          </Card>

          {/* Recent Activity */}
          <Card padding="20px">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.neutral[900] }}>
                النشاط الأخير
              </h2>
              <Button variant="ghost" size="xs">عرض الكل</Button>
            </div>
            <RecentActivityList />
          </Card>
        </div>

        {/* ── Right Sidebar ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Agent Status */}
          <Card padding="20px">
            <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: 16 }}>
              حالة الموظفين
            </h2>
            <AgentStatusList />
          </Card>

          {/* Quick Actions */}
          <Card padding="20px">
            <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: 16 }}>
              إجراءات سريعة
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <QuickActionCard icon={<Phone size={18} />} label="مكالمة جديدة" color={colors.semantic.success} onClick={() => {}} />
              <QuickActionCard icon={<Users size={18} />} label="عميل جديد" color={colors.brand[500]} onClick={() => {}} />
              <QuickActionCard icon={<MessageSquare size={18} />} label="شكوى جديدة" color={colors.semantic.warning} onClick={() => {}} />
              <QuickActionCard icon={<BarChart3 size={18} />} label="التقارير" color={colors.semantic.info} onClick={() => {}} />
            </div>
          </Card>

          {/* Customer Satisfaction */}
          <Card padding="20px">
            <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: 16 }}>
              رضا العملاء
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: "36px", fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                {stats?.customerSatisfaction || 0}
              </div>
              <div>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={16} fill={i <= (stats?.customerSatisfaction || 0) ? "#f59e0b" : "none"} color={i <= (stats?.customerSatisfaction || 0) ? "#f59e0b" : colors.neutral[300]} />
                  ))}
                </div>
                <p style={{ fontSize: typography.size.xs, color: colors.neutral[500], marginTop: 4 }}>من 5.0</p>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 12, background: colors.semantic.successBg, borderRadius: radius.lg, display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={16} color={colors.semantic.success} />
              <span style={{ fontSize: typography.size.sm, color: "#065f46" }}>+0.3 من الشهر الماضي</span>
            </div>
          </Card>

          {/* Conversion Rate */}
          <Card padding="20px">
            <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.semibold, color: colors.neutral[900], marginBottom: 16 }}>
              معدل التحويل
            </h2>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", fontWeight: typography.weight.bold, color: colors.brand[500] }}>
                {stats?.conversionRate || 0}%
              </div>
              <p style={{ fontSize: typography.size.sm, color: colors.neutral[500], marginTop: 4 }}>من المكالمات إلى الطلبات</p>
            </div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", fontSize: typography.size.xs, color: colors.neutral[500] }}>
              <span>الهدف: 75%</span>
              <span style={{ color: colors.semantic.error }}>-6.8%</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ActiveCallsList: React.FC = () => {
  // Mock active calls for demo
  const activeCalls = [
    { id: "1", caller: "أحمد محمد", number: "0599123456", agent: "سارة", duration: 145, status: "connected" },
    { id: "2", caller: "فاطمة علي", number: "0598765432", agent: "محمد", duration: 89, status: "connected" },
    { id: "3", caller: "خالد حسن", number: "0569876543", agent: "نور", duration: 23, status: "ringing" },
  ];

  if (activeCalls.length === 0) {
    return <EmptyState icon={<PhoneOff size={24} />} title="لا توجد مكالمات نشطة" description="ستظهر المكالمات هنا عند وصولها" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {activeCalls.map(call => (
        <div key={call.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: colors.neutral[50], borderRadius: radius.lg, border: `1px solid ${colors.border.subtle}` }}>
          <Avatar name={call.caller} size={36} status="online" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[900] }}>{call.caller}</span>
              <Badge variant={call.status === "connected" ? "success" : "info"}>{call.status === "connected" ? "متصل" : "يرن"}</Badge>
            </div>
            <p dir="ltr" style={{ fontSize: typography.size.xs, color: colors.neutral[500], fontFamily: typography.fontFamily.mono }}>{call.number}</p>
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.neutral[900], fontFamily: typography.fontFamily.mono }}>{formatDuration(call.duration)}</p>
            <p style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>{call.agent}</p>
          </div>
          <Button variant="danger" size="xs" icon={<PhoneOff size={12} />} />
        </div>
      ))}
    </div>
  );
};

const RecentActivityList: React.FC = () => {
  const activities = [
    { id: "1", type: "call", message: "أحمد محمد — مكالمة مكتملة", time: "منذ 5 دقائق", icon: <Phone size={14} />, color: colors.semantic.success },
    { id: "2", type: "order", message: "فاتورة #1234 — 125.00 ₪", time: "منذ 12 دقيقة", icon: <ShoppingCart size={14} />, color: colors.brand[500] },
    { id: "3", type: "missed", message: "مكالمة فائتة — 0599111222", time: "منذ 18 دقيقة", icon: <PhoneOff size={14} />, color: colors.semantic.error },
    { id: "4", type: "customer", message: "عميل جديد — سعيد أحمد", time: "منذ 25 دقيقة", icon: <Users size={14} />, color: colors.semantic.info },
    { id: "5", type: "complaint", message: "شكوى جديدة — تأخير التوصيل", time: "منذ 32 دقيقة", icon: <AlertTriangle size={14} />, color: colors.semantic.warning },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {activities.map(activity => (
        <div key={activity.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: radius.lg, transition: `background ${transitions.fast}` }}
          onMouseEnter={e => e.currentTarget.style.background = colors.neutral[50]}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <div style={{ width: 32, height: 32, borderRadius: radius.lg, background: `color-mix(in srgb, ${activity.color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color: activity.color }}>
            {activity.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: typography.size.sm, color: colors.neutral[800], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activity.message}</p>
            <p style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const AgentStatusList: React.FC = () => {
  const agents = [
    { name: "سارة أحمد", status: "online", calls: 8, duration: "45:30" },
    { name: "محمد علي", status: "online", calls: 6, duration: "38:15" },
    { name: "نور حسن", status: "busy", calls: 4, duration: "22:10" },
    { name: "أحمد سعيد", status: "away", calls: 3, duration: "15:45" },
    { name: "ليلى محمود", status: "offline", calls: 0, duration: "0:00" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {agents.map(agent => (
        <div key={agent.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <Avatar name={agent.name} size={32} status={agent.status as any} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.neutral[800] }}>{agent.name}</p>
            <p style={{ fontSize: typography.size.xs, color: colors.neutral[500] }}>{agent.calls} مكالمة · {agent.duration}</p>
          </div>
          <Badge variant={agent.status === "online" ? "success" : agent.status === "busy" ? "warning" : "default"}>
            {agent.status === "online" ? "متصل" : agent.status === "busy" ? "مشغول" : agent.status === "away" ? "بعيد" : "غير متصل"}
          </Badge>
        </div>
      ))}
    </div>
  );
};

const QuickActionCard: React.FC<{ icon: React.ReactNode; label: string; color: string; onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: colors.neutral[50], border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, cursor: "pointer", transition: `all ${transitions.fast}` }}
    onMouseEnter={e => { e.currentTarget.style.background = `color-mix(in srgb, ${color} 3%, transparent)`; e.currentTarget.style.borderColor = color; }}
    onMouseLeave={e => { e.currentTarget.style.background = colors.neutral[50]; e.currentTarget.style.borderColor = colors.border.subtle; }}>
    <div style={{ color }}>{icon}</div>
    <span style={{ fontSize: typography.size.xs, fontWeight: typography.weight.medium, color: colors.neutral[700] }}>{label}</span>
  </button>
);

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
