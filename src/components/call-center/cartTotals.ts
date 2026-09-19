// حسابات إجمالي الفاتورة (سلة/كارت طلب الكول سنتر) — دالة صافية واحدة يستخدمها الكومبوننت
// (CallCenterPageWithAside) لعرض كل من صفوف الجدول والإجمالي الكلي، حتى لا يصير عندنا مصدرين
// منفصلين للبيانات (واحد للصفوف وواحد للمجموع) ممكن يطلعوا out of sync مع بعض.

export interface CartLine {
  price: number;
  quantity: number;
}

export interface CartTotalsInput {
  items: CartLine[];
  discountValue: number;
  discountType: "AMOUNT" | "PERCENT";
  taxEnabled: boolean;
  taxRate: number;
  deliveryFee: number;
  isDelivery: boolean;
}

export interface CartTotals {
  /** إجمالي كل سطر (price * quantity)، بنفس ترتيب items — هذا يلي لازم يطابق مجموعه subtotal */
  lineTotals: number[];
  subtotal: number;
  discountAmount: number;
  taxableBase: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
}

export function calculateCartTotals(input: CartTotalsInput): CartTotals {
  const lineTotals = input.items.map(item => item.price * item.quantity);
  const subtotal = lineTotals.reduce((sum, lineTotal) => sum + lineTotal, 0);

  const discountAmount = input.discountType === "PERCENT"
    ? (subtotal * input.discountValue) / 100
    : input.discountValue;

  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = input.taxEnabled ? (taxableBase * input.taxRate) / 100 : 0;
  const deliveryFee = input.isDelivery ? input.deliveryFee : 0;
  const total = taxableBase + taxAmount + deliveryFee;

  return { lineTotals, subtotal, discountAmount, taxableBase, taxAmount, deliveryFee, total };
}
