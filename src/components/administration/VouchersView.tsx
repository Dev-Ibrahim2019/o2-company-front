import { useState } from "react";
import { VoucherListPage } from "./VoucherListPage";
import { VoucherFormPage } from "./VoucherFormPage";
import type { VoucherType } from "../../types/voucher";

interface Props {
  defaultType?: VoucherType;
  title?: string;
  subtitle?: string;
}

export const VouchersView: React.FC<Props> = ({ defaultType, title, subtitle }) => {
  const [view, setView] = useState<"list" | "form">("list");
  const [voucherType, setVoucherType] = useState<VoucherType>(defaultType || "receipt");
  const [editingId, setEditingId] = useState<number | undefined>();

  const openForm = (type?: VoucherType, id?: number) => {
    if (type) setVoucherType(type);
    if (id) setEditingId(id);
    else setEditingId(undefined);
    setView("form");
  };

  if (view === "form") {
    return (
      <VoucherFormPage
        voucherType={voucherType}
        editingId={editingId}
        onBack={() => setView("list")}
        onSaved={() => setView("list")}
      />
    );
  }

  return <VoucherListPage onOpenForm={openForm} defaultTab={defaultType} title={title} subtitle={subtitle} />;
};
