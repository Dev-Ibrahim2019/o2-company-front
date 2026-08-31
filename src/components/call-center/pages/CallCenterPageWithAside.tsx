import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Phone, Search, ShoppingCart, Star, MapPin, User,
  Trash2, Save, Package, TrendingUp, Loader2, CheckCircle, Eye,
  MessageSquare, Sparkles, Users, Receipt,
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { Button, Badge, Card } from "../design/components";
import api from "../../../api/axios";
import { getBranchId } from "../../../auth/authStorage";
import { toast } from "../../shared/Toast";
import { branchService, type Branch } from "../../../services/branchService";

// ============================================================================
// TYPES
// ============================================================================

interface Customer {
  id: number;
  name: string;
  phone: string;
  mobile?: string;
  code: string;
  category?: string;
  loyalty_points?: number;
  address?: string;
}

interface OrderItem {
  id: number;
  item_name: string;
  item_name_ar?: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: number;
  order_number: string;
  created_at: string;
  total: number;
  status: string;
  order_type: string;
  items: OrderItem[];
  customer_name?: string;
  delivery_address?: string;
  payment_method?: string;
  branch?: { id: number; name: string } | null;
  delivery_address_snapshot?: { address?: string } | null;
  delivery_fee?: number;
  tax_amount?: number;
  scheduled_at?: string | null;
}

interface MenuItem {
  id: number;
  name: string;
  name_ar?: string;
  price: number;
  category?: string;
  image?: string;
  is_available: boolean;
  code?: string;
}

interface CartItem {
  id: number;
  name: string;
  name_ar?: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface FavoriteItem {
  item_id: number;
  item_name: string;
  item_name_ar?: string;
  orders_count: number;
  quantity_sum: number;
  total_spent: number;
}

const CHART_PALETTE = ["#8b5cf6", "#10b981", "#3b82f6", "#06b6d4", "#f43f5e", "#f97316"];

const ORDER_TYPE_LABELS: Record<"takeaway" | "dine_in" | "delivery", string> = {
  dine_in: "استلام من الفرع",
  takeaway: "طلب فوري",
  delivery: "توصيل للمنزل",
};
const ORDER_TYPE_TOOLTIPS: Record<"takeaway" | "dine_in" | "delivery", string> = {
  dine_in: "العميل سيستلم طلبه من الفرع مباشرة",
  takeaway: "طلب يُجهَّز فورًا ليُستلم من الكاشير — بدون خدمة طاولات",
  delivery: "الطلب يُوصَّل إلى عنوان العميل — يتطلب إدخال العنوان أدناه",
};

// Placeholder shown until a real customer is searched / real data arrives from the API.
const SAMPLE_ORDERS: Order[] = [
  {
    id: 1012, order_number: "1012", created_at: new Date().toISOString(), total: 185, status: "delivered", order_type: "takeaway",
    delivery_address: "فرع غزة - شارع الوحدة",
    items: [
      { id: 1, item_name: "شاورما دجاج", item_name_ar: "شاورما دجاج", quantity: 2, price: 45, total: 90 },
      { id: 2, item_name: "كابتن", item_name_ar: "كابتن", quantity: 1, price: 95, total: 95 },
    ],
  },
  {
    id: 1011, order_number: "1011", created_at: new Date(Date.now() - 86400000).toISOString(), total: 76, status: "delivered", order_type: "takeaway",
    delivery_address: "فرع الرجال",
    items: [
      { id: 3, item_name: "فرع دجاج مبهرة", item_name_ar: "فرع دجاج مبهرة", quantity: 1, price: 42, total: 42 },
      { id: 4, item_name: "كاتل باندنشز", item_name_ar: "كاتل باندنشز", quantity: 1, price: 34, total: 34 },
    ],
  },
  {
    id: 1010, order_number: "1010", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), total: 300, status: "delivered", order_type: "delivery",
    delivery_address: "توصيل للمنزل",
    items: [
      { id: 5, item_name: "شاورما بالدجاج", item_name_ar: "شاورما بالدجاج", quantity: 5, price: 60, total: 300 },
    ],
  },
  {
    id: 1009, order_number: "1009", created_at: new Date(Date.now() - 86400000 * 5).toISOString(), total: 60, status: "delivered", order_type: "takeaway",
    delivery_address: "فرع خان يونس",
    items: [
      { id: 6, item_name: "كبه لبن", item_name_ar: "كبه لبن", quantity: 2, price: 30, total: 60 },
    ],
  },
  {
    id: 1008, order_number: "1008", created_at: new Date(Date.now() - 86400000 * 10).toISOString(), total: 120, status: "delivered", order_type: "takeaway",
    delivery_address: "فرع غزة - الشجاعية",
    items: [
      { id: 7, item_name: "كابتن", item_name_ar: "كابتن", quantity: 1, price: 65, total: 65 },
      { id: 8, item_name: "شاورما دجاج", item_name_ar: "شاورما دجاج", quantity: 1, price: 55, total: 55 },
    ],
  },
];

const SAMPLE_FAVORITES: FavoriteItem[] = [
  { item_id: -1, item_name: "شاورما بالدجاج", item_name_ar: "شاورما بالدجاج", orders_count: 12, quantity_sum: 48, total_spent: 0 },
  { item_id: -2, item_name: "شاورما دجاج", item_name_ar: "شاورما دجاج", orders_count: 10, quantity_sum: 35, total_spent: 0 },
  { item_id: -3, item_name: "كاتل باندنشز", item_name_ar: "كاتل باندنشز", orders_count: 9, quantity_sum: 30, total_spent: 0 },
  { item_id: -4, item_name: "فرع دجاج مبهرة", item_name_ar: "فرع دجاج مبهرة", orders_count: 7, quantity_sum: 28, total_spent: 0 },
  { item_id: -5, item_name: "كابتن", item_name_ar: "كابتن", orders_count: 6, quantity_sum: 22, total_spent: 0 },
  { item_id: -6, item_name: "كبه لبن", item_name_ar: "كبه لبن", orders_count: 4, quantity_sum: 15, total_spent: 0 },
];

