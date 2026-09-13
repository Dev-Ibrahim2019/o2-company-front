import { beforeEach, describe, expect, it, vi } from "vitest";

const { post, getOne, getPaymentMethods } = vi.hoisted(() => ({
  post: vi.fn(),
  getOne: vi.fn(),
  getPaymentMethods: vi.fn(),
}));

vi.mock("../api/axios", () => ({ default: { post } }));
vi.mock("./orderService", () => ({
  orderService: { getOne, update: vi.fn() },
}));
vi.mock("./settlementService", () => ({
  settlementService: { getPaymentMethods },
}));

import {
  CallCenterWorkflowError,
  callCenterOrderWorkflow,
  clearCallCenterPaymentAttempt,
  type CallCenterPayment,
} from "./callCenterOrderWorkflow";

const order = { id: 41, total: 100, status: "pending" } as never;
const accountLeg: CallCenterPayment = {
  method: "account",
  amount: 40,
  entity_type: "customer",
  entity_id: 7,
  subledger_type: "customer",
  subledger_id: 7,
};
const transferLeg: CallCenterPayment = {
  method: "bank",
  amount: 60,
  reference: "BANK-REF-1",
};

const executionResponse = (
  remainingAmount: number,
  overrides: Record<string, unknown> = {},
) => ({
  data: {
    data: {
      id: 41,
      remaining_amount: remainingAmount,
      payment_status: remainingAmount ? "processing" : "paid",
      payment_policy: remainingAmount ? "instant_debit" : "mixed",
      kitchen_release_status: remainingAmount ? "held" : "released",
      status: remainingAmount ? "pending" : "confirmed",
      ...overrides,
    },
  },
});

describe("callCenterOrderWorkflow.checkout payment plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCallCenterPaymentAttempt(41);
    getOne.mockResolvedValue(order);
    getPaymentMethods.mockResolvedValue([
      { id: 12, type: "bank", is_active: true },
    ]);
  });

  it("feeds an account and transfer plan sequentially and returns one final success", async () => {
    post
      .mockResolvedValueOnce(executionResponse(60))
      .mockResolvedValueOnce(executionResponse(0));

    const result = await callCenterOrderWorkflow.checkout(
      41,
      [accountLeg, transferLeg],
      {},
    );

    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][0]).toBe("/call-center/orders/41/debit-entity");
    expect(post.mock.calls[1][0]).toBe("/call-center/orders/41/confirm-transfer");
    expect(post.mock.calls[0][1].idempotency_key).not.toBe(
      post.mock.calls[1][1].idempotency_key,
    );
    expect(result).toMatchObject({ payment_status: "paid", kitchen_release_status: "released" });
  });

  it("stops at the second failed leg and identifies only that row", async () => {
    post
      .mockResolvedValueOnce(executionResponse(40))
      .mockRejectedValueOnce({
        response: {
          status: 422,
          data: { message: "Insufficient balance", data: { available_balance: 25 } },
        },
      });

    const error = await callCenterOrderWorkflow
      .checkout(41, [transferLeg, { ...accountLeg, amount: 40 }], {})
      .catch((failure: unknown) => failure);

    expect(error).toMatchObject<Partial<CallCenterWorkflowError>>({
      kind: "insufficient_balance",
      availableBalance: 25,
    });
    expect(error).toBeInstanceOf(CallCenterWorkflowError);
    expect((error as Error).message).toContain("الدفعة رقم 2");

    expect(post.mock.calls.filter(([url]) => String(url).endsWith("confirm-transfer"))).toHaveLength(1);
  });

  it("retries only the failed second leg with its original key", async () => {
    post
      .mockResolvedValueOnce(executionResponse(40, { payment_policy: "manual_confirmation" }))
      .mockRejectedValueOnce({
        response: { status: 422, data: { message: "Insufficient balance" } },
      });

    await expect(
      callCenterOrderWorkflow.checkout(41, [transferLeg, { ...accountLeg, amount: 40 }], {}),
    ).rejects.toThrow("الدفعة رقم 2");
    const failedLegKey = post.mock.calls[1][1].idempotency_key;

    post.mockResolvedValueOnce(executionResponse(0));
    const result = await callCenterOrderWorkflow.checkout(
      41,
      [transferLeg, { ...accountLeg, amount: 40 }],
      {},
    );

    expect(post).toHaveBeenCalledTimes(3);
    expect(post.mock.calls.filter(([url]) => String(url).endsWith("confirm-transfer"))).toHaveLength(1);
    expect(post.mock.calls[2][0]).toBe("/call-center/orders/41/debit-entity");
    expect(post.mock.calls[2][1].idempotency_key).toBe(failedLegKey);
    expect(result.payment_status).toBe("paid");
  });

  it("keeps a single payment plan behavior unchanged", async () => {
    post.mockResolvedValueOnce(executionResponse(0, { payment_policy: "manual_confirmation" }));

    const result = await callCenterOrderWorkflow.checkout(
      41,
      [{ ...transferLeg, amount: 100 }],
      {},
      "single-attempt",
    );

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      "/call-center/orders/41/confirm-transfer",
      expect.objectContaining({ amount: 100, idempotency_key: "single-attempt" }),
    );
    expect(result).toMatchObject({ payment_status: "paid", kitchen_release_status: "released" });
  });
});
