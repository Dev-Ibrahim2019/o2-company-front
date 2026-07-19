import api from "../api/axios";

export interface DeliveryZoneOption {
  id: number;
  name: string;
  code: string;
  city?: string | null;
  area?: string | null;
  base_fee: number | string;
  minimum_order_amount?: number | string | null;
  free_delivery_threshold?: number | string | null;
  estimated_minutes?: number | null;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

export const deliveryPricingService = {
  async activeZones(branchId: number): Promise<DeliveryZoneOption[]> {
    const response = await api.get("/delivery-management/zones", {
      params: { branch_id: branchId, active: 1, per_page: 100 },
    });
    const payload = unwrap(response);
    return Array.isArray(payload) ? payload : payload?.data ?? [];
  },

  async quote(branchId: number, zoneId: number, subtotal: number) {
    const response = await api.get("/delivery-management/zones/quote", {
      params: { branch_id: branchId, delivery_zone_id: zoneId, subtotal },
    });
    return unwrap(response) as {
      zone: DeliveryZoneOption;
      fee: number | string;
      eligible: boolean;
    };
  },
};
