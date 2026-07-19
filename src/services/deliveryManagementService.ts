import api from '../api/axios';

export interface Zone { id:number; branch_id:number; code:string; name:string; city?:string|null; area?:string|null; base_fee:number|string; minimum_order_amount?:number|null; free_delivery_threshold?:number|null; estimated_minutes?:number|null; is_active:boolean; notes?:string|null; branch?:{id:number;name:string}; }
export interface DeliveryOrder { id:number; branch_id:number; order_number:string; customer_name?:string; customer_phone?:string; total:number; delivery_fee?:number; delivery_address_snapshot?:Record<string,unknown>|string|null; delivery_zone?:Zone|null; }
export interface Stop { id:number; sequence:number; status:'pending'|'out_for_delivery'|'delivered'|'failed'|'cancellation_requested'|'cancelled'; failure_reason?:string|null; order:DeliveryOrder; }
export interface CancellationRequest {id:number;status:'pending'|'approved'|'rejected'|'auto_approved';reason_code:string;reason_text?:string|null;customer_confirmed:boolean;created_at:string;order:DeliveryOrder&{customer?:{name:string}};trip?:Trip;}
export interface Trip { id:number; number:string; status:'draft'|'ready'|'in_progress'|'completed'|'cancelled'; branch_id:number; driver_id?:number|null; driver?:{id:number;name:string;phone?:string}; branch?:{id:number;name:string}; stops:Stop[]; stops_count?:number; notes?:string|null; }
export interface Page<T>{data:T[];current_page:number;last_page:number;per_page:number;total:number}
const unwrap=<T>(response:{data:{data:T}})=>response.data.data;

export const deliveryManagementService={
  zones:async(params:Record<string,unknown>={})=>unwrap<Page<Zone>>(await api.get('/delivery-management/zones',{params})),
  saveZone:async(zone:Partial<Zone>)=>unwrap<Zone>(zone.id?await api.put(`/delivery-management/zones/${zone.id}`,zone):await api.post('/delivery-management/zones',zone)),
  deleteZone:async(id:number)=>api.delete(`/delivery-management/zones/${id}`),
  quote:async(params:{branch_id:number;delivery_zone_id:number;subtotal:number})=>unwrap<{zone:Zone;fee:number;eligible:boolean}>(await api.get('/delivery-management/zones/quote',{params})),
  candidates:async(params:Record<string,unknown>={})=>unwrap<Page<DeliveryOrder>>(await api.get('/delivery-management/candidate-orders',{params})),
  trips:async(params:Record<string,unknown>={})=>unwrap<Page<Trip>>(await api.get('/delivery-management/trips',{params})),
  trip:async(id:number)=>unwrap<Trip>(await api.get(`/delivery-management/trips/${id}`)),
  drivers:async(branch_id?:number)=>unwrap<Array<{id:number;name:string}>>(await api.get('/operations/delivery/available',{params:{branch_id,include_busy:true}})),
  createTrip:async(payload:{driver_id:number;order_ids:number[];notes?:string})=>unwrap<Trip>(await api.post('/delivery-management/trips',payload)),
  updateTrip:async(id:number,payload:{driver_id?:number;order_ids?:number[];notes?:string})=>unwrap<Trip>(await api.put(`/delivery-management/trips/${id}`,payload)),
  start:async(id:number)=>unwrap<Trip>(await api.post(`/delivery-management/trips/${id}/start`)),
  cancel:async(id:number)=>unwrap<Trip>(await api.post(`/delivery-management/trips/${id}/cancel`)),
  stop:async(trip:number,stop:number,status:'delivered'|'failed'|'skipped',failure_reason?:string)=>unwrap<Trip>(await api.patch(`/delivery-management/trips/${trip}/stops/${stop}`,{status,failure_reason})),
  cancelStop:async(trip:number,stop:number,payload:{reason_code:string;reason_text?:string;customer_confirmed:boolean})=>unwrap<CancellationRequest>(await api.post(`/delivery-management/trips/${trip}/stops/${stop}/cancel`,payload)),
  cancellationRequests:async(params:Record<string,unknown>={})=>unwrap<Page<CancellationRequest>>(await api.get('/operations/cancellation-requests',{params})),
  approveCancellation:async(id:number,resolution_note?:string)=>unwrap<CancellationRequest>(await api.post(`/operations/cancellation-requests/${id}/approve`,{resolution_note})),
  rejectCancellation:async(id:number,decision:'OUT_FOR_DELIVERY'|'FAILED_DELIVERY',resolution_note:string)=>unwrap<CancellationRequest>(await api.post(`/operations/cancellation-requests/${id}/reject`,{decision,resolution_note})),
};
