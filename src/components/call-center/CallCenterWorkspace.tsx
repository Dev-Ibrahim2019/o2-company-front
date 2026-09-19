import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Check, ChevronLeft, CircleDollarSign, Clock3, CreditCard,
  FileText, MapPin, Minus, PackageSearch, Phone, PhoneForwarded, Plus, Search, ShoppingBag,
  Trash2, UserRound, X, ClipboardList, History, Menu as MenuIcon,
} from "lucide-react";
import { MenuGrid } from "../POS/MenuGrid";
import { CannedResponsePicker } from "./components/CannedResponsePicker";
import type { CartItem, PaymentEntry } from "../../hooks/useCallCenterCart";
import type { MenuCategory, MenuItem } from "../../hooks/useMenu";
import { PaymentMethod } from "../../../types";
import { settlementService, type PaymentMethodDto } from "../../services/settlementService";
import api from "../../api/axios";
import {
  callCenterService, type CustomerAddress, type CustomerFullProfile,
  type CustomerSearchResult, type OrderDetail, type OrderingInsights, type DeliveryQuote,
  type ActiveOrderGroups, type ActiveOrderScope, type FavoriteItem,
} from "./services/callCenterService";
import { buildCheckoutBlockers } from "./customerFlow";

export type OrderMode = "delivery" | "takeaway";
export type WorkspaceTab = "products" | "order" | "customer" | "history" | "cart";
export const activeOrderScopeLabels: Record<ActiveOrderScope, string> = {
  operational_active: "نشطة تشغيليًا",
  awaiting_payment: "بانتظار الدفع",
  kitchen_active: "نشطة في المطبخ",
  delivery_active: "نشطة للتوصيل",
};

