import { useState } from "react";
import { useApp } from "../../../../store";
import { OrderType, EmployeeStatus } from "../../../../types";

export const onSave = () => {
  const {
    departments,
    addBranch,
    addDepartment,
    addJobTitle,
    addJobType,
    addEmployee,
    updateBranch,
    updateDepartment,
    updateJobTitle,
    updateJobType,
    updateEmployee,
    addNotification,
  } = useApp();
  const [modalType, setModalType] = useState<
    "BRANCH" | "DEPT" | "JOB_TITLE" | "JOB_TYPE" | "EMP" | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  try {
    if (modalType === "BRANCH") {
      if (editingId) updateBranch(editingId, formData);
      else addBranch(formData);
    } else if (modalType === "DEPT") {
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
    } else if (modalType === "JOB_TITLE") {
      if (editingId) updateJobTitle(editingId, formData);
      else addJobTitle(formData);
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
    setModalType(null);
    setEditingId(null);
    setFormData({});
  } catch (error) {
    addNotification("حدث خطأ أثناء حفظ البيانات");
  }
};
