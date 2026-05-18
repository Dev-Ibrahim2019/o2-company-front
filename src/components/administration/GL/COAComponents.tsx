/**
 * COAComponents.tsx — النسخة الكاملة المُصلحة
 *
 * الإصلاحات:
 * 1. زر Maximize → يعرض ExpandedLedger داخل نفس الصفحة بدل تغيير الـ tab
 * 2. جدول الحركات → يستقبل ledgerLines مباشرة من API بدل البحث في journalEntries
 * 3. props جديدة: loadingLedger, ledgerLines, openingBalance
 */

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
}

// سطر كشف الحساب القادم مباشرة من API ledger
export interface LedgerLineItem {
  date: string;
  transaction_number: string;
  reference?: string;
  description?: string;
  debit: number;
  credit: number;
  balance: number;
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
                // ✅ إصلاح: setSelectedAccountId أولاً دائماً
                setSelectedAccountId(account.id);
                if (hasChildren) toggleNode(account.id, e);
              }}
              className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer mb-2 relative ${
                selectedAccountId === account.id
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
                  className={`text-[10px] sm:text-xs font-mono font-black ${
                    balance === 0
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

  // ✅ Props الجديدة للـ ledger الحقيقي
  ledgerLines: LedgerLineItem[];       // قادمة من API مباشرة
  loadingLedger: boolean;
  openingBalance: number;

  ledgerFilter: LedgerFilter;
  setLedgerFilter: (f: LedgerFilter) => void;

  // لم نعد نحتاج setGlSubTab لأن الـ maximize صار داخلي
  setSelectedAccountId: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddChild: () => void;

  setJournalForm: any;
  setModalType: (type: string) => void;
  setIsModalOpen: (v: boolean) => void;
}

export const AccountDetailPanel: React.FC<AccountDetailPanelProps> = ({
  selectedAccount,
  allAccountsWithRollup,
  ledgerLines,
  loadingLedger,
  openingBalance,
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
  // ✅ الـ Maximize يُدار محلياً — لا يغير الـ glSubTab
  const [isExpanded, setIsExpanded] = useState(false);

  // ── الكشف الموسّع ─────────────────────────────────────────────────────
  if (isExpanded) {
    return (
      <ExpandedLedger
        account={selectedAccount}
        ledgerLines={ledgerLines}
        loadingLedger={loadingLedger}
        openingBalance={openingBalance}
        ledgerFilter={ledgerFilter}
        setLedgerFilter={setLedgerFilter}
        onBack={() => setIsExpanded(false)}
      />
    );
  }

  // ── العرض العادي ──────────────────────────────────────────────────────
  return (
    <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col">
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
                {/* ✅ زر Maximize يُبدّل isExpanded محلياً */}
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all ml-2"
                  title="عرض الكشف كاملاً"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">
                {selectedAccount.type === AccountType.ASSET
                  ? "أصل"
                  : selectedAccount.type === AccountType.LIABILITY
                    ? "التزام"
                    : selectedAccount.type === AccountType.EQUITY
                      ? "حقوق ملكية"
                      : selectedAccount.type === AccountType.REVENUE
                        ? "إيراد"
                        : "مصروف"}
                {" • "}
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
          </div>

          {/* الرصيد + أزرار الإجراءات */}
          <div className="flex items-end gap-6">
            <div className="text-left space-y-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                الرصيد الحالي
              </p>
              <div className="flex flex-col items-end">
                <p
                  className={`text-4xl font-black font-mono leading-none ${
                    selectedAccount.displayBalance === 0
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

      {/* المحتوى */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedAccount.isPosting ? (
          // ── جدول الحركات للحساب الحركي ──────────────────────────────────
          <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">

            {loadingLedger ? (
              // ✅ حالة التحميل
              <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-xs font-bold">جاري تحميل الحركات...</span>
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-white/5">
                    <th className="pb-4 pr-2">التاريخ</th>
                    <th className="pb-4 text-right">البيان / رقم القيد</th>
                    <th className="pb-4 text-center">مدين</th>
                    <th className="pb-4 text-center">دائن</th>
                    <th className="pb-4 pl-2 text-left">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">

                  {/* ✅ سطر الرصيد الافتتاحي */}
                  {openingBalance !== 0 && (
                    <tr className="bg-slate-950/30">
                      <td className="py-3 pr-4 font-mono text-[10px] text-slate-600">—</td>
                      <td className="py-3 text-slate-500 italic text-[11px] font-bold">
                        رصيد مرحّل من فترة سابقة
                      </td>
                      <td className="py-3 text-center text-slate-600">—</td>
                      <td className="py-3 text-center text-slate-600">—</td>
                      <td className="py-3 pl-4 text-left font-mono font-black text-slate-400">
                        ₪{Math.abs(openingBalance).toLocaleString()}
                        <span className="text-[9px] text-slate-600 mr-1">
                          {openingBalance > 0 ? "مدين" : "دائن"}
                        </span>
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
                    // ✅ عرض سطور الكشف مباشرة من API — الرصيد محسوب في الباك
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
                          <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                            {line.transaction_number}
                            {line.reference ? ` · ${line.reference}` : ""}
                          </p>
                        </td>
                        <td className="py-4 text-center font-black text-red-500">
                          {line.debit > 0
                            ? `₪${Number(line.debit).toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="py-4 text-center font-black text-emerald-500">
                          {line.credit > 0
                            ? `₪${Number(line.credit).toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="py-4 pl-4 text-left font-mono font-black text-white">
                          ₪{Math.abs(Number(line.balance)).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Footer الإجماليات */}
                {ledgerLines.length > 0 && (
                  <tfoot className="border-t border-white/10">
                    <tr className="text-slate-500">
                      <td colSpan={2} className="pt-4 pr-4 text-[10px] font-black uppercase tracking-widest">
                        الإجماليات
                      </td>
                      <td className="pt-4 text-center font-black font-mono text-red-400">
                        ₪{ledgerLines.reduce((s, l) => s + Number(l.debit), 0).toLocaleString()}
                      </td>
                      <td className="pt-4 text-center font-black font-mono text-emerald-400">
                        ₪{ledgerLines.reduce((s, l) => s + Number(l.credit), 0).toLocaleString()}
                      </td>
                      <td className="pt-4 pl-4 text-left font-mono font-black text-white">
                        ₪{ledgerLines.length > 0
                          ? Math.abs(Number(ledgerLines[ledgerLines.length - 1].balance)).toLocaleString()
                          : "0"}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        ) : (
          // ── عرض الحسابات الفرعية للحساب الأم ────────────────────────────
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black text-white">الحسابات الفرعية</h4>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                الإجمالي:{" "}
                {
                  allAccountsWithRollup.filter(
                    (a) => a.parentId === selectedAccount.id,
                  ).length
                }{" "}
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
                        <span className={`text-[9px] font-black ${child.isPosting ? "text-emerald-500" : "text-slate-600"}`}>
                          {child.isPosting ? "حركي" : "أب"}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-black font-mono ${
                        child.displayBalance === 0
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
          اضغط على أي حساب من الدليل المحاسبي لعرض تفاصيل الحركة المالية
          (Ledger) أو ملخص الحسابات الفرعية.
        </p>
      </div>
    </div>
  </div>
);

// ─── ExpandedLedger ───────────────────────────────────────────────────────

interface ExpandedLedgerProps {
  account: COAWithRollup;
  ledgerLines: LedgerLineItem[];
  loadingLedger: boolean;
  openingBalance: number;
  ledgerFilter: LedgerFilter;
  setLedgerFilter: (f: LedgerFilter) => void;
  onBack: () => void;
}

export const ExpandedLedger: React.FC<ExpandedLedgerProps> = ({
  account,
  ledgerLines,
  loadingLedger,
  openingBalance,
  ledgerFilter,
  setLedgerFilter,
  onBack,
}) => {
  const closingBalance =
    ledgerLines.length > 0
      ? Number(ledgerLines[ledgerLines.length - 1].balance)
      : openingBalance;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden text-right"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
            title="رجوع"
          >
            <Minimize2 size={18} />
          </button>
          <span className="px-3 py-1 bg-red-600/20 text-red-500 rounded-xl border border-red-500/20 text-xs font-black">
            {account.code}
          </span>
          <h3 className="text-2xl font-black text-white">{account.nameAr}</h3>
        </div>

        <div className="flex items-center gap-3">
          <LedgerFilterBar filter={ledgerFilter} onChange={setLedgerFilter} />
          <div className="h-10 w-px bg-white/10 mx-2" />
          <div className="text-left bg-black/40 px-6 py-2 rounded-2xl border border-white/5">
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">
              الرصيد الختامي
            </p>
            <p
              className={`text-xl font-mono font-black ${
                closingBalance >= 0 ? "text-red-500" : "text-emerald-500"
              }`}
            >
              ₪{Math.abs(closingBalance).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        {loadingLedger ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm font-bold">جاري تحميل الكشف...</span>
          </div>
        ) : (
          <table className="w-full text-right text-[11px]">
            <thead className="bg-white/5 sticky top-0 z-10">
              <tr className="text-slate-500 font-black uppercase tracking-[0.1em]">
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">البيان</th>
                <th className="px-4 py-3 text-center">مدين</th>
                <th className="px-4 py-3 text-center">دائن</th>
                <th className="px-4 py-3 text-left">الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {/* سطر الرصيد الافتتاحي */}
              {openingBalance !== 0 && (
                <tr className="bg-slate-950/20">
                  <td className="px-4 py-2 font-mono text-slate-600">—</td>
                  <td className="px-4 py-2 text-slate-500 italic font-bold">رصيد مرحّل</td>
                  <td className="px-4 py-2 text-center text-slate-600">—</td>
                  <td className="px-4 py-2 text-center text-slate-600">—</td>
                  <td className="px-4 py-2 text-left font-mono font-black text-slate-400">
                    ₪{Math.abs(openingBalance).toLocaleString()}
                  </td>
                </tr>
              )}

              {ledgerLines.map((line, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="px-4 py-2 font-mono text-slate-500">
                    {line.date}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="text-white font-bold">
                        {line.description || line.transaction_number}
                      </span>
                      <span className="text-[8px] text-slate-600 font-mono">
                        {line.transaction_number}
                        {line.reference ? ` · ${line.reference}` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center font-mono font-black text-red-500">
                    {Number(line.debit) > 0
                      ? `₪${Number(line.debit).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-center font-mono font-black text-emerald-500">
                    {Number(line.credit) > 0
                      ? `₪${Number(line.credit).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-left font-mono font-black">
                    <span
                      className={
                        Number(line.balance) >= 0
                          ? "text-red-500"
                          : "text-emerald-500"
                      }
                    >
                      ₪{Math.abs(Number(line.balance)).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}

              {ledgerLines.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-20 text-center text-slate-600 font-black italic"
                  >
                    لا توجد حركات مسجلة حسب الفلترة المختارة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-900/30 border-t border-white/5 flex justify-end gap-2">
        <button className="px-6 py-3 bg-white/5 text-slate-400 hover:text-white border border-white/5 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2">
          <Download size={16} /> تصدير PDF
        </button>
        <button className="px-10 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black shadow-xl shadow-red-900/20 hover:bg-red-700 transition-all active:scale-95">
          طباعة الكشف
        </button>
      </div>
    </motion.div>
  );
};