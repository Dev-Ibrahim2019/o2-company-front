// src/components/administration/OrgStructure/OrgStructure.tsx
// كل تبويب (فروع/أقسام/مسميات/موظفين) يدير بياناته والحفظ عبر الـ API الحقيقي مباشرة

import React from "react";
import HeaderOrg from "./HeaderOrg";

export const OrgStructure: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-100">
      <HeaderOrg />
    </div>
  );
};
