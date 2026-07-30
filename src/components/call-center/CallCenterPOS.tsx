import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Headphones, Loader2, Phone, PhoneForwarded, PhoneIncoming, PhoneOff, Users } from "lucide-react";
import { useApp } from "../../../store";
import { useCallCenterCall } from "../../hooks/useCallCenterCall";
import { useCallTicket } from "../../hooks/useCallTicket";
import {
  useCallCenterCart,
  type PaymentEntry,
} from "../../hooks/useCallCenterCart";
import { useMenu } from "../../hooks/useMenu";
import { toast } from "../shared/Toast";
import { CustomerProfileDrawer } from "./CustomerProfileDrawer";
import {
  callCenterService, type CustomerAddress, type CustomerSearchResult, type OrderDetail,
} from "./services/callCenterService";
import {
  ActiveCallRail, ActiveOrdersBoard, CallCenterCart, CallCenterMenuShell, CustomerContext, MobileWorkspaceNav,
  ProductBuilder, RepeatOrderDialog, type RepeatCandidate, type CallCenterSuccess, type OrderMode, type WorkspaceTab,
} from "./CallCenterWorkspace";
import type { DeliveryQuote } from "./services/callCenterService";
import { DEFAULT_EXTENSIONS } from "../../services/callProvider";
import { branchService, type Branch } from "../../services/branchService";
import { customerResolutionRequestKey, type CustomerResolutionStatus as ResolutionStatus } from "./customerFlow";
import { CallCenterInvoiceInfoTab } from "./CallCenterInvoiceInfoTab";
import type { OrderFromApi } from "../../services/orderService";

interface CustomerResolutionState {
  status: ResolutionStatus;
  normalizedPhone: string | null;
  customer: CustomerSearchResult | null;
  candidates: CustomerSearchResult[];
  error: string | null;
  requestKey: string | null;
}
export interface NewCallerDraft {
  name: string;
  phone: string;
  normalizedPhone: string;
  customerType: "individual" | "company";
  city: string;
  area: string;
  addressLine: string;
  landmark: string;
  deliveryNotes: string;
}
const emptyResolution: CustomerResolutionState = { status:"idle", normalizedPhone:null, customer:null, candidates:[], error:null, requestKey:null };
const emptyDraft = (phone = "", normalizedPhone = ""): NewCallerDraft => ({ name:"", phone, normalizedPhone, customerType:"individual", city:"", area:"", addressLine:"", landmark:"", deliveryNotes:"" });

