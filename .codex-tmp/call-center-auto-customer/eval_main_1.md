# Evaluation — Attempt 1

## Overall Verdict: MAJOR REVISION

## Overall Assessment
The customer fields now read as one compact, coherent invoice section, and the former three-card readiness strip is no longer rendered. However, the core persistence flow is not safe enough to ship: manually edited addresses can be paired with an unrelated stored address ID, rapid submits can race into duplicate creation, and the print/save path bypasses automatic customer resolution entirely.

## Scores
| Criterion | Score | Status | Weight | Notes |
|-----------|-------|--------|--------|-------|
| Design Quality | 2/3 | PASS | HIGH | The address field is integrated into the existing dark-slate customer form with the same spacing, controls, and O2-red focus language; the three readiness cards are gone. |
| Originality | 2/3 | PASS | HIGH | The implementation preserves the application-specific customer search/profile workflow and adds the new field in context instead of introducing a generic wizard or replacement readiness banner. |
| Craft | 2/3 | PASS | MEDIUM | RTL layout, responsive one/two-column behavior, `street-address` autocomplete, explicit label association for the address, and existing focus rings are handled cleanly. |
| Functionality | 0/3 | FAIL | MEDIUM | Several primary save scenarios can produce duplicate customers, mismatched address identity, or an unassigned printed order. These are data-integrity failures in the requested core flow. |

## What's Working Well

- The exact three-step readiness-card UI is absent from the call-center render; it was not replaced with another three-step status component.
- `CustomerTab` displays `عنوان التوصيل` directly with name and mobile only in call-center mode, preserving non-call-center form behavior.
- Manual address edits immediately clear `customerAddressId` and update `deliveryAddressSnapshot`, which is the correct state transition before submission.
- The main `submitOrder` flow searches the real call-center API before quick creation, awaits customer resolution, and sends the resolved `customer_id`, address ID/snapshot, and order data through the same `submitOrderApi` call.
- Customer-resolution failure returns before order submission and keeps the entered form values.
- Loading an edited API order restores `customer_id`, `customer_address_id`, and the delivery snapshot, so an untouched existing order does not automatically create a new customer.

## Issues Found

### Issue 1: A manually typed address is rebound to an unrelated stored address ID
- **What**: Manual editing correctly clears `customerAddressId`, but during submission any non-empty address with no ID triggers `getCustomerAddresses()` and assigns the first stored address ID without comparing it to the typed address. The payload can therefore contain `customer_address_id = home` while its snapshot says a newly typed work address.
- **Where**: `src/components/POS/pos.tsx`, call-center resolution in `submitOrder`, around lines 1301–1305; the clearing behavior is around lines 1676–1681.
- **Why it matters**: This violates the explicit stale-ID requirement and can route delivery to the wrong persisted address. It affects both a selected existing customer whose address is edited and an exact phone match found at save time.
- **Suggested fix**: If the operator manually changed the address, keep `customer_address_id` undefined and submit only the typed snapshot, or create a real customer address and use its returned ID. Only reuse an existing ID after normalized address equality or explicit selection.

### Issue 2: The double-submit guard starts after customer creation
- **What**: `submitOrder` checks the hook-level `submitting` value, but that value is only set inside `submitOrderApi`, after the phone search/quick-create work. The newly declared `resolvingCallCenterCustomer` state and ref are unused. Two rapid invocations can both search, both see no exact match, and both call `quickCreateCustomer`.
- **Where**: `src/components/POS/pos.tsx`, declarations around lines 270–271 and `submitOrder` around lines 1246–1294; `src/hooks/useCart.ts` sets `submitting` only when its submit function begins.
- **Why it matters**: This fails the no-duplicate-on-retry/race requirement and creates a real database integrity problem under latency or double-clicking.
- **Suggested fix**: Acquire a synchronous ref lock before any customer lookup/creation, set visible resolving state immediately, and release it in an outer `finally` that covers customer resolution and order submission. Disable all save/close/print actions from this combined busy state.

### Issue 3: The print action bypasses automatic customer creation and assignment
- **What**: `handlePrintInvoice` calls `submitOrderApi` directly with name, phone, and existing address state. It never performs exact phone lookup or `quickCreateCustomer`, and it does not send `customer_id` at all.
- **Where**: `src/components/POS/pos.tsx`, `handlePrintInvoice` around lines 908–946; invoked by the visible `طباعة` action in `CartPanel.tsx` around line 733.
- **Why it matters**: Printing is itself a backend save path. A new caller can be persisted as an unassigned order, directly contradicting “automatically create and assign the saved invoice.”
- **Suggested fix**: Route print through the same customer-resolution helper as normal save, then submit/print the resolved order. Centralize resolution so every call-center persistence entry point shares identical validation and payload construction.

### Issue 4: Phone matching is not fully canonical
- **What**: Save-time normalization strips non-digits and converts only a leading `970` to `0`. It does not canonicalize common equivalents such as `00970…`, and it does not define a stable subscriber-number comparison. A stronger top-level helper exists but is not used here.
- **Where**: `src/components/POS/pos.tsx`, local `normalizePhone` around line 1277; unused `normalizePhoneForMatch` around line 62.
- **Why it matters**: The same person can fail the exact-match check solely because the stored and entered phone formats differ, causing a duplicate quick-create attempt.
- **Suggested fix**: Use one tested canonical phone normalizer for both operands. Cover local `05…`, `+9705…`, `9705…`, and `009705…` representations, reject an empty canonical value, and add focused unit cases.

### Issue 5: Existing-customer address loading can overwrite a newer operator action
- **What**: Selecting a customer starts an unguarded async address fetch. If the operator immediately types an address or selects another customer, the earlier request may later overwrite the current address and ID.
- **Where**: `src/components/POS/pos.tsx`, `handleSelectCustomer` around lines 965–1000.
- **Why it matters**: Under ordinary network latency, a valid typed address or newer selected customer can silently become stale, undermining the “selected existing customers remain safe” requirement.
- **Suggested fix**: Track the requested customer ID/request token and apply results only if it still matches the current selection and the address has not been edited since the request began; alternatively cancel stale requests.

## Priority Fixes for Next Attempt

1. Extract one locked `resolveCallCenterCustomerAndAddress` routine and use it for save, close, editing, and print before any order API call.
2. Preserve address identity correctly: never infer the first stored address ID for manually typed text; compare exactly or create/use a returned address record.
3. Canonicalize phone numbers robustly and guard stale async address responses, then verify double-click, failed-order retry, edited-order, and selected-existing-customer scenarios.

## Should the next attempt REFINE or PIVOT?

REFINE. The visual direction and state model are appropriate, and the main API sequence is close. The next attempt should consolidate and harden persistence behavior rather than redesign the interface.
