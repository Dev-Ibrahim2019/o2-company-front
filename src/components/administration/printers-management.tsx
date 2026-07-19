/**
 * printers-management.tsx — إدارة الطابعات مع توجيه مدمج
 * ─────────────────────────────────────────────────────────────
 * - Branch Selector في أعلى الصفحة
 * - إضافة/تعديل طابعة مع تحديد النوع (كاشير ↔ POS / أقسام ↔ أقسام+أصناف)
 * - عرض الطابعات مع معلومات التوجيه المرتبطة
 * - اختبار الاتصال والطباعة
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Printer,
  Plus,
  Trash2,
  Pencil,
  Layers,
  Loader2,
  RefreshCw,
  Wifi,
  AlertCircle,
  Search,
  Network,
  Monitor,
  Building2,
  Check,
  X,
  MonitorPlay,
  Package,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "../shared/Toast";
import { usePrinters } from "../../hooks/usePrinters";
import { departmentService } from "../../services/departmentService";
import { branchService } from "../../services/branchService";
import { fetchItems } from "../../services/itemService";
import api from "../../api/axios";
import type {
  Printer as PrinterType,
  PrinterFormData,
  PrinterTypeValue,
} from "../../../types";

// ── Types محلية ──────────────────────────────────────────────

interface CategoryType {
  id: number;
  name: string;
}

interface MenuItemType {
  id: number;
  name: string;
  department_id: number;
}

interface BranchOption {
  id: number;
  name: string;
}

interface PosRegister {
  id: number;
  name: string;
  code: string;
  status: string;
  branch_id: number;
}

// ── Loading & Error ──────────────────────────────────────────

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={32} className="animate-spin text-blue-500" />
      <p className="text-slate-400 text-sm">جاري تحميل بيانات الطابعات...</p>
    </div>
  </div>
);

const ErrorMessage = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <AlertCircle size={48} className="text-rose-500" />
    <p className="text-rose-400 text-sm font-bold">{message}</p>
    <button
      onClick={onRetry}
      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs transition-colors"
    >
      <RefreshCw size={14} /> إعادة المحاولة
    </button>
  </div>
);

// ── Floating Label Input ─────────────────────────────────────

const FloatingInput = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  dir = "rtl",
  disabled = false,
  type = "text",
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  dir?: string;
  disabled?: boolean;
  type?: string;
}) => (
  <div className="relative group">
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-500 group-focus-within:text-blue-400 transition-colors">
      <Icon size={16} />
    </div>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      disabled={disabled}
      className="w-full pr-10 pl-3 py-2.5 bg-slate-800/60 border border-white/5 rounded-lg text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-600 transition-all disabled:opacity-50"
    />
    <span className="absolute -top-2 right-9 text-[9px] font-bold text-slate-500 bg-slate-900 px-1.5 rounded-sm transition-colors group-focus-within:text-blue-400">
      {label}
    </span>
  </div>
);

// ── Floating Select ──────────────────────────────────────────

const FloatingSelect = ({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) => (
  <div className="relative group">
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-slate-500 group-focus-within:text-blue-400 transition-colors pointer-events-none">
      <Icon size={16} />
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full pr-10 pl-3 py-2.5 bg-slate-800/60 border border-white/5 rounded-lg text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <span className="absolute -top-2 right-9 text-[9px] font-bold text-slate-500 bg-slate-900 px-1.5 rounded-sm transition-colors group-focus-within:text-blue-400 pointer-events-none">
      {label}
    </span>
  </div>
);

// ── Status Dot (Ping Indicator) ──────────────────────────────

const StatusDot = ({ isOnline }: { isOnline: boolean }) => (
  <span className="relative inline-flex items-center justify-center w-2.5 h-2.5">
    <span
      className={`absolute inline-flex w-full h-full rounded-full ${
        isOnline
          ? "bg-emerald-400 animate-ping opacity-75"
          : "bg-slate-600"
      }`}
    />
    <span
      className={`relative inline-flex w-2 h-2 rounded-full ${
        isOnline ? "bg-emerald-400" : "bg-slate-500"
      }`}
    />
  </span>
);

// ── Chip/Tag Component ───────────────────────────────────────

const Chip = ({
  label,
  onRemove,
  color = "blue",
}: {
  label: string;
  onRemove?: () => void;
  color?: "blue" | "green" | "purple" | "amber";
}) => {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorMap[color]}`}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-white transition-colors"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
};

// ── المكون الرئيسي ──────────────────────────────────────────

export function PrintersManagement() {
  const {
    printers,
    loading,
    error,
    addPrinter,
    updatePrinter,
    deletePrinter,
    testPrinter,
    refetchAll,
  } = usePrinters();

  // ── Branch Selector ──
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);

  // بيانات الأقسام والأصناف
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);

  // أجهزة POS
  const [posRegisters, setPosRegisters] = useState<PosRegister[]>([]);

  // حالات نموذج الطابعة
  const [printerName, setPrinterName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");
  const [printerType, setPrinterType] = useState<PrinterTypeValue>("KITCHEN");
  const [savingPrinter, setSavingPrinter] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | null>(null);
  const [isInstant, setIsInstant] = useState(false);

  // حالات التوجيه المدمج
  const [linkedPosRegisterId, setLinkedPosRegisterId] = useState<string>("");
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  // فلترة البحث
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPrinterId, setLoadingPrinterId] = useState<number | null>(null);

  // توسيع/طي الأقسام
  const [showDepartments, setShowDepartments] = useState(true);
  const [showItems, setShowItems] = useState(false);

  // ── جلب الفروع ─────────────────────────────────────────────

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const data = await branchService.getAll();
      setBranches(data);
      if (data.length > 0 && selectedBranchId === null) {
        setSelectedBranchId(data[0].id);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoadingBranches(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchBranches();
  }, []);

  // ── جلب أجهزة POS ──────────────────────────────────────────

  const fetchPosRegisters = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      const posRes = await api.get("/admin/pos-registers");
      const posList = (posRes.data.data ?? posRes.data ?? []) as PosRegister[];
      setPosRegisters(posList.filter((p) => p.branch_id === selectedBranchId));
    } catch (err) {
      console.error("Error fetching POS registers:", err);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchPosRegisters();
  }, [fetchPosRegisters]);

  // ── جلب البيانات المساعدة (حسب الفرع) ──────────────────────

  const fetchAuxiliaryData = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      const [deptsData, itemsData] = await Promise.all([
        departmentService.getAll(),
        fetchItems(),
      ]);

      setCategories(
        deptsData
          .filter((d) => {
            const branchIds =
              (d as any).branch_ids || (d as any).branches?.map((b: any) => b.id) || [];
            return branchIds.length === 0 || branchIds.includes(selectedBranchId);
          })
          .map((d) => ({ id: d.id, name: d.name || d.nameAr || "" })),
      );

      setMenuItems(
        itemsData
          .filter((i) => {
            const branchItems =
              (i as any).branches || (i as any).branch_items || (i as any).branch_prices || [];
            return (
              branchItems.length === 0 ||
              branchItems.some(
                (b: any) => b.id === selectedBranchId || b.branch_id === selectedBranchId,
              )
            );
          })
          .map((i) => ({
            id: i.id,
            name: i.name,
            department_id: i.department_id,
          })),
      );
    } catch (err) {
      console.error("Error fetching auxiliary data:", err);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, [fetchAuxiliaryData]);

  // ── إعادة الجلب عند تغيير الفرع ────────────────────────────

  useEffect(() => {
    if (selectedBranchId) {
      refetchAll(selectedBranchId);
      fetchPosRegisters();
    }
  }, [selectedBranchId]);

  // ── دوال المعالجة ──────────────────────────────────────────

  const resetPrinterForm = () => {
    setPrinterName("");
    setIpAddress("");
    setPrinterPort("9100");
    setPrinterType("KITCHEN");
    setLinkedPosRegisterId("");
    setSelectedDepartmentIds([]);
    setSelectedItemIds([]);
    setIsInstant(false);
    setEditingPrinter(null);
  };

  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerName.trim() || !ipAddress.trim()) {
      toast.warning("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (!selectedBranchId) {
      toast.warning("يرجى اختيار الفرع أولاً");
      return;
    }

    // التحقق من الحقول حسب النوع
    if (printerType === "CASHIER") {
      if (!linkedPosRegisterId) {
        toast.warning("يرجى اختيار جهاز الكاشير");
        return;
      }
    } else {
      if (selectedDepartmentIds.length === 0) {
        toast.warning("يرجى تحديد قسم واحد على الأقل");
        return;
      }
    }

    const payload: PrinterFormData = {
      name: printerName.trim(),
      ip_address: ipAddress.trim(),
      port: printerPort.trim() || "9100",
      type: printerType,
      branch_id: selectedBranchId,
      print_on_direct: printerType !== "CASHIER" ? isInstant : false,
      linked_pos_register_id: printerType === "CASHIER" ? Number(linkedPosRegisterId) : null,
      department_ids: printerType !== "CASHIER" ? selectedDepartmentIds : [],
      item_ids: printerType !== "CASHIER" ? selectedItemIds : [],
    };

    try {
      setSavingPrinter(true);
      if (editingPrinter) {
        await updatePrinter(editingPrinter.id, payload);
        toast.success("تم تحديث الطابعة بنجاح");
      } else {
        await addPrinter(payload);
        toast.success("تم تثبيت الطابعة بنجاح", "تمت إضافة الطابعة للنظام");
      }
      resetPrinterForm();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "فشل حفظ الطابعة، تحقق من البيانات";
      toast.error("خطأ في الحفظ", msg);
    } finally {
      setSavingPrinter(false);
    }
  };

  const handleEditPrinter = (printer: PrinterType) => {
    setPrinterName(printer.name);
    setIpAddress(printer.ip_address);
    setPrinterPort(printer.port || "9100");
    setPrinterType(printer.type);
    setLinkedPosRegisterId(printer.linked_pos_register_id?.toString() || "");
    setSelectedDepartmentIds(printer.departments?.map((d) => d.id) || []);
    setSelectedItemIds(printer.items?.map((i) => i.id) || []);
    setIsInstant(printer.print_on_direct ?? false);
    setEditingPrinter(printer);
  };

  const handleDeletePrinter = async (id: number, name: string) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف الطابعة "${name}"؟\nسيتم حذف جميع الارتباطات المرتبطة بها.`,
      )
    ) {
      return;
    }
    try {
      await deletePrinter(id, selectedBranchId ?? undefined);
      toast.success("تم الحذف", `تم حذف الطابعة "${name}" بنجاح`);
    } catch (err: any) {
      toast.error(
        "فشل الحذف",
        err.response?.data?.message || "حدث خطأ أثناء الحذف",
      );
    }
  };

  const handleTestPrint = async (printerId: number) => {
    setLoadingPrinterId(printerId);
    try {
      await api.post(`/admin/printers/${printerId}/test-print`, null, {
        params: selectedBranchId ? { branch_id: selectedBranchId } : {},
      });
      toast.success("تم إرسال أمر الطباعة بنجاح!", "تفقد الطابعة الآن");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "فشلت عملية الاتصال بالطابعة";
      toast.error("فشل الاتصال بالطابعة", errorMessage);
    } finally {
      setLoadingPrinterId(null);
    }
  };

  // ── إدارة الأقسام ─────────────────────────────────────────

  const toggleDepartment = (deptId: number) => {
    setSelectedDepartmentIds((prev) => {
      const next = prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId];

      // إزالة الأصناف التابعة للأقسام المُلغاة
      if (prev.includes(deptId)) {
        const removedDeptItems = menuItems
          .filter((i) => i.department_id === deptId)
          .map((i) => i.id);
        setSelectedItemIds((prevItems) =>
          prevItems.filter((id) => !removedDeptItems.includes(id)),
        );
      }

      return next;
    });
  };

  const toggleItem = (itemId: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  // ── الأصناف المتاحة (حسب الأقسام المحددة) ─────────────────

  const filteredMenuItems =
    selectedDepartmentIds.length > 0
      ? menuItems.filter((i) => selectedDepartmentIds.includes(i.department_id))
      : [];

  // ── تصفية ──────────────────────────────────────────────────

  const filteredPrinters = printers.filter(
    (p) =>
      (!selectedBranchId || p.branch_id === selectedBranchId) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.type.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const printerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CASHIER: "فاتورة كاشير",
      KITCHEN: "كروت مطبخ",
      BAR: "بار ومشروبات",
      OTHER: "أخرى",
    };
    return labels[type] || type;
  };

  const printerTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      CASHIER: "bg-emerald-500/10 text-emerald-400",
      KITCHEN: "bg-amber-500/10 text-amber-400",
      BAR: "bg-purple-500/10 text-purple-400",
      OTHER: "bg-slate-500/10 text-slate-400",
    };
    return colors[type] || "bg-slate-500/10 text-slate-400";
  };

  // ── حالة التحميل ───────────────────────────────────────────

  if (loading || loadingBranches) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto" dir="rtl">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto" dir="rtl">
        <ErrorMessage message={error} onRetry={refetchAll} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1400px] mx-auto" dir="rtl">
      {/* الرأس */}
      <div className="mb-6">
        <h1 className="text-xl font-black text-white flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/20">
            <Printer size={16} className="text-blue-400" />
          </div>
          إدارة الطابعات وتوجيه الطباعة
        </h1>
        <p className="text-[11px] text-slate-500 mt-1 mr-10">
          أضف طابعة وحدد توجيهها: كاشير مرتبط بجهاز POS أو أقسام مرتبطة بأصناف محددة
        </p>
      </div>

      {/* ── Branch Selector ── */}
      <div className="mb-5">
        <div className="bg-slate-900 border border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-xl">
          <Building2 size={18} className="text-blue-400 shrink-0" />
          <span className="text-xs font-bold text-slate-400">الفرع الحالي:</span>
          <select
            value={selectedBranchId ?? ""}
            onChange={(e) =>
              setSelectedBranchId(e.target.value ? Number(e.target.value) : null)
            }
            className="flex-1 p-2 bg-slate-800 rounded-lg text-sm text-white border border-white/5 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            {branches.length === 0 && <option value="">لا توجد فروع</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded-full">
            {filteredPrinters.length} طابعة
          </span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════
       *  Two-Column Layout
       * ═════════════════════════════════════════════════════════ */}
      <div className="flex gap-5 items-stretch">
        {/* ── العمود الأيمن (35%) — نموذج الطابعة ── */}
        <div className="w-[35%] min-w-[320px] flex flex-col">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-xl flex-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <Plus size={16} className="text-blue-400" />
              {editingPrinter ? "تعديل الطابعة" : "إضافة طابعة جديدة"}
            </h2>

            <form onSubmit={handleAddPrinter} className="space-y-4">
              <FloatingInput
                label="اسم الطابعة"
                icon={Printer}
                value={printerName}
                onChange={setPrinterName}
                placeholder="مثال: طابعة المطبخ الرئيسي"
                disabled={savingPrinter}
              />

              <FloatingInput
                label="عنوان IP"
                icon={Network}
                value={ipAddress}
                onChange={setIpAddress}
                placeholder="192.168.1.160"
                dir="ltr"
                disabled={savingPrinter}
              />

              <FloatingInput
                label="المنفذ (Port)"
                icon={Monitor}
                value={printerPort}
                onChange={setPrinterPort}
                placeholder="9100"
                dir="ltr"
                disabled={savingPrinter}
              />

              <FloatingSelect
                label="نوع الطابعة"
                icon={Layers}
                value={printerType}
                onChange={(v) => {
                  setPrinterType(v as PrinterTypeValue);
                  setLinkedPosRegisterId("");
                  setSelectedDepartmentIds([]);
                  setSelectedItemIds([]);
                }}
                disabled={savingPrinter}
                options={[
                  { value: "KITCHEN", label: "مطبخ / أقسام تشغيل (KOT)" },
                  { value: "CASHIER", label: "كاشير / فواتير (BILL)" },
                  { value: "BAR", label: "بار / مشروبات وعصائر" },
                  { value: "OTHER", label: "أخرى / تجهيز واستلام" },
                ]}
              />

              {/* ═══════════════════════════════════════════════════
               *  توجيه حسب النوع
               * ═══════════════════════════════════════════════════ */}

              {/* ── كاشير: اختيار جهاز POS ── */}
              {printerType === "CASHIER" && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <MonitorPlay size={14} />
                    <span className="text-[11px] font-bold">جهاز الكاشير المرتبط</span>
                  </div>
                  <select
                    value={linkedPosRegisterId}
                    onChange={(e) => setLinkedPosRegisterId(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 rounded-lg text-xs text-white border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                    disabled={savingPrinter}
                  >
                    <option value="">-- اختر جهاز الكاشير --</option>
                    {posRegisters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                  {posRegisters.length === 0 && (
                    <p className="text-[10px] text-amber-400/70">
                      لا توجد أجهزة POS في هذا الفرع
                    </p>
                  )}
                </div>
              )}

              {/* ── أقسام/بار/أخرى: اختيار أقسام + أصناف ── */}
              {printerType !== "CASHIER" && (
                <div className="space-y-3">
                  {/* الأقسام */}
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                    <button
                      type="button"
                      onClick={() => setShowDepartments(!showDepartments)}
                      className="w-full flex items-center justify-between text-amber-400 mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <Layers size={14} />
                        <span className="text-[11px] font-bold">
                          الأقسام المرتبطة
                          {selectedDepartmentIds.length > 0 && (
                            <span className="text-[9px] mr-1.5 bg-amber-500/20 px-1.5 py-0.5 rounded-full">
                              {selectedDepartmentIds.length}
                            </span>
                          )}
                        </span>
                      </div>
                      {showDepartments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showDepartments && (
                      <div className="max-h-[160px] overflow-y-auto space-y-1 custom-scrollbar">
                        {categories.length === 0 ? (
                          <p className="text-[10px] text-slate-500">لا توجد أقسام</p>
                        ) : (
                          categories.map((cat) => {
                            const isSelected = selectedDepartmentIds.includes(cat.id);
                            return (
                              <label
                                key={cat.id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? "bg-amber-500/10 border border-amber-500/20"
                                    : "hover:bg-slate-800/50 border border-transparent"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleDepartment(cat.id)}
                                  className="sr-only"
                                />
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "bg-amber-500 border-amber-500"
                                      : "border-slate-600"
                                  }`}
                                >
                                  {isSelected && <Check size={10} className="text-white" />}
                                </div>
                                <span className="text-[11px] text-white font-bold">
                                  {cat.name}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* الأصناف (اختياري) */}
                  {selectedDepartmentIds.length > 0 && (
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                      <button
                        type="button"
                        onClick={() => setShowItems(!showItems)}
                        className="w-full flex items-center justify-between text-blue-400 mb-2"
                      >
                        <div className="flex items-center gap-2">
                          <Package size={14} />
                          <span className="text-[11px] font-bold">
                            أصناف محددة (اختياري)
                            {selectedItemIds.length > 0 && (
                              <span className="text-[9px] mr-1.5 bg-blue-500/20 px-1.5 py-0.5 rounded-full">
                                {selectedItemIds.length}
                              </span>
                            )}
                          </span>
                        </div>
                        {showItems ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {showItems && (
                        <div className="max-h-[160px] overflow-y-auto space-y-1 custom-scrollbar">
                          {filteredMenuItems.length === 0 ? (
                            <p className="text-[10px] text-slate-500">
                              لا توجد أصناف في الأقسام المحددة
                            </p>
                          ) : (
                            filteredMenuItems.map((item) => {
                              const isSelected = selectedItemIds.includes(item.id);
                              return (
                                <label
                                  key={item.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-blue-500/10 border border-blue-500/20"
                                      : "hover:bg-slate-800/50 border border-transparent"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleItem(item.id)}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                      isSelected
                                        ? "bg-blue-500 border-blue-500"
                                        : "border-slate-600"
                                    }`}
                                  >
                                    {isSelected && <Check size={10} className="text-white" />}
                                  </div>
                                  <span className="text-[11px] text-white font-bold">
                                    {item.name}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      )}

                      <p className="text-[9px] text-slate-500 mt-2">
                        إذا لم تحدد أصناف محددة، ستطبع جميع أصناف الأقسام المحددة على هذه الطابعة
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── طباعة فورية (لأقسام التشغيل فقط) ── */}
              {printerType !== "CASHIER" && (
                <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-cyan-400" />
                      <div>
                        <span className="text-[11px] font-bold text-cyan-400">طباعة فورية</span>
                        <p className="text-[9px] text-slate-500">تطبع الكروت تلقائياً عند تأكيد الطلب</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsInstant(!isInstant)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        isInstant ? "bg-cyan-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          isInstant ? "right-0.5" : "right-[22px]"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingPrinter || !selectedBranchId}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                >
                  {savingPrinter ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      {editingPrinter ? "حفظ التعديلات" : "تثبيت الطابعة"}
                    </>
                  )}
                </button>
                {editingPrinter && (
                  <button
                    type="button"
                    onClick={resetPrinterForm}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-bold transition-colors"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ── العمود الأيسر (65%) — الطابعات الفعالة ── */}
        <div className="flex-1 flex flex-col gap-5">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-xl flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Wifi size={15} className="text-emerald-400" />
                طابعات الشبكة الفعالة
                <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-0.5 rounded-full">
                  {filteredPrinters.length}
                </span>
              </h2>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو IP..."
                  className="pr-8 pl-3 py-1.5 bg-slate-800 rounded-lg text-[11px] text-white border border-white/5 focus:border-blue-500 outline-none w-44 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
              {filteredPrinters.length === 0 ? (
                <div className="col-span-full text-center py-10 text-slate-600 text-xs">
                  <Printer size={32} className="mx-auto mb-2 text-slate-700" />
                  {searchQuery
                    ? "لا توجد نتائج للبحث"
                    : "لا توجد طابعات في هذا الفرع"}
                </div>
              ) : (
                filteredPrinters.map((p) => (
                  <div
                    key={p.id}
                    className="group relative bg-slate-800/30 rounded-xl border border-white/5 p-3.5 hover:border-white/10 hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StatusDot isOnline={p.is_active} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white truncate leading-tight">
                            {p.name}
                          </p>
                          <p
                            className="text-[10px] text-slate-500 font-mono mt-0.5"
                            dir="ltr"
                          >
                            {p.ip_address}:{p.port}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleEditPrinter(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                          title="تعديل"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeletePrinter(p.id, p.name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="حذف"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* نوع الطابعة */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${printerTypeColor(
                          p.type,
                        )}`}
                      >
                        {printerTypeLabel(p.type)}
                      </span>
                      {p.type !== "CASHIER" && p.print_on_direct && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                          <Zap size={8} /> فوري
                        </span>
                      )}
                      {!p.is_active && (
                        <span className="text-[9px] text-rose-400/70 font-bold">
                          غير فعالة
                        </span>
                      )}
                    </div>

                    {/* معلومات التوجيه */}
                    <div className="mt-2 space-y-1">
                      {p.type === "CASHIER" && p.linkedPosRegister && (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80">
                          <MonitorPlay size={9} />
                          <span>
                            {p.linkedPosRegister.name} ({p.linkedPosRegister.code})
                          </span>
                        </div>
                      )}
                      {p.type !== "CASHIER" && p.departments && p.departments.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-400/80">
                          <Layers size={9} />
                          <span>{p.departments.length} قسم</span>
                        </div>
                      )}
                      {p.type !== "CASHIER" && p.items && p.items.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-400/80">
                          <Package size={9} />
                          <span>{p.items.length} صنف محدد</span>
                        </div>
                      )}
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex gap-1.5 mt-3">
                      <button
                        onClick={() => handleTestPrint(p.id)}
                        disabled={loadingPrinterId === p.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 disabled:cursor-wait border border-emerald-500/10 hover:border-emerald-500/20"
                      >
                        {loadingPrinterId === p.id ? (
                          <>
                            <Loader2 size={10} className="animate-spin" /> جاري...
                          </>
                        ) : (
                          <>طباعة تجريبية</>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
