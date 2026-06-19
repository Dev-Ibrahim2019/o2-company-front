/**
 * BranchesPage.tsx — صفحة إدارة الفروع
 */

import React from "react";
import DynamicCRUDTable from "../components/shared/DynamicCRUDTable";
import { PERMISSIONS } from "../auth/permissions";

const BranchesPage: React.FC = () => {
  return (
    <DynamicCRUDTable
      title="إدارة الفروع"
      apiEndpoint="/branches"
      requiredPermission={PERMISSIONS.MANAGE_BRANCHES}
      columns={[
        { key: "id", label: "المعرف" },
        { key: "name", label: "اسم الفرع" },
        { key: "address", label: "العنوان" },
        { key: "phone", label: "الهاتف" },
        {
          key: "is_active",
          label: "الحالة",
          render: (val) => (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${val ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
              {val ? "نشط" : "معطّل"}
            </span>
          ),
        },
        {
          key: "employees_count",
          label: "الموظفين",
          render: (val) => (
            <span className="px-2 py-1 bg-slate-700 rounded-full text-xs font-bold text-slate-300">
              {val ?? 0}
            </span>
          ),
        },
      ]}
      formFields={[
        { name: "name", label: "اسم الفرع", type: "text", required: true },
        { name: "code", label: "كود الفرع", type: "text", required: true },
        { name: "address", label: "العنوان", type: "text" },
        { name: "phone", label: "الهاتف", type: "text" },
        { name: "openingTime", label: "وقت الفتح", type: "text", required: true },
        { name: "closingTime", label: "وقت الإغلاق", type: "text", required: true },
        { name: "isMainBranch", label: "الفرع الرئيسي", type: "select", options: [{ value: 1, label: "نعم" }, { value: 0, label: "لا" }], required: true },
        { name: "is_active", label: "نشط", type: "select", options: [{ value: 1, label: "نعم" }, { value: 0, label: "لا" }], required: true },
      ]}
    />
  );
};

export default BranchesPage;