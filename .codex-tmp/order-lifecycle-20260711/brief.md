# Design / Implementation Brief

## Objective
Implement a production-grade order lifecycle in the existing React/TypeScript POS orders experience, linking call center, payment, kitchen/assembler, delivery, and closed orders. Fix invoice detail modal edit and cancellation actions.

## Target audience
Arabic RTL restaurant call-center cashiers, kitchen assemblers, and delivery coordinators.

## Existing design direction
Preserve the current dark slate POS interface, rounded cards/modals, dense operational typography, Arabic RTL labels, and semantic status colors. Use orange for pending payment, blue for preparation, yellow for out-for-delivery, emerald for delivered, red for cancelled.

## Content and interactions
- Canonical lifecycle: PENDING_PAYMENT -> PREPARATION -> OUT_FOR_DELIVERY -> DELIVERED.
- Adapt canonical lifecycle to the backend's current legacy statuses without breaking existing API responses.
- Payment confirmation requires a non-empty transaction/reference id and records paid_at; it must dispatch to preparation, not close the order.
- Assembly requires all items prepared and a driver identifier; records assembled_at.
- Final delivery only from out-for-delivery; records delivered_at and moves order to closed.
- Provide total lead time utility delivered_at - created_at.
- Invoice details modal must open the existing OrderEditModal directly. Successful save updates/refetches and returns reliably.
- Cancellation modal requires a reason and should call a compatible cancellation service with a safe fallback between supported API routes.
- Error messages must be visible in Arabic and transitions must reject skipped stages client-side. Backend remains authoritative.
- Maintain existing responsive behavior; no new images or external assets.

## Relevant files
- src/services/orderService.ts
- src/hooks/useOrders.ts
- src/components/POS/Orders.tsx
- src/components/orders/OrderEditModal.tsx
- src/components/POS/AssemblerDashboard.tsx
- src/components/POS/pos.tsx and src/hooks/useCart.ts only if necessary to prevent accidental confirmation during edits.

## Output path
Modify the existing application in place under src/.

## Verification
Run npx tsc --noEmit, npm run build, and focused browser verification if the app/backend permits.
