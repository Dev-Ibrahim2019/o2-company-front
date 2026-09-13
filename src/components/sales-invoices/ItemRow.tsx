import { Trash2 } from "lucide-react";
import type { SalesInvoiceItem } from "../../types/salesInvoice";
import { TAX_RATES } from "../../types/salesInvoice";

interface Props {
  item: SalesInvoiceItem;
  index: number;
  showDelete: boolean;
  onItemInputMount: (el: HTMLInputElement | null) => void;
  onQtyMount: (el: HTMLInputElement | null) => void;
  onItemInputChange: (idx: number, value: string) => void;
  onUpdate: (idx: number, field: string, value: any) => void;
  onRemove: (idx: number) => void;
  onQtyEnter: (idx: number) => void;
  symbol: string;
}

export const ItemRow = ({
  item,
  index,
  showDelete,
  onItemInputMount,
  onQtyMount,
  onItemInputChange,
  onUpdate,
  onRemove,
  onQtyEnter,
  symbol,
}: Props) => {
  return (
    <tr className="hover:bg-[var(--o2-border)] transition-colors">
      <td className="px-4 py-3 text-center text-xs font-medium text-[var(--o2-muted)]">{index + 1}</td>

      {/* Item search (first input - Requirement 3: numeric→fetch, text→modal) */}
      <td className="px-4 py-3">
        <input
          ref={onItemInputMount}
          type="text"
          value={item.item_name}
          onChange={(e) => onItemInputChange(index, e.target.value)}
          className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2 text-sm text-[var(--o2-text)] placeholder:text-[var(--o2-muted)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition"
          placeholder="رقم الصنف أو اسمه..."
          autoComplete="off"
        />
      </td>

      {/* Quantity (Requirement 4: no +/- spinners, Enter→new row) */}
      <td className="px-4 py-3">
        <input
          ref={onQtyMount}
          type="number"
          value={item.quantity || ""}
          onChange={(e) => onUpdate(index, "quantity", Number(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onQtyEnter(index); } }}
          className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2 text-sm text-center text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none no-spinner"
          min="0.01"
          step="0.01"
          placeholder="0"
        />
      </td>

      {/* Unit Price */}
      <td className="px-4 py-3">
        <input
          type="number"
          value={item.unit_price || ""}
          onChange={(e) => onUpdate(index, "unit_price", Number(e.target.value))}
          className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2 text-sm text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none no-spinner"
          min="0"
          step="0.01"
          placeholder="0"
        />
      </td>

      {/* Discount */}
      <td className="px-4 py-3">
        <input
          type="number"
          value={item.discount || ""}
          onChange={(e) => onUpdate(index, "discount", Number(e.target.value))}
          className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-3 py-2 text-sm text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none no-spinner"
          min="0"
          step="0.01"
          placeholder="0"
        />
      </td>

      {/* Total Before Tax (computed) */}
      <td className="px-4 py-3 text-sm font-semibold text-[var(--o2-muted)] bg-[var(--o2-surface-raised)] text-left ltr" dir="ltr">
        {Number(item.total_before_tax || 0).toFixed(2)}
      </td>

      {/* Tax Rate */}
      <td className="px-4 py-3">
        <select
          value={item.tax_rate}
          onChange={(e) => onUpdate(index, "tax_rate", Number(e.target.value))}
          className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-2 py-2 text-sm text-center text-[var(--o2-text)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none"
        >
          {TAX_RATES.map((r) => (
            <option key={r} value={r}>{r}%</option>
          ))}
        </select>
      </td>

      {/* Tax Amount (computed) */}
      <td className="px-4 py-3 text-sm font-medium text-[var(--o2-muted)] text-left ltr" dir="ltr">
        {Number(item.tax_amount || 0).toFixed(2)}
      </td>

      {/* Total (computed) */}
      <td className="px-4 py-3 text-sm font-bold text-[var(--o2-brand-text)] bg-[var(--o2-brand-soft)] text-left ltr" dir="ltr">
        {Number(item.total || 0).toFixed(2)}
      </td>

      {/* Delete */}
      <td className="px-4 py-3">
        {showDelete && (
          <button onClick={() => onRemove(index)} className="p-1.5 text-[var(--o2-muted)] hover:text-[var(--o2-brand-text)] hover:bg-[var(--o2-brand-soft)] rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
};
