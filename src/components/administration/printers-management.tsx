/**
 * printers-management.tsx — إدارة وتوجيه الطابعات الاحترافي (معزول بالأفرع)
 * ─────────────────────────────────────────────────────────────
 * - Branch Selector في أعلى الصفحة
 * - كل البيانات مرتبطة بالفرع المحدد
 * - Two-Column Master-Detail Layout
 * - أجهزة الإرسال: نقاط البيع (POS) + أجهزة الضيافة
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Printer,
  ArrowLeftRight,
  Plus,
  Trash2,
  Pencil,
  Layers,
  Target,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  Search,
  User,
  Network,
  Monitor,
  Building2,
  MonitorPlay,
  HeartHandshake,
  ArrowLeft,
} from "lucide-react";
import { toast } from "../shared/Toast";
import { usePrinters } from "../../hooks/usePrinters";
import { departmentService } from "../../services/departmentService";
import { branchService } from "../../services/branchService";
import { fetchItems } from "../../services/itemService";
import api from "../../api/axios";
import type {
  Printer as PrinterType,
  PrintRoute,
  PrintRouteFormData,
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

interface HospitalityDevice {
  id: number;
  name: string;
  code: string;
  status: string;
  branch_id: number;
}

interface SenderDevice {
  id: number;
  name: string;
  code: string;
  type: "POS" | "HOSPITALITY";
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

// ── المكون الرئيسي ──────────────────────────────────────────

export function PrintersManagement() {
  const {
    printers,
    routes,
    loading,
    error,
    addPrinter,
    deletePrinter,
    addRoute,
    deleteRoute,
    refetchAll,
  } = usePrinters();

  // ── Branch Selector ──
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);

  // بيانات الأقسام والأصناف
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);

  // أجهزة الإرسال (POS + Hospitality)
  const [posRegisters, setPosRegisters] = useState<PosRegister[]>([]);
  const [hospitalityDevices, setHospitalityDevices] = useState<HospitalityDevice[]>([]);

  // حالات نموذج الطابعة
  const [printerName, setPrinterName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");
  const [printerType, setPrinterType] = useState<string>("KITCHEN");
  const [savingPrinter, setSavingPrinter] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | null>(null);

  // حالات مصفوفة التوجيه
  const [routingScope, setRoutingScope] = useState<"CATEGORY" | "ITEM">("CATEGORY");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedPrinterId, setSelectedPrinterId] = useState("");
  const [selectedSenderType, setSelectedSenderType] = useState<"NONE" | "POS" | "HOSPITALITY">("NONE");
  const [selectedSenderId, setSelectedSenderId] = useState("");
  const [savingRoute, setSavingRoute] = useState(false);

  // حالة طباعة تجريبية
  const [loadingPrinterId, setLoadingPrinterId] = useState<number | null>(null);

  // فلترة البحث
  const [searchQuery, setSearchQuery] = useState("");

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

  // ── جلب أجهزة الإرسال (POS + Hospitality) ──────────────────

  const fetchSenderDevices = useCallback(async () => {
    if (!selectedBranchId) return;

    try {
      const [posRes, hospRes] = await Promise.all([
        api.get("/admin/pos-registers"),
        api.get("/admin/hospitality-devices"),
      ]);

      const posList = (posRes.data.data ?? posRes.data ?? []) as PosRegister[];
      const hospList = (hospRes.data.data ?? hospRes.data ?? []) as HospitalityDevice[];

      setPosRegisters(posList.filter(p => p.branch_id === selectedBranchId));
      setHospitalityDevices(hospList.filter(h => h.branch_id === selectedBranchId));
    } catch (err) {
      console.error("Error fetching sender devices:", err);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchSenderDevices();
  }, [fetchSenderDevices]);

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
            const branchIds = (d as any).branch_ids || (d as any).branches?.map((b: any) => b.id) || [];
            return branchIds.length === 0 || branchIds.includes(selectedBranchId);
          })
          .map((d) => ({ id: d.id, name: d.name || d.nameAr || "" })),
      );

      setMenuItems(
        itemsData
          .filter((i) => {
            const branchItems = (i as any).branches || (i as any).branch_items || (i as any).branch_prices || [];
            return branchItems.length === 0 || branchItems.some((b: any) => 
              b.id === selectedBranchId || b.branch_id === selectedBranchId
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
      refetchAll();
      fetchSenderDevices();
    }
  }, [selectedBranchId]);

  // ── دوال المعالجة ──────────────────────────────────────────

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

    try {
      setSavingPrinter(true);
      await addPrinter({
        name: printerName.trim(),
        ip_address: ipAddress.trim(),
        port: printerPort.trim() || "9100",
        type: printerType,
        branch_id: selectedBranchId,
      });
      toast.success("تم تثبيت الطابعة بنجاح", "تمت إضافة الطابعة للنظام");
      resetPrinterForm();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "فشل إضافة الطابعة، تحقق من البيانات";
      toast.error("خطأ في الإضافة", msg);
    } finally {
      setSavingPrinter(false);
    }
  };

  const resetPrinterForm = () => {
    setPrinterName("");
    setIpAddress("");
    setPrinterPort("9100");
    setPrinterType("KITCHEN");
    setEditingPrinter(null);
  };

  const handleEditPrinter = (printer: PrinterType) => {
    setPrinterName(printer.name);
    setIpAddress(printer.ip_address);
    setPrinterPort(printer.port || "9100");
    setPrinterType(printer.type);
    setEditingPrinter(printer);
  };

  const handleDeletePrinter = async (id: number, name: string) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف الطابعة "${name}"؟\nسيتم حذف جميع القواعد المرتبطة بها.`,
      )
    ) {
      return;
    }

    try {
      await deletePrinter(id);
      toast.success("تم الحذف", `تم حذف الطابعة "${name}" بنجاح`);
    } catch (err: any) {
      toast.error(
        "فشل الحذف",
        err.response?.data?.message || "حدث خطأ أثناء الحذف",
      );
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId || !selectedPrinterId) {
      toast.warning("يرجى اختيار الهدف والطابعة");
      return;
    }
    if (selectedSenderType === "NONE") {
      toast.warning("يرجى اختيار جهاز الإرسال (POS أو ضيافة)");
      return;
    }

    const payload: PrintRouteFormData = {
      scope: routingScope,
      printer_id: Number(selectedPrinterId),
      user_id: null,
      pos_register_id: selectedSenderType === "POS" ? Number(selectedSenderId) : null,
      hospitality_device_id: selectedSenderType === "HOSPITALITY" ? Number(selectedSenderId) : null,
      category_id: routingScope === "CATEGORY" ? Number(selectedTargetId) : null,
      item_id: routingScope === "ITEM" ? Number(selectedTargetId) : null,
    };

    try {
      setSavingRoute(true);
      await addRoute(payload);
      toast.success("تم إنشاء قاعدة التوجيه", "ستُطبَع الأصناف الموجهة على الطابعة المحددة");
      setSelectedTargetId("");
      setSelectedPrinterId("");
      setSelectedSenderType("NONE");
      setSelectedSenderId("");
    } catch (err: any) {
      toast.error(
        "فشل إنشاء القاعدة",
        err.response?.data?.message || "تحقق من عدم تكرار القاعدة",
      );
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDeleteRoute = async (id: number) => {
    try {
      await deleteRoute(id);
      toast.success("تم إلغاء القاعدة");
    } catch (err: any) {
      toast.error("فشل إلغاء القاعدة", err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleTestPrint = async (printerId: number) => {
    setLoadingPrinterId(printerId);
    try {
      await api.post(`/admin/printers/${printerId}/test-print`);
      toast.success("تم إرسال أمر الطباعة بنجاح!", "تفقد الطابعة الآن");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "فشلت عملية الاتصال بالطابعة";
      toast.error("فشل الاتصال بالطابعة", errorMessage);
    } finally {
      setLoadingPrinterId(null);
    }
  };

  // ── تصفية ──────────────────────────────────────────────────

  const filteredPrinters = printers.filter(
    (p) =>
      (!selectedBranchId || p.branch_id === selectedBranchId) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.type.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const filteredRoutes = routes.filter(
    (r) => !selectedBranchId || r.branch_id === selectedBranchId,
  );

  const getTargetName = (route: PrintRoute): string => {
    if (route.scope === "CATEGORY" && route.category) return route.category.name;
    if (route.scope === "ITEM" && route.item) return route.item.name;
    const foundCat = categories.find((c) => c.id === route.category_id);
    if (foundCat) return foundCat.name;
    const foundItem = menuItems.find((i) => i.id === route.item_id);
    if (foundItem) return foundItem.name;
    return "---";
  };

  const getSenderName = (route: PrintRoute): string => {
    if (route.posRegister) return `POS: ${route.posRegister.name}`;
    if (route.hospitalityDevice) return `ضيافة: ${route.hospitalityDevice.name}`;
    if (route.user) return route.user.name;
    return "كل الأجهزة";
  };

  const getPrinterName = (route: PrintRoute): string => {
    if (route.printer) return route.printer.name;
    const p = printers.find((pr) => pr.id === route.printer_id);
    return p?.name || "---";
  };

  const printerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CASHIER: "فاتورة كاشير",
      KITCHEN: "كروت مطبخ",
      BAR: "بار ومشروبات",
      OTHER: "أخرى",
    };
    return labels[type] || type;
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
          إدارة وتوجيه الطابعات الاحترافي
        </h1>
        <p className="text-[11px] text-slate-500 mt-1 mr-10">
          تحكم ديناميكي كامل في طباعة الفواتير وأوامر التشغيل — حسب القسم بالكامل أو صنف فردي محدَّد
        </p>
      </div>

      {/* ── Branch Selector ── */}
      <div className="mb-5">
        <div className="bg-slate-900 border border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-xl">
          <Building2 size={18} className="text-blue-400 shrink-0" />
          <span className="text-xs font-bold text-slate-400">الفرع الحالي:</span>
          <select
            value={selectedBranchId ?? ""}
            onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
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
            {filteredPrinters.length} طابعة • {filteredRoutes.length} قاعدة
          </span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════
       *  Two-Column Layout
       * ═════════════════════════════════════════════════════════ */}
      <div className="flex gap-5 items-stretch">
        {/* ── العمود الأيمن (30%) — نموذج الطابعة ── */}
        <div className="w-[30%] min-w-[280px] flex flex-col">
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
                placeholder="مثال: طابعة المشاوي"
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
                onChange={setPrinterType}
                disabled={savingPrinter}
                options={[
                  { value: "KITCHEN", label: "مطبخ / أقسام تشغيل (KOT)" },
                  { value: "CASHIER", label: "كاشير / فواتير (BILL)" },
                  { value: "BAR", label: "بار / مشروبات وعصائر" },
                  { value: "OTHER", label: "أخرى / تجهيز واستلام" },
                ]}
              />

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

        {/* ── العمود الأيسر (70%) — الطابعات + التوجيه ── */}
        <div className="flex-1 flex flex-col gap-5">
          {/* ── أعلى: طابعات الشبكة الفعالة ── */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Wifi size={15} className="text-emerald-400" />
                طابعات الشبكة الفعالة
                <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-0.5 rounded-full">
                  {filteredPrinters.length}
                </span>
              </h2>
              <div className="relative">
                <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو IP..."
                  className="pr-8 pl-3 py-1.5 bg-slate-800 rounded-lg text-[11px] text-white border border-white/5 focus:border-blue-500 outline-none w-44 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto custom-scrollbar">
              {filteredPrinters.length === 0 ? (
                <div className="col-span-2 text-center py-10 text-slate-600 text-xs">
                  <Printer size={32} className="mx-auto mb-2 text-slate-700" />
                  {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد طابعات في هذا الفرع"}
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
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5" dir="ltr">
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
                        <button
                          onClick={() => handleTestPrint(p.id)}
                          disabled={loadingPrinterId === p.id}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50 disabled:cursor-wait"
                          title={loadingPrinterId === p.id ? "جاري الاتصال..." : "طباعة تجريبية"}
                        >
                          {loadingPrinterId === p.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <span className="text-[11px] leading-none">🖨️</span>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          p.type === "CASHIER"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : p.type === "BAR"
                              ? "bg-purple-500/10 text-purple-400"
                              : p.type === "KITCHEN"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {printerTypeLabel(p.type)}
                      </span>
                      {!p.is_active && (
                        <span className="text-[9px] text-rose-400/70 font-bold">غير فعالة</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleTestPrint(p.id)}
                      disabled={loadingPrinterId === p.id}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 disabled:cursor-wait border border-emerald-500/10 hover:border-emerald-500/20"
                    >
                      {loadingPrinterId === p.id ? (
                        <>
                          <Loader2 size={10} className="animate-spin" /> جاري الاتصال... ⏳
                        </>
                      ) : (
                        <>🖨️ طباعة تجريبية</>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── أسفل: مصفوفة التوجيه الذكية ── */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-xl flex-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <ArrowLeftRight size={16} className="text-purple-400" />
              مصفوفة وقواعد توجيه الطباعة
              <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-0.5 rounded-full">
                {filteredRoutes.length}
              </span>
            </h2>

            {/* نموذج إنشاء قاعدة — Flex/Wrap */}
            <form
              onSubmit={handleCreateRoute}
              className="flex flex-wrap gap-2.5 items-end mb-4 bg-slate-800/20 p-3 rounded-xl"
            >
              {/* 1. نوع جهاز الإرسال */}
              <div className="w-[110px]">
                <label className="block text-[9px] font-bold text-slate-500 mb-1">نوع الجهاز</label>
                <select
                  value={selectedSenderType}
                  onChange={(e) => {
                    setSelectedSenderType(e.target.value as "NONE" | "POS" | "HOSPITALITY");
                    setSelectedSenderId("");
                  }}
                  className="w-full p-2 bg-slate-800 rounded-lg text-[11px] text-white border border-white/5 outline-none cursor-pointer"
                  disabled={savingRoute}
                >
                  <option value="NONE">-- اختر --</option>
                  <option value="POS">نقطة بيع (POS)</option>
                  <option value="HOSPITALITY">جهاز ضيافة</option>
                </select>
              </div>

              {/* 2. جهاز الإرسال المحدد */}
              <div className="flex-[2] min-w-[150px]">
                <label className="block text-[9px] font-bold text-slate-500 mb-1">جهاز الإرسال</label>
                <select
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  className="w-full p-2 bg-slate-800 rounded-lg text-[11px] text-white border border-white/5 outline-none cursor-pointer"
                  required
                  disabled={savingRoute || selectedSenderType === "NONE"}
                >
                  <option value="">-- اختر الجهاز --</option>
                  {selectedSenderType === "POS" &&
                    posRegisters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  {selectedSenderType === "HOSPITALITY" &&
                    hospitalityDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                </select>
              </div>

              {/* 3. نطاق التوجيه */}
              <div className="w-[110px]">
                <label className="block text-[9px] font-bold text-slate-500 mb-1">النطاق</label>
                <select
                  value={routingScope}
                  onChange={(e) => {
                    setRoutingScope(e.target.value as "CATEGORY" | "ITEM");
                    setSelectedTargetId("");
                  }}
                  className="w-full p-2 bg-slate-800 rounded-lg text-[11px] text-white border border-white/5 outline-none cursor-pointer"
                  disabled={savingRoute}
                >
                  <option value="CATEGORY">قسم كامل</option>
                  <option value="ITEM">صنف فردي</option>
                </select>
              </div>

              {/* 4. الهدف */}
              <div className="flex-[2] min-w-[150px]">
                <label className="block text-[9px] font-bold text-slate-500 mb-1">الهدف</label>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full p-2 bg-slate-800 rounded-lg text-[11px] text-white border border-white/5 outline-none cursor-pointer"
                  required
                  disabled={savingRoute}
                >
                  <option value="">-- اختر --</option>
                  {routingScope === "CATEGORY"
                    ? categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    : menuItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                </select>
              </div>

              {/* 5. طابعة الإخراج */}
              <div className="flex-[2] min-w-[150px]">
                <label className="block text-[9px] font-bold text-slate-500 mb-1">طابعة الإخراج</label>
                <select
                  value={selectedPrinterId}
                  onChange={(e) => setSelectedPrinterId(e.target.value)}
                  className="w-full p-2 bg-slate-800 rounded-lg text-[11px] text-white border border-white/5 outline-none cursor-pointer"
                  required
                  disabled={savingRoute}
                >
                  <option value="">اختر طابعة...</option>
                  {filteredPrinters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={savingRoute}
                className="h-[34px] px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 flex items-center gap-1.5 active:scale-[0.98]"
              >
                {savingRoute ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                إنشاء
              </button>
            </form>

            {/* جدول القواعد — أو Empty State */}
            {filteredRoutes.length === 0 ? (
              <div className="text-center py-10 bg-slate-800/10 rounded-xl border border-dashed border-white/5">
                <div className="w-14 h-14 mx-auto bg-purple-500/5 rounded-full flex items-center justify-center border border-purple-500/10 mb-3">
                  <ArrowLeftRight size={24} className="text-purple-400/50" />
                </div>
                <p className="text-slate-500 text-xs font-bold mb-1">لا توجد قواعد توجيه في هذا الفرع</p>
                <p className="text-[10px] text-slate-600 mb-4">
                  أنشئ قاعدة جديدة لتوجيه الطباعة إلى الطابعة المناسبة
                </p>
                <button
                  type="button"
                  onClick={() => {
                    document.querySelector("form")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-[11px] font-bold hover:bg-purple-600/30 transition-colors border border-purple-500/20"
                >
                  <Plus size={13} /> إنشاء أول قاعدة
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/5">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-2.5 pr-4">جهاز الإرسال</th>
                      <th className="p-2.5">نطاق التوجيه</th>
                      <th className="p-2.5">الهدف المستهدف</th>
                      <th className="p-2.5">طابعة الإخراج</th>
                      <th className="p-2.5 text-center pl-4">التحكم</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 divide-y divide-white/5">
                    {filteredRoutes.map((r) => (
                      <tr
                        key={r.id}
                        className="group hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-2.5 pr-4 text-[11px] font-semibold text-slate-400">
                          <span className="flex items-center gap-1.5">
                            {r.posRegister ? (
                              <MonitorPlay size={10} className="text-emerald-500 shrink-0" />
                            ) : r.hospitalityDevice ? (
                              <HeartHandshake size={10} className="text-purple-500 shrink-0" />
                            ) : (
                              <User size={10} className="text-slate-500 shrink-0" />
                            )}
                            {getSenderName(r)}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[9px] ${
                              r.scope === "CATEGORY"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-green-500/10 text-green-400 border border-green-500/20"
                            }`}
                          >
                            {r.scope === "CATEGORY" ? (
                              <Layers size={9} />
                            ) : (
                              <Target size={9} />
                            )}
                            {r.scope === "CATEGORY" ? "قسم كامل" : "صنف فردي"}
                          </span>
                        </td>
                        <td className="p-2.5 text-[12px] font-bold text-white">
                          {getTargetName(r)}
                        </td>
                        <td className="p-2.5">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400">
                            <ArrowLeft size={10} className="text-slate-600 shrink-0" />
                            {getPrinterName(r)}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDeleteRoute(r.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                              title="حذف القاعدة"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}