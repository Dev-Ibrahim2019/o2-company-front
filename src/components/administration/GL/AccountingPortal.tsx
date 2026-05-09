import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../../../store";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, Calendar, Layers } from "lucide-react";
import { AccountType } from "../../../../types";
import type { ChartOfAccount } from "../../../../types";

import { AccountingDashboard } from "./AccountingDashboard";
import { EmployeesTab } from "./EmployeesTab";
import { JournalView, FiscalYearsView, CostCentersView } from "./GLSubViews";
import {
  COATree,
  AccountDetailPanel,
  AccountEmptyState,
  ExpandedLedger,
} from "./COAComponents";
import type { LedgerFilter } from "./COAComponents";
import { ARTab, APTab, CashBankTab } from "./ARAPCashTabs";
import {
  AddCOAModal,
  EditCOAModal,
  AddJournalModal,
  EmployeeActionModal,
  ViewJournalModal,
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
  | null;

// ─────────────────────────────────────────────────────────────────────────────

export const AccountingPortal: React.FC<{ initialTab?: ActiveTab }> = ({
  initialTab = "DASHBOARD",
}) => {
  const {
    fiscalYears,
    chartOfAccounts,
    costCenters,
    journalEntries,
    suppliers,
    bankAccounts,
    cashBoxes,
    customers,
    employees,
    addCOA,
    updateCOA,
    deleteCOA,
    addJournalEntry,
  } = useApp();

  // ── tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [glSubTab, setGlSubTab] = useState<GLSubTab>("COA");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // ── selection ─────────────────────────────────────────────────────────────
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [selectedJournalEntryId, setSelectedJournalEntryId] = useState<
    string | null
  >(null);

  // ── modal ─────────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);

  const openModal = (type: ModalType) => {
    setModalType(type);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
  };

  // ── ledger filter ─────────────────────────────────────────────────────────
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>({
    type: "ALL",
  });

  // ── COA tree state ────────────────────────────────────────────────────────
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["coa1000", "coa2000", "coa3000", "coa4000", "coa5000"]),
  );
  const [coaSearchQuery, setCoaSearchQuery] = useState("");

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedNodes);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedNodes(next);
  };

  // ── COA form ──────────────────────────────────────────────────────────────
  const [coaForm, setCoaForm] = useState<Partial<ChartOfAccount>>({
    type: AccountType.ASSET,
    isPosting: true,
  });

  // ── journal form ──────────────────────────────────────────────────────────
  const emptyJournalForm = {
    date: new Date().toISOString().split("T")[0],
    description: "",
    lines: [
      { accountId: "", debit: 0, credit: 0, description: "" },
      { accountId: "", debit: 0, credit: 0, description: "" },
    ],
  };
  const [journalForm, setJournalForm] = useState(emptyJournalForm);

  // ── employee action ───────────────────────────────────────────────────────
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [employeeActionType, setEmployeeActionType] = useState<
    "ADVANCE" | "SALARY" | "DISCOUNT" | "CUSTODY" | null
  >(null);
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

  // ── derived data ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const sum = (type: AccountType) =>
      chartOfAccounts
        .filter((a) => a.type === type)
        .reduce((s, a) => s + a.balance, 0);
    const totalRevenue = sum(AccountType.REVENUE);
    const totalExpenses = sum(AccountType.EXPENSE);
    return {
      totalAssets: sum(AccountType.ASSET),
      totalLiabilities: sum(AccountType.LIABILITY),
      totalEquity: sum(AccountType.EQUITY),
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
    };
  }, [chartOfAccounts]);

  const chartOfAccountsWithRollup = useMemo(() => {
    const getBalance = (id: string): number => {
      const acc = chartOfAccounts.find((a) => a.id === id);
      if (!acc) return 0;
      if (acc.isPosting) return acc.balance;
      return chartOfAccounts
        .filter((a) => a.parentId === id)
        .reduce((s, c) => s + getBalance(c.id), 0);
    };
    return chartOfAccounts.map((acc) => ({
      ...acc,
      displayBalance: getBalance(acc.id),
    }));
  }, [chartOfAccounts]);

  const filteredAccounts = useMemo(() => {
    if (!coaSearchQuery) return chartOfAccountsWithRollup;
    return chartOfAccountsWithRollup.filter(
      (a) =>
        a.nameAr.toLowerCase().includes(coaSearchQuery.toLowerCase()) ||
        a.code.includes(coaSearchQuery),
    );
  }, [chartOfAccountsWithRollup, coaSearchQuery]);

  const selectedAccount = chartOfAccountsWithRollup.find(
    (a) => a.id === selectedAccountId,
  );

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSaveCOA = () => {
    addCOA({
      code: coaForm.code!,
      name: coaForm.nameAr!,
      nameAr: coaForm.nameAr!,
      type: coaForm.type!,
      parentId: coaForm.parentId,
      isPosting: coaForm.isPosting!,
      balance: 0,
    });
    closeModal();
  };

  const handleEditCOA = () => {
    updateCOA(coaForm.id!, coaForm);
    closeModal();
  };

  const handleSaveJournal = () => {
    addJournalEntry({
      date: journalForm.date,
      description: journalForm.description,
      lines: journalForm.lines,
      status: "POSTED",
    });
    closeModal();
    setJournalForm(emptyJournalForm);
  };

  const handleConfirmEmployeeAction = () => {
    const emp = employees.find((e: any) => e.id === selectedEmployeeId);
    const empAcc = chartOfAccounts.find((a) => a.nameAr === emp?.name);
    if (!empAcc) return;
    addJournalEntry({
      date: new Date().toISOString().split("T")[0],
      description:
        (employeeActionType === "ADVANCE" ? "سلفة: " : "راتب: ") + emp?.name,
      status: "POSTED",
      lines: [
        { accountId: empAcc.id, debit: employeeActionAmount, credit: 0 },
        { accountId: "coa11", debit: 0, credit: employeeActionAmount },
      ],
    });
    closeModal();
  };

  // ── GL view ───────────────────────────────────────────────────────────────
  const renderGL = () => {
    if (glSubTab === "LEDGER" && selectedAccount) {
      return (
        <ExpandedLedger
          account={selectedAccount}
          journalEntries={journalEntries}
          ledgerFilter={ledgerFilter}
          setLedgerFilter={setLedgerFilter}
          onBack={() => setGlSubTab("COA")}
        />
      );
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
              <COATree
                filteredAccounts={filteredAccounts}
                allAccounts={chartOfAccountsWithRollup}
                expandedNodes={expandedNodes}
                selectedAccountId={selectedAccountId}
                coaSearchQuery={coaSearchQuery}
                setCoaSearchQuery={setCoaSearchQuery}
                setSelectedAccountId={setSelectedAccountId}
                toggleNode={toggleNode}
                onAddRoot={() => {
                  setCoaForm({ type: AccountType.ASSET, isPosting: true });
                  openModal("ADD_COA");
                }}
              />

              {selectedAccount ? (
                <AccountDetailPanel
                  selectedAccount={selectedAccount}
                  allAccountsWithRollup={chartOfAccountsWithRollup}
                  journalEntries={journalEntries}
                  ledgerFilter={ledgerFilter}
                  setLedgerFilter={setLedgerFilter}
                  setGlSubTab={setGlSubTab}
                  setSelectedAccountId={setSelectedAccountId}
                  onEdit={() => {
                    setCoaForm(selectedAccount);
                    openModal("EDIT_COA");
                  }}
                  onDelete={() => {
                    if (confirm(`حذف الحساب ${selectedAccount.nameAr}؟`))
                      deleteCOA(selectedAccount.id);
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
            <FiscalYearsView fiscalYears={fiscalYears} />
          )}

          {glSubTab === "COST_CENTERS" && (
            <CostCentersView costCenters={costCenters} onAdd={() => {}} />
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col gap-6 p-1 h-full min-h-0 overflow-hidden text-right">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex items-center gap-3 justify-end md:justify-start">
            <div className="text-right">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                {activeTab === "DASHBOARD"
                  ? "الرئيسية المالية"
                  : activeTab === "GL"
                    ? "المحاسبة العامة"
                    : activeTab === "HR"
                      ? "الموظفون والمرتبات"
                      : activeTab === "AR"
                        ? "حسابات العملاء"
                        : activeTab === "AP"
                          ? "حسابات الموردين"
                          : "النقدية والبنوك"}
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] leading-none mt-1">
                Financial ERP Suite
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-600 shadow-xl shadow-red-900/30 flex items-center justify-center text-white">
              <BookOpen size={24} />
            </div>
          </div>

          {
            <div className="flex items-center gap-2 p-1.5 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
              {[
                { id: "COA", label: "دليل الحسابات", icon: BookOpen },
                { id: "JOURNAL", label: "قيود اليومية العامة", icon: FileText },
                { id: "YEARS", label: "السنوات المالية", icon: Calendar },
                { id: "COST_CENTERS", label: "مراكز التكلفة", icon: Layers },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveTab("GL"); 
                    setGlSubTab(sub.id as GLSubTab);
                  }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black transition-all ${glSubTab === sub.id ? "bg-red-600 text-white shadow-lg" : "text-slate-400 hover:bg-white/5"}`}
                >
                  <sub.icon size={14} /> {sub.label}
                </button>
              ))}
            </div>
          }
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
                employees={employees}
                chartOfAccounts={chartOfAccounts}
                onAction={handleEmployeeAction}
              />
            )}
            {activeTab === "AR" && <ARTab customers={customers} />}
            {activeTab === "AP" && <APTab suppliers={suppliers} />}
            {activeTab === "CASH" && (
              <CashBankTab bankAccounts={bankAccounts} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
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
                chartOfAccounts={chartOfAccounts}
                costCenters={costCenters}
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
                onConfirm={handleConfirmEmployeeAction}
                onClose={closeModal}
              />
            )}
            {modalType === "VIEW_JOURNAL" &&
              (() => {
                const je = journalEntries.find(
                  (e: any) => e.id === selectedJournalEntryId,
                );
                return je ? (
                  <ViewJournalModal
                    entry={je}
                    chartOfAccounts={chartOfAccounts}
                    onClose={closeModal}
                  />
                ) : null;
              })()}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
