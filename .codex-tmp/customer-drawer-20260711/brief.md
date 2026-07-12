# Customer Quick View / Profile Drawer Brief

## Objective
Refactor the Arabic call-center customer workflow so opening a full customer profile never navigates away from or clears the active POS invoice/cart. Fix the permission failure encountered when completing an order using the intended operational completion API.

## Audience
Arabic RTL call-center operators handling live customer calls and active delivery invoices.

## Visual direction
Preserve the existing dark slate/red RestoMaster POS system. The quick preview stays centered and compact. The full profile becomes a clearly layered right-side operational drawer: 35vw on desktop (sensible min/max), full width on small screens, `right-0`, entering from `translate-x-full`, with restrained smooth motion. The invoice remains visible on the left. Semantic status badges: emerald active, red blocked, amber VIP. Open complaint counts pulse red when nonzero.

## Required workflow
- Quick preview loads profile, shows colored active/blocked/VIP badges and blinking complaint count.
- Clicking “عرض الملف الكامل” closes only the central modal and opens the right drawer without navigation or remounting POS/cart.
- Drawer controlled with `isOpen`, `onClose`, `customerId` props and appropriate callbacks.
- Tabs focus on addresses, latest 5 orders, and permanent notes; existing extra tabs may remain if useful.
- Load data lazily/safely with skeletons and visible errors.
- Address selection sets the current delivery address and closes drawer.
- Repeat order fetches order details and copies valid items into the active invoice/cart, then closes drawer.
- Selecting customer binds customer_id immediately, closes overlay, and focuses the menu search input.
- Preserve cart/invoice state; do not navigate or clear state. Use stable callbacks/memoization where it materially prevents child churn.

## Backend/API
- Add `GET /api/customers/{customer}/full-profile` (or a compatible call-center scoped alias) returning customer, addresses, last five orders with items, and permanent notes.
- Fix order completion permission flow using least privilege: call-center delivery completion should use `/orders/{id}/complete`; do not require financial invoice-closing permissions for operational completion.

## Relevant files
- src/components/CallCenter/CustomerQuickPreview.tsx
- src/components/CallCenter/CustomerProfileDrawer.tsx
- src/components/CallCenter/CustomerPhoneSearch.tsx
- src/components/POS/pos.tsx
- src/services/callCenterService.ts
- src/hooks/useCallCenter.ts
- Backend routes/api.php, CallCenterController/Service, permissions as needed.

## Output
Modify existing frontend and backend application files in place. No external images.

## Verification
TypeScript, PHP syntax, routes, relevant tests, and browser/visual evaluation where feasible.
