export type CustomerResolutionStatus =
  | "idle"
  | "searching"
  | "found"
  | "multiple"
  | "not_found"
  | "error";

export const customerResolutionRequestKey = (callId: string, phone: string) =>
  `${callId}:${phone}`;

export const buildCheckoutBlockers = (input: {
  branchId: number;
  customerName?: string;
  isNewCaller: boolean;
  cartCount: number;
  isDelivery: boolean;
  addressReady: boolean;
  deliveryQuoteReady: boolean;
}) =>
  [
    !input.branchId && "يجب اختيار الفرع",
    input.isNewCaller && !input.customerName?.trim() && "اسم العميل مطلوب",
    input.cartCount === 0 && "السلة فارغة",
    input.isDelivery && !input.addressReady && "يجب إدخال عنوان التوصيل",
    input.isDelivery && !input.deliveryQuoteReady && "يجب اعتماد عرض توصيل صالح",
  ].filter(Boolean) as string[];
