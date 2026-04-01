
export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ON_DELIVERY = 'ON_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED',
  COMPLETED = 'COMPLETED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  COLLECTED = 'COLLECTED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  WALLET = 'WALLET',
  QR = 'QR',
  ONLINE = 'ONLINE'
}

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  type: 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'BONUS';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  description: string;
}

export interface SavedCard {
  id: string;
  brand: 'VISA' | 'MASTERCARD';
  last4: string;
  expiry: string;
}

export interface MenuItem {
  id: string;
  name: string;
  nameAr: string;
  shortName?: string;
  code: string; // SKU
  price: number; // Base price
  dineInPrice?: number;
  takeawayPrice?: number;
  deliveryPrice?: number;
  offerPrice?: number;
  offerStartDate?: Date;
  offerEndDate?: Date;
  category: string;
  image: string;
  description?: string;
  descriptionAr?: string;
  prepTime: number; // in minutes
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'OUT_OF_STOCK';
  displayOrder: number;
  requiresKitchen: boolean;
  barcode?: string;
  kitchenNotes?: string;
  popular?: boolean;
  chefRecommended?: boolean;
  seasonal?: { startDate: Date; endDate: Date };
  visibility: { pos: boolean; qrMenu: boolean; delivery: boolean };
  dietary?: { vegan?: boolean; glutenFree?: boolean; spicyLevel?: number };
  sizes?: { id: string; name: string; price: number }[];
  addons?: { id: string; name: string; price: number; maxQuantity?: number }[];
  removals?: string[]; // Ingredients that can be removed
  isCombo?: boolean;
  comboItems?: { itemId: string; quantity: number }[];
  departmentId: string; // Required
  stats?: { salesCount: number; totalRevenue: number; lastSoldAt?: Date };
}

export interface OrderItem {
  itemId: string;
  uniqueId: string;
  name: string;
  quantity: number;
  price: number; 
  basePrice: number;
  departmentId?: string;
  status?: OrderStatus;
  preparedAt?: Date;
  size?: string;
  addons?: string[];
  note?: string;
}

export interface OrderTimeline {
  status: OrderStatus;
  time: Date;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  tableId?: string;
  branchId?: string;
  customerId?: string;
  waiterId?: string;
  createdAt: Date;
  subtotal: number;
  tax: number;
  deliveryFee?: number;
  discount: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  paymentMethod?: PaymentMethod;
  timeline: OrderTimeline[];
  deliveryInfo?: {
    address: string;
    driverName?: string;
    driverPhone?: string;
    eta: string;
  };
  shelfLocation?: string;
  cancelReason?: string;
  refundedAmount?: number;
  guestCount?: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  managerId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Department {
  id: string;
  name: string;
  nameAr: string;
  shortName?: string;
  description?: string;
  parentId?: string;
  branchId: string;
  icon?: string;
  color?: string;
  stationNumber?: string;
  location?: string;
  hasKds: boolean;
  kdsScreenId?: string;
  kdsDeviceName?: string;
  defaultPrepTime: number; // in minutes
  type: 'MAIN_KITCHEN' | 'FAST_FOOD' | 'BAR' | 'COLD_PREP' | 'BAKERY' | 'DESSERT';
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BUSY';
  maxConcurrentOrders: number;
  priority: number;
  autoPrintTicket: boolean;
  notifications: {
    sound: boolean;
    flash: boolean;
    push: boolean;
  };
  orderTypeVisibility: OrderType[];
  requiresAssembly: boolean;
}

export interface JobTitle {
  id: string;
  name: string;
  departmentIds: string[];
  description?: string;
}

export interface JobType {
  id: string;
  name: string;
  description?: string;
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
  SUSPENDED = 'SUSPENDED',
  RESIGNED = 'RESIGNED'
}

export interface Employee {
  id: string;
  employeeId: string; // EMP-102
  name: string;
  phone: string;
  email: string;
  address: string;
  nationalId: string;
  dob: Date;
  image?: string;
  jobTitleId: string;
  departmentId: string;
  branchId: string;
  typeId: string;
  managerId?: string;
  hireDate: Date;
  salary: number;
  status: EmployeeStatus;
  role: 'CASHIER' | 'WAITER' | 'MANAGER' | 'ADMIN' | 'BRANCH_MANAGER' | 'HOSPITALITY' | 'KITCHEN' | 'DEPARTMENT_STAFF' | 'ORDER_AGGREGATOR' | 'FINANCE' | 'HEAD_CHEF' | 'COOK';
  username?: string;
  password?: string;
  pin?: string; // 4 digits
  permissions: string[];
  notes?: string;
  rating?: number;
  performance?: {
    ordersServed: number;
    totalSales: number;
    hoursWorked: number;
  };
}

export enum CustomerType {
  REGULAR = 'REGULAR',
  LOYAL = 'LOYAL',
  VIP = 'VIP',
  COMPANY = 'COMPANY',
  EMPLOYEE = 'EMPLOYEE',
  SUPPLIER = 'SUPPLIER'
}

export interface CustomerAddress {
  id: string;
  label: string; // Home, Work, etc.
  city: string;
  district: string;
  street: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  type: CustomerType;
  points: number;
  totalSpent: number;
  ordersCount: number;
  balance: number; // For credit
  allowCredit: boolean;
  isBlocked: boolean;
  addresses: CustomerAddress[];
  rating: number;
  notes?: string;
  lastVisit?: Date;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'CASHIER' | 'CUSTOMER' | 'WAITER' | 'BRANCH_MANAGER' | 'HOSPITALITY' | 'KITCHEN' | 'DEPARTMENT_STAFF' | 'ORDER_AGGREGATOR' | 'FINANCE' | 'ADMIN' | 'HEAD_CHEF' | 'COOK';
  branchId?: string;
  departmentId?: string;
  points: number;
  balance: number;
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  vouchers: any[];
  favorites: string[];
  addresses: any[];
  transactions: Transaction[];
  savedCards: SavedCard[];
  commissionRate?: number;
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING'
}

export interface Hall {
  id: string;
  name: string;
}

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  capacity: number;
  hallId: string;
  currentOrderId?: string;
  seatedAt?: Date;
  guestCount?: number;
  mergedWithId?: string;
  reservationName?: string;
  reservationTime?: string;
  position: { x: number; y: number };
}

