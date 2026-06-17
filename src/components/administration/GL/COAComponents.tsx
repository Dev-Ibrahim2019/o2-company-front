import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Search,
  Plus,
  BookOpen,
  History,
  Download,
  ArrowRightLeft,
  Edit3,
  Trash2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import { AccountType } from "../../../../types";

// ─── shared types ─────────────────────────────────────────────────────────

export type LedgerFilterType =
  | "ALL"
  | "LAST_WEEK"
  | "LAST_MONTH"
  | "MONTH_TO_DATE"
  | "LAST_YEAR"
  | "YEAR_TO_DATE"
  | "RANGE"
  | "SPECIFIC"
  | "BEFORE"
  | "AFTER";

export interface LedgerFilter {
  type: LedgerFilterType;
  startDate?: string;
  endDate?: string;
}

export interface COAWithRollup {
  id: string;
  code: string;
  name?: string;
  nameAr: string;
  type: AccountType;
  parentId?: string | null;
  isPosting: boolean;
  balance: number;
  displayBalance: number;
  level?: number;
  is_system?: boolean;
  is_active?: boolean;
  children?: COAWithRollup[];
}

// ─── LedgerFilterBar ─────────────────────────────────────────────────────

interface LedgerFilterBarProps {
  filter: LedgerFilter;
  onChange: (f: LedgerFilter) => void;
}

