import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useApp } from "../../../../store";
import { useMenu, type MenuItem } from "../../../hooks/useMenu";
import { useCallCenterCart } from "../../../hooks/useCallCenterCart";
import { callCenterService } from "../services/callCenterService";
import type {
  CustomerSearchResult, CustomerFullProfile, OrderDetail, CustomerOccasion,
} from "../services/callCenterService";
import { toast } from "../../shared/Toast";

// ============================================================================
// DESIGN TOKENS — matches the approved Call Center prototype exactly
// ============================================================================

const c = {
  primary: "oklch(0.58 0.19 30)",
  primaryDark: "oklch(0.48 0.19 30)",
  accent: "oklch(0.7 0.16 55)",
  pageBg: "oklch(0.97 0.008 60)",
  cardBg: "#ffffff",
  borderSoft: "oklch(0.91 0.01 60)",
  borderInput: "oklch(0.88 0.01 60)",
  textMuted: "oklch(0.5 0.01 60)",
  textBody: "oklch(0.4 0.01 60)",
  textStrong: "oklch(0.22 0.01 60)",
  barDark: "oklch(0.2 0.02 30)",
  barDarkMuted: "oklch(0.75 0.02 30)",
  barDarkText2: "oklch(0.85 0.02 30)",
  ok: "oklch(0.6 0.15 145)",
  okBg: "oklch(0.94 0.05 145)",
  okText: "oklch(0.4 0.1 150)",
  partialBg: "oklch(0.95 0.05 70)",
  partialText: "oklch(0.5 0.1 70)",
  badBg: "oklch(0.94 0.05 25)",
  badText: "oklch(0.5 0.15 25)",
  star: "oklch(0.75 0.16 70)",
  starOff: "oklch(0.88 0.01 60)",
  inputBg: "oklch(0.98 0.005 60)",
  chipBg: "oklch(0.96 0.005 60)",
};

// ============================================================================
// HELPERS
// ============================================================================

const money = (v: number) => `${(Number(v) || 0).toFixed(2)}`;
const initials = (name: string) => name.trim().slice(0, 2);

// Single source of truth for validating discount/payment amounts: rejects
// negative, NaN, and empty input (→ 0) and optionally caps at `max`. Every
// place that sets discount or a payment amount routes through this so the
// invoice math can never go negative or show NaN.
const clampAmount = (raw: string | number | null | undefined, max?: number): number => {
  if (raw === "" || raw === null || raw === undefined) return 0;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (max != null && n > max) return max;
  return n;
};
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
};

const PREF_TAGS = ["بدون بصل", "بدون مخلل", "حار", "صوص إضافي"];
const SIZE_OPTIONS = ["عادي", "كبير"];
const EXTRA_OPTIONS = ["جبنة", "بطاطا", "صوص ثاوزند"];
const REMOVE_OPTIONS = ["بدون بصل", "بدون مخلل"];

const StatusBadge: React.FC<{ ok: boolean; children: React.ReactNode }> = ({ ok, children }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: ok ? c.okBg : c.badBg, color: ok ? c.okText : c.badText, flexShrink: 0 }}>{children}</span>
);

