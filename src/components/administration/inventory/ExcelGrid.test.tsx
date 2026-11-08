// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExcelGrid, gridInput, gridTd, useExcelGridNav } from "./ExcelGrid";
import { DocToolbar, comboOf, normalizeKeys, type ToolbarItem } from "./DocToolbar";

afterEach(cleanup);

/** جدول تجريبي: 3 أعمدة إدخال (رقم 1، كمية 5، ملاحظة 8). */
const Grid: React.FC<{ onDelete?: (row: number) => void; enterCols?: number[] }> = ({ onDelete, enterCols }) => {
  const [rows, setRows] = useState(["أ", "ب"]);
  const nav = useExcelGridNav({
    enterCols,
    onDeleteRow: (row) => {
      onDelete?.(row);
      setRows((r) => r.filter((_, i) => i !== row));
    },
    onRowEnd: () => setRows((r) => [...r, ""]),
  });
  return (
    <div dir="rtl">
      <ExcelGrid
        ref={nav.gridRef}
        ariaLabel="جدول تجريبي"
        columns={[
          { key: "code", label: "رقم الصنف" },
          { key: "qty", label: "الكمية" },
          { key: "notes", label: "ملاحظات" },
        ]}
        onKeyDown={nav.onKeyDown}
        onFocus={nav.onFocus}
      >
        {rows.map((r, row) => (
          <tr key={`${r}-${row}`}>
            {[1, 5, 8].map((col) => (
              <td key={col} className={gridTd}>
                <input className={gridInput} aria-label={`r${row}c${col}`} defaultValue={col === 1 ? r : ""} data-row={row} data-col={col} />
              </td>
            ))}
          </tr>
        ))}
      </ExcelGrid>
      <span data-testid="active">{nav.activeRow ?? -1}</span>
    </div>
  );
};

const cell = (row: number, col: number) => screen.getByLabelText(`r${row}c${col}`) as HTMLInputElement;

