// src/components/administration/OrgStructure/OrgStructure.tsx
// النسخة المحدّثة - الفروع والمسميات الوظيفية تعمل مع الـ API الحقيقي

import React, { useState } from "react";
import { useApp } from "../../../../store";
import { AnimatePresence } from "framer-motion";

import HeaderOrg from "./HeaderOrg";
import DepartmentContainer from "./DepartmentContainer";
import EmployeeContainer from "./EmployeeContainer";
import ModalContainer from "./ModalContainer";

import { OrderType, EmployeeStatus } from "../../../../types";

export type ModalType =
  | "DEPT"
  | "JOB_TYPE"
  | "EMP"
  | null;

export const OrgStructure: React.FC = () => {
  const {
    departments,
    addDepartment,
    addJobType,
    addEmployee,
    updateDepartment,
    updateJobType,
    updateEmployee,
    addNotification,
  } = useApp();

  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const openAdd = (type: any) => {
    // فقط الأنواع التي لا تعمل مع الـ API المستقل
    if (type === "BRANCH" || type === "JOB_TITLE") return;
    setEditingId(null);
    setFormData({});
    setModalType(type as ModalType);
  };

  const openEdit = (type: any, id: string, data: any) => {
    if (type === "BRANCH" || type === "JOB_TITLE") return;
    setEditingId(id);
    setFormData(data);
    setModalType(type as ModalType);
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
    setFormData({});
  };

  const onSave = () => {
    try {
      if (modalType === "DEPT") {
        if (editingId) updateDepartment(editingId, formData);
        else
          addDepartment({
            ...formData,
            hasKds: formData.hasKds || false,
            displayOrder: departments.length + 1,
            status: "ACTIVE",
            priority: 1,
            defaultPrepTime: 10,
            maxConcurrentOrders: 10,
            requiresAssembly: true,
            notifications: { sound: true, flash: true, push: true },
            orderTypeVisibility: [
              OrderType.DINE_IN,
              OrderType.TAKEAWAY,
              OrderType.DELIVERY,
            ],
          });
      } else if (modalType === "JOB_TYPE") {
        if (editingId) updateJobType(editingId, formData);
        else addJobType(formData);
      } else if (modalType === "EMP") {
        if (editingId) updateEmployee(editingId, formData);
        else
          addEmployee({
            ...formData,
            hireDate: new Date(),
            status: EmployeeStatus.ACTIVE,
            permissions: ["ALL"],
          });
      }

      addNotification(`تم ${editingId ? "تحديث" : "إضافة"} البيانات بنجاح`);
      closeModal();
    } catch {
      addNotification("حدث خطأ أثناء حفظ البيانات");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-100">
      <HeaderOrg onAdd={openAdd} onEdit={openEdit} />

      {/* Modals للأنواع التي لا تزال تستخدم الـ store */}
      <AnimatePresence>
        {modalType === "DEPT" && (
          <ModalContainer
            title={editingId ? "تعديل بيانات القسم" : "إضافة قسم تشغيلي جديد"}
            onClose={closeModal}
            onSave={onSave}
          >
            <DepartmentContainer
              formData={formData}
              onChange={setFormData}
            />
          </ModalContainer>
        )}

        {modalType === "EMP" && (
          <ModalContainer
            title={editingId ? "تحديث بيانات الموظف" : "تسجيل موظف جديد"}
            onClose={closeModal}
            onSave={onSave}
          >
            <EmployeeContainer
              formData={formData}
              onChange={setFormData}
            />
          </ModalContainer>
        )}
      </AnimatePresence>
    </div>
  );
};