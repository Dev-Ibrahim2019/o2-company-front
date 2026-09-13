/**
 * EmployeesPage.tsx — صفحة إدارة الموظفين
 * تجلب الفروع والأقسام من الـ API ديناميكياً
 */

import React from "react";
import DynamicCRUDTable from "../components/shared/DynamicCRUDTable";
import { PERMISSIONS } from "../auth/permissions";

const EmployeesPage: React.FC = () => {
  return (
    <DynamicCRUDTable
      title="إدارة الموظفين"
      apiEndpoint="/employees"
      requiredPermission={PERMISSIONS.MANAGE_EMPLOYEES}
      columns={[
        { key: "id", label: "المعرف" },
        { key: "name", label: "الاسم" },
        { key: "phone", label: "الهاتف" },
        { key: "email", label: "البريد" },
        {
          key: "status",
          label: "الحالة",
          render: (val: string) => (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              val === "ACTIVE" ? "bg-green-600/20 text-green-400" :
              val === "ON_LEAVE" ? "bg-yellow-600/20 text-yellow-400" :
              "bg-red-600/20 text-red-400"
            }`}>
              {val === "ACTIVE" ? "نشط" : val === "ON_LEAVE" ? "إجازة" : "معطّل"}
            </span>
          ),
        },
        { key: "salary", label: "الراتب" },
      ]}
      formFields={[
        { name: "name", label: "الاسم الكامل", type: "text", required: true },
        { name: "phone", label: "الهاتف", type: "text", required: true },
        { name: "email", label: "البريد الإلكتروني", type: "email" },
        { name: "nationalId", label: "الرقم الوطني", type: "text" },
        { name: "salary", label: "الراتب", type: "number", required: true },
        {
          name: "branch_id",
          label: "الفرع",
          type: "select",
          required: true,
          fetchOptions: { endpoint: "/branches", valueKey: "id", labelKey: "name" },
        },
        {
          name: "department_id",
          label: "القسم",
          type: "select",
          required: true,
          fetchOptions: { endpoint: "/departments", valueKey: "id", labelKey: "name" },
        },
        { name: "status", label: "الحالة", type: "select", required: true, options: [
          { value: "ACTIVE", label: "نشط" },
          { value: "ON_LEAVE", label: "إجازة" },
          { value: "INACTIVE", label: "معطّل" },
        ]},
      ]}
    />
  );
};

export default EmployeesPage;