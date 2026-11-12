/**
 * kardexGroups.ts — تجميع حركات "استهلاك بيع" المتتالية في كرت الصنف (عرض فقط، على صفحة البيانات الراجعة).
 *
 * يُجمَّع المتتالي فقط (لا حركة من نوع آخر بينها) حتى يبقى الرصيد الجاري متسلسلاً: رصيد السطر المجمّع = رصيد
 * آخر حركة فيه. عكس حركة البيع (نوعه sale أيضاً لكن reversal_of_id محدد) لا يدخل في التجميع ويقطع المجموعة.
 * المجموعة ذات الحركة الواحدة تبقى سطراً عادياً. التجميع داخل الصفحة الواحدة: مجموعة قطعها الترقيم تُجمَّع
 * في كل صفحة على حدة.
 */

import type { KardexRow } from "../../../services/inventoryService";

export type KardexEntry = { kind: "row"; row: KardexRow } | { kind: "group"; key: string; rows: KardexRow[] };

/** حركة استهلاك بيع أصلية (لا عكسها). */
// حركة تصحيح التكلفة (كمية صفر — تسوية نقص أو سعر) لا تُجمَّع مع الاستهلاك.
export const isSaleConsumption = (r: KardexRow) =>
  r.type === "sale" && r.reversal_of_id === null && !(r as KardexRow & { is_cost_adjustment?: boolean }).is_cost_adjustment;

export function groupSaleRuns(rows: KardexRow[]): KardexEntry[] {
  const out: KardexEntry[] = [];
  let run: KardexRow[] = [];
  const flush = () => {
    if (run.length === 1) out.push({ kind: "row", row: run[0] });
    else if (run.length > 1) out.push({ kind: "group", key: `sale-${run[0].id}`, rows: run });
    run = [];
  };
  for (const r of rows) {
    if (isSaleConsumption(r)) {
      run.push(r);
      continue;
    }
    flush();
    out.push({ kind: "row", row: r });
  }
  flush();
  return out;
}

export interface SaleRunSummary {
  /** عدد الطلبات المختلفة (طلب واحد قد يستهلك الصنف في أكثر من سطر). */
  orders: number;
  movements: number;
  firstDay: string;
  lastDay: string;
  firstAt: string;
  lastAt: string;
  quantityIn: number;
  quantityOut: number;
  /** سعر الوحدة: نفسه إن تساوى في كل الحركات، وإلا المتوسط المرجّح بالكمية الصادرة. */
  unitCost: number;
  uniformCost: boolean;
  /** رصيد آخر حركة في المجموعة. */
  runningQuantity: string;
  /** اسم المخزن إن كان واحداً، وإلا null (كل المخازن). */
  warehouse: string | null;
  account: string | null;
}

const num = (v: string | null | undefined) => Number(v ?? 0) || 0;

export function summarizeSaleRun(rows: KardexRow[]): SaleRunSummary {
  const first = rows[0];
  const last = rows[rows.length - 1];
  let qIn = 0;
  let qOut = 0;
  let value = 0;
  for (const r of rows) {
    qIn += num(r.quantity_in);
    qOut += num(r.quantity_out);
    // قيمة الصادر = الكمية × تكلفة الوحدة؛ المتوسط المرجّح = Σ القيمة ÷ Σ الكمية
    value += num(r.quantity_out) * num(r.unit_cost);
  }
  const uniformCost = rows.every((r) => num(r.unit_cost) === num(first.unit_cost));
  const same = <T,>(pick: (r: KardexRow) => T) => (rows.every((r) => pick(r) === pick(first)) ? pick(first) : null);
  return {
    orders: new Set(rows.map((r) => r.number ?? `#${r.id}`)).size,
    movements: rows.length,
    firstDay: first.accounting_day,
    lastDay: last.accounting_day,
    firstAt: first.occurred_at,
    lastAt: last.occurred_at,
    quantityIn: qIn,
    quantityOut: qOut,
    unitCost: uniformCost || qOut === 0 ? num(first.unit_cost) : value / qOut,
    uniformCost,
    runningQuantity: last.running_quantity,
    warehouse: same((r) => r.warehouse?.name ?? null),
    account: same((r) => r.account_name ?? null),
  };
}
