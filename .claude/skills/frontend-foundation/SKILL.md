---
name: frontend-foundation
description: Establishes production-grade frontend engineering foundations for React and TypeScript applications. Use when building, modifying, refactoring, or reviewing frontend features, pages, components, layouts, or UI architecture. Enforces project inspection, reuse-first development, component architecture, type safety, maintainability, responsive behavior, and production readiness.
---

---

# Frontend Foundation

## Purpose

Build frontend interfaces as production-grade software, not prototypes.

This skill defines the foundational engineering behavior that must be followed before and during frontend implementation.

The goal is to produce code that is:

- Production-ready
- Maintainable
- Reusable
- Type-safe
- Component-driven
- Responsive
- Accessible
- Consistent
- Easy to extend
- Compatible with the existing project architecture

Do not treat every UI request as an isolated page.

Treat the application as a long-lived product.

---

# 1. First Rule: Inspect Before Building

NEVER immediately start creating components when a frontend task is requested.

Before writing code:

1. Inspect the project structure.
2. Identify the frontend framework.
3. Identify the build tool.
4. Inspect `package.json`.
5. Inspect existing routing.
6. Inspect existing layouts.
7. Inspect existing components.
8. Inspect the design system.
9. Inspect Tailwind configuration.
10. Inspect existing UI primitives.
11. Inspect API/service architecture.
12. Inspect state management.
13. Inspect existing patterns for similar features.

The existing project is the source of truth.

Do not replace existing architecture simply because another approach is more familiar.

---

# 2. Reuse Before Creating

Before creating a new component, search for an existing equivalent.

Priority:

1. Reuse existing component.
2. Extend existing component.
3. Compose existing components.
4. Create a new shared component.
5. Create a feature-specific component only when necessary.

Do not duplicate UI patterns.

Bad:

```text
CustomerButton
EmployeeButton
OrderButton
ProductButton
```

when all of them are the same button behavior.

Prefer:

```text
Button
```

with variants.

---

# 3. Understand the Task Before Coding

Translate every request into:

```text
Business Goal
↓
User Goal
↓
Information Required
↓
Primary Action
↓
Secondary Actions
↓
UI Structure
↓
Data Requirements
↓
States
↓
Implementation
```

Example:

User request:

> Add customer management.

Do NOT immediately create a table.

First determine:

```text
What is a customer?
What information matters?
How are customers searched?
How are customers created?
How are customers edited?
What actions are available?
What statuses exist?
What related data exists?
What permissions exist?
```

---

# 4. Build Around User Workflows

Prefer workflows over isolated UI elements.

A CRM workflow may be:

```text
Search Customer
↓
Select Customer
↓
Inspect Customer
↓
Perform Action
↓
Receive Feedback
```

The UI should optimize this workflow.

Do not optimize for visual decoration.

Optimize for:

- Speed
- Clarity
- Accuracy
- Discoverability
- Low cognitive load

---

# 5. Component Architecture

Use three layers.

## Layer 1 — UI Primitives

Examples:

```text
Button
Input
Label
Badge
Card
Dialog
Select
Tabs
Tooltip
Popover
Dropdown
Checkbox
Switch
Separator
```

These should be reusable and domain-agnostic.

Location:

```text
components/ui/
```

---

## Layer 2 — Shared Application Components

Examples:

```text
PageHeader
PageContainer
SearchInput
FilterBar
DataTable
Pagination
StatusBadge
StatCard
EmptyState
LoadingState
ErrorState
ConfirmDialog
DetailsDrawer
FormSection
```

These contain reusable application patterns.

Location:

```text
components/common/
```

---

## Layer 3 — Feature Components

Examples:

```text
CustomerTable
CustomerFilters
CustomerForm
CustomerDetails
CustomerStats
CustomerActivity
```

These belong to the feature.

Example:

```text
features/
└── customers/
    ├── components/
    ├── pages/
    ├── hooks/
    ├── services/
    ├── schemas/
    └── types/
```

---

# 6. Keep Components Focused

A component should have one primary responsibility.

