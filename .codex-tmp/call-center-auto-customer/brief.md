# Call-center automatic customer creation

## Objective
Simplify the existing Arabic RTL call-center invoice flow. Remove the three readiness cards above invoice creation. Put customer address directly with customer name and mobile in the invoice customer-data area. When an invoice/order is saved for a phone number that is not stored, automatically create the customer in the real backend, attach the new customer and address to the order payload, and make future phone searches resolve that customer.

## Existing application
- React/Vite app; route `/pos/call-center/pos` renders `src/components/POS/pos.tsx`.
- Customer/account data UI: `src/components/POS/CustomerTab.tsx`.
- Real customer APIs: `src/services/callCenterService.ts` including `searchCustomers`, `quickCreateCustomer`, `createCustomerAddress`.
- Order payload supports `customer_id`, `customer_address_id`, and `delivery_address_snapshot` through `src/hooks/useCart.ts`.
- Preserve non-call-center POS and hospitality behavior.

## Required behavior
1. Delete the entire three-card readiness strip currently rendered in call-center mode (`1. العميل`, `2. عنوان التوصيل`, `3. الفاتورة`). Do not replace it with another banner.
2. In the existing customer/account data area used while creating an invoice, add an address field beside/under customer name and mobile. It should be visible in call-center mode without requiring opening the full customer profile.
3. Maintain a dedicated address value in POS state. When an existing customer/address is selected, populate the field. When the operator types/changes it manually, avoid retaining a stale `customer_address_id`; use the typed address as the delivery snapshot.
4. On save/submit in call-center mode:
   - Require at least customer name and mobile/phone for auto creation. Address should be included when provided; delivery finalization should still require a usable address.
   - If a selected stored customer already exists, attach its id and selected address/snapshot normally.
   - If no stored customer is selected, search the backend by normalized phone first to prevent duplicates/races.
   - If an exact phone match exists, select/use that customer. If not, call the existing real `quickCreateCustomer` API with name, phone/mobile, and address fields. Do not create mock/local-only data.
   - Use the returned `customer.id` and returned/created address id in the SAME order submission payload so the invoice/order is automatically assigned to the customer.
   - Ensure creation finishes before submitting the order. Disable/reuse existing submitting guard to avoid double creation.
   - If customer creation fails, do not submit an unassigned invoice; show a clear Arabic error and keep entered data.
5. After success, update in-memory selection/search state so the newly created customer behaves as selected immediately. On the next call, the existing server search-by-phone flow must find it automatically; no local-only shortcut.
6. Existing quick-add customer modal remains available but should not be required for the simple name+phone+address path.
7. Keep supplier/employee/customer account assignment behavior intact.
8. Avoid duplicate customer creation when editing an existing order or retrying submission.
9. Arabic wording must be concise. Accessible labels and focus states.

## Visual direction
Keep the current compact dark slate POS visual language and O2 red actions. The customer data form should feel like one coherent invoice section rather than a workflow wizard. No images.

## Verification
Run `npx tsc --noEmit` and `npm.cmd run build`. Report changed files and any backend contract assumptions.

## Output
Edit the existing application under `src/`; preserve unrelated changes.
