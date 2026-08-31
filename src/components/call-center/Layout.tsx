import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useApp } from "../../../store";
import { useAuth } from "../../auth";
import { AnimatePresence, motion } from "framer-motion";
import { CallPhoneWidget } from "./components/CallPhoneWidget";
import { CallCenterThemeToggle } from "./components/CallCenterThemeToggle";
import {
  Headphones,
  LayoutDashboard,
  Database,
  Search,
  MessageSquareWarning,
  Gift,
  Users,
  Star,
  ShoppingCart,
  Power,
  ChevronRight,
  ChevronLeft,
  Menu,
  Phone,
  ClipboardList,
  CheckCircle,
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "./design/tokens";

const FULL_BLEED_PATHS = new Set(["/call-center/pos"]);

export const CallCenterLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useApp();
  const { logout: authLogout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const collapsed = !isSidebarOpen;
  const isFullBleed = FULL_BLEED_PATHS.has(location.pathname);

  const SidebarLink = ({ to, icon: Icon, label, end = false }: {
    to: string; icon: React.ElementType; label: string; end?: boolean;
  }) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => { if (window.innerWidth <= 1024) setIsSidebarOpen(false); }}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 12,
        padding: collapsed ? "10px 0" : "10px 14px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: radius.lg,
        fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
        color: isActive ? "#fff" : colors.neutral[500],
        background: isActive ? colors.brand[500] : "transparent",
        boxShadow: isActive ? shadows.sm : "none",
        transition: `all ${transitions.fast}`,
        textDecoration: "none",
        whiteSpace: "nowrap",
        overflow: "hidden",
      })}
      className="cc-sidebar-link"
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
    </NavLink>
  );

  return (
    <div
      dir="rtl"
      data-callcenter-root
      style={{
        display: "flex", height: "100vh", overflow: "hidden",
        background: colors.surface.page,
        color: colors.neutral[900],
        fontFamily: typography.fontFamily.sans,
      }}
    >
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth <= 1024 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 40 }}
            className="lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        style={{
          position: "fixed", top: 0, right: 0, height: "100%",
          background: colors.surface.raised,
          borderLeft: `1px solid ${colors.border.subtle}`,
          display: "flex", flexDirection: "column",
          padding: 16,
          boxShadow: shadows.lg,
          transition: `all ${transitions.normal}`,
          zIndex: 50,
        }}
        className={`cc-sidebar ${isSidebarOpen ? "cc-sidebar-open" : "cc-sidebar-closed"}`}
      >
        <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 12, padding: collapsed ? 0 : "0 6px", justifyContent: collapsed ? "center" : "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
            <div style={{
              width: 38, height: 38, borderRadius: radius.lg, flexShrink: 0,
              background: `linear-gradient(135deg, ${colors.brand[500]}, ${colors.brand[700]})`,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
              boxShadow: shadows.sm,
            }}>
              <Headphones size={20} />
            </div>
            {!collapsed && (
              <div style={{ overflow: "hidden" }}>
                <h1 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.extrabold, color: colors.neutral[900], letterSpacing: "-0.01em" }}>الكول سنتر</h1>
                <p style={{ fontSize: 9, fontWeight: typography.weight.bold, color: colors.neutral[400], textTransform: "uppercase", letterSpacing: "0.08em" }}>Call Center</p>
              </div>
            )}
          </div>
          {!collapsed && <CallCenterThemeToggle size={32} />}
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? "طي القائمة الجانبية" : "فتح القائمة الجانبية"}
          className="hidden lg:flex"
          style={{
            position: "absolute", left: -12, top: 76, width: 24, height: 24,
            borderRadius: "50%", background: colors.brand[500], color: "#fff",
            alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer",
            boxShadow: shadows.md, zIndex: 60,
          }}
        >
          {isSidebarOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          <SidebarLink to="/call-center" icon={LayoutDashboard} label="لوحة العمليات" end />
          <SidebarLink to="/call-center/order" icon={ShoppingCart} label="صفحة الطلب" />
          <SidebarLink to="/call-center/active-orders" icon={ClipboardList} label="الطلبات النشطة" />
          <SidebarLink to="/call-center/closed-orders" icon={CheckCircle} label="الطلبات المغلقة" />
          {/* <SidebarLink to="/call-center/crm" icon={Database} label="العملاء" /> */}
          {/* <SidebarLink to="/call-center/search" icon={Search} label="المكالمات والبحث" /> */}
          {/* <SidebarLink to="/call-center/complaints" icon={MessageSquareWarning} label="الشكاوى والمتابعة" /> */}
          {/* <SidebarLink to="/call-center/occasions" icon={Gift} label="المناسبات" /> */}
          {/* <SidebarLink to="/call-center/top-customers" icon={Star} label="الولاء والعملاء المميزون" /> */}
          <SidebarLink to="/call-center/employees" icon={Users} label="الموظفون" />
          <SidebarLink to="/call-center/sip-settings" icon={Phone} label="إعدادات SIP" />
        </nav>

        <div style={{ marginTop: "auto", borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 12 }}>
          {!collapsed && (
            <div style={{ padding: "6px 10px", marginBottom: 4 }}>
              <p style={{ fontSize: 9, fontWeight: typography.weight.bold, color: colors.neutral[400], textTransform: "uppercase", letterSpacing: "0.08em" }}>مركز الاتصال</p>
              <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.neutral[800], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser?.name}</p>
            </div>
          )}
          <button
            onClick={() => authLogout()}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: collapsed ? "10px 0" : "10px 14px",
              justifyContent: collapsed ? "center" : "flex-start",
              color: colors.semantic.error, background: "transparent", border: "none",
              borderRadius: radius.lg, cursor: "pointer", fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
              transition: `background ${transitions.fast}`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.semantic.errorBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Power size={18} />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      <main
        style={{ flex: 1, height: "100%", overflow: "hidden", transition: `margin ${transitions.normal}` }}
        className={`cc-main ${isSidebarOpen ? "cc-main-open" : "cc-main-closed"}`}
      >
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <header
            className="lg:hidden"
            style={{
              padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: `1px solid ${colors.border.subtle}`, background: colors.surface.raised,
            }}
          >
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="فتح القائمة"
              style={{ padding: 8, background: colors.neutral[100], borderRadius: radius.lg, border: "none", color: colors.neutral[600], cursor: "pointer" }}
            >
              <Menu size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: radius.md, background: colors.brand[500], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <Headphones size={16} />
                </div>
                <h1 style={{ fontSize: typography.size.base, fontWeight: typography.weight.extrabold, color: colors.neutral[900] }}>الكول سنتر</h1>
              </div>
              <CallCenterThemeToggle size={30} />
            </div>
          </header>
          <div
            style={isFullBleed
              ? { flex: 1, overflow: "hidden" }
              : { flex: 1, overflow: "auto", padding: 20 }}
          >
            {children || <Outlet />}
          </div>
        </div>
      </main>

      <style>{`
        .cc-sidebar { width: 256px; transform: translateX(100%); }
        .cc-sidebar-open { transform: translateX(0); }
        .cc-main-open, .cc-main-closed { margin-right: 0; }
        @media (min-width: 1025px) {
          .cc-sidebar { transform: translateX(0); }
          .cc-sidebar-closed { width: 76px; }
          .cc-sidebar-open { width: 256px; }
          .cc-main-closed { margin-right: 76px; }
          .cc-main-open { margin-right: 256px; }
        }
      `}</style>

      <CallPhoneWidget />
    </div>
  );
};
