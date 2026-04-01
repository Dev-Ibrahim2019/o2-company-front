
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Order, OrderType, OrderStatus, MenuItem, OrderItem, User, PaymentMethod, 
  Transaction, SavedCard, Table, Shift, Branch, Department, JobTitle, JobType, Employee,
  TableStatus, FinancialTransaction, FinancialTransactionType,
  CustomerFeedback, StaffTask, TableAssignment, Customer, CustomerType, CustomerAddress,
  EmployeeStatus, Attendance, WorkSchedule, ActivityLog
} from './types';
import { TABLES, MENU_ITEMS } from './constants';

interface AppContextType {
  activeOrders: Order[];
  currentUser: User | null;
  currentCart: OrderItem[];
  cartOrderType: OrderType;
  userRole: 'CASHIER' | 'CUSTOMER' | 'WAITER' | 'ADMIN' | 'BRANCH_MANAGER' | 'HOSPITALITY' | 'DEPARTMENT_STAFF' | 'ORDER_AGGREGATOR' | 'FINANCE' | 'HEAD_CHEF' | 'COOK' | 'EMPLOYEE' | null;
  
  branches: Branch[];
  departments: Department[];
  jobTitles: JobTitle[];
  jobTypes: JobType[];
  employees: Employee[];
  menuItems: MenuItem[];
  customers: Customer[];
  
