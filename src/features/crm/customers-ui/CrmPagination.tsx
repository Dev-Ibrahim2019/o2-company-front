import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [10, 20, 50];

function pageWindow(current: number, last: number, size = 5): number[] {
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = Math.min(last, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function CrmPagination({
  currentPage,
  lastPage,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
}: {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) {
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);
  const pages = pageWindow(currentPage, lastPage);

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--crmx-border)] px-5 py-3.5">
      <p className="text-[13px] text-[var(--crmx-text-secondary)]">
        عرض {from.toLocaleString("ar")}–{to.toLocaleString("ar")} من {total.toLocaleString("ar")} عميل
      </p>
      <div className="flex items-center gap-3">
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="h-9 rounded-lg border border-[var(--crmx-border)] bg-white px-2 text-[13px] text-[var(--crmx-text)] outline-none"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n} / صفحة</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            aria-label="الصفحة السابقة"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--crmx-border)] text-[var(--crmx-text-secondary)] disabled:opacity-40 enabled:hover:bg-[var(--crmx-neutral-soft)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-[13px] font-semibold ${
                p === currentPage ? "bg-[var(--crmx-navy)] text-white" : "text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
              }`}
            >
              {p.toLocaleString("ar")}
            </button>
          ))}
          <button
            aria-label="الصفحة التالية"
            disabled={currentPage >= lastPage}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--crmx-border)] text-[var(--crmx-text-secondary)] disabled:opacity-40 enabled:hover:bg-[var(--crmx-neutral-soft)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
