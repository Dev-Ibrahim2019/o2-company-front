/**
 * DepartmentsPage.tsx — صفحة إدارة الأقسام
 * تجلب الفروع من الـ API ديناميكياً
 */

import React from "react";
import DynamicCRUDTable from "../components/shared/DynamicCRUDTable";
import { PERMISSIONS } from "../auth/permissions";

const DepartmentsPage: React.FC = () => {
  return (
    <DynamicCRUDTable
      title="إدارة الأقسام"
      apiEndpoint="/departments"
      requiredPermission={PERMISSIONS.MANAGE_DEPARTMENTS}
      columns={[
        { key: "id", label: "المعرف" },
        { key: "name", label: "اسم القسم" },
        { key: "nameAr", label: "الاسم بالعربي" },
        { key: "shortName", label: "الاسم المختصر" },
        {
          key: "status",
          label: "الحالة",
          render: (val: string) => (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${val === "ACTIVE" ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
              {val === "ACTIVE" ? "نشط" : "معطّل"}
            </span>
          ),
        },
        { key: "description", label: "الوصف" },
      ]}
      formFields={[
        { name: "name", label: "اسم القسم (إنجليزي)", type: "text", required: true },
        { name: "nameAr", label: "الاسم بالعربي", type: "text" },
        { name: "shortName", label: "الاسم المختصر", type: "text" },
        {
          name: "branchId",
          label: "الفرع",
          type: "select",
          required: true,
          fetchOptions: { endpoint: "/branches", valueKey: "id", labelKey: "name" },
        },
        { name: "description", label: "الوصف", type: "textarea" },
        { name: "status", label: "الحالة", type: "select", required: true, options: [
          { value: "ACTIVE", label: "نشط" },
          { value: "INACTIVE", label: "معطّل" },
        ]},
      ]}
    />
  );
};

export default DepartmentsPage;