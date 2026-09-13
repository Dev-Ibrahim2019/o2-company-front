import { useState } from "react";
import { QuotesListPage } from "./QuotesListPage";
import { QuoteFormPage } from "./QuoteFormPage";

export const QuotesView = () => {
  const [view, setView] = useState<"list" | "form">("list");
  const [editId, setEditId] = useState<number | undefined>(undefined);

  const openForm = (id?: number) => {
    setEditId(id);
    setView("form");
  };

  const backToList = () => {
    setView("list");
    setEditId(undefined);
  };

  if (view === "form") {
    return <QuoteFormPage editingId={editId} onBack={backToList} onSaved={backToList} />;
  }

  return <QuotesListPage onOpenForm={openForm} />;
};
