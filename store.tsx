import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  Branch,
  Department,
  MenuItem,
  Order,
  OrderItem,
  Table,
  Shift,
  Employee,
  Customer,
  Supplier,
  BankAccount,
  FinancialTransaction,
  JobTitle,
  ActivityLog,
  OrderStatus,
  OrderType,
  PaymentMethod,
  TableStatus,
} from './types';
import { TABLES } from './constants';

interface AppState {
  // Auth
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;

  // User Role
  userRole: string | null;

  // Branches & Departments
  branches: Branch[];
  departments: Department[];
  setBranches: (branches: Branch[]) => void;
  setDepartments: (departments: Department[]) => void;

  // Menu Items
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;

  // Orders
  orders: Order[];
  activeOrders: Order[];
  setOrders: (orders: Order[]) => void;
  setActiveOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Tables
  tables: Table[];
  setTables: (tables: Table[]) => void;
  selectedTable: Table | null;
  setSelectedTable: (table: Table | null) => void;
  updateTableStatus: (tableId: string, status: TableStatus, options?: { currentOrderId?: string; seatedAt?: Date }) => void;
  transferTable: (fromId: string, toId: string) => void;
  mergeTables: (tableIds: string[]) => void;
  seatTable: (tableId: string, guests: number) => void;
  loadOrderToPOS: (orderId: string) => void;
  orderType: string;
  setOrderType: (type: string) => void;

  // Shifts
  currentShift: Shift | null;
  setCurrentShift: (shift: Shift | null) => void;
  openShift: (shift: Shift) => void;
  closeShift: () => void;

  // Employees
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (id: string) => void;

  // Job Titles
  jobTitles: JobTitle[];
  setJobTitles: (jobTitles: JobTitle[]) => void;

  // Customers
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  adjustCustomerPoints: (customerId: string, points: number) => void;
  adjustCustomerBalance: (customerId: string, amount: number) => void;

  // Suppliers
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;

  // Bank Accounts
  bankAccounts: BankAccount[];
  setBankAccounts: (accounts: BankAccount[]) => void;
  addBankAccount: (account: BankAccount) => void;
  updateBankAccount: (account: BankAccount) => void;
  deleteBankAccount: (id: string) => void;

  // Financial Transactions
  financialTransactions: FinancialTransaction[];
  setFinancialTransactions: (transactions: FinancialTransaction[]) => void;
  addFinancialTransaction: (transaction: FinancialTransaction) => void;

  // Activity Logs
  activityLogs: ActivityLog[];
  setActivityLogs: (logs: ActivityLog[]) => void;
  addActivityLog: (log: ActivityLog) => void;

  // Notifications
  notifications: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(React.Fragment, null, children);
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      currentUser: null,
      isLoggedIn: false,
      userRole: null,
      login: (user: User) => set({ currentUser: user, isLoggedIn: true, userRole: user.role }),
      logout: () => set({ currentUser: null, isLoggedIn: false, userRole: null, currentShift: null }),

      // Branches & Departments
      branches: [],
      departments: [],
      setBranches: (branches) => set({ branches }),
      setDepartments: (departments) => set({ departments }),

      // Menu Items
      menuItems: [],
      setMenuItems: (menuItems) => set({ menuItems }),
      addMenuItem: (item) => set((state) => ({ menuItems: [...state.menuItems, item] })),
      updateMenuItem: (item) =>
        set((state) => ({
          menuItems: state.menuItems.map((i) => (i.id === item.id ? item : i)),
        })),
      deleteMenuItem: (id) =>
        set((state) => ({
          menuItems: state.menuItems.filter((i) => i.id !== id),
        })),

