import { LayoutDashboard, UsersRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import "./crm.css";

export function CrmShell() {
  return <main className="crm" dir="rtl">
    <header className="crm-header">
      <div><span className="crm-eyebrow">مساحة تشغيل موحّدة</span><h1>إدارة علاقات العملاء</h1><p>رؤية عملية للعميل من أول تواصل وحتى المتابعة المالية.</p></div>
      <nav aria-label="أقسام إدارة علاقات العملاء">
        <NavLink end to="/admin/crm"><LayoutDashboard />نظرة عامة</NavLink>
        <NavLink to="/admin/crm/customers"><UsersRound />دليل العملاء</NavLink>
      </nav>
    </header>
    <Outlet />
  </main>;
}
