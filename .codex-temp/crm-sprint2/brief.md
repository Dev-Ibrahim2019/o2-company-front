# CRM Sprint 2 Frontend Brief

## Objective

Implement a production-grade Arabic RTL CRM feature inside the existing React 18 + TypeScript administration application. Target users are admins, branch managers, call-center managers/agents, and accountants. Do not modify backend code.

## Existing application references

- Router: `src/App.tsx`
- Admin navigation/layout: `src/components/administration/Layout.tsx`
- Auth and permissions: `src/auth/AuthContext.tsx`, `src/auth/permissions.ts`, `src/auth/Can.tsx`
- Axios client: `src/api/axios.ts`
- Existing customer type: `src/types/customer.ts`
- Existing visual system: `src/index.css` and administration components

## Backend contracts

- `GET /crm/dashboard`
- `GET /crm/customers`
- `GET /crm/customers/{id}`
- `GET /crm/customers/{id}/overview`
- `GET /crm/customers/{id}/orders`
- `GET /crm/customers/{id}/addresses`
- `GET /crm/customers/{id}/complaints`
- `GET /crm/customers/{id}/notes`
- `GET /crm/customers/{id}/occasions`
- `GET /crm/customers/{id}/financial-summary`
- `GET /crm/customers/{id}/statement`
- `GET /crm/customers/{id}/aging`

Axios base URL already includes `/api`.

## Required feature structure

Create a feature-oriented structure under `src/features/crm/` with:

- API service and stable TypeScript contracts/adapters.
- Permission-aware route guard.
- CRM shell/navigation.
- Dashboard page with real data only, branch/date filters, loading/empty/error/forbidden states.
- Customer directory with URL-backed search/status/category/pagination filters.
- Standalone Customer 360 page, not a modal.
- Lazy-loaded tabs: Overview, Orders, Addresses, Complaints, Notes & Occasions, Financial.
- Hide Financial navigation and avoid its request without `crm.view-customer-financial`.
- Sensitive content is trusted only when omitted by backend; UI must not infer or preview it.
- Friendly Arabic error messages for 401/403/404/409/422/500.

Integrate routes under:

- `/admin/crm`
- `/admin/crm/customers`
- `/admin/crm/customers/:customerId`

Add an admin navigation entry visible only with `crm.access`. Keep `/admin/customers` unchanged as the legacy accounting customer screen.

## Aesthetic direction

Calm, operational CRM workspace: slate/ink foundation, restrained teal accent, warm amber only for attention states. Avoid excessive card grids and gradients. Use the current system font and existing Tailwind utility conventions. Clear dense-but-readable tables, a persistent profile identity band, and quiet status chips.

## Content hierarchy

1. CRM shell header with title and concise section navigation.
2. Dashboard: compact KPI strip, operational summary, filters.
3. Directory: search/filter toolbar, responsive table, pagination.
4. Customer 360: identity band first, then tab navigation and independently loaded content.

## Memorable element

A strong Customer 360 identity band that combines customer name/code, primary contact, branch, status, and key operational counts without becoming a large hero banner.

## Responsive and accessibility

- Arabic RTL.
- Desktop and tablet first; reasonable small-screen stacking.
- Visible keyboard focus, labeled controls, sufficient contrast.
- Do not rely on color alone.
- Loading, empty, error, forbidden, not-found states.

## Constraints

- No mock data.
- No loyalty ledger UI; legacy points may appear read-only in Overview only when returned.
- No new test framework.
- Do not delete or rewrite legacy customer, call-center, POS, or finance components.
- Keep changes scoped to CRM feature, router, permissions constants, and admin navigation.
- Output path is the existing application source tree.