// ============================================================================
// CALL CENTER PAGE WITH ASIDE
// ============================================================================

export const CallCenterPageWithAside: React.FC = () => {
  // ── Customer State ──
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // ── Orders State ──
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");

  // ── Menu State ──
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  // ── Cart State ──
  const [cart, setCart] = useState<CartItem[]>([]);
  const [invoiceNote, setInvoiceNote] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderType, setOrderType] = useState<"takeaway" | "dine_in" | "delivery">("takeaway");

  // ── Branch / Delivery / Tax / Scheduling State ──
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    branchService.getAll().then(list => {
      setBranches(list);
      setSelectedBranchId(prev => prev ?? getBranchId() ?? list[0]?.id ?? null);
    });
  }, []);

  // ── Favorites State ──
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // ── Submit State ──
  const [submitting, setSubmitting] = useState(false);

  // ── Scroll State (floating customer pill) ──
  const [isScrolled, setIsScrolled] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollTargets: (HTMLElement | Window)[] = [
      window,
      ...Array.from(pageRef.current?.querySelectorAll<HTMLElement>(".cc-scroll-col") || []),
    ];
    const handleScroll = () => {
      const scrolled = window.scrollY > 60 ||
        Array.from(pageRef.current?.querySelectorAll<HTMLElement>(".cc-scroll-col") || []).some(el => el.scrollTop > 60);
      setIsScrolled(scrolled);
    };
    scrollTargets.forEach(t => t.addEventListener("scroll", handleScroll, { passive: true }));
    return () => scrollTargets.forEach(t => t.removeEventListener("scroll", handleScroll));
  }, []);

  // ── Order Ratings ──
  const [serviceRatings, setServiceRatings] = useState<Record<string, number>>({});
  const [deliveryRatings, setDeliveryRatings] = useState<Record<string, number>>({});

  // ═══════════════════════════════════════════════════════════════════════════
  // API CALLS
  // ═══════════════════════════════════════════════════════════════════════════

  const searchCustomer = async () => {
    if (!phone.trim()) return;
    setCustomerLoading(true);
    try {
      const res = await api.get("/call-center/customers/search", { params: { q: phone, limit: 1 } });
      const customers = res.data?.data || res.data || [];
      if (customers.length > 0) {
        const found = customers[0];
        setCustomer(found);
        setCustomerName(found.name || "");
        setCustomerAddress(found.address || "");
        setCustomerPhone(found.phone || phone);
        loadCustomerOrders(found.id);
        loadCustomerFavorites(found.id);
        toast.success("تم العثور على العميل", found.name);
      } else {
        setCustomer(null);
        setCustomerName("");
        setCustomerAddress("");
        setRecentOrders([]);
        setFavorites([]);
        toast.info("لم يتم العثور على العميل", "يمكنك حفظ بيانات جديدة");
      }
    } catch {
      setCustomer(null);
    } finally {
      setCustomerLoading(false);
    }
  };

  // Screen-pop عند وصول مكالمة: CallPhoneWidget يفتح هذه الصفحة بـ ?phone=...
  // لا يغيّر أي سلوك حالي — يعمل فقط عند وجود الباراميتر، والبحث اليدوي المعتاد
  // (searchCustomer أعلاه) يبقى كما هو تماماً بدون أي تعديل.
  useEffect(() => {
    const prefillPhone = new URLSearchParams(window.location.search).get("phone");
    if (!prefillPhone) return;
    setPhone(prefillPhone);
    (async () => {
      setCustomerLoading(true);
      try {
        const res = await api.get("/call-center/customers/search", { params: { q: prefillPhone, limit: 1 } });
        const customers = res.data?.data || res.data || [];
        if (customers.length > 0) {
          const found = customers[0];
          setCustomer(found);
          setCustomerName(found.name || "");
          setCustomerAddress(found.address || "");
          setCustomerPhone(found.phone || prefillPhone);
          loadCustomerOrders(found.id);
          loadCustomerFavorites(found.id);
          toast.success("مكالمة واردة — تم فتح ملف العميل", found.name);
        } else {
          toast.info("مكالمة واردة من رقم غير مسجّل", prefillPhone);
        }
      } catch {
        // صامت — لا نريد إزعاج الموظف برسالة خطأ عند مجرد فشل الجلب التلقائي
      } finally {
        setCustomerLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomerOrders = async (customerId: number) => {
    setOrdersLoading(true);
    try {
      const res = await api.get(`/call-center/customers/${customerId}/orders`, { params: { per_page: 5 } });
      setRecentOrders(res.data?.data || res.data || []);
    } catch {
      setRecentOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadCustomerFavorites = async (customerId: number) => {
    setFavoritesLoading(true);
    try {
      const res = await api.get(`/call-center/customers/${customerId}/favorites`);
      setFavorites(res.data?.data || res.data || []);
    } catch {
      setFavorites([]);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const loadMenuItems = async () => {
    setMenuLoading(true);
    try {
      let branchId = getBranchId();

      if (!branchId) {
        try {
          const me = await api.get("/auth/me");
          branchId = Number(me.data?.user?.branch_id ?? me.data?.branch_id ?? me.data?.data?.user?.branch_id ?? 0) || null;
        } catch {
          branchId = null;
        }
      }

      const effectiveBranchId = branchId ?? 1;
      const res = await api.get("/menu", { params: { branch_id: effectiveBranchId } });
      const responseData = res.data?.data ?? res.data ?? {};
      const categories = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData.categories)
          ? responseData.categories
          : [];

      const items: MenuItem[] = [];
      categories.forEach((cat: any) => {
        const catItems = Array.isArray(cat?.items) ? cat.items : [];
        catItems.forEach((item: any) => {
          const isAvailable = item.is_available !== false && item.is_availble !== false;
          items.push({
            id: item.id,
            name: item.name,
            name_ar: item.name_ar ?? item.name,
            price: Number(item.price ?? 0),
            category: cat.name_ar ?? cat.name,
            image: item.image ?? item.image_url,
            is_available: isAvailable,
            code: item.code,
          });
        });
      });

      setMenuItems(items);
    } catch {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const saveCustomerData = async () => {
    try {
      if (customer?.id) {
        await api.put(`/call-center/customers/${customer.id}`, {
          name: customerName,
          address: customerAddress,
        });
      } else {
        const res = await api.post("/call-center/customers", {
          name: customerName,
          phone: customerPhone || phone,
          address: customerAddress,
        });
        if (res.data?.data) setCustomer(res.data.data);
      }
      toast.success("تم حفظ البيانات بنجاح");
    } catch (err: any) {
      toast.error("فشل حفظ البيانات", err?.response?.data?.message);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CART OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: item.id, name: item.name, name_ar: item.name_ar, price: item.price, quantity: 1, notes: "" }];
    });
  };

  const addFavoriteToCart = (fav: FavoriteItem) => {
    const existing = menuItems.find(m => m.id === fav.item_id);
    if (existing) {
      addToCart(existing);
      return;
    }
    setCart(prev => {
      const found = prev.find(c => c.id === fav.item_id);
      if (found) {
        return prev.map(c => c.id === fav.item_id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: fav.item_id, name: fav.item_name, name_ar: fav.item_name_ar, price: 0, quantity: 1, notes: "" }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev =>
      prev.map(c => {
        if (c.id === id) {
          const newQty = c.quantity + delta;
          return newQty > 0 ? { ...c, quantity: newQty } : c;
        }
        return c;
      }).filter(c => c.quantity > 0)
    );
  };

  const updateCartQuantityDirect = (id: number, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.id !== id));
    } else {
      setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c));
    }
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const clearCart = () => setCart([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED
  // ═══════════════════════════════════════════════════════════════════════════

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const manualDiscount = discountType === "PERCENT"
    ? (cartSubtotal * discountValue) / 100
    : discountValue;

  const taxableBase = Math.max(0, cartSubtotal - manualDiscount);
  const taxAmount = taxEnabled ? (taxableBase * taxRate) / 100 : 0;
  const effectiveDeliveryFee = orderType === "delivery" ? deliveryFee : 0;

  const total = taxableBase + taxAmount + effectiveDeliveryFee;

  const cartQtyById = useMemo(() => Object.fromEntries(cart.map(c => [c.id, c.quantity])), [cart]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch = !menuSearchQuery ||
        item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
        (item.name_ar && menuSearchQuery && item.name_ar.includes(menuSearchQuery));
      return matchesCategory && matchesSearch && item.is_available;
    });
  }, [menuItems, selectedCategory, menuSearchQuery]);

  const categories = useMemo(
    () => [...new Set(menuItems.map(i => i.category).filter((c): c is string => Boolean(c)))],
    [menuItems]
  );

  const pickupLabel = (order: Order) => {
    if (order.delivery_address) return order.delivery_address; // بيانات تجريبية (SAMPLE_ORDERS)
    if (order.order_type === "delivery") {
      const addr = order.delivery_address_snapshot?.address;
      return addr ? `توصيل — ${addr}` : "توصيل للمنزل";
    }
    return order.branch?.name || "—";
  };

  // Fall back to sample data whenever there's nothing real yet, so the page never looks empty/unfinished.
  const displayOrders = recentOrders.length > 0 ? recentOrders : SAMPLE_ORDERS;
  const displayFavorites = favorites.length > 0 ? favorites : SAMPLE_FAVORITES;

  const topFavorites = useMemo(
    () => [...displayFavorites].sort((a, b) => b.quantity_sum - a.quantity_sum).slice(0, 6),
    [displayFavorites]
  );
  const maxFavoriteQty = Math.max(1, ...topFavorites.map(f => f.quantity_sum));

  const filteredRecentOrders = useMemo(() => {
    if (!orderSearchQuery) return displayOrders;
    const q = orderSearchQuery.toLowerCase();
    return displayOrders.filter(o =>
      o.order_number?.toLowerCase().includes(q) || pickupLabel(o).toLowerCase().includes(q)
    );
  }, [displayOrders, orderSearchQuery]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMIT ORDER
  // ═══════════════════════════════════════════════════════════════════════════

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    if (orderType === "delivery" && !customerAddress.trim()) {
      toast.error("عنوان التوصيل مطلوب", "أدخل عنوان العميل قبل تنفيذ طلب توصيل");
      return;
    }
    if (scheduleEnabled) {
      if (!scheduledAt) {
        toast.error("حدد موعد الجدولة");
        return;
      }
      if (new Date(scheduledAt).getTime() < Date.now()) {
        toast.error("موعد الجدولة يجب أن يكون في المستقبل");
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        branch_id: selectedBranchId ?? getBranchId() ?? 1,
        order_type: orderType,
        customer_id: customer?.id,
        customer_name: customerName || customer?.name,
        customer_phone: customerPhone || phone,
        ...(orderType === "delivery" ? { delivery_address_snapshot: { address: customerAddress } } : {}),
        note: invoiceNote,
        discount_value: discountValue || undefined,
        discount_type: discountType === "PERCENT" ? "percent" : "amount",
        payment_method: paymentMethod,
        delivery_fee: effectiveDeliveryFee || undefined,
        tax_rate: taxEnabled ? taxRate : undefined,
        scheduled_at: scheduleEnabled && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        items: cart.map(c => ({
          item_id: c.id,
          quantity: c.quantity,
          unit_price: c.price,
          notes: c.notes,
        })),
      };
      const res = await api.post("/orders", payload);
      toast.success("تم إرسال الطلب بنجاح", `رقم الطلب: ${res.data?.data?.order_number || res.data?.order_number}`);
      clearCart();
      setInvoiceNote("");
      setDiscountValue(0);
      setDeliveryFee(0);
      setTaxEnabled(false);
      setTaxRate(0);
      setScheduleEnabled(false);
      setScheduledAt("");
      if (customer?.id) loadCustomerOrders(customer.id);
    } catch (err: any) {
      toast.error("فشل إرسال الطلب", err?.response?.data?.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} ₪`;
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div ref={pageRef} dir="rtl" className="flex flex-col lg:h-screen lg:overflow-hidden" style={{ fontFamily: typography.fontFamily.sans }}>
      {/* Responsive helpers that plain inline styles can't express (media queries) */}
      <style>{`
        .cc-scroll-col { overflow-y: visible; }
        @media (min-width: 1024px) {
          .cc-scroll-col { overflow-y: auto; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          STICKY CUSTOMER INFO BAR — Transparent pill overlay on scroll
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="fixed top-2 sm:top-4 left-1/2 z-50 transition-all duration-500 ease-out w-[calc(100%-1.5rem)] sm:w-auto max-w-full flex justify-center px-2"
        style={{
          transform: `translateX(-50%) translateY(${isScrolled ? "0" : "-120%"})`,
          opacity: isScrolled ? 1 : 0,
          pointerEvents: isScrolled ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full backdrop-blur-xl border transition-all duration-300 flex-wrap justify-center max-w-full"
          style={{
            background: "rgba(226, 0, 4, 0.08)",
            borderColor: "rgba(226, 0, 4, 0.15)",
            boxShadow: isScrolled
              ? "0 8px 32px rgba(226, 0, 4, 0.12), 0 2px 8px rgba(0,0,0,0.06)"
              : "none",
          }}
        >
          {/* Customer Avatar */}
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300"
            style={{ background: "rgba(226, 0, 4, 0.12)" }}
          >
            <User size={15} style={{ color: colors.brand[600] }} />
          </div>

          {/* Customer Name + Phone */}
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-bold" style={{ color: colors.brand[700] }}>
              {customerName || "عميل جديد"}
            </span>
            <span className="text-[10px] font-medium" style={{ color: "rgba(226, 0, 4, 0.45)" }}>
              {customerPhone || phone || "بدون رقم"}
            </span>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-5" style={{ background: "rgba(226, 0, 4, 0.12)" }} />

          {/* Address */}
          <div className="hidden sm:flex items-center gap-1.5">
            <MapPin size={13} style={{ color: "rgba(226, 0, 4, 0.4)" }} />
            <span className="text-xs font-semibold" style={{ color: "rgba(226, 0, 4, 0.6)" }}>
              {customerAddress || "—"}
            </span>
          </div>

          {/* Loyalty */}
          {customer && (
            <>
              <div className="hidden sm:block w-px h-5" style={{ background: "rgba(226, 0, 4, 0.12)" }} />
              <div className="hidden sm:flex items-center gap-1.5">
                <Star size={13} style={{ color: "#f59e0b" }} fill="currentColor" />
                <span className="text-xs font-semibold" style={{ color: "rgba(226, 0, 4, 0.6)" }}>
                  {customer.loyalty_points || 0}
                </span>
              </div>
            </>
          )}

          {/* Cart Pill */}
          {cart.length > 0 && (
            <>
              <div className="w-px h-5" style={{ background: "rgba(226, 0, 4, 0.12)" }} />
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ background: "rgba(226, 0, 4, 0.1)" }}
              >
                <ShoppingCart size={13} style={{ color: colors.brand[600] }} />
                <span className="text-xs font-bold" style={{ color: colors.brand[700] }}>
                  {cart.length} · {formatCurrency(total)}
                </span>
              </div>
            </>
          )}

          {/* Order Type */}
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
            style={{
              background: orderType === "dine_in" ? "rgba(226, 0, 4, 0.1)" : "rgba(226, 0, 4, 0.15)",
              color: colors.brand[600],
            }}
          >
            {ORDER_TYPE_LABELS[orderType]}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TWO-COLUMN LAYOUT — RTL: RIGHT (customer) | LEFT (chart + POS)
          Stacks into a single column below the "lg" breakpoint; each
          column scrolls independently only on large screens.
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 lg:h-[calc(100vh-40px)] p-3 sm:p-4 lg:p-0">

        {/* ══════════════════ RIGHT COLUMN — Customer ══════════════════ */}
        <div className="cc-scroll-col flex-1 flex flex-col min-w-0 min-h-0 custom-scrollbar lg:pr-1 gap-4" dir="rtl">

          {/* ── Customer Search ── */}
          <Card padding="20px" style={{ boxShadow: shadows.xs }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                <Users size={16} style={{ color: colors.brand[500] }} />
                البحث برقم العميل
              </h2>
              {customer && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "11px", fontWeight: typography.weight.semibold, color: colors.semantic.success, background: colors.semantic.successBg, padding: "3px 10px", borderRadius: radius.full }}>
                  <CheckCircle size={11} /> عميل موجود
                </span>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <Phone size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchCustomer()}
                placeholder="أدخل رقم العميل"
                dir="ltr"
                style={{
                  width: "100%", height: 42, padding: "0 40px 0 12px", fontSize: "14px",
                  border: `1px solid ${colors.border.default}`, borderRadius: radius.lg,
                  outline: "none", fontFamily: typography.fontFamily.mono, boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <Button icon={<Search size={16} />} onClick={searchCustomer} loading={customerLoading} fullWidth>
                بحث
              </Button>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", fontWeight: 500, color: colors.neutral[600], marginBottom: 5 }}>
                <User size={12} /> اسم العميل
              </label>
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="اسم العميل"
                style={{ width: "100%", height: 36, padding: "0 12px", fontSize: "13px", border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", fontWeight: 500, color: colors.neutral[600], marginBottom: 5 }}>
                <MapPin size={12} /> العنوان
              </label>
              <input
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                placeholder="العنوان"
                style={{ width: "100%", height: 36, padding: "0 12px", fontSize: "13px", border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div className="flex flex-col sm:flex-row" style={{ gap: 8, marginTop: 16 }}>
              <Button variant="primary" fullWidth icon={<Save size={14} />} onClick={saveCustomerData}>حفظ البيانات</Button>
              <Button variant="secondary" fullWidth>مزيد من التفاصيل</Button>
            </div>
          </Card>

          {/* ── Last 5 Orders Table ── */}
          <Card padding="20px" style={{ boxShadow: shadows.xs }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                <Receipt size={16} style={{ color: colors.brand[500] }} />
                آخر 5 أوردرات لهذا العميل
              </h2>
              <div style={{ position: "relative", width: "100%", maxWidth: 200 }}>
                <Search size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: colors.neutral[400] }} />
                <input
                  value={orderSearchQuery}
                  onChange={e => setOrderSearchQuery(e.target.value)}
                  placeholder="بحث في الطلبات..."
                  style={{ height: 30, padding: "0 30px 0 10px", fontSize: "12px", border: `1px solid ${colors.border.subtle}`, borderRadius: radius.md, outline: "none", width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {ordersLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
                <Loader2 size={22} className="animate-spin" style={{ color: colors.brand[500] }} />
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: 560 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${colors.border.subtle}` }}>
                      {["رقم الطلب", "تاريخ الطلب", "مكان الاستلام", "المبلغ الإجمالي", "عرض التفاصيل"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: colors.neutral[500], fontSize: "12px" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentOrders.map(order => (
                      <React.Fragment key={order.id}>
                        <tr style={{ borderBottom: `1px solid ${colors.neutral[100]}` }}>
                          <td style={{ padding: "14px 16px", color: colors.neutral[900], fontWeight: 500 }}>#{order.order_number}</td>
                          <td style={{ padding: "14px 16px", color: colors.neutral[500] }}>{formatDate(order.created_at)}</td>
                          <td style={{ padding: "14px 16px", color: colors.neutral[500] }}>{pickupLabel(order)}</td>
                          <td style={{ padding: "14px 16px", fontWeight: 600, color: colors.neutral[900] }}>{formatCurrency(order.total)}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <button
                              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "6px 16px", borderRadius: radius.full,
                                border: `1.5px solid ${colors.semantic.success}`, background: "transparent",
                                color: colors.semantic.success, fontSize: "12px", fontWeight: 600, cursor: "pointer",
                                transition: `all ${transitions.fast}`,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = colors.semantic.success; e.currentTarget.style.color = "#fff"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = colors.semantic.success; }}
                            >
                              <Eye size={14} />
                              تفاصيل
                            </button>
                          </td>
                        </tr>
                        {expandedOrder === order.id && (
                          <tr>
                            <td colSpan={5} style={{ padding: 0 }}>
                              <div style={{
                                margin: "8px 16px", padding: "20px", borderRadius: radius.lg,
                                border: `1px solid ${colors.semantic.successBorder}`, background: colors.semantic.successBg,
                              }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                    <h3 style={{ fontSize: "14px", fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                                      تفاصيل الطلب #{order.order_number}
                                    </h3>
                                    <span style={{ fontSize: "11px", color: colors.neutral[500] }}>{formatDate(order.created_at)}</span>
                                    <span style={{ fontSize: "11px", color: colors.neutral[500] }}>{pickupLabel(order)}</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: "12px", fontWeight: typography.weight.bold, color: colors.semantic.success }}>{formatCurrency(order.total)}</span>
                                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: radius.full, background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
                                      {order.items.length} صنف
                                    </span>
                                  </div>
                                </div>

                                <div style={{ overflowX: "auto" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: 16, minWidth: 420 }}>
                                    <thead>
                                      <tr>
                                        {["الصنف", "الكمية", "سعر الوحدة", "الإجمالي"].map(h => (
                                          <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#fff", background: colors.semantic.success, fontSize: "11px" }}>
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {order.items.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: `1px solid ${colors.neutral[100]}`, background: colors.surface.raised }}>
                                          <td style={{ padding: "10px 12px", color: colors.neutral[900] }}>{item.item_name_ar || item.item_name}</td>
                                          <td style={{ padding: "10px 12px", color: colors.neutral[500] }}>{item.quantity}</td>
                                          <td style={{ padding: "10px 12px", color: colors.neutral[500] }}>{formatCurrency(item.price)}</td>
                                          <td style={{ padding: "10px 12px", fontWeight: 600, color: colors.neutral[900] }}>{formatCurrency(item.total || item.price * item.quantity)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                                  <div style={{ flex: 1, minWidth: 240, padding: "16px", borderRadius: radius.lg, background: colors.surface.raised, border: `1px solid ${colors.neutral[200]}` }}>
                                    <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: 8, color: colors.neutral[700] }}>
                                      تقييم الخدمة
                                    </h4>
                                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                                      {[1, 2, 3, 4, 5].map(s => (
                                        <button key={s} onClick={() => setServiceRatings(prev => ({ ...prev, [order.id]: s }))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                                          <Star size={22} color={(serviceRatings[order.id] || 0) >= s ? "#facc15" : "#d1d5db"} fill={(serviceRatings[order.id] || 0) >= s ? "#facc15" : "none"} />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div style={{ flex: 1, minWidth: 240, padding: "16px", borderRadius: radius.lg, background: colors.surface.raised, border: `1px solid ${colors.neutral[200]}` }}>
                                    <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: 8, color: colors.neutral[700] }}>
                                      تقييم التوصيل
                                    </h4>
                                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                                      {[1, 2, 3, 4, 5].map(s => (
                                        <button key={s} onClick={() => setDeliveryRatings(prev => ({ ...prev, [order.id]: s }))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                                          <Star size={22} color={(deliveryRatings[order.id] || 0) >= s ? "#facc15" : "#d1d5db"} fill={(deliveryRatings[order.id] || 0) >= s ? "#facc15" : "none"} />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "center" }}>
                                  <button onClick={() => setExpandedOrder(null)} style={{ padding: "8px 24px", borderRadius: radius.lg, border: `1px solid ${colors.neutral[200]}`, background: colors.surface.raised, color: colors.neutral[500], fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ── Details Section ── */}
          <Card padding="20px" style={{ boxShadow: shadows.xs }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
              <MessageSquare size={16} style={{ color: colors.brand[500] }} />
              التفاصيل
            </h2>

            <div className="flex flex-wrap" style={{ alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
              <span style={{ fontSize: "14px", color: colors.neutral[600] }}>تقييم العميل:</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setServiceRatings(prev => ({ ...prev, customer: s }))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                    <Star size={28} color={(serviceRatings.customer || 0) >= s ? "#facc15" : "#d1d5db"} fill={(serviceRatings.customer || 0) >= s ? "#facc15" : "none"} />
                  </button>
                ))}
              </div>
              <span style={{ fontSize: "12px", color: colors.neutral[400] }}>{serviceRatings.customer ? "تم التقييم" : "لم يتم التقييم بعد"}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "14px", color: colors.neutral[600], marginBottom: 8, textAlign: "center" }}>
                ملاحظات حول الطلب السابق:
              </label>
              <textarea
                value={invoiceNote}
                onChange={e => setInvoiceNote(e.target.value)}
                placeholder="أدخل ملاحظاتك هنا..."
                style={{
                  width: "100%", minHeight: 120, padding: "12px", fontSize: "14px",
                  border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, outline: "none",
                  resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>

            <Button variant="primary" fullWidth icon={<Save size={14} />} onClick={saveCustomerData}>حفظ التفاصيل</Button>
          </Card>
        </div>

        {/* ══════════════════ LEFT COLUMN — Chart + POS ══════════════════ */}
        <div className="cc-scroll-col flex-1 flex flex-col min-w-0 min-h-0 custom-scrollbar lg:pl-1 gap-4" dir="rtl">

          {/* ── Top Ordered Items Chart ── */}
          <Card padding="20px" style={{ boxShadow: shadows.xs }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                <TrendingUp size={16} style={{ color: colors.brand[500] }} />
                الأكثر طلبًا لهذا العميل
              </h2>
              <Badge variant="brand"><Sparkles size={11} /> تتبعي</Badge>
            </div>

            {favoritesLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: colors.brand[500] }} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end", minHeight: 170, minWidth: 360 }}>
                  {topFavorites.map((meal, i) => {
                    const barColor = CHART_PALETTE[i % CHART_PALETTE.length];
                    return (
                      <button
                        key={meal.item_id}
                        onClick={() => addFavoriteToCart(meal)}
                        title="إضافة إلى السلة"
                        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, minWidth: 50 }}
                      >
                        <span style={{ fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.neutral[700] }}>
                          {meal.quantity_sum}
                        </span>
                        <div style={{
                          width: "100%", height: Math.max(30, (meal.quantity_sum / maxFavoriteQty) * 120),
                          background: barColor, borderRadius: radius.lg,
                          transition: `filter ${transitions.fast}`,
                        }} />
                        <span style={{ fontSize: "10px", color: colors.neutral[600], textAlign: "center", lineHeight: 1.2 }}>
                          {meal.item_name_ar || meal.item_name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* ══════════════════ POS SECTION — Menu + Cart (Dark Theme) ══════════════════ */}
          <div className="bg-slate-950 rounded-2xl border border-white/10 flex flex-col lg:flex-row gap-0 overflow-hidden" style={{ flex: 1, minHeight: 500 }}>

            {/* Menu Area */}
            {/* min-w-[240px] بدل min-w-0 — كانت تسمح بانكماش العمود إلى شبه صفر عند ضيق المساحة بدل حد أدنى معقول */}
            <div className="flex-1 flex flex-col min-w-[240px] p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={menuSearchQuery}
                    onChange={e => setMenuSearchQuery(e.target.value)}
                    placeholder="ابحث عن صنف بالاسم أو الكود..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:ring-1 focus:ring-red-600 placeholder:text-slate-600"
                  />
                </div>
                <div className="flex bg-slate-800 px-2.5 py-2 rounded-lg shrink-0">
                  <span className="text-[11px] font-black text-slate-400">{filteredItems.length} صنف</span>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="mb-3 flex shrink-0 gap-1.5 overflow-x-auto custom-scrollbar py-1">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg whitespace-nowrap text-[11px] font-black transition-all duration-200 border shrink-0 ${selectedCategory === "all" ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800"}`}
                >
                  <span>الكل</span>
                </button>
                {categories.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg whitespace-nowrap text-[11px] font-black transition-all duration-200 border shrink-0 ${selectedCategory === cat ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800"}`}
                  >
                    <span>{cat}</span>
                  </button>
                ))}
              </div>

              {/* Items Grid */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 overflow-y-auto pr-1 pb-6 custom-scrollbar">
                {menuLoading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
                    <Loader2 size={32} className="animate-spin" />
                    <p className="font-black text-sm">جاري تحميل المنيو...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
                    <Package size={40} strokeWidth={1} />
                    <p className="font-black text-xs">{menuSearchQuery ? "لا توجد نتائج مطابقة" : "لا توجد أصناف متاحة"}</p>
                  </div>
                ) : (
                  filteredItems.map(item => {
                    const inCartQty = cartQtyById[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="group cursor-pointer flex flex-col gap-2"
                      >
                        <div className={`aspect-square relative rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-300 shadow-lg ${inCartQty > 0 ? "border-red-600/70" : "border-white/5 group-hover:border-red-600/50"}`}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name_ar || item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          {inCartQty > 0 && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black shadow-lg border border-white/20">{inCartQty}</div>
                          )}
                          {!item.image && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                              <Package size={32} strokeWidth={1} />
                            </div>
                          )}
                        </div>
                        <div className="px-1">
                          <h4 className="font-black text-slate-100 text-[11px] leading-tight group-hover:text-red-500 transition-colors line-clamp-2">{item.name_ar || item.name}</h4>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[11px] font-black text-red-500">{item.price > 0 ? `${item.price.toFixed(2)} ₪` : "—"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cart Panel */}
            {/* عرض نسبي بحدود بدل px ثابت (450/500) — كان يبتلع كل مساحة العمود عند 1280-1440px ويكاد يصفّر عمود المنيو المجاور */}
            <div className="w-full lg:w-[42%] lg:min-w-[320px] lg:max-w-[420px] bg-slate-900 border-t lg:border-t-0 lg:border-r border-white/10 flex flex-col overflow-hidden lg:flex-none shrink-0">
              {/* Cart Header */}
              <div className="p-3 sm:p-4 border-b border-white/5 space-y-3 bg-slate-900/50 backdrop-blur-md lg:sticky lg:top-0 z-10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="text-red-500" size={16} />
                    <h3 className="text-xs sm:text-sm font-black text-white">تفاصيل الفاتورة</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {customer && (
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{customer.name}</span>
                    )}
                    <div className="flex bg-slate-800 p-1 rounded-lg">
                      {(["dine_in", "takeaway", "delivery"] as const).map(id => (
                        <button
                          key={id}
                          title={ORDER_TYPE_TOOLTIPS[id]}
                          className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-black rounded-md transition-all whitespace-nowrap ${orderType === id ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                          onClick={() => setOrderType(id)}
                        >
                          {ORDER_TYPE_LABELS[id]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">الفرع</span>
                    <select
                      value={selectedBranchId ?? ""}
                      onChange={e => setSelectedBranchId(Number(e.target.value) || null)}
                      title="الفرع الذي سيجهّز هذا الطلب"
                      className="flex-1 min-w-0 bg-slate-800 text-slate-200 text-[11px] font-black rounded-lg px-2 py-1.5 outline-none border border-white/5"
                    >
                      {branches.length === 0 && <option value="">جارِ التحميل...</option>}
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    title="جدولة الطلب لوقت لاحق بدل التنفيذ الفوري"
                    onClick={() => setScheduleEnabled(v => !v)}
                    className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg whitespace-nowrap transition-all ${scheduleEnabled ? "bg-red-600 text-white" : "bg-slate-800 text-slate-500 hover:text-slate-300"}`}
                  >
                    جدولة الطلب
                  </button>
                </div>

                {scheduleEnabled && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 text-[11px] font-black rounded-lg px-2 py-1.5 outline-none border border-white/5"
                    dir="ltr"
                  />
                )}

                {orderType === "delivery" && !customerAddress.trim() && (
                  <div className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                    عنوان التوصيل مطلوب — أدخله في حقل "العنوان" في بيانات العميل
                  </div>
                )}

                <div className="bg-red-600/10 border border-red-600/20 p-2.5 px-3 rounded-lg flex flex-col gap-1">
                  {manualDiscount > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الإجمالي الفرعي</span>
                        <span className="text-sm font-black text-slate-300">{cartSubtotal.toFixed(2)} ₪</span>
                      </div>
                      <div className="flex justify-between items-center text-red-500">
                        <span className="text-[10px] font-black uppercase tracking-widest">الخصم</span>
                        <span className="text-sm font-black">-{manualDiscount.toFixed(2)} ₪</span>
                      </div>
                    </>
                  )}
                  {taxEnabled && taxAmount > 0 && (
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] font-black uppercase tracking-widest">الضريبة ({taxRate}%)</span>
                      <span className="text-sm font-black">{taxAmount.toFixed(2)} ₪</span>
                    </div>
                  )}
                  {effectiveDeliveryFee > 0 && (
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] font-black uppercase tracking-widest">رسوم التوصيل</span>
                      <span className="text-sm font-black">{effectiveDeliveryFee.toFixed(2)} ₪</span>
                    </div>
                  )}
                  <div className={`pt-1 mt-1 ${manualDiscount > 0 || (taxEnabled && taxAmount > 0) || effectiveDeliveryFee > 0 ? "border-t border-red-600/20" : ""} flex justify-between items-center`}>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{manualDiscount > 0 ? "الصافي النهائي" : "الإجمالي الكلي"}</span>
                    <div className="text-left">
                      <span className="text-xl sm:text-2xl lg:text-3xl font-black text-red-600">{total.toFixed(2)}</span>
                      <span className="text-[12px] font-black text-red-600 mr-1">₪</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cart Items Header */}
              <div className="bg-slate-900 border-b border-white/5 overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[350px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["#", "الصنف", "السعر", "الكمية", "الإجمالي", ""].map((h, i) => (
                        <th key={i} className={`p-2 sm:p-3 text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest ${i === 4 ? "text-left" : i === 3 ? "text-center" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Cart Items (scrollable) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[100px]">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-700 gap-2">
                    <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
                      <ShoppingCart size={24} strokeWidth={1.5} />
                    </div>
                    <p className="font-black text-lg">الفاتورة فارغة</p>
                    <p className="text-[11px] text-slate-600">اضغط على أي صنف في المنيو لإضافته</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse min-w-[350px]">
                      <tbody className="divide-y divide-white/5">
                        {cart.map((item, index) => (
                          <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                            <td className="p-2 sm:p-3 text-[10px] sm:text-[11px] font-black text-slate-600">{index + 1}</td>
                            <td className="p-2 sm:p-3">
                              <input
                                type="text"
                                value={item.notes || ""}
                                onChange={e => setCart(prev => prev.map(c => c.id === item.id ? { ...c, notes: e.target.value } : c))}
                                placeholder={item.name_ar || item.name}
                                className="w-full bg-transparent text-[11px] sm:text-xs font-black text-white outline-none border-b border-transparent focus:border-red-500/30 placeholder:text-white"
                              />
                            </td>
                            <td className="p-2 sm:p-3 text-center text-[11px] sm:text-xs font-bold text-slate-400">{item.price.toFixed(2)}</td>
                            <td className="p-2 sm:p-3">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 bg-slate-700 rounded text-[11px] font-bold text-white hover:bg-slate-600 flex items-center justify-center">-</button>
                                <input
                                  type="text"
                                  value={item.quantity}
                                  onChange={e => { const val = parseInt(e.target.value); if (!isNaN(val)) updateCartQuantityDirect(item.id, val); }}
                                  className="w-8 bg-transparent text-center text-[11px] sm:text-xs font-black text-white outline-none"
                                />
                                <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 bg-slate-700 rounded text-[11px] font-bold text-white hover:bg-slate-600 flex items-center justify-center">+</button>
                              </div>
                            </td>
                            <td className="p-2 sm:p-3 text-left">
                              <span className="text-[11px] sm:text-xs font-black text-red-500">{(item.price * item.quantity).toFixed(2)}</span>
                            </td>
                            <td className="p-2 sm:p-3 text-center">
                              <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-slate-600 hover:text-red-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              <div className="p-3 sm:p-4 bg-slate-950 border-t border-white/10 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-slate-500 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-widest">الملاحظة</span>
                    </div>
                    <textarea value={invoiceNote} onChange={e => setInvoiceNote(e.target.value)} placeholder="..." className="w-full bg-transparent text-[11px] sm:text-xs font-black outline-none text-white placeholder:text-slate-700 h-12 sm:h-16 resize-none" />
                  </div>
                  <div className="sm:w-28 lg:w-32 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-slate-500 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-widest">الخصم</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={discountValue || ""}
                        onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="flex-1 min-w-0 bg-transparent text-center text-[11px] sm:text-xs font-black text-white outline-none"
                      />
                      <button onClick={() => setDiscountType(discountType === "AMOUNT" ? "PERCENT" : "AMOUNT")} className="text-[10px] font-black text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded hover:text-slate-200 transition-colors shrink-0">
                        {discountType === "AMOUNT" ? "₪" : "%"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {orderType === "delivery" && (
                    <div className="flex-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-slate-500 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest">رسوم التوصيل</span>
                      </div>
                      <input
                        type="number"
                        value={deliveryFee || ""}
                        onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-transparent text-[11px] sm:text-xs font-black text-white outline-none"
                      />
                    </div>
                  )}
                  <div className="flex-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-1 text-slate-500 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-widest">الضريبة</span>
                      <button
                        type="button"
                        onClick={() => setTaxEnabled(v => !v)}
                        title="تفعيل/إيقاف احتساب الضريبة على هذا الطلب"
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded transition-colors shrink-0 ${taxEnabled ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                      >
                        {taxEnabled ? "مفعّلة" : "متوقفة"}
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={taxRate || ""}
                        onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        disabled={!taxEnabled}
                        className="flex-1 min-w-0 bg-transparent text-center text-[11px] sm:text-xs font-black text-white outline-none disabled:opacity-30"
                      />
                      <span className="text-[10px] font-black text-slate-500 shrink-0">%</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 pt-1">
                  {[{ id: "cash", label: "نقداً" }, { id: "card", label: "بطاقة" }, { id: "wallet", label: "محفظة" }].map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex-1 py-2 text-[11px] sm:text-[12px] font-black rounded-lg transition-all ${paymentMethod === pm.id ? "bg-red-600 text-white shadow-lg shadow-red-900/30" : "bg-slate-800 text-slate-500 hover:text-slate-300 border border-white/5"}`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => { if (cart.length === 0) return; submitOrder(); }}
                    disabled={cart.length === 0 || submitting}
                    className="py-2.5 sm:py-3 bg-slate-800 text-white rounded-xl font-black text-[11px] sm:text-[12px] flex items-center justify-center gap-1.5 hover:bg-slate-700 disabled:opacity-30 transition-all active:scale-95"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    حفظ
                  </button>
                  <button
                    onClick={() => { if (cart.length === 0) return; submitOrder(); }}
                    disabled={cart.length === 0 || submitting}
                    className="py-2.5 sm:py-3 bg-red-600 text-white rounded-xl font-black text-[11px] sm:text-[12px] flex items-center justify-center gap-1.5 hover:bg-red-700 shadow-xl shadow-red-900/20 disabled:opacity-30 transition-all active:scale-95"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    {submitting ? "جارِ الإرسال..." : "تنفيذ"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
