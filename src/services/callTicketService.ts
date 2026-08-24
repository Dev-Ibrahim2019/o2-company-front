import api from "../api/axios";

export type CallTicketStatus =
  | "ringing"
  | "open"
  | "in_progress"
  | "completed"
  | "missed";

export type CallType = "order" | "complaint" | "inquiry" | "order_modification";

export const CALL_TYPE_LABELS: Record<CallType, string> = {
  order: "طلب",
  complaint: "شكوى",
  inquiry: "استفسار",
  order_modification: "تعديل طلب",
};

export interface CallTicket {
  id: number;
  external_call_id?: string | null;
  branch_id: number | null;
  customer_id?: number | null;
  agent_id?: number | null;
  linked_order_id?: number | null;
  incoming_phone: string;
  normalized_phone: string;
  status: CallTicketStatus;
  disposition?: string | null;
  call_type?: CallType | null;
  satisfaction_rating?: number | null;
  satisfaction_feedback?: string | null;
  notes?: string | null;
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const callTicketService = {
  async open(phone: string, branchId?: number, externalCallId?: string): Promise<CallTicket> {
    return unwrap(
      await api.post("/call-center/tickets/manual", {
        phone,
        branch_id: branchId,
        external_call_id: externalCallId,
      }),
    );
  },

  async accept(ticketId: number): Promise<CallTicket> {
    return unwrap(await api.post(`/call-center/tickets/${ticketId}/accept`));
  },

  async linkCustomer(ticketId: number, customerId: number): Promise<CallTicket> {
    return unwrap(
      await api.post(`/call-center/tickets/${ticketId}/customer`, {
        customer_id: customerId,
      }),
    );
  },

  async linkOrder(ticketId: number, orderId: number): Promise<CallTicket> {
    return unwrap(
      await api.post(`/call-center/tickets/${ticketId}/order`, {
        order_id: orderId,
      }),
    );
  },

  async addNote(ticketId: number, note: string): Promise<CallTicket> {
    return unwrap(
      await api.post(`/call-center/tickets/${ticketId}/notes`, { note }),
    );
  },

  async complete(
    ticketId: number,
    disposition: string,
    notes?: string,
    callType?: CallType,
  ): Promise<CallTicket> {
    return unwrap(
      await api.post(`/call-center/tickets/${ticketId}/complete`, {
        disposition,
        notes,
        call_type: callType,
      }),
    );
  },

  async classify(ticketId: number, callType: CallType): Promise<CallTicket> {
    return unwrap(
      await api.patch(`/call-center/tickets/${ticketId}/classify`, {
        call_type: callType,
      }),
    );
  },

  async rate(
    ticketId: number,
    rating: number,
    feedback?: string,
  ): Promise<CallTicket> {
    return unwrap(
      await api.post(`/call-center/tickets/${ticketId}/rate`, {
        rating,
        feedback,
      }),
    );
  },
};
