// src/services/fiscalYearService.ts
// خدمة إدارة السنوات المالية - ربط الباك إند مع الفرونت

import api from "../api/axios";
import { shiftService } from "./shiftService";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FiscalYearFromApi {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "active" | "closed";
  created_by: number | null;
  shifts_count: number;
  shifts_total_sales_sum: number | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
  };
}

export interface MonthlySales {
  month: string;
  month_name: string;
  total: number;
  count: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  total: number;
  count: number;
  percentage: number;
}

export interface FiscalYearPerformance {
  total_sales: number;
  total_orders: number;
  average_order: number;
  total_shifts: number;
  monthly_sales: MonthlySales[];
  payment_methods: PaymentMethodBreakdown[];
}

export interface ShiftInYear {
  id: number;
  date: string;
  opened_at: string;
  closed_at: string | null;
  status: "open" | "closed";
  opening_balance: number;
  closing_balance: number | null;
  total_sales: number;
  orders_count: number;
  opener: { id: number; name: string };
  closer?: { id: number; name: string };
}

export interface OrderInYear {
  id: number;
  order_number: string;
  status: string;
  payment_method: string | null;
  total: number;
  created_at: string;
  paid_at: string | null;
  cashier?: { id: number; name: string };
  items_count: number;
  discount_amount: number;
  is_cancelled: boolean;
}

export interface EmployeePerformance {
  id: number;
  name: string;
  role: string;
  orders_opened: number;
  orders_printed: number;
  orders_closed: number;
  total_sales: number;
  total_orders: number;
  average_order: number;
}

export interface YearEndReport {
  total_sales: number;
  total_orders: number;
  total_shifts: number;
  total_discounts: number;
  total_cancellations: number;
  cancelled_orders_count: number;
  discounts_count: number;
  payment_method_summary: PaymentMethodBreakdown[];
}

// ── Service ────────────────────────────────────────────────────────────────────

export const fiscalYearService = {
  /**
   * جلب جميع السنوات المالية
   */
  async getAll(): Promise<FiscalYearFromApi[]> {
    const { data } = await api.get("/fiscal-years");
    return data.data;
  },

  /**
   * جلب السنة المالية النشطة
   */
  async getActive(): Promise<FiscalYearFromApi | null> {
    const { data } = await api.get("/fiscal-years/active");
    return data.data;
  },

  /**
   * جلب تفاصيل سنة مالية
   */
  async getById(id: number): Promise<FiscalYearFromApi> {
    try {
      const { data } = await api.get(`/fiscal-years/${id}`);
      return data.data;
    } catch {
      // fallback: جلب جميع السنوات وإرجاع المطلوبة
      const all = await fiscalYearService.getAll();
      const found = all.find((fy) => fy.id === id);
      if (!found) throw new Error("السنة المالية غير موجودة");
      return found;
    }
  },

  /**
   * إنشاء سنة مالية جديدة
   */
  async create(payload: {
    name: string;
    start_date: string;
    end_date: string;
  }): Promise<FiscalYearFromApi> {
    const { data } = await api.post("/fiscal-years", payload);
    return data.data;
  },

  /**
   * إغلاق سنة مالية
   */
  async close(id: number): Promise<FiscalYearFromApi> {
    const { data } = await api.post(`/fiscal-years/${id}/close`);
    return data.data;
  },

  /**
   * جلب ملخص أداء السنة المالية
   */
  async getPerformance(id: number): Promise<FiscalYearPerformance> {
    try {
      const { data } = await api.get(`/fiscal-years/${id}/performance`);
      return data.data;
    } catch {
      // fallback: بيانات تجريبية
      return {
        total_sales: 0,
        total_orders: 0,
        average_order: 0,
        total_shifts: 0,
        monthly_sales: [],
        payment_methods: [],
      };
    }
  },

  /**
   * جلب وديريات السنة المالية
   */
  async getShiftsByYear(
    id: number,
    filters?: { month?: number; cashier_id?: number }
  ): Promise<ShiftInYear[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.month) params.append("month", String(filters.month));
      if (filters?.cashier_id) params.append("cashier_id", String(filters.cashier_id));
      const { data } = await api.get(`/fiscal-years/${id}/shifts?${params.toString()}`);
      return data.data;
    } catch {
      // fallback: جلب كل الورديات وفلترتها حسب تاريخ السنة
      try {
        const fy = await fiscalYearService.getById(id);
        const startDate = new Date(fy.start_date);
        const endDate = new Date(fy.end_date);

        const result = await shiftService.getAll();
        const allShifts = result.data || [];

        return allShifts
          .filter((s) => {
            const shiftDate = new Date(s.date);
            return shiftDate >= startDate && shiftDate <= endDate;
          })
          .filter((s) => {
            if (filters?.month) {
              const shiftMonth = new Date(s.date).getMonth() + 1;
              if (shiftMonth !== filters.month) return false;
            }
            if (filters?.cashier_id) {
              if (s.opened_by !== filters.cashier_id) return false;
            }
            return true;
          })
          .map((s) => ({
            id: s.id,
            date: s.date,
            opened_at: s.opened_at,
            closed_at: s.closed_at,
            status: s.status,
            opening_balance: s.opening_balance,
            closing_balance: s.closing_balance,
            total_sales: s.total_sales,
            orders_count: 0,
            opener: s.opener || { id: s.opened_by, name: `موظف #${s.opened_by}` },
            closer: s.closer,
          }));
      } catch {
        return [];
      }
    }
  },

  /**
   * جلب طلبات/فواتير السنة المالية
   */
  async getOrdersByYear(
    id: number,
    filters?: { month?: number; status?: string }
  ): Promise<OrderInYear[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.month) params.append("month", String(filters.month));
      if (filters?.status) params.append("status", filters.status);
      const { data } = await api.get(`/fiscal-years/${id}/orders?${params.toString()}`);
      return data.data;
    } catch {
      return [];
    }
  },

  /**
   * جلب أداء الموظفين في السنة المالية
   */
  async getEmployeesPerformance(id: number): Promise<EmployeePerformance[]> {
    try {
      const { data } = await api.get(`/fiscal-years/${id}/employees`);
      return data.data;
    } catch {
      return [];
    }
  },

  /**
   * جلب التقارير الختامية
   */
  async getReports(id: number): Promise<YearEndReport> {
    try {
      const { data } = await api.get(`/fiscal-years/${id}/reports`);
      return data.data;
    } catch {
      return {
        total_sales: 0,
        total_orders: 0,
        total_shifts: 0,
        total_discounts: 0,
        total_cancellations: 0,
        cancelled_orders_count: 0,
        discounts_count: 0,
        payment_method_summary: [],
      };
    }
  },
};

export default fiscalYearService;