Avoid giant components containing:

- API calls
- Business logic
- Form logic
- Table rendering
- Modal rendering
- Data transformation
- Navigation
- Permissions

all in one file.

Prefer:

```text
CustomerPage
├── CustomerHeader
├── CustomerStats
├── CustomerFilters
├── CustomerTable
├── CustomerFormModal
└── CustomerDetailsDrawer
```

---

# 7. Separate Responsibilities

Use this flow:

```text
Page
↓
Feature Components
↓
Hooks
↓
Services
↓
API
```

For example:

```text
CustomerPage
↓
useCustomers()
↓
customerService.getCustomers()
↓
api.get("/customers")
```

Do not place raw API requests throughout JSX.

---

# 8. TypeScript First

Use TypeScript for all application code.

Avoid unnecessary:

```ts
any;
```

Prefer:

```ts
unknown;
```

with proper type narrowing when the type is genuinely unknown.

Create domain types.

Example:

```ts
type Customer = {
  id: number;
  name: string;
  phone: string;
  status: CustomerStatus;
};
```

Do not duplicate domain types across multiple files.

---

# 9. Domain Types

Domain entities should have centralized types.

Examples:

```text
Customer
Employee
Order
Product
Branch
Invoice
Account
Transaction
User
Role
Permission
```

Use shared domain types where appropriate.

Avoid creating slightly different versions of the same entity:

```text
Customer
CustomerData
CustomerResponse
CustomerObject
CustomerInfo
```

unless they genuinely represent different structures.

---

# 10. Business Logic Must Be Explicit

Do not hide important business rules inside JSX.

Bad:

```tsx
{
  customer.balance > 700 &&
    customer.status === "active" &&
    user.role !== "viewer" && <Button>...</Button>;
}
```

Prefer domain helpers:

```ts
canCreateOrder(customer, user);
```

or:

```ts
canEditCustomer(customer, permissions);
```

Business rules should be readable and testable.

---

# 11. Styling Architecture

Use the project's established styling system.

If Tailwind is present:

- Prefer Tailwind utilities.
- Reuse existing tokens.
- Reuse existing component variants.
- Avoid arbitrary styling unless necessary.

Do not introduce another styling framework without explicit justification.

Do not mix:

```text
Tailwind
Bootstrap
Material UI
Ant Design
Custom CSS framework
```

without a deliberate architectural reason.

---

# 12. Design Tokens

Never scatter arbitrary colors throughout the application.

Bad:

```tsx
className = "bg-[#1E40AF]";
```

Prefer semantic tokens:

```tsx
className = "bg-primary";
```

or existing project utilities.

Use semantic concepts:

```text
primary
secondary
muted
accent
success
warning
destructive
background
foreground
border
input
ring
```

---

# 13. Responsive by Default

Every component must consider:

```text
Mobile
Tablet
Desktop
Large Desktop
```

Do not implement desktop first and "fix mobile later".

Think about responsive behavior during component design.

Example:

```text
Desktop:
Sidebar + Table + Details

Mobile:
Drawer + Compact Table/List + Details Sheet
```

Responsive behavior must be intentional.

---

# 14. RTL Awareness

When working on an Arabic application:

RTL is a foundational requirement.

Do not treat RTL as a final cosmetic change.

Consider RTL during:

- Layout
- Navigation
- Forms
- Tables
- Icons
- Drawers
- Dialogs
- Breadcrumbs
- Pagination
- Spacing
- Alignment
- Mixed Arabic/English content

Prefer logical CSS properties when appropriate.

---

# 15. Accessibility

Every interactive component must be accessible.

Consider:

- Semantic HTML
- Keyboard navigation
- Focus states
- Labels
- ARIA attributes when necessary
- Color contrast
- Screen-reader semantics

Prefer:

```tsx
<button>
```

over:

```tsx
<div onClick={...}>
```

when the element performs a button action.

---

# 16. Application States

Every asynchronous feature should consider:

```text
Initial
Loading
Success
Empty
Error
Disabled
Refreshing
Submitting
```

Do not build only the successful state.

