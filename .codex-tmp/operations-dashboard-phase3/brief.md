# Operations Dashboard MVP Brief

Objective: Build a production React/TypeScript page for Arabic RTL operational monitoring, for supervisors tracking orders and operational staff. Output path: `src/components/operations/OperationsDashboard.tsx`, plus small colocated helpers/components if useful, and `src/services/operationsService.ts`.

Aesthetic: dense but calm mission-control interface matching the existing slate-950/red O2 admin system. Strong hierarchy, compact cards, crisp operational badges, no decorative imagery, no external assets, use existing lucide-react and Tailwind utilities. Memorable element: a horizontally scannable live KPI rail and stage board with visible timers/risk badges.

Structure:
- RTL header: title, description, branch filter, date input default today, refresh.
- 8 KPI cards: active, late, waiting assembly, ready delivery, out for delivery, available drivers, busy drivers, avg delivery.
- Tabs: orders execution, staff performance, delivery fleet, alerts.
- Orders board uses cards in five columns: processing, ready delivery, out, delivered, cancelled. Cards show customer, branch, total, items count, timers, driver/vehicle, late badge. Clicking opens a lightweight details modal/drawer.
- Staff cards only operational roles, filters for role/alerts/active.
- Fleet cards grouped/filtered with vehicle labels and current order.
- Alerts list severity and linked order/employee where possible.
- Loading, error, empty states and responsive mobile layout.

Data contract: use `operationsService.getDashboard({branch_id,date})` against GET `/operations/dashboard`. Response contains `{kpis, orders, staff_summary, fleet_summary, alerts, branches?}`. Define robust types and tolerate missing optional metrics.

Helpers: central stage mapping and thresholds: ready wait >5 warning; delivery >30 warning, >45 critical; active total >60 late. Do not duplicate constants.

Constraints: no CRUD, no HR changes, no accounting, no heavy dependencies, no drag/drop, do not rewrite AssemblerDashboard. Integrate with existing app conventions. Do not edit App.tsx or layouts; root agent handles routing/sidebar.