export const CallCenterPOS: React.FC = () => {
  const { currentUser } = useApp();
  const calls = useCallCenterCall();
  const ticket = useCallTicket();
  const userBranchId = Number((currentUser as any)?.branch_id || 0);
  const [branchId, setBranchId] = useState(userBranchId);
  const [branches, setBranches] = useState<Branch[]>([]);
  const menu = useMenu(branchId || undefined);
  const cart = useCallCenterCart();

  const [customer, setCustomerState] = useState<CustomerSearchResult | null>(null);
  const [resolution, setResolution] = useState<CustomerResolutionState>(emptyResolution);
  const [newCaller, setNewCaller] = useState<NewCallerDraft>(() => emptyDraft());
  const [profileOpen, setProfileOpen] = useState(false);
  const [customerPaneOpen, setCustomerPaneOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [orderMode, setOrderMode] = useState<OrderMode>("delivery");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [discount, setDiscount] = useState(0);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [note, setNote] = useState("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [success, setSuccess] = useState<CallCenterSuccess | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("products");
  const [draftOrderId, setDraftOrderId] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderFromApi | null>(null);
  const [invoiceOpenedAt, setInvoiceOpenedAt] = useState(() => new Date().toISOString());
  const [repeatRows, setRepeatRows] = useState<RepeatCandidate[] | null>(null);
  const ticketAttemptRef = useRef<string | null>(null);
  const resolutionRequestRef = useRef<string | null>(null);

  useEffect(() => {
    void branchService.getAll().then(rows => {
      setBranches(rows);
      if (!branchId && rows.length === 1) setBranchId(rows[0].id);
    }).catch(() => toast.error("تعذر تحميل الفروع"));
  }, []);

  useEffect(() => {
    setDeliveryQuote(null); setQuoteError("");
    if (orderMode !== "delivery" || !branchId) return;
    if (!customer && resolution.status !== "not_found" && calls.phase !== "waiting") return;
    if (customer && !selectedAddress) return;
    if (!customer && !newCaller.area.trim()) return;
    let active = true; setQuoteLoading(true);
    const request = customer && selectedAddress
      ? callCenterService.getDeliveryQuote(customer.id, selectedAddress.id, branchId)
      : callCenterService.getDraftDeliveryQuote(branchId, newCaller.area, newCaller.city);
    request
      .then(response => { if (active) setDeliveryQuote(response.data); })
      .catch(error => { if (active) setQuoteError(error?.response?.data?.message || "العنوان خارج نطاق التوصيل المهيأ"); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [orderMode, selectedAddress?.id, branchId, customer?.id, resolution.status, newCaller.area, newCaller.city, calls.phase]);

  useEffect(() => {
    const callId = calls.session?.callId;
    if (calls.phase !== "incoming" || !calls.session?.callerNumber || !callId || ticket.ticket || ticket.loading || ticketAttemptRef.current === callId) return;
    ticketAttemptRef.current = callId;
    void ticket.open(calls.session.callerNumber, branchId || undefined, callId)
      .catch(() => toast.error("تعذر إنشاء تذكرة المكالمة"));
  }, [calls.phase, calls.session?.callId, calls.session?.callerNumber, ticket.ticket, ticket.loading, branchId]);

  const retryTicket = () => {
    ticketAttemptRef.current = null;
    ticket.reset();
  };

  useEffect(() => {
    if (calls.phase !== "identifying" || !calls.session?.callerNumber || !calls.session.callId || customer) return;
    const phone = calls.session.callerNumber;
    const requestKey = customerResolutionRequestKey(calls.session.callId, phone);
    if (resolutionRequestRef.current === requestKey) return;
    resolutionRequestRef.current = requestKey;
    const controller = new AbortController();
    setResolution({ ...emptyResolution, status:"searching", requestKey });
    const resolve = async () => {
      try {
        let resolved;
        if (ticket.ticket?.customer_id) {
          const profile = await callCenterService.getCustomerFullProfile(ticket.ticket.customer_id);
          resolved = { status:"found" as const, normalized_phone:ticket.ticket.normalized_phone, customer:profile.data.profile.customer, candidates:[] };
        } else {
          resolved = (await callCenterService.resolveCustomerByPhone(phone, controller.signal)).data;
        }
        if (controller.signal.aborted || resolutionRequestRef.current !== requestKey) return;
        if (resolved.status === "found" && resolved.customer) {
          setResolution({ status:"found", normalizedPhone:resolved.normalized_phone, customer:resolved.customer, candidates:[], error:null, requestKey });
          await identify(resolved.customer);
        } else if (resolved.status === "multiple") {
          setResolution({ status:"multiple", normalizedPhone:resolved.normalized_phone, customer:null, candidates:resolved.candidates, error:null, requestKey });
        } else {
          setNewCaller(emptyDraft(phone, resolved.normalized_phone));
          setResolution({ status:"not_found", normalizedPhone:resolved.normalized_phone, customer:null, candidates:[], error:null, requestKey });
        }
      } catch (error:any) {
        if (controller.signal.aborted) return;
        setResolution({ status:"error", normalizedPhone:null, customer:null, candidates:[], error:error?.response?.data?.message || "تعذر التحقق من بيانات العميل", requestKey });
      }
    };
    void resolve();
    return () => controller.abort();
  }, [calls.phase, calls.session?.callId, calls.session?.callerNumber, ticket.ticket?.customer_id, customer]);

  const retryCustomerResolution = () => {
    resolutionRequestRef.current = null;
    setResolution(emptyResolution);
  };

  const identify = async (value: CustomerSearchResult) => {
    try {
      if (ticket.ticket?.customer_id !== value.id) await ticket.linkCustomer(value.id);
      setCustomerState(value);
      setCustomerPaneOpen(true);
      setResolution(current => ({ ...current, status:"found", customer:value, candidates:[], error:null }));
      calls.setCustomer(value.id, value.name, value.phone || value.mobile || "");
    } catch (error:any) {
      setResolution(current => ({ ...current, status:"error", error:error?.response?.data?.message || "تعذر ربط العميل بالمكالمة" }));
    }
  };

  const answer = async () => {
    if (!ticket.ticket) return toast.error("انتظر تجهيز تذكرة المكالمة");
    try { await ticket.accept(); await calls.answer(); }
    catch { toast.error("تعذر قبول المكالمة"); }
  };
  const reject = async () => {
    try { if (ticket.ticket) await ticket.complete("rejected"); }
    finally { await calls.reject(); }
  };
  const endCall = async () => {
    try { if (ticket.ticket && !success) await ticket.complete("call_ended", note); }
    finally { await calls.hangup(); }
  };

  const addressSnapshot = selectedAddress ? {
    label: selectedAddress.label, city: selectedAddress.city, area: selectedAddress.area,
    district: selectedAddress.district, street: selectedAddress.street,
    landmark: selectedAddress.landmark, building_no: selectedAddress.building_no,
    floor: selectedAddress.floor, apartment: selectedAddress.apartment,
    delivery_notes: selectedAddress.delivery_notes,
    delivery_quote: deliveryQuote ? {
      quote_id: deliveryQuote.quote_id, valid_until: deliveryQuote.valid_until,
      zone_id: deliveryQuote.delivery_zone_id, zone_name: deliveryQuote.zone_name,
      fee: deliveryQuote.fee, eta_minutes: deliveryQuote.eta_minutes,
    } : undefined,
  } : undefined;

  const submit = async (close: boolean) => {
    if (!branchId) return toast.error("يجب اختيار الفرع");
    const isManualDraft = calls.phase === "waiting";
    if (!isManualDraft && !customer && resolution.status !== "not_found") return toast.error("لم يكتمل التحقق من العميل");
    if (!customer && !newCaller.name.trim()) return toast.error("اسم العميل مطلوب");
    if (!customer && !newCaller.phone.trim()) return toast.error("رقم هاتف العميل مطلوب");
    if (orderMode === "delivery" && (!(selectedAddress || newCaller.area.trim()) || !deliveryQuote)) return toast.error("يجب اعتماد عنوان وعرض توصيل صالحين");

    let activeCustomer = customer;
    let activeAddress = selectedAddress;
    let activeOrderId = draftOrderId;
    if (!activeCustomer) {
      try {
        const transaction = (await callCenterService.createCallCenterOrder({
          call_ticket_id: ticket.ticket?.id,
          external_call_id: calls.session?.callId,
          branch_id: branchId,
          order_type: orderMode,
          customer: { name:newCaller.name.trim(), phone:newCaller.phone, normalized_phone:newCaller.normalizedPhone },
          address: orderMode === "delivery" ? {
            label:"المنزل", city:newCaller.city, area:newCaller.area, street:newCaller.addressLine,
            landmark:newCaller.landmark, delivery_notes:newCaller.deliveryNotes,
          } : undefined,
          delivery_zone_id: deliveryQuote?.delivery_zone_id,
          delivery_fee: deliveryQuote?.fee,
          delivery_address_snapshot: orderMode === "delivery" ? {
            label:"المنزل", city:newCaller.city, area:newCaller.area, street:newCaller.addressLine,
            landmark:newCaller.landmark, delivery_notes:newCaller.deliveryNotes,
            delivery_quote: deliveryQuote,
          } : undefined,
          items: cart.cart.map(item => ({ item_id:item.id, quantity:item.quantity, unit_price:item.price, notes:item.notes })),
          discount_value: discount,
          discount_type: "amount",
          notes: note,
        })).data;
        activeCustomer = transaction.customer;
        activeAddress = transaction.address;
        activeOrderId = transaction.order.id;
        setCustomerState(transaction.customer);
        setSelectedAddress(transaction.address);
        setDraftOrderId(transaction.order.id);
        setCurrentOrder(transaction.order as OrderFromApi);
        setResolution(current => ({ ...current, status:"found", customer:transaction.customer, candidates:[], error:null }));
        calls.setCustomer(transaction.customer.id, transaction.customer.name, transaction.customer.phone || transaction.customer.mobile || "");
        if (!close) {
          toast.success(`تم إنشاء ملف العميل وحفظ الطلب ${transaction.order.order_number} بانتظار الدفع`);
          setTab("cart");
          return;
        }
      } catch (error:any) {
        toast.error(error?.response?.data?.message || "تعذر حفظ بيانات العميل والطلب. لم يتم إنشاء فاتورة.");
        return;
      }
    }

    if (!activeCustomer) return;
    const payload = {
      branch_id: branchId,
      cashier_id: Number((currentUser as any)?.id),
      call_center_agent_id: Number((currentUser as any)?.id),
      source: "call_center",
      call_notes: ticket.ticket
        ? `Call ${calls.session?.callId} / Ticket ${ticket.ticket.id}`
        : "Manual call-center invoice",
      order_type: orderMode,
      customer_id: activeCustomer.id,
      customer_name: activeCustomer.name,
      customer_phone: activeCustomer.phone || activeCustomer.mobile || "",
      customer_address_id: orderMode === "delivery" ? activeAddress?.id : undefined,
      delivery_address_snapshot: orderMode === "delivery" ? addressSnapshot : undefined,
      delivery_zone_id: orderMode === "delivery" ? deliveryQuote?.delivery_zone_id : undefined,
      delivery_fee: orderMode === "delivery" ? deliveryQuote?.fee : 0,
      delivery_notes: orderMode === "delivery" ? [selectedAddress?.delivery_notes, note].filter(Boolean).join(" | ") : undefined,
      note: `[Call Center] ${note}`.trim(),
      discount_value: discount,
      discount_type: "amount" as const,
    };
    let result = activeOrderId
      ? await cart.saveDraft(payload, activeOrderId)
      : await cart.saveDraft(payload);
    if (!result) return;
    setDraftOrderId(Number(result.id));
    setCurrentOrder(result);
    if (ticket.ticket && ticket.ticket.linked_order_id !== Number(result.id)) {
      await ticket.linkOrder(Number(result.id));
    }
    if (!close) {
      toast.success(`حُفظ الطلب ${result.order_number || result.id} بانتظار الدفع`);
      setTab("cart"); return;
    }
    result = await cart.checkout(Number(result.id), payments, {
      id: activeCustomer.id,
      name: activeCustomer.name,
      phone: activeCustomer.phone || activeCustomer.mobile || "",
    });
    if (!result) return;
    setCurrentOrder(result);
    if (ticket.ticket) await ticket.complete("order_completed", note);
    if (selectedAddress) void callCenterService.markAddressUsed(selectedAddress.id).catch(() => undefined);
    setSuccess({
      orderId: Number(result.id), orderNumber: String(result.order_number || result.id),
      invoiceNumber: result.invoice?.number || result.invoice?.invoice_number,
      total: Number(result.total || cart.subtotal - discount + (orderMode === "delivery" ? deliveryQuote?.fee || 0 : 0)),
      customerName: activeCustomer.name,
      address: activeAddress ? [activeAddress.city, activeAddress.area, activeAddress.street].filter(Boolean).join("، ") : undefined,
      payments,
    });
    if (calls.phase !== "waiting") await calls.hangup();
  };

  const repeatOrder = (order: OrderDetail) => {
    setRepeatRows(order.items.map((old,index) => {
      const item = menu.allItems.find(current => current.id === old.item_id);
      return { key:`${old.id}-${index}`, name:old.item_name_ar||old.item_name||"صنف", quantity:old.quantity, oldPrice:old.price, item:item||null };
    }));
  };
  const addRepeatRows = (rows:RepeatCandidate[]) => {
    rows.forEach(row => { if(row.item) cart.addToCart(row.item,{quantity:row.quantity,price:row.item.price}); });
    toast.success(`أضيف ${rows.length} صنف إلى السلة`); setRepeatRows(null); setProfileOpen(false); setTab("products");
  };

  const resetAll = () => {
    calls.reset(); ticket.reset(); cart.clearCart(); setCustomerState(null); setSelectedAddress(null);
    setPayments([]); setDiscount(0); setDeliveryQuote(null); setQuoteError(""); setNote(""); setSuccess(null);
    setDraftOrderId(null); setCurrentOrder(null); setInvoiceOpenedAt(new Date().toISOString()); setResolution(emptyResolution); setNewCaller(emptyDraft()); setTab("products"); setCustomerPaneOpen(false);
    resolutionRequestRef.current = null; ticketAttemptRef.current = null;
  };

  const newCallerActive =
    (calls.phase === "identifying" && resolution.status === "not_found") ||
    calls.phase === "waiting";
  return <div className="relative flex h-full min-h-0 flex-col bg-[#0B0D10] font-['Tajawal']" dir="rtl">
    {calls.phase !== "waiting" && calls.phase !== "incoming" && <ActiveCallRail name={customer?.name || "متصل جديد"} phone={customer?.phone||customer?.mobile||newCaller.phone||calls.session?.callerNumber} duration={calls.session?.duration||0} ticketId={ticket.ticket?.id} stage={success?"kitchen":payments.length?"payment":cart.cart.length?"order":"customer"} orderState={draftOrderId?"محفوظ":"مسودة"} paymentState={success?"مدفوع":payments.length?"قيد التحصيل":"غير مدفوع"} invoiceState={success?"فاتورة منشأة":"لم تُنشأ"} kitchenState={success?"أُرسل":"لم يُرسل"} onToggleProfile={()=>setCustomerPaneOpen(value=>!value)} profileOpen={customerPaneOpen} onTransfer={async ext=>{await calls.transferCall(ext);if(ticket.ticket)await ticket.complete("transferred",ext);}} extensions={DEFAULT_EXTENSIONS} onEnd={endCall}/>}
    {!customerPaneOpen&&customer&&<button onClick={()=>setCustomerPaneOpen(true)} className="absolute left-5 top-4 z-40 hidden min-h-10 items-center gap-2 rounded-lg border border-[#2A3039] bg-[#171B21] px-3 text-xs font-bold text-slate-200 shadow-xl xl:flex"><Users size={15}/>فتح ملف العميل</button>}
    {!branchId&&<div className="border-b border-amber-500/30 bg-amber-500/10 p-2 text-center text-xs text-amber-200"><label className="font-bold">اختر الفرع المسؤول عن تنفيذ الطلب <select value={branchId} onChange={e=>setBranchId(Number(e.target.value))} className="mr-2 min-h-10 rounded-md bg-[#12151A] px-3 text-white"><option value={0}>اختر الفرع</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label></div>}
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden bg-slate-950 p-2 sm:p-4">
      {customerPaneOpen&&customer&&<div className="relative hidden min-h-0 w-[320px] shrink-0 overflow-hidden rounded-3xl border border-white/5 bg-[#12151A] xl:flex 2xl:w-[380px]">
        <button onClick={()=>setCustomerPaneOpen(false)} aria-label="إغلاق ملف العميل" className="absolute left-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A3039] bg-[#171B21] text-slate-300 hover:bg-[#222B36]"><span aria-hidden="true">×</span></button>
        <CustomerContext view={tab==="history"?"history":"customer"} customer={customer} newCaller={newCallerActive?newCaller:null} setNewCaller={setNewCaller} selectedAddress={selectedAddress} onAddress={setSelectedAddress} onProfile={()=>setProfileOpen(true)} onRepeat={repeatOrder}/>
      </div>}
      <div className={`${tab==="cart"?"hidden":"flex"} min-h-0 min-w-0 flex-1 lg:flex`}>
        <CallCenterMenuShell tab={tab} setTab={setTab} customerName={customer?.name || newCaller.name || "عميل غير محدد"} phone={customer?.phone||customer?.mobile||newCaller.phone||"بدون مكالمة"} branchName={branches.find(branch=>branch.id===branchId)?.name||"الفرع غير محدد"} query={query} onQuery={setQuery}>
          {tab==="products"&&<ProductBuilder categories={menu.categories} loading={menu.loading} error={menu.error} selectedCategory={category} onCategory={setCategory} query={query} onQuery={setQuery} onAdd={cart.addToCart}/>}
          {tab==="order"&&<CallCenterInvoiceInfoTab currentUser={currentUser} branch={branches.find(branch=>branch.id===branchId)||null} ticket={ticket.ticket} order={currentOrder} payments={payments} openedAt={invoiceOpenedAt} isSubmitting={cart.submitting} closedSuccessfully={Boolean(success)}/>}
          {tab==="customer"&&<div className={`h-full ${customerPaneOpen?"xl:hidden":""}`}><CustomerContext view="customer" customer={customer} newCaller={newCallerActive?newCaller:null} setNewCaller={setNewCaller} selectedAddress={selectedAddress} onAddress={setSelectedAddress} onProfile={()=>setProfileOpen(true)} onRepeat={repeatOrder}/></div>}
          {tab==="history"&&<div className={`h-full overflow-y-auto p-3 ${customerPaneOpen?"xl:hidden":""}`}><ActiveOrdersBoard branchId={branchId}/><div className="min-h-[360px]"><CustomerContext view="history" customer={customer} newCaller={newCallerActive?newCaller:null} setNewCaller={setNewCaller} selectedAddress={selectedAddress} onAddress={setSelectedAddress} onProfile={()=>setProfileOpen(true)} onRepeat={repeatOrder}/></div></div>}
        </CallCenterMenuShell>
      </div>
      <div className={`${tab==="cart"?"flex":"hidden"} min-h-0 w-full shrink-0 lg:flex lg:w-[450px] xl:w-[500px]`}>
        <CallCenterCart cart={cart.cart} subtotal={cart.subtotal} update={cart.updateCartItem} remove={cart.removeFromCart} clear={cart.clearCart} orderMode={orderMode} setOrderMode={setOrderMode} selectedAddress={selectedAddress} customerId={customer?.id} branchId={branchId} newCaller={newCallerActive?newCaller:null} discount={discount} setDiscount={setDiscount} deliveryQuote={deliveryQuote} quoteLoading={quoteLoading} quoteError={quoteError} note={note} setNote={setNote} payments={payments} setPayments={setPayments} submitting={cart.submitting} onSaveDraft={()=>void submit(false)} onSubmit={()=>void submit(true)} success={success} onNew={resetAll} orderId={draftOrderId}/>
      </div>
    </div>
    <MobileWorkspaceNav tab={tab} setTab={setTab} items={cart.cart.reduce((s,i)=>s+i.quantity,0)}/>
    {customerPaneOpen&&customer&&<div className="fixed inset-0 z-[65] hidden items-stretch bg-black/45 md:flex xl:hidden" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCustomerPaneOpen(false);}}>
      <aside role="dialog" aria-modal="true" aria-label="ملف العميل" className="relative mr-auto flex h-full w-[360px] max-w-[92vw] overflow-hidden border-r border-white/10 bg-[#12151A] shadow-2xl">
        <button autoFocus onClick={()=>setCustomerPaneOpen(false)} aria-label="إغلاق ملف العميل" className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A3039] bg-[#171B21] text-slate-200 hover:bg-[#222B36] focus:ring-2 focus:ring-red-600/60"><span aria-hidden="true">×</span></button>
        <CustomerContext view={tab==="history"?"history":"customer"} customer={customer} newCaller={null} setNewCaller={setNewCaller} selectedAddress={selectedAddress} onAddress={setSelectedAddress} onProfile={()=>setProfileOpen(true)} onRepeat={repeatOrder}/>
      </aside>
    </div>}
    {customer&&<CustomerProfileDrawer customerId={customer.id} isOpen={profileOpen} onClose={()=>setProfileOpen(false)} onSelectAddress={setSelectedAddress} onRepeatOrder={repeatOrder}/>}
    {repeatRows&&<RepeatOrderDialog rows={repeatRows} cartHasItems={cart.cart.length>0} onClose={()=>setRepeatRows(null)} onAdd={addRepeatRows}/>}
    {calls.phase === "incoming" && <div className="pointer-events-none absolute inset-x-0 top-3 z-[80] flex justify-center px-3"><Incoming phone={calls.session?.callerNumber||""} loading={ticket.loading} ticketReady={Boolean(ticket.ticket)} ticketError={ticket.error} onRetryTicket={retryTicket} onAnswer={answer} onReject={reject} onTransfer={async extension => { await calls.transferCall(extension); if(ticket.ticket) await ticket.complete("transferred",extension); }}/></div>}
    {calls.phase === "identifying" && resolution.status === "searching" && <div className="pointer-events-none absolute inset-0 z-[75] bg-black/15"><CustomerSearchLoading phone={calls.session?.callerNumber||""}/></div>}
    {calls.phase === "identifying" && resolution.status === "error" && <div className="absolute inset-x-0 top-3 z-[75] flex justify-center px-3"><CustomerSearchError message={resolution.error} onRetry={retryCustomerResolution} onEnd={endCall}/></div>}
    {calls.phase === "identifying" && resolution.status === "multiple" && <div className="absolute inset-x-0 top-3 z-[75] flex justify-center px-3"><CustomerCandidateSelector candidates={resolution.candidates} onSelect={value=>void identify(value)} onRetry={retryCustomerResolution}/></div>}
    {calls.phase === "waiting" && import.meta.env.DEV && <CallSimulator isBreak={calls.isOnBreak} onBreak={()=>calls.setBreak(!calls.isOnBreak)} onSimulate={calls.simulateCall}/>}
  </div>;
};

const CallSimulator:React.FC<{isBreak:boolean;onBreak:()=>void;onSimulate:(p:string)=>void}>=({isBreak,onBreak,onSimulate})=>{
  const [open,setOpen]=useState(false);
  const [phone,setPhone]=useState(()=>localStorage.getItem("call_center_simulation_phone")||"0599001122");
  const valid=/^(?:\+?970|0)?(?:59|56)\d{7}$/.test(phone.replace(/[\s-]/g,""));
  return <div className="absolute bottom-4 left-4 z-50" dir="rtl">{open&&<div className="mb-2 w-72 rounded-xl border border-[#2A3039] bg-[#12151A] p-3 text-white shadow-2xl"><label className="text-xs font-bold">محاكاة مكالمة<input value={phone} onChange={e=>setPhone(e.target.value)} dir="ltr" className="mt-2 min-h-10 w-full rounded-lg border border-[#2A3039] bg-[#0B0D10] px-3"/></label><button disabled={!valid||isBreak} onClick={()=>{localStorage.setItem("call_center_simulation_phone",phone);onSimulate(phone);setOpen(false);}} className="mt-2 min-h-10 w-full rounded-lg bg-[#E20004] text-xs font-black disabled:opacity-50">بدء المكالمة</button><button onClick={onBreak} className="mt-2 min-h-9 w-full text-xs text-slate-400">{isBreak?"إنهاء الاستراحة":"بدء استراحة"}</button></div>}<button onClick={()=>setOpen(value=>!value)} aria-label="أدوات اختبار المكالمات" className="flex h-11 items-center gap-2 rounded-lg border border-[#2A3039] bg-[#171B21] px-3 text-xs font-bold text-slate-300 shadow-xl"><Headphones size={16}/>اختبار مكالمة</button></div>;
};

const Waiting:React.FC<{isBreak:boolean;onBreak:()=>void;onSimulate:(p:string)=>void}>=({isBreak,onBreak,onSimulate})=>{
  const [phone,setPhone]=useState(()=>localStorage.getItem("call_center_simulation_phone")||"0599001122");
  const valid=/^(?:\+?970|0)?(?:59|56)\d{7}$/.test(phone.replace(/[\s-]/g,""));
  const start=()=>{if(!valid)return;localStorage.setItem("call_center_simulation_phone",phone);onSimulate(phone);};
  return <div className="flex h-full items-center justify-center bg-[#0B0D10] p-6 text-white" dir="rtl"><div className="w-full max-w-lg text-center"><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#171B21] text-[#E20004]"><Headphones size={38}/></span><h1 className="mt-5 text-2xl font-black">{isBreak?"أنت في استراحة":"مختبر رحلة الكول سنتر"}</h1><p className="mt-2 text-sm text-[#94A3B8]">{isBreak?"أوقف وضع الاستراحة لبدء المحاكاة.":"لن ترن أي مكالمة تلقائيًا. أدخل الرقم وابدأ السيناريو عندما تكون مستعدًا."}</p>{import.meta.env.DEV&&<div className="mt-6 rounded-xl border border-[#2A3039] bg-[#12151A] p-4 text-right"><label className="block text-xs font-bold text-[#CBD5E1]">رقم هاتف العميل<input value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")start();}} dir="ltr" inputMode="tel" className="mt-2 min-h-12 w-full rounded-lg border border-[#2A3039] bg-[#0B0D10] px-4 text-lg font-bold tracking-wider outline-none focus:border-[#E20004]"/></label>{!valid&&<p className="mt-2 text-xs text-rose-300">أدخل رقم جوال فلسطيني صالح بصيغة 059 أو 056 أو +970.</p>}<div className="mt-3 grid grid-cols-2 gap-2"><button disabled={!valid||isBreak} onClick={start} className="min-h-12 rounded-lg bg-[#E20004] font-black disabled:cursor-not-allowed disabled:bg-[#3A1D20] disabled:text-[#8B6A6C]"><PhoneIncoming size={18} className="ml-2 inline"/>بدء محاكاة المكالمة</button><button onClick={()=>setPhone("0599001122")} className="min-h-12 rounded-lg border border-[#2A3039] text-xs font-bold">عميل الاختبار الموجود</button></div><p className="mt-3 text-[11px] leading-5 text-[#64748B]">بعد إكمال الطلب والعودة إلى هذه الشاشة سيبقى الرقم محفوظًا، ويمكنك بدء طلب جديد للعميل نفسه وتحليل POS مرة أخرى.</p></div>}<button onClick={onBreak} className="mt-4 min-h-11 rounded-lg border border-[#2A3039] px-5 font-bold hover:bg-[#20252D]">{isBreak?"العودة للعمل":"بدء استراحة"}</button></div></div>;
};

const Incoming:React.FC<{phone:string;loading:boolean;ticketReady:boolean;ticketError:string|null;onRetryTicket:()=>void;onAnswer:()=>void;onReject:()=>void;onTransfer:(x:string)=>void}>=({phone,loading,ticketReady,ticketError,onRetryTicket,onAnswer,onReject,onTransfer})=><section role="dialog" aria-modal="false" aria-label="مكالمة واردة" className="pointer-events-auto w-full max-w-lg rounded-2xl border border-green-500/30 bg-[#12151A] p-4 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,.65)] sm:p-5" dir="rtl"><div className="flex items-center justify-center gap-3"><PhoneIncoming className="animate-pulse text-green-400" size={32}/><div className="text-right"><p className="text-xs text-[#94A3B8]">مكالمة واردة</p><h1 className="text-xl font-black" dir="ltr">{phone}</h1></div></div>{ticketError&&<div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200"><p>{ticketError}</p><button onClick={onRetryTicket} className="mt-2 min-h-10 rounded-md border border-rose-400/40 px-4 font-bold">إعادة محاولة إنشاء التذكرة</button></div>}<div className="mt-4 grid grid-cols-2 gap-2"><button disabled={loading||!ticketReady} onClick={onAnswer} className="min-h-11 rounded-lg bg-green-600 font-black hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">{loading?<Loader2 className="mx-auto animate-spin"/>:<><Phone size={18} className="ml-2 inline"/>رد</>}</button><button onClick={onReject} className="min-h-11 rounded-lg bg-rose-600 font-black"><PhoneOff size={18} className="ml-2 inline"/>رفض</button></div>{!ticketReady&&!ticketError&&<p className="mt-2 text-xs text-[#94A3B8]">جارٍ تجهيز تذكرة المكالمة…</p>}<div className="mt-3 flex justify-center gap-2 overflow-x-auto">{DEFAULT_EXTENSIONS.slice(0,3).map(ext=><button key={ext.extension} onClick={()=>onTransfer(ext.extension)} className="min-h-10 shrink-0 rounded-lg border border-[#2A3039] px-3 text-xs"><PhoneForwarded size={14} className="ml-1 inline"/>{ext.name}</button>)}</div></section>;

const CustomerSearchLoading=({phone}:{phone:string})=><div className="flex h-full items-start justify-center p-5 pt-24 text-white" dir="rtl"><div className="pointer-events-auto rounded-xl border border-red-500/25 bg-[#12151A] px-8 py-5 text-center shadow-2xl"><Loader2 className="mx-auto mb-3 animate-spin text-[#E20004]" size={34}/><h1 className="text-base font-black">جارٍ التحقق من بيانات العميل...</h1><p className="mt-2 text-xs text-[#94A3B8]" dir="ltr">{phone}</p><p className="mt-2 text-[11px] text-slate-500">يمكنك متابعة إضافة الأصناف أثناء البحث.</p></div></div>;
const CustomerSearchError=({message,onRetry,onEnd}:{message:string|null;onRetry:()=>void;onEnd:()=>void})=><section role="alertdialog" aria-modal="false" className="w-full max-w-md rounded-xl border border-rose-500/30 bg-[#12151A] p-5 text-center text-white shadow-2xl" dir="rtl"><AlertTriangle className="mx-auto text-rose-400" size={34}/><h1 className="mt-3 text-lg font-black">تعذر التحقق من بيانات العميل</h1><p className="mt-2 text-sm text-rose-200">{message}</p><div className="mt-4 grid grid-cols-2 gap-2"><button autoFocus onClick={onRetry} className="min-h-11 rounded-lg bg-[#E20004] font-black">إعادة المحاولة</button><button onClick={onEnd} className="min-h-11 rounded-lg border border-rose-500/30 text-xs text-rose-300">إنهاء المكالمة</button></div></section>;
const CustomerCandidateSelector=({candidates,onSelect,onRetry}:{candidates:CustomerSearchResult[];onSelect:(v:CustomerSearchResult)=>void;onRetry:()=>void})=><section role="dialog" aria-modal="false" aria-label="اختيار العميل" className="max-h-[70vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#2A3039] bg-[#12151A] p-5 text-white shadow-2xl" dir="rtl"><div className="mb-4 flex items-center gap-2"><Users className="text-blue-400"/><div><h1 className="font-black">اختر العميل الصحيح</h1><p className="text-xs text-[#94A3B8]">يمكن متابعة تجهيز الفاتورة خلف هذه البطاقة.</p></div></div><div className="space-y-2">{candidates.map((value,index)=><button autoFocus={index===0} key={value.id} onClick={()=>onSelect(value)} className="w-full rounded-lg border border-[#2A3039] bg-[#171B21] p-3 text-right hover:border-[#E20004] focus:ring-2 focus:ring-red-600/60"><b>{value.name}</b><span className="mt-1 block text-xs text-[#94A3B8]" dir="ltr">{value.phone||value.mobile} · {value.code}</span></button>)}</div><button onClick={onRetry} className="mt-3 min-h-10 w-full text-xs text-blue-300">إعادة البحث</button></section>;