---

# 17. Loading State

For large page sections:

Prefer skeletons.

For small actions:

Use button-level loading indicators.

Example:

```text
[ حفظ ]
```

becomes:

```text
[ ◌ جارٍ الحفظ... ]
```

Prevent duplicate submissions.

---

# 18. Empty State

Never leave a blank screen when there is no data.

An empty state should explain:

1. What is empty.
2. Why it may be empty.
3. What the user can do.

Example:

```text
لا يوجد عملاء

لم تتم إضافة أي عملاء بعد.

[ + إضافة عميل ]
```

---

# 19. Error State

Errors must be useful to users.

Do not expose raw backend errors.

Bad:

```text
SQLSTATE[42S22]
```

Prefer:

```text
تعذر تحميل البيانات.

يرجى المحاولة مرة أخرى.

[ إعادة المحاولة ]
```

Technical details belong in developer logs.

---

# 20. Forms

Forms should be:

- Typed
- Validated
- Accessible
- Clear
- Recoverable

Prefer:

```text
React Hook Form
+
Zod
```

when these technologies exist in the project.

Every form should handle:

```text
Initial
Editing
Validation
Submitting
Server Error
Success
```

---

# 21. Navigation

Routes should represent business concepts.

Prefer:

```text
/customers
/customers/:id
/orders
/orders/:id
/employees
/accounting
/reports
/settings
```

Avoid routes based on implementation details.

---

# 22. URL State

Use URL parameters for state that should survive refresh or be shareable.

Examples:

```text
?page=2
&search=ahmad
&status=active
&sort=created_at
```

Do not store every filter exclusively in local component state.

---

# 23. Server State vs Client State

Separate them.

Server state:

```text
Customers
Orders
Employees
Invoices
Reports
```

should generally be managed through:

```text
TanStack Query
```

Client state:

```text
Sidebar open
Modal open
Selected row
Temporary UI state
```

can use:

```text
React state
```

or:

```text
Zustand
```

when global state is genuinely needed.

---

# 24. Avoid Unnecessary Global State

Do not put everything into Zustand or Context.

Ask:

> Does more than one distant component need this state?

If not, keep it local.

---

# 25. Data Fetching

Do not fetch data directly inside every component with duplicated logic.

Prefer:

```text
useCustomers()
useOrders()
useEmployees()
useAccounts()
```

Hooks should encapsulate query behavior.

---

# 26. Query Keys

Use predictable query keys.

Example:

```ts
["customers"][("customers", filters)][("customers", customerId)];
```

Do not create inconsistent query key structures.

---

# 27. Mutations

Mutations should handle:

```text
Submit
Loading
Success
Error
Cache Invalidation
Optimistic Updates
```

when appropriate.

After mutation, invalidate or update relevant queries.

---

# 28. Performance

Performance matters, but avoid premature optimization.

Use when justified:

- Lazy loading
- Code splitting
- Pagination
- Debouncing
- Query caching
- Virtualization
- Memoization

Do not add complexity without measurable value.

---

# 29. File Organization

Organize code by feature when the application grows.

Preferred:

```text
src/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
├── services/
├── stores/
├── types/
└── utils/
```

Avoid one giant:

```text
components/
```

containing every component in the entire application.

---

# 30. Naming

Use names that explain intent.

Good:

```text
CustomerDetailsDrawer
CreateCustomerDialog
CustomerStatusBadge
CustomerFilters
CustomerTable
```

Bad:

```text
Box
Data
Thing
Modal2
Component
```

---

# 31. No Premature Abstraction

Do not create a generalized system for a problem that appears once.

First identify repetition.

Then abstract.

Prefer:

```text
Reuse
↓
Observe Pattern
↓
Abstract
```

not:

```text
Imagine Pattern
↓
Create Huge Abstraction
↓
Use Once
```

---

# 32. Avoid Over-Engineering

Do not introduce:

- Extra libraries
- Complex state machines
- Custom frameworks
- Unnecessary abstraction layers
- Large utility systems

unless the project actually benefits from them.

