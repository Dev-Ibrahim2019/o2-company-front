import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight, Save, Send, Printer, Eye, EyeOff, Plus, Trash2,
  FileText, Search, UserPlus, Hash, DollarSign, MessageSquare,
  ChevronLeft, Maximize2, Minimize2, X, Loader2, CheckCircle2,
  AlertTriangle, ChevronDown, Mail, Phone, Copy, Download,
  Paperclip, Image, Share2, Globe,
} from "lucide-react";
import { useApp, useAppContext } from "../../../store";
import { quoteService } from "../../services/quoteService";
import { customerService } from "../../services/customerService";
import { fetchItems, type Item } from "../../services/itemService";
import type { Quote, QuoteItem, QuoteFormData } from "../../types/priceQuote";
import {
  EMPTY_QUOTE_ITEM, calculateQuoteItemTotals, calculateQuoteTotals,
  formatQuoteCurrency, CURRENCIES, TAX_RATES,
} from "../../types/priceQuote";
import { toast } from "../shared/Toast";
import html2pdf from "html2pdf.js";

interface Props {
  editingId?: number;
  onBack: () => void;
  onSaved: (id: number) => void;
}

/* ─── PDF Generation ─── */
async function generateQuotePdf(quoteNumber: string): Promise<Blob> {
  const el = document.getElementById("quote-preview-content");
  if (!el) throw new Error("Preview element not found");
  const cloned = el.cloneNode(true) as HTMLElement;
  cloned.style.width = "210mm";
  cloned.style.padding = "15mm";
  cloned.style.background = "#ffffff";
  cloned.style.color = "#111827";
  const opt = {
    margin: 0,
    filename: `${quoteNumber}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  };
  const worker = html2pdf().set(opt).from(cloned);
  return worker.outputPdf("blob");
}

/* ─── Share Token ─── */
function generateShareToken(): string {
  return "quo_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

/* ─── Inline Item Row with embedded search ─── */
const ItemRow = ({
  item, index, currency, menuItems, isLast,
  onUpdate, onRemove, canRemove,
}: {
  item: QuoteItem;
  index: number;
  currency: string;
  menuItems: Item[];
  isLast: boolean;
  onUpdate: (idx: number, field: keyof QuoteItem, value: any) => void;
  onRemove: (idx: number) => void;
  canRemove: boolean;
}) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return [];
    const s = search.toLowerCase();
    return menuItems
      .filter((mi) =>
        mi.name?.toLowerCase().includes(s) ||
        mi.name_ar?.toLowerCase().includes(s) ||
        mi.code?.toLowerCase().includes(s)
      )
      .slice(0, 8);
  }, [search, menuItems]);

  const displayName = (mi: Item) => mi.name_ar || mi.name || "";
  const codeOf = (mi: Item) => mi.code || "";

  const selectItem = (mi: Item) => {
    const name = displayName(mi);
    const code = codeOf(mi);
    const desc = code ? `${code} - ${name}` : name;
    onUpdate(index, "description", desc);
    onUpdate(index, "unit_price", Number(mi.price) ?? 0);
    onUpdate(index, "tax_rate", 0);
    onUpdate(index, "item_id", mi.id);
    setSearch("");
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg border"
      style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}
    >
      {/* Description with inline search */}
      <div className="col-span-4 relative" ref={wrapRef}>
        {index === 0 && <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>الوصف / المنتج *</label>}
        <input
          type="text"
          value={open ? search : item.description}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => { setSearch(""); setOpen(true); }}
          onClick={() => { setSearch(""); setOpen(true); }}
          placeholder="ابحث عن منتج بالاسم أو الكود..."
          className="w-full px-2 py-1.5 rounded text-xs border"
          style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
        />
        {open && (
          <div
            className="absolute top-full mt-1 w-full rounded-lg border shadow-xl z-50 max-h-56 overflow-y-auto"
            style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[11px]" style={{ color: "var(--o2-muted)" }}>
                {search ? "لا توجد نتائج" : "اكتب للبحث عن منتج"}
              </div>
            ) : (
              filtered.map((mi) => (
                <button
                  key={mi.id}
                  onMouseDown={(e) => { e.preventDefault(); selectItem(mi); }}
                  className="w-full px-3 py-2 text-right text-xs hover:opacity-80 flex items-center justify-between gap-2"
                  style={{ color: "var(--o2-text)" }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold">{displayName(mi)}</span>
                    <span className="text-[10px]" style={{ color: "var(--o2-muted)" }}>{codeOf(mi)}</span>
                  </div>
                  <span className="shrink-0 font-bold" style={{ color: "var(--o2-success-text)" }}>
                    {formatQuoteCurrency(mi.price ?? 0, currency)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="col-span-1">
        {index === 0 && <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>الكمية</label>}
        <input
          type="number" min="0" step="0.01"
          value={item.quantity}
          onChange={(e) => onUpdate(index, "quantity", parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1.5 rounded text-xs border text-center"
          style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
        />
      </div>

      {/* Price */}
      <div className="col-span-2">
        {index === 0 && <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>السعر</label>}
        <input
          type="number" min="0" step="0.01"
          value={item.unit_price}
          onChange={(e) => onUpdate(index, "unit_price", parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1.5 rounded text-xs border"
          style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
        />
      </div>

      {/* Tax */}
      <div className="col-span-1">
        {index === 0 && <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>الضريبة %</label>}
        <select
          value={item.tax_rate}
          onChange={(e) => onUpdate(index, "tax_rate", parseFloat(e.target.value))}
          className="w-full px-1 py-1.5 rounded text-xs border"
          style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
        >
          {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
        </select>
      </div>

      {/* Discount */}
      <div className="col-span-1">
        {index === 0 && <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>الخصم %</label>}
        <input
          type="number" min="0" max="100"
          value={item.discount_percent}
          onChange={(e) => onUpdate(index, "discount_percent", parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1.5 rounded text-xs border text-center"
          style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
        />
      </div>

      {/* Total */}
      <div className="col-span-2">
        {index === 0 && <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--o2-muted)" }}>الإجمالي</label>}
        <div className="px-2 py-1.5 rounded text-xs font-bold text-center" style={{ backgroundColor: "var(--o2-surface)", color: "var(--o2-success-text)" }}>
          {formatQuoteCurrency(item.total, currency)}
        </div>
      </div>

      {/* Remove */}
      <div className="col-span-1 flex items-end justify-center">
        <button
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="p-1.5 rounded-lg transition disabled:opacity-30"
          style={{ color: "#ef4444" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

/* ─── Quick Add Client Modal ─── */
const QuickAddClientModal = ({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: any) => void;
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      const res = await customerService.create({ name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined } as any);
      const newCustomer = (res as any).data ?? res;
      toast.success("تم إضافة العميل");
      onCreated(newCustomer);
      setName(""); setPhone(""); setEmail("");
      onClose();
    } catch {
      toast.error("فشل إضافة العميل");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="rounded-2xl border shadow-2xl p-6 max-w-sm w-full mx-4" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold" style={{ color: "var(--o2-text)" }}>إضافة عميل جديد</h3>
          <button onClick={onClose} className="p-1" style={{ color: "var(--o2-muted)" }}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--o2-muted)" }}>اسم العميل *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border" autoFocus
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
              placeholder="الاسم الكامل" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--o2-muted)" }}>رقم الهاتف</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
              placeholder="05xxxxxxxx" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--o2-muted)" }}>البريد الإلكتروني</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
              placeholder="email@example.com" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border" style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>إلغاء</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: "var(--o2-brand)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            حفظ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Main Component ─── */
export const QuoteFormPage = ({ editingId, onBack, onSaved }: Props) => {
  const { branches, currentUser } = useAppContext();
  const isEditing = !!editingId;

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [showQuickAddClient, setShowQuickAddClient] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // API data for items and customers
  const [apiItems, setApiItems] = useState<Item[]>([]);
  const [apiCustomers, setApiCustomers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // SendPanel state
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<number | null>(null);
  const [savedQuoteNumber, setSavedQuoteNumber] = useState("");

  // Split view ratio (saved to localStorage)
  const savedRatio = typeof window !== "undefined" ? Number(localStorage.getItem("quote-split-ratio")) : 50;
  const [splitRatio, setSplitRatio] = useState(isFinite(savedRatio) && savedRatio > 20 && savedRatio < 80 ? savedRatio : 50);
  const isDragging = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<QuoteFormData>({
    client_id: undefined,
    client_name: "",
    client_phone: "",
    client_email: "",
    issue_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    currency: "ILS",
    status: "draft",
    notes: "",
    terms: "العرض ساري لمدة 30 يوماً من تاريخ الإصدار.",
    branch_id: currentUser?.branchId ? Number(currentUser.branchId) : 1,
    items: [{ ...EMPTY_QUOTE_ITEM, sort_order: 0 }],
  });

  const [quoteNumber, setQuoteNumber] = useState("QUO-00001");

  useEffect(() => {
    if (editingId) {
      (async () => {
        try {
          const q = await quoteService.getOne(editingId);
          setForm({
            client_id: q.client_id, client_name: q.client_name, client_phone: q.client_phone,
            client_email: q.client_email, issue_date: q.issue_date, expiry_date: q.expiry_date,
            currency: q.currency, status: q.status, notes: q.notes, terms: q.terms,
            branch_id: q.branch_id, items: q.items?.length ? q.items : [{ ...EMPTY_QUOTE_ITEM, sort_order: 0 }],
          });
          setQuoteNumber(q.quote_number);
        } catch { /* ignore */ }
      })();
    }
  }, [editingId]);

  // Fetch items and customers from API on mount
  useEffect(() => {
    (async () => {
      setLoadingData(true);
      try {
        const [items, custs] = await Promise.all([
          fetchItems().catch(() => []),
          customerService.getAll().catch(() => []),
        ]);
        setApiItems(items);
        setApiCustomers(custs);
      } catch { /* ignore */ }
      setLoadingData(false);
    })();
  }, []);

  const totals = useMemo(() => calculateQuoteTotals(form.items), [form.items]);

  const filteredClients = useMemo(() => {
    const s = (clientSearch || "").toLowerCase();
    if (!s) return apiCustomers.slice(0, 10);
    return apiCustomers
      .filter((c) => c.name?.toLowerCase().includes(s) || c.phone?.includes(s) || (c as any).email?.toLowerCase().includes(s))
      .slice(0, 10);
  }, [clientSearch, apiCustomers]);

  /* ─── Split View Drag ─── */
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const pct = Math.min(80, Math.max(20, (x / rect.width) * 100));
      setSplitRatio(pct);
    };

    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("quote-split-ratio", String(splitRatio));
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [splitRatio]);

  /* ─── Item Operations ─── */
  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      items[index] = calculateQuoteItemTotals(items[index]);
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_QUOTE_ITEM, sort_order: prev.items.length }],
    }));
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  /* ─── Validation ─── */
  const validate = (): string[] => {
    const errors: string[] = [];
    if (!form.client_id && !form.client_name?.trim()) errors.push("يجب اختيار أو إدخال عميل");
    if (!form.issue_date) errors.push("تاريخ الإصدار مطلوب");
    if (form.items.length === 0) errors.push("يجب إضافة بند واحد على الأقل");
    form.items.forEach((item, i) => {
      if (!item.description?.trim()) errors.push(`البند ${i + 1}: الوصف مطلوب`);
      if (item.quantity <= 0) errors.push(`البند ${i + 1}: الكمية يجب أن تكون أكبر من صفر`);
      if (item.unit_price < 0) errors.push(`البند ${i + 1}: السعر لا يمكن أن يكون سالباً`);
    });
    return errors;
  };

  /* ─── Save ─── */
  const handleSave = async (sendEmail?: boolean) => {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error(errors[0]);
      return;
    }
    setValidationErrors([]);

    if (sendEmail) {
      // Save & Send → just save first, then open SendPanel
      setLoading(true);
      try {
        const payload: QuoteFormData = { ...form, status: "draft" };
        let result: Quote;
        if (isEditing && editingId) {
          result = await quoteService.update(editingId, payload) as Quote;
        } else {
          result = await quoteService.create(payload) as Quote;
        }
        setSavedQuoteId(result.id);
        setSavedQuoteNumber(result.quote_number || quoteNumber);
        toast.success("تم الحفظ بنجاح");
        setShowSendPanel(true);
      } catch (err: any) {
        toast.error(err?.message || "حدث خطأ أثناء الحفظ");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Save only (draft)
    setLoading(true);
    try {
      const payload: QuoteFormData = { ...form, status: "draft" };
      let result: Quote;
      if (isEditing && editingId) {
        result = await quoteService.update(editingId, payload) as Quote;
      } else {
        result = await quoteService.create(payload) as Quote;
      }
      setSavedQuoteId(result.id);
      setSavedQuoteNumber(result.quote_number || quoteNumber);
      toast.success("تم الحفظ بنجاح");
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Print (preview only via popup) ─── */
  const handlePrint = () => {
    const previewEl = document.getElementById("quote-preview-content");
    if (!previewEl) return;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8"/>
        <title>عرض سعر ${quoteNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px; }
          th { background: #f3f4f6; font-weight: bold; }
          .total-row { border-top: 2px solid #111827; font-weight: black; font-size: 15px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${previewEl.innerHTML}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  /* ─── Client Selection ─── */
  const selectClient = (c: any) => {
    setForm((prev) => ({
      ...prev, client_id: c.id, client_name: c.name,
      client_phone: c.phone, client_email: c.email,
    }));
    setClientSearch("");
    setShowClientDropdown(false);
  };

  const handleQuickAddClient = (newCustomer: any) => {
    setApiCustomers((prev) => [newCustomer, ...prev]);
    selectClient(newCustomer);
  };

  /* ─── Preview Content (shared between inline and fullscreen) ─── */
  const previewContent = (
    <div id="quote-preview-content" className="p-8">
      <div className="text-center mb-8 pb-4 border-b" style={{ borderColor: "#e5e7eb" }}>
        <h2 className="text-2xl font-black" style={{ color: "#111827" }}>عرض سعر</h2>
        <p className="text-sm font-mono mt-1" style={{ color: "#6b7280" }}>{quoteNumber}</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8 text-sm" style={{ color: "#374151" }}>
        <div>
          <p className="font-bold mb-2 pb-1 border-b" style={{ color: "#6b7280", borderColor: "#e5e7eb" }}>من:</p>
          <p className="font-bold text-base">شركة O2</p>
        </div>
        <div>
          <p className="font-bold mb-2 pb-1 border-b" style={{ color: "#6b7280", borderColor: "#e5e7eb" }}>إلى:</p>
          <p className="font-bold text-base">{form.client_name || "—"}</p>
          {form.client_phone && <p className="mt-1">{form.client_phone}</p>}
          {form.client_email && <p style={{ color: "#6b7280" }}>{form.client_email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 text-sm" style={{ color: "#374151" }}>
        <div><p style={{ color: "#6b7280" }}>تاريخ الإصدار:</p><p className="font-bold">{form.issue_date}</p></div>
        <div><p style={{ color: "#6b7280" }}>تاريخ الانتهاء:</p><p className="font-bold">{form.expiry_date || "—"}</p></div>
        <div><p style={{ color: "#6b7280" }}>العملة:</p><p className="font-bold">{CURRENCIES.find((c) => c.value === form.currency)?.label || form.currency}</p></div>
      </div>

      <table className="w-full text-sm mb-8">
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            <th className="px-4 py-3 text-right font-bold" style={{ color: "#374151", borderBottom: "2px solid #e5e7eb" }}>#</th>
            <th className="px-4 py-3 text-right font-bold" style={{ color: "#374151", borderBottom: "2px solid #e5e7eb" }}>الوصف</th>
            <th className="px-4 py-3 text-center font-bold" style={{ color: "#374151", borderBottom: "2px solid #e5e7eb" }}>الكمية</th>
            <th className="px-4 py-3 text-center font-bold" style={{ color: "#374151", borderBottom: "2px solid #e5e7eb" }}>السعر</th>
            <th className="px-4 py-3 text-center font-bold" style={{ color: "#374151", borderBottom: "2px solid #e5e7eb" }}>الضريبة</th>
            <th className="px-4 py-3 text-left font-bold" style={{ color: "#374151", borderBottom: "2px solid #e5e7eb" }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {form.items.map((item, idx) => (
            <tr key={idx}>
              <td className="px-4 py-3 text-right" style={{ color: "#6b7280" }}>{idx + 1}</td>
              <td className="px-4 py-3 text-right font-bold" style={{ color: "#111827" }}>{item.description || "—"}</td>
              <td className="px-4 py-3 text-center" style={{ color: "#374151" }}>{item.quantity}</td>
              <td className="px-4 py-3 text-center" style={{ color: "#374151" }}>{formatQuoteCurrency(item.unit_price, form.currency)}</td>
              <td className="px-4 py-3 text-center" style={{ color: "#6b7280" }}>{item.tax_rate}%</td>
              <td className="px-4 py-3 text-left font-bold" style={{ color: "#111827" }}>{formatQuoteCurrency(item.total, form.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-8">
        <div className="w-72 space-y-3 text-sm">
          <div className="flex justify-between" style={{ color: "#374151" }}>
            <span>المجموع الفرعي:</span><span className="font-bold">{formatQuoteCurrency(totals.subtotal, form.currency)}</span>
          </div>
          <div className="flex justify-between" style={{ color: "#374151" }}>
            <span>الضريبة:</span><span className="font-bold">{formatQuoteCurrency(totals.tax_total, form.currency)}</span>
          </div>
          <div className="flex justify-between pt-3 border-t text-base" style={{ borderColor: "#111827", color: "#111827" }}>
            <span className="font-black">الإجمالي:</span>
            <span className="font-black">{formatQuoteCurrency(totals.total, form.currency)}</span>
          </div>
        </div>
      </div>

      {form.notes && (
        <div className="mb-4 text-sm">
          <p className="font-bold mb-1" style={{ color: "#6b7280" }}>ملاحظات:</p>
          <p style={{ color: "#374151" }}>{form.notes}</p>
        </div>
      )}
      {form.terms && (
        <div className="text-sm">
          <p className="font-bold mb-1" style={{ color: "#6b7280" }}>الشروط والأحكام:</p>
          <p style={{ color: "#374151" }}>{form.terms}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--o2-bg)" }} dir="rtl">
      {/* Loading data indicator */}
      {loadingData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="rounded-xl p-6 flex flex-col items-center gap-3" style={{ backgroundColor: "var(--o2-surface)" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--o2-brand)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--o2-text)" }}>جاري تحميل البيانات...</span>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-40 border-b shrink-0" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg transition" style={{ color: "var(--o2-muted)" }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold" style={{ color: "var(--o2-text)" }}>
              {isEditing ? `تعديل العرض ${quoteNumber}` : "إنشاء عرض سعر جديد"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
              style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? "إخفاء المعاينة" : "المعاينة"}
            </button>
            <button onClick={handlePrint}
              className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border"
              style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
              <Printer className="w-3.5 h-3.5" /> طباعة
            </button>
            <button onClick={() => handleSave(false)}
              disabled={loading || sending}
              className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border disabled:opacity-50"
              style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              حفظ
            </button>
            <button onClick={() => handleSave(true)}
              disabled={loading || sending}
              className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--o2-brand)" }}>
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              حفظ وإرسال
            </button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="px-6 pb-3">
            <div className="rounded-lg p-3 text-xs flex items-start gap-2" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                {validationErrors.map((err, i) => <p key={i}>{err}</p>)}
              </div>
              <button onClick={() => setValidationErrors([])} className="mr-auto shrink-0"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Split View Content ─── */}
      <div ref={splitContainerRef} className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 60px)" }}>
        {/* Form Column */}
        {showPreview ? (
          <div style={{ width: `${splitRatio}%` }} className="overflow-y-auto p-6 space-y-5">
            <QuoteFormFields form={form} setForm={setForm} quoteNumber={quoteNumber} setQuoteNumber={setQuoteNumber}
              customers={apiCustomers} filteredClients={filteredClients} showClientDropdown={showClientDropdown}
              setShowClientDropdown={setShowClientDropdown} clientSearch={clientSearch} setClientSearch={setClientSearch}
              selectClient={selectClient} onQuickAddClient={() => setShowQuickAddClient(true)}
              menuItems={apiItems} updateItem={updateItem} addItem={addItem} removeItem={removeItem}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <QuoteFormFields form={form} setForm={setForm} quoteNumber={quoteNumber} setQuoteNumber={setQuoteNumber}
              customers={apiCustomers} filteredClients={filteredClients} showClientDropdown={showClientDropdown}
              setShowClientDropdown={setShowClientDropdown} clientSearch={clientSearch} setClientSearch={setClientSearch}
              selectClient={selectClient} onQuickAddClient={() => setShowQuickAddClient(true)}
              menuItems={apiItems} updateItem={updateItem} addItem={addItem} removeItem={removeItem}
            />
          </div>
        )}

        {/* Draggable Divider */}
        {showPreview && (
          <div
            onMouseDown={onDragStart}
            className="w-1.5 cursor-col-resize flex items-center justify-center shrink-0 group hover:bg-red-500/20 transition-colors"
            style={{ backgroundColor: "var(--o2-border)" }}
            title="سحب لتعديل العرض"
          >
            <div className="w-0.5 h-8 rounded-full group-hover:bg-red-500 transition-colors" style={{ backgroundColor: "var(--o2-muted)" }} />
          </div>
        )}

        {/* Preview Column */}
        {showPreview && (
          <div style={{ width: `${100 - splitRatio}%` }} className="overflow-y-auto p-6">
            <div className="rounded-xl border shadow-lg sticky top-6" style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "#e5e7eb" }}>
                <span className="text-xs font-bold" style={{ color: "#6b7280" }}>معاينة عرض السعر</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setFullscreen(true)} className="p-1.5 rounded hover:bg-gray-100" title="عرض كامل">
                    <Maximize2 className="w-3.5 h-3.5" style={{ color: "#6b7280" }} />
                  </button>
                  <button onClick={handlePrint} className="p-1.5 rounded hover:bg-gray-100" title="طباعة">
                    <Printer className="w-3.5 h-3.5" style={{ color: "#6b7280" }} />
                  </button>
                </div>
              </div>
              {previewContent}
            </div>
          </div>
        )}
      </div>

      {/* ─── Fullscreen Preview Modal ─── */}
      {fullscreen && createPortal(
        <div className="fixed inset-0 z-[10000] flex flex-col bg-white" dir="rtl">
          <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "#e5e7eb" }}>
            <span className="text-sm font-bold" style={{ color: "#374151" }}>معاينة عرض السعر — {quoteNumber}</span>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border" style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                <Printer className="w-3.5 h-3.5" /> طباعة
              </button>
              <button onClick={() => setFullscreen(false)} className="p-2 rounded-lg hover:bg-gray-100" style={{ color: "#374151" }}>
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto flex justify-center" style={{ backgroundColor: "#f9fafb" }}>
            <div className="w-full max-w-3xl my-8 rounded-xl border shadow-lg" style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}>
              {previewContent}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Quick Add Client Modal ─── */}
      <QuickAddClientModal open={showQuickAddClient} onClose={() => setShowQuickAddClient(false)} onCreated={handleQuickAddClient} />

      {/* ─── Send Panel (Email / WhatsApp) ─── */}
      {showSendPanel && savedQuoteId && createPortal(
        <SendPanel
          quoteId={savedQuoteId}
          quoteNumber={savedQuoteNumber}
          form={form}
          previewContent={previewContent}
          onClose={() => setShowSendPanel(false)}
          onSent={() => { setShowSendPanel(false); onSaved(savedQuoteId); }}
        />,
        document.body
      )}
    </div>
  );
};

/* ─── Send Panel (Email / WhatsApp) ─── */
const SendPanel = ({
  quoteId, quoteNumber, form, previewContent, onClose, onSent,
}: {
  quoteId: number;
  quoteNumber: string;
  form: QuoteFormData;
  previewContent: React.ReactNode;
  onClose: () => void;
  onSent: () => void;
}) => {
  const [tab, setTab] = useState<"email" | "whatsapp">("email");
  const [sending, setSending] = useState(false);

  // Email state
  const [emailTo, setEmailTo] = useState(form.client_email || "");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [emailSubject, setEmailSubject] = useState(`عرض سعر ${quoteNumber} من o2`);
  const [emailBody, setEmailBody] = useState(
    `亲爱的 العميل،\n\nيرجى التكرم بالاطلاع على عرض السعر المرفق.\n\nوشكراً\n\nمع خالص التقدير،\nفريق o2`
  );

  // WhatsApp state
  const [whatsappPhone, setWhatsappPhone] = useState(form.client_phone || "");
  const [whatsappMessage, setWhatsappMessage] = useState(
    `عرض سعر ${quoteNumber}\n\nيرجى التكرم بالاطلاع على عرض السعر المرفق.\nوشكراً`
  );

  // Share link
  const [shareToken] = useState(() => generateShareToken());
  const shareUrl = `${window.location.origin}/l/d/${shareToken}`;

  const handleSendEmail = async () => {
    if (!emailTo.trim()) { toast.error("حقل المستلزم (To) مطلوب"); return; }
    setSending(true);
    try {
      // Try to generate PDF
      let pdfBlob: Blob | null = null;
      try {
        pdfBlob = await generateQuotePdf(quoteNumber);
      } catch { /* PDF generation optional */ }

      // Backend call to send email
      const formData = new FormData();
      formData.append("to", emailTo);
      if (emailCc) formData.append("cc", emailCc);
      if (emailBcc) formData.append("bcc", emailBcc);
      formData.append("subject", emailSubject);
      formData.append("body", emailBody);
      formData.append("quote_id", String(quoteId));
      if (pdfBlob) {
        formData.append("attachment", new Blob([pdfBlob], { type: "application/pdf" }), `${quoteNumber}.pdf`);
      }

      // Try backend endpoint, fallback to mailto
      try {
        await fetch(`/api/quotes/${quoteId}/send-email`, {
          method: "POST",
          body: formData,
        });
        await quoteService.send(quoteId).catch(() => {});
        toast.success("تم إرسال البريد الإلكتروني بنجاح");
        onSent();
      } catch {
        // Fallback: open mailto
        const mailtoUrl = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}${emailCc ? `&cc=${emailCc}` : ""}${emailBcc ? `&bcc=${emailBcc}` : ""}`;
        window.open(mailtoUrl, "_blank");
        toast.info("تم فتح برنامج البريد. أرفق ملف PDF يدوياً.");
        onSent();
      }
    } catch {
      toast.error("فشل إرسال البريد الإلكتروني");
    } finally {
      setSending(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!whatsappPhone.trim()) { toast.error("رقم الهاتف مطلوب"); return; }
    const fullMessage = `${whatsappMessage}\n\nرابط التنزيل: ${shareUrl}`;
    const waUrl = `https://wa.me/${whatsappPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(fullMessage)}`;
    window.open(waUrl, "_blank");
    quoteService.send(quoteId).catch(() => {});
    toast.success("تم فتح واتساب");
    onSent();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("تم نسخ الرابط");
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute inset-y-0 left-0 w-[520px] max-w-full flex flex-col shadow-2xl"
        style={{ backgroundColor: "var(--o2-surface)", borderRight: "1px solid var(--o2-border)" }}>

        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--o2-border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--o2-text)" }}>أرسل عرض السعر</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: "var(--o2-muted)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0" style={{ borderColor: "var(--o2-border)" }}>
          <button
            onClick={() => setTab("email")}
            className="flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            style={{
              color: tab === "email" ? "var(--o2-brand)" : "var(--o2-muted)",
              borderBottom: tab === "email" ? "2px solid var(--o2-brand)" : "2px solid transparent",
            }}>
            <Mail className="w-4 h-4" /> أرسل عبر الإيميل
          </button>
          <button
            onClick={() => setTab("whatsapp")}
            className="flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            style={{
              color: tab === "whatsapp" ? "#25d366" : "var(--o2-muted)",
              borderBottom: tab === "whatsapp" ? "2px solid #25d366" : "2px solid transparent",
            }}>
            <Phone className="w-4 h-4" /> أرسل عبر واتساب
          </button>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "email" ? (
            <>
              {/* To */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>إلى (To) *</label>
                <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="example@client.com"
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>

              {/* Cc / Bcc toggles */}
              <div className="flex items-center gap-3">
                {!showCc && (
                  <button onClick={() => setShowCc(true)} className="text-xs font-bold underline" style={{ color: "var(--o2-brand)" }}>
                    + Cc
                  </button>
                )}
                {!showBcc && (
                  <button onClick={() => setShowBcc(true)} className="text-xs font-bold underline" style={{ color: "var(--o2-brand)" }}>
                    + Bcc
                  </button>
                )}
              </div>

              {showCc && (
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>Cc</label>
                  <input type="email" value={emailCc} onChange={(e) => setEmailCc(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm border"
                    style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                </div>
              )}

              {showBcc && (
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>Bcc</label>
                  <input type="email" value={emailBcc} onChange={(e) => setEmailBcc(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm border"
                    style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>الموضوع</label>
                <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>نص الرسالة</label>
                <textarea rows={5} value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border resize-none"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>

              {/* Attachment preview */}
              <div className="rounded-lg border p-3 flex items-center gap-3"
                style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: "#fee2e2" }}>
                  <FileText className="w-5 h-5" style={{ color: "#dc2626" }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold" style={{ color: "var(--o2-text)" }}>{quoteNumber}.pdf</p>
                  <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>مرفق تلقائي — عرض السعر</p>
                </div>
                <Paperclip className="w-4 h-4" style={{ color: "var(--o2-muted)" }} />
              </div>
            </>
          ) : (
            <>
              {/* WhatsApp Phone */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>رقم الهاتف</label>
                <input type="tel" value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+970591234567"
                  className="w-full px-3 py-2.5 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>

              {/* WhatsApp Message */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>نص الرسالة</label>
                <textarea rows={4} value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border resize-none"
                  style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
              </div>

              {/* Share Link */}
              <div className="rounded-lg border p-3 space-y-2"
                style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "var(--o2-muted)" }}>رابط التنزيل العام</span>
                  <button onClick={handleCopyLink} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded"
                    style={{ color: "var(--o2-brand)" }}>
                    <Copy className="w-3 h-3" /> نسخ
                  </button>
                </div>
                <div className="flex items-center gap-2 p-2 rounded border text-xs font-mono truncate"
                  style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
                  <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--o2-muted)" }} />
                  <span className="truncate">{shareUrl}</span>
                </div>
                <p className="text-[10px]" style={{ color: "var(--o2-muted)" }}>
                  هذا الرابط يعرض ملف PDF لعرض السعر بدون تسجيل دخول.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Panel Footer */}
        <div className="px-5 py-4 border-t shrink-0 flex items-center gap-3"
          style={{ borderColor: "var(--o2-border)" }}>
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold border transition"
            style={{ borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
            إلغاء
          </button>
          {tab === "email" ? (
            <button onClick={handleSendEmail} disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: "var(--o2-brand)" }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "جاري الإرسال..." : "إرسال"}
            </button>
          ) : (
            <button onClick={handleSendWhatsApp}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: "#25d366" }}>
              <Phone className="w-4 h-4" /> أرسل عبر واتساب
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Form Fields (extracted for reuse) ─── */
function QuoteFormFields({
  form, setForm, quoteNumber, setQuoteNumber,
  customers, filteredClients, showClientDropdown, setShowClientDropdown,
  clientSearch, setClientSearch, selectClient, onQuickAddClient,
  menuItems, updateItem, addItem, removeItem,
}: {
  form: QuoteFormData; setForm: React.Dispatch<React.SetStateAction<QuoteFormData>>;
  quoteNumber: string; setQuoteNumber: (v: string) => void;
  customers: any[]; filteredClients: any[];
  showClientDropdown: boolean; setShowClientDropdown: (v: boolean) => void;
  clientSearch: string; setClientSearch: (v: string) => void;
  selectClient: (c: any) => void; onQuickAddClient: () => void;
  menuItems: any[];
  updateItem: (idx: number, field: keyof QuoteItem, value: any) => void;
  addItem: () => void; removeItem: (idx: number) => void;
}) {
  return (
    <>
      {/* Quote Number & Dates */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
          <Hash className="w-4 h-4" style={{ color: "var(--o2-brand-text)" }} />
          بيانات العرض
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>رقم العرض</label>
            <input type="text" value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border font-mono"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>العملة</label>
            <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm border"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}>
              {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label} ({c.symbol})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>تاريخ الإصدار *</label>
            <input type="date" value={form.issue_date} onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm border"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>تاريخ الانتهاء</label>
            <input type="date" value={form.expiry_date} onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm border"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
          </div>
        </div>
      </div>

      {/* Client */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
          <UserPlus className="w-4 h-4" style={{ color: "var(--o2-brand-text)" }} />
          العميل *
        </h3>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--o2-muted)" }} />
          <input type="text" placeholder="بحث بالاسم أو رقم الهاتف أو البريد..."
            value={form.client_name && !clientSearch ? form.client_name : clientSearch}
            onChange={(e) => { setClientSearch(e.target.value); setForm((p) => ({ ...p, client_name: e.target.value, client_id: undefined })); setShowClientDropdown(true); }}
            onFocus={() => setShowClientDropdown(true)}
            className="w-full pr-10 pl-4 py-2.5 rounded-lg text-sm border"
            style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }} />
          {showClientDropdown && (
            <div className="absolute top-full mt-1 w-full rounded-lg border shadow-xl z-50 max-h-64 overflow-y-auto"
              style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
              {filteredClients.length === 0 ? (
                <div className="px-4 py-3 text-xs" style={{ color: "var(--o2-muted)" }}>لا يوجد نتائج</div>
              ) : (
                filteredClients.map((c) => (
                  <button key={c.id} onClick={() => selectClient(c)}
                    className="w-full px-4 py-2.5 text-right text-xs hover:opacity-80 flex items-center gap-2"
                    style={{ color: "var(--o2-text)" }}>
                    <span className="font-bold">{c.name}</span>
                    <span style={{ color: "var(--o2-muted)" }}>{c.phone}</span>
                  </button>
                ))
              )}
              <button onClick={() => { setShowClientDropdown(false); onQuickAddClient(); }}
                className="w-full px-4 py-2.5 text-right text-xs font-bold flex items-center gap-2 border-t"
                style={{ color: "var(--o2-brand-text)", borderColor: "var(--o2-border)" }}>
                <Plus className="w-3.5 h-3.5" /> إضافة عميل جديد
              </button>
            </div>
          )}
        </div>
        {form.client_id && (
          <div className="mt-2 p-2 rounded-lg text-xs flex items-center gap-2" style={{ backgroundColor: "var(--o2-surface-raised)" }}>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--o2-success-text)" }} />
            <span className="font-bold" style={{ color: "var(--o2-success-text)" }}>{form.client_name}</span>
            {form.client_phone && <span style={{ color: "var(--o2-muted)" }}>| {form.client_phone}</span>}
            <button onClick={() => setForm((p) => ({ ...p, client_id: undefined, client_name: "", client_phone: "", client_email: "" }))}
              className="mr-auto" style={{ color: "var(--o2-brand-text)" }}>تغيير</button>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
            <DollarSign className="w-4 h-4" style={{ color: "var(--o2-brand-text)" }} />
            بنود العرض
          </h3>
          <button onClick={addItem}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 text-white"
            style={{ backgroundColor: "var(--o2-brand)" }}>
            <Plus className="w-3.5 h-3.5" /> إضافة بند
          </button>
        </div>
        <div className="space-y-3">
          {form.items.map((item, idx) => (
            <ItemRow key={idx} item={item} index={idx} currency={form.currency}
              menuItems={menuItems} isLast={idx === form.items.length - 1}
              onUpdate={updateItem} onRemove={removeItem} canRemove={form.items.length > 1} />
          ))}
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--o2-surface)", borderColor: "var(--o2-border)" }}>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--o2-text)" }}>
          <MessageSquare className="w-4 h-4" style={{ color: "var(--o2-brand-text)" }} />
          ملاحظات وشروط
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm border resize-none"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
              placeholder="ملاحظات داخلية..." />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--o2-muted)" }}>الشروط والأحكام</label>
            <textarea value={form.terms} onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))}
              rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm border resize-none"
              style={{ backgroundColor: "var(--o2-surface-raised)", borderColor: "var(--o2-border)", color: "var(--o2-text)" }}
              placeholder="شروط العرض..." />
          </div>
        </div>
      </div>
    </>
  );
}
