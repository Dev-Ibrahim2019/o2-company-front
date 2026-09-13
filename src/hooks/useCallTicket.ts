import { useCallback, useState } from "react";
import {
  callTicketService,
  type CallTicket,
} from "../services/callTicketService";

export const useCallTicket = () => {
  const [ticket, setTicket] = useState<CallTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (cause) {
      const message =
        (cause as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "تعذر تحديث تذكرة المكالمة";
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  const open = useCallback(
    async (phone: string, branchId?: number, externalCallId?: string) => {
      const value = await run(() => callTicketService.open(phone, branchId, externalCallId));
      setTicket(value);
      return value;
    },
    [run],
  );

  const accept = useCallback(async () => {
    if (!ticket) throw new Error("لا توجد تذكرة مكالمة نشطة");
    const value = await run(() => callTicketService.accept(ticket.id));
    setTicket(value);
    return value;
  }, [run, ticket]);

  const linkCustomer = useCallback(
    async (customerId: number) => {
      if (!ticket) throw new Error("لا توجد تذكرة مكالمة نشطة");
      const value = await run(() =>
        callTicketService.linkCustomer(ticket.id, customerId),
      );
      setTicket(value);
      return value;
    },
    [run, ticket],
  );

  const linkOrder = useCallback(
    async (orderId: number) => {
      if (!ticket) throw new Error("لا توجد تذكرة مكالمة نشطة");
      const value = await run(() =>
        callTicketService.linkOrder(ticket.id, orderId),
      );
      setTicket(value);
      return value;
    },
    [run, ticket],
  );

  const complete = useCallback(
    async (disposition: string, notes?: string) => {
      if (!ticket) throw new Error("لا توجد تذكرة مكالمة نشطة");
      const value = await run(() =>
        callTicketService.complete(ticket.id, disposition, notes),
      );
      setTicket(value);
      return value;
    },
    [run, ticket],
  );

  const reset = useCallback(() => {
    setTicket(null);
    setError(null);
  }, []);

  return {
    ticket,
    loading,
    error,
    open,
    accept,
    linkCustomer,
    linkOrder,
    complete,
    reset,
  };
};
