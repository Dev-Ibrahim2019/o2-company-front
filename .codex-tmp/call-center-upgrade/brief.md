# Call Center Invoice Flow Upgrade

## Objective
Upgrade the existing React/Vite call-center POS flow into a fast, professional Arabic RTL invoice workflow for restaurant call-center agents. Integrate into the current application; do not create a standalone mockup.

## Target audience
Arabic-speaking call-center agents who must identify a caller, pick a delivery address, repeat past orders, add products rapidly, and safely finalize a delivery invoice under time pressure.

## Existing architecture and entry points
- Main route: `src/App.tsx`, `/pos/call-center/pos` renders `src/components/POS/pos.tsx`.
- Existing dark RTL visual system: Tailwind classes in POS and CallCenter components.
- Existing APIs/types: `src/services/callCenterService.ts`.
- Existing customer components: `src/components/CallCenter/CustomerPhoneSearch.tsx`, `CustomerQuickPreview.tsx`, `QuickCustomerForm.tsx`, `CustomerProfileDrawer.tsx`.
- Existing order/menu/cart: `src/components/POS/pos.tsx`, `MenuGrid.tsx`, `POSHeader.tsx`, `CartPanel.tsx`, `src/services/useMenu.ts`, `src/hooks/useCart.ts`.
- Existing delivery employee administration: `src/components/CallCenter/CallCenterEmployees.tsx`.
- Research found no transport fee CRUD API and no loyalty wallet/ledger API. Do not invent network endpoints or persist fake financial transactions.

## Required functional scope
1. Preserve category navigation, items within categories, automatic discounts, entity/account selection, and quick item by item number.
2. Improve the call-center customer selection area so the selected customer and selected delivery address are always visible and changeable before delivery submission. The delivery address must be unmistakable.
3. Add visible keyboard-shortcut affordances for customer/account/profile and quick item entry, reusing current shortcuts and adding safe ones where appropriate.
4. Redesign `QuickCustomerForm` into two clearly labelled sections:
   - Delivery essentials: name, primary phone, alternate phone, city/area, address details, landmark/delivery notes.
   - Marketing & care: email, birthday, wedding date, children birthday(s), preferences/notes.
   Use existing customer create API fields. After customer creation, use the existing occasions API to create wedding/children occasions where data is provided. Fail occasion creation gracefully without losing the customer.
5. Improve quick preview: keep phone, previous orders, open complaints, city/address, select customer, and full profile actions. Ensure wording is correct Arabic and the selected address can be established in the order flow.
6. Customer full profile drawer:
   - Overview must NOT show total purchases, total orders, or average order.
   - Keep open complaints, cancelled orders, loyalty points.
   - Prominently show the most frequently ordered item/order from favorites.
   - Previous orders show exactly the latest five and each can be repeated reliably. Fix repeat so it fetches full order details before invoking the repeat callback; show per-row loading/error feedback.
   - Addresses support home/work labels, selecting an address, and adding a new address via existing APIs. Prefer selecting the newly created address.
   - Occasions continue to list/add/delete.
   - Loyalty section presents balance and marketing ideas safely. Redemption may prepare/apply an order discount only if clearly labelled as provisional; do not claim points were debited. Add a compact notice that wallet top-up/redemption ledger needs backend activation. No fake persistence.
7. Transport/delivery:
   - Since there is no transport CRUD API, add a professional in-flow delivery method/fee selector only if it can be represented safely in the current order note/totals without corrupting accounting. Otherwise add a clearly disabled feature card or configuration notice in the appropriate call-center UI. Do not invent endpoints.
   - Treat delivery fleet/vehicle administration as already available through delivery employees; improve navigation/label only if a small safe change.
8. Preserve entity assignment to customer/supplier/employee in `CustomerTab`; make it easier to access from call-center mode and label it as invoice account.
9. Validate call-center delivery completion: selected customer and selected address should be required for delivery orders, with clear inline/toast guidance. Do not break non-call-center POS or hospitality.
10. Keep responsive desktop/mobile behavior and RTL accessibility: dialogs labelled, keyboard Escape, focus-visible states, buttons at least comfortably clickable.

## Aesthetic direction
Operational dark command-center UI: slate/charcoal foundation, restrained O2 red as the primary action, amber only for attention, emerald for confirmed delivery/address states. Dense but calm. Use clear cards and compact pills, avoid excessive rounded cards or gradients.

## Typography
Use the project font stack. Strong Arabic hierarchy: heavy 13–16px operational titles, readable 11–13px labels/body. Avoid tiny unreadable essential text.

## Memorable interaction
After choosing a caller, the screen should visibly lock into a three-part readiness state: customer chosen, delivery address chosen, order ready. The operator should know the missing step at a glance.

## Images
No images required. Use existing Lucide icons only.

## Output
Edit the existing application under `src/`. Keep changes focused and production-grade. Do not overwrite unrelated user changes. Run `npx tsc --noEmit` and `npm run build`; fix errors caused by the work.

## Reporting
List changed files, implemented requirements, and explicit backend dependencies left for transport CRUD and loyalty ledger.
