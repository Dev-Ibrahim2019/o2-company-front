/**
 * SuppliersPage.tsx — صفحة إدارة الموردين
 */

import React from "react";
import DynamicCRUDTable from "../components/shared/DynamicCRUDTable";
import { PERMISSIONS } from "../auth/permissions";

const SuppliersPage: React.FC = () => {
  return (
    <DynamicCRUDTable
      title="إدارة الموردين"
      apiEndpoint="/suppliers"
      requiredPermission={PERMISSIONS.MANAGE_SUPPLIERS}
      columns={[
        { key: "id", label: "المعرف" },
        { key: "name", label: "اسم المورد" },
        { key: "phone", label: "الهاتف" },
        { key: "email", label: "البريد" },
        { key: "address", label: "العنوان" },
        {
          key: "balance",
          label: "الرصيد",
          render: (val) => (
            <span className={`font-bold ${val > 0 ? "text-red-400" : "text-green-400"}`}>
              {Number(val ?? 0).toLocaleString()}₪
            </span>
          ),
        },
      ]}
      formFields={[
        { name: "name", label: "اسم المورد", type: "text", required: true },
        { name: "phone", label: "الهاتف", type: "text", required: true },
        { name: "email", label: "البريد الإلكتروني", type: "email" },
        { name: "address", label: "العنوان", type: "text" },
      ]}
    />
  );
};

export default SuppliersPage;