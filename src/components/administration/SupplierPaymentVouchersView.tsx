import { useState } from "react";
import { SupplierPaymentVouchersPage } from "./SupplierPaymentVouchersPage";
import { SupplierPaymentVoucherDrawer } from "./SupplierPaymentVoucherDrawer";

export const SupplierPaymentVouchersView: React.FC = () => {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<number | undefined>();

  const openForm = (id?: number) => {
    setEditingId(id);
    setView("form");
  };

  if (view === "form") {
    return (
      <SupplierPaymentVoucherDrawer
        editingId={editingId}
        onBack={() => setView("list")}
        onSaved={() => setView("list")}
      />
    );
  }

  return (
    <SupplierPaymentVouchersPage
      onCreate={() => openForm()}
      onEdit={(id) => openForm(id)}
      onView={(id) => openForm(id)}
    />
  );
};
