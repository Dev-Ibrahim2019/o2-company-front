export type CustomerStatus = "active" | "inactive" | "blocked";
export type CustomerCategory =
  | "retail" | "wholesale" | "corporate" | "government" | "service"
  | "regular" | "important" | "vip" | "new" | "inactive"
  | "follow_up" | "complaints";

export interface CustomerPhone {
  id: number;
  customer_id: number;
  phone: string;
  normalized_phone: string;
  type: "mobile" | "home" | "work" | "other";
  is_primary: boolean;
  is_verified: boolean;
}

export interface CustomerIdentity {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  mobile: string | null;
  email?: string | null;
  city: string | null;
  address: string | null;
  category: CustomerCategory | null;
  status: CustomerStatus;
  branch_id: number | null;
  phones?: CustomerPhone[];
  primary_phone?: CustomerPhone | null;
  branch?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerCreatePayload {
  name: string;
  code?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  area?: string;
  category?: CustomerCategory;
  branch_id?: number | null;
}