      // Orders
      orders: [],
      activeOrders: [],
      setOrders: (orders) => set({ orders }),
      setActiveOrders: (activeOrders) => set({ activeOrders }),
      addOrder: (order) =>
        set((state) => ({
          orders: [...state.orders, order],
          activeOrders: order.status === 'PENDING' || order.status === 'PREPARING' || order.status === 'IN_PROGRESS'
            ? [...state.activeOrders, order]
            : state.activeOrders,
        })),
      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
          activeOrders:
            status === 'COMPLETED' || status === 'CANCELED' || status === 'REFUNDED'
              ? state.activeOrders.filter((o) => o.id !== orderId)
              : state.activeOrders.map((o) => (o.id === orderId ? { ...o, status } : o)),
        })),

      // Tables
      tables: TABLES,
      setTables: (tables) => set({ tables }),
      selectedTable: null,
      setSelectedTable: (table) => set({ selectedTable: table }),
      updateTableStatus: (tableId, status, options) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? { ...t, status, ...(options?.currentOrderId ? { currentOrderId: options.currentOrderId } : {}), ...(options?.seatedAt ? { seatedAt: options.seatedAt } : {}) }
              : t
          ),
        })),
      transferTable: (fromId, toId) =>
        set((state) => {
          const fromTable = state.tables.find((t) => t.id === fromId);
          const toTable = state.tables.find((t) => t.id === toId);
          if (!fromTable || !toTable) return state;
          return {
            tables: state.tables.map((t) => {
              if (t.id === fromId) return { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined, seatedAt: undefined };
              if (t.id === toId) return { ...t, status: fromTable.status, currentOrderId: fromTable.currentOrderId, seatedAt: fromTable.seatedAt };
              return t;
            }),
          };
        }),
      mergeTables: (tableIds) => {
        // Merge logic - mark tables as merged
        set((state) => ({
          tables: state.tables.map((t) =>
            tableIds.includes(t.id) && t.id !== tableIds[0]
              ? { ...t, mergedWithId: tableIds[0] }
              : t
          ),
        }));
      },
      seatTable: (tableId, guests) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? { ...t, status: TableStatus.OCCUPIED, seatedAt: new Date() }
              : t
          ),
        })),
      loadOrderToPOS: (orderId) => {
        // Load order to POS - this is mainly a navigation hint
        console.debug("loadOrderToPOS", orderId);
      },
      orderType: "dine_in",
      setOrderType: (type) => set({ orderType: type }),

      // Shifts
      currentShift: null,
      setCurrentShift: (currentShift) => set({ currentShift }),
      openShift: (shift) => set({ currentShift: shift }),
      closeShift: () => set({ currentShift: null }),

      // Employees
      employees: [],
      setEmployees: (employees) => set({ employees }),
      addEmployee: (employee) =>
        set((state) => ({ employees: [...state.employees, employee] })),
      updateEmployee: (employee) =>
        set((state) => ({
          employees: state.employees.map((e) => (e.id === employee.id ? employee : e)),
        })),
      deleteEmployee: (id) =>
        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id),
        })),

      // Job Titles
      jobTitles: [],
      setJobTitles: (jobTitles) => set({ jobTitles }),

      // Customers
      customers: [],
      setCustomers: (customers) => set({ customers }),
      addCustomer: (customer) =>
        set((state) => ({ customers: [...state.customers, customer] })),
      updateCustomer: (customer) =>
        set((state) => ({
          customers: state.customers.map((c) => (c.id === customer.id ? customer : c)),
        })),
      deleteCustomer: (id) =>
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        })),
      adjustCustomerPoints: (customerId, points) =>
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === customerId ? { ...c, points: c.points + points } : c
          ),
        })),
      adjustCustomerBalance: (customerId, amount) =>
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === customerId ? { ...c, balance: c.balance + amount } : c
          ),
        })),

      // Suppliers
      suppliers: [],
      setSuppliers: (suppliers) => set({ suppliers }),
      addSupplier: (supplier) =>
        set((state) => ({ suppliers: [...state.suppliers, supplier] })),
      updateSupplier: (supplier) =>
        set((state) => ({
          suppliers: state.suppliers.map((s) => (s.id === supplier.id ? supplier : s)),
        })),
      deleteSupplier: (id) =>
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id),
        })),

      // Bank Accounts
      bankAccounts: [],
      setBankAccounts: (bankAccounts) => set({ bankAccounts }),
      addBankAccount: (account) =>
        set((state) => ({ bankAccounts: [...state.bankAccounts, account] })),
      updateBankAccount: (account) =>
        set((state) => ({
          bankAccounts: state.bankAccounts.map((a) => (a.id === account.id ? account : a)),
        })),
      deleteBankAccount: (id) =>
        set((state) => ({
          bankAccounts: state.bankAccounts.filter((a) => a.id !== id),
        })),

      // Financial Transactions
      financialTransactions: [],
      setFinancialTransactions: (financialTransactions) => set({ financialTransactions }),
      addFinancialTransaction: (transaction) =>
        set((state) => ({
          financialTransactions: [...state.financialTransactions, transaction],
        })),

      // Activity Logs
      activityLogs: [],
      setActivityLogs: (activityLogs) => set({ activityLogs }),
      addActivityLog: (log) =>
        set((state) => ({
          activityLogs: [...state.activityLogs, log],
        })),

      // Notifications
      notifications: [],
      addNotification: (message, type = 'info') => {
        const id = Date.now().toString();
        set((state) => ({
          notifications: [...state.notifications, { id, message, type }],
        }));
        setTimeout(() => {
          get().removeNotification(id);
        }, 5000);
      },
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
    }),
    {
      name: 'o2-company-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isLoggedIn: state.isLoggedIn,
        userRole: state.userRole,
        currentShift: state.currentShift,
        branches: state.branches,
        departments: state.departments,
      }),
    }
  )
);