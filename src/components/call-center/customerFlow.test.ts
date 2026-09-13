import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCheckoutBlockers,
  customerResolutionRequestKey,
  type CustomerResolutionStatus,
} from "./customerFlow";
import { feedbackDraftFrom, feedbackPayload, feedbackValidationMessage } from "./feedbackFlow";

describe("call-center customer resolution flow", () => {
  it("keeps search states distinct from not-found", () => {
    const states: CustomerResolutionStatus[] = [
      "idle", "searching", "found", "multiple", "not_found", "error",
    ];
    expect(new Set(states).size).toBe(6);
    expect(states.indexOf("error")).not.toBe(states.indexOf("not_found"));
  });

  it("uses a stable request key for Strict Mode and ticket retries", () => {
    expect(customerResolutionRequestKey("mock-call-1", "0599001122"))
      .toBe(customerResolutionRequestKey("mock-call-1", "0599001122"));
    expect(customerResolutionRequestKey("mock-call-2", "0599001122"))
      .not.toBe(customerResolutionRequestKey("mock-call-1", "0599001122"));
  });

  it("shows every blocking reason for a new delivery caller", () => {
    expect(buildCheckoutBlockers({
      branchId: 0,
      customerName: "",
      isNewCaller: true,
      cartCount: 0,
      isDelivery: true,
      addressReady: false,
      deliveryQuoteReady: false,
    })).toEqual([
      "يجب اختيار الفرع",
      "اسم العميل مطلوب",
      "السلة فارغة",
      "يجب إدخال عنوان التوصيل",
      "يجب اعتماد عرض توصيل صالح",
    ]);
  });

  it("allows checkout when all required data is ready", () => {
    expect(buildCheckoutBlockers({
      branchId: 1,
      customerName: "عميل جديد",
      isNewCaller: true,
      cartCount: 2,
      isDelivery: true,
      addressReady: true,
      deliveryQuoteReady: true,
    })).toEqual([]);
  });

  it("rejects mojibake in every source file rendered by the invoice route", () => {
    const files = [
      "CallCenterPOS.tsx",
      "CallCenterWorkspace.tsx",
      "CustomerProfileDrawer.tsx",
      "services/callCenterService.ts",
      "customerFlow.ts",
    ];
    const mojibake = /(?:ط[§¹ھ¨]|ظ[„…ٹپ†]|╪|â€”|â‚|Ã|Ø|Ù)/u;
    for (const file of files) {
      const source = readFileSync(resolve(__dirname, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(source, file).not.toMatch(mojibake);
    }
  });

  it("validates feedback interaction and delivery-only speed", () => {
    const draft = feedbackDraftFrom();
    expect(feedbackValidationMessage(draft, "delivery")).toContain("اختر");
    draft.food_quality = 5;
    draft.service_quality = 4;
    expect(feedbackValidationMessage(draft, "takeaway")).toBeNull();
    expect(feedbackValidationMessage(draft, "delivery")).not.toBeNull();
    draft.delivery_speed = 3;
    expect(feedbackValidationMessage(draft, "delivery")).toBeNull();
  });

  it("loads existing feedback and builds canonical create/update payloads", () => {
    const existing = feedbackDraftFrom({
      id: 1, order_id: 2, customer_id: 3, food_quality: 4, service_quality: 5,
      delivery_speed: 2, notes: "  متابعة  ", recorded_by: 9, created_at: "", updated_at: "",
    });
    expect(existing).toMatchObject({ food_quality: 4, service_quality: 5, delivery_speed: 2 });
    expect(feedbackPayload(existing, "delivery")).toMatchObject({ delivery_speed: 2, notes: "متابعة" });
    expect(feedbackPayload(existing, "takeaway").delivery_speed).toBeNull();
  });
});
