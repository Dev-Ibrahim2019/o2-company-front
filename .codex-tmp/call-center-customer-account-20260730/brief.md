# Call-center customer, account, address and payment tab

## Objective

Update the real `/call-center/pos` “بيانات الزبون والحساب” tab to match the cashier `CustomerTab` visually and functionally where appropriate, while adapting all semantics to call-center customers and adding complete delivery-address selection/editing.

## References

- User-provided cashier component:
  `C:\Users\LT\.codex\attachments\1203ee8c-06a8-4bd5-bc24-8e3659d1db2a\pasted-text.txt`
- Cashier reference:
  `src/components/POS/CustomerTab.tsx`
- Call-center targets:
  - `src/components/call-center/CallCenterPOS.tsx`
  - `src/components/call-center/CallCenterWorkspace.tsx`
  - `src/components/call-center/services/callCenterService.ts`
  - `src/hooks/useCallCenterCart.ts`
  - `src/services/callCenterOrderWorkflow.ts`

## Visual requirements

Use the cashier CustomerTab hierarchy and tokens:

- Dark 24–32px rounded panel with responsive padding.
- Centered/max-width content sections.
- Customer section, address section, financial-account section and split-payment section.
- Responsive one/two-column forms.
- Slate raised inputs, white/5 borders, O2 red focus rings.
- Search result dropdown, selected-entity cards, payment progress and method cards.

## Customer section

- Search manually by name, phone or code through real call-center APIs.
- Select an existing customer and keep it linked to the order.
- Display/edit name and phone appropriately.
- Display type, classification/status and default/selected address where available.
- New caller remains inline and never blocks menu/cart.
- For a new caller include name, phone, customer type, city, area, address line, nearest landmark and delivery instructions.
- Customer is created transactionally at save, using the existing call-center workflow.

## Address section

For existing customers:

- Fetch real saved addresses.
- Select an address with a clear selected state.
- Show label, city, area/district, street/address, building/floor/apartment when available, landmark and delivery notes.
- Permit adding/editing through existing address endpoints only if the current contracts safely support it.
- Selection must update `selectedAddress`, delivery quote and saved order snapshot.

For new callers:

- Controlled inline city, area, address line, landmark and delivery notes.
- Do not require address for takeaway.
- Delivery must be blocked until a valid address and delivery quote exist.

## Financial account

- Visually match cashier account section.
- Keep the invoice customer distinct from the entity bearing a payment.
- Search/select customer, employee or supplier account through real APIs/payment-method metadata.
- Show balance, credit limit/status where real data exists.
- Never fabricate financial values.
- Block invalid/inactive/blocked entity account payments according to existing backend rules.

## Payment registry

- Match cashier “إتمام الدفع / Split & Payment Registry” visual design.
- Remaining amount 24px mono; progress bar 12px.
- Two payment-method columns mobile, four at sm.
- Real `/payment-methods` only: cash/card/wallet/bank/customer/employee/supplier as supported.
- Registry rows must include method, amount, required reference, entity/subledger and removal/editing.
- Use call-center payment state/workflow only, never cashier `useCart`.

## Architecture/safety

- Prefer a dedicated `CallCenterCustomerAccountTab` presentation/adapter.
- Do not import cashier `CustomerTab`, cashier `useCart`, tables, halls, POS session/register or cashier submission logic.
- Preserve all dirty user work and existing customer side panel.
- Avoid duplicating payment controls in both cart and customer tab: define a single authoritative payment state (`payments` in CallCenterPOS) and share it by props. It is acceptable for the cart to retain a compact summary/actions while full editing is in this tab.
- No backend change unless existing APIs cannot support the requested safe behavior.

## Validation

- TypeScript.
- Focused frontend tests for existing-customer selection/address selection, new caller address fields, takeaway address optionality, delivery blocker and payment registry calculations/reference/entity behavior.
- Existing frontend suite.
- Production build if environment permits.
- Forbidden-import audit.
- Browser only if a supported authenticated session exists.

## Output

Modify the real application in place. Do not change cashier behavior.