export enum FinancialTransactionType {
  SALE = 'SALE',             // مبيعات
  EXPENSE = 'EXPENSE',       // مصروفات
  WITHDRAWAL = 'WITHDRAWAL', // سحوبات (مدير)
  DEPOSIT = 'DEPOSIT',       // إيداع (توريد)
  REFUND = 'REFUND',         // مرتجع
  CASH_DROP = 'CASH_DROP',   // توريد للبنك/الإدارة
  VOID = 'VOID'              // إلغاء فاتورة
}

export interface FinancialTransaction {
  id: string;
  shiftId: string;
  cashierId: string;
  type: FinancialTransactionType;
  amount: number;
  reason: string;
  timestamp: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  attachment?: string; // Optional image/receipt
}

export interface CustomerFeedback {
  id: string;
  orderId?: string;
  customerId?: string;
  customerName: string;
  type: 'COMPLAINT' | 'SUGGESTION' | 'COMPLIMENT';
  category: 'FOOD' | 'SERVICE' | 'CLEANLINESS' | 'ATMOSPHERE' | 'OTHER';
  rating: number; // 1-5
  comment: string;
  status: 'NEW' | 'REVIEWED' | 'RESOLVED';
  timestamp: Date;
}

export interface StaffTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // Employee ID
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: Date;
}

export interface TableAssignment {
  tableId: string;
  staffId: string; // Employee ID (Captain/Waiter)
  shiftId: string;
}

export interface Shift {
  id: string;
  cashierId: string;
  startTime: Date;
  endTime?: Date;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  totalSales?: number;
  totalExpenses?: number;
  totalWithdrawals?: number;
  status: 'OPEN' | 'CLOSED';
  type: 'MORNING' | 'EVENING' | 'NIGHT';
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  note?: string;
}

export interface WorkSchedule {
  id: string;
  employeeId: string;
  branchId: string;
  departmentId: string;
  shiftId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "08:00"
  endTime: string;   // "16:00"
}

export interface ActivityLog {
  id: string;
  employeeId: string;
  action: string; // "Created Order #1025"
  timestamp: Date;
  details?: any;
}
