// src/components/POS/pos.tsx
//
// التغييرات الجوهرية:
// 1. المنيو يجي من API عبر useMenu(branchId) بدل MENU_ITEMS الثابتة
// 2. السلة تدار عبر useCart — addToCart يزيد الكمية بدل صف جديد
// 3. submitOrder يرسل للـ API فعلياً
// 4. getItemCurrentPrice تقرأ item.price مباشرة (جاي من pivot الفرع)

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../../../store";
import {
  OrderType,
  OrderStatus,
  PaymentMethod,
  CustomerType,
  TableStatus,
} from "../../../types";
import { AlertCircle, ShoppingCart, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../shared/Toast";
import { useDiscountCart } from "../../hooks/useDiscountCart";

import { POSHeader } from "./POSHeader";
import { HospitalityPOSHeader } from "../Hospitality/HospitalityPOSHeader";
import { MenuGrid } from "./MenuGrid";
import { InvoiceInfoTab } from "./InvoiceInfoTab";
import { CustomerTab, type PaymentEntry } from "./CustomerTab";
import { CartPanel } from "./CartPanel";
import {
  CustomerSearchModal,
  QuickAddCustomerModal,
  CloseInvoiceModal,
} from "./POSModals";

import { useMenu } from "../../hooks/useMenu";
import { useCart, type CartItem } from "../../hooks/useCart";
import type { MenuItem } from "../../hooks/useMenu";
import {
  orderService,
  normalizePaymentMethod as normalizeApiPaymentMethod,
  type OrderFromApi,
  type PaymentMethod as ApiPaymentMethod,
} from "../../services/orderService";
import { TablesView } from "./Tables";
import type { Order, Table } from "../../../types";
import { getDeviceUUIDSecurely } from "../../utils/posSecurity";
import POSActivationPage from "./POSActivationPage";
import { PERMISSIONS, ROLES } from "../../auth/permissions";


const MONEY_EPSILON = 0.01;

const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;

const requiresPaymentReference = (method: PaymentMethod) =>
  method === PaymentMethod.WALLET ||
  method === PaymentMethod.QR ||
  method === PaymentMethod.ONLINE;

const toPosOrderType = (type: OrderFromApi["order_type"]) =>
  type === "dine_in" ? OrderType.DINE_IN : OrderType.TAKEAWAY;

const toPosPaymentMethod = (
  method?: ApiPaymentMethod | string | null,
): PaymentMethod => {
  const normalized = normalizeApiPaymentMethod(method);
  if (normalized === "card") return PaymentMethod.CREDIT_CARD;
  if (normalized === "wallet") return PaymentMethod.WALLET;
  if (normalized === "bank") return PaymentMethod.QR;
  return PaymentMethod.CASH;
};

const apiOrderToCartItems = (order: OrderFromApi): CartItem[] =>
  order.items.map((item) => ({
    uniqueId: `api-${item.id}`,
    itemId: String(item.item_id),
    id: item.item_id,
    name: item.item_name_ar || item.item_name,
    name_ar: item.item_name_ar || item.item_name,
    price: Number(item.unit_price || 0),
    quantity: Number(item.quantity || 0),
    notes: item.notes ?? undefined,
    department_id: item.department_id,
  }));

const localOrderToCartItems = (order: Order): CartItem[] =>
  order.items.map((item) => ({
    uniqueId: item.uniqueId,
    itemId: item.itemId,
    id: Number(item.itemId) || 0,
    name: item.name,
    name_ar: item.name,
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 0),
    notes: item.note,
    department_id: Number(item.departmentId) || 0,
  }));

type TableCartDraft = {
  items: CartItem[];
  orderType: OrderType;
  invoiceNote: string;
  discountValue: number;
  discountType: "AMOUNT" | "PERCENT";
  payments: PaymentEntry[];
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  editingApiOrderId: number | null;
};

const cloneCartItems = (items: CartItem[]) =>
  items.map((item) => ({ ...item }));

const clonePayments = (items: PaymentEntry[]) =>
  items.map((payment) => ({ ...payment }));

const normalizeTableNumber = (value: string | number | null | undefined) =>
  String(value ?? "").trim();

