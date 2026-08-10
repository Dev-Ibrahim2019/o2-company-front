import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Phone, Search, ShoppingCart, Star, MapPin, Clock, User,
  Plus, Minus, Trash2, ChevronDown, ChevronUp, Save, X,
  Package, TrendingUp, PhoneOff, PhoneIncoming, Loader2, CheckCircle, Eye
} from "lucide-react";
import { colors, typography, radius, shadows, transitions } from "../design/tokens";
import { Button, Badge, Card, SearchInput } from "../design/components";
import api from "../../../api/axios";
import { toast } from "../../shared/Toast";

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
  const [orderType, setOrderType] = useState<"takeaway" | "dine_in">("takeaway");

  // ── Favorites State ──
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [activeTab, setActiveTab] = useState<"meals" | "favorites" | "inquiries">("meals");
  const [tabSearchQuery, setTabSearchQuery] = useState("");

  // ── Submit State ──
  const [submitting, setSubmitting] = useState(false);

  // ── Scroll State ──
  const [isScrolled, setIsScrolled] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = pageRef.current?.closest(".overflow-y-auto");
    if (!scrollContainer) return;
    const handleScroll = () => setIsScrolled(scrollContainer.scrollTop > 60);
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Chart Data ──
  const [lastMealsChart] = useState([
    { name: "كاتل باندنشز", count: 30, color: "#8b5cf6" },
    { name: "شاورما بالدجاج", count: 48, color: "#10b981" },
    { name: "كابتن", count: 22, color: "#3b82f6" },
    { name: "فرع دجاج مبهرة", count: 28, color: "#06b6d4" },
    { name: "شاورما دجاج", count: 35, color: "#f43f5e" },
    { name: "كبه لبن", count: 15, color: "#f97316" },
  ]);

  // ── Mock Orders ──
  const [mockOrders] = useState<Order[]>([
    {
      id: 1012, order_number: "1012", created_at: new Date().toISOString(), total: 185, status: "delivered", order_type: "takeaway",
      customer_name: "توائي النفار", delivery_address: "فرع غزة - شارع الوحدة",
      items: [
        { id: 1, item_name: "شاورما دجاج", item_name_ar: "شاورما دجاج", quantity: 2, price: 45, total: 90 },
        { id: 2, item_name: "كابتن", item_name_ar: "كابتن", quantity: 1, price: 95, total: 95 },
      ],
    },
    {
      id: 1011, order_number: "1011", created_at: new Date(Date.now() - 86400000).toISOString(), total: 76, status: "delivered", order_type: "takeaway",
      customer_name: "توائي النفار", delivery_address: "فرع الرجال",
      items: [
        { id: 3, item_name: "فرع دجاج مبهرة", item_name_ar: "فرع دجاج مبهرة", quantity: 1, price: 42, total: 42 },
        { id: 4, item_name: "كاتل باندنشز", item_name_ar: "كاتل باندنشز", quantity: 1, price: 34, total: 34 },
      ],
    },
    {
      id: 1010, order_number: "1010", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), total: 300, status: "delivered", order_type: "delivery",
      customer_name: "توائي النفار", delivery_address: "توصيل للمنزل",
      items: [
        { id: 5, item_name: "شاورما بالدجاج", item_name_ar: "شاورما بالدجاج", quantity: 5, price: 60, total: 300 },
      ],
    },
    {
      id: 1009, order_number: "1009", created_at: new Date(Date.now() - 86400000 * 5).toISOString(), total: 60, status: "delivered", order_type: "takeaway",
      customer_name: "توائي النفار", delivery_address: "فرع خان يونس",
      items: [
        { id: 6, item_name: "كبه لبن", item_name_ar: "كبه لبن", quantity: 2, price: 30, total: 60 },
      ],
    },
    {
      id: 1008, order_number: "1008", created_at: new Date(Date.now() - 86400000 * 10).toISOString(), total: 120, status: "delivered", order_type: "takeaway",
      customer_name: "توائي النفار", delivery_address: "فرع غزة - الشجاعية",
      items: [
        { id: 7, item_name: "كابتن", item_name_ar: "كابتن", quantity: 1, price: 65, total: 65 },
        { id: 8, item_name: "شاورما دجاج", item_name_ar: "شاورما دجاج", quantity: 1, price: 55, total: 55 },
      ],
    },
  ]);

  // ── Order Ratings ──
  const [serviceRatings, setServiceRatings] = useState<Record<number, number>>({});
  const [deliveryRatings, setDeliveryRatings] = useState<Record<number, number>>({});

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
        toast.info("لم يتم العثور على العميل", "يمكنك حفظ بيانات جديدة");
      }
    } catch {
      setCustomer(null);
    } finally {
      setCustomerLoading(false);
    }
  };

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
    try {
      const res = await api.get(`/call-center/customers/${customerId}/favorites`);
      setFavorites(res.data?.data || res.data || []);
    } catch {
      setFavorites([]);
    }
  };

  const loadMenuItems = async () => {
    setMenuLoading(true);
    try {
      const res = await api.get("/menu", { params: { branch_id: 1 } });
      const data = res.data?.data || res.data || [];
      const items: MenuItem[] = [];
      if (Array.isArray(data)) {
        data.forEach((cat: any) => {
          if (cat.items) {
            cat.items.forEach((item: any) => {
              items.push({
                id: item.id,
                name: item.name,
                name_ar: item.name_ar,
                price: item.price,
                category: cat.name,
                image: item.image,
                is_available: item.is_available !== false,
                code: item.code,
              });
            });
          }
        });
      }
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
    } else {
      setCart(prev => {
        const found = prev.find(c => c.id === fav.item_id);
        if (found) {
          return prev.map(c => c.id === fav.item_id ? { ...c, quantity: c.quantity + 1 } : c);
        }
        return [...prev, { id: fav.item_id, name: fav.item_name, name_ar: fav.item_name_ar, price: 0, quantity: 1, notes: "" }];
      });
    }
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

  const total = Math.max(0, cartSubtotal - manualDiscount);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch = !menuSearchQuery ||
        item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
        (item.name_ar && menuSearchQuery && item.name_ar.includes(menuSearchQuery));
      return matchesCategory && matchesSearch && item.is_available;
    });
  }, [menuItems, selectedCategory, menuSearchQuery]);

  const categories = useMemo(() => ["all", ...new Set(menuItems.map(i => i.category).filter(Boolean))], [menuItems]);

  const filteredFavorites = useMemo(() => {
    if (!tabSearchQuery) return favorites;
    return favorites.filter(f => f.item_name.toLowerCase().includes(tabSearchQuery.toLowerCase()) || f.item_name_ar?.includes(tabSearchQuery));
  }, [favorites, tabSearchQuery]);

  const filteredRecentOrders = useMemo(() => {
    if (!tabSearchQuery) return recentOrders;
    return recentOrders.filter(o => o.order_number?.includes(tabSearchQuery) || o.customer_name?.includes(tabSearchQuery));
  }, [recentOrders, tabSearchQuery]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMIT ORDER
  // ═══════════════════════════════════════════════════════════════════════════

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        branch_id: 1,
        order_type: orderType,
        customer_id: customer?.id,
        customer_name: customerName || customer?.name,
        customer_phone: customerPhone || phone,
        delivery_address: customerAddress,
        note: invoiceNote,
        discount_value: discountValue || undefined,
        discount_type: discountType === "PERCENT" ? "percent" : "amount",
        payment_method: paymentMethod,
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
    <div ref={pageRef} dir="rtl" style={{ minHeight: "100%", fontFamily: typography.fontFamily.sans, display: "flex", flexDirection: "column" }}>

      {/* ══════════════════════════════════════════════════════════════════
          STICKY CUSTOMER INFO BAR — Transparent pill overlay on scroll
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="fixed top-4 left-1/2 z-50 transition-all duration-500 ease-out"
        style={{
          transform: `translateX(-50%) translateY(${isScrolled ? "0" : "-120%"})`,
          opacity: isScrolled ? 1 : 0,
          pointerEvents: isScrolled ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center gap-4 px-5 py-2.5 rounded-full backdrop-blur-xl border transition-all duration-300"
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
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300"
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
          <div className="w-px h-5" style={{ background: "rgba(226, 0, 4, 0.12)" }} />

          {/* Address */}
          <div className="flex items-center gap-1.5">
            <MapPin size={13} style={{ color: "rgba(226, 0, 4, 0.4)" }} />
            <span className="text-xs font-semibold" style={{ color: "rgba(226, 0, 4, 0.6)" }}>
              {customerAddress || "—"}
            </span>
          </div>

          {/* Loyalty */}
          {customer && (
            <>
              <div className="w-px h-5" style={{ background: "rgba(226, 0, 4, 0.12)" }} />
              <div className="flex items-center gap-1.5">
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
            {orderType === "dine_in" ? "محلي" : "فوري"}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TOP SECTION — TWO COLUMNS
          RTL: first child → RIGHT, second child → LEFT
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", gap: 16, flex: 1 }}>

        {/* ── ASIDE (RIGHT in RTL) — Customer Search + Tabs + Current Order ── */}
        <aside style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Customer Search ── */}
          <Card padding="20px">
            <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
              البحث برقم العميل
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchCustomer()}
                placeholder="أدخل رقم العميل"
                dir="ltr"
                style={{
                  flex: 1, height: 40, padding: "0 12px", fontSize: "14px",
                  border: `1px solid ${colors.border.default}`, borderRadius: radius.lg,
                  outline: "none", fontFamily: typography.fontFamily.mono,
                }}
              />
              <Button icon={<Search size={16} />} onClick={searchCustomer} loading={customerLoading}>
                بحث
              </Button>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: colors.neutral[600], marginBottom: 4 }}>
                اسم العميل
              </label>
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="اسم العميل"
                style={{ width: "100%", height: 36, padding: "0 12px", fontSize: "13px", border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, outline: "none" }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: colors.neutral[600], marginBottom: 4 }}>
                العنوان
              </label>
              <input
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                placeholder="العنوان"
                style={{ width: "100%", height: 36, padding: "0 12px", fontSize: "13px", border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button variant="primary" fullWidth icon={<Save size={14} />} onClick={saveCustomerData}>حفظ البيانات</Button>
              <Button variant="secondary" fullWidth>مزيد من التفاصيل</Button>
            </div>
          </Card>

          {/* ── Orders Tabs ── */}
          <Card padding="20px" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                الطلبات لهذا العميل
              </h2>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[
                { id: "inquiries", label: "استائشات" },
                { id: "favorites", label: "مفضلات" },
                { id: "meals", label: "وجبات" },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                  padding: "6px 14px", borderRadius: radius.full, fontSize: "12px", fontWeight: 500,
                  background: activeTab === tab.id ? colors.brand[500] : colors.neutral[100],
                  color: activeTab === tab.id ? "#fff" : colors.neutral[600],
                  border: "none", cursor: "pointer",
                }}>{tab.label}</button>
              ))}
            </div>

            <SearchInput value={tabSearchQuery} onChange={setTabSearchQuery} placeholder="بحث عن صنف :" />

            {/* Favorites Tab */}
            {activeTab === "favorites" && (
              <div style={{ flex: 1, overflowY: "auto", marginTop: 12 }}>
                <h3 style={{ fontSize: "13px", fontWeight: typography.weight.bold, color: colors.brand[500], marginBottom: 12, textAlign: "center" }}>
                  المنتجات المفضلة
                </h3>
                {filteredFavorites.length === 0 ? (
                  <p style={{ textAlign: "center", color: colors.neutral[500], fontSize: "13px" }}>لا توجد مفضلات</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filteredFavorites.map(fav => (
                      <div key={fav.item_id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px", borderRadius: radius.lg,
                        border: `1px solid ${colors.border.subtle}`, background: colors.neutral[50],
                      }}>
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 500, color: colors.neutral[800] }}>{fav.item_name_ar || fav.item_name}</p>
                          <p style={{ fontSize: "11px", color: colors.neutral[500] }}>طلبات: {fav.orders_count}</p>
                        </div>
                        <Button variant="primary" size="xs" icon={<Plus size={12} />} onClick={() => addFavoriteToCart(fav)}>
                          إضافة
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Meals/Inquiries Tab */}
            {activeTab === "meals" && (
              <div style={{ flex: 1, overflowY: "auto", marginTop: 12 }}>
                {filteredRecentOrders.length === 0 ? (
                  <p style={{ textAlign: "center", color: colors.neutral[500], fontSize: "13px", marginTop: 20 }}>لا توجد وجبات سابقة</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filteredRecentOrders.map(order => (
                      <div key={order.id} style={{
                        padding: "10px 12px", borderRadius: radius.lg,
                        border: `1px solid ${colors.border.subtle}`, background: colors.neutral[50],
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 500, color: colors.neutral[800] }}>طلب #{order.order_number}</p>
                            <p style={{ fontSize: "11px", color: colors.neutral[500] }}>{formatDate(order.created_at)}</p>
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: typography.weight.bold, color: colors.brand[500] }}>{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ── Current Order Table ── */}
          <Card padding="20px" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                جدول الطلب الحالي
              </h2>
              {cart.length > 0 && (
                <Button variant="ghost" size="xs" icon={<Trash2 size={12} />} onClick={clearCart} style={{ color: colors.semantic.error }}>تفريغ</Button>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: colors.neutral[500] }}>
                <ShoppingCart size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p style={{ fontSize: "13px" }}>السلة فارغة</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto", maxHeight: 250 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                        {["#", "الصنف", "الكمية", "السعر", "المجموع", ""].map(h => (
                          <th key={h} style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: colors.neutral[600] }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                          <td style={{ padding: "8px", color: colors.neutral[500] }}>{idx + 1}</td>
                          <td style={{ padding: "8px" }}>
                            <p style={{ fontWeight: 500, color: colors.neutral[800] }}>{item.name_ar || item.name}</p>
                            <input
                              value={item.notes || ""}
                              onChange={e => setCart(prev => prev.map(c => c.id === item.id ? { ...c, notes: e.target.value } : c))}
                              placeholder="ملاحظات"
                              style={{ width: "100%", fontSize: "11px", border: "none", background: "transparent", outline: "none", color: colors.neutral[500], marginTop: 2 }}
                            />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <button onClick={() => updateQuantity(item.id, -1)} style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${colors.border.default}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Minus size={10} />
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={e => updateCartQuantityDirect(item.id, parseInt(e.target.value) || 0)}
                                style={{ width: 36, textAlign: "center", fontWeight: 600, fontSize: "12px", border: `1px solid ${colors.border.default}`, borderRadius: 4, outline: "none" }}
                              />
                              <button onClick={() => updateQuantity(item.id, 1)} style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${colors.border.default}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Plus size={10} />
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: "8px" }}>{formatCurrency(item.price)}</td>
                          <td style={{ padding: "8px", fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</td>
                          <td style={{ padding: "8px" }}>
                            <button onClick={() => removeFromCart(item.id)} style={{ color: colors.semantic.error, background: "none", border: "none", cursor: "pointer" }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cart Summary */}
                <div style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "12px", color: colors.neutral[600] }}>الإجمالي الفرعي</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: colors.neutral[800] }}>{formatCurrency(cartSubtotal)}</span>
                  </div>
                  {manualDiscount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: colors.semantic.error }}>
                      <span style={{ fontSize: "12px" }}>الخصم</span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>-{formatCurrency(manualDiscount)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingTop: 8, borderTop: `1px solid ${colors.border.subtle}` }}>
                    <span style={{ fontSize: "14px", fontWeight: typography.weight.bold, color: colors.neutral[900] }}>الإجمالي</span>
                    <span style={{ fontSize: "18px", fontWeight: typography.weight.bold, color: colors.brand[500] }}>{formatCurrency(total)}</span>
                  </div>
                  <Button variant="primary" fullWidth size="lg" icon={submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} onClick={submitOrder} disabled={submitting || cart.length === 0}>
                    {submitting ? "جارٍ الإرسال..." : "إتمام الطلب"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </aside>

        {/* ── MAIN CONTENT (LEFT in RTL) — Chart + Orders ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* ── Last 5 Meals Chart ── */}
          <Card padding="20px">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                آخر 5 وجبة طلبت
              </h2>
              <Badge variant="brand">تتبعي</Badge>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 160 }}>
              {lastMealsChart.map((meal, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.neutral[700] }}>
                    {meal.count}
                  </span>
                  <div style={{
                    width: "100%", height: Math.max(40, (meal.count / 50) * 120),
                    background: meal.color, borderRadius: radius.lg,
                  }} />
                  <span style={{ fontSize: "10px", color: colors.neutral[600], textAlign: "center", lineHeight: 1.2 }}>
                    {meal.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Last 5 Orders ── */}
          <Card padding="20px">
            <h2 style={{ fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.neutral[900], marginBottom: 16 }}>
              آخر 5 أوردات لهذا العميل
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>
                    {["اسم المتصل", "تاريخ الطلب", "مكان الاستلام", "المبلغ الإجمالي", "عرض التفاصيل"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontWeight: typography.weight.bold, color: "#fff", background: "#16a34a", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockOrders.map(order => (
                    <React.Fragment key={order.id}>
                      <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                        <td style={{ padding: "12px", color: colors.neutral[800] }}>{order.customer_name || "—"}</td>
                        <td style={{ padding: "12px", color: colors.neutral[600] }}>{formatDate(order.created_at)}</td>
                        <td style={{ padding: "12px", color: colors.neutral[600] }}>{order.delivery_address || "—"}</td>
                        <td style={{ padding: "12px", fontWeight: typography.weight.bold, color: colors.neutral[900] }}>{formatCurrency(order.total)}</td>
                        <td style={{ padding: "12px" }}>
                          <button
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "6px 14px", borderRadius: radius.lg,
                              border: "1.5px solid #16a34a", background: "transparent",
                              color: "#16a34a", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#16a34a"; }}
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
                              margin: "8px 12px", padding: "16px", borderRadius: radius.lg,
                              border: "2px solid #16a34a", background: "#f0fdf4",
                            }}>
                              {/* Header */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <h3 style={{ fontSize: "14px", fontWeight: typography.weight.bold, color: colors.neutral[900] }}>
                                    تفاصيل الأورد #{order.order_number}
                                  </h3>
                                  <span style={{ fontSize: "11px", color: colors.neutral[500] }}>{order.customer_name}</span>
                                  <span style={{ fontSize: "11px", color: colors.neutral[500] }}>{formatDate(order.created_at)}</span>
                                  <span style={{ fontSize: "11px", color: colors.neutral[500] }}>{order.delivery_address}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: "12px", fontWeight: typography.weight.bold, color: "#16a34a" }}>{formatCurrency(order.total)}</span>
                                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: radius.full, background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
                                    {order.items.length} صنف
                                  </span>
                                </div>
                              </div>

                              {/* Items Table */}
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: 16 }}>
                                <thead>
                                  <tr>
                                    {["الصنف", "الكمية", "سعر الوحدة", "الإجمالي"].map(h => (
                                      <th key={h} style={{ padding: "8px 10px", textAlign: "right", fontWeight: typography.weight.bold, color: "#fff", background: "#16a34a", fontSize: "11px" }}>
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${colors.border.subtle}`, background: "#fff" }}>
                                      <td style={{ padding: "8px 10px", color: colors.neutral[800] }}>{item.item_name_ar || item.item_name}</td>
                                      <td style={{ padding: "8px 10px", color: colors.neutral[600] }}>{item.quantity}</td>
                                      <td style={{ padding: "8px 10px", color: colors.neutral[600] }}>{formatCurrency(item.price)}</td>
                                      <td style={{ padding: "8px 10px", fontWeight: typography.weight.bold, color: colors.neutral[800] }}>{formatCurrency(item.total || item.price * item.quantity)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* Ratings */}
                              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                {/* Service Rating */}
                                <div style={{ flex: 1, minWidth: 240, padding: "12px", borderRadius: radius.lg, background: "#fff", border: `1px solid ${colors.border.subtle}` }}>
                                  <h4 style={{ fontSize: "13px", fontWeight: typography.weight.bold, marginBottom: 6, color: colors.neutral[700] }}>
                                    تقييم الخدمة
                                  </h4>
                                  <p style={{ fontSize: "11px", color: colors.neutral[500], marginBottom: 8 }}>كائن بالأوردر #{order.order_number}</p>
                                  <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <button
                                        key={s}
                                        onClick={() => setServiceRatings(prev => ({ ...prev, [order.id]: s }))}
                                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                      >
                                        <Star
                                          size={22}
                                          color={(serviceRatings[order.id] || 0) >= s ? "#facc15" : colors.neutral[300]}
                                          fill={(serviceRatings[order.id] || 0) >= s ? "#facc15" : "none"}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                  <textarea
                                    style={{ width: "100%", height: 50, padding: 8, borderRadius: radius.lg, border: `1px solid ${colors.border.default}`, fontSize: "12px", resize: "none", outline: "none" }}
                                    placeholder="ملاحظات عن الخدمة"
                                  />
                                </div>

                                {/* Delivery Rating */}
                                <div style={{ flex: 1, minWidth: 240, padding: "12px", borderRadius: radius.lg, background: "#fff", border: `1px solid ${colors.border.subtle}` }}>
                                  <h4 style={{ fontSize: "13px", fontWeight: typography.weight.bold, marginBottom: 6, color: colors.neutral[700] }}>
                                    تقييم الدليفري
                                  </h4>
                                  <p style={{ fontSize: "11px", color: colors.neutral[500], marginBottom: 8 }}>التوصيل</p>
                                  <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <button
                                        key={s}
                                        onClick={() => setDeliveryRatings(prev => ({ ...prev, [order.id]: s }))}
                                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                      >
                                        <Star
                                          size={22}
                                          color={(deliveryRatings[order.id] || 0) >= s ? "#facc15" : colors.neutral[300]}
                                          fill={(deliveryRatings[order.id] || 0) >= s ? "#facc15" : "none"}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                  <textarea
                                    style={{ width: "100%", height: 50, padding: 8, borderRadius: radius.lg, border: `1px solid ${colors.border.default}`, fontSize: "12px", resize: "none", outline: "none" }}
                                    placeholder="ملاحظات عن الدليفري"
                                  />
                                </div>
                              </div>

                              {/* Collapse Button */}
                              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                                <button
                                  onClick={() => setExpandedOrder(null)}
                                  style={{
                                    padding: "6px 24px", borderRadius: radius.lg,
                                    border: `1px solid ${colors.neutral[300]}`, background: "#fff",
                                    color: colors.neutral[600], fontSize: "12px", fontWeight: 500, cursor: "pointer",
                                  }}
                                >
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
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BOTTOM SECTION — POS (Menu + Cart) — Dark Theme matching real POS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950 rounded-2xl mt-4 border border-white/10 flex flex-col lg:flex-row gap-0 overflow-hidden" style={{ minHeight: 500 }}>

        {/* ── LEFT: Menu Area ── */}
        <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-4">
          {/* Search Bar */}
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
            <div className="flex bg-slate-800 p-1 rounded-lg">
              <span className="text-[10px] font-black text-slate-400 px-2 py-1">{filteredItems.length} صنف</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mb-3 flex shrink-0 gap-1 overflow-x-auto custom-scrollbar py-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg whitespace-nowrap text-[8px] font-black transition-all duration-200 border ${selectedCategory === "all" ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-slate-900 text-slate-500 border-white/5 hover:bg-slate-800"}`}
            >
              <span className="text-[10px]">🍽️</span>
              <span>الكل</span>
            </button>
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg whitespace-nowrap text-[8px] font-black transition-all duration-200 border ${selectedCategory === cat ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-slate-900 text-slate-500 border-white/5 hover:bg-slate-800"}`}
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
              filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="group cursor-pointer flex flex-col gap-2"
                >
                  <div className="aspect-square relative rounded-2xl overflow-hidden bg-slate-900 border border-white/5 group-hover:border-red-600/50 transition-all duration-300 shadow-lg">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name_ar || item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black shadow-lg border border-white/10">#{item.id}</div>
                    {!item.image && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                        <Package size={32} strokeWidth={1} />
                      </div>
                    )}
                  </div>
                  <div className="px-1">
                    <h4 className="font-black text-slate-100 text-[9px] leading-tight group-hover:text-red-500 transition-colors line-clamp-2">{item.name_ar || item.name}</h4>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] font-black text-red-500">{item.price > 0 ? `${item.price.toFixed(2)} ₪` : "—"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart Panel (Dark Theme) ── */}
        <div className="w-full lg:w-[450px] xl:w-[500px] bg-slate-900 border-r border-white/10 flex flex-col overflow-hidden shrink-0">
          {/* Cart Header */}
          <div className="p-3 sm:p-4 border-b border-white/5 space-y-3 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="text-red-500" size={16} />
                <h3 className="text-xs sm:text-sm font-black text-white">تفاصيل الفاتورة</h3>
              </div>
              <div className="flex items-center gap-2">
                {customer && (
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{customer.name}</span>
                )}
                <div className="flex bg-slate-800 p-1 rounded-lg">
                  {[{ id: "takeaway" as const, label: "فوري" }, { id: "dine_in" as const, label: "محلي" }].map(type => (
                    <button
                      key={type.id}
                      className={`px-1.5 sm:px-2 py-1 text-[7px] sm:text-[8px] font-black rounded-md transition-all whitespace-nowrap ${orderType === type.id ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                      onClick={() => setOrderType(type.id)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Amount */}
            <div className="bg-red-600/10 border border-red-600/20 p-2 px-3 rounded-lg flex flex-col gap-1">
              {manualDiscount > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">الإجمالي الفرعي</span>
                    <span className="text-sm font-black text-slate-300">{cartSubtotal.toFixed(2)} ₪</span>
                  </div>
                  <div className="flex justify-between items-center text-red-500">
                    <span className="text-[8px] font-black uppercase tracking-widest">الخصم</span>
                    <span className="text-sm font-black">-{manualDiscount.toFixed(2)} ₪</span>
                  </div>
                </>
              )}
              <div className={`pt-1 mt-1 ${manualDiscount > 0 ? "border-t border-red-600/20" : ""} flex justify-between items-center`}>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{manualDiscount > 0 ? "الصافي النهائي" : "الإجمالي الكلي"}</span>
                <div className="text-left">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-red-600">{total.toFixed(2)}</span>
                  <span className="text-[11px] font-black text-red-600 mr-1">₪</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Items Table Header */}
          <div className="bg-slate-900 border-b border-white/5">
            <table className="w-full text-right border-collapse min-w-[350px]">
              <thead>
                <tr className="border-b border-white/5">
                  {["#", "الصنف", "السعر", "الكمية", "الإجمالي", ""].map((h, i) => (
                    <th key={i} className={`p-2 sm:p-3 text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ${i === 4 ? "text-left" : i === 3 ? "text-center" : ""}`}>{h}</th>
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
                <p className="text-[10px] text-slate-600">اضغط على أي صنف في المنيو لإضافته</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[350px]">
                  <tbody className="divide-y divide-white/5">
                    {cart.map((item, index) => (
                      <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                        <td className="p-2 sm:p-3 text-[8px] sm:text-[10px] font-black text-slate-600">{index + 1}</td>
                        <td className="p-2 sm:p-3">
                          <input
                            type="text"
                            value={item.notes || ""}
                            onChange={e => setCart(prev => prev.map(c => c.id === item.id ? { ...c, notes: e.target.value } : c))}
                            placeholder={item.name_ar || item.name}
                            className="w-full bg-transparent text-[10px] sm:text-xs font-black text-white outline-none border-b border-transparent focus:border-red-500/30 placeholder:text-white"
                          />
                        </td>
                        <td className="p-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold text-slate-400">{item.price.toFixed(2)}</td>
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 bg-slate-700 rounded text-[10px] font-bold text-white hover:bg-slate-600 flex items-center justify-center">-</button>
                            <input
                              type="text"
                              value={item.quantity}
                              onChange={e => { const val = parseInt(e.target.value); if (!isNaN(val)) updateCartQuantityDirect(item.id, val); }}
                              className="w-8 bg-transparent text-center text-[10px] sm:text-xs font-black text-white outline-none"
                            />
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 bg-slate-700 rounded text-[10px] font-bold text-white hover:bg-slate-600 flex items-center justify-center">+</button>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-left">
                          <span className="text-[10px] sm:text-xs font-black text-red-500">{(item.price * item.quantity).toFixed(2)}</span>
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
            {/* Note & Discount */}
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
                <div className="flex items-center gap-1 text-slate-500 shrink-0">
                  <span className="text-[8px] font-black uppercase tracking-widest">الملاحظة</span>
                </div>
                <textarea value={invoiceNote} onChange={e => setInvoiceNote(e.target.value)} placeholder="..." className="w-full bg-transparent text-[9px] sm:text-[10px] font-black outline-none text-white placeholder:text-slate-700 h-12 sm:h-16 resize-none" />
              </div>
              <div className="w-28 sm:w-32 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 flex flex-col gap-0.5">
                <div className="flex items-center gap-1 text-slate-500 shrink-0">
                  <span className="text-[8px] font-black uppercase tracking-widest">الخصم</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={discountValue || ""}
                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="flex-1 min-w-0 bg-transparent text-center text-[10px] sm:text-xs font-black text-white outline-none"
                  />
                  <button onClick={() => setDiscountType(discountType === "AMOUNT" ? "PERCENT" : "AMOUNT")} className="text-[9px] font-black text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded hover:text-slate-200 transition-colors">
                    {discountType === "AMOUNT" ? "₪" : "%"}
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="flex gap-1.5 pt-1">
              {[{ id: "cash", label: "💵 نقداً" }, { id: "card", label: "💳 بطاقة" }, { id: "wallet", label: "📱 محفظة" }].map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`flex-1 py-2 text-[9px] sm:text-[10px] font-black rounded-lg transition-all ${paymentMethod === pm.id ? "bg-red-600 text-white shadow-lg shadow-red-900/30" : "bg-slate-800 text-slate-500 hover:text-slate-300 border border-white/5"}`}
                >
                  {pm.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => { if (cart.length === 0) return; submitOrder(); }}
                disabled={cart.length === 0 || submitting}
                className="py-2.5 sm:py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-slate-700 disabled:opacity-30 transition-all active:scale-95"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                حفظ
              </button>
              <button
                onClick={() => { if (cart.length === 0) return; submitOrder(); }}
                disabled={cart.length === 0 || submitting}
                className="py-2.5 sm:py-3 bg-red-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 hover:bg-red-700 shadow-xl shadow-red-900/20 disabled:opacity-30 transition-all active:scale-95"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {submitting ? "جارٍ الإرسال..." : "تنفيذ"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
