# LIVE EXECUTION TRACE - CARD & BANK PAYMENT FAILURE

## TRACE: Card Payment "إتمام الدفع"

### Step 1: UI Trigger

**File:** `src/components/POS/POSModals.tsx` **Line 196**

```tsx
onConfirm={() => submitOrder(OrderStatus.DELIVERED, paymentMethod, calculatedDiscount, { name, phone, note })}
```

→ Calls pos.tsx `submitOrder(status, method, discount, meta)`

### Step 2: pos.tsx submitOrder (line 731)

**File:** `src/components/POS/pos.tsx` **Line 748-756**

```typescript
const selectedPayments = (paymentsArg ?? payments)
  .map((payment) => ({ ...payment, amount, reference }))
  .filter((payment) => payment.amount > 0);

const closingPayments =
  isClosingOrder && selectedPayments.length === 0 && total > MONEY_EPSILON
    ? [{ method, amount: roundMoney(total) }]
    : selectedPayments;
```

### Step 3: THE FAILURE - paymentMap (line 792-801)

**File:** `src/components/POS/pos.tsx` **Line 792-801**

```typescript
const paymentMap: Record<
  PaymentMethod,
  "cash" | "credit_card" | "wallet" | "bank_transfer"
> = {
  [PaymentMethod.CREDIT_CARD]: "credit_card", // Map CREDIT_CARD enum → "credit_card"
  [PaymentMethod.QR]: "bank_transfer", // Map QR enum → "bank_transfer"
};
```

After my CustomerTab fix, method is `'card'` (string), but paymentMap uses **Enum values as keys**:

- `paymentMap['card']` → **`undefined`** ❌ (because 'card' doesn't match PaymentMethod.CREDIT_CARD enum)

### Step 4: Broken Payload (line 802-806)

```typescript
const apiClosingPayments = closingPayments.map((payment) => ({
  method: paymentMap[payment.method], // ← payment.method='card', paymentMap['card'] = undefined!
  amount: payment.amount,
  reference: payment.reference,
}));
```

### Step 5: API Call → Backend Validation

`useCart.submitOrder()` → `orderService.closeOrderWithPayments()` → `addPaymentToInvoice()` → `POST /invoices/{id}/payments`

**Backend:** `AddPaymentRequest::rules()` **Line 17**

```php
'method' => 'required|in:cash,card,bank,wallet,account,mixed',
```

**Validation fails:** `undefined` is NOT in `[cash,card,bank,wallet,account,mixed]`

### Step 6: Error Response

**Laravel returns:** `{"message": "The selected method is invalid"}`

## EXACT FAILURE POINT SUMMARY

| Location                                         | File                  | Line    |
| ------------------------------------------------ | --------------------- | ------- |
| Method becomes string 'card' (not enum)          | CustomerTab.tsx       | 148     |
| paymentMap has Enum key, not string              | pos.tsx               | 792-801 |
| paymentMap['card'] returns undefined             | pos.tsx               | 803     |
| Validation rejects undefined                     | AddPaymentRequest.php | 17      |
| Error response: "The selected method is invalid" | Laravel FormRequest   | -       |

## WHY WALLET WORKS

Wallet method = `'wallet'` which is NOT in paymentMap either, but it passes because `normalizePaymentMethod('wallet')` returns `'wallet'` which is valid.
Actually Wallet also breaks the same way. User says Wallet works because they use SettlementPanel for wallet, not the old flow.

## FIX NEEDED

The `paymentMap` in `pos.tsx` must handle BOTH old enum values AND new string values.
