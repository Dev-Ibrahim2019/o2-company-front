/**
 * layersService.ts — تكلفة المخزون بالدفعات (Cost Layers): الدفعات المتاحة للصرف (التحديد المعيّن)، وتقارير الدفعات،
 * ودفعات فاتورة المشتريات ومرتجعاتها وتسويات أسعارها. الكميات بالوحدة الأساسية للصنف والأسعار لكل وحدة أساسية.
 */

import api from "../api/axios";

async function unwrap<T>(p: Promise<{ data: { data?: T } }>): Promise<T> {
  const { data } = await p;
  return data.data as T;
}

export interface StockLayerRow {
  id: number;
  warehouse: { id: number; name: string } | null;
  source_type: string;
  source_label: string;
  reference: string | null;
  purchase_bill: { id: number; number: string } | null;
  supplier: string | null;
  origin_layer_id: number | null;
  received_at: string | null;
  qty_in: string;
  qty_remaining: string;
  unit_cost: string | null;
  value: string | null;
  is_provisional: boolean;
}

/** توزيع سطر على الدفعات — بالوحدة الأساسية. */
export interface LayerAllocation {
  layer_id: number;
  quantity: number;
}

export interface LayerTrace {
  layer: StockLayerRow & { item: { id: number; code: string; name: string; base_unit: string | null } };
  origin: StockLayerRow | null;
  allocations: {
    id: number;
    kind: "consume" | "settle" | "restore" | "void" | "split";
    movement_id: number;
    movement_type: string;
    type_label: string;
    reference: string | null;
    at: string | null;
    quantity: string;
    unit_cost: string | null;
    total_cost: string | null;
  }[];
  revaluations: { reason: string; quantity: string; old_unit_cost: string | null; new_unit_cost: string | null; value: string | null; at: string | null }[];
  children: StockLayerRow[];
  costs_visible: boolean;
}

export interface IssueCostsResult {
  types: {
    type: string;
    label: string;
    cost: string | null;
    adjustments: string | null;
    items: { stock_item_id: number; code: string; name: string; base_unit: string; quantity: string; cost: string | null; unit_cost: string | null }[];
  }[];
  total: string | null;
  filters: { from: string; to: string };
  costs_visible: boolean;
}

export interface LayersCheckResult {
  checked: number;
  mismatches: {
    warehouse_id: number;
    warehouse: string;
    stock_item_id: number;
    code: string;
    name: string;
    balance_quantity: string;
    layer_quantity: string;
    ledger_value: string | null;
    layer_value: string | null;
  }[];
  costs_visible: boolean;
}

export interface PurchaseLayersResult {
  layers: {
    layer_id: number;
    purchase_bill_item_id: number;
    line_no: number | null;
    stock_item: { id: number; code: string; name: string };
    base_unit: string | null;
    line_unit_id: number | null;
    line_factor: string;
    warehouse: string | null;
    qty_in: string;
    consumed: string;
    returned: string;
    remaining: string;
    unit_cost: string | null;
    value: string | null;
    is_voided: boolean;
  }[];
  returns: {
    id: number;
    number: string;
    status: string;
    document_date: string | null;
    total_cost: string | null;
    notes: string | null;
    creator: string | null;
    lines: { stock_item: string; quantity: string; unit: string | null; posted_cost: string | null }[];
  }[];
  adjustments: {
    id: number;
    number: string;
    reason: string;
    total_value: string | null;
    posted_at: string | null;
    creator: string | null;
    lines: { stock_item: string; old_unit_cost: string | null; new_unit_cost: string | null; quantity: string; value: string | null }[];
  }[];
  costs_visible: boolean;
}

export const layersService = {
  /** الدفعات المتاحة لصنف في مخزن بالأقدم أولاً (+ تقدير تكلفة كمية بالأقدم أولاً). */
  available: (itemId: number, warehouseId: number, quantity?: number) =>
    unwrap<{ layers: StockLayerRow[]; estimated_cost: string | null; latest_cost: string | null; costs_visible: boolean }>(
      api.get(`/inventory/items/${itemId}/layers`, { params: { warehouse_id: warehouseId, quantity: quantity || undefined } }),
    ),
  trace: (layerId: number) => unwrap<LayerTrace>(api.get(`/inventory/layers/${layerId}`)),
  itemLayers: (stockItemId: number, warehouseIds?: number[], open = true) =>
    unwrap<{ layers: StockLayerRow[]; costs_visible: boolean }>(
      api.get("/inventory/reports/layers", { params: { stock_item_id: stockItemId, warehouse_ids: warehouseIds, open: open ? 1 : 0 } }),
    ),
  issueCosts: (params: { from?: string; to?: string; warehouse_ids?: number[] }) =>
    unwrap<IssueCostsResult>(api.get("/inventory/reports/issue-costs", { params })),
  check: () => unwrap<LayersCheckResult>(api.get("/inventory/reports/layers-check")),

  purchaseLayers: (billId: number) => unwrap<PurchaseLayersResult>(api.get(`/inventory/purchases/${billId}/layers`)),
  purchaseReturn: (billId: number, body: { reason?: string; lines: { purchase_bill_item_id: number; quantity: number; allocations?: LayerAllocation[] }[] }) =>
    unwrap<unknown>(api.post(`/inventory/purchases/${billId}/returns`, body)),
  reversePurchaseReturn: (documentId: number, reason: string) => unwrap<unknown>(api.post(`/inventory/purchases/returns/${documentId}/reverse`, { reason })),
  costAdjustment: (billId: number, body: { reason: string; lines: { purchase_bill_item_id: number; unit_cost: number }[] }) =>
    unwrap<unknown>(api.post(`/inventory/purchases/${billId}/cost-adjustments`, body)),
};

/** توزيع تلقائي بالأقدم أولاً (الدفعات مرتبة من الخادم بالأقدم). الكمية والنتيجة بالوحدة الأساسية. */
export function fifoAllocate(layers: Pick<StockLayerRow, "id" | "qty_remaining">[], quantity: number): LayerAllocation[] {
  const out: LayerAllocation[] = [];
  let left = quantity;
  for (const l of layers) {
    if (left <= 1e-9) break;
    const take = Math.min(left, Number(l.qty_remaining));
    if (take > 1e-9) {
      out.push({ layer_id: l.id, quantity: Math.round(take * 1e6) / 1e6 });
      left -= take;
    }
  }
  return out;
}

/** التحقق من التوزيع: المجموع = الكمية، ولا تجاوز للمتبقي في أي دفعة. يُرجع رسالة الخطأ أو null. */
export function validateAllocation(layers: Pick<StockLayerRow, "id" | "qty_remaining">[], allocations: LayerAllocation[], quantity: number): string | null {
  const byId = new Map(layers.map((l) => [l.id, Number(l.qty_remaining)]));
  let sum = 0;
  for (const a of allocations) {
    const remaining = byId.get(a.layer_id);
    if (remaining === undefined) return `الدفعة #${a.layer_id} غير متاحة`;
    if (a.quantity < 0) return "لا تكون الكمية سالبة";
    if (a.quantity > remaining + 1e-9) return `الكمية من الدفعة #${a.layer_id} أكبر من المتبقي فيها`;
    sum += a.quantity;
  }
  if (Math.abs(sum - quantity) > 1e-6) return `مجموع التوزيع (${round(sum)}) لا يساوي الكمية المطلوبة (${round(quantity)})`;
  return null;
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;