export const ActiveOrdersBoard: React.FC<{ branchId?: number }> = ({ branchId }) => {
  const [groups, setGroups] = useState<ActiveOrderGroups | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    void callCenterService.getActiveOrders(branchId).then(response => setGroups(response.data)).catch(() => setError("تعذر تحميل الطلبات النشطة."));
  };
  useEffect(load, [branchId]);
  if (error) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}<button onClick={load} className="mr-2 underline">إعادة المحاولة</button></div>;
  if (!groups) return <div className="h-20 animate-pulse rounded-lg bg-slate-100" aria-label="جارٍ تحميل الطلبات النشطة" />;
  return <section className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm" aria-labelledby="active-orders-title">
    <h2 id="active-orders-title" className="mb-2 text-sm font-black text-slate-900">الطلبات النشطة</h2>
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{(Object.keys(activeOrderScopeLabels) as ActiveOrderScope[]).map(scope => <div key={scope} className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[11px] text-slate-500">{activeOrderScopeLabels[scope]}</p><strong className="text-xl text-slate-900">{groups[scope].length}</strong>{groups[scope][0] && <p className="mt-1 truncate text-[11px] text-slate-400">{groups[scope][0].order_number} · {groups[scope][0].customer_name || "بدون اسم"}</p>}</div>)}</div>
  </section>;
};
export interface RepeatCandidate { key:string; name:string; quantity:number; oldPrice:number; item:MenuItem|null; }

export interface CallCenterSuccess {
  orderId: number;
  orderNumber: string;
  invoiceNumber?: string;
  total: number;
  customerName: string;
  address?: string;
  payments: PaymentEntry[];
}

export const CallCenterMenuShell: React.FC<{
  tab: WorkspaceTab;
  setTab: (tab: WorkspaceTab) => void;
  customerName: string;
  phone: string;
  branchName: string;
  query: string;
  onQuery: (value: string) => void;
  children: React.ReactNode;
}> = ({ tab, setTab, customerName, phone, branchName, query, onQuery, children }) => {
  const tabs = [
    { id: "products", label: "المنيو", icon: MenuIcon },
    { id: "order", label: "بيانات الفاتورة", icon: ClipboardList },
    { id: "customer", label: "بيانات الزبون والحساب", icon: UserRound },
    { id: "history", label: "الطلبات السابقة", icon: History },
  ] as const;
  return <section className="flex min-h-0 flex-1 flex-col overflow-hidden text-slate-900">
    <header className="mb-3 shrink-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      <div className="flex flex-col items-start justify-between gap-3 xl:flex-row xl:items-center">
        <div className="flex w-full min-w-0 items-center justify-between gap-3 xl:w-auto xl:justify-start">
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg">فاتورة جديدة</h1>
            <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[10px] font-bold text-slate-400">
              <span className="text-slate-600">المصدر: كول سنتر</span><span>•</span>
              <span className="truncate">{customerName}</span><span>•</span>
              <bdi dir="ltr">{phone}</bdi><span>•</span><span>{branchName}</span>
            </p>
          </div>
          <span className="hidden shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-600 sm:block">مسودة نشطة</span>
        </div>
        <div className="group relative w-full xl:flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-red-500" size={16}/>
          <input value={query} onChange={event=>onQuery(event.target.value)} placeholder="ابحث عن وجبة، رقم الصنف..." aria-label="بحث الأصناف" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-10 text-[10px] font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"/>
          {query&&<button onClick={()=>onQuery("")} aria-label="مسح البحث" className="absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:ring-2 focus:ring-red-300"><X size={14}/></button>}
        </div>
      </div>
      <div role="tablist" aria-label="أقسام طلب الكول سنتر" className="flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map(({ id, label, icon: Icon }) => <button
          key={id}
          role="tab"
          aria-selected={tab === id}
          onClick={() => setTab(id)}
          className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[9px] font-black transition-colors focus:outline-none focus:ring-2 focus:ring-red-300 sm:px-5 sm:text-[10px] ${tab === id ? "bg-red-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        ><Icon size={14}/>{label}</button>)}
      </div>
    </header>
    <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
  </section>;
};

export const OrderDetailsPane: React.FC<{
  branchId: number;
  branches: Array<{id:number;name:string}>;
  setBranchId: (id:number) => void;
  orderMode: OrderMode;
  setOrderMode: (mode:OrderMode) => void;
  selectedAddress: CustomerAddress | null;
  deliveryQuote: DeliveryQuote | null;
  quoteLoading: boolean;
  quoteError: string;
  note: string;
  setNote: (note:string) => void;
}> = ({ branchId, branches, setBranchId, orderMode, setOrderMode, selectedAddress, deliveryQuote, quoteLoading, quoteError, note, setNote }) =>
  <div className="h-full overflow-y-auto bg-slate-50 p-3 sm:p-4">
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-black text-slate-900">تنفيذ الطلب</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-500">الفرع المنفذ
            <select value={branchId} onChange={e=>setBranchId(Number(e.target.value))} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100">
              <option value={0}>اختر الفرع</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <fieldset><legend className="mb-1.5 text-xs font-bold text-slate-500">طريقة الاستلام</legend>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(["delivery","takeaway"] as const).map(mode=><button key={mode} onClick={()=>setOrderMode(mode)} className={`min-h-10 rounded-lg text-xs font-black ${orderMode===mode?"bg-red-600 text-white":"text-slate-500 hover:text-slate-800"}`}>{mode==="delivery"?"توصيل":"استلام من الفرع"}</button>)}
            </div>
          </fieldset>
        </div>
      </section>
      {orderMode === "delivery" && <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900"><MapPin size={16} className="text-red-500"/>عنوان ونطاق التوصيل</h2>
        <p className="text-sm text-slate-600">{selectedAddress ? [selectedAddress.city,selectedAddress.area,selectedAddress.street].filter(Boolean).join("، ") : "اختر عنوانًا من بيانات العميل"}</p>
        <div className={`mt-3 rounded-lg border p-3 text-xs ${deliveryQuote?"border-emerald-200 bg-emerald-50 text-emerald-700":quoteError?"border-rose-200 bg-rose-50 text-rose-700":"border-amber-200 bg-amber-50 text-amber-700"}`}>
          {quoteLoading ? "جارٍ احتساب النطاق والوقت…" : deliveryQuote ? `${deliveryQuote.zone_name} • ${money(deliveryQuote.fee)} • ${deliveryQuote.eta_minutes} دقيقة تقريبًا` : quoteError || "لم يتم اعتماد نطاق التوصيل بعد"}
        </div>
      </section>}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="cc-order-notes" className="text-xs font-bold text-slate-500">ملاحظات الطلب والتوصيل</label>
          <CannedResponsePicker onInsert={(text)=>setNote(note ? `${note}\n${text}` : text)}/>
        </div>
        <textarea id="cc-order-notes" value={note} onChange={e=>setNote(e.target.value)} placeholder="تعليمات خاصة للمطبخ أو مندوب التوصيل…" className="min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"/>
      </div>
    </div>
  </div>;

const money = (value: number) => `${Number(value || 0).toFixed(2)} ₪`;
const methodMap: Record<PaymentMethodDto["type"], PaymentMethod> = {
  cash: PaymentMethod.CASH, card: PaymentMethod.CREDIT_CARD,
  bank: PaymentMethod.QR, wallet: PaymentMethod.WALLET,
  customer: PaymentMethod.CUSTOMER, employee: PaymentMethod.EMPLOYEE,
  supplier: PaymentMethod.SUPPLIER,
};
const needsReference = (type?: PaymentMethodDto["type"]) =>
  Boolean(type && ["card", "bank", "wallet"].includes(type));

export const ActiveCallRail: React.FC<{
  name?: string; phone?: string; duration: number; ticketId?: number;
  stage: "customer" | "order" | "payment" | "kitchen"; onEnd: () => void;
  orderState?: string; paymentState?: string; invoiceState?: string; kitchenState?: string;
  onTransfer?: (extension:string)=>void; extensions?: Array<{extension:string;name:string}>;
  onToggleProfile?:()=>void; profileOpen?:boolean;
  onToggleHold?:()=>void; held?:boolean;
}> = ({ name, phone, duration, ticketId, stage, onEnd, orderState="مسودة", paymentState="غير مدفوع", invoiceState="لم تُنشأ", kitchenState="لم يُرسل", onTransfer, extensions=[], onToggleProfile, profileOpen=false, onToggleHold, held=false }) => {
  const steps = ["customer", "order", "payment", "kitchen"] as const;
  const labels = { customer: "العميل", order: "الطلب", payment: "الدفع", kitchen: "المطبخ" };
  const current = steps.indexOf(stage);
  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm" dir="rtl">
      <div className="flex min-h-12 flex-wrap items-center gap-2 lg:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Phone size={17}/><span className="absolute -left-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-green-500"/>
          </span>
          <div className="min-w-0"><p className="truncate text-sm font-bold">{name || "عميل غير معروف"}</p>
            <p className="text-xs text-slate-400">{phone} · {String(Math.floor(duration / 60)).padStart(2,"0")}:{String(duration % 60).padStart(2,"0")} · #{ticketId ?? "—"}</p>
          </div>
        </div>
        <ol className="order-3 mx-auto hidden w-full items-center justify-center border-t border-slate-200 pt-1.5 md:flex xl:order-none xl:w-auto xl:flex-1 xl:border-0 xl:pt-0">
          {steps.map((item, index) => <li key={item} className="flex items-center">
            <span className={`flex h-7 items-center gap-1.5 px-2 text-xs font-bold ${index <= current ? "text-slate-900" : "text-slate-300"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${index < current ? "border-green-500 bg-green-500 text-white" : index === current ? "border-[#E20004] bg-[#E20004] text-white" : "border-slate-200"}`}>{index < current ? <Check size={12}/> : index + 1}</span>{labels[item]}
            </span>{index < 3 && <ChevronLeft size={13} className={index < current ? "text-green-500" : "text-slate-300"}/>}
          </li>)}
        </ol>
        <div className="hidden gap-1.5 xl:flex">{[
          {label:`T-${ticketId??"—"}`,className:"border-blue-200 bg-blue-50 text-blue-600"},
          {label:orderState,className:"border-amber-200 bg-amber-50 text-amber-600"},
          {label:paymentState,className:"border-green-200 bg-green-50 text-green-600"},
          {label:invoiceState,className:"border-violet-200 bg-violet-50 text-violet-600"},
          {label:kitchenState,className:"border-rose-200 bg-rose-50 text-rose-600"},
        ].map((chip,i)=><span key={i} className={`rounded-md border px-2 py-1 text-xs ${chip.className}`}>{chip.label}</span>)}</div>
        <div className="mr-auto flex shrink-0 gap-1.5">
          {onToggleProfile&&<button onClick={onToggleProfile} aria-pressed={profileOpen} className={`min-h-11 rounded-lg border px-2.5 text-xs font-bold focus:ring-2 focus:ring-red-300 ${profileOpen?"border-red-200 bg-red-50 text-red-600":"border-slate-200 text-slate-600 hover:bg-slate-50"}`}><UserRound size={15} className="ml-1 inline"/><span className="hidden sm:inline">{profileOpen?"إخفاء الملف":"ملف العميل"}</span></button>}
          {onToggleHold&&<button onClick={onToggleHold} aria-pressed={held} className="min-h-11 rounded-lg border border-amber-200 px-2.5 text-xs font-bold text-amber-600 hover:bg-amber-50">{held?"استئناف":"انتظار"}</button>}
          {onTransfer&&extensions.length>0&&<div className="relative hidden items-center lg:flex"><PhoneForwarded size={15} className="pointer-events-none absolute right-3 text-blue-500"/><label htmlFor="call-transfer" className="sr-only">تحويل المكالمة</label><select id="call-transfer" aria-label="تحويل المكالمة" defaultValue="" onChange={e=>{if(e.target.value)onTransfer(e.target.value);e.target.value="";}} className="min-h-11 max-w-28 appearance-none rounded-lg border border-blue-200 bg-blue-50 pr-9 pl-2 text-xs font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-400 xl:max-w-none"><option value="">تحويل</option>{extensions.map(x=><option key={x.extension} value={x.extension}>{x.name} · {x.extension}</option>)}</select></div>}
          <button onClick={onEnd} className="min-h-11 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300">إنهاء</button>
        </div>
      </div>
    </header>
  );
};