The simplest architecture that satisfies the requirements is preferred.

---

# 33. Dependency Discipline

Before installing a package:

1. Check whether the project already has a solution.
2. Check whether an existing dependency provides the functionality.
3. Check whether the feature can be implemented cleanly without another dependency.
4. Only then add a dependency.

Never install packages merely because they are popular.

---

# 34. Existing Project Is Sacred

When modifying an existing project:

DO NOT:

- Rewrite working infrastructure.
- Replace routing unnecessarily.
- Replace state management unnecessarily.
- Replace the styling system.
- Rename unrelated files.
- Remove existing functionality.
- Change APIs without requirement.

Make the smallest coherent change.

---

# 35. Build Strategy

For every feature:

```text
Inspect
↓
Plan
↓
Implement
↓
Run TypeScript
↓
Run Lint
↓
Run Build
↓
Review UI
↓
Fix
```

Do not declare completion after the code merely compiles visually.

---

# 36. Frontend Task Workflow

When receiving a request, follow this exact process.

## Phase 1 — Understand

Identify:

```text
Goal
Users
Data
Actions
Constraints
```

## Phase 2 — Inspect

Inspect:

```text
Architecture
Components
Routes
Dependencies
Styles
APIs
Similar Features
```

## Phase 3 — Plan

Define:

```text
Page Structure
Component Structure
Data Flow
State
Responsive Behavior
States
Permissions
```

## Phase 4 — Implement

Build using existing patterns.

## Phase 5 — Validate

Check:

```text
TypeScript
Lint
Build
Responsive
RTL
Accessibility
Loading
Empty
Error
```

## Phase 6 — Refine

Remove:

- Duplication
- Unnecessary complexity
- Visual inconsistency
- Dead code

---

# 37. Visual Implementation Rule

When implementing UI from a screenshot, design reference, mockup, or natural-language description:

Do not copy isolated visual details blindly.

Extract the underlying system:

```text
Typography
Spacing
Color
Hierarchy
Component shapes
Density
Layout
Interaction patterns
```

Then reproduce that system consistently across the application.

---

# 38. Screenshot / Reference Rule

If the user provides a visual reference:

First identify:

```text
Layout
Navigation
Grid
Spacing
Typography
Colors
Cards
Tables
Buttons
Forms
States
Responsive behavior
```

Then implement.

Do not immediately code based only on surface appearance.

---

# 39. UI Consistency Rule

When creating a new page:

Compare it against existing pages.

Ask:

```text
Does the header look consistent?
Are buttons consistent?
Are tables consistent?
Are forms consistent?
Are spacing rules consistent?
Are colors consistent?
Are statuses consistent?
```

The application should feel like one product.

---

# 40. Production Definition

A frontend feature is complete only when:

```text
Requirements
    ↓
Architecture
    ↓
Components
    ↓
Data
    ↓
Interactions
    ↓
Loading
    ↓
Empty
    ↓
Error
    ↓
Responsive
    ↓
RTL
    ↓
Accessibility
    ↓
Validation
    ↓
Build
```

A rendered component alone is NOT considered complete.

---

# 41. Final Rule

Think like a senior frontend engineer.

Do not ask:

> "How can I make this screen render?"

Ask:

> "What is the best reusable, maintainable, accessible, responsive, production-ready implementation for this product?"

Optimize for the entire application, not only the current request.

---

# Completion Checklist

Before finishing any frontend task:

- [ ] Inspected existing project architecture.
- [ ] Reused existing components where possible.
- [ ] Followed existing design tokens.
- [ ] Avoided unnecessary dependencies.
- [ ] Used proper TypeScript types.
- [ ] Separated UI from business logic.
- [ ] Considered loading state.
- [ ] Considered empty state.
- [ ] Considered error state.
- [ ] Considered disabled/submitting state.
- [ ] Considered responsive behavior.
- [ ] Considered RTL behavior.
- [ ] Considered accessibility.
- [ ] Checked for duplicated code.
- [ ] Ran appropriate validation.
- [ ] Confirmed the implementation fits the existing application.