export const POS: React.FC<{
  onViewTables: () => void;
  initialMode?: "tables" | "menu" | "info" | "customer";
}> = ({ onViewTables, initialMode = "tables" }) => {

  const [searchParams] = useSearchParams();
  const [deviceUuid, setDeviceUuid] = useState<string | null>(null);
  const [posInfo, setPosInfo] = useState<any>(null);
  const [checkingSecurity, setCheckingSecurity] = useState(true);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  useEffect(() => {
    const checkDeviceSecurity = async () => {
      try {
        const uuid = await getDeviceUUIDSecurely();
        const storedInfo = localStorage.getItem("pos_register_info");

        if (uuid && storedInfo) {
          setDeviceUuid(uuid);
          setPosInfo(JSON.parse(storedInfo));
        }
      } catch (error) {
        console.error("خطأ في فحص أمان نقطة البيع:", error);
      } finally {
        setCheckingSecurity(false);
      }
    };
    checkDeviceSecurity();
  }, []);

// دالة يتم استدعاؤها لتحديث الحالة فور إدخال كود التفعيل بنجاح
const handleActivationSuccess = (activatedInfo: any) => {
  getDeviceUUIDSecurely().then((uuid) => {
    setDeviceUuid(uuid);
    setPosInfo(activatedInfo);
  });
};

  // ── Store (للحالات القديمة غير المنقولة بعد) ──────────────────────────────
  const {
    selectedTable,
    setSelectedTable,
    tables,
    currentUser,
    userRole,
    customers,
    addCustomer,
    employees,
    suppliers,
    activeOrders,
    updateTableStatus,
  } = useApp();

  const isHospitality = userRole === "HOSPITALITY";

  // ── Branch ID ─────────────────────────────────────────────────────────────
  // نأخذه من currentUser — إذا ما في فرع، يستخدم null
  // (MenuController سيرفض الطلب لغير super-admin بدون فرع)

  const branchId: number | undefined =
  posInfo?.branch_id ?? (currentUser as any)?.branch_id ?? undefined;

  // ── Menu from API ─────────────────────────────────────────────────────────
  const {
    categories,
    allItems,
    loading: menuLoading,
    findByCode,
  } = useMenu(branchId);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const {
    cart: currentCart,
    subtotal,
    addToCart: addToCartRaw,
    updateCartItem,
    removeFromCart,
    loadCart,
    clearCart,
    submitOrder: submitOrderApi,
    submitting,
    submitError,
  } = useCart();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [activePOSMode, setActivePOSMode] = useState<
    "tables" | "menu" | "info" | "customer"
  >(initialMode);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualTable, setManualTable] = useState("");

  // Auto-dismiss error toast
  useEffect(() => {
    if (posError) {
      toast.error(posError);
      setPosError(null);
    }
  }, [posError]);

  // Show submit errors from useCart as toast
  useEffect(() => {
    if (submitError) {
      toast.error("فشل إرسال الطلب", submitError);
    }
  }, [submitError]);

  // ── Customer State ────────────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // ── Invoice State ─────────────────────────────────────────────────────────
  const [invoiceNote, setInvoiceNote] = useState("");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">(
    "AMOUNT",
  );
  const [editingDiscount, setEditingDiscount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.CASH,
  );
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [cartOrderType, setCartOrderType] = useState<OrderType>(
    OrderType.DINE_IN,
  );
  const [accountType, setAccountType] = useState<
    "ACCOUNT" | "SUPPLIER" | "EMPLOYEE"
  >("ACCOUNT");
  const [accountNumber, setAccountNumber] = useState("");

  // ── Quick Add State ───────────────────────────────────────────────────────
  const [quickId, setQuickId] = useState("");
  const [quickQty, setQuickQty] = useState("");
  const [quickTotal, setQuickTotal] = useState("");

  // ── Cart Editing State ────────────────────────────────────────────────────
  const [editingQty, setEditingQty] = useState<{ [id: string]: string }>({});
  const [editingNames, setEditingNames] = useState<{ [id: string]: string }>(
    {},
  );
  const [editingApiOrderId, setEditingApiOrderId] = useState<number | null>(
    null,
  );
  const [tableCartDrafts, setTableCartDrafts] = useState<
    Record<string, TableCartDraft>
  >({});
  const currentEditingOrderId = editingApiOrderId
    ? String(editingApiOrderId)
    : null;

  // ── قراءة editOrderId من الرابط وتحميل الطلب تلقائياً ──
  useEffect(() => {
    const editOrderIdParam = searchParams.get("editOrderId");
    if (!editOrderIdParam) return;

    const orderId = Number(editOrderIdParam);
    if (!Number.isFinite(orderId)) return;

    // تنظيف الرابط بعد القراءة
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("editOrderId");
    const newUrl = `${window.location.pathname}${newSearchParams.toString() ? "?" + newSearchParams.toString() : ""}`;
    window.history.replaceState({}, "", newUrl);

    let cancelled = false;

    const loadOrderForEdit = async () => {
      try {
        const order = await orderService.getOne(orderId);
        if (!cancelled) {
          applyApiOrderToCart(order);
          setIsCartOpen(true);
          setActivePOSMode("menu");
        }
      } catch (err) {
        console.error("فشل تحميل الطلب للتعديل:", err);
        if (!cancelled) setPosError("فشل تحميل الطلب للتعديل");
      }
    };

    loadOrderForEdit();

    return () => { cancelled = true; };
  }, [searchParams]);

  // ── جلب بيانات الفاتورة عند تعديل طلب موجود ──
  useEffect(() => {
    if (!editingApiOrderId) {
      setInvoiceData(null);
      return;
    }

    let cancelled = false;

    const fetchInvoiceForOrder = async () => {
      try {
        const invoice = await orderService.getInvoiceForOrder(editingApiOrderId);
        if (!cancelled && invoice) {
          // تحويل هيكل الفاتورة من API إلى الشكل المطلوب في InvoiceInfoTab
          setInvoiceData({
            pos: {
              register_id: (invoice as any).pos_register_id,
              code: (invoice as any).pos_code,
              name: (invoice as any).pos_name,
              branch: (invoice as any).branch ? { id: (invoice as any).branch.id, name: (invoice as any).branch.name } : null,
            },
            details: {
              number: invoice.number,
              date: invoice.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              time: invoice.created_at ? new Date(invoice.created_at).toLocaleTimeString('ar-PS', { hour: '2-digit', minute: '2-digit' }) : '',
              currency: (invoice as any).currency || 'ILS',
              account_number: (invoice as any).account_number || null,
            },
            opening: {
              user: (invoice as any).opened_by_user ? { id: (invoice as any).opened_by_user.id, name: (invoice as any).opened_by_user.name } : null,
              pos_name: (invoice as any).pos_name,
              date: (invoice as any).opened_at?.split('T')[0] || null,
              time: (invoice as any).opened_at ? new Date((invoice as any).opened_at).toLocaleTimeString('ar-PS', { hour: '2-digit', minute: '2-digit' }) : null,
            },
            closing: (invoice as any).closed_at ? {
              user: (invoice as any).closed_by_user ? { id: (invoice as any).closed_by_user.id, name: (invoice as any).closed_by_user.name } : null,
              pos_name: (invoice as any).pos_name,
              date: (invoice as any).closed_at?.split('T')[0] || null,
              time: (invoice as any).closed_at ? new Date((invoice as any).closed_at).toLocaleTimeString('ar-PS', { hour: '2-digit', minute: '2-digit' }) : null,
            } : null,
          });
        }
      } catch (err) {
        console.warn('لم يتم العثور على فاتورة لهذا الطلب:', err);
        if (!cancelled) setInvoiceData(null);
      }
    };

    fetchInvoiceForOrder();

    return () => { cancelled = true; };
  }, [editingApiOrderId]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setEditingDiscount(discountValue.toString());
  }, [discountValue]);

  useEffect(() => {
    if (selectedTable) {
      setManualTable((selectedTable as any).number?.toString() ?? "");
    } else {
      setManualTable("");
    }
  }, [selectedTable]);

  useEffect(() => {
    if (isHospitality) {
      setCartOrderType(OrderType.DINE_IN);
      setActivePOSMode("menu");
    }
  }, [isHospitality]);

  // ── Account data comes from real API via CustomerTab/SettlementPanel ──
  // No hardcoded mock account numbers.
  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return [];
    return (customers ?? []).filter(
      (c: any) =>
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery),
    );
  }, [customers, customerSearchQuery]);

  const getEntityDepartmentId = (): number | undefined => {
    if (accountType === "EMPLOYEE" && accountNumber) {
      const empId = parseInt(accountNumber, 10);
      if (empId) {
        // نحاول إيجاد القسم من الموظف — سيحله محرك الخصم من الـ mock entities
        return undefined; // المحرك سيستنتج department_id من employee_id
      }
    }
    // إذا كان العميل مختار من القائمة، نحاول إيجاد department_id من أول صنف في السلة
    if (currentCart.length > 0 && currentCart[0].department_id) {
      return currentCart[0].department_id;
    }
    return undefined;
  };

  const getPricingContext = () => ({
    customer_id:
      accountType === "ACCOUNT"
        ? (selectedCustomer?.id ??
          (accountNumber ? parseInt(accountNumber, 10) || undefined : undefined))
        : undefined,
    employee_id:
      accountType === "EMPLOYEE" && accountNumber
        ? parseInt(accountNumber, 10) || undefined
        : undefined,
    supplier_id:
      accountType === "SUPPLIER" && accountNumber
        ? parseInt(accountNumber, 10) || undefined
        : undefined,
    department_id: getEntityDepartmentId(),
    branch_id: branchId ?? undefined,
  });

  const discountContext = useMemo(() => getPricingContext(), [
    accountType,
    selectedCustomer,
    accountNumber,
    branchId,
    currentCart,
  ]);

  const {
    engineDiscountTotal,
    originalSubtotal: engineOriginalSubtotal,
    appliedDiscounts,
    items: engineDiscountItems,
    loading: discountLoading,
  } = useDiscountCart(currentCart, discountContext);

  const enrichedCart = useMemo(
    () =>
      currentCart.map((item) => {
        const line = engineDiscountItems.find((l) => l.item_id === item.id);
        if (!line || line.discount_amount <= 0) return item;
        return {
          ...item,
          original_price: line.original_price,
          final_price: line.final_unit_price,
          discount_amount: line.discount_amount,
          discount_percent: line.discount_percent,
          discount_id: line.discount?.id,
        };
      }),
    [currentCart, engineDiscountItems],
  );

  const displaySubtotal =
    engineOriginalSubtotal > 0 ? engineOriginalSubtotal : subtotal;
  const afterEngineSubtotal = Math.max(
    0,
    displaySubtotal - engineDiscountTotal,
  );
  const manualDiscount =
    discountType === "PERCENT"
      ? (afterEngineSubtotal * discountValue) / 100
      : discountValue;
  const calculatedDiscount = roundMoney(engineDiscountTotal + manualDiscount);
  const total = roundMoney(Math.max(0, displaySubtotal - calculatedDiscount));
  const totalPaid = roundMoney(
    payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
  const remainingAmount = Math.max(0, roundMoney(total - totalPaid));

  // ── Helpers ───────────────────────────────────────────────────────────────

  // ✅ getItemCurrentPrice: السعر يجي من pivot مباشرة
  const getItemCurrentPrice = (item: any): number => item.price ?? 0;

  const setOrderType = (type: OrderType) => setCartOrderType(type);

  const addToCart = (
    item: MenuItem | any,
    opts?: { quantity?: number; price?: number },
  ) => {
    addToCartRaw(item, opts);
  };

  // معرفة entityType من accountType الحالي
  const getEntityType = (): string | undefined => {
    if (accountType === 'EMPLOYEE') return 'employee';
    if (accountType === 'SUPPLIER') return 'supplier';
    if (accountType === 'ACCOUNT') return 'customer';
    return undefined;
  };

  const addPayment = (method: PaymentMethod) => {
    if (remainingAmount <= MONEY_EPSILON) return;
    setPaymentMethod(method);
    // إذا كان هناك كيان محدد (موظف/عميل/مورد)، نرسل بياناته مع الدفعة
    const entityMethod = getEntityType();
    const entityId = accountNumber ? parseInt(accountNumber, 10) : undefined;
    // سجل الـ payload للتأكد
    const paymentPayload = {
      method,
      amount: roundMoney(remainingAmount),
      entity_type: entityMethod,
      entity_id: entityId,
      subledger_type: entityMethod,
      subledger_id: entityId,
    };
    console.log('[POS] addPayment payload:', paymentPayload);
    setPayments((prev) => [
      ...prev,
      paymentPayload,
    ]);
  };

  const removePayment = (index: number) => {
    setPayments((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setPaymentMethod(next[0]?.method ?? PaymentMethod.CASH);
      return next;
    });
  };

  const updatePaymentAmount = (index: number, val: string) => {
    const amount = parseFloat(val) || 0;
    setPayments((prev) =>
      prev.map((payment, i) =>
        i === index ? { ...payment, amount } : payment,
      ),
    );
  };

  const updatePaymentReference = (index: number, val: string) => {
    setPayments((prev) =>
      prev.map((payment, i) =>
        i === index ? { ...payment, reference: val } : payment,
      ),
    );
  };

  const buildCurrentTableDraft = (): TableCartDraft => ({
    items: cloneCartItems(currentCart),
    orderType: cartOrderType,
    invoiceNote,
    discountValue,
    discountType,
    payments: clonePayments(payments),
    paymentMethod,
    customerName,
    customerPhone,
    editingApiOrderId,
  });

  const forgetTableDraft = (tableId: string) => {
    setTableCartDrafts((prev) => {
      if (!prev[tableId]) return prev;
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
  };

  const cacheCurrentTableDraft = () => {
    if (!selectedTable) return;

    setTableCartDrafts((prev) => {
      if (currentCart.length === 0) {
        if (!prev[selectedTable.id]) return prev;
        const next = { ...prev };
        delete next[selectedTable.id];
        return next;
      }

      return {
        ...prev,
        [selectedTable.id]: buildCurrentTableDraft(),
      };
    });
  };

  const applyTableDraft = (table: Table, draft: TableCartDraft) => {
    loadCart(cloneCartItems(draft.items));
    setEditingApiOrderId(draft.editingApiOrderId);
    setCartOrderType(draft.orderType);
    setManualTable(table.number.toString());
    setInvoiceNote(draft.invoiceNote);
    setDiscountValue(draft.discountValue);
    setDiscountType(draft.discountType);
    setPayments(clonePayments(draft.payments));
    setPaymentMethod(draft.paymentMethod);
    setCustomerName(draft.customerName);
    setCustomerPhone(draft.customerPhone);
    setIsCartOpen(draft.items.length > 0);
  };

  const applyApiOrderToCart = (order: OrderFromApi, table?: Table) => {
    loadCart(apiOrderToCartItems(order));
    setEditingApiOrderId(order.id);
    setCartOrderType(toPosOrderType(order.order_type));
    setManualTable(order.table_number || table?.number.toString() || "");
    setInvoiceNote(order.note ?? "");
    setDiscountValue(Number(order.discount_value || 0));
    setDiscountType(order.discount_type === "percent" ? "PERCENT" : "AMOUNT");
    setCustomerName(order.customer_name ?? "");
    setCustomerPhone(order.customer_phone ?? "");

    const apiPayments = order.payments ?? [];
    setPayments(
      apiPayments.map((payment) => ({
        method: toPosPaymentMethod(payment.payment_method as ApiPaymentMethod),
        amount: Number(payment.amount || 0),
        reference: payment.reference_number,
      })),
    );

    const primaryMethod = apiPayments[0]?.payment_method ?? order.payment_method;
    if (primaryMethod) {
      setPaymentMethod(toPosPaymentMethod(primaryMethod as ApiPaymentMethod));
    }
  };

  const clearLoadedApiOrder = () => {
    setEditingApiOrderId(null);
    clearCart();
    setInvoiceNote("");
    setDiscountValue(0);
    setDiscountType("AMOUNT");
    setPayments([]);
    setPaymentMethod(PaymentMethod.CASH);
    setCustomerName("");
    setCustomerPhone("");
  };

  const clearActiveCart = () => {
    if (selectedTable) {
      forgetTableDraft(selectedTable.id);
    }
    clearLoadedApiOrder();
  };

  const resolveActiveDineInTable = () => {
    if (cartOrderType !== OrderType.DINE_IN) return null;

    const tableNumber = normalizeTableNumber(manualTable);
    if (!tableNumber) {
      setPosError("يرجى اختيار الطاولة قبل حفظ الطلب");
      return null;
    }

    const table = tables.find((t) => t.number.toString() === tableNumber);
    if (!table) {
      setPosError("الطاولة المحددة غير موجودة");
      return null;
    }

    if (selectedTable && selectedTable.id !== table.id) {
      setPosError("السلة الحالية لا تتبع الطاولة النشطة");
      return null;
    }

    return table;
  };

  const loadApiOrderForTable = async (table: Table, clearWhenMissing = true) => {
    const order = await orderService.getActiveByTableNumber(table.number, {
      branch_id: branchId || 0,
    });

    if (order) {
      applyApiOrderToCart(order, table);
      updateTableStatus(table.id, TableStatus.OCCUPIED, {
        currentOrderId: String(order.id),
      });
      return order;
    }

    if (clearWhenMissing) {
      clearLoadedApiOrder();
    }

    return null;
  };

  useEffect(() => {
    if (!selectedTable) return;

    const isActiveTable =
      selectedTable.status === TableStatus.OCCUPIED ||
      selectedTable.status === TableStatus.PAYMENT_PENDING;

    if (!isActiveTable || editingApiOrderId || currentCart.length > 0) return;

    void loadApiOrderForTable(selectedTable, false)
      .then((order) => {
        if (!order) return;
        setIsCartOpen(true);
      })
      .catch((err) => {
        console.error("Failed to load selected table order:", err);
        setPosError("فشل تحميل طلب الطاولة");
      });
  }, [
    selectedTable?.id,
    selectedTable?.number,
    selectedTable?.status,
    editingApiOrderId,
    currentCart.length,
  ]);

  const handleTableInput = (val: string) => {
    setManualTable(val);

    const table = tables?.find(
      (t: any) => t.number?.toString() === normalizeTableNumber(val),
    );

    if (!table) {
      if (selectedTable) {
        cacheCurrentTableDraft();
        clearLoadedApiOrder();
      }
      setSelectedTable(null);
      return;
    }

    if (selectedTable?.id === table.id) return;

    cacheCurrentTableDraft();
    clearLoadedApiOrder();
    setSelectedTable(table);

    const draft = tableCartDrafts[table.id];
    if (draft) {
      applyTableDraft(table, draft);
    }
  };

  const handleTableClick = async (table: Table) => {
    const isSwitchingTables = selectedTable && selectedTable.id !== table.id;

    if (isSwitchingTables) {
      cacheCurrentTableDraft();
      clearLoadedApiOrder();
      setIsCartOpen(false);
    }

    setSelectedTable(table);
    setManualTable(table.number.toString());

    setCartOrderType(OrderType.DINE_IN);

    if (!isSwitchingTables && selectedTable?.id === table.id) {
      setIsCartOpen(currentCart.length > 0);
      return;
    }

    const draft = tableCartDrafts[table.id];
    if (draft) {
      applyTableDraft(table, draft);
      return;
    }

    const isActiveTable =
      table.status === TableStatus.OCCUPIED ||
      table.status === TableStatus.PAYMENT_PENDING;

    if (isActiveTable) {
      try {
        const apiOrder = await loadApiOrderForTable(table, false);
        if (apiOrder) {
          setIsCartOpen(true);
          return;
        }
      } catch (err) {
        console.error("Failed to load table order:", err);
        setPosError("فشل تحميل طلب الطاولة");
      }
    }

    const order = activeOrders.find(
      (o) => o.tableId === table.id || o.id === table.currentOrderId,
    );
    if (order) {
      loadCart(localOrderToCartItems(order));
      setEditingApiOrderId(null);
      setCartOrderType(order.type);
      setIsCartOpen(true);
      return;
    }

    if (isActiveTable || editingApiOrderId) {
      clearLoadedApiOrder();
    }
  };

  const handlePrintInvoice = async () => {
    if (currentCart.length === 0) {
      setPosError("السلة فارغة");
      return;
    }
    if (cartOrderType === OrderType.DINE_IN && !manualTable) {
      setPosError("يرجى إدخال رقم الطاولة أولاً");
      return;
    }

    const activeTable =
      cartOrderType === OrderType.DINE_IN ? resolveActiveDineInTable() : null;
    if (cartOrderType === OrderType.DINE_IN && !activeTable) return;

    // Submit the order as PENDING so it is saved to the backend
    const orderType =
      cartOrderType === OrderType.DINE_IN ? "dine_in" : "takeaway";
    const result = await submitOrderApi(
      {
        branch_id: branchId || 0,
        cashier_id: currentUser?.id ? Number(currentUser.id) : undefined,
        order_type: orderType,
        table_number: activeTable?.number.toString(),
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        note: invoiceNote || undefined,
        discount_value: discountValue || undefined,
        discount_type: discountType === "PERCENT" ? "percent" : "amount",
        ...getPricingContext(),
      },
      true, // confirm order
      [],
      false, // do not close/create invoice yet
      editingApiOrderId,
    );

    if (result) {
      if (activeTable) {
        updateTableStatus(activeTable.id, TableStatus.OCCUPIED, {
          currentOrderId: String(result.id),
        });
        setSelectedTable(activeTable);
        forgetTableDraft(activeTable.id);
      }
      setEditingApiOrderId(null);
      toast.success("تم إرسال الفاتورة للطباعة", `الطاولة #${manualTable}`);
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowSearchModal(false);
    setCustomerSearchQuery("");
  };

  const handleQuickAddCustomer = () => {
    if (!quickCustomerName || !quickCustomerPhone) return;
    addCustomer?.({
      name: quickCustomerName,
      phone: quickCustomerPhone,
      type: CustomerType.REGULAR,
      allowCredit: false,
      notes: "",
    });
    setShowQuickAddCustomer(false);
    setQuickCustomerName("");
    setQuickCustomerPhone("");
  };

  // ── Quick Add ─────────────────────────────────────────────────────────────
  const handleQuickIdChange = (id: string) => {
    setQuickId(id);
    const item = findByCode(id);
    if (item) {
      setQuickQty("1");
      setQuickTotal(item.price.toFixed(2));
    } else {
      setQuickQty("");
      setQuickTotal("");
    }
  };

  const handleQuickQtyChange = (qtyStr: string) => {
    setQuickQty(qtyStr);
    const item = findByCode(quickId);
    if (item && qtyStr)
      setQuickTotal(((parseFloat(qtyStr) || 0) * item.price).toFixed(2));
  };

  const handleQuickTotalChange = (totalStr: string) => {
    setQuickTotal(totalStr);
    const item = findByCode(quickId);
    if (item && totalStr)
      setQuickQty(((parseFloat(totalStr) || 0) / item.price).toFixed(2));
  };

  const handleQuickAdd = () => {
    const item = findByCode(quickId);
    if (!item) {
      setPosError("الصنف غير موجود في منيو هذا الفرع");
      return;
    }
    addToCart(item, { quantity: parseFloat(quickQty) || 1, price: item.price });
    setQuickId("");
    setQuickQty("");
    setQuickTotal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleQuickAdd();
  };

  // ── Cart Handlers ─────────────────────────────────────────────────────────
  const handleNameChange = (uniqueId: string, newName: string) => {
    setEditingNames((prev) => ({ ...prev, [uniqueId]: newName }));
    updateCartItem(uniqueId, { name: newName } as any);
  };

  const handleQuantityChange = (uniqueId: string, val: string) => {
    setEditingQty((prev) => ({ ...prev, [uniqueId]: val }));
    if (val === "" || val === "." || val.endsWith(".")) return;
    const qty = parseFloat(val);
    if (!isNaN(qty)) updateCartItem(uniqueId, { quantity: qty } as any);
  };

  const handleQuantityBlur = (uniqueId: string, val: string) => {
    updateCartItem(uniqueId, { quantity: parseFloat(val) || 0 } as any);
    setEditingQty((prev) => {
      const n = { ...prev };
      delete n[uniqueId];
      return n;
    });
  };

  const handleTotalChange = (uniqueId: string, val: string, price: number) => {
    if (val === "") {
      updateCartItem(uniqueId, { quantity: 0 } as any);
      return;
    }
    const newTotal = parseFloat(val);
    if (!isNaN(newTotal))
      updateCartItem(uniqueId, {
        quantity: price > 0 ? newTotal / price : 0,
      } as any);
  };

  // ── submitOrder ───────────────────────────────────────────────────────────
  // يرسل الطلب للـ API الحقيقي — محسّن لإرسال entity data للمدفوعات على حساب الكيانات
  const submitOrder = async (
    status: OrderStatus,
    method: PaymentMethod,
    _discount: number,
    meta: { name: string; phone: string; note: string },
    paymentsArg?: any[],
  ) => {
    if (currentCart.length === 0) {
      setPosError("السلة فارغة");
      return;
    }

    const orderType =
      cartOrderType === OrderType.DINE_IN ? "dine_in" : "takeaway";

    const shouldConfirm = status === OrderStatus.CONFIRMED || isHospitality; // الضيافة تأكد مباشرة
    const isClosingOrder = status === OrderStatus.DELIVERED;
    const selectedPayments = (paymentsArg ?? payments)
      .map((payment) => ({
        ...payment,
        amount: roundMoney(payment.amount),
        reference: payment.reference?.trim() || undefined,
      }))
      .filter((payment) => payment.amount > 0);
    const closingPayments: PaymentEntry[] =
      isClosingOrder && selectedPayments.length === 0 && total > MONEY_EPSILON
        ? [{ method, amount: roundMoney(total) }]
        : selectedPayments;

    if (isClosingOrder) {
      const paidTotal = roundMoney(
        closingPayments.reduce((sum, payment) => sum + payment.amount, 0),
      );
      const paymentDiff = roundMoney(total - paidTotal);

      if (total > MONEY_EPSILON && closingPayments.length === 0) {
        setPosError("يرجى تحديد طريقة الدفع قبل الإغلاق");
        return;
      }

      if (total > MONEY_EPSILON && Math.abs(paymentDiff) > MONEY_EPSILON) {
        setPosError(
          paymentDiff > 0
            ? `المبلغ المدفوع ناقص ${paymentDiff.toFixed(2)} ₪`
            : `المبلغ المدفوع زائد ${Math.abs(paymentDiff).toFixed(2)} ₪`,
        );
        return;
      }

      if (
        closingPayments.some(
          (payment) =>
            requiresPaymentReference(payment.method) && !payment.reference,
        )
      ) {
        setPosError("يرجى إدخال الرقم المرجعي للمحفظة أو التحويل");
        return;
      }
    }

    const selectedPaymentMethod = closingPayments[0]?.method ?? method;
    // Normalize all payment methods — مع المحافظة على entity data
    const apiClosingPayments = closingPayments
      .map((payment) => {
        const method = normalizeApiPaymentMethod(payment.method);
        if (!method) return null;
        const isEntityMethod = (method as string) === 'account' || (method as string) === 'customer' || (method as string) === 'employee' || (method as string) === 'supplier';
        const result: any = {
          method,
          amount: payment.amount,
          reference: payment.reference,
        };
        // FIXED: نرسل entity_type فقط إذا method = account/customer/employee/supplier
        // لا نرسل entity_type مع cash/bank/card/wallet أبداً
        if (isEntityMethod && (payment as any).entity_type) {
          result.entity_type = (payment as any).entity_type;
          result.entity_id = (payment as any).entity_id;
          result.subledger_type = (payment as any).subledger_type;
          result.subledger_id = (payment as any).subledger_id;
        }
        return result;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null) as any[];
    console.log('[POS] apiClosingPayments:', JSON.stringify(apiClosingPayments));

    const activeTable =
      cartOrderType === OrderType.DINE_IN ? resolveActiveDineInTable() : null;
    if (cartOrderType === OrderType.DINE_IN && !activeTable) return;

    const result = await submitOrderApi(
      {
        branch_id: branchId,
        cashier_id: currentUser?.id ? Number(currentUser.id) : undefined,
        order_type: orderType,
        table_number: activeTable?.number.toString(),
        customer_name: meta.name || undefined,
        customer_phone: meta.phone || undefined,
        note: meta.note || undefined,
        discount_value: discountValue || undefined,
        discount_type: discountType === "PERCENT" ? "percent" : "amount",
        ...getPricingContext(),
        payment_method: isClosingOrder
          ? normalizeApiPaymentMethod(selectedPaymentMethod)
          : undefined,
      },
      shouldConfirm,
      isClosingOrder ? (apiClosingPayments as any[]) : [],
      isClosingOrder,
      editingApiOrderId,
    );

    if (result) {
      if (isClosingOrder) {
        toast.success("تم إغلاق الفاتورة بنجاح", `رقم الطلب: ${result.order_number || result.id}`);
      } else {
        toast.success("تم حفظ الطلب بنجاح", `رقم الطلب: ${result.order_number || result.id}`);
      }
      if (activeTable) {
        if (isClosingOrder) {
          updateTableStatus(activeTable.id, TableStatus.AVAILABLE, {
            currentOrderId: undefined,
            seatedAt: undefined,
            guestCount: undefined,
          });
          forgetTableDraft(activeTable.id);
          setSelectedTable(null);
        } else {
          updateTableStatus(activeTable.id, TableStatus.OCCUPIED, {
            currentOrderId: String(result.id),
          });
          forgetTableDraft(activeTable.id);
          setSelectedTable(activeTable);
        }
      }
      // تنظيف بعد النجاح
      setInvoiceNote("");
      setDiscountValue(0);
      setManualTable("");
      setCustomerName("");
      setCustomerPhone("");
      setPayments([]);
      setPaymentMethod(PaymentMethod.CASH);
      setEditingApiOrderId(null);
      setShowCustomerModal(false);
    }
  };

  // ── commonCartProps ───────────────────────────────────────────────────────
  const commonCartProps = {
    isCartOpen,
    setIsCartOpen,
    isHospitality,
    cartOrderType,
    setOrderType,
    currentCart: enrichedCart,
    manualTable,
    handleTableInput,
    onViewTables,
    subtotal: displaySubtotal,
    calculatedDiscount,
    engineDiscountTotal,
    manualDiscount,
    appliedDiscounts,
    discountLoading,
    discountType,
    discountValue,
    total,
    invoiceNote,
    setInvoiceNote,
    editingDiscount,
    setEditingDiscount,
    setDiscountValue,
    setDiscountType,
    paymentMethod,
    editingOrderId: currentEditingOrderId,
    editingQty,
    editingNames,
    handleNameChange,
    handleQuantityChange,
    handleQuantityBlur,
    handleTotalChange,
    setEditingNames,
    removeFromCart,
    updateCartItem,
    getItemCurrentPrice,
    setPosError,
    submitOrder,
    customerName,
    customerPhone,
    setShowCustomerModal,
    handlePrintInvoice,
    allItems,
    addToCart,
  };
  // 1. إذا كان النظام ما زال يفحص هوية المتصفح
  if (checkingSecurity) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 text-white" dir="rtl">
        <Loader2 size={40} className="text-red-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-400">جاري التحقق من الهوية الرقمية لجهاز نقطة البيع...</p>
      </div>
    );
  }

  // 2. إذا لم يجد بصمة مفعلة أو كود مسجل، يحجب الكاشير ويعرض شاشة التفعيل
  //    لكن إذا كان المستخدم من لوحة الإدارة (يملك صلاحية ACCESS_POS_INTERFACE) يتجاوز التفعيل
  const adminRoles = [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BRANCH_MANAGER];
  const hasPosInterfaceAccess = userRole && adminRoles.includes(userRole as any);
  
  if (!deviceUuid || !posInfo) {
    if (hasPosInterfaceAccess) {
      // المستخدم من لوحة الإدارة — يسمح له بالدخول بدون تفعيل جهاز
      // استخدم بيانات وهمية لـ posInfo لتجنب الأخطاء
      setPosInfo({ code: 'ADMIN', name: 'واجهة الإدارة', branch_id: null });
    } else {
      return <POSActivationPage onActivationSuccess={handleActivationSuccess} />;
    }
  }
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full bg-slate-950 overflow-y-auto lg:overflow-hidden p-2 sm:p-4 lg:p-0 custom-scrollbar relative">
      {/* Submitting Overlay */}
      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[150] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl px-8 py-6 flex items-center gap-4 shadow-2xl">
              <Loader2 size={24} className="text-red-500 animate-spin" />
              <span className="text-white font-black text-sm">
                جاري إرسال الطلب...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Panel: Menu Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 h-full ${isCartOpen ? "hidden lg:flex" : "flex"}`}
      >
        {isHospitality ? (
          <HospitalityPOSHeader
            editingOrderId={currentEditingOrderId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            clearCart={clearActiveCart}
            onNewInvoice={clearActiveCart}
          />
        ) : (
          <POSHeader
            editingOrderId={currentEditingOrderId}
            isHospitality={isHospitality}
            activePOSMode={activePOSMode}
            setActivePOSMode={setActivePOSMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            quickId={quickId}
            quickQty={quickQty}
            quickTotal={quickTotal}
            handleQuickIdChange={handleQuickIdChange}
            handleQuickQtyChange={handleQuickQtyChange}
            handleQuickTotalChange={handleQuickTotalChange}
            handleQuickAdd={handleQuickAdd}
            handleKeyDown={handleKeyDown}
            clearCart={clearActiveCart}
          />
        )}

        <div className="flex-1 flex flex-col min-h-0">
          {activePOSMode === "tables" ? (
            <TablesView mode="pos" onSelect={handleTableClick} />
          ) : activePOSMode === "menu" ? (
            <MenuGrid
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              searchQuery={searchQuery}
              addToCart={addToCart}
              loading={menuLoading}
            />
          ) : activePOSMode === "info" ? (
            <InvoiceInfoTab
              editingOrderId={currentEditingOrderId}
              currentUser={currentUser}
              posInfo={posInfo}
              invoiceData={invoiceData}
            />
          ) : (
            <CustomerTab
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              selectedCustomer={selectedCustomer}
              accountType={accountType}
              setAccountType={setAccountType}
              accountNumber={accountNumber}
              setAccountNumber={setAccountNumber}
              setShowSearchModal={setShowSearchModal}
              customers={customers ?? []}
              suppliers={suppliers ?? []}
              employees={employees ?? []}
              isHospitality={isHospitality}
              total={total}
              payments={payments}
              addPayment={addPayment}
              removePayment={removePayment}
              updatePaymentAmount={updatePaymentAmount}
              updatePaymentReference={updatePaymentReference}
            />
          )}
        </div>
      </div>

      {/* Right Panel: Cart */}
      <CartPanel {...commonCartProps} />

      {/* Mobile Cart Button */}
      {currentCart.length > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="lg:hidden fixed bottom-6 left-6 right-6 bg-red-600 text-white py-4 rounded-2xl font-black shadow-2xl shadow-red-900/40 flex items-center justify-center gap-3 z-40 animate-bounce"
        >
          <ShoppingCart size={20} />
          عرض السلة ({currentCart.length}) — {total.toFixed(2)} ₪
        </button>
      )}

      {/* Modals */}
      <CustomerSearchModal
        show={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        customerSearchQuery={customerSearchQuery}
        setCustomerSearchQuery={setCustomerSearchQuery}
        filteredCustomers={filteredCustomers}
        handleSelectCustomer={handleSelectCustomer}
        onAddNew={(name) => {
          setQuickCustomerName(name);
          setShowQuickAddCustomer(true);
        }}
      />

      <QuickAddCustomerModal
        show={showQuickAddCustomer}
        onClose={() => setShowQuickAddCustomer(false)}
        quickCustomerName={quickCustomerName}
        setQuickCustomerName={setQuickCustomerName}
        quickCustomerPhone={quickCustomerPhone}
        setQuickCustomerPhone={setQuickCustomerPhone}
        handleQuickAddCustomer={handleQuickAddCustomer}
      />

      <CloseInvoiceModal
        show={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customerName={customerName}
        setCustomerName={setCustomerName}
        setPosError={setPosError}
        onConfirm={() =>
          submitOrder(
            OrderStatus.DELIVERED,
            paymentMethod,
            calculatedDiscount,
            { name: customerName, phone: customerPhone, note: invoiceNote },
          )
        }
      />
    </div>
  );
};