const Stars: React.FC<{ value: number | null | undefined; size?: number }> = ({ value, size = 14 }) => {
  if (value == null) return <span style={{ fontSize: 12, color: c.textMuted }}>—</span>;
  const rounded = Math.round(value);
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: size, color: i <= rounded ? c.star : c.starOff }}>★</span>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CallCenterDashboard: React.FC = () => {
  const { currentUser } = useApp();
  // useMenu resolves the branch id itself (localStorage → /auth/me fallback) and
  // keeps resolving asynchronously — read its value back instead of freezing our
  // own snapshot, or a slow/missing localStorage entry permanently blocks checkout.
  const menu = useMenu();
  const branchId = menu.branchId || 0;
  const cart = useCallCenterCart();

  // ── Customer ──
  const [phoneQuery, setPhoneQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [customer, setCustomer] = useState<CustomerSearchResult | null>(null);
  const [profile, setProfile] = useState<CustomerFullProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [occasion, setOccasion] = useState<CustomerOccasion | null>(null);
  const [favorites, setFavorites] = useState<{ item_id: number; name: string; count: number }[]>([]);
  const [newForm, setNewForm] = useState({ name: "", phone: "" });
  const [creating, setCreating] = useState(false);

  // ── Preferences / notes ──
  const [activePrefTags, setActivePrefTags] = useState<Record<string, boolean>>({});
  const [customerNotes, setCustomerNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // ── Orders modal ──
  const [modalOrder, setModalOrder] = useState<OrderDetail | null>(null);

  // ── Menu / catalog ──
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [itemSearch, setItemSearch] = useState("");

  // ── Customize modal ──
  const [customizeItem, setCustomizeItem] = useState<MenuItem | null>(null);
  const [customizeSize, setCustomizeSize] = useState(SIZE_OPTIONS[0]);
  const [customizeExtras, setCustomizeExtras] = useState<Record<string, boolean>>({});
  const [customizeRemovals, setCustomizeRemovals] = useState<Record<string, boolean>>({});
  const [customizeQty, setCustomizeQty] = useState(1);

  // ── Payment / checkout ──
  const [discount, setDiscount] = useState(0);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [cashPaid, setCashPaid] = useState("");
  const [cardPaid, setCardPaid] = useState("");
  const [cashFocused, setCashFocused] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const itemSearchRef = useRef<HTMLInputElement>(null);

  // ── Computed ──
  const defaultAddress = profile?.addresses.find((a) => a.is_default) ?? profile?.addresses[0];
  const orderType: "delivery" | "takeaway" = defaultAddress ? "delivery" : "takeaway";
  const subtotal = cart.subtotal;
  const total = Math.max(0, subtotal - discount + (orderType === "delivery" ? deliveryFee : 0));
  const cashNum = clampAmount(cashPaid);
  const cardNum = clampAmount(cardPaid);
  const totalPaid = cashNum + cardNum;
  const diff = total - totalPaid;
  const fullyPaid = diff <= 0 && total > 0;
  const dueLabel = fullyPaid ? "الباقي للعميل" : "المتبقي على العميل";
  const dueAmount = Math.abs(diff);

  const categories = useMemo(() => ["الكل", ...menu.categories.map((cat) => cat.name_ar || cat.name)], [menu.categories]);
  const filteredItems = useMemo(() => {
    let items = activeCategory === "الكل"
      ? menu.allItems
      : (menu.categories.find((cat) => (cat.name_ar || cat.name) === activeCategory)?.items ?? []);
    const q = itemSearch.trim().toLowerCase();
    if (q) items = items.filter((i) => i.name.toLowerCase().includes(q) || i.name_ar.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q));
    return items;
  }, [menu.allItems, menu.categories, activeCategory, itemSearch]);

  // ── Keyboard shortcuts ──
  const confirmRef = useRef<() => void>(() => {});
  const modalOpenRef = useRef(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); phoneInputRef.current?.focus(); }
      else if (meta && e.key.toLowerCase() === "p") { e.preventDefault(); itemSearchRef.current?.focus(); }
      else if (e.key === "Escape") { setModalOrder(null); setCustomizeItem(null); }
      // Ctrl+Enter only confirms the order when no modal is covering the screen —
      // otherwise it would submit the invoice while the agent is mid-customization.
      else if (meta && e.key === "Enter" && !modalOpenRef.current) { e.preventDefault(); confirmRef.current(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Load customer profile, favorites, occasion ──
  const loadCustomerExtras = useCallback(async (id: number) => {
    setProfileLoading(true);
    try {
      const [profileRes, favRes, occRes] = await Promise.allSettled([
        callCenterService.getCustomerFullProfile(id),
        callCenterService.getCustomerFavorites(id),
        callCenterService.getOccasionsByRange("week", id),
      ]);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value.data);
      if (favRes.status === "fulfilled") {
        setFavorites(favRes.value.data.slice(0, 5).map((f) => ({ item_id: f.item_id, name: f.item_name_ar || f.item_name, count: f.order_count })));
      }
      if (occRes.status === "fulfilled" && occRes.value.data.length > 0) setOccasion(occRes.value.data[0]);
      else setOccasion(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customer?.id) void loadCustomerExtras(customer.id);
  }, [customer?.id, loadCustomerExtras]);

  // clear a stale delivery fee if the order type flips back to takeaway
  useEffect(() => {
    if (orderType === "takeaway" && deliveryFee !== 0) setDeliveryFee(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  // keep 0 <= discount <= subtotal even after the input step — e.g. an item
  // gets removed from the cart after a discount was already set, or the cart
  // empties out entirely (subtotal = 0 must force discount back to 0).
  useEffect(() => {
    if (discount > subtotal) {
      setDiscount(subtotal);
      setDiscountError(subtotal > 0 ? `تم تعديل الخصم تلقائياً ليطابق المجموع الفرعي الحالي (₪${money(subtotal)})` : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  // ── Customer search ──
  const selectCustomer = (result: CustomerSearchResult) => {
    setCustomer(result);
    setSearchResults([]);
    setCustomerNotes("");
    setActivePrefTags({});
    setDeliveryFee(0);
  };

  // Uses the same normalized phone-matching endpoint the live-call workspace
  // relies on (handles 059 vs +970 vs spaced formats, and looks at the real
  // customer_phones table) instead of a raw substring search — a plain LIKE
  // search on the legacy phone/mobile columns was missing customers whose
  // number was only normalized-matched, letting a "not found" search proceed
  // straight into "create new" for a phone that already belonged to someone.
  const searchCustomer = async () => {
    const q = phoneQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearched(false);
    setCustomer(null);
    setProfile(null);
    setSearchResults([]);
    try {
      const { data } = await callCenterService.resolveCustomerByPhone(q);
      if (data.status === "found" && data.customer) {
        selectCustomer(data.customer);
      } else if (data.status === "multiple") {
        setSearchResults(data.candidates);
      } else {
        setNewForm({ name: "", phone: q });
      }
      setSearched(true);
    } catch (err: unknown) {
      const message = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (message?.status === 422) {
        // PhoneNormalizer rejected the input outright (not a real phone number).
        toast.error("رقم الهاتف غير صالح", message?.data?.message || "تحقّق من صيغة الرقم وحاول مرة أخرى");
      } else {
        toast.error("تعذر البحث عن العميل");
      }
    } finally {
      setSearching(false);
    }
  };

  const createCustomer = async () => {
    if (!newForm.name.trim() || !newForm.phone.trim()) return;
    setCreating(true);
    try {
      const { data } = await callCenterService.quickCreateCustomer({ name: newForm.name, phone: newForm.phone, branch_id: branchId || undefined });
      selectCustomer(data);
      toast.success("تم إنشاء العميل", `سيُسنَد أي طلب تُنشئه الآن إلى ${data.name}`);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const validationMessage = response?.errors ? Object.values(response.errors).flat()[0] : undefined;
      const isDuplicatePhone = (validationMessage || response?.message || "").includes("مرتبط بعميل آخر");
      if (isDuplicatePhone) {
        // The phone is already registered — look it up and select the real
        // owner instead of leaving the agent stuck on a failed create.
        try {
          const { data: resolution } = await callCenterService.resolveCustomerByPhone(newForm.phone);
          if (resolution.status === "found" && resolution.customer) {
            selectCustomer(resolution.customer);
            toast.info("العميل موجود مسبقاً", `تم فتح ملف ${resolution.customer.name} بدلاً من إنشاء عميل جديد`);
            return;
          }
          if (resolution.status === "multiple") {
            setSearchResults(resolution.candidates);
            toast.info("العميل موجود مسبقاً", "اختر العميل الصحيح من القائمة");
            return;
          }
        } catch {
          // fall through to the generic error below
        }
      }
      toast.error("تعذر إنشاء العميل", validationMessage || response?.message || "تحقّق من رقم الهاتف وحاول مرة أخرى");
    } finally {
      setCreating(false);
    }
  };

  // ── Preferences / notes save ──
  const saveNotes = async () => {
    if (!customer) return;
    const tags = Object.keys(activePrefTags).filter((t) => activePrefTags[t]);
    const content = [...tags, customerNotes.trim()].filter(Boolean).join("، ");
    if (!content) return;
    setSavingNote(true);
    try {
      await callCenterService.createCustomerNote(customer.id, { content, type: "preference", show_during_order: true });
      toast.success("تم حفظ الملاحظة");
    } catch {
      toast.error("تعذر حفظ الملاحظة");
    } finally {
      setSavingNote(false);
    }
  };

  // ── Discount / payment validation ──
  // Real validation (not just the `max` HTML attribute, which typing/paste/JS
  // can bypass): rejects negative values and never lets discount exceed the
  // current subtotal, so the invoice total can never compute below zero.
  const handleDiscountChange = (raw: string) => {
    if (raw === "") { setDiscount(0); setDiscountError(null); return; }
    const n = Number(raw);
    if (!Number.isFinite(n)) { setDiscount(0); setDiscountError(null); return; }
    if (n < 0) { setDiscount(0); setDiscountError("لا يمكن أن يكون الخصم أقل من 0"); return; }
    if (n > subtotal) {
      setDiscount(subtotal);
      setDiscountError(subtotal > 0 ? `الحد الأقصى للخصم هو ₪${money(subtotal)}` : "لا يمكن إضافة خصم على فاتورة فارغة");
      return;
    }
    setDiscount(n);
    setDiscountError(null);
  };

  // Same non-negative rule for payment inputs — kept as a string sanitizer
  // (not a clamp-to-number) so decimal typing like "10." still works while
  // a typed/pasted negative number is corrected immediately.
  const sanitizePaymentInput = (raw: string): string => {
    if (raw === "") return raw;
    const n = Number(raw);
    return Number.isFinite(n) && n < 0 ? "0" : raw;
  };

  // ── Cart actions ──
  const quickAdd = (item: MenuItem) => {
    cart.addToCart(item);
    toast.success(item.name_ar || item.name, "أُضيف للفاتورة");
  };

  const addFavorite = (itemId: number) => {
    const item = menu.allItems.find((i) => i.id === itemId);
    if (item) quickAdd(item);
  };

  const openCustomize = (item: MenuItem) => {
    setCustomizeItem(item);
    setCustomizeSize(SIZE_OPTIONS[0]);
    setCustomizeExtras({});
    setCustomizeRemovals({});
    setCustomizeQty(1);
  };

  const saveCustomize = () => {
    if (!customizeItem) return;
    const extras = Object.keys(customizeExtras).filter((k) => customizeExtras[k]);
    const removals = Object.keys(customizeRemovals).filter((k) => customizeRemovals[k]);
    const parts: string[] = [];
    if (customizeSize !== SIZE_OPTIONS[0]) parts.push(customizeSize);
    extras.forEach((e) => parts.push(`+${e}`));
    removals.forEach((r) => parts.push(r));
    const label = parts.join("، ");
    cart.addToCart(customizeItem, { quantity: customizeQty, price: customizeItem.price, notes: label || undefined });
    setCustomizeItem(null);
  };

  const repeatOrderItem = (order: OrderDetail) => {
    let added = 0;
    order.items.forEach((oi) => {
      const item = menu.allItems.find((i) => i.id === oi.item_id);
      if (item) { cart.addToCart(item, { quantity: oi.quantity, price: oi.price }); added += 1; }
    });
    if (added > 0) toast.success("تمت إعادة الطلب", `أُضيف ${added} صنف للفاتورة`);
  };

  // ── Confirm order ──
  const handleConfirm = useCallback(async () => {
    if (cart.cart.length === 0 || !customer || !branchId || submitting) return;
    if (totalPaid + 0.01 < total) { toast.error("المبلغ المدفوع غير مكتمل"); return; }
    setSubmitting(true);
    try {
      const payload = {
        branch_id: branchId,
        call_center_agent_id: currentUser ? Number(currentUser.id) : undefined,
        source: "call_center" as const,
        order_type: orderType,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone || customer.mobile || "",
        customer_address_id: orderType === "delivery" ? defaultAddress?.id : undefined,
        delivery_fee: orderType === "delivery" ? deliveryFee || undefined : undefined,
        discount_value: discount || undefined,
        discount_type: "amount" as const,
        items: cart.cart.map((i) => ({ item_id: i.id, quantity: i.quantity, unit_price: i.price, notes: i.notes })),
      };
      const draft = await cart.saveDraft(payload);
      if (!draft) { toast.error("تعذر حفظ الطلب", cart.submitError || undefined); return; }
      const payments = [
        cashNum > 0 ? { method: "cash" as const, amount: cashNum } : null,
        cardNum > 0 ? { method: "card" as const, amount: cardNum } : null,
      ].filter((p): p is { method: "cash" | "card"; amount: number } => p !== null);
      const result = await cart.checkout(Number(draft.id), payments, { id: customer.id, name: customer.name, phone: (customer.phone || customer.mobile) ?? undefined });
      if (!result) { toast.error("تعذر إتمام الدفع", cart.submitError || undefined); return; }
      toast.success("تم إرسال الطلب إلى المطبخ بنجاح ✓", `رقم الطلب: ${result.order_number || result.id}`);
      cart.clearCart();
      setDiscount(0);
      setDiscountError(null);
      setDeliveryFee(0);
      setCashPaid("");
      setCardPaid("");
      if (customer.id) void loadCustomerExtras(customer.id);
    } finally {
      setSubmitting(false);
    }
  }, [cart, customer, branchId, submitting, totalPaid, total, orderType, defaultAddress, deliveryFee, currentUser, discount, cashNum, cardNum, loadCustomerExtras]);

  useEffect(() => { confirmRef.current = handleConfirm; }, [handleConfirm]);
  useEffect(() => { modalOpenRef.current = Boolean(customizeItem || modalOrder); }, [customizeItem, modalOrder]);

  // ── Render ──
  return (
    <div dir="rtl" style={{ minHeight: "100%", background: c.pageBg, color: c.textStrong, fontFamily: "'Tajawal', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ═══ Header ═══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", background: c.cardBg, borderBottom: `1px solid ${c.borderSoft}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${c.primary}, ${c.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 17, fontWeight: 800, flexShrink: 0 }}>C</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>مركز اتصال المطعم</div>
            <div style={{ fontSize: 12, color: c.textMuted }}>إدارة طلبات الهاتف بسرعة وسهولة</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: c.borderSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: c.textBody, flexShrink: 0 }}>{initials(currentUser?.name || "؟؟")}</div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{currentUser?.name || "موظف الكول سنتر"}</span>
          </div>
        </div>
      </div>

      {/* ═══ Active customer bar ═══ */}
      {customer && (
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 32px", background: c.barDark, color: "#fff", flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: c.barDarkMuted, flexShrink: 0 }}>العميل الحالي</span>
            <span style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{customer.name}</span>
          </div>
          <span style={{ fontSize: 13, color: c.barDarkText2 }} dir="ltr">{customer.phone || customer.mobile}</span>
          {profile?.addresses[0] && <span style={{ fontSize: 13, color: c.barDarkText2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{[profile.addresses[0].area, profile.addresses[0].city].filter(Boolean).join("، ")}</span>}
          {occasion && <span style={{ background: c.accent, color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999, flexShrink: 0 }}>🎁 {occasion.title}</span>}
          <span style={{ marginRight: "auto", fontSize: 12, color: c.barDarkMuted }}>Ctrl+K عميل · Ctrl+P منتج · Ctrl+Enter تأكيد</span>
        </div>
      )}

      {/* ═══ 3-column body ═══ */}
      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 18, padding: "18px 32px", alignItems: "flex-start", overflow: "auto" }}>

        {/* ── Column 1: Customer ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: "1 1 300px", minWidth: 300 }}>

          <div style={{ background: c.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${c.borderSoft}` }}>
            <div style={{ display: "flex", gap: 8, marginBottom: customer ? 14 : 0 }}>
              <input
                ref={phoneInputRef}
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchCustomer()}
                placeholder="بحث برقم الهاتف (Ctrl+K)"
                aria-label="بحث برقم هاتف العميل"
                dir="ltr"
                style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: `1px solid ${c.borderInput}`, fontSize: 14, background: c.inputBg, minWidth: 0, textAlign: "right" }}
              />
              <button onClick={searchCustomer} disabled={searching || !phoneQuery.trim()} style={{ padding: "11px 18px", borderRadius: 10, border: "none", background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0, opacity: searching ? 0.6 : 1 }}>
                {searching ? <Loader2 size={14} className="animate-spin" /> : "بحث"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {searchResults.map((r) => (
                  <button key={r.id} onClick={() => selectCustomer(r)} style={{ textAlign: "right", padding: "8px 10px", borderRadius: 10, background: c.inputBg, border: `1px solid ${c.borderSoft}`, cursor: "pointer" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: c.textMuted }} dir="ltr">{r.phone || r.mobile}</div>
                  </button>
                ))}
              </div>
            )}

            {customer ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 999, background: `${c.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: c.primaryDark, flexShrink: 0 }}>{initials(customer.name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>{customer.name}</span>
                      {customer.category === "vip" && <span style={{ background: c.accent, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, flexShrink: 0 }}>VIP</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                      {profileLoading ? <Loader2 size={12} className="animate-spin" color={c.textMuted} /> : (
                        <>
                          <Stars value={(() => {
                            const ratings = (profile?.orders ?? []).map((o) => o.feedback?.service_quality).filter((v): v is number => v != null);
                            return ratings.length ? ratings.reduce((s, v) => s + v, 0) / ratings.length : null;
                          })()} size={13} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: c.textBody, paddingTop: 10, borderTop: `1px solid ${c.pageBg}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span>📞</span><span dir="ltr">{customer.phone || customer.mobile}</span></div>
                  {profile?.addresses[0] && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span>📍</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[profile.addresses[0].area, profile.addresses[0].city, profile.addresses[0].street].filter(Boolean).join("، ")}</span></div>}
                  {occasion && <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.primaryDark, fontWeight: 700 }}><span>🎁</span><span>{occasion.title}</span></div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span>🧾</span><span>{profile?.profile.total_orders ?? 0} طلب سابق</span></div>
                </div>
              </>
            ) : searched && searchResults.length === 0 ? (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 13, color: c.textMuted, marginBottom: 10 }}>لم يتم العثور على عميل بهذا الرقم — يمكنك إنشاء عميل جديد</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="اسم العميل" aria-label="اسم العميل الجديد" style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${c.borderInput}`, fontSize: 13, background: c.inputBg }} />
                  <input value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} placeholder="رقم الهاتف" aria-label="رقم هاتف العميل الجديد" dir="ltr" style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${c.borderInput}`, fontSize: 13, background: c.inputBg, textAlign: "right" }} />
                  <button onClick={createCustomer} disabled={creating || !newForm.name.trim() || !newForm.phone.trim()} style={{ padding: "10px", borderRadius: 10, border: "none", background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: creating ? 0.6 : 1 }}>
                    {creating ? "جارٍ الإنشاء..." : "إنشاء عميل جديد"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {customer && (
            <>
              <div style={{ background: c.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${c.borderSoft}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>ملاحظات وتفضيلات العميل</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {PREF_TAGS.map((tag) => {
                    const active = !!activePrefTags[tag];
                    return (
                      <button key={tag} onClick={() => setActivePrefTags((s) => ({ ...s, [tag]: !s[tag] }))} style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${active ? "transparent" : c.borderInput}`, background: active ? c.accent : "#fff", color: active ? "#fff" : c.textBody, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="ملاحظة إضافية (اختياري)" aria-label="ملاحظة إضافية عن العميل" style={{ width: "100%", minHeight: 50, padding: "10px 12px", borderRadius: 10, border: `1px solid ${c.borderInput}`, fontSize: 13, resize: "vertical", background: c.inputBg, fontFamily: "inherit" }} />
                <button onClick={saveNotes} disabled={savingNote} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: "none", background: c.chipBg, color: c.textBody, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} حفظ الملاحظة
                </button>
              </div>

              {favorites.length > 0 && (
                <div style={{ background: c.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${c.borderSoft}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>الأكثر طلباً لهذا العميل</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {favorites.map((f) => (
                      <button key={f.item_id} onClick={() => addFavorite(f.item_id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, background: c.chipBg, border: `1px solid ${c.borderSoft}`, fontSize: 12, fontWeight: 700, color: c.textBody, cursor: "pointer" }}>
                        <span>{f.name}</span><span style={{ color: c.textMuted, fontWeight: 500 }}>×{f.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: c.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${c.borderSoft}`, maxHeight: 260, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, flexShrink: 0 }}>آخر الطلبات</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", minHeight: 0 }}>
                  {profileLoading ? (
                    [1, 2].map((i) => <div key={i} style={{ height: 52, borderRadius: 10, background: c.inputBg }} />)
                  ) : profile?.orders.length ? profile.orders.map((o) => (
                    <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: 10, border: `1px solid ${c.pageBg}`, borderRadius: 10, flexShrink: 0 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>#{o.order_number}</div>
                        <div style={{ fontSize: 11, color: c.textMuted }}>{fmtDate(o.created_at)}</div>
                      </div>
                      <StatusBadge ok={o.status === "paid" || o.status === "served"}>{o.status}</StatusBadge>
                      <div style={{ fontSize: 13, fontWeight: 800, flexShrink: 0 }}>₪{money(o.total)}</div>
                      <button onClick={() => setModalOrder(o)} style={{ border: "none", background: c.chipBg, color: c.textBody, fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 999, cursor: "pointer", flexShrink: 0 }}>تفاصيل</button>
                    </div>
                  )) : <p style={{ fontSize: 12, color: c.textMuted, textAlign: "center", padding: 12 }}>لا توجد طلبات سابقة</p>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Column 2: Menu ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: "2 1 420px", minWidth: 380, background: c.cardBg, borderRadius: 16, padding: 18, border: `1px solid ${c.borderSoft}`, maxHeight: "calc(100% - 12px)", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>الأصناف</div>
            <div style={{ fontSize: 12, color: c.textMuted }}>{filteredItems.length} من {menu.allItems.length}</div>
          </div>
          <input
            ref={itemSearchRef}
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="بحث عن صنف بالاسم أو الرمز (Ctrl+P)"
            aria-label="بحث في الأصناف"
            style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${c.borderInput}`, fontSize: 14, background: c.inputBg, flexShrink: 0, width: "100%" }}
          />
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, flexShrink: 0 }}>
            {categories.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 999, border: `1px solid ${active ? "transparent" : c.borderInput}`, background: active ? c.primary : "#fff", color: active ? "#fff" : c.textBody, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {cat}
                </button>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, overflowY: "auto", minHeight: 0, padding: 2 }}>
            {menu.loading ? (
              Array.from({ length: 9 }).map((_, i) => <div key={i} style={{ height: 120, borderRadius: 12, background: c.inputBg }} />)
            ) : filteredItems.length === 0 ? (
              <p style={{ gridColumn: "1 / -1", textAlign: "center", padding: 24, color: c.textMuted, fontSize: 13 }}>لا توجد أصناف مطابقة</p>
            ) : filteredItems.map((item) => (
              <div key={item.id} style={{ border: `1px solid ${c.borderSoft}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "oklch(0.99 0.003 60)", minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", minHeight: 34 }}>{item.name_ar || item.name}</div>
                <div style={{ fontSize: 11, color: c.textMuted }}>{item.code}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: c.textBody }}>₪{money(item.price)}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => openCustomize(item)} aria-label={`تخصيص ${item.name_ar || item.name}`} style={{ border: `1px solid ${c.borderInput}`, background: "#fff", color: c.textBody, fontSize: 11, fontWeight: 700, padding: "5px 8px", borderRadius: 8, cursor: "pointer" }}>تخصيص</button>
                    <button onClick={() => quickAdd(item)} aria-label={`إضافة سريعة ${item.name_ar || item.name}`} style={{ width: 28, height: 28, borderRadius: 999, border: "none", background: c.primary, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", lineHeight: 1 }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Column 3: Invoice ── */}
        <div style={{ display: "flex", flexDirection: "column", flex: "1 1 340px", minWidth: 320, background: c.cardBg, borderRadius: 16, border: `1px solid ${c.borderSoft}`, position: "sticky", top: 12, maxHeight: "calc(100% - 12px)", borderTop: `4px solid ${c.primary}`, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 10px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>الفاتورة الحالية</span>
              {customer && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: orderType === "delivery" ? c.okBg : c.chipBg, color: orderType === "delivery" ? c.okText : c.textBody }}>
                  {orderType === "delivery" ? "🚚 توصيل" : "🛍️ استلام"}
                </span>
              )}
            </div>
            <span style={{ background: c.pageBg, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, color: c.textBody }}>{cart.cart.reduce((s, l) => s + l.quantity, 0)} صنف</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 18px", minHeight: 0 }}>
            {cart.cart.length > 0 || orderType === "delivery" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 10 }}>
                {cart.cart.map((line) => (
                  <div key={line.uniqueId} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 0", borderBottom: `1px solid ${c.pageBg}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line.name_ar || line.name}</div>
                        {line.notes && <div style={{ fontSize: 11, color: c.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line.notes}</div>}
                      </div>
                      <button onClick={() => cart.removeFromCart(line.uniqueId)} aria-label={`حذف ${line.name_ar || line.name}`} style={{ border: "none", background: "transparent", color: c.primary, fontSize: 15, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => line.quantity <= 1 ? cart.removeFromCart(line.uniqueId) : cart.updateCartItem(line.uniqueId, { quantity: line.quantity - 1 })} aria-label="إنقاص الكمية" style={{ width: 24, height: 24, borderRadius: 8, border: `1px solid ${c.borderInput}`, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>−</button>
                        <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700, fontSize: 13 }}>{line.quantity}</span>
                        <button onClick={() => cart.updateCartItem(line.uniqueId, { quantity: line.quantity + 1 })} aria-label="زيادة الكمية" style={{ width: 24, height: 24, borderRadius: 8, border: `1px solid ${c.borderInput}`, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>+</button>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>₪{money(line.price * line.quantity)}</div>
                    </div>
                  </div>
                ))}

                {orderType === "delivery" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 0", borderBottom: `1px solid ${c.pageBg}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🚚</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>رسوم توصيل</span>
                      </div>
                      {deliveryFee > 0 && (
                        <button onClick={() => setDeliveryFee(0)} aria-label="إزالة رسوم التوصيل" style={{ border: "none", background: "transparent", color: c.primary, fontSize: 15, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                      <input
                        value={deliveryFee || ""}
                        onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        aria-label="قيمة رسوم التوصيل"
                        style={{ width: 90, textAlign: "left", padding: "5px 8px", borderRadius: 8, border: `1px solid ${c.borderInput}`, fontWeight: 700, fontSize: 13, background: "#fff" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0", color: c.textMuted, fontSize: 13 }}>لم تتم إضافة أي أصناف بعد</div>
            )}
          </div>

          <div style={{ flexShrink: 0, padding: "12px 18px 18px", borderTop: `1px solid ${c.pageBg}`, background: c.cardBg }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>الدفع</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 10, marginBottom: 10, background: c.inputBg, border: `1px solid ${c.pageBg}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>💵</span>
                <span style={{ fontSize: 12, color: c.textMuted, flex: 1 }}>نقدي مدفوع</span>
                <input value={cashPaid} onChange={(e) => setCashPaid(sanitizePaymentInput(e.target.value))} onFocus={() => setCashFocused(true)} onBlur={() => setCashFocused(false)} type="number" min={0} step="0.01" inputMode="decimal" aria-label="المبلغ النقدي المدفوع"
                  style={{ width: 110, textAlign: "left", padding: "7px 10px", borderRadius: 8, border: `2px solid ${cashFocused ? c.primary : c.borderInput}`, fontWeight: 700, background: "#fff" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>💳</span>
                <span style={{ fontSize: 12, color: c.textMuted, flex: 1 }}>بطاقة مدفوع</span>
                <input value={cardPaid} onChange={(e) => setCardPaid(sanitizePaymentInput(e.target.value))} onFocus={() => setCardFocused(true)} onBlur={() => setCardFocused(false)} type="number" min={0} step="0.01" inputMode="decimal" aria-label="المبلغ المدفوع بالبطاقة"
                  style={{ width: 110, textAlign: "left", padding: "7px 10px", borderRadius: 8, border: `2px solid ${cardFocused ? c.primary : c.borderInput}`, fontWeight: 700, background: "#fff" }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", background: c.inputBg, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: c.textMuted }}>
                <span>المجموع الفرعي</span><span>₪{money(subtotal)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: c.textMuted }}>
                <span>الخصم</span>
                <input
                  value={discount || ""}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  type="number"
                  min={0}
                  max={subtotal || undefined}
                  aria-label="قيمة الخصم"
                  aria-invalid={discountError ? true : undefined}
                  style={{ width: 80, textAlign: "left", padding: "5px 8px", borderRadius: 8, border: `1px solid ${discountError ? c.badText : c.borderInput}` }}
                />
              </div>
              {discountError && (
                <div style={{ fontSize: 11, color: c.badText, textAlign: "right" }}>{discountError}</div>
              )}
              {orderType === "delivery" && deliveryFee > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: c.textMuted }}>
                  <span>رسوم توصيل</span><span>₪{money(deliveryFee)}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 18, fontWeight: 800, paddingTop: 6, borderTop: `1px solid ${c.borderSoft}` }}>
                <span>الإجمالي</span><span style={{ color: c.primary }}>₪{money(total)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, paddingTop: 6, borderTop: `1px solid ${c.borderSoft}`, color: c.textMuted }}>
                <span>إجمالي المدفوع</span><span style={{ fontWeight: 700, color: c.textStrong }}>₪{money(totalPaid)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, fontWeight: 800 }}>
                <span>{total > 0 && diff !== 0 ? dueLabel : ""}</span>
                <span style={{ fontWeight: 800, color: fullyPaid ? (diff < 0 ? c.ok : c.textBody) : c.primary }}>{total > 0 && diff !== 0 ? `₪${money(dueAmount)}` : ""}</span>
              </div>
              {total > 0 && (
                <div style={{ fontSize: 12, fontWeight: 800, textAlign: "center", padding: 6, borderRadius: 8, marginTop: 2, background: fullyPaid ? c.okBg : c.partialBg, color: fullyPaid ? c.okText : c.partialText }}>
                  {fullyPaid ? "✓ مدفوع بالكامل" : "⚠ دفع جزئي"}
                </div>
              )}
            </div>

            {!branchId && (
              <div style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: c.badBg, color: c.badText, fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                لا يوجد فرع محدد لهذا الموظف — تعذّر إرسال الطلبات حتى يتم ضبط الفرع
              </div>
            )}
            <button
              onClick={() => void handleConfirm()}
              disabled={cart.cart.length === 0 || !customer || !branchId || submitting}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", fontSize: 14, fontWeight: 800, color: "#fff", cursor: cart.cart.length === 0 || !branchId ? "not-allowed" : "pointer", background: cart.cart.length > 0 && customer && branchId ? c.primary : c.starOff, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              تأكيد الطلب وإرسال للمطبخ (Ctrl+Enter)
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Customize modal ═══ */}
      {customizeItem && (
        <div onClick={() => setCustomizeItem(null)} style={{ position: "fixed", inset: 0, background: "oklch(0.1 0 0 / 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 55, padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "min(420px, 100%)", padding: 22 }} role="dialog" aria-modal="true" aria-label={`تخصيص ${customizeItem.name_ar || customizeItem.name}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>{customizeItem.name_ar || customizeItem.name}</div>
              <button onClick={() => setCustomizeItem(null)} aria-label="إغلاق" style={{ border: "none", background: c.chipBg, width: 28, height: 28, borderRadius: 999, fontSize: 14, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.textMuted, marginBottom: 6 }}>الحجم</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {SIZE_OPTIONS.map((sz) => {
                const active = sz === customizeSize;
                return <button key={sz} onClick={() => setCustomizeSize(sz)} style={{ flex: 1, padding: 9, borderRadius: 10, border: `1px solid ${active ? "transparent" : c.borderInput}`, background: active ? c.primary : "#fff", color: active ? "#fff" : c.textBody, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{sz}</button>;
              })}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.textMuted, marginBottom: 6 }}>إضافات</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {EXTRA_OPTIONS.map((ex) => {
                const active = !!customizeExtras[ex];
                return <button key={ex} onClick={() => setCustomizeExtras((s) => ({ ...s, [ex]: !s[ex] }))} style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${active ? "transparent" : c.borderInput}`, background: active ? c.accent : "#fff", color: active ? "#fff" : c.textBody, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{ex}</button>;
              })}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.textMuted, marginBottom: 6 }}>بدون</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {REMOVE_OPTIONS.map((rm) => {
                const active = !!customizeRemovals[rm];
                return <button key={rm} onClick={() => setCustomizeRemovals((s) => ({ ...s, [rm]: !s[rm] }))} style={{ padding: "7px 12px", borderRadius: 999, border: `1px solid ${active ? "transparent" : c.borderInput}`, background: active ? c.primaryDark : "#fff", color: active ? "#fff" : c.textBody, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{rm}</button>;
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>الكمية</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setCustomizeQty((q) => Math.max(1, q - 1))} aria-label="إنقاص الكمية" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.borderInput}`, background: "#fff", cursor: "pointer", fontWeight: 700 }}>−</button>
                <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{customizeQty}</span>
                <button onClick={() => setCustomizeQty((q) => q + 1)} aria-label="زيادة الكمية" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.borderInput}`, background: "#fff", cursor: "pointer", fontWeight: 700 }}>+</button>
              </div>
            </div>
            <button onClick={saveCustomize} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: c.primary, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>حفظ وإضافة للفاتورة</button>
          </div>
        </div>
      )}

      {/* ═══ Order details modal ═══ */}
      {modalOrder && (
        <div onClick={() => setModalOrder(null)} style={{ position: "fixed", inset: 0, background: "oklch(0.1 0 0 / 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "min(680px, 100%)", maxHeight: "85vh", overflowY: "auto", padding: 28 }} role="dialog" aria-modal="true" aria-label={`تفاصيل الطلب #${modalOrder.order_number}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>تفاصيل الطلب #{modalOrder.order_number}</div>
              <button onClick={() => setModalOrder(null)} aria-label="إغلاق" style={{ border: "none", background: c.chipBg, width: 32, height: 32, borderRadius: 999, fontSize: 16, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 24, marginBottom: 18, fontSize: 13, color: c.textMuted, flexWrap: "wrap" }}>
              <span>التاريخ: {fmtDate(modalOrder.created_at)}</span>
              <span>{modalOrder.status}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 22 }}>
              <thead>
                <tr style={{ background: c.ok, color: "#fff" }}>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, borderRadius: "8px 0 0 8px" }}>الصنف</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 13 }}>الكمية</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 13 }}>سعر الوحدة</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 13, borderRadius: "0 8px 8px 0" }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {modalOrder.items.map((mi) => (
                  <tr key={mi.id} style={{ borderBottom: `1px solid ${c.pageBg}` }}>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{mi.item_name_ar || mi.item_name}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, textAlign: "center" }}>{mi.quantity}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, textAlign: "center" }}>₪{money(mi.price)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, textAlign: "center", fontWeight: 700 }}>₪{money(mi.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ padding: 14, background: c.inputBg, borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>تقييم التوصيل</div>
                <Stars value={modalOrder.feedback?.delivery_speed} />
              </div>
              <div style={{ padding: 14, background: c.inputBg, borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>تقييم الخدمة</div>
                <Stars value={modalOrder.feedback?.service_quality} />
              </div>
            </div>
            {profile && (
              <button onClick={() => { repeatOrderItem(modalOrder); setModalOrder(null); }} style={{ marginTop: 18, width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${c.borderInput}`, background: "#fff", color: c.textBody, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                إعادة هذا الطلب للفاتورة الحالية
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CallCenterDashboard;
