/**
 * AccountingPortal.tsx — المرحلة 1 (Subledger Support)
 *
 * التحديثات:
 * 1. استخدام ViewJournalModal الجديد (يجلب entries بنفسه مع subledger)
 * 2. toJournalShape يحفظ subledger_type/id/name
 * 3. selectedTransactionId بدلاً من selectedJournalEntryId
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  FileText,
  Calendar,
  Layers,
  AlertCircle,
  X,
  RefreshCw,
  Plus,
  UserPlus,
  Truck,
  Percent,
} from "lucide-react";

import { useApp } from "../../../../store";
import { useAccounting } from "../../../hooks/useAccounting";
import { accountService } from "../../../services/accountingService";
import { branchService } from "../../../services/branchService";
import type {
  Account,
  Transaction,
  CostCenter,
} from "../../../services/accountingService";

import { AccountingDashboard } from "./AccountingDashboard";
import { FiscalYearsView, CostCentersView } from "./GLSubViews";
import { EnterpriseJournalView as JournalView } from "./EnterpriseJournalView";
import { JournalEntriesWorkspace } from "./journal/JournalEntriesWorkspace";
import {
  COATree,
  AccountDetailPanel,
  AccountEmptyState,
} from "./COAComponents";
import EmployeePortal from "../employees/EmployeePortal";
import type { COAWithRollup, LedgerFilter, LedgerLine } from "./COAComponents";
import { CashBankTab, ARTab, APTab } from "./ARAPCashTabs";
import { EmployeesTab } from "./EmployeesTab";
import {
  AddCOAModal,
  EditCOAModal,
  AddJournalModal,
  AddCostCenterModal,
  EditCostCenterModal,
} from "./AccountingModals";

// ✅ ViewJournalModal الجديد — مستقل يجلب بياناته بنفسه
import ViewJournalModal from "./ViewJournalModal";
import CustomerPortal from "../customers/CustomerPortal";
import SupplierPortal from "../suppliers/SupplierPortal";
import { DiscountManagementPortal } from "../discounts/DiscountManagementPortal";

type ActiveTab = "DASHBOARD" | "GL" | "AR" | "AP" | "CASH" | "HR" | "DISCOUNTS";
type GLSubTab = "YEARS" | "COA" | "COST_CENTERS" | "JOURNAL" | "LEDGER";
type ModalType =
  | "ADD_COA"
  | "ADD_JOURNAL"
  | "EDIT_COA"
  | "VIEW_JOURNAL"
  | "ADD_COST_CENTER"
  | "EDIT_COST_CENTER"
  | null;

// ─── تحويل Account API → COAWithRollup ───────────────────────────────────────

function toCoaShape(acc: Account): COAWithRollup {
  return {
    id: String(acc.id),
    code: acc.code,
    name: acc.name,
    nameAr: acc.name,
    type: acc.type as any,
    parentId: acc.parent ? String(acc.parent.id) : null,
    isPosting: acc.allow_posting,
    balance: acc.balance ?? 0,
    displayBalance: acc.balance ?? 0,
    level: acc.level,
    is_system: acc.is_system,
    is_active: acc.is_active,
    children: acc.children?.map(toCoaShape) ?? [],
  };
}

// ─── Helper functions ────────────────────────────────────────────────────────

function toJournalShape(tx: Transaction) {
  return toJournalShapeEnterprise(tx);
}

function toCostCenterShape(cc: CostCenter) {
  return {
    id: String(cc.id),
    nameAr: cc.name,
    code: cc.code ?? "",
    type: cc.type?.toUpperCase() ?? "OPERATIONAL",
    parentId: cc.parent ? String(cc.parent.id) : undefined,
    is_active: cc.is_active,
    notes: cc.notes ?? "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AccountingPortal: React.FC<{ initialTab?: ActiveTab }> = ({
  initialTab = "DASHBOARD",
}) => {
  const acc = useAccounting();
  const app = useApp();

  // ── جلب الأفرع من API ───────────────────────────────────────────
  const [branchesFromApi, setBranchesFromApi] = useState<
    { id: string; name: string; currency?: string }[]
  >([]);
  useEffect(() => {
    branchService
      .getAll()
      .then((data) => {
        setBranchesFromApi(
          data.map((b) => ({
            id: String(b.id),
            name: b.name,
            currency: (b as any).currency ?? undefined,
          })),
        );
      })
      .catch(() => {
        // استخدم الفروع من store إن فشل API
        setBranchesFromApi(
          app.branches?.length
            ? app.branches.map((branch) => ({
              id: String(branch.id),
              name: branch.name,
              currency: (branch as any).currency ?? undefined,
            }))
            : [],
        );
      });
  }, []);

  // ── جلب الموردين من API بدلاً من store ───────────────────────────
  const [suppliersFromApi, setSuppliersFromApi] = useState<
    { id: number; name: string; code?: string }[]
  >([]);
  useEffect(() => {
    import("../../../services/supplierService").then(({ supplierService }) => {
      supplierService
        .list({ per_page: 200, status: "active" })
        .then((data) => {
          const items = Array.isArray(data.data)
            ? data.data
            : data.data?.data || [];
          setSuppliersFromApi(
            items.map((s: any) => ({
              id: s.id,
              name: s.name,
              code: s.code,
            })),
          );
        })
        .catch(() => {
          setSuppliersFromApi(
            app.suppliers?.map((supplier: any) => ({
              id: supplier.id,
              name: supplier.name,
              code: supplier.phone,
            })) ?? [],
          );
        });
    });
  }, []);

  // ── جلب العملاء من API بدلاً من store ────────────────────────────
  const [customersFromApi, setCustomersFromApi] = useState<
    { id: number; name: string; code?: string }[]
  >([]);
  useEffect(() => {
    import("../../../services/customerService").then(({ customerService }) => {
      customerService
        .list({ per_page: 200, status: "active" })
        .then((data) => {
          const items = Array.isArray(data.data)
            ? data.data
            : data.data?.data || [];
          setCustomersFromApi(
            items.map((c: any) => ({
              id: c.id,
              name: c.name,
              code: c.code,
            })),
          );
        })
        .catch(() => {
          setCustomersFromApi(
            app.customers?.map((c: any) => ({
              id: c.id,
              name: c.name,
              code: c.phone,
            })) ?? [],
          );
        });
    });
  }, []);

  // دمج الأفرع: من API إن وجدت، وإلا من store
  const allBranches = useMemo(() => {
    if (branchesFromApi.length > 0) return branchesFromApi;
    return app.branches?.length
      ? app.branches.map((branch) => ({
        id: String(branch.id),
        name: branch.name,
        currency: (branch as any).currency ?? undefined,
      }))
      : [];
  }, [branchesFromApi, app.branches]);

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [glSubTab, setGlSubTab] = useState<GLSubTab>("COA");
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  // ✅ رقم الـ transaction المختار (بدلاً من string entry ID)
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    number | null
  >(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);

  // ── Create Customer Modal State ─────────────────────────────────────────────
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    name_en: "",
    status: "active",
    category: "regular",
    phone: "",
    mobile: "",
    email: "",
    address: "",
    city: "",
    currency: "ILS",
    payment_terms: "due_on_receipt",
    credit_limit: 0,
    opening_balance: 0,
    notes: "",
    gps_link: "",
  });
  const updateCustomerField = useCallback((field: string, value: any) => {
    setCustomerForm((prev) => ({ ...prev, [field]: value }));
  }, []);
  const handleCreateCustomer = useCallback(async () => {
    if (!customerForm.name.trim()) return;
    setCreating(true);
    try {
      const { customerService } =
        await import("../../../services/customerService");
      await customerService.create({
        name: customerForm.name,
        name_en: customerForm.name_en || undefined,
        status: customerForm.status,
        category: customerForm.category,
        phone: customerForm.phone || undefined,
        mobile: customerForm.mobile || undefined,
        email: customerForm.email || undefined,
        address: customerForm.address || undefined,
        city: customerForm.city || undefined,
        currency: customerForm.currency,
        payment_terms: customerForm.payment_terms,
        credit_limit: customerForm.credit_limit,
        opening_balance: customerForm.opening_balance,
        notes: customerForm.notes || undefined,
        gps_link: customerForm.gps_link || undefined,
      });
      setShowCreateCustomer(false);
      setCustomerForm({
        name: "",
        name_en: "",
        status: "active",
        category: "regular",
        phone: "",
        mobile: "",
        email: "",
        address: "",
        city: "",
        currency: "ILS",
        payment_terms: "due_on_receipt",
        credit_limit: 0,
        opening_balance: 0,
        notes: "",
        gps_link: "",
      });
      // Refresh customers list
      const { customerService: cs } =
        await import("../../../services/customerService");
      cs.list({ per_page: 200, status: "active" })
        .then((data) => {
          const items = Array.isArray(data.data)
            ? data.data
            : data.data?.data || [];
          setCustomersFromApi(
            items.map((c: any) => ({ id: c.id, name: c.name, code: c.code })),
          );
        })
        .catch(() => { });
    } catch (err) {
      console.error("Failed to create customer:", err);
    } finally {
      setCreating(false);
    }
  }, [customerForm]);
  // ── Create Supplier Modal State ─────────────────────────────────────────────
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    name_en: "",
    status: "active",
    category: "regular",
    phone: "",
    mobile: "",
    email: "",
    address: "",
    city: "",
    currency: "ILS",
    payment_terms: "due_on_receipt",
    credit_limit: 0,
    opening_balance: 0,
    notes: "",
    gps_link: "",
  });
  const updateSupplierField = useCallback((field: string, value: any) => {
    setSupplierForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleCreateSupplier = useCallback(async () => {
    if (!supplierForm.name.trim()) return;
    setCreating(true);
    try {
      const { supplierService } =
        await import("../../../services/supplierService");
      await supplierService.create({
        name: supplierForm.name,
        name_en: supplierForm.name_en || undefined,
        status: supplierForm.status,
        category: supplierForm.category,
        phone: supplierForm.phone || undefined,
        mobile: supplierForm.mobile || undefined,
        email: supplierForm.email || undefined,
        address: supplierForm.address || undefined,
        city: supplierForm.city || undefined,
        currency: supplierForm.currency,
        payment_terms: supplierForm.payment_terms,
        credit_limit: supplierForm.credit_limit,
        opening_balance: supplierForm.opening_balance,
        notes: supplierForm.notes || undefined,
        gps_link: supplierForm.gps_link || undefined,
      });
      setShowCreateSupplier(false);
      setSupplierForm({
        name: "",
        name_en: "",
        status: "active",
        category: "regular",
        phone: "",
        mobile: "",
        email: "",
        address: "",
        city: "",
        currency: "ILS",
        payment_terms: "due_on_receipt",
        credit_limit: 0,
        opening_balance: 0,
        notes: "",
        gps_link: "",
      });
    } catch (err) {
      console.error("Failed to create supplier:", err);
    } finally {
      setCreating(false);
    }
  }, [supplierForm]);
  const openModal = (type: ModalType) => {
    setModalType(type);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
  };

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>({
    type: "ALL",
  });
  const [ledgerLines, setLedgerLines] = useState<LedgerLine[]>([]);
  const [ledgerOpeningBalance, setLedgerOpeningBalance] = useState(0);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [coaSearchQuery, setCoaSearchQuery] = useState("");

  const toggleNode = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const [coaForm, setCoaForm] = useState<Partial<any>>({
    type: "asset",
    isPosting: true,
  });
  const [journalForm, setJournalForm] = useState(emptyJournalForm());
  const [costCenterForm, setCostCenterForm] = useState<Partial<any>>({
    type: "operational",
    is_active: true,
  });

  // ── transforms ──────────────────────────────────────────────────────────────
  const flatAccounts = useMemo(
    () => acc.accounts.map(toCoaShape),
    [acc.accounts],
  );
  const journalEntries = useMemo(
    () => acc.transactions.map(toJournalShape),
    [acc.transactions],
  );
  const costCentersView = useMemo(
    () => acc.costCenters.map(toCostCenterShape),
    [acc.costCenters],
  );

  const filteredAccounts = useMemo(() => {
    if (!coaSearchQuery) return flatAccounts;
    return flatAccounts.filter(
      (a) =>
        a.nameAr.toLowerCase().includes(coaSearchQuery.toLowerCase()) ||
        a.code.includes(coaSearchQuery),
    );
  }, [flatAccounts, coaSearchQuery]);

  const selectedAccount =
    flatAccounts.find((a) => a.id === selectedAccountId) ?? null;

  // ── stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const sum = (type: string) =>
      acc.accounts
        .filter((a) => a.type === type)
        .reduce((s, a) => s + (a.balance ?? 0), 0);
    const totalRevenue = sum("revenue");
    const totalExpenses = sum("expense");
    return {
      totalAssets: sum("asset"),
      totalLiabilities: sum("liability"),
      totalEquity: sum("equity"),
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
    };
  }, [acc.accounts]);

  // ── Ledger fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedAccountId) {
      setLedgerLines([]);
      setLedgerOpeningBalance(0);
      return;
    }
    const account = flatAccounts.find((a) => a.id === selectedAccountId);
    if (!account?.isPosting) {
      setLedgerLines([]);
      setLedgerOpeningBalance(0);
      return;
    }

    let cancelled = false;
    const fetchLedger = async () => {
      setLoadingLedger(true);
      setLedgerLines([]);
      setLedgerOpeningBalance(0);
      try {
        let from: string | undefined;
        let to: string | undefined;
        const now = new Date();

        switch (ledgerFilter.type) {
          case "LAST_WEEK":
            from = new Date(now.getTime() - 7 * 86400000)
              .toISOString()
              .split("T")[0];
            to = now.toISOString().split("T")[0];
            break;
          case "LAST_MONTH":
            from = new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              now.getDate(),
            )
              .toISOString()
              .split("T")[0];
            to = now.toISOString().split("T")[0];
            break;
          case "MONTH_TO_DATE":
            from = new Date(now.getFullYear(), now.getMonth(), 1)
              .toISOString()
              .split("T")[0];
            to = now.toISOString().split("T")[0];
            break;
          case "YEAR_TO_DATE":
            from = new Date(now.getFullYear(), 0, 1)
              .toISOString()
              .split("T")[0];
            to = now.toISOString().split("T")[0];
            break;
          case "RANGE":
            from = ledgerFilter.startDate;
            to = ledgerFilter.endDate;
            break;
          case "SPECIFIC":
            from = ledgerFilter.startDate;
            to = ledgerFilter.startDate;
            break;
          case "BEFORE":
            to = ledgerFilter.startDate;
            break;
          case "AFTER":
            from = ledgerFilter.startDate;
            break;
          default:
            from = "2020-01-01";
            to = now.toISOString().split("T")[0];
        }

        const data = await accountService.getLedger(Number(selectedAccountId), {
          from,
          to,
        });
        if (!cancelled) {
          setLedgerLines(data.lines ?? []);
          setLedgerOpeningBalance(data.opening_balance ?? 0);
        }
      } catch {
        if (!cancelled) setLedgerLines([]);
      } finally {
        if (!cancelled) setLoadingLedger(false);
      }
    };

    fetchLedger();
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, ledgerFilter]);

  // ── COA handlers ──────────────────────────────────────────────────────────────
  const handleOpenAddRoot = async () => {
    setCoaForm({ type: "asset", isPosting: true, code: "" });
    openModal("ADD_COA");
    try {
      const suggested = await accountService.suggestCode();
      setCoaForm((prev: any) => ({ ...prev, code: suggested }));
    } catch {
      /* لا بأس */
    }
  };

  const handleOpenAddChild = async () => {
    if (!selectedAccount) return;
    setCoaForm({
      parentId: selectedAccount.id,
      type: selectedAccount.type,
      isPosting: true,
      code: "",
      level: (selectedAccount.level ?? 1) + 1,
    });
    openModal("ADD_COA");
    try {
      const suggested = await accountService.suggestCode(
        Number(selectedAccount.id),
      );
      setCoaForm((prev: any) => ({ ...prev, code: suggested }));
    } catch {
      /* لا بأس */
    }
  };

  const handleSaveCOA = async () => {
    try {
      await acc.createAccount({
        name: coaForm.nameAr,
        code: coaForm.code,
        type: coaForm.type,
        allow_posting: coaForm.isPosting,
        parent_id: coaForm.parentId ? Number(coaForm.parentId) : null,
        normal_balance: ["asset", "expense"].includes(coaForm.type)
          ? "debit"
          : "credit",
        is_active: true,
      });
      closeModal();
    } catch {
      /* error handled in hook */
    }
  };

  const handleEditCOA = async () => {
    if (!coaForm.id) return;
    try {
      await acc.updateAccount(Number(coaForm.id), {
        name: coaForm.nameAr,
        code: coaForm.code,
        allow_posting: coaForm.isPosting,
      });
      closeModal();
    } catch {
      /* error handled in hook */
    }
  };

  const handleSaveJournal = async () => {
    const totalDebit = journalForm.lines.reduce(
      (s: number, l: any) => s + (l.debit || 0),
      0,
    );
    const totalCredit = journalForm.lines.reduce(
      (s: number, l: any) => s + (l.credit || 0),
      0,
    );
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      alert("القيد غير متوازن!");
      return;
    }
    try {
      const tx = await acc.createTransaction({
        date: journalForm.date,
        description: journalForm.description,
        type: journalForm.type || "journal",
        entries: journalForm.lines
          .filter((l: any) => l.accountId && (l.debit > 0 || l.credit > 0))
          .map((l: any, i: number) => ({
            account_id: Number(l.accountId),
            debit: l.debit || 0,
            credit: l.credit || 0,
            description: l.description,
            sort_order: i,
            subledger_type: l.subledgerType && l.subledgerType !== "none" ? l.subledgerType : null,
            subledger_id: l.subledgerId ? Number(l.subledgerId) : null,
          })),
      });
      await acc.postTransaction(tx.id);
      closeModal();
      setJournalForm(emptyJournalForm());
      if (selectedAccountId) setLedgerFilter((f) => ({ ...f }));
    } catch {
      /* error handled in hook */
    }
  };

  const handleOpenPaymentVoucher = () => {
    setJournalForm(emptyJournalForm("payment"));
    openModal("ADD_JOURNAL");
  };

  // Used by EnterpriseJournalView (legacy) — keep reference to avoid unused-import TS error
  void JournalView;
  void handleSaveJournal;
  void handleOpenPaymentVoucher;

  const handleSaveCostCenter = async () => {
    try {
      await acc.createCostCenter({
        name: costCenterForm.nameAr || costCenterForm.name,
        code: costCenterForm.code,
        type: (costCenterForm.type || "operational").toLowerCase(),
        is_active: costCenterForm.is_active ?? true,
        parent_id: costCenterForm.parentId
          ? Number(costCenterForm.parentId)
          : null,
        notes: costCenterForm.notes,
      });
      closeModal();
    } catch {
      /* error handled in hook */
    }
  };

  const handleEditCostCenter = async () => {
    if (!costCenterForm.id) return;
    try {
      await acc.updateCostCenter(Number(costCenterForm.id), {
        name: costCenterForm.nameAr || costCenterForm.name,
        code: costCenterForm.code,
        type: (costCenterForm.type || "operational").toLowerCase(),
        is_active: costCenterForm.is_active ?? true,
        parent_id: costCenterForm.parentId
          ? Number(costCenterForm.parentId)
          : null,
        notes: costCenterForm.notes,
      });
      closeModal();
    } catch {
      /* error handled in hook */
    }
  };

  // ── page title ────────────────────────────────────────────────────────────────
  const pageTitle = (() => {
    if (activeTab === "DASHBOARD") return "لوحة التحكم المالية";
    if (activeTab === "GL") {
      const map: Record<GLSubTab, string> = {
        COA: "دليل الحسابات",
        JOURNAL: "قيود اليومية",
        YEARS: "السنوات المالية",
        COST_CENTERS: "مراكز التكلفة",
        LEDGER: "دفتر الأستاذ",
      };
      return map[glSubTab] ?? "دفتر الأستاذ";
    }
    const map: Record<ActiveTab, string> = {
      DASHBOARD: "لوحة التحكم",
      GL: "الدفتر العام",
      AR: "الذمم المدينة",
      AP: "الذمم الدائنة",
      CASH: "النقدية والبنوك",
      HR: "الموارد البشرية",
      DISCOUNTS: "إدارة الخصومات",
    };
    return map[activeTab];
  })();
  useEffect(() => {
    if (
      glSubTab === "JOURNAL" &&
      acc.transactions.length === 0 &&
      !acc.loading.transactions
    ) {
      acc.fetchTransactions({ per_page: 100, type: "journal" });
    }
  }, [glSubTab]);
  // ─── GL render ────────────────────────────────────────────────────────────────
  const renderGL = () => {
    return (
      <div className="flex flex-col h-full">
        <AnimatePresence mode="wait">
          {glSubTab === "COA" && (
            <motion.div
              key="coa_layout"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex gap-4 lg:gap-6 overflow-hidden"
            >
              {acc.loading.accounts ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <RefreshCw size={22} className="animate-spin ml-2" /> جاري
                  تحميل الحسابات...
                </div>
              ) : (
                <>
                  <COATree
                    filteredAccounts={filteredAccounts}
                    allAccounts={flatAccounts}
                    expandedNodes={expandedNodes}
                    selectedAccountId={selectedAccountId}
                    coaSearchQuery={coaSearchQuery}
                    setCoaSearchQuery={setCoaSearchQuery}
                    setSelectedAccountId={setSelectedAccountId}
                    toggleNode={toggleNode}
                    onAddRoot={handleOpenAddRoot}
                  />
                  {selectedAccount ? (
                    <AccountDetailPanel
                      selectedAccount={selectedAccount}
                      allAccountsWithRollup={flatAccounts}
                      ledgerLines={ledgerLines}
                      loadingLedger={loadingLedger}
                      openingBalance={ledgerOpeningBalance}
                      ledgerFilter={ledgerFilter}
                      setLedgerFilter={setLedgerFilter}
                      setGlSubTab={setGlSubTab}
                      setSelectedAccountId={setSelectedAccountId}
                      onEdit={() => {
                        setCoaForm({
                          ...selectedAccount,
                          parentId: selectedAccount.parentId,
                        });
                        openModal("EDIT_COA");
                      }}
                      onDelete={async () => {
                        if (
                          confirm(`حذف الحساب "${selectedAccount.nameAr}"؟`)
                        ) {
                          await acc.deleteAccount(Number(selectedAccount.id));
                          setSelectedAccountId(null);
                        }
                      }}
                      onAddChild={handleOpenAddChild}
                      setJournalForm={(form: any) => setJournalForm(form)}
                      setModalType={(type: string) =>
                        setModalType(type as ModalType)
                      }
                      setIsModalOpen={setIsModalOpen}
                    />
                  ) : (
                    <AccountEmptyState />
                  )}
                </>
              )}
            </motion.div>
          )}

          {glSubTab === "JOURNAL" && (
            <JournalEntriesWorkspace
              accounting={acc}
              branches={allBranches}
              customers={customersFromApi}
              suppliers={suppliersFromApi}
            />
          )}

          {glSubTab === "YEARS" && <FiscalYearsView />}

          {glSubTab === "COST_CENTERS" && (
            <CostCentersView
              costCenters={costCentersView}
              transactions={acc.transactions}
              onAdd={() => openModal("ADD_COST_CENTER")}
              setCostCenterForm={setCostCenterForm}
              setModalType={setModalType as any}
              setIsModalOpen={setIsModalOpen}
            />
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col gap-6 p-1 h-full min-h-0 overflow-auto text-right">
      {/* Error banner */}
      <AnimatePresence>
        {acc.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-rose-900/90 border border-rose-500/40 text-rose-100 text-sm font-bold px-5 py-3 rounded-2xl shadow-2xl backdrop-blur"
          >
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{acc.error}</span>
            <button
              onClick={acc.clearError}
              className="mr-2 text-rose-300 hover:text-white"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick action buttons for AR/AP */}
      {(activeTab === "AR" || activeTab === "AP") && (
        <div className="flex items-center gap-2">
          {activeTab === "AR" && (
            <button
              onClick={() => setShowCreateCustomer(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all text-xs font-bold"
            >
              <UserPlus size={14} /> إضافة عميل جديد
            </button>
          )}
          {activeTab === "AP" && (
            <button
              onClick={() => setShowCreateSupplier(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/30 transition-all text-xs font-bold"
            >
              <Truck size={14} /> إضافة مورد جديد
            </button>
          )}
        </div>
      )}

      {/* Create Customer Modal — Full ERP Form */}
      <AnimatePresence>
        {showCreateCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateCustomer(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-slate-900 z-10">
                <h3 className="text-sm font-black text-white">
                  إضافة عميل جديد
                </h3>
                <button
                  onClick={() => setShowCreateCustomer(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {/* Basic Information */}
                <h4 className="text-xs font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">
                  معلومات أساسية
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      اسم العميل *
                    </label>
                    <input
                      value={customerForm.name}
                      onChange={(e) =>
                        updateCustomerField("name", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="أدخل اسم العميل"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الاسم بالإنجليزية
                    </label>
                    <input
                      value={customerForm.name_en}
                      onChange={(e) =>
                        updateCustomerField("name_en", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="English name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الحالة
                    </label>
                    <select
                      value={customerForm.status}
                      onChange={(e) =>
                        updateCustomerField("status", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                      <option value="blocked">محظور</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الفئة
                    </label>
                    <select
                      value={customerForm.category}
                      onChange={(e) =>
                        updateCustomerField("category", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="retail">تجزئة</option>
                      <option value="wholesale">جملة</option>
                      <option value="corporate">شركة</option>
                      <option value="government">حكومي</option>
                      <option value="service">خدمي</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الهاتف
                    </label>
                    <input
                      value={customerForm.phone}
                      onChange={(e) =>
                        updateCustomerField("phone", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="رقم الهاتف"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الجوال
                    </label>
                    <input
                      value={customerForm.mobile}
                      onChange={(e) =>
                        updateCustomerField("mobile", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="رقم الجوال"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    value={customerForm.email}
                    onChange={(e) =>
                      updateCustomerField("email", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      العنوان
                    </label>
                    <input
                      value={customerForm.address}
                      onChange={(e) =>
                        updateCustomerField("address", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="العنوان"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      المدينة
                    </label>
                    <input
                      value={customerForm.city}
                      onChange={(e) =>
                        updateCustomerField("city", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="المدينة"
                    />
                  </div>
                </div>

                {/* Financial Information */}
                <h4 className="text-xs font-bold text-emerald-400 border-b border-emerald-500/20 pb-2 pt-2">
                  معلومات مالية
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      العملة
                    </label>
                    <select
                      value={customerForm.currency}
                      onChange={(e) =>
                        updateCustomerField("currency", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="ILS">شيكل (ILS)</option>
                      <option value="JOD">دينار (JOD)</option>
                      <option value="USD">دولار (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      شروط الدفع
                    </label>
                    <select
                      value={customerForm.payment_terms}
                      onChange={(e) =>
                        updateCustomerField("payment_terms", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="immediate">فوري</option>
                      <option value="net15">15 يوم</option>
                      <option value="net30">30 يوم</option>
                      <option value="net60">60 يوم</option>
                      <option value="net90">90 يوم</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الحد الائتماني
                    </label>
                    <input
                      type="number"
                      value={customerForm.credit_limit}
                      onChange={(e) =>
                        updateCustomerField(
                          "credit_limit",
                          Number(e.target.value),
                        )
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الرصيد الافتتاحي
                    </label>
                    <input
                      type="number"
                      value={customerForm.opening_balance}
                      onChange={(e) =>
                        updateCustomerField(
                          "opening_balance",
                          Number(e.target.value),
                        )
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Advanced Section */}
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-white font-bold"
                >
                  {advancedOpen ? "▲" : "▼"} إعدادات متقدمة
                </button>
                {advancedOpen && (
                  <div className="space-y-3 pr-2 border-r border-white/5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">
                        ملاحظات
                      </label>
                      <textarea
                        value={customerForm.notes}
                        onChange={(e) =>
                          updateCustomerField("notes", e.target.value)
                        }
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        rows={2}
                        placeholder="ملاحظات..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">
                        رابط Google Maps
                      </label>
                      <input
                        value={customerForm.gps_link}
                        onChange={(e) =>
                          updateCustomerField("gps_link", e.target.value)
                        }
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateCustomer}
                  disabled={creating || !customerForm.name.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all"
                >
                  {creating ? (
                    <>
                      <RefreshCw
                        size={14}
                        className="animate-spin inline ml-1"
                      />{" "}
                      جاري الإضافة...
                    </>
                  ) : (
                    "إضافة العميل"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Supplier Modal — Full ERP Form */}
      <AnimatePresence>
        {showCreateSupplier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateSupplier(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-slate-900 z-10">
                <h3 className="text-sm font-black text-white">
                  إضافة مورد جديد
                </h3>
                <button
                  onClick={() => setShowCreateSupplier(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {/* Basic Information */}
                <h4 className="text-xs font-bold text-rose-400 border-b border-rose-500/20 pb-2">
                  معلومات أساسية
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      اسم المورد *
                    </label>
                    <input
                      value={supplierForm.name}
                      onChange={(e) =>
                        updateSupplierField("name", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="أدخل اسم المورد"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الاسم بالإنجليزية
                    </label>
                    <input
                      value={supplierForm.name_en}
                      onChange={(e) =>
                        updateSupplierField("name_en", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="English name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الحالة
                    </label>
                    <select
                      value={supplierForm.status}
                      onChange={(e) =>
                        updateSupplierField("status", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                      <option value="blocked">محظور</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الفئة
                    </label>
                    <select
                      value={supplierForm.category}
                      onChange={(e) =>
                        updateSupplierField("category", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="local">محلي</option>
                      <option value="international">دولي</option>
                      <option value="service">خدمي</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الهاتف
                    </label>
                    <input
                      value={supplierForm.phone}
                      onChange={(e) =>
                        updateSupplierField("phone", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="رقم الهاتف"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الجوال
                    </label>
                    <input
                      value={supplierForm.mobile}
                      onChange={(e) =>
                        updateSupplierField("mobile", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="رقم الجوال"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    value={supplierForm.email}
                    onChange={(e) =>
                      updateSupplierField("email", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      العنوان
                    </label>
                    <input
                      value={supplierForm.address}
                      onChange={(e) =>
                        updateSupplierField("address", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="العنوان"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      المدينة
                    </label>
                    <input
                      value={supplierForm.city}
                      onChange={(e) =>
                        updateSupplierField("city", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="المدينة"
                    />
                  </div>
                </div>

                {/* Financial Information */}
                <h4 className="text-xs font-bold text-emerald-400 border-b border-emerald-500/20 pb-2 pt-2">
                  معلومات مالية
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      العملة
                    </label>
                    <select
                      value={supplierForm.currency}
                      onChange={(e) =>
                        updateSupplierField("currency", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="ILS">شيكل (ILS)</option>
                      <option value="JOD">دينار (JOD)</option>
                      <option value="USD">دولار (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      شروط الدفع
                    </label>
                    <select
                      value={supplierForm.payment_terms}
                      onChange={(e) =>
                        updateSupplierField("payment_terms", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="immediate">فوري</option>
                      <option value="net15">15 يوم</option>
                      <option value="net30">30 يوم</option>
                      <option value="net60">60 يوم</option>
                      <option value="net90">90 يوم</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الحد الائتماني
                    </label>
                    <input
                      type="number"
                      value={supplierForm.credit_limit}
                      onChange={(e) =>
                        updateSupplierField(
                          "credit_limit",
                          Number(e.target.value),
                        )
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      الرصيد الافتتاحي
                    </label>
                    <input
                      type="number"
                      value={supplierForm.opening_balance}
                      onChange={(e) =>
                        updateSupplierField(
                          "opening_balance",
                          Number(e.target.value),
                        )
                      }
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Advanced Section */}
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-white font-bold"
                >
                  {advancedOpen ? "▲" : "▼"} إعدادات متقدمة
                </button>
                {advancedOpen && (
                  <div className="space-y-3 pr-2 border-r border-white/5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">
                        ملاحظات
                      </label>
                      <textarea
                        value={supplierForm.notes}
                        onChange={(e) =>
                          updateSupplierField("notes", e.target.value)
                        }
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        rows={2}
                        placeholder="ملاحظات..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">
                        رابط Google Maps
                      </label>
                      <input
                        value={supplierForm.gps_link}
                        onChange={(e) =>
                          updateSupplierField("gps_link", e.target.value)
                        }
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none"
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateSupplier}
                  disabled={creating || !supplierForm.name.trim()}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all"
                >
                  {creating ? (
                    <>
                      <RefreshCw
                        size={14}
                        className="animate-spin inline ml-1"
                      />{" "}
                      جاري الإضافة...
                    </>
                  ) : (
                    "إضافة المورد"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saving overlay */}
      <AnimatePresence>
        {acc.loading.saving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl px-8 py-5 flex items-center gap-3 shadow-2xl">
              <RefreshCw size={18} className="animate-spin text-red-400" />
              <span className="text-sm font-black text-white">
                جاري الحفظ...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex items-center gap-3 justify-end md:justify-start">
            <div className="text-right">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                {pageTitle}
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] leading-none mt-1">
                Financial ERP Suite
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-600 shadow-xl shadow-red-900/30 flex items-center justify-center text-white">
              <BookOpen size={24} />
            </div>
          </div>

          {activeTab === "GL" && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
              {[
                { id: "COA", label: "دليل الحسابات", icon: BookOpen },
                { id: "JOURNAL", label: "قيود اليومية", icon: FileText },
                { id: "YEARS", label: "السنوات المالية", icon: Calendar },
                { id: "COST_CENTERS", label: "مراكز التكلفة", icon: Layers },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setGlSubTab(sub.id as GLSubTab)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black transition-all ${glSubTab === sub.id
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-slate-400 hover:bg-white/5"
                    }`}
                >
                  <sub.icon size={14} /> {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto pr-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeTab === "DASHBOARD" && <AccountingDashboard stats={stats} />}
            {activeTab === "GL" && renderGL()}
            {activeTab === "HR" && <EmployeePortal />}
            {activeTab === "AR" && <CustomerPortal />}
            {activeTab === "AP" && <SupplierPortal />}
            {activeTab === "CASH" && (
              <CashBankTab bankAccounts={app.bankAccounts} />
            )}
            {activeTab === "DISCOUNTS" && <DiscountManagementPortal />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {modalType === "ADD_COA" && (
              <AddCOAModal
                form={coaForm}
                setForm={setCoaForm}
                onSave={handleSaveCOA}
                onClose={closeModal}
                parentName={
                  coaForm.parentId
                    ? flatAccounts.find((a) => a.id === coaForm.parentId)
                      ?.nameAr
                    : undefined
                }
              />
            )}
            {modalType === "EDIT_COA" && (
              <EditCOAModal
                form={coaForm}
                setForm={setCoaForm}
                onSave={handleEditCOA}
                onClose={closeModal}
              />
            )}
            {modalType === "ADD_JOURNAL" && (
              <AddJournalModal
                form={journalForm}
                setForm={(form) => setJournalForm(form as any)}
                chartOfAccounts={flatAccounts}
                costCenters={costCentersView}
                onSave={handleSaveJournal}
                onClose={closeModal}
              />
            )}
            {/* ✅ ViewJournalModal الجديد — يجلب subledger بنفسه */}
            {modalType === "VIEW_JOURNAL" && selectedTransactionId && (
              <ViewJournalModal
                transactionId={selectedTransactionId}
                isOpen={true}
                onClose={() => {
                  closeModal();
                  setSelectedTransactionId(null);
                }}
                initialData={(() => {
                  const je = journalEntries.find(
                    (e) => e.id === String(selectedTransactionId),
                  );
                  return je
                    ? {
                      transaction_number: je.reference,
                      date: je.date,
                      description: je.description,
                      status: je.status,
                    }
                    : undefined;
                })()}
              />
            )}

            {modalType === "ADD_COST_CENTER" && (
              <AddCostCenterModal
                form={costCenterForm}
                setForm={setCostCenterForm}
                costCenters={costCentersView}
                onSave={handleSaveCostCenter}
                onClose={closeModal}
              />
            )}
            {modalType === "EDIT_COST_CENTER" && (
              <EditCostCenterModal
                form={costCenterForm}
                setForm={setCostCenterForm}
                costCenters={costCentersView}
                onSave={handleEditCostCenter}
                onClose={closeModal}
              />
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── helper ────────────────────────────────────────────────────────────────────

function emptyJournalForm(type: string = "journal") {
  return {
    date: new Date().toISOString().split("T")[0],
    description: "",
    type,
    lines: [
      { accountId: "", debit: 0, credit: 0, description: "", subledgerType: null, subledgerId: null },
      { accountId: "", debit: 0, credit: 0, description: "", subledgerType: null, subledgerId: null },
    ],
  };
}

function toJournalShapeEnterprise(tx: Transaction) {
  const status =
    tx.status === "posted"
      ? "POSTED"
      : tx.status === "cancelled"
        ? "CANCELLED"
        : "DRAFT";

  return {
    id: String(tx.id),
    date: tx.date,
    description: tx.description ?? tx.type_label,
    status,
    reference: tx.reference ?? tx.transaction_number,
    transactionNumber: tx.transaction_number,
    type: tx.type,
    typeLabel: tx.type_label,
    branchName: tx.branch?.name ?? undefined,
    userName: tx.user?.name ?? undefined,
    currency: (tx as any).currency ?? undefined,
    totalDebit: tx.total_debit,
    totalCredit: tx.total_credit,
    entriesCount: tx.entries_count,
    isBalanced: tx.is_balanced,
    approvedBy:
      (tx as any).approved_by?.name ?? (tx as any).approved_by ?? undefined,
    postedAt: tx.posted_at,
    createdAt: tx.created_at,
    notes: tx.notes,
    isReversal: Boolean((tx as any).is_reversal),
    lines: (tx.entries ?? []).map((e) => ({
      id: e.id,
      accountId: String(e.account_id),
      accountName: e.account?.name ?? null,
      accountCode: e.account?.code ?? null,
      debit: e.debit,
      credit: e.credit,
      description: e.description,
      costCenterName: e.cost_center?.name ?? null,
      subledgerType: e.subledger_type ?? null,
      subledger_id: e.subledger_id ?? null,
      subledgerName: e.subledger?.name ?? null,
    })),
  };
}