export const CustomerContext: React.FC<{
  customer: CustomerSearchResult | null;
  newCaller: {name:string;phone:string;customerType:"individual"|"company";city:string;area:string;addressLine:string;landmark:string;deliveryNotes:string} | null;
  setNewCaller: React.Dispatch<React.SetStateAction<any>>;
  selectedAddress: CustomerAddress | null;
  onAddress: (address: CustomerAddress) => void; onProfile: () => void;
  onRepeat: (order: OrderDetail) => void;
  view?: "customer" | "history";
}> = ({ customer, newCaller, setNewCaller, selectedAddress, onAddress, onProfile, onRepeat, view = "customer" }) => {
  const [data, setData] = useState<CustomerFullProfile | null>(null);
  const [insights, setInsights] = useState<OrderingInsights | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoriteMetric, setFavoriteMetric] = useState<"orders_count"|"quantity_sum"|"total_spent">("orders_count");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [newAddress, setNewAddress] = useState(false);
  const [draft, setDraft] = useState({ label: "المنزل", city: "", area: "", street: "", delivery_notes: "" });
  const load = async () => {
    if (!customer) return;
    setLoading(true); setLoadError("");
    try {
      const [response, insightResponse, favoriteResponse] = await Promise.all([
        callCenterService.getCustomerFullProfile(customer.id),
        callCenterService.getOrderingInsights(customer.id).catch(() => null),
        callCenterService.getCustomerFavorites(customer.id).catch(() => null),
      ]);
      setData(response.data);
      setInsights(insightResponse?.data ?? null);
      setFavorites(favoriteResponse?.data?.slice(0, 5) ?? []);
      const preferred = response.data.addresses.find(a => a.is_default) ?? response.data.addresses[0];
      if (preferred && !selectedAddress) onAddress(preferred);
    } catch (error:any) {
      setLoadError(error?.response?.data?.message || "تعذر تحميل ملف العميل وعناوينه");
    } finally { setLoading(false); }
  };
  useEffect(() => { if(customer) void load(); else setLoading(false); }, [customer?.id]);
  const addAddress = async () => {
    if (!draft.city.trim() || !draft.area.trim()) return;
    const response = await callCenterService.createCustomerAddress(customer.id, draft);
    onAddress(response.data); setNewAddress(false); setDraft({ label: "المنزل", city: "", area: "", street: "", delivery_notes: "" });
    await load();
  };
  if(newCaller&&view==="history")return <div className="flex h-full flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-400"><History size={38} className="mb-3 text-slate-300"/><h2 className="text-sm font-black text-slate-900">لا توجد طلبات سابقة</h2><p className="mt-1 text-xs">هذا متصل جديد، وسيظهر أول طلب هنا بعد حفظه.</p></div>;
  if(newCaller)return <aside className="flex min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-white p-4 text-slate-900" dir="rtl"><div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><h2 className="font-black text-blue-700">متصل جديد</h2><p className="mt-1 text-xs text-blue-700">لم نجد ملفًا مرتبطًا بهذا الرقم. سيتم إنشاء ملف العميل تلقائيًا عند حفظ الطلب.</p></div><div className="mt-4 space-y-3">{[
    ["name","اسم العميل *","text"],["phone","رقم الهاتف","tel"],["city","المدينة *","text"],["area","المنطقة *","text"],["addressLine","العنوان / الشارع","text"],["landmark","أقرب معلم","text"],["deliveryNotes","ملاحظات التوصيل","text"],
  ].map(([key,label,type])=><label key={key} className="block text-xs font-bold text-slate-600">{label}<input type={type} value={(newCaller as any)[key]} onChange={e=>setNewCaller((v:any)=>({...v,[key]:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" dir={key==="phone"?"ltr":"rtl"}/></label>)}</div></aside>;
  if(!customer)return null;
  if(view==="history")return <section className="h-full overflow-y-auto bg-slate-50 p-3 sm:p-4">
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">الطلبات السابقة</h2><p className="text-xs text-slate-500">اختر طلبًا لإعادة أصنافه بالسعر والتوفر الحاليين.</p></div><button onClick={onProfile} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50">الملف الكامل</button></div>
      {loading?<div className="h-28 animate-pulse rounded-xl bg-slate-100"/>:loadError?<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}<button onClick={()=>void load()} className="mt-3 block min-h-10 rounded-lg border border-rose-200 px-3 text-xs font-bold">إعادة المحاولة</button></div>:data?.orders.length?<div className="space-y-2">{data.orders.map(order=><article key={order.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="text-sm text-slate-900">{order.order_number}</strong><span className="text-[10px] text-slate-400">{order.created_at}</span></div><p className="mt-1 truncate text-xs text-slate-500">{order.items.map(i=>i.item_name_ar||i.item_name).join("، ")}</p><p className="mt-1 text-xs font-black text-slate-900">{money(order.total)}</p></div><button onClick={()=>onRepeat(order)} className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-black text-red-600 hover:bg-red-50">إعادة الطلب</button></article>)}</div>:<div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-slate-400"><History size={34}/><p className="mt-3 text-sm font-bold text-slate-600">لا توجد طلبات سابقة</p></div>}
    </div>
  </section>;
  return <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-white text-slate-900">
    <div className="border-b border-slate-200 p-3">
      <div className="flex items-start gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 font-black text-red-600">{customer.name?.slice(0,2)}</span>
        <div className="min-w-0 flex-1"><h2 className="truncate text-base font-black">{customer.name}</h2><p className="text-xs text-slate-400">{customer.phone || customer.mobile}</p></div>
        <button onClick={onProfile} className="min-h-10 rounded-lg border border-slate-200 px-2 text-xs hover:bg-slate-50 focus:ring-2 focus:ring-red-300">الملف الكامل</button>
      </div>
    </div>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      {loadError&&<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><p>{loadError}</p><button onClick={()=>void load()} className="mt-2 min-h-10 rounded-md border border-rose-200 px-3 font-bold">إعادة المحاولة</button></div>}
      <section aria-labelledby="delivery-title"><div className="mb-2 flex items-center justify-between"><h3 id="delivery-title" className="flex items-center gap-1.5 text-sm font-bold"><MapPin size={15} className="text-[#E20004]"/>عنوان التوصيل</h3><button onClick={() => setNewAddress(!newAddress)} className="text-xs font-bold text-red-600">+ إضافة</button></div>
        {newAddress && <div className="mb-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {(["label","city","area","street","delivery_notes"] as const).map(k => <input key={k} value={draft[k]} onChange={e => setDraft(v => ({...v,[k]:e.target.value}))} placeholder={{label:"التسمية",city:"المدينة *",area:"المنطقة *",street:"الشارع",delivery_notes:"إرشادات التوصيل"}[k]} className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-red-400"/>)}
          <button onClick={addAddress} disabled={!draft.city || !draft.area} className="min-h-10 w-full rounded-md bg-[#E20004] text-sm font-bold text-white disabled:opacity-40">حفظ العنوان</button>
        </div>}
        {loading ? <div className="h-20 animate-pulse rounded-lg bg-slate-100"/> : data?.addresses.length ? <div className="space-y-1.5">{data.addresses.filter(a=>a.is_active).map(address => <button key={address.id} onClick={() => onAddress(address)} className={`w-full rounded-lg border p-2 text-right text-xs ${selectedAddress?.id === address.id ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}><span className="block font-bold text-slate-800">{address.label}{address.is_default ? " · افتراضي" : ""}</span><span className="text-slate-500">{[address.city,address.area,address.street].filter(Boolean).join("، ")}</span></button>)}</div> : <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">أضف عنواناً صالحاً قبل حفظ طلب التوصيل.</p>}
      </section>
      {data && <><section className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[11px] text-slate-500">إجمالي الطلبات</p><p className="text-lg font-black text-slate-900">{data.profile.total_orders}</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[11px] text-slate-500">متوسط الطلب</p><p className="text-lg font-black text-slate-900">{money(data.profile.avg_order_value)}</p></div><div className="rounded-lg border border-violet-200 bg-violet-50 p-2"><p className="text-[11px] text-violet-600">نقاط الولاء</p><p className="font-black text-violet-600">{data.profile.loyalty_points ?? customer.loyalty_points ?? 0}</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-[11px] text-slate-500">الرصيد المتاح</p><p className="font-black text-slate-900">{money(data.profile.available_credit)}</p></div></section>
        {insights && <section className="rounded-lg border border-blue-200 bg-blue-50 p-2"><h3 className="mb-2 text-xs font-bold text-blue-700">نمط الطلب خلال 90 يوماً</h3><div className="grid grid-cols-2 gap-1 text-xs"><span className="text-slate-500">عدد الطلبات</span><strong className="text-slate-800">{insights.orders_90_days}</strong><span className="text-slate-500">المتوسط</span><strong className="text-slate-800">{money(insights.average_order_value)}</strong><span className="text-slate-500">النوع المفضل</span><strong className="text-slate-800">{insights.preferred_order_type === "delivery" ? "توصيل" : insights.preferred_order_type === "takeaway" ? "استلام" : "—"}</strong></div></section>}
        {favorites.length > 0 && <section className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-800">الأصناف الأكثر طلباً</h3><select value={favoriteMetric} onChange={event=>setFavoriteMetric(event.target.value as typeof favoriteMetric)} className="min-h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700"><option value="orders_count">عدد الطلبات</option><option value="quantity_sum">إجمالي الكمية</option><option value="total_spent">إجمالي الإنفاق</option></select></div>
          <div className="space-y-2">{favorites.map(item=>{const max=Math.max(...favorites.map(row=>Number(row[favoriteMetric]||0)),1);const value=Number(item[favoriteMetric]||0);return <div key={item.item_id}><div className="mb-1 flex justify-between gap-2 text-[11px] text-slate-700"><span className="truncate">{item.item_name_ar||item.item_name}</span><strong>{favoriteMetric==="total_spent"?money(value):value}</strong></div><div className="h-1.5 overflow-hidden rounded-sm bg-slate-200"><div className="h-full bg-[#E20004]" style={{width:`${Math.max(5,(value/max)*100)}%`}}/></div></div>;})}</div>
        </section>}
        {data.orders[0] && <section className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="mb-1 text-xs text-slate-500">آخر طلب · {data.orders[0].order_number}</p><p className="text-sm font-bold text-slate-800">{data.orders[0].items.slice(0,2).map(i=>i.item_name_ar||i.item_name).join("، ")}</p><button onClick={()=>onRepeat(data.orders[0])} className="mt-2 min-h-10 w-full rounded-md border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50">إعادة الطلب</button></section>}
      </>}
    </div>
  </aside>;
};

export const ProductBuilder: React.FC<{
  categories: MenuCategory[]; loading: boolean; error?: string | null;
  selectedCategory: string; onCategory: (v:string)=>void; query:string; onQuery:(v:string)=>void;
  onAdd:(item:MenuItem)=>void;
}> = props => <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 px-1 text-slate-900">
  <div className="min-h-0 flex-1 overflow-y-auto">{props.error ? <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-rose-600"><AlertTriangle/><p>{props.error}</p></div> : <MenuGrid categories={props.categories} selectedCategory={props.selectedCategory} setSelectedCategory={props.onCategory} searchQuery={props.query} addToCart={props.onAdd} loading={props.loading} categoryScrollable/>}</div>
</main>;

const EntitySelector: React.FC<{type:"employee"|"supplier"; onSelect:(id:number)=>void}> = ({type,onSelect}) => {
  const [q,setQ]=useState(""); const [rows,setRows]=useState<any[]>([]);
  useEffect(()=>{ if(q.trim().length<2){setRows([]);return;} const timer=setTimeout(async()=>{try{const {data}=await api.get(type==="employee"?"/employees":"/suppliers",{params:{search:q,per_page:8}});setRows(data?.data?.data??data?.data??[]);}catch{setRows([]);}},300); return()=>clearTimeout(timer);},[q,type]);
  return <div className="relative"><input value={q} onChange={e=>setQ(e.target.value)} placeholder={type==="employee"?"ابحث عن موظف…":"ابحث عن مورد…"} className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900"/>{rows.length>0&&<div className="absolute z-30 mt-1 max-h-36 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-md">{rows.map(row=><button key={row.id} onClick={()=>{onSelect(row.id);setQ(row.name);setRows([]);}} className="block min-h-10 w-full px-2 text-right text-xs hover:bg-slate-50">{row.name} <span className="text-slate-400">{row.code}</span></button>)}</div>}</div>;
};

export const CallCenterCart: React.FC<{
  cart: CartItem[]; subtotal:number; update:(id:string,patch:Partial<CartItem>)=>void; remove:(id:string)=>void;
  clear:()=>void; orderMode:OrderMode; setOrderMode:(v:OrderMode)=>void; selectedAddress:CustomerAddress|null;
  customerId?:number; branchId:number; newCaller:{name:string;phone:string;area:string;city:string}|null; discount:number; setDiscount:(v:number)=>void; deliveryQuote:DeliveryQuote|null; quoteLoading:boolean; quoteError:string;
  note:string; setNote:(v:string)=>void; payments:PaymentEntry[]; setPayments:(v:PaymentEntry[])=>void;
  submitting:boolean; onSaveDraft:()=>void; onSubmit:()=>void; success:CallCenterSuccess|null; onNew:()=>void;
  orderId?: number | null;
}> = ({cart,subtotal,update,remove,clear,orderMode,setOrderMode,selectedAddress,customerId,branchId,newCaller,discount,setDiscount,deliveryQuote,quoteLoading,quoteError,note,setNote,payments,setPayments,submitting,onSaveDraft,onSubmit,success,onNew,orderId}) => {
  const [methods,setMethods]=useState<PaymentMethodDto[]>([]); const [methodError,setMethodError]=useState("");
  useEffect(()=>{settlementService.getPaymentMethods().then(rows=>setMethods(rows.filter(r=>r.is_active))).catch(()=>setMethodError("تعذر تحميل طرق الدفع"));},[]);
  const deliveryFee=deliveryQuote?.fee??0;
  const total=Math.max(0,subtotal-discount+(orderMode==="delivery"?deliveryFee:0));
  const paid=payments.reduce((s,p)=>s+(Number(p.amount)||0),0), remaining=Math.max(0,total-paid), excess=Math.max(0,paid-total);
  const addPayment=(method:PaymentMethodDto)=>{if(newCaller&&method.type==="customer"){setMethodError("لا يمكن تسجيل الطلب على الحساب؛ الملف المالي للعميل غير مفعل.");return;}setPayments([...payments,{method:methodMap[method.type],amount:remaining||total,entity_type:method.is_entity?method.type as any:undefined,entity_id:method.type==="customer"?customerId:undefined,subledger_type:method.is_entity?method.type as any:undefined,subledger_id:method.type==="customer"?customerId:undefined}]);};
  const edit=(index:number,patch:Partial<PaymentEntry>)=>setPayments(payments.map((p,i)=>i===index?{...p,...patch}:p));
  const addressReady=Boolean(selectedAddress||(newCaller?.area&&newCaller?.city));
  const blockers=buildCheckoutBlockers({branchId,customerName:newCaller?.name,isNewCaller:Boolean(newCaller),cartCount:cart.length,isDelivery:orderMode==="delivery",addressReady,deliveryQuoteReady:Boolean(deliveryQuote)});
  const invalid=blockers.length>0||remaining>0.01||excess>0.01||payments.some(p=>{const type=methods.find(m=>methodMap[m.type]===p.method)?.type;return(needsReference(type)&&!p.reference)||(["employee","supplier"].includes(type??"")&&!p.entity_id);});
  if(success)return <aside className="flex min-h-0 flex-col items-center justify-center border-r border-slate-200 bg-white p-5 text-center text-slate-900"><span className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600"><Check size={32}/></span><h2 className="text-xl font-black">تم إرسال الطلب بنجاح</h2><p className="mt-1 text-sm text-slate-500">الطلب {success.orderNumber} · الفاتورة {success.invoiceNumber||"تم إنشاؤها"}</p><p className="my-4 text-2xl font-black">{money(success.total)}</p><div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-right text-xs"><p>{success.customerName}</p>{success.address&&<p className="mt-1 text-slate-500">{success.address}</p>}<div className="my-2 border-t border-slate-200 pt-2">{success.payments.map((p,i)=><p key={i} className="flex justify-between"><span>{methods.find(m=>methodMap[m.type]===p.method)?.name||p.method}</span><strong>{money(p.amount)}</strong></p>)}</div><p className="mt-2 text-green-600">مدفوع · أُرسل للمطبخ</p></div><div className="mt-3 grid w-full grid-cols-2 gap-2"><button onClick={()=>window.print()} className="min-h-10 rounded-lg border border-slate-200 text-xs font-bold">طباعة الملخص</button><button onClick={()=>window.open(`/sales-invoices?order=${success.orderId}`,"_blank")} className="min-h-10 rounded-lg border border-slate-200 text-xs font-bold">عرض الفاتورة</button></div><button onClick={onNew} className="mt-3 min-h-11 w-full rounded-lg bg-[#E20004] font-bold text-white hover:bg-[#C90004]">مكالمة جديدة</button></aside>;
  return <aside className="flex min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-lg sm:rounded-[2rem]">
    <div className="shrink-0 space-y-3 border-b border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-sm font-black"><ShoppingBag size={17} className="text-red-500"/>تفاصيل الفاتورة <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-xs text-white">{cart.reduce((s,i)=>s+i.quantity,0)}</span></h2><p className="mt-1 text-xs text-slate-400">{orderId?`طلب #${orderId} · محفوظ بانتظار الدفع`:`طلب جديد · ${submitting?"جارٍ الحفظ":"مسودة نشطة"}`}</p></div>{cart.length>0&&<button onClick={clear} className="min-h-11 rounded-lg px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 focus:ring-2 focus:ring-rose-300">تفريغ</button>}</div>
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2"><div className="flex items-end justify-between"><span className="text-xs font-black uppercase tracking-widest text-slate-500">الإجمالي الحالي</span><strong className="text-[26px] font-black text-slate-900" dir="ltr">{money(total)}</strong></div></div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-white p-2">{(["delivery","takeaway"] as const).map(mode=><button key={mode} onClick={()=>setOrderMode(mode)} className={`min-h-11 rounded-lg text-xs font-black transition-colors focus:ring-2 focus:ring-red-300 ${orderMode===mode?"bg-red-600 text-white shadow-sm":"bg-slate-100 text-slate-500 hover:text-slate-800"}`}>{mode==="delivery"?"توصيل":"استلام من الفرع"}</button>)}</div>
      {orderMode==="delivery"&&<div aria-live="polite" className={`m-2 rounded-md border p-2 text-xs ${deliveryQuote?"border-green-200 bg-green-50 text-green-700":quoteError?"border-rose-200 bg-rose-50 text-rose-700":"border-amber-200 bg-amber-50 text-amber-700"}`}><MapPin size={14} className="mb-1 inline"/>{!selectedAddress?"اختر عنواناً صالحاً من ملف العميل":quoteLoading?"جارٍ التحقق من نطاق التوصيل…":deliveryQuote?<><strong>{deliveryQuote.zone_name}</strong> · {money(deliveryQuote.fee)} · نحو {deliveryQuote.eta_minutes} دقيقة</>:quoteError||"لم يتم اعتماد العنوان للتوصيل"}</div>}
      <div className="p-2">{cart.length===0?<div className="flex min-h-52 flex-col items-center justify-center px-5 text-center text-slate-400"><PackageSearch className="mb-3 text-slate-300" size={36}/><p className="text-sm font-black text-slate-600">الفاتورة فارغة</p><p className="mt-1 max-w-xs text-xs leading-5">أضف صنفًا من المنيو لبدء الطلب</p></div>:<div className="overflow-hidden rounded-lg border border-slate-200"><div className="hidden grid-cols-[minmax(0,1fr)_70px_132px_76px_40px] items-center gap-1 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-500 sm:grid"><span>الصنف</span><span className="text-center">الوحدة</span><span className="text-center">الكمية</span><span className="text-center">الإجمالي</span><span/></div>{cart.map(item=><article key={item.uniqueId} className="border-t border-slate-100 bg-white px-2 py-2"><div className="sm:grid sm:grid-cols-[minmax(0,1fr)_70px_132px_76px_40px] sm:items-center sm:gap-1"><div className="flex min-w-0 items-center justify-between gap-2 sm:block"><p className="truncate text-sm font-bold text-slate-800 sm:text-xs" title={item.name_ar||item.name}>{item.name_ar||item.name}</p><button aria-label={`حذف ${item.name_ar||item.name}`} onClick={()=>remove(item.uniqueId)} className="h-10 w-10 shrink-0 rounded-md text-rose-500 hover:bg-rose-50 focus:ring-2 focus:ring-rose-300 sm:hidden"><Trash2 size={14} className="m-auto"/></button></div><div className="mt-2 grid grid-cols-[minmax(0,1fr)_132px_minmax(0,1fr)] items-center gap-2 sm:contents"><span className="text-right text-xs text-slate-500 sm:text-center" dir="ltr">{Number(item.price).toFixed(2)} ₪</span><div className="flex items-center justify-center"><button aria-label="إنقاص الكمية" onClick={()=>update(item.uniqueId,{quantity:Math.max(1,item.quantity-1)})} className="h-10 w-10 rounded-md bg-slate-100 hover:bg-slate-200 focus:ring-2 focus:ring-red-300"><Minus size={13} className="m-auto"/></button><span className="w-10 text-center text-sm font-bold text-slate-800">{item.quantity}</span><button aria-label="زيادة الكمية" onClick={()=>update(item.uniqueId,{quantity:item.quantity+1})} className="h-10 w-10 rounded-md bg-slate-100 hover:bg-slate-200 focus:ring-2 focus:ring-red-300"><Plus size={13} className="m-auto"/></button></div><strong className="text-left text-xs text-slate-800 sm:text-center" dir="ltr">{Number(item.price*item.quantity).toFixed(2)} ₪</strong></div><button aria-label={`حذف ${item.name_ar||item.name}`} onClick={()=>remove(item.uniqueId)} className="hidden h-10 w-10 rounded-md text-rose-500 hover:bg-rose-50 focus:ring-2 focus:ring-rose-300 sm:block"><Trash2 size={14} className="m-auto"/></button></div><input value={item.notes||""} onChange={e=>update(item.uniqueId,{notes:e.target.value})} placeholder="أضف ملاحظة لهذا الصنف…" aria-label={`ملاحظة ${item.name_ar||item.name}`} className="mt-2 min-h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-red-300"/></article>)}</div>}</div>
      <div className="space-y-2 border-t border-slate-200 p-3"><label className="block text-xs text-slate-500">خصم فعلي<input aria-label="قيمة الخصم" type="number" min="0" value={discount||""} onChange={e=>setDiscount(Number(e.target.value))} className="mt-1 min-h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-slate-900"/></label><label className="block text-xs text-slate-500">ملاحظات الطلب<textarea value={note} onChange={e=>setNote(e.target.value)} className="mt-1 min-h-16 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900"/></label></div>
      <section className="border-t border-slate-200 p-3"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><CreditCard size={15}/>الدفع</h3>{methodError&&<p className="text-xs text-rose-600">{methodError}</p>}<div className="flex gap-1 overflow-x-auto pb-2">{methods.map(method=><button key={method.id} onClick={()=>addPayment(method)} className="min-h-10 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 hover:border-red-300">{method.name}</button>)}</div>
        <div className="space-y-2">{payments.map((payment,index)=>{const dto=methods.find(m=>methodMap[m.type]===payment.method);return <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-800"><span>{dto?.name||payment.method}</span><button onClick={()=>setPayments(payments.filter((_,i)=>i!==index))} aria-label="حذف الدفعة"><X size={14}/></button></div><input type="number" min="0" step=".01" value={payment.amount||""} onChange={e=>edit(index,{amount:Number(e.target.value)})} aria-label="مبلغ الدفعة" className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900"/>{needsReference(dto?.type)&&<input value={payment.reference||""} onChange={e=>edit(index,{reference:e.target.value})} placeholder="الرقم المرجعي *" className="mt-2 min-h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900"/>}{dto?.type==="employee"||dto?.type==="supplier"?<div className="mt-2"><EntitySelector type={dto.type} onSelect={id=>edit(index,{entity_id:id,subledger_id:id})}/></div>:null}</div>})}</div>
      </section>
    </div>
    <footer className="shrink-0 border-t border-slate-200 bg-slate-50 p-3"><div className="mb-3 space-y-1.5 text-xs"><div className="flex justify-between text-slate-500"><span>الإجمالي الفرعي</span><span dir="ltr">{money(subtotal)}</span></div><div className="flex justify-between text-rose-600"><span>خصم الطلب</span><span dir="ltr">-{money(discount)}</span></div><div className="flex justify-between text-slate-500"><span>رسوم التوصيل</span><span dir="ltr">{money(orderMode==="delivery"?deliveryFee:0)}</span></div><div className="my-1 border-t border-slate-200"/><div className="flex items-end justify-between"><span className="font-black text-slate-900">الإجمالي النهائي</span><strong className="text-2xl font-black text-slate-900" dir="ltr">{money(total)}</strong></div><div className="flex justify-between text-green-600"><span>المدفوع</span><span dir="ltr">{money(paid)}</span></div><div className={`flex justify-between font-bold ${remaining||excess?"text-amber-600":"text-green-600"}`}><span>{excess?"المبلغ الزائد":"المتبقي"}</span><span dir="ltr">{money(excess||remaining)}</span></div></div>{blockers.length>0&&<div className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700"><b>لا يمكن المتابعة:</b><ul className="mt-1 list-inside list-disc">{blockers.map(reason=><li key={reason}>{reason}</li>)}</ul></div>}<div className="grid grid-cols-[1fr_2fr] gap-2"><button onClick={onSaveDraft} disabled={blockers.length>0||submitting} className="min-h-11 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">{newCaller?"حفظ الطلب ومتابعة الدفع":"حفظ بانتظار الدفع"}</button><button onClick={onSubmit} disabled={invalid||submitting} className="min-h-11 rounded-lg bg-[#E20004] text-sm font-black text-white hover:bg-[#C90004] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">{submitting?"جارٍ الإغلاق…":"دفع وإرسال للمطبخ"}</button></div></footer>
  </aside>;
};

export const MobileWorkspaceNav:React.FC<{tab:WorkspaceTab;setTab:(v:WorkspaceTab)=>void;items:number}>=({tab,setTab,items})=><nav aria-label="التنقل في مساحة الطلب" className="sticky bottom-0 z-40 grid grid-cols-3 border-t border-slate-200 bg-white p-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:hidden">{([{id:"customer",label:"العميل",icon:UserRound},{id:"products",label:"المنيو",icon:MenuIcon},{id:"cart",label:"الفاتورة",icon:ShoppingBag}] as const).map(x=><button key={x.id} aria-current={tab===x.id?"page":undefined} onClick={()=>setTab(x.id)} className={`relative min-h-12 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-300 ${tab===x.id?"bg-red-600 text-white":"text-slate-500"}`}><x.icon size={16} className="mx-auto mb-0.5"/>{x.label}{x.id==="cart"&&items>0&&<span className="absolute left-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">{items}</span>}</button>)}</nav>;

export const RepeatOrderDialog:React.FC<{rows:RepeatCandidate[];cartHasItems:boolean;onClose:()=>void;onAdd:(rows:RepeatCandidate[])=>void}>=({rows,cartHasItems,onClose,onAdd})=>{
  const [selected,setSelected]=useState(()=>new Set(rows.filter(r=>r.item).map(r=>r.key)));
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",key);return()=>document.removeEventListener("keydown",key);},[onClose]);
  const valid=rows.filter(r=>r.item), chosen=valid.filter(r=>selected.has(r.key));
  return <div role="presentation" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/30 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section role="dialog" aria-modal="true" aria-labelledby="repeat-title" className="max-h-[85vh] w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl" dir="rtl"><header className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 id="repeat-title" className="font-black">مراجعة إعادة الطلب</h2><p className="text-xs text-slate-400">{cartHasItems?"ستُضاف الأصناف إلى السلة الحالية.":"اختر الأصناف المطلوبة بالسعر الحالي."}</p></div><button autoFocus onClick={onClose} aria-label="إغلاق" className="min-h-10 min-w-10 rounded-md hover:bg-slate-100"><X className="m-auto"/></button></header><div className="max-h-[55vh] space-y-2 overflow-y-auto p-4">{rows.map(row=>{const changed=row.item&&Math.abs(row.item.price-row.oldPrice)>.01;return <label key={row.key} className={`flex min-h-14 items-center gap-3 rounded-lg border p-2 ${row.item?"border-slate-200 bg-slate-50":"border-rose-200 bg-rose-50"}`}><input type="checkbox" disabled={!row.item} checked={selected.has(row.key)} onChange={e=>setSelected(prev=>{const next=new Set(prev);e.target.checked?next.add(row.key):next.delete(row.key);return next;})} className="h-5 w-5 accent-[#E20004]"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{row.name} × {row.quantity}</p><p className="text-xs text-slate-500">{!row.item?"غير متاح في هذا الفرع":changed?`تغيّر السعر: ${money(row.oldPrice)} ← ${money(row.item.price)}`:`السعر ${money(row.item.price)}`}</p></div>{row.item&&<button type="button" onClick={()=>onAdd([row])} className="min-h-10 rounded-md border border-red-200 px-2 text-xs text-red-600">إضافة فقط</button>}</label>})}</div><footer className="grid grid-cols-2 gap-2 border-t border-slate-200 p-4"><button onClick={()=>onAdd(chosen)} disabled={!chosen.length} className="min-h-11 rounded-lg border border-slate-200 font-bold text-slate-700 disabled:opacity-40">إضافة المحدد ({chosen.length})</button><button onClick={()=>onAdd(valid)} disabled={!valid.length} className="min-h-11 rounded-lg bg-[#E20004] font-bold text-white disabled:opacity-40">إضافة كل المتاح ({valid.length})</button></footer></section></div>;
};