export const LedgerFilterBar: React.FC<LedgerFilterBarProps> = ({
  filter,
  onChange,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <select
      value={filter.type}
      onChange={(e) =>
        onChange({ ...filter, type: e.target.value as LedgerFilterType })
      }
      className="bg-slate-900 border border-white/5 text-white text-[10px] font-black p-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
    >
      {[
        ["ALL", "كافة الحركات"],
        ["LAST_WEEK", "الأسبوع الماضي"],
        ["LAST_MONTH", "الشهر الأخير"],
        ["MONTH_TO_DATE", "من أول الشهر"],
        ["LAST_YEAR", "السنة الماضية"],
        ["YEAR_TO_DATE", "من أول السنة"],
        ["RANGE", "فترة (من - إلى)"],
        ["SPECIFIC", "تاريخ محدد"],
        ["BEFORE", "قبل تاريخ"],
        ["AFTER", "بعد تاريخ"],
      ].map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
    {(["RANGE", "SPECIFIC", "BEFORE", "AFTER"] as LedgerFilterType[]).includes(
      filter.type,
    ) && (
        <input
          type="date"
          value={filter.startDate || ""}
          onChange={(e) => onChange({ ...filter, startDate: e.target.value })}
          className="bg-slate-900 border border-white/5 text-white text-[10px] font-black p-2 rounded-xl"
        />
      )}
    {filter.type === "RANGE" && (
      <input
        type="date"
        value={filter.endDate || ""}
        onChange={(e) => onChange({ ...filter, endDate: e.target.value })}
        className="bg-slate-900 border border-white/5 text-white text-[10px] font-black p-2 rounded-xl"
      />
    )}
  </div>
);

// ─── COATree ─────────────────────────────────────────────────────────────

interface COATreeProps {
  filteredAccounts: COAWithRollup[];
  allAccounts: COAWithRollup[];
  expandedNodes: Set<string>;
  selectedAccountId: string | null;
  coaSearchQuery: string;
  setCoaSearchQuery: (q: string) => void;
  setSelectedAccountId: (id: string) => void;
  toggleNode: (id: string, e: React.MouseEvent) => void;
  onAddRoot: () => void;
}

export const COATree: React.FC<COATreeProps> = ({
  filteredAccounts,
  allAccounts,
  expandedNodes,
  selectedAccountId,
  coaSearchQuery,
  setCoaSearchQuery,
  setSelectedAccountId,
  toggleNode,
  onAddRoot,
}) => {
  const renderTree = (
    parentId: string | null,
    depth: number,
  ): React.ReactNode =>
    filteredAccounts
      .filter((a) => (a.parentId || null) === parentId)
      .map((account, index, arr) => {
        const hasChildren = allAccounts.some((a) => a.parentId === account.id);
        const isExpanded = expandedNodes.has(account.id);
        const balance = account.displayBalance;

        return (
          <div key={account.id} className="relative">
            {depth > 0 && (
              <div
                className="absolute right-0 top-0 w-px bg-white/10"
                style={{
                  marginRight: (depth - 1) * 24 + 12,
                  height: index === arr.length - 1 ? "24px" : "100%",
                }}
              />
            )}

            <div
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAccountId(account.id);
                if (hasChildren) toggleNode(account.id, e);
              }}
              className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer mb-2 relative ${selectedAccountId === account.id
                ? "bg-red-600/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                : account.isPosting
                  ? "bg-slate-900/40 border-white/5 hover:border-red-500/20"
                  : "bg-slate-800/40 border-white/10 font-black text-slate-300 hover:bg-slate-800/60"
                }`}
              style={{ marginRight: depth * 24 }}
            >
              {depth > 0 && (
                <div
                  className="absolute top-1/2 w-6 h-px bg-white/10"
                  style={{ right: -24 }}
                />
              )}

              <div className="flex items-center gap-2 sm:gap-3">
                {hasChildren ? (
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNode(account.id, e);
                    }}
                  >
                    <ChevronRight size={14} className="text-slate-500" />
                  </motion.div>
                ) : (
                  <div className="w-6 flex justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  </div>
                )}
                <div className="bg-slate-950 px-2 py-0.5 rounded-lg border border-white/5 text-[8px] sm:text-[9px] text-red-500 font-mono font-black">
                  {account.code}
                </div>
                <span
                  className={
                    account.isPosting
                      ? "text-[11px] sm:text-xs font-bold text-white"
                      : "text-xs sm:text-sm font-black text-slate-200"
                  }
                >
                  {account.nameAr}
                </span>
              </div>

              <div className="text-left">
                <span
                  className={`text-[10px] sm:text-xs font-mono font-black ${balance === 0
                    ? "text-slate-600"
                    : balance < 0
                      ? "text-emerald-500"
                      : "text-red-500"
                    }`}
                >
                  ₪{Math.abs(balance).toLocaleString()}
                </span>
                <span className="text-[7px] font-black text-slate-500 mr-1 uppercase">
                  {balance < 0 ? "له" : balance > 0 ? "عليه" : ""}
                </span>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && hasChildren && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {renderTree(account.id, depth + 1)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      });

  return (
    <div className="w-[300px] lg:w-[380px] shrink-0 flex flex-col bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
      <div className="p-5 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-white">دليل الحسابات</h3>
          <button
            onClick={onAddRoot}
            className="bg-red-600 text-white p-2 rounded-xl"
            title="إضافة حساب رئيسي"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="relative">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={14}
          />
          <input
            type="text"
            placeholder="بحث عن حساب..."
            value={coaSearchQuery}
            onChange={(e) => setCoaSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-white/5 rounded-2xl py-2 pr-10 pl-4 text-xs text-white text-right outline-none focus:border-red-500/50"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {renderTree(null, 0)}
      </div>
    </div>
  );
};

// ─── AccountDetailPanel ───────────────────────────────────────────────────

interface AccountDetailPanelProps {
  selectedAccount: COAWithRollup;
  allAccountsWithRollup: COAWithRollup[];
  ledgerLines: LedgerLine[];
  openingBalance: number;
  loadingLedger: boolean;
  ledgerFilter: LedgerFilter;
  setLedgerFilter: (f: LedgerFilter) => void;
  setGlSubTab: (
    tab: "YEARS" | "COA" | "COST_CENTERS" | "JOURNAL" | "LEDGER",
  ) => void;
  setSelectedAccountId: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  setJournalForm: any;
  setModalType: (type: string) => void;
  setIsModalOpen: (v: boolean) => void;
}

export interface LedgerLine {
  date: string;
  transaction_number: string;
  reference?: string;
  description?: string;
  debit: number;
  credit: number;
  balance: number;
}

export const AccountDetailPanel: React.FC<AccountDetailPanelProps> = ({
  selectedAccount,
  allAccountsWithRollup,
  ledgerLines,
  openingBalance,
  loadingLedger,
  ledgerFilter,
  setLedgerFilter,
  setSelectedAccountId,
  onEdit,
  onDelete,
  onAddChild,
  setJournalForm,
  setModalType,
  setIsModalOpen,
}) => {
  // ✅ FIX 1: state داخلي للـ expanded — لا يغير الـ tab الخارجي
  const [isExpanded, setIsExpanded] = useState(false);

  const typeLabel = () => {
    switch (selectedAccount.type) {
      case AccountType.ASSET: return "أصل";
      case AccountType.LIABILITY: return "التزام";
      case AccountType.EQUITY: return "حقوق ملكية";
      case AccountType.REVENUE: return "إيراد";
      default: return "مصروف";
    }
  };

  const isCashResource =
    selectedAccount.type === AccountType.ASSET &&
    /(cash|bank|صندوق|نقد|بنك)/i.test(
      `${selectedAccount.nameAr} ${selectedAccount.code}`,
    );
  const invoiceMovements = ledgerLines.filter((entry: any) =>
    ["invoice", "order"].includes(String(entry.sourceType ?? "")),
  );

  const panelContent = (
    <div className={`${isExpanded ? "fixed inset-0 z-50 bg-slate-950" : "flex-1 bg-slate-900/50 border border-white/5 rounded-[2.5rem]"} overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-red-600/10 text-red-500 text-[10px] font-black px-2 py-0.5 rounded-lg border border-red-500/20">
                  {selectedAccount.code}
                </span>
                <h2 className="text-2xl font-black text-white">
                  {selectedAccount.nameAr}
                </h2>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all ml-2"
                  title={isExpanded ? "تصغير" : "عرض كامل الشاشة"}
                >
                  {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">
                {typeLabel()} {" • "}
                {selectedAccount.isPosting ? "حساب حركة" : "حساب أب"}
              </p>
            </div>

            {selectedAccount.isPosting && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    setJournalForm({
                      date: today,
                      description: `قيد على حساب ${selectedAccount.nameAr}`,
                      lines: [
                        {
                          accountId: selectedAccount.id,
                          debit: 0,
                          credit: 0,
                          description: selectedAccount.nameAr,
                          costCenterId: "",
                        },
                        {
                          accountId: "",
                          debit: 0,
                          credit: 0,
                          description: "",
                          costCenterId: "",
                        },
                      ],
                    });
                    setModalType("ADD_JOURNAL");
                    setIsModalOpen(true);
                  }}
                  className="px-4 bg-white/5 hover:bg-white/10 border border-white/5 text-white py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} className="text-red-500" />
                  إضافة حركة
                </button>
                <button className="px-4 bg-white/5 hover:bg-white/10 border border-white/5 text-white py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2">
                  <ArrowRightLeft size={14} className="text-blue-500" /> تحويل
                </button>
                <button className="px-4 bg-white/5 hover:bg-white/10 border border-white/5 text-white py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2">
                  <Download size={14} className="text-emerald-500" /> تصدير
                </button>
                <div className="h-6 w-px bg-white/5 mx-2 hidden lg:block" />
                <LedgerFilterBar filter={ledgerFilter} onChange={setLedgerFilter} />
              </div>
            )}

            {selectedAccount.isPosting && isCashResource && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      مورد مرتبط
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {selectedAccount.nameAr.includes("صندوق")
                        ? "صندوق مبيعات / نقدية"
                        : "حساب نقدية أو بنك"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase">حركات الحساب</p>
                      <p className="text-lg font-black text-white">{ledgerLines.length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase">فواتير مرتبطة</p>
                      <p className="text-lg font-black text-emerald-400">{invoiceMovements.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-end gap-6">
            <div className="text-left space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                الرصيد الحالي
              </p>
              <div className="flex flex-col items-end">
                <p
                  className={`text-4xl font-black font-mono leading-none ${selectedAccount.displayBalance === 0
                    ? "text-slate-600"
                    : selectedAccount.displayBalance < 0
                      ? "text-emerald-500"
                      : "text-red-500"
                    }`}
                >
                  ₪{Math.abs(selectedAccount.displayBalance).toLocaleString()}
                </p>
                <p className="text-[10px] font-black text-slate-500 mt-2 uppercase">
                  {selectedAccount.displayBalance < 0
                    ? "رصيد دائن (له)"
                    : selectedAccount.displayBalance > 0
                      ? "رصيد مدين (عليه)"
                      : "حساب مصفّر"}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pb-1">
              <button
                onClick={onEdit}
                className="p-2 bg-white/5 hover:bg-blue-600 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"
                title="تعديل الحساب"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={onDelete}
                className="p-2 bg-white/5 hover:bg-red-600 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"
                title="حذف الحساب"
              >
                <Trash2 size={16} />
              </button>
              {!selectedAccount.isPosting && (
                <button
                  onClick={onAddChild}
                  className="p-2 bg-white/5 hover:bg-emerald-600 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"
                  title="إضافة حساب فرعي"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedAccount.isPosting ? (
          <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
            {loadingLedger ? (
              <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-xs font-bold">جاري تحميل الحركات...</span>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-white/5">
                    <th className="pb-4 pr-2">التاريخ</th>
                    <th className="pb-4 text-right">البيان / المرجع</th>
                    <th className="pb-4 text-center">مدين (+)</th>
                    <th className="pb-4 text-center">دائن (-)</th>
                    <th className="pb-4 pl-2 text-left">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {openingBalance !== 0 && (
                    <tr className="bg-slate-950/30">
                      <td className="py-3 pr-4 font-mono text-[10px] text-slate-600">—</td>
                      <td className="py-3 text-slate-500 italic text-xs font-bold">
                        رصيد مرحّل من فترة سابقة
                      </td>
                      <td className="py-3 text-center text-slate-600">—</td>
                      <td className="py-3 text-center text-slate-600">—</td>
                      <td className="py-3 pl-4 text-left font-mono font-black text-slate-400">
                        ₪{Math.abs(openingBalance).toLocaleString()}
                      </td>
                    </tr>
                  )}

                  {ledgerLines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-20 text-center text-slate-600 font-bold italic"
                      >
                        لا توجد حركات مسجلة لهذا الحساب في الفترة المختارة
                      </td>
                    </tr>
                  ) : (
                    ledgerLines.map((line, idx) => (
                      <tr
                        key={idx}
                        className="group hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-4 pr-4 font-mono text-[10px] text-slate-500">
                          {line.date}
                        </td>
                        <td className="py-4">
                          <p className="font-bold text-white">
                            {line.description || line.transaction_number}
                          </p>
                          {line.reference && (
                            <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                              {line.reference}
                            </p>
                          )}
                          <p className="text-[9px] text-slate-600 font-mono">
                            {line.transaction_number}
                          </p>
                        </td>
                        <td className="py-4 text-center font-black text-red-500">
                          {line.debit > 0 ? `₪${Number(line.debit).toLocaleString()}` : "—"}
                        </td>
                        <td className="py-4 text-center font-black text-emerald-500">
                          {line.credit > 0 ? `₪${Number(line.credit).toLocaleString()}` : "—"}
                        </td>
                        <td className="py-4 pl-4 text-left font-mono font-black text-white">
                          ₪{Math.abs(line.balance).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {ledgerLines.length > 0 && (
                  <tfoot className="border-t border-white/10">
                    <tr>
                      <td colSpan={2} className="pt-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        الإجماليات
                      </td>
                      <td className="pt-4 text-center font-black font-mono text-red-400">
                        ₪{ledgerLines.reduce((s, l) => s + l.debit, 0).toLocaleString()}
                      </td>
                      <td className="pt-4 text-center font-black font-mono text-emerald-400">
                        ₪{ledgerLines.reduce((s, l) => s + l.credit, 0).toLocaleString()}
                      </td>
                      <td className="pt-4 pl-4 text-left font-black font-mono text-white">
                        ₪{Math.abs(ledgerLines[ledgerLines.length - 1]?.balance ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        ) : (
          // حساب أب — يعرض الأبناء
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black text-white">الحسابات الفرعية</h4>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                الإجمالي:{" "}
                {allAccountsWithRollup.filter((a) => a.parentId === selectedAccount.id).length}{" "}
                حساب
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allAccountsWithRollup
                .filter((a) => a.parentId === selectedAccount.id)
                .map((child) => (
                  <div
                    key={child.id}
                    onClick={() => setSelectedAccountId(child.id)}
                    className="bg-slate-950/40 border border-white/5 p-5 rounded-3xl flex items-center justify-between hover:bg-slate-950 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-red-500 transition-colors">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                          {child.code}
                        </p>
                        <h5 className="text-sm font-black text-white leading-none mt-1">
                          {child.nameAr}
                        </h5>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-black font-mono ${child.displayBalance === 0
                        ? "text-slate-600"
                        : child.displayBalance < 0
                          ? "text-emerald-500"
                          : "text-red-500"
                        }`}
                    >
                      ₪{Math.abs(child.displayBalance).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {!isExpanded && panelContent}
      {isExpanded && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm p-4 overflow-auto"
          >
            <div className="h-full flex flex-col max-w-7xl mx-auto">
              {panelContent}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
};

// ─── AccountEmptyState ────────────────────────────────────────────────────

export const AccountEmptyState: React.FC = () => (
  <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col">
    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
      <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 flex items-center justify-center text-slate-800">
        <History size={40} />
      </div>
      <div>
        <h3 className="text-xl font-black text-white">اختر حساباً للمعاينة</h3>
        <p className="text-xs font-medium text-slate-500 max-w-[280px] mx-auto mt-2 leading-relaxed">
          اضغط على أي حساب من الدليل المحاسبي لعرض تفاصيل الحركة المالية أو ملخص
          الحسابات الفرعية.
        </p>
      </div>
    </div>
  </div>
);