describe("ExcelGrid — التنقل بلوحة المفاتيح في جدول RTL", () => {
  it("Enter وTab للخانة التالية، وShift+Enter للسابقة، وآخر السطر ينتقل لأول السطر التالي", () => {
    render(<Grid />);
    cell(0, 1).focus();
    fireEvent.keyDown(cell(0, 1), { key: "Enter" });
    expect(document.activeElement).toBe(cell(0, 5));
    fireEvent.keyDown(cell(0, 5), { key: "Tab" });
    expect(document.activeElement).toBe(cell(0, 8));
    fireEvent.keyDown(cell(0, 8), { key: "Enter" });
    expect(document.activeElement).toBe(cell(1, 1));
    fireEvent.keyDown(cell(1, 1), { key: "Enter", shiftKey: true });
    expect(document.activeElement).toBe(cell(0, 8));
  });

  it("المسار السريع enterCols: رقم الصنف ← الكمية ← السطر التالي، وEnter في آخر سطر يضيف سطراً", () => {
    render(<Grid enterCols={[1, 5]} />);
    cell(0, 1).focus();
    fireEvent.keyDown(cell(0, 1), { key: "Enter" });
    expect(document.activeElement).toBe(cell(0, 5));
    fireEvent.keyDown(cell(0, 5), { key: "Enter" });
    expect(document.activeElement).toBe(cell(1, 1));
    fireEvent.keyDown(cell(1, 1), { key: "Enter" });
    fireEvent.keyDown(cell(1, 5), { key: "Enter" });
    // سطر جديد أُضيف (onRowEnd)
    expect(screen.getByLabelText("r2c1")).toBeTruthy();
  });

  it("↑/↓ نفس العمود، و←/→ بالاتجاه البصري في RTL (← التالي، → السابق)", () => {
    render(<Grid />);
    cell(0, 5).focus();
    fireEvent.keyDown(cell(0, 5), { key: "ArrowDown" });
    expect(document.activeElement).toBe(cell(1, 5));
    fireEvent.keyDown(cell(1, 5), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(cell(1, 8));
    fireEvent.keyDown(cell(1, 8), { key: "ArrowRight" });
    expect(document.activeElement).toBe(cell(1, 5));
    fireEvent.keyDown(cell(1, 5), { key: "ArrowUp" });
    expect(document.activeElement).toBe(cell(0, 5));
    expect(screen.getByTestId("active").textContent).toBe("0");
  });

  it("السهم داخل نص فيه مؤشر يحرك المؤشر أولاً ولا يغادر الخانة", () => {
    render(<Grid />);
    const c = cell(0, 1); // قيمتها "أ"
    c.focus();
    c.setSelectionRange(1, 1); // المؤشر في آخر النص (RTL)
    fireEvent.keyDown(c, { key: "ArrowRight" });
    expect(document.activeElement).toBe(c);
  });

  it("Ctrl+Delete يحذف السطر", () => {
    const onDelete = vi.fn();
    render(<Grid onDelete={onDelete} />);
    cell(1, 5).focus();
    fireEvent.keyDown(cell(1, 5), { key: "Delete", ctrlKey: true });
    expect(onDelete).toHaveBeenCalledWith(1);
    expect(screen.queryByLabelText("r1c1")).toBeNull();
  });

  it("الترويسة ثابتة والجدول يتمرر داخل حاويته", () => {
    render(<Grid />);
    const region = screen.getByRole("region", { name: "جدول تجريبي" });
    expect(region.className).toContain("overflow-auto");
    expect(region.querySelector("thead")?.className).toContain("sticky");
  });
});

describe("DocToolbar — الاختصارات من قائمة الأزرار نفسها", () => {
  it("يطابق صيغة الاختصار المعروضة مع ضغطة المفاتيح", () => {
    expect(normalizeKeys("Ctrl+P")).toBe(comboOf({ ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, key: "p" }));
    expect(normalizeKeys("Alt+PageDown")).toBe(comboOf({ ctrlKey: false, metaKey: false, altKey: true, shiftKey: false, key: "PageDown" }));
    expect(normalizeKeys("Esc")).toBe("escape");
    expect(normalizeKeys("Ctrl+Del")).toBe("ctrl+delete");
  });

  it("المفتاح يشغّل إجراءه، ويُعرض بجانب الزر، والمعطّل والمخفي لا يستجيبان", () => {
    const onNew = vi.fn();
    const onSave = vi.fn();
    const onHidden = vi.fn();
    const onNext = vi.fn();
    const items: ToolbarItem[] = [
      { id: "new", label: "جديد", icon: () => null, keys: "F3", onClick: onNew },
      { id: "save", label: "حفظ", icon: () => null, keys: "F2", disabled: true, onClick: onSave },
      { id: "x", label: "مخفي", icon: () => null, keys: "F8", hidden: true, onClick: onHidden },
      { id: "next", label: "التالي", icon: () => null, keys: "Alt+PageDown", onClick: onNext },
    ];
    render(<DocToolbar items={items} />);
    expect(screen.getByTitle("جديد (F3)")).toBeTruthy();
    expect(screen.queryByTitle(/مخفي/)).toBeNull();

    fireEvent.keyDown(window, { key: "F3" });
    fireEvent.keyDown(window, { key: "F2" });
    fireEvent.keyDown(window, { key: "F8" });
    fireEvent.keyDown(window, { key: "PageDown", altKey: true });
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(onHidden).not.toHaveBeenCalled();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("داخل خانة كتابة: الحروف نص لا اختصار، أما F وCtrl فتعمل", () => {
    const onGuide = vi.fn();
    const onPrint = vi.fn();
    const onNew = vi.fn();
    render(
      <>
        <input aria-label="ملاحظة" />
        <DocToolbar
          items={[
            { id: "q", label: "حرف", icon: () => null, keys: "Shift+?", onClick: onGuide },
            { id: "print", label: "طباعة", icon: () => null, keys: "Ctrl+P", onClick: onPrint },
            { id: "new", label: "جديد", icon: () => null, keys: "F3", onClick: onNew },
          ]}
        />
      </>,
    );
    const input = screen.getByLabelText("ملاحظة");
    input.focus();
    fireEvent.keyDown(input, { key: "?", shiftKey: true });
    fireEvent.keyDown(input, { key: "p", ctrlKey: true });
    fireEvent.keyDown(input, { key: "F3" });
    expect(onGuide).not.toHaveBeenCalled();
    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("الاختصارات تتوقف ونافذة حوار مفتوحة (shortcutsEnabled=false)", () => {
    const onNew = vi.fn();
    render(<DocToolbar items={[{ id: "new", label: "جديد", icon: () => null, keys: "F3", onClick: onNew }]} shortcutsEnabled={false} />);
    fireEvent.keyDown(window, { key: "F3" });
    expect(onNew).not.toHaveBeenCalled();
  });
});
