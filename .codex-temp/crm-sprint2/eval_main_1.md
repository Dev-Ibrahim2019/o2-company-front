# Evaluation — Attempt 1

## Overall Verdict: MAJOR REVISION

## Overall Assessment

The CRM is aiming for a calm, operational workspace and its slate/teal system, compact directory, and dark Customer 360 identity band are a coherent response to that direction. However, it cannot presently serve one of the brief's stated audiences: call-center users are rejected by the enclosing admin role guard before the CRM permission guard can run. The live authenticated CRM could not be rendered in this environment, so visual findings are based on the implemented React structure and responsive CSS; `npx tsc --noEmit` passes.

## Scores

| Criterion | Score | Status | Weight | Notes |
|-----------|-------|--------|--------|-------|
| Design Quality | 2/3 | PASS | HIGH | The restrained ink, teal, white-panel system is consistent, and the 360 identity band gives the feature a clear focal point. The generic tab payload layout weakens the intended polished, operational hierarchy. |
| Originality | 2/3 | PASS | HIGH | The identity band combines code, status, contact, branch, and operational counts in a specific CRM composition rather than using a stock hero. The remaining dashboard and table patterns are conventional but appropriate. |
| Craft | 1/3 | PASS | MEDIUM | RTL, focus outlines, table overflow, compact chips, and breakpoint rules are present. At the same time, the parent admin padding plus CRM page padding creates excessive nested gutters, and raw endpoint keys/values make the customer sections visually inconsistent and often non-Arabic. |
| Functionality | 0/3 | FAIL | MEDIUM | The CRM routes sit inside `RoleGuard(ADMIN_ROLES)`, whose roles exclude `CALL_CENTER`; a call-center agent with `crm.access` cannot reach the feature. This directly fails the stated audience/access requirement. The required lazy-loaded tabs are also not code-split. |

## What's Working Well

- The Customer 360 identity band is the strongest element: it puts the name, code, status, contact, branch, orders, and complaints in one scan-friendly persistent area without inflating it into a marketing-style hero.
- The directory is intentionally dense but readable: its search/status/category toolbar, six-column table, quiet status chips, and visible pagination match the operational use case.
- The feature includes Arabic empty/loading/error/forbidden states and visible `:focus-visible` treatment. Financial navigation and its nested routes are conditionally rendered, so the financial requests are not initiated for users without the financial permission.

## Issues Found

### Issue 1: Call-center users are blocked before CRM permissions are evaluated

- **What**: `/admin/crm` is nested inside `RoleGuard` with only super-admin, accountant, and branch-manager roles. `CALL_CENTER` is excluded, even though the immediate `CrmRouteGuard` checks `crm.access`.
- **Where**: `src/App.tsx`, the admin route tree around the CRM routes; `ADMIN_ROLES` near the top of the file.
- **Why it matters**: A call-center manager or agent cannot use the new CRM even when the backend grants the required CRM permission. This is a complete access failure for a named target audience, not a cosmetic edge case.
- **Suggested fix**: Place CRM routes behind authenticated access plus `CrmRouteGuard` independently of the admin role-only subtree, or include the intended call-center role(s) in the route gate while preserving the permission check as the source of truth.

### Issue 2: Customer tabs render arbitrary API objects as raw key/value tiles

- **What**: Every tab except the composite notes/financial layouts sends `unknown` through `DataView`, which exposes scalar `Object.entries` with keys converted only from snake_case to spaces. Endpoint-specific labels, Arabic localization, date/currency formatting, ordering, linked records, and safe field selection are absent.
- **Where**: `src/features/crm/Customer360Page.tsx`, `DataView`, `Section`, and the tab routes.
- **Why it matters**: Real CRM data will read like an API inspector rather than a production Arabic workspace; field order changes with responses and the visual hierarchy disappears. It also undermines the brief's request for stable contracts/adapters.
- **Suggested fix**: Define typed adapters and dedicated presentational views for overview, orders, addresses, complaints, notes/occasions, and financial data. Map approved fields to Arabic labels, format dates/money/numbers, and use tables or semantic detail rows where appropriate.

### Issue 3: The “lazy-loaded tabs” requirement is only data-lazy, not code-lazy

- **What**: Tab content waits to fetch until mounted, but all tab components live in `Customer360Page.tsx` and are imported in the initial CRM bundle; there is no `React.lazy`, `lazy()`, or `Suspense` boundary.
- **Where**: `src/features/crm/Customer360Page.tsx`.
- **Why it matters**: The requested lazy tab architecture is unfulfilled and the Customer 360 route carries code for financial and other sections before the user needs them.
- **Suggested fix**: Split each tab into a route component loaded with `React.lazy`, wrap the outlet in a localized `Suspense` state, and retain the existing permission conditional so the financial module cannot load for unauthorized users.

### Issue 4: CRM content is visually double-contained by the parent administration shell

- **What**: The administration layout applies `p-4 md:p-6` to the content container while `.crm-page` adds another `clamp(18px, 4vw, 48px)` inset. The CRM header and background therefore sit as an inset application inside an already padded application surface.
- **Where**: `src/components/administration/Layout.tsx` main content wrapper and `src/features/crm/crm.css` (`.crm-page`, `.crm-header`).
- **Why it matters**: On desktop and tablet this reduces usable table width and makes the dedicated CRM shell feel disconnected from the existing administration chrome, especially alongside the sidebar.
- **Suggested fix**: Give CRM a full-bleed layout slot in the admin shell, or remove/reduce the CRM-level outer gutters when it is rendered under that shell. Keep the inner page padding once, not twice.

## Priority Fixes for Next Attempt

1. Make `/admin/crm` reachable for every intended role based on `crm.access`, including call-center users, then verify both permitted and forbidden paths.
2. Replace the generic `unknown`/`Object.entries` tab renderer with typed, Arabic, endpoint-specific CRM views and formatting.
3. Code-split the Customer 360 tabs and reconcile the CRM shell spacing with the parent administration layout at 1440px, 768px, and 375px.

## Should the next attempt REFINE or PIVOT?

REFINE. The visual direction and the Customer 360 identity band are sound; the next attempt should preserve them while correcting the access architecture and replacing generic data dumps with deliberate CRM presentations.
