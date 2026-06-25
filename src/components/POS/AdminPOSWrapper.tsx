/**
 * AdminPOSWrapper.tsx — مكوّن يحزم POS داخل AdminLayout
 * ───────────────────────────────────────────────────
 * يستخدم في مسار /admin/pos لتمكين المدير والمحاسب
 * من الوصول لواجهة الكاشير من داخل لوحة الإدارة
 * مع الحفاظ على السايد بار الخاص بالإدارة
 */

import React from "react";
import { POS } from "./pos";

const AdminPOSWrapper: React.FC = () => {
  return (
    <div className="h-full">
      <POS onViewTables={() => {}} initialMode="menu" />
    </div>
  );
};

export default AdminPOSWrapper;