  addBranch: (branch: Omit<Branch, 'id'>) => void;
  updateBranch: (id: string, branch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, dept: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
  addJobTitle: (jt: Omit<JobTitle, 'id'>) => void;
  updateJobTitle: (id: string, jt: Partial<JobTitle>) => void;
  deleteJobTitle: (id: string) => void;
  addJobType: (jt: Omit<JobType, 'id'>) => void;
  updateJobType: (id: string, jt: Partial<JobType>) => void;
  deleteJobType: (id: string) => void;
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, emp: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'points' | 'totalSpent' | 'ordersCount' | 'balance' | 'isBlocked' | 'addresses' | 'rating'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addCustomerAddress: (customerId: string, address: Omit<CustomerAddress, 'id'>) => void;
  removeCustomerAddress: (customerId: string, addressId: string) => void;
  toggleBlockCustomer: (id: string) => void;
  adjustCustomerPoints: (id: string, points: number) => void;
  adjustCustomerBalance: (id: string, amount: number) => void;

  login: (name: string, role: 'CASHIER' | 'CUSTOMER' | 'WAITER' | 'ADMIN' | 'BRANCH_MANAGER' | 'HOSPITALITY' | 'DEPARTMENT_STAFF' | 'ORDER_AGGREGATOR' | 'FINANCE' | 'HEAD_CHEF' | 'COOK' | 'EMPLOYEE', phone?: string, branchId?: string, departmentId?: string) => void;
  logout: () => void;
  addToCart: (item: MenuItem, customization?: any) => void;
  removeFromCart: (uniqueId: string) => void;
  updateCartQuantity: (uniqueId: string, delta: number) => void;
  updateCartItem: (uniqueId: string, updates: Partial<OrderItem>) => void;
  updateOrderItemStatus: (orderId: string, itemUniqueId: string, status: OrderStatus) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  transferOrder: (orderId: string, targetTableId: string) => void;
  mergeOrders: (sourceOrderId: string, targetOrderId: string) => void;
  splitOrder: (orderId: string, itemsToSplit: { uniqueId: string, quantity: number }[]) => void;
  refundOrder: (orderId: string, amount: number, items: { uniqueId: string, quantity: number }[]) => void;
  submitOrder: (status: OrderStatus, paymentMethod?: PaymentMethod, discount?: number, customerDetails?: { name: string, phone: string, note?: string }) => void;
  depositToWallet: (amount: number, bonus?: number) => void;
  refundToWallet: (orderId: string) => void;
  saveNewCard: (card: Omit<SavedCard, 'id'>) => void;
  toggleFavorite: (itemId: string) => void;
  setOrderType: (type: OrderType) => void;
  reorder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  
  tables: Table[];
  selectedTable: Table | null;
  setSelectedTable: (table: Table | null) => void;
  updateTableStatus: (tableId: string, status: TableStatus, extra?: Partial<Table>) => void;
  transferTable: (fromId: string, toId: string) => void;
  mergeTables: (tableIds: string[]) => void;
  editingOrderId: string | null;
  clearCart: () => void;
  voidOrder: (orderId: string) => void;
  completeOrder: (orderId: string, payment: { method: string | PaymentMethod }) => void;
  loadOrderToPOS: (order: Order) => void;
  confirmOrder: (orderId: string) => void;
  deliverOrder: (orderId: string) => void;
  assignShelfToOrder: (orderId: string, shelf: string) => void;
  collectOrderItemByAggregator: (orderId: string, itemUniqueId: string) => void;
  
  currentShift: Shift | null;
  shifts: Shift[];
  openShift: (openingBalance: number, type: 'MORNING' | 'EVENING' | 'NIGHT') => void;
  closeShift: (closingBalance: number) => void;
  financialTransactions: FinancialTransaction[];
  addFinancialTransaction: (tx: Omit<FinancialTransaction, 'id' | 'timestamp' | 'status'>) => void;
  
  feedbacks: CustomerFeedback[];
  addFeedback: (fb: Omit<CustomerFeedback, 'id' | 'timestamp' | 'status'>) => void;
  updateFeedback: (id: string, fb: Partial<CustomerFeedback>) => void;
  
  staffTasks: StaffTask[];
  addTask: (task: Omit<StaffTask, 'id' | 'status'>) => void;
  updateTask: (id: string, task: Partial<StaffTask>) => void;
  
  tableAssignments: TableAssignment[];
  assignTable: (tableId: string, staffId: string) => void;
  seatTable: (tableId: string, guestCount: number) => void;

  notifications: { id: string; message: string; time: Date; read: boolean }[];
  addNotification: (message: string) => void;
  markNotificationRead: (id: string) => void;

  attendances: Attendance[];
  workSchedules: WorkSchedule[];
  activityLogs: ActivityLog[];
  
  checkIn: (employeeId: string, note?: string) => void;
  checkOut: (employeeId: string) => void;
  recordAttendance: (attendance: Omit<Attendance, 'id'>) => void;
  deleteAttendance: (id: string) => void;
  addActivityLog: (employeeId: string, action: string, details?: any) => void;
  updateWorkSchedule: (schedule: WorkSchedule) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([
    {
      id: 'o-1',
      orderNumber: 'ORD-1001',
      type: OrderType.DINE_IN,
      status: OrderStatus.IN_PROGRESS,
      items: [
        { itemId: '1', uniqueId: 'ui-1', name: 'برجر كلاسيك', quantity: 2, price: 25, basePrice: 25 },
        { itemId: '3', uniqueId: 'ui-2', name: 'عصير برتقال', quantity: 2, price: 12, basePrice: 12 }
      ],
      tableId: 't-1',
      createdAt: new Date(Date.now() - 30 * 60000),
      subtotal: 74,
      tax: 0,
      discount: 0,
      total: 74,
      timeline: [{ status: OrderStatus.IN_PROGRESS, time: new Date() }]
    },
    {
      id: 'o-2',
      orderNumber: 'ORD-1002',
      type: OrderType.DINE_IN,
      status: OrderStatus.READY,
      items: [
        { itemId: '7', uniqueId: 'ui-3', name: 'مشاوي مشكلة', quantity: 1, price: 85, basePrice: 85 }
      ],
      tableId: 't-2',
      createdAt: new Date(Date.now() - 45 * 60000),
      subtotal: 85,
      tax: 0,
      discount: 0,
      total: 85,
      timeline: [{ status: OrderStatus.READY, time: new Date() }]
    }
  ]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'CASHIER' | 'CUSTOMER' | 'WAITER' | 'ADMIN' | 'BRANCH_MANAGER' | 'HOSPITALITY' | 'DEPARTMENT_STAFF' | 'ORDER_AGGREGATOR' | 'FINANCE' | null>(null);
  const [currentCart, setCurrentCart] = useState<OrderItem[]>([]);
  const [cartOrderType, setCartOrderType] = useState<OrderType>(OrderType.TAKEAWAY);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tables, setTables] = useState<Table[]>(TABLES);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([]);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 'c1',
      name: 'محمد أحمد',
      phone: '0599111222',
      email: 'mohammad@example.com',
      type: CustomerType.LOYAL,
      points: 420,
      totalSpent: 1200,
      ordersCount: 12,
      balance: 0,
      allowCredit: true,
      isBlocked: false,
      addresses: [
        { id: 'ca1', label: 'المنزل', city: 'نابلس', district: 'رفيديا', street: 'شارع الجامعة' }
      ],
      rating: 5,
      notes: 'لا يحب البصل، يطلب دائماً شاورما',
      lastVisit: new Date(Date.now() - 86400000),
      createdAt: new Date(Date.now() - 30 * 86400000)
    },
    {
      id: 'c2',
      name: 'سارة علي',
      phone: '0568111333',
      email: 'sara@example.com',
      type: CustomerType.REGULAR,
      points: 150,
      totalSpent: 450,
      ordersCount: 5,
      balance: 0,
      allowCredit: false,
      isBlocked: false,
      addresses: [],
      rating: 4,
      lastVisit: new Date(),
      createdAt: new Date(Date.now() - 15 * 86400000)
    }
  ]);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([
    {
      id: 'fb_1',
      customerName: 'أحمد محمد',
      type: 'COMPLAINT',
      category: 'SERVICE',
      rating: 2,
      comment: 'تأخر الطلب لأكثر من 30 دقيقة رغم أن الصالة كانت شبه فارغة.',
      status: 'NEW',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: 'fb_2',
      customerName: 'سارة علي',
      type: 'COMPLIMENT',
      category: 'FOOD',
      rating: 5,
      comment: 'الأكل رائع جداً والخدمة متميزة من قبل الكابتن خالد.',
      status: 'REVIEWED',
      timestamp: new Date(Date.now() - 7200000)
    }
  ]);
  const [notifications, setNotifications] = useState<{ id: string; message: string; time: Date; read: boolean }[]>([]);

  const addNotification = (message: string) => {
    setNotifications(prev => [{ id: Math.random().toString(36).substr(2, 9), message, time: new Date(), read: false }, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const [staffTasks, setStaffTasks] = useState<StaffTask[]>([
    {
      id: 'task_1',
      title: 'تجهيز طاولات الـ VIP',
      description: 'تجهيز الطاولات لمناسبة خاصة الساعة 8 مساءً',
      assignedTo: 'e2', // Assuming e2 is a waiter
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: new Date()
    },
    {
      id: 'task_2',
      title: 'فحص نظافة التراس',
      description: 'التأكد من نظافة جميع الطاولات في منطقة التراس',
      assignedTo: 'e3',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      dueDate: new Date()
    }
  ]);
  const [tableAssignments, setTableAssignments] = useState<TableAssignment[]>([]);

  const [branches, setBranches] = useState<Branch[]>([
    { id: 'b1', name: 'فرع غزة الرئيسي', address: 'شارع الثلاثيني', phone: '0599001122', status: 'ACTIVE' },
    { id: 'b2', name: 'فرع الرمال', address: 'دوار حيدر', phone: '0599112233', status: 'ACTIVE' }
  ]);
  const [departments, setDepartments] = useState<Department[]>([
    { 
      id: 'd-italian', 
      name: 'القسم الإيطالي', 
      nameAr: 'المطبخ الإيطالي',
      shortName: 'ITA',
      branchId: 'b1', 
      description: 'تحضير المأكولات الإيطالية والبيتزا والباستا',
      icon: '🍕',
      color: '#ef4444',
      stationNumber: '1',
      location: 'Station 1',
      hasKds: true,
      kdsScreenId: 'KDS-ITA-01',
      kdsDeviceName: 'Italian Kitchen Screen',
      defaultPrepTime: 10,
      type: 'MAIN_KITCHEN',
      displayOrder: 1,
      status: 'ACTIVE',
      maxConcurrentOrders: 10,
      priority: 1,
      autoPrintTicket: true,
      notifications: { sound: true, flash: true, push: true },
      orderTypeVisibility: [OrderType.DINE_IN, OrderType.TAKEAWAY, OrderType.DELIVERY],
      requiresAssembly: true
    },
    { 
      id: 'd-shawarma', 
      name: 'قسم الشاورما', 
      nameAr: 'قسم الشاورما',
      shortName: 'SHA',
      branchId: 'b1', 
      description: 'تحضير الشاورما والوجبات السريعة',
      icon: '🌯',
      color: '#f59e0b',
      stationNumber: '2',
      location: 'Station 2',
      hasKds: true,
      kdsScreenId: 'KDS-SHA-01',
      kdsDeviceName: 'Shawarma Kitchen Screen',
      defaultPrepTime: 8,
      type: 'MAIN_KITCHEN',
      displayOrder: 2,
      status: 'ACTIVE',
      maxConcurrentOrders: 15,
      priority: 1,
      autoPrintTicket: true,
      notifications: { sound: true, flash: true, push: true },
      orderTypeVisibility: [OrderType.DINE_IN, OrderType.TAKEAWAY, OrderType.DELIVERY],
      requiresAssembly: true
    },
    { 
      id: 'd-bar', 
      name: 'البار (المشروبات)', 
      nameAr: 'بار المشروبات',
      shortName: 'BAR',
      branchId: 'b1', 
      description: 'تحضير المشروبات والكوكتيلات والقهوة',
      icon: '🥤',
      color: '#3b82f6',
      stationNumber: '3',
      location: 'Station 3',
      hasKds: true,
      kdsScreenId: 'KDS-BAR-01',
      kdsDeviceName: 'Drink Bar Screen',
      defaultPrepTime: 2,
      type: 'BAR',
      displayOrder: 3,
      status: 'ACTIVE',
      maxConcurrentOrders: 20,
      priority: 3,
      autoPrintTicket: false,
      notifications: { sound: true, flash: false, push: true },
      orderTypeVisibility: [OrderType.DINE_IN, OrderType.TAKEAWAY, OrderType.DELIVERY],
      requiresAssembly: false
    },
    { 
      id: 'd-grills', 
      name: 'قسم المشاوي', 
      nameAr: 'قسم المشاوي واللحوم',
      shortName: 'GRL',
      branchId: 'b1', 
      description: 'تحضير المشاوي واللحوم على الفحم',
      icon: '🍖',
      color: '#f59e0b',
      stationNumber: '2',
      location: 'Station 2',
      hasKds: true,
      kdsScreenId: 'KDS-GRL-01',
      kdsDeviceName: 'Grills Station Screen',
      defaultPrepTime: 15,
      type: 'MAIN_KITCHEN',
      displayOrder: 2,
      status: 'ACTIVE',
      maxConcurrentOrders: 8,
      priority: 2,
      autoPrintTicket: true,
      notifications: { sound: true, flash: true, push: true },
      orderTypeVisibility: [OrderType.DINE_IN, OrderType.TAKEAWAY, OrderType.DELIVERY],
      requiresAssembly: true
    },
    { 
      id: 'd-fastfood', 
      name: 'الوجبات السريعة', 
      nameAr: 'قسم الوجبات السريعة',
      shortName: 'FF',
      branchId: 'b1', 
      description: 'تحضير البرجر والبطاطس والوجبات السريعة',
      icon: '🍔',
      color: '#10b981',
      stationNumber: '4',
      location: 'Station 4',
      hasKds: true,
      kdsScreenId: 'KDS-FF-01',
      kdsDeviceName: 'Fast Food Screen',
      defaultPrepTime: 5,
      type: 'FAST_FOOD',
      displayOrder: 4,
      status: 'ACTIVE',
      maxConcurrentOrders: 15,
      priority: 4,
      autoPrintTicket: true,
      notifications: { sound: true, flash: false, push: true },
      orderTypeVisibility: [OrderType.DINE_IN, OrderType.TAKEAWAY, OrderType.DELIVERY],
      requiresAssembly: true
    },
    { 
      id: 'd-desserts', 
      name: 'قسم الحلويات', 
      nameAr: 'قسم الحلويات والشرقيات',
      shortName: 'DES',
      branchId: 'b1', 
      description: 'تحضير الحلويات والشرقيات والكيك',
      icon: '🍰',
      color: '#ec4899',
      stationNumber: '5',
      location: 'Station 5',
      hasKds: false,
      defaultPrepTime: 3,
      type: 'DESSERT',
      displayOrder: 5,
      status: 'ACTIVE',
      maxConcurrentOrders: 10,
      priority: 5,
      autoPrintTicket: true,
      notifications: { sound: false, flash: false, push: true },
      orderTypeVisibility: [OrderType.DINE_IN, OrderType.TAKEAWAY],
      requiresAssembly: false
    }
  ]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([
    { id: 'jt1', name: 'مدير عام', departmentIds: ['d1'], description: 'المسؤول التنفيذي' },
    { id: 'jt2', name: 'شيف تنفيذي', departmentIds: ['d2'], description: 'إدارة المطبخ' },
    { id: 'jt3', name: 'كاشير', departmentIds: ['d3'], description: 'إدارة الصندوق' }
  ]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([
    { id: 'ty1', name: 'دوام كامل (Permanent)', description: 'تثبيت كامل' },
    { id: 'ty2', name: 'دوام جزئي (Part-time)', description: 'نظام الساعات' }
  ]);
  const [employees, setEmployees] = useState<Employee[]>([
    { 
      id: 'e1', employeeId: 'EMP-101', name: 'ياسين أحمد', phone: '0599111222', email: 'admin@resto.com', 
      address: 'غزة - الرمال', nationalId: '401122334', dob: new Date(1985, 2, 15),
      jobTitleId: 'jt1', departmentId: 'd1', branchId: 'b1', typeId: 'ty1',
      hireDate: new Date(2020, 0, 1), salary: 5000, status: EmployeeStatus.ACTIVE, role: 'ADMIN',
      permissions: ['ALL'], pin: '0000'
    },
    { 
      id: 'e2', employeeId: 'EMP-102', name: 'محمد علي', phone: '0599111333', email: 'b_manager@resto.com', 
      address: 'غزة - الرمال', nationalId: '401122335', dob: new Date(1988, 5, 20),
      jobTitleId: 'jt1', departmentId: 'd1', branchId: 'b2', typeId: 'ty1',
      hireDate: new Date(2021, 0, 1), salary: 3500, status: EmployeeStatus.ACTIVE, role: 'BRANCH_MANAGER',
      permissions: ['MANAGE_BRANCH'], pin: '1111'
    },
    {
      id: 'e3',
      employeeId: 'EMP-103',
      name: 'أحمد بشير',
      phone: '0599123456',
      email: 'ahmad@example.com',
      address: 'غزة، الرمال',
      nationalId: '123456789',
      dob: new Date('1990-01-01'),
      hireDate: new Date('2023-01-01'),
      salary: 2500,
      status: EmployeeStatus.ACTIVE,
      role: 'CASHIER',
      jobTitleId: 'jt3',
      departmentId: 'd3',
      branchId: 'b1',
      typeId: 'ty1',
      permissions: ['CREATE_ORDER', 'CLOSE_ORDER', 'RECEIVE_PAYMENT'],
      pin: '1234'
    },
    {
      id: 'e4',
      employeeId: 'EMP-104',
      name: 'أحمد محمد',
      phone: '0599123456',
      email: 'ahmad@email.com',
      address: 'غزة، الرمال',
      nationalId: '123456780',
      dob: new Date('1995-05-15'),
      hireDate: new Date('2024-01-01'),
      salary: 3000,
      status: EmployeeStatus.ACTIVE,
      role: 'EMPLOYEE',
      jobTitleId: 'jt2',
      departmentId: 'd-shawarma',
      branchId: 'b1',
      typeId: 'ty1',
      permissions: ['VIEW_DASHBOARD'],
      pin: '1234'
    }
  ]);
  const [attendances, setAttendances] = useState<Attendance[]>([
    { id: 'att1', employeeId: 'e4', date: new Date(2026, 2, 19), checkIn: new Date(2026, 2, 19, 8, 5), checkOut: new Date(2026, 2, 19, 16, 10), status: 'PRESENT' },
    { id: 'att2', employeeId: 'e4', date: new Date(2026, 2, 18), checkIn: new Date(2026, 2, 18, 7, 55), checkOut: new Date(2026, 2, 18, 16, 5), status: 'PRESENT' },
    { id: 'att3', employeeId: 'e4', date: new Date(2026, 2, 17), checkIn: new Date(2026, 2, 17, 8, 15), checkOut: new Date(2026, 2, 17, 16, 0), status: 'LATE' },
    { id: 'att4', employeeId: 'e1', date: new Date(2026, 2, 24), checkIn: new Date(2026, 2, 24, 8, 0), checkOut: new Date(2026, 2, 24, 17, 0), status: 'PRESENT' },
    { id: 'att5', employeeId: 'e1', date: new Date(2026, 2, 25), checkIn: new Date(2026, 2, 25, 7, 50), checkOut: new Date(2026, 2, 25, 17, 15), status: 'PRESENT' },
    { id: 'att6', employeeId: 'e1', date: new Date(2026, 2, 26), checkIn: new Date(2026, 2, 26, 8, 5), status: 'PRESENT' },
    { id: 'att7', employeeId: 'e2', date: new Date(2026, 2, 24), checkIn: new Date(2026, 2, 24, 8, 30), checkOut: new Date(2026, 2, 24, 16, 30), status: 'LATE' },
    { id: 'att8', employeeId: 'e2', date: new Date(2026, 2, 25), checkIn: new Date(2026, 2, 25, 8, 10), checkOut: new Date(2026, 2, 25, 16, 45), status: 'PRESENT' },
    { id: 'att9', employeeId: 'e2', date: new Date(2026, 2, 26), checkIn: new Date(2026, 2, 26, 0, 0), status: 'ABSENT', note: 'إجازة مرضية' },
    { id: 'att10', employeeId: 'e3', date: new Date(2026, 2, 25), checkIn: new Date(2026, 2, 25, 9, 0), checkOut: new Date(2026, 2, 25, 17, 0), status: 'LATE', note: 'تأخر بسبب المواصلات' },
    { id: 'att11', employeeId: 'e3', date: new Date(2026, 2, 26), checkIn: new Date(2026, 2, 26, 7, 55), status: 'PRESENT' },
    { id: 'att12', employeeId: 'e4', date: new Date(2026, 2, 24), checkIn: new Date(2026, 2, 24, 8, 0), checkOut: new Date(2026, 2, 24, 16, 0), status: 'PRESENT' },
    { id: 'att13', employeeId: 'e4', date: new Date(2026, 2, 25), checkIn: new Date(2026, 2, 25, 8, 0), checkOut: new Date(2026, 2, 25, 16, 0), status: 'PRESENT' },
    { id: 'att14', employeeId: 'e4', date: new Date(2026, 2, 26), checkIn: new Date(2026, 2, 26, 8, 20), status: 'LATE' },
  ]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([
    { 
      id: 'ws1', 
      employeeId: 'e4', 
      branchId: 'b1', 
      departmentId: 'd-shawarma', 
      shiftId: 'sh1', 
      dayOfWeek: 6, // Saturday
      startTime: '08:00', 
      endTime: '16:00' 
    },
    { id: 'ws2', employeeId: 'e4', branchId: 'b1', departmentId: 'd-shawarma', shiftId: 'sh1', dayOfWeek: 0, startTime: '08:00', endTime: '16:00' },
    { id: 'ws3', employeeId: 'e4', branchId: 'b1', departmentId: 'd-shawarma', shiftId: 'sh1', dayOfWeek: 1, startTime: '08:00', endTime: '16:00' },
    { id: 'ws4', employeeId: 'e4', branchId: 'b1', departmentId: 'd-shawarma', shiftId: 'sh1', dayOfWeek: 2, startTime: '08:00', endTime: '16:00' },
    { id: 'ws5', employeeId: 'e4', branchId: 'b1', departmentId: 'd-shawarma', shiftId: 'sh1', dayOfWeek: 3, startTime: '08:00', endTime: '16:00' },
    { id: 'ws6', employeeId: 'e4', branchId: 'b1', departmentId: 'd-shawarma', shiftId: 'sh1', dayOfWeek: 4, startTime: '08:00', endTime: '16:00' },
  ]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([
    { id: 'log_1', employeeId: 'emp-1', action: 'فتح شفت جديد', timestamp: new Date(Date.now() - 3600000), details: { openingBalance: 500 } },
    { id: 'log_2', employeeId: 'emp-1', action: 'إضافة مصروف: كهرباء', timestamp: new Date(Date.now() - 2400000), details: { amount: 150 } },
    { id: 'log_3', employeeId: 'emp-2', action: 'تعديل سعر صنف: برجر كلاسيك', timestamp: new Date(Date.now() - 1200000), details: { oldPrice: 25, newPrice: 30 } },
    { id: 'log_4', employeeId: 'emp-1', action: 'إلغاء طلب #ORD-1005', timestamp: new Date(Date.now() - 600000), details: { reason: 'خطأ في الطلب' } },
  ]);

  const updateOrderStatus = (id: string, status: OrderStatus) => {
    setActiveOrders(prev => prev.map(o => {
      if (o.id === id) {
        const newTimeline = [...o.timeline, { status, time: new Date() }];
        // If order becomes READY, mark all items as READY too if they aren't
        const newItems = status === OrderStatus.READY 
          ? o.items.map(item => ({ ...item, status: OrderStatus.READY, preparedAt: item.preparedAt || new Date() }))
          : o.items;
        
        return { ...o, status, timeline: newTimeline, items: newItems };
      }
      return o;
    }));
    
    const order = activeOrders.find(o => o.id === id);
    if (status === OrderStatus.READY && order) {
      addNotification(`الطلب #${order.orderNumber} جاهز الآن!`);
    }
  };

  const addBranch = (b: Omit<Branch, 'id'>) => setBranches(p => [...p, { ...b, id: 'b_' + Math.random().toString(36).substr(2, 5) }]);
  const updateBranch = (id: string, b: Partial<Branch>) => setBranches(p => p.map(x => x.id === id ? { ...x, ...b } : x));
  const deleteBranch = (id: string) => setBranches(p => p.filter(x => x.id !== id));
  const addDepartment = (d: Omit<Department, 'id'>) => setDepartments(p => [...p, { ...d, id: 'd_' + Math.random().toString(36).substr(2, 5) }]);
  const updateDepartment = (id: string, d: Partial<Department>) => setDepartments(p => p.map(x => x.id === id ? { ...x, ...d } : x));
  const deleteDepartment = (id: string) => setDepartments(p => p.filter(x => x.id !== id));
  const addJobTitle = (jt: Omit<JobTitle, 'id'>) => setJobTitles(p => [...p, { ...jt, id: 'jt_' + Math.random().toString(36).substr(2, 5) }]);
  const updateJobTitle = (id: string, jt: Partial<JobTitle>) => setJobTitles(p => p.map(x => x.id === id ? { ...x, ...jt } : x));
  const deleteJobTitle = (id: string) => setJobTitles(p => p.filter(x => x.id !== id));
  const addJobType = (jt: Omit<JobType, 'id'>) => setJobTypes(p => [...p, { ...jt, id: 'ty_' + Math.random().toString(36).substr(2, 5) }]);
  const updateJobType = (id: string, jt: Partial<JobType>) => setJobTypes(p => p.map(x => x.id === id ? { ...x, ...jt } : x));
  const deleteJobType = (id: string) => setJobTypes(p => p.filter(x => x.id !== id));
  const addEmployee = (e: Omit<Employee, 'id'>) => setEmployees(p => [...p, { ...e, id: 'e_' + Math.random().toString(36).substr(2, 5) }]);
  const updateEmployee = (id: string, e: Partial<Employee>) => setEmployees(p => p.map(x => x.id === id ? { ...x, ...e } : x));
  const deleteEmployee = (id: string) => setEmployees(p => p.filter(x => x.id !== id));

  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
    setMenuItems(prev => [...prev, newItem]);
  };
  const updateMenuItem = (id: string, item: Partial<MenuItem>) => {
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, ...item } : i));
  };
  const deleteMenuItem = (id: string) => {
    setMenuItems(prev => prev.filter(i => i.id !== id));
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt' | 'points' | 'totalSpent' | 'ordersCount' | 'balance' | 'isBlocked' | 'addresses' | 'rating'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      points: 0,
      totalSpent: 0,
      ordersCount: 0,
      balance: 0,
      isBlocked: false,
      addresses: [],
      rating: 5
    };
    setCustomers(prev => [...prev, newCustomer]);
  };
  const updateCustomer = (id: string, customer: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...customer } : c));
  };
  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };
  const addCustomerAddress = (customerId: string, address: Omit<CustomerAddress, 'id'>) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? {
      ...c,
      addresses: [...c.addresses, { ...address, id: Math.random().toString(36).substr(2, 5) }]
    } : c));
  };
  const removeCustomerAddress = (customerId: string, addressId: string) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? {
      ...c,
      addresses: c.addresses.filter(a => a.id !== addressId)
    } : c));
  };
  const toggleBlockCustomer = (id: string) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, isBlocked: !c.isBlocked } : c));
  };
  const adjustCustomerPoints = (id: string, points: number) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, points: c.points + points } : c));
  };
  const adjustCustomerBalance = (id: string, amount: number) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, balance: c.balance + amount } : c));
  };

  const login = (name: string, role: 'CASHIER' | 'CUSTOMER' | 'WAITER' | 'ADMIN' | 'BRANCH_MANAGER' | 'HOSPITALITY' | 'DEPARTMENT_STAFF' | 'ORDER_AGGREGATOR' | 'FINANCE' | 'HEAD_CHEF' | 'COOK' | 'EMPLOYEE', phone: string = '', branchId: string = 'b1', departmentId?: string) => {
    setUserRole(role);
    
    // Try to find matching employee for richer profile
    const existingEmp = employees.find(e => e.name === name || e.employeeId === name);
    
    setCurrentUser({
      id: existingEmp?.id || 'u_' + Math.random().toString(36).substr(2, 5),
      name: existingEmp?.name || name, 
      phone: existingEmp?.phone || phone, 
      role: existingEmp?.role || (role === 'ADMIN' ? 'ADMIN' : role === 'BRANCH_MANAGER' ? 'BRANCH_MANAGER' : role),
      branchId: existingEmp?.branchId || ((role === 'BRANCH_MANAGER' || role === 'DEPARTMENT_STAFF' || role === 'ORDER_AGGREGATOR' || role === 'FINANCE') ? branchId : undefined),
      departmentId: existingEmp?.departmentId || (role === 'DEPARTMENT_STAFF' ? departmentId : undefined),
      points: 120, balance: 350.0, tier: 'GOLD', vouchers: [], favorites: ['1', '3'], addresses: [], savedCards: [], transactions: []
    });
  };

  const logout = () => { setCurrentUser(null); setUserRole(null); };
  const openShift = (openingBalance: number, type: 'MORNING' | 'EVENING' | 'NIGHT') => {
    if (!currentUser) return;
    setCurrentShift({ 
      id: 'sh_' + Math.random().toString(36).substr(2, 5), 
      cashierId: currentUser.id, 
      startTime: new Date(), 
      openingBalance, 
      status: 'OPEN',
      type
    });
    addActivityLog(currentUser.id, 'Opened Shift', { openingBalance, type });
  };
  const closeShift = (closingBalance: number) => {
    if (!currentShift || !currentUser) return;
    
    // Calculate expected balance
    const shiftTransactions = financialTransactions.filter(tx => tx.shiftId === currentShift.id);
    const totalSales = shiftTransactions.filter(tx => tx.type === FinancialTransactionType.SALE).reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = shiftTransactions.filter(tx => tx.type === FinancialTransactionType.EXPENSE).reduce((sum, tx) => sum + tx.amount, 0);
    const totalWithdrawals = shiftTransactions.filter(tx => tx.type === FinancialTransactionType.WITHDRAWAL).reduce((sum, tx) => sum + tx.amount, 0);
    const totalDeposits = shiftTransactions.filter(tx => tx.type === FinancialTransactionType.DEPOSIT).reduce((sum, tx) => sum + tx.amount, 0);
    const totalRefunds = shiftTransactions.filter(tx => tx.type === FinancialTransactionType.REFUND).reduce((sum, tx) => sum + tx.amount, 0);
    
    const expectedBalance = currentShift.openingBalance + totalSales + totalDeposits - totalExpenses - totalWithdrawals - totalRefunds;
    
    const closedShift: Shift = { 
      ...currentShift, 
      status: 'CLOSED', 
      endTime: new Date(), 
      closingBalance,
      expectedBalance,
      totalSales,
      totalExpenses,
      totalWithdrawals
    };

    setShifts(prev => [closedShift, ...prev]);
    setCurrentShift(null);
    addActivityLog(currentUser.id, 'Closed Shift', { expectedBalance, closingBalance, difference: closingBalance - expectedBalance });
  };

  const checkIn = (employeeId: string, note?: string) => {
    const newAttendance: Attendance = {
      id: 'att_' + Math.random().toString(36).substr(2, 9),
      employeeId,
      date: new Date(),
      checkIn: new Date(),
      status: 'PRESENT',
      note
    };
    setAttendances(prev => [newAttendance, ...prev]);
  };

  const recordAttendance = (attendance: Omit<Attendance, 'id'>) => {
    const newAttendance: Attendance = {
      ...attendance,
      id: 'att_' + Math.random().toString(36).substr(2, 9),
    };
    setAttendances(prev => [newAttendance, ...prev]);
  };

  const deleteAttendance = (id: string) => {
    setAttendances(prev => prev.filter(a => a.id !== id));
  };

  const checkOut = (employeeId: string) => {
    setAttendances(prev => prev.map(att => 
      att.employeeId === employeeId && !att.checkOut 
        ? { ...att, checkOut: new Date() } 
        : att
    ));
  };

  const addActivityLog = (employeeId: string, action: string, details?: any) => {
    const newLog: ActivityLog = {
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      employeeId,
      action,
      timestamp: new Date(),
      details
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const updateWorkSchedule = (schedule: WorkSchedule) => {
    setWorkSchedules(prev => {
      const exists = prev.find(s => s.employeeId === schedule.employeeId && s.dayOfWeek === schedule.dayOfWeek);
      if (exists) {
        return prev.map(s => s.id === exists.id ? schedule : s);
      }
      return [...prev, { ...schedule, id: 'sch_' + Math.random().toString(36).substr(2, 9) }];
    });
  };

  const addFinancialTransaction = (tx: Omit<FinancialTransaction, 'id' | 'timestamp' | 'status'>) => {
    const newTx: FinancialTransaction = {
      ...tx,
      id: 'ftx_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      status: 'PENDING'
    };
    setFinancialTransactions(prev => [newTx, ...prev]);
    addActivityLog(tx.cashierId, `Financial Transaction: ${tx.type}`, { amount: tx.amount, reason: tx.reason });
  };

  const addFeedback = (fb: Omit<CustomerFeedback, 'id' | 'timestamp' | 'status'>) => {
    setFeedbacks(prev => [{
      ...fb,
      id: 'fb_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      status: 'NEW'
    }, ...prev]);
  };

  const updateFeedback = (id: string, fb: Partial<CustomerFeedback>) => {
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, ...fb } : f));
  };

  const addTask = (task: Omit<StaffTask, 'id' | 'status'>) => {
    setStaffTasks(prev => [{
      ...task,
      id: 'task_' + Math.random().toString(36).substr(2, 9),
      status: 'PENDING'
    }, ...prev]);
  };

  const updateTask = (id: string, task: Partial<StaffTask>) => {
    setStaffTasks(prev => prev.map(t => t.id === id ? { ...t, ...task } : t));
  };

  const assignTable = (tableId: string, staffId: string) => {
    if (!currentShift) return;
    setTableAssignments(prev => {
      const filtered = prev.filter(a => a.tableId !== tableId);
      return [...filtered, { tableId, staffId, shiftId: currentShift.id }];
    });
  };

  const seatTable = (tableId: string, guestCount: number) => {
    setTables(prev => prev.map(t => t.id === tableId ? { 
      ...t, 
      status: TableStatus.OCCUPIED, 
      seatedAt: new Date(), 
      guestCount 
    } : t));
  };

  const depositToWallet = (amount: number, bonus: number = 0) => {
    if (!currentUser) return;
    const totalDeposit = amount + bonus;
    const newTransaction: Transaction = { id: 'tr_' + Math.random().toString(36).substr(2, 9), date: new Date(), amount, type: 'DEPOSIT', status: 'SUCCESS', description: `شحن محفظة` };
    setCurrentUser({ ...currentUser, balance: currentUser.balance + totalDeposit, transactions: [newTransaction, ...currentUser.transactions] });
  };

  const refundToWallet = (orderId: string) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order || !currentUser) return;
    const refundTransaction: Transaction = { id: 'ref_' + Math.random().toString(36).substr(2, 9), date: new Date(), amount: order.total, type: 'REFUND', status: 'SUCCESS', description: `استرداد طلب #${order.orderNumber}` };
    setCurrentUser({ ...currentUser, balance: currentUser.balance + order.total, transactions: [refundTransaction, ...currentUser.transactions] });
    setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: OrderStatus.REFUNDED } : o));
  };

  const updateTableStatus = (tableId: string, status: TableStatus, extra?: Partial<Table>) => {
    setTables(prev => {
      const tableToUpdate = prev.find(t => t.id === tableId);
      if (!tableToUpdate) return prev;

      // If clearing a table (setting to AVAILABLE or CLEANING), clear all merged tables too
      if (status === TableStatus.AVAILABLE || status === TableStatus.CLEANING || status === TableStatus.PAID || status === TableStatus.PAYMENT_PENDING) {
        const masterId = tableToUpdate.mergedWithId || tableToUpdate.id;
        return prev.map(t => {
          if (t.id === masterId || t.mergedWithId === masterId) {
            const isClearing = status === TableStatus.AVAILABLE || status === TableStatus.CLEANING;
            return { 
              ...t, 
              status, 
              currentOrderId: isClearing ? undefined : (t.currentOrderId || extra?.currentOrderId), 
              seatedAt: isClearing ? undefined : (t.seatedAt || extra?.seatedAt), 
              guestCount: isClearing ? undefined : (t.guestCount || extra?.guestCount),
              mergedWithId: isClearing ? undefined : t.mergedWithId,
              reservationName: isClearing ? undefined : t.reservationName,
              reservationTime: isClearing ? undefined : t.reservationTime,
              ...extra 
            };
          }
          return t;
        });
      }

      // Otherwise just update the single table
      return prev.map(t => t.id === tableId ? { ...t, status, ...extra } : t);
    });
  };

  const transferTable = (fromId: string, toId: string) => {
    const fromTable = tables.find(t => t.id === fromId);
    const toTable = tables.find(t => t.id === toId);
    if (!fromTable || !toTable || fromTable.status !== TableStatus.OCCUPIED) return;

    const orderId = fromTable.currentOrderId;
    
    // Move order to new table if exists
    if (orderId) {
      setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, tableId: toId } : o));
    }
    
    // Update tables
    setTables(prev => prev.map(t => {
      if (t.id === fromId) return { ...t, status: TableStatus.CLEANING, currentOrderId: undefined, seatedAt: undefined, guestCount: undefined };
      if (t.id === toId) return { ...t, status: TableStatus.OCCUPIED, currentOrderId: orderId, seatedAt: fromTable.seatedAt, guestCount: fromTable.guestCount };
      return t;
    }));
  };

  const mergeTables = (tableIds: string[]) => {
    if (tableIds.length < 2) return;
    const targetTableId = tableIds[0];
    const otherTableIds = tableIds.slice(1);

    const targetTable = tables.find(t => t.id === targetTableId);
    if (!targetTable) return;

    let mergedItems: OrderItem[] = [];
    let totalGuestCount = targetTable.guestCount || 0;
    let masterOrderId = targetTable.currentOrderId;
    let earliestSeatedAt = targetTable.seatedAt;

    // If target has an order, start with its items
    if (masterOrderId) {
      const targetOrder = activeOrders.find(o => o.id === masterOrderId);
      if (targetOrder) {
        mergedItems = [...targetOrder.items];
      }
    }

    otherTableIds.forEach(id => {
      const table = tables.find(t => t.id === id);
      if (table) {
        totalGuestCount += (table.guestCount || 0);
        if (table.seatedAt && (!earliestSeatedAt || table.seatedAt < earliestSeatedAt)) {
          earliestSeatedAt = table.seatedAt;
        }
        if (table.currentOrderId) {
          const order = activeOrders.find(o => o.id === table.currentOrderId);
          if (order) {
            mergedItems = [...mergedItems, ...order.items];
            // If we didn't have a master order yet, take this one
            if (!masterOrderId) {
              masterOrderId = order.id;
            } else {
              // Otherwise cancel the other order
              setActiveOrders(prev => prev.filter(o => o.id !== order.id));
            }
          }
        }
      }
    });

    // If no order existed at all, we might need to create one or just update table guest counts
    // But usually merge is done when there's at least one order or guests seated.
    
    if (masterOrderId) {
      const subtotal = mergedItems.reduce((s, i) => s + (i.price * i.quantity), 0);
      setActiveOrders(prev => prev.map(o => o.id === masterOrderId ? { 
        ...o, 
        items: mergedItems, 
        subtotal, 
        total: subtotal - o.discount,
        tableId: targetTableId // Ensure it's linked to the master table
      } : o));
    }

    // Update all tables to be OCCUPIED and linked to the master order
    setTables(prev => prev.map(t => {
      if (tableIds.includes(t.id)) {
        return { 
          ...t, 
          status: TableStatus.OCCUPIED, 
          currentOrderId: masterOrderId, 
          guestCount: t.id === targetTableId ? totalGuestCount : 0, // Master table holds total count
          seatedAt: earliestSeatedAt || new Date(),
          mergedWithId: t.id === targetTableId ? undefined : targetTableId
        };
      }
      return t;
    }));
  };

  const confirmOrder = (orderId: string) => {
    setActiveOrders(prev => prev.map(order => 
      order.id === orderId ? { 
        ...order, 
        status: OrderStatus.CONFIRMED,
        timeline: [...order.timeline, { status: OrderStatus.CONFIRMED, time: new Date() }]
      } : order
    ));
  };

  const cancelOrder = (orderId: string, reason: string) => {
    setActiveOrders(prev => prev.map(order => 
      order.id === orderId ? { 
        ...order, 
        status: OrderStatus.CANCELED,
        cancelReason: reason,
        timeline: [...order.timeline, { status: OrderStatus.CANCELED, time: new Date(), note: reason }]
      } : order
    ));
    
    // Free up table if it was a dine-in order
    const order = activeOrders.find(o => o.id === orderId);
    if (order && order.tableId) {
      setTables(prev => prev.map(t => t.id === order.tableId ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } : t));
    }
  };

  const updateOrderItemStatus = (orderId: string, uniqueId: string, status: OrderStatus) => {
    setActiveOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const updatedItems = order.items.map(item => 
        item.uniqueId === uniqueId ? { ...item, status } : item
      );
      
      // Check if all items are ready to update order status
      const allReady = updatedItems.every(i => i.status === OrderStatus.READY);
      const allDelivered = updatedItems.every(i => i.status === OrderStatus.DELIVERED);
      
      let newOrderStatus = order.status;
      if (allDelivered) newOrderStatus = OrderStatus.DELIVERED;
      else if (allReady) newOrderStatus = OrderStatus.READY;
      else if (updatedItems.some(i => i.status === OrderStatus.PREPARING)) newOrderStatus = OrderStatus.PREPARING;

      return { 
        ...order, 
        items: updatedItems,
        status: newOrderStatus,
        timeline: newOrderStatus !== order.status ? [...order.timeline, { status: newOrderStatus, time: new Date() }] : order.timeline
      };
    }));
  };

  const transferOrder = (orderId: string, targetTableId: string) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (!order || !order.tableId) return;

    const oldTableId = order.tableId;

    setTables(prev => prev.map(t => {
      if (t.id === oldTableId) return { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined };
      if (t.id === targetTableId) return { ...t, status: TableStatus.OCCUPIED, currentOrderId: orderId };
      return t;
    }));

    setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, tableId: targetTableId } : o));
  };

  const mergeOrders = (sourceOrderId: string, targetOrderId: string) => {
    const sourceOrder = activeOrders.find(o => o.id === sourceOrderId);
    const targetOrder = activeOrders.find(o => o.id === targetOrderId);
    if (!sourceOrder || !targetOrder) return;

    const mergedItems = [...targetOrder.items, ...sourceOrder.items];
    const mergedSubtotal = mergedItems.reduce((s, i) => s + (i.price * i.quantity), 0);
    const mergedTotal = mergedSubtotal - targetOrder.discount;

    setActiveOrders(prev => {
      const filtered = prev.filter(o => o.id !== sourceOrderId);
      return filtered.map(o => o.id === targetOrderId ? {
        ...o,
        items: mergedItems,
        subtotal: mergedSubtotal,
        total: mergedTotal,
        timeline: [...o.timeline, { status: o.status, time: new Date(), note: `Merged with ${sourceOrder.orderNumber}` }]
      } : o);
    });

    if (sourceOrder.tableId) {
      setTables(prev => prev.map(t => t.id === sourceOrder.tableId ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } : t));
    }
  };

  const splitOrder = (orderId: string, itemsToSplit: { uniqueId: string, quantity: number }[]) => {
    const originalOrder = activeOrders.find(o => o.id === orderId);
    if (!originalOrder) return;

    const newOrderId = Math.random().toString(36).substr(2, 9);
    const newItems: OrderItem[] = [];
    const remainingItems: OrderItem[] = [];

    originalOrder.items.forEach(item => {
      const splitInfo = itemsToSplit.find(s => s.uniqueId === item.uniqueId);
      if (splitInfo) {
        if (splitInfo.quantity < item.quantity) {
          remainingItems.push({ ...item, quantity: item.quantity - splitInfo.quantity });
          newItems.push({ ...item, uniqueId: Math.random().toString(36).substr(2, 9), quantity: splitInfo.quantity });
        } else {
          newItems.push(item);
        }
      } else {
        remainingItems.push(item);
      }
    });

    if (newItems.length === 0) return;

    const newSubtotal = newItems.reduce((s, i) => s + (i.price * i.quantity), 0);
    const remainingSubtotal = remainingItems.reduce((s, i) => s + (i.price * i.quantity), 0);

    const newOrder: Order = {
      ...originalOrder,
      id: newOrderId,
      orderNumber: `${originalOrder.orderNumber}-S`,
      items: newItems,
      subtotal: newSubtotal,
      total: newSubtotal,
      timeline: [{ status: originalOrder.status, time: new Date(), note: 'Split from original order' }]
    };

    setActiveOrders(prev => [
      newOrder,
      ...prev.map(o => o.id === orderId ? {
        ...o,
        items: remainingItems,
        subtotal: remainingSubtotal,
        total: remainingSubtotal,
        timeline: [...o.timeline, { status: o.status, time: new Date(), note: 'Items split to new order' }]
      } : o)
    ]);
  };

  const refundOrder = (orderId: string, amount: number, items: { uniqueId: string, quantity: number }[]) => {
    setActiveOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        total: o.total - amount,
        refundedAmount: (o.refundedAmount || 0) + amount,
        timeline: [...o.timeline, { status: o.status, time: new Date(), note: `Refunded ${amount}` }]
      };
    }));

    addFinancialTransaction({
      shiftId: currentShift?.id || 's1',
      cashierId: currentUser?.id || 'c1',
      type: FinancialTransactionType.REFUND,
      amount,
      reason: `Refund for order ${orderId}`,
    });
  };

  const submitOrder = (status: OrderStatus, paymentMethod?: PaymentMethod, discount: number = 0, customerDetails?: { name: string, phone: string, note?: string }) => {
    if (!currentUser || currentCart.length === 0) return;
    const subtotal = currentCart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const total = subtotal - discount;
    
    if (paymentMethod === PaymentMethod.WALLET && currentUser.balance < total) {
      addNotification('الرصيد غير كافٍ في المحفظة لإتمام العملية');
      return;
    }
    
    // Check if we should merge with an existing table order
    if (selectedTable && selectedTable.status === TableStatus.OCCUPIED && selectedTable.currentOrderId && !editingOrderId) {
      const existingOrder = activeOrders.find(o => o.id === selectedTable.currentOrderId);
      if (existingOrder) {
        const updatedItems = [...existingOrder.items, ...currentCart];
        const updatedSubtotal = updatedItems.reduce((s, i) => s + (i.price * i.quantity), 0);
        const updatedTotal = updatedSubtotal - existingOrder.discount;

        setActiveOrders(p => p.map(o => o.id === existingOrder.id ? {
          ...o,
          items: updatedItems,
          subtotal: updatedSubtotal,
          total: updatedTotal,
          timeline: [...o.timeline, { status: o.status, time: new Date() }]
        } : o));

        setCurrentCart([]); setEditingOrderId(null); setSelectedTable(null);
        return;
      }
    }

    const existingOrder = editingOrderId ? activeOrders.find(o => o.id === editingOrderId) : null;
    const orderId = editingOrderId || Math.random().toString(36).substr(2, 9);
    
    // Determine status: 
    // 1. If customer, always PENDING_CONFIRMATION
    // 2. If explicitly closing or canceling, use that status
    // 3. If staff editing, keep existing status unless it was PENDING_CONFIRMATION
    // 4. If new staff order, use status passed from POS (usually PENDING or DELIVERED)
    let finalStatus = status;
    if (userRole === 'CUSTOMER') {
      finalStatus = OrderStatus.PENDING_CONFIRMATION;
    } else if (existingOrder) {
      if (status === OrderStatus.DELIVERED || status === OrderStatus.CANCELED) {
        finalStatus = status;
      } else {
        finalStatus = existingOrder.status === OrderStatus.PENDING_CONFIRMATION ? OrderStatus.CONFIRMED : existingOrder.status;
      }
    }
    
    const newOrder: Order = {
      id: orderId,
      orderNumber: existingOrder?.orderNumber || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      type: cartOrderType, 
      status: finalStatus, 
      items: [...currentCart], 
      customerId: currentUser.id, 
      tableId: selectedTable?.id, 
      branchId: currentUser.branchId || 'b1', 
      createdAt: existingOrder?.createdAt || new Date(), 
      subtotal, 
      tax: 0, 
      discount, 
      total, 
      paymentMethod, 
      customerName: customerDetails?.name || existingOrder?.customerName,
      customerPhone: customerDetails?.phone || existingOrder?.customerPhone,
      note: customerDetails?.note || existingOrder?.note,
      timeline: existingOrder ? [...existingOrder.timeline, { status: finalStatus, time: new Date() }] : [{ status: finalStatus, time: new Date() }]
    };

    if (finalStatus === OrderStatus.COMPLETED || finalStatus === OrderStatus.DELIVERED) {
      addFinancialTransaction({
        shiftId: currentShift?.id || 's1',
        cashierId: currentUser.id,
        type: FinancialTransactionType.SALE,
        amount: total,
        reason: `Order #${newOrder.orderNumber}`,
      });
    }

    if (paymentMethod === PaymentMethod.WALLET) {
      setCurrentUser({ ...currentUser, balance: currentUser.balance - total });
    }

    if (editingOrderId) {
      setActiveOrders(p => p.map(o => o.id === editingOrderId ? newOrder : o));
    } else {
      setActiveOrders(p => [newOrder, ...p]);
    }

    // Update table status if it's a dine-in order
    if (selectedTable) {
      const tableStatus = finalStatus === OrderStatus.DELIVERED ? TableStatus.PAID : TableStatus.OCCUPIED;
      updateTableStatus(selectedTable.id, tableStatus, { 
        currentOrderId: orderId, 
        seatedAt: selectedTable.status === TableStatus.PAID ? new Date() : (selectedTable.seatedAt || new Date()) 
      });
    }

    setCurrentCart([]); setEditingOrderId(null); setSelectedTable(null);
  };

  const completeOrder = (orderId: string, payment: { method: string | PaymentMethod }) => {
    setActiveOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        // If it was a dine-in order, set table to PAID
        if (o.tableId) {
          updateTableStatus(o.tableId, TableStatus.PAID);
        }
        return { ...o, status: OrderStatus.DELIVERED, paymentMethod: payment.method as PaymentMethod };
      }
      return o;
    }));
  };

  const saveNewCard = (card: Omit<SavedCard, 'id'>) => {
    if (!currentUser) return;
    const newCard: SavedCard = { ...card, id: 'card_' + Math.random().toString(36).substr(2, 5) };
    setCurrentUser({ ...currentUser, savedCards: [...currentUser.savedCards, newCard] });
  };

  const clearCart = () => {
    setCurrentCart([]);
    setEditingOrderId(null);
    setSelectedTable(null);
  };

  const voidOrder = (orderId: string) => {
    setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: OrderStatus.CANCELED } : o));
    const order = activeOrders.find(o => o.id === orderId);
    if (order?.tableId) {
      updateTableStatus(order.tableId, TableStatus.AVAILABLE, { currentOrderId: undefined, seatedAt: undefined });
    }
  };

  const loadOrderToPOS = (order: Order) => {
    setCurrentCart(order.items);
    setEditingOrderId(order.id);
    setCartOrderType(order.type);
    if (order.tableId) {
      const table = tables.find(t => t.id === order.tableId);
      if (table) setSelectedTable(table);
    }
  };

  const reorder = (orderId: string) => {
    const order = activeOrders.find(o => o.id === orderId);
    if (order) {
      setCurrentCart(order.items);
      setEditingOrderId(null);
      setCartOrderType(order.type);
    }
  };

  const addToCart = (item: MenuItem, customization?: any) => {
    setCurrentCart(prev => {
      const existingItemIndex = prev.findIndex(i => i.itemId === item.id && !customization);
      if (existingItemIndex > -1) {
        const newCart = [...prev];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + 1
        };
        return newCart;
      }

      let price = item.price;
      if (cartOrderType === OrderType.DINE_IN && item.dineInPrice) price = item.dineInPrice;
      else if (cartOrderType === OrderType.TAKEAWAY && item.takeawayPrice) price = item.takeawayPrice;
      else if (cartOrderType === OrderType.DELIVERY && item.deliveryPrice) price = item.deliveryPrice;
      
      // Check for active offer
      if (item.offerPrice && item.offerStartDate && item.offerEndDate) {
        const now = new Date();
        const start = new Date(item.offerStartDate);
        const end = new Date(item.offerEndDate);
        if (now >= start && now <= end) {
          price = item.offerPrice;
        }
      }

      const newOrderItem: OrderItem = { 
        itemId: item.id, 
        uniqueId: Math.random().toString(36).substr(2, 9), 
        name: item.nameAr, 
        quantity: 1, 
        basePrice: price, 
        price: price, 
        departmentId: item.departmentId,
        status: OrderStatus.PREPARING,
        ...customization 
      };
      return [...prev, newOrderItem];
    });
  };
  const removeFromCart = (uniqueId: string) => setCurrentCart(prev => prev.filter(i => i.uniqueId !== uniqueId));
  const updateCartQuantity = (uniqueId: string, delta: number) => setCurrentCart(prev => prev.map(i => i.uniqueId === uniqueId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  const updateCartItem = (uniqueId: string, updates: Partial<OrderItem>) => setCurrentCart(prev => prev.map(i => i.uniqueId === uniqueId ? { ...i, ...updates } : i));


  const deliverOrder = (orderId: string) => {
    setActiveOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        // If it was a dine-in order, set table to cleaning
        if (o.tableId) {
          updateTableStatus(o.tableId, TableStatus.CLEANING, { currentOrderId: undefined, seatedAt: undefined });
        }
        return { 
          ...o, 
          status: OrderStatus.DELIVERED, 
          shelfLocation: undefined,
          timeline: [...o.timeline, { status: OrderStatus.DELIVERED, time: new Date() }]
        };
      }
      return o;
    }));
  };
  
  const assignShelfToOrder = (orderId: string, shelf: string) => {
    setActiveOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        addNotification(`تم تخصيص الرف ${shelf} للطلب #${o.orderNumber.split('-').pop()}`);
        return { ...o, shelfLocation: shelf };
      }
      return o;
    }));
  };

  const collectOrderItemByAggregator = (orderId: string, itemUniqueId: string) => {
    setActiveOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updatedItems = o.items.map(item => {
          if (item.uniqueId === itemUniqueId) {
            return { ...item, status: OrderStatus.COLLECTED };
          }
          return item;
        });
        
        // Check if all items are now READY or COLLECTED
        const allReady = updatedItems.every(i => i.status === OrderStatus.READY || i.status === OrderStatus.COLLECTED || i.status === OrderStatus.DELIVERED);
        
        let newStatus = o.status;
        if (allReady && o.status !== OrderStatus.READY) {
          newStatus = OrderStatus.READY;
        }

        return { ...o, items: updatedItems, status: newStatus };
      }
      return o;
    }));
  };

  const toggleFavorite = (itemId: string) => {
    if (!currentUser) return;
    const isFav = currentUser.favorites.includes(itemId);
    setCurrentUser({ ...currentUser, favorites: isFav ? currentUser.favorites.filter(id => id !== itemId) : [...currentUser.favorites, itemId] });
  };
  const setOrderType = (type: OrderType) => setCartOrderType(type);

  return (
    <AppContext.Provider value={{
      activeOrders, currentUser, currentCart, cartOrderType, userRole,
      branches, departments, jobTitles, jobTypes, employees,
      menuItems, customers,
      addBranch, updateBranch, deleteBranch,
      addDepartment, updateDepartment, deleteDepartment,
      addJobTitle, updateJobTitle, deleteJobTitle,
      addJobType, updateJobType, deleteJobType,
      addEmployee, updateEmployee, deleteEmployee,
      addMenuItem, updateMenuItem, deleteMenuItem,
      addCustomer, updateCustomer, deleteCustomer, addCustomerAddress, removeCustomerAddress, toggleBlockCustomer, adjustCustomerPoints, adjustCustomerBalance,
      login, logout, addToCart, removeFromCart, updateCartQuantity, updateCartItem, updateOrderItemStatus, updateOrderStatus, cancelOrder, transferOrder, mergeOrders, splitOrder, refundOrder, submitOrder, depositToWallet, refundToWallet, saveNewCard, toggleFavorite, setOrderType,
      reorder,
      tables, selectedTable, setSelectedTable, updateTableStatus, transferTable, mergeTables, editingOrderId, clearCart, voidOrder, completeOrder, loadOrderToPOS, confirmOrder, deliverOrder, assignShelfToOrder, collectOrderItemByAggregator, currentShift, shifts, openShift, closeShift,
      financialTransactions, addFinancialTransaction,
      feedbacks, addFeedback, updateFeedback,
      notifications, addNotification, markNotificationRead,
      staffTasks, addTask, updateTask,
      tableAssignments, assignTable,
      seatTable,
      attendances, workSchedules, activityLogs,
      checkIn, 
      checkOut, 
      recordAttendance,
      deleteAttendance,
      addActivityLog, 
      updateWorkSchedule
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
