import { useState } from "react";
import { PurchaseBillsPage } from "./PurchaseBillsPage";
import { PurchaseBillFormPage } from "./PurchaseBillFormPage";

export const PurchaseBillsView: React.FC = () => {
  const [view, setView] = useState<"list" | "form">("list");
  const [editId, setEditId] = useState<number | undefined>(undefined);

  const handleOpenForm = (id?: number) => {
    setEditId(id);
    setView("form");
  };

  const handleBack = () => {
    setView("list");
    setEditId(undefined);
  };

  if (view === "form") {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar">
        <PurchaseBillFormPage billId={editId} onBack={handleBack} onSaved={handleBack} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <PurchaseBillsPage onCreate={() => handleOpenForm()} onEdit={handleOpenForm} onView={handleOpenForm} />
    </div>
  );
};
