import { create } from "zustand";

// ============================================================================
// CALL CENTER STORE — Central state management
// ============================================================================

export type CallPhase = "idle" | "ringing" | "connected" | "on_hold" | "ended";
export type CustomerStatus = "loading" | "found" | "multiple" | "not_found" | "error";
export type OrderMode = "delivery" | "takeaway";
export type WorkspaceTab = "products" | "order" | "customer" | "history";

export interface CallerInfo {
  callId: string;
  number: string;
  name?: string;
  extension?: string;
  ip?: string;
  destination?: string;
  photo?: string;
  startedAt: Date;
}

export interface CustomerInfo {
  id: number;
  name: string;
  phone: string;
  mobile?: string;
  code: string;
  category?: string;
  loyaltyPoints?: number;
  totalOrders?: number;
  avgOrderValue?: number;
  availableCredit?: number;
  addresses?: CustomerAddress[];
  favorites?: FavoriteItem[];
  lastOrder?: any;
}

export interface CustomerAddress {
  id: number;
  label: string;
  city: string;
  area: string;
  district?: string;
  street?: string;
  landmark?: string;
  buildingNo?: string;
  floor?: string;
  apartment?: string;
  deliveryNotes?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface FavoriteItem {
  itemId: number;
  itemName: string;
  itemNameAr?: string;
  ordersCount: number;
  quantitySum: number;
  totalSpent: number;
}

export interface CartItem {
  uniqueId: string;
  itemId: number;
  name: string;
  nameAr?: string;
  price: number;
  quantity: number;
  notes?: string;
  departmentId?: number;
}

export interface PaymentEntry {
  method: string;
  amount: number;
  reference?: string;
  entityType?: string;
  entityId?: number;
}

export interface DeliveryQuote {
  quoteId: number;
  zoneId: number;
  zoneName: string;
  fee: number;
  etaMinutes: number;
  validUntil: string;
}

export interface CallTicket {
  id: number;
  externalCallId?: string;
  branchId?: number;
  customerId?: number;
  agentId?: number;
  linkedOrderId?: number;
  incomingPhone: string;
  normalizedPhone: string;
  status: string;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface CallCenterState {
  // ── Call State ──
  phase: CallPhase;
  caller: CallerInfo | null;
  duration: number;
  isOnHold: boolean;

  // ── Customer State ──
  customerStatus: CustomerStatus;
  customer: CustomerInfo | null;
  candidates: CustomerInfo[];
  selectedAddress: CustomerAddress | null;

  // ── Order State ──
  orderMode: OrderMode;
  branchId: number;
  cart: CartItem[];
  payments: PaymentEntry[];
  discount: number;
  note: string;
  deliveryQuote: DeliveryQuote | null;
  deliveryLoading: boolean;
  deliveryError: string;

  // ── Ticket State ──
  ticket: CallTicket | null;
  ticketLoading: boolean;
  ticketError: string | null;

  // ── UI State ──
  activeTab: WorkspaceTab;
  customerPaneOpen: boolean;
  profileDrawerOpen: boolean;
  sidebarCollapsed: boolean;
  toasts: ToastMessage[];

  // ── Actions ──
  startCall: (callId: string, number: string, name?: string) => void;
  answerCall: () => void;
  holdCall: () => void;
  endCall: () => void;
  setCaller: (caller: CallerInfo) => void;
  setDuration: (duration: number) => void;

  setCustomer: (customer: CustomerInfo | null) => void;
  setCustomerStatus: (status: CustomerStatus) => void;
  setCandidates: (candidates: CustomerInfo[]) => void;
  selectAddress: (address: CustomerAddress | null) => void;

  setOrderMode: (mode: OrderMode) => void;
  setBranchId: (id: number) => void;
  addToCart: (item: Omit<CartItem, "uniqueId">) => void;
  updateCartItem: (uniqueId: string, patch: Partial<CartItem>) => void;
  removeFromCart: (uniqueId: string) => void;
  clearCart: () => void;
  setPayments: (payments: PaymentEntry[]) => void;
  addPayment: (payment: PaymentEntry) => void;
  removePayment: (index: number) => void;
  setDiscount: (discount: number) => void;
  setNote: (note: string) => void;
  setDeliveryQuote: (quote: DeliveryQuote | null) => void;
  setDeliveryLoading: (loading: boolean) => void;
  setDeliveryError: (error: string) => void;

  setTicket: (ticket: CallTicket | null) => void;
  setTicketLoading: (loading: boolean) => void;
  setTicketError: (error: string | null) => void;

  setActiveTab: (tab: WorkspaceTab) => void;
  toggleCustomerPane: () => void;
  setProfileDrawerOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;

  // ── Computed ──
  subtotal: () => number;
  total: () => number;
  totalPaid: () => number;
  remaining: () => number;
  itemCount: () => number;

  // ── Reset ──
  resetCall: () => void;
  resetAll: () => void;
}

let toastCounter = 0;
let cartCounter = 0;

export const useCallCenterStore = create<CallCenterState>((set, get) => ({
  // ── Initial State ──
  phase: "idle",
  caller: null,
  duration: 0,
  isOnHold: false,

  customerStatus: "loading",
  customer: null,
  candidates: [],
  selectedAddress: null,

  orderMode: "delivery",
  branchId: 0,
  cart: [],
  payments: [],
  discount: 0,
  note: "",
  deliveryQuote: null,
  deliveryLoading: false,
  deliveryError: "",

  ticket: null,
  ticketLoading: false,
  ticketError: null,

  activeTab: "products",
  customerPaneOpen: true,
  profileDrawerOpen: false,
  sidebarCollapsed: false,
  toasts: [],

  // ── Call Actions ──
  startCall: (callId, number, name) => set({
    phase: "ringing",
    caller: { callId, number, name, startedAt: new Date() },
    duration: 0,
    isOnHold: false,
  }),

  answerCall: () => set({ phase: "connected", duration: 0 }),
  holdCall: () => set(s => ({ isOnHold: !s.isOnHold, phase: s.isOnHold ? "connected" : "on_hold" })),
  endCall: () => set({ phase: "ended", duration: 0 }),
  setCaller: (caller) => set({ caller }),
  setDuration: (duration) => set({ duration }),

  // ── Customer Actions ──
  setCustomer: (customer) => set({ customer, customerStatus: customer ? "found" : "not_found" }),
  setCustomerStatus: (status) => set({ customerStatus: status }),
  setCandidates: (candidates) => set({ candidates, customerStatus: candidates.length > 0 ? "multiple" : "not_found" }),
  selectAddress: (address) => set({ selectedAddress: address }),

  // ── Order Actions ──
  setOrderMode: (orderMode) => set({ orderMode }),
  setBranchId: (branchId) => set({ branchId }),

  addToCart: (item) => set(s => {
    const existing = s.cart.find(c => c.itemId === item.itemId && c.price === item.price);
    if (existing) {
      return { cart: s.cart.map(c => c.uniqueId === existing.uniqueId ? { ...c, quantity: c.quantity + (item.quantity || 1) } : c) };
    }
    cartCounter++;
    return { cart: [...s.cart, { ...item, uniqueId: `cart_${cartCounter}_${Date.now()}`, quantity: item.quantity || 1 }] };
  }),

  updateCartItem: (uniqueId, patch) => set(s => ({
    cart: s.cart.map(c => c.uniqueId === uniqueId ? { ...c, ...patch } : c),
  })),

  removeFromCart: (uniqueId) => set(s => ({
    cart: s.cart.filter(c => c.uniqueId !== uniqueId),
  })),

  clearCart: () => set({ cart: [], payments: [], discount: 0, note: "" }),

  setPayments: (payments) => set({ payments }),
  addPayment: (payment) => set(s => ({ payments: [...s.payments, payment] })),
  removePayment: (index) => set(s => ({ payments: s.payments.filter((_, i) => i !== index) })),
  setDiscount: (discount) => set({ discount }),
  setNote: (note) => set({ note }),
  setDeliveryQuote: (deliveryQuote) => set({ deliveryQuote }),
  setDeliveryLoading: (deliveryLoading) => set({ deliveryLoading }),
  setDeliveryError: (deliveryError) => set({ deliveryError }),

  // ── Ticket Actions ──
  setTicket: (ticket) => set({ ticket }),
  setTicketLoading: (ticketLoading) => set({ ticketLoading }),
  setTicketError: (ticketError) => set({ ticketError }),

  // ── UI Actions ──
  setActiveTab: (activeTab) => set({ activeTab }),
  toggleCustomerPane: () => set(s => ({ customerPaneOpen: !s.customerPaneOpen })),
  setProfileDrawerOpen: (profileDrawerOpen) => set({ profileDrawerOpen }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  addToast: (toast) => {
    toastCounter++;
    const id = `toast_${toastCounter}`;
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Computed ──
  subtotal: () => get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  total: () => {
    const s = get();
    const sub = s.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = s.orderMode === "delivery" ? (s.deliveryQuote?.fee || 0) : 0;
    return Math.max(0, sub - s.discount + deliveryFee);
  },
  totalPaid: () => get().payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
  remaining: () => Math.max(0, get().total() - get().totalPaid()),
  itemCount: () => get().cart.reduce((sum, item) => sum + item.quantity, 0),

  // ── Reset ──
  resetCall: () => set({
    phase: "idle",
    caller: null,
    duration: 0,
    isOnHold: false,
    customer: null,
    customerStatus: "loading",
    candidates: [],
    selectedAddress: null,
    ticket: null,
    ticketLoading: false,
    ticketError: null,
  }),

  resetAll: () => {
    cartCounter = 0;
    set({
      phase: "idle",
      caller: null,
      duration: 0,
      isOnHold: false,
      customer: null,
      customerStatus: "loading",
      candidates: [],
      selectedAddress: null,
      orderMode: "delivery",
      cart: [],
      payments: [],
      discount: 0,
      note: "",
      deliveryQuote: null,
      deliveryLoading: false,
      deliveryError: "",
      ticket: null,
      ticketLoading: false,
      ticketError: null,
      activeTab: "products",
      profileDrawerOpen: false,
    });
  },
}));
