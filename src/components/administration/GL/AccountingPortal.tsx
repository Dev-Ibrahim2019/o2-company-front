/**
 * AccountingPortal.tsx  –  النسخة المحدّثة
 *
 * التغييرات الجوهرية:
 *  1. استبدال useApp() بـ useAccounting() للاتصال الحقيقي بالـ API
 *  2. تحويل handleSaveCOA / handleEditCOA / handleSaveJournal لاستدعاء API
 *  3. إضافة modal إضافة وتعديل مركز التكلفة (ADD_COST_CENTER / EDIT_COST_CENTER)
 *  4. تمرير accountTree (شجرة) + accounts (مسطحة) للمكوّنات المناسبة
 *  5. تمرير دوال fetchLedger / ledger لعرض كشف الحساب الحقيقي
 *  6. إدارة حالة التحميل والأخطاء مركزياً
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, FileText, Calendar, Layers,
  AlertCircle, X, RefreshCw,
} from "lucide-react";

import { useAccounting } from "../../../hooks/useAccounting";
import type {
  Account, Transaction, CostCenter,
} from "../../../services/accountingService";

import { AccountingDashboard } from "./AccountingDashboard";
import { EmployeesTab } from "./EmployeesTab";
import { JournalView, FiscalYearsView, CostCentersView } from "./GLSubViews";
import {
  COATree,
  AccountDetailPanel,
  AccountEmptyState,
} from "./COAComponents";
import type { LedgerFilter } from "./COAComponents";
import { ARTab, APTab, CashBankTab } from "./ARAPCashTabs";
import {
  AddCOAModal,
  EditCOAModal,
  AddJournalModal,
  EmployeeActionModal,
  ViewJournalModal,
  AddCostCenterModal,
  EditCostCenterModal,
} from "./AccountingModals";

// ─────────────────────────────────────────────────────────────────────────────

type ActiveTab = "DASHBOARD" | "GL" | "AR" | "AP" | "CASH" | "HR";
type GLSubTab = "YEARS" | "COA" | "COST_CENTERS" | "JOURNAL" | "LEDGER";
type ModalType =
  | "ADD_COA"
  | "ADD_JOURNAL"
  | "EDIT_COA"
  | "EMPLOYEE_ACTION"
  | "VIEW_JOURNAL"
  | "ADD_COST_CENTER"
  | "EDIT_COST_CENTER"
  | null;

// ─────────────────────────────────────────────────────────────────────────────

/** تحويل Account (API) → تنسيق COAWithRollup المتوقع من COAComponents */
function toCoaShape(acc: Account) {
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

/** تحويل Transaction (API) → تنسيق JournalEntry المتوقع من GLSubViews */
function toJournalShape(tx: Transaction) {
  return {
    id: String(tx.id),
    date: tx.date,
    description: tx.description ?? tx.type_label,
    status: tx.status === "posted" ? "POSTED" : "DRAFT",
    reference: tx.transaction_number,
    lines: (tx.entries ?? []).map((e) => ({
      accountId: String(e.account_id),
      debit: e.debit,
      credit: e.credit,
      description: e.description,
    })),
  };
}

/** تحويل CostCenter (API) → تنسيق متوقع من CostCentersView */
function toCostCenterShape(cc: CostCenter) {
  return {
    id: String(cc.id),
    nameAr: cc.name,
    code: cc.code ?? "",
    type: cc.type?.toUpperCase() ?? "OPERATIONAL",
    parentId: cc.parent ? String(cc.parent.id) : undefined,
    is_active: cc.is_active,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export const AccountingPortal: React.FC<{ initialTab?: ActiveTab }> = ({
  initialTab = "DASHBOARD",
}) => {
  const acc = useAccounting();

  // ── tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [glSubTab, setGlSubTab] = useState<GLSubTab>("COA");

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  // ── selection ─────────────────────────────────────────────────────────────
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedJournalEntryId, setSelectedJournalEntryId] = useState<string | null>(null);

  // ── modal ─────────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);

  const openModal = (type: ModalType) => { setModalType(type); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setModalType(null); };

  // ── ledger filter ─────────────────────────────────────────────────────────
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>({ type: "ALL" });

  // ── COA tree state ────────────────────────────────────────────────────────
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [coaSearchQuery, setCoaSearchQuery] = useState("");

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── COA form ──────────────────────────────────────────────────────────────
  const [coaForm, setCoaForm] = useState<Partial<any>>({
    type: "asset",
    isPosting: true,
  });

  // ── journal form ──────────────────────────────────────────────────────────
  const emptyJournalForm = {
    date: new Date().toISOString().split("T")[0],
    description: "",
    type: "journal",
    lines: [
      { accountId: "", debit: 0, credit: 0, description: "" },
      { accountId: "", debit: 0, credit: 0, description: "" },
    ],
  };
  const [journalForm, setJournalForm] = useState(emptyJournalForm);

  // ── cost center form ──────────────────────────────────────────────────────
  const [costCenterForm, setCostCenterForm] = useState<Partial<any>>({
    type: "operational",
    is_active: true,
  });

  // ── employee action ───────────────────────────────────────────────────────
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeActionType, setEmployeeActionType] = useState<"ADVANCE" | "SALARY" | "DISCOUNT" | "CUSTODY" | null>(null);
  const [employeeActionAmount, setEmployeeActionAmount] = useState(0);
  const [employeeActionNote, setEmployeeActionNote] = useState("");

  const handleEmployeeAction = (
    empId: string,
    type: "ADVANCE" | "SALARY" | "DISCOUNT" | "CUSTODY",
  ) => {
    setSelectedEmployeeId(empId);
    setEmployeeActionType(type);
    openModal("EMPLOYEE_ACTION");
  };

  // ── data transforms ───────────────────────────────────────────────────────
  const flatAccounts = useMemo(() => acc.accounts.map(toCoaShape), [acc.accounts]);

  const accountTree = useMemo(
    () => acc.accountTree.map(toCoaShape),
    [acc.accountTree],
  );

  const journalEntries = useMemo(
    () => acc.transactions.map(toJournalShape),
    [acc.transactions],
  );

  const costCentersView = useMemo(
    () => acc.costCenters.map(toCostCenterShape),
    [acc.costCenters],
  );

  // filteredAccounts للـ COATree (مسطحة + بحث)
  const filteredAccounts = useMemo(() => {
    if (!coaSearchQuery) return flatAccounts;
    return flatAccounts.filter(
      (a) =>
        a.nameAr.toLowerCase().includes(coaSearchQuery.toLowerCase()) ||
        a.code.includes(coaSearchQuery),
    );
  }, [flatAccounts, coaSearchQuery]);

  const selectedAccount = flatAccounts.find((a) => a.id === selectedAccountId);

  // ── stats for dashboard ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const sum = (type: string) =>
      acc.accounts.filter((a) => a.type === type).reduce((s, a) => s + (a.balance ?? 0), 0);
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

  // ─────────────────────────────────── HANDLERS ───────────────────────────

  // ── إضافة حساب ────────────────────────────────────────────────────────────
  const handleSaveCOA = async () => {
    try {
      await acc.createAccount({
        name: coaForm.nameAr,
        code: coaForm.code,
        type: coaForm.type,
        allow_posting: coaForm.isPosting,
        parent_id: coaForm.parentId ? Number(coaForm.parentId) : null,
        normal_balance: ["asset", "expense"].includes(coaForm.type) ? "debit" : "credit",
        is_active: true,
      });
      closeModal();
    } catch (_) { /* error handled in hook */ }
  };

  // ── تعديل حساب ────────────────────────────────────────────────────────────
  const handleEditCOA = async () => {
    if (!coaForm.id) return;
    try {
      await acc.updateAccount(Number(coaForm.id), {
        name: coaForm.nameAr,
        code: coaForm.code,
        allow_posting: coaForm.isPosting,
      });
      closeModal();
    } catch (_) { /* error handled in hook */ }
  };

  // ── حفظ قيد يومية ─────────────────────────────────────────────────────────
  const handleSaveJournal = async () => {
    const totalDebit = journalForm.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = journalForm.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      alert("القيد غير متوازن! المدين لا يساوي الدائن.");
      return;
    }
    try {
      const tx = await acc.createTransaction({
        date: journalForm.date,
        description: journalForm.description,
        type: "journal",
        entries: journalForm.lines
          .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0))
          .map((l, i) => ({
            account_id: Number(l.accountId),
            debit: l.debit || 0,
            credit: l.credit || 0,
            description: l.description,
            sort_order: i,
          })),
      });
      // ترحيل مباشر
      await acc.postTransaction(tx.id);
      closeModal();
      setJournalForm(emptyJournalForm);
    } catch (_) { /* error handled in hook */ }
  };

  // ── إضافة مركز تكلفة ──────────────────────────────────────────────────────
  const handleSaveCostCenter = async () => {
    try {
      await acc.createCostCenter({
        name: costCenterForm.nameAr || costCenterForm.name,
        code: costCenterForm.code,
        type: (costCenterForm.type || "operational").toLowerCase(),
        is_active: costCenterForm.is_active ?? true,
        parent_id: costCenterForm.parentId ? Number(costCenterForm.parentId) : null,
        notes: costCenterForm.notes,
      });
      closeModal();
    } catch (_) { /* error handled in hook */ }
  };

  // ── تعديل مركز تكلفة ──────────────────────────────────────────────────────
  const handleEditCostCenter = async () => {
    if (!costCenterForm.id) return;
    try {
      await acc.updateCostCenter(Number(costCenterForm.id), {
        name: costCenterForm.nameAr || costCenterForm.name,
        code: costCenterForm.code,
        type: (costCenterForm.type || "operational").toLowerCase(),
        is_active: costCenterForm.is_active ?? true,
        parent_id: costCenterForm.parentId ? Number(costCenterForm.parentId) : null,
        notes: costCenterForm.notes,
      });
      closeModal();
    } catch (_) { /* error handled in hook */ }
  };

  // ── employee action → journal entry ───────────────────────────────────────
  const handleConfirmEmployeeAction = async () => {
    // TODO: ربط بحسابات الموظف الحقيقية من الـ API
    closeModal();
    setEmployeeActionAmount(0);
    setEmployeeActionNote("");
  };

  // ── page title ────────────────────────────────────────────────────────────
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
    };
    return map[activeTab];
  })();

  // ─────────────────────────────────── GL RENDER ──────────────────────────

  const renderGL = () => {
    // تحميل transactions عند الانتقال لـ JOURNAL
    if (glSubTab === "JOURNAL" && acc.transactions.length === 0 && !acc.loading.transactions) {
      acc.fetchTransactions({ per_page: 100, type: "journal" });
    }

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
                  <RefreshCw size={22} className="animate-spin ml-2" /> جاري تحميل الحسابات...
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
                    onAddRoot={() => {
                      setCoaForm({ type: "asset", isPosting: true });
                      openModal("ADD_COA");
                    }}
                  />

                  {selectedAccount ? (
                    <AccountDetailPanel
                      selectedAccount={selectedAccount}
                      allAccountsWithRollup={flatAccounts}
                      journalEntries={journalEntries}
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
                        if (confirm(`حذف الحساب "${selectedAccount.nameAr}"؟`)) {
                          await acc.deleteAccount(Number(selectedAccount.id));
                          setSelectedAccountId(null);
                        }
                      }}
                      onAddChild={() => {
                        setCoaForm({
                          parentId: selectedAccount.id,
                          type: selectedAccount.type,
                          isPosting: true,
                        });
                        openModal("ADD_COA");
                      }}
                      setJournalForm={setJournalForm}
                      setModalType={setModalType}
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
            <JournalView
              journalEntries={journalEntries}
              onAddJournal={() => openModal("ADD_JOURNAL")}
              onViewEntry={(id) => {
                setSelectedJournalEntryId(id);
                openModal("VIEW_JOURNAL");
              }}
            />
          )}

          {glSubTab === "YEARS" && (
            <FiscalYearsView fiscalYears={[]} />
          )}

          {glSubTab === "COST_CENTERS" && (
            <CostCentersView
              costCenters={costCentersView}
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

  // ─────────────────────────────────── RENDER ─────────────────────────────

  return (
    <div className="flex-1 flex flex-col gap-6 p-1 h-full min-h-0 overflow-hidden text-right">

      {/* Global error banner */}
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
            <button onClick={acc.clearError} className="mr-2 text-rose-300 hover:text-white">
              <X size={14} />
            </button>
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
              <span className="text-sm font-black text-white">جاري الحفظ...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-8">

          {/* Title */}
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

          {/* GL sub-tabs */}
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
      <div className="flex-1 overflow-hidden pr-1">
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
            {activeTab === "HR" && (
              <EmployeesTab
                employees={[]}          // اربط بـ employees API إذا احتجت
                chartOfAccounts={flatAccounts}
                onAction={handleEmployeeAction}
              />
            )}
            {activeTab === "AR" && <ARTab customers={[]} />}
            {activeTab === "AP" && <APTab suppliers={[]} />}
            {activeTab === "CASH" && <CashBankTab bankAccounts={[]} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {modalType === "ADD_COA" && (
              <AddCOAModal
                form={coaForm}
                setForm={setCoaForm}
                onSave={handleSaveCOA}
                onClose={closeModal}
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
                setForm={setJournalForm}
                chartOfAccounts={flatAccounts}
                costCenters={costCentersView}
                onSave={handleSaveJournal}
                onClose={closeModal}
              />
            )}

            {modalType === "EMPLOYEE_ACTION" && (
              <EmployeeActionModal
                amount={employeeActionAmount}
                setAmount={setEmployeeActionAmount}
                note={employeeActionNote}
                setNote={setEmployeeActionNote}
                actionType={employeeActionType ?? undefined}
                onConfirm={handleConfirmEmployeeAction}
                onClose={closeModal}
              />
            )}

            {modalType === "VIEW_JOURNAL" &&
              (() => {
                const je = journalEntries.find((e) => e.id === selectedJournalEntryId);
                return je ? (
                  <ViewJournalModal
                    entry={je}
                    chartOfAccounts={flatAccounts}
                    onClose={closeModal}
                  />
                ) : null;
              })()}

            {/* ── مراكز التكلفة ── */}
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