---
name: v0-generation-workflow
description: Guides Claude Code through a v0-inspired frontend generation workflow. Use when building new React pages, dashboards, CRM screens, admin interfaces, UI components, or complete frontend features. Requires understanding the existing codebase and design system first, then planning, composing a first implementation quickly, validating it visually and functionally, and iterating toward a polished production-ready result.
---

---

# V0 Generation Workflow

## Purpose

Use a structured, iterative workflow for building frontend interfaces.

The objective is not:

> Generate code as quickly as possible.

The objective is:

> Reach a high-quality production interface through fast, deliberate iterations.

The workflow is:

```text
Understand
    ↓
Inspect
    ↓
Plan
    ↓
Compose
    ↓
Implement
    ↓
Validate
    ↓
Review
    ↓
Iterate
    ↓
Polish
    ↓
Integrate
```

Never skip directly from the user's request to large amounts of code without understanding the existing application.

---

# Core Philosophy

Treat frontend generation as an iterative design-and-engineering process.

A good implementation should:

- Fit the existing application
- Reuse existing primitives
- Follow the existing design system
- Match existing navigation and layout
- Work with real data structures
- Support responsive behavior
- Support RTL when required
- Handle loading/empty/error states
- Be visually coherent
- Be production-oriented

Do not optimize for code volume.

Optimize for:

- User experience
- Visual quality
- Consistency
- Maintainability
- Correctness

---

# Phase 1 — Understand the Request

Before touching code, identify:

### What is being requested?

Examples:

- New page
- Existing page redesign
- Dashboard
- CRM module
- Table
- Form
- Detail page
- Modal
- Workflow
- Navigation
- Responsive improvement
- Visual redesign

### Who uses it?

Examples:

- Admin
- Manager
- Employee
- Sales representative
- Accountant
- Customer support agent

### What is the primary task?

Examples:

```text
Create customer
Search customer
Review customer
Process order
Approve request
View financial report
Manage employees
Track operations
```

The primary task determines the composition.

---

# Phase 2 — Inspect the Codebase

Before implementing, inspect the relevant project structure.

Look for:

```text
package.json
src/
app/
pages/
components/
layouts/
routes/
hooks/
lib/
services/
styles/
public/
```

Also inspect:

- Existing routes
- Existing layout
- Existing sidebar
- Existing header
- Existing UI components
- Existing forms
- Existing tables
- Existing dialogs
- Existing API layer
- Existing state management
- Existing design tokens
- Existing CSS
- Existing Tailwind configuration

Do not assume the architecture.

Discover it.

---

# Inspect Before Creating

If the project already contains:

```text
Button
Input
Card
Dialog
Table
Badge
Tabs
Dropdown
Select
Form
PageHeader
DataTable
```

reuse them.

Do not create replacements without a reason.

---

# Inspect Similar Screens

When creating a new screen, find the closest existing screen.

For example:

```text
New Customers Page
        ↓
Inspect existing Employees Page
        ↓
Inspect existing Orders Page
        ↓
Inspect existing List Page
        ↓
Extract common patterns
        ↓
Create Customers Page
```

This keeps the application visually consistent.

---

# Phase 3 — Determine Page Type

Classify the requested interface.

Possible types:

```text
Dashboard
List
Detail
Create
Edit
Settings
Analytics
Workflow
Operations
Authentication
Modal
Drawer
Landing
```

The page type determines the composition strategy.

---

# Phase 4 — Define the User Flow

Before implementation, mentally simulate the user journey.

Example:

```text
Open Customers
      ↓
See summary
      ↓
Search customer
      ↓
Apply filter
      ↓
Open customer
      ↓
Review details
      ↓
Edit
      ↓
Save
      ↓
Receive feedback
```

Every major UI element should support this flow.

Remove elements that do not.

---

# Phase 5 — Build the Information Hierarchy

Define:

### Primary

What must be seen immediately?

### Secondary

What supports the main task?

### Tertiary

What is useful but not essential?

### Hidden / Progressive

What should appear only when needed?

Example:

```text
PRIMARY
Page title
Main data
Primary action

SECONDARY
Filters
Summary metrics
Status

TERTIARY
Metadata
Secondary actions

PROGRESSIVE
Advanced filters
Rare actions
Additional details
```

This prevents clutter.

---

# Phase 6 — Create a Structural Plan

Before writing detailed components, define the page anatomy.

Example:

```text
CustomersPage
│
├── PageHeader
│   ├── Breadcrumb
│   ├── Title
│   ├── Description
│   └── AddCustomerButton
│
├── CustomerStats
│
├── CustomerToolbar
│   ├── Search
│   ├── Filters
│   └── Actions
│
├── CustomerTable
│
├── Pagination
│
└── CustomerDialogs
```

This is the "wireframe in code" stage.

Focus on structure before polish.

---

# Phase 7 — Establish the Visual Direction

Use the existing design system first.

Respect:

- Existing colors
- Typography
- Spacing
- Border radius
- Shadows
- Surfaces
- Dark/light mode
- RTL
- Existing component style

For this project, existing O2 design tokens and CSS variables are authoritative.

Do not invent another visual system.

---

# Design References

If the user provides a screenshot or reference design:

Do not reproduce it literally.

Extract:

```text
Layout
Spacing
Hierarchy
Density
Component relationships
Navigation
Card treatment
Typography scale
Interaction patterns
```

Then translate those ideas into the project's own design language.

---

# Phase 8 — Implement the First Draft

Build the first working version quickly.

The first draft should establish:

- Correct page structure
- Correct components
- Correct content hierarchy
- Correct routes
- Correct basic interactions
- Correct responsive skeleton
- Correct data structure

Do not spend excessive time polishing tiny details before the structure works.

---

# First Draft Rules

The first implementation should be:

### Complete enough to evaluate

It should show the entire page.

Avoid building only:

```text
Header
```

and stopping.

Prefer:

```text
Header
+
Summary
+
Toolbar
+
Main Content
+
States
```

even if the first version is visually rough.

---

# Build Realistic Content

Avoid unrealistic placeholder content such as:

```text
Lorem ipsum
John Doe
123456
Test User
```

when the project has a known domain.

For a CRM use realistic examples:

```text
أحمد محمد
شركة النور العقارية
عميل محتمل
قيد المتابعة
```

Use realistic data shapes.

This makes visual evaluation meaningful.

---

# Phase 9 — Validate Functionality

After the first implementation, verify:

- Route works
- Page renders
- Components load
- No obvious runtime errors
- Interactions work
- Forms behave correctly
- Filters behave correctly
- Dialogs open/close
- Buttons perform intended actions
- Data loading works
- Responsive layout does not break

Do not call a UI complete simply because it compiles.

---

# Phase 10 — Visual Review

After functionality works, review the interface visually.

Evaluate:

### Hierarchy

Can the user immediately identify:

- Where they are?
- What the page does?
- What the primary action is?

### Density

Is the page:

- Too empty?
- Too crowded?
- Appropriate for the workflow?

### Alignment

Check:

- Headers
- Cards
- Tables
- Inputs
- Buttons
- Grid columns
- Section boundaries

### Consistency

Compare with nearby screens.

Ask:

> Does this look like it belongs to the same application?

---

# Visual Iteration Loop

Use this loop:

```text
Implement
   ↓
Inspect
   ↓
Find visual problems
   ↓
Fix highest-impact problem
   ↓
Inspect again
   ↓
Repeat
```

Do not attempt to perfect everything simultaneously.

---

# Fix Priority

When reviewing the interface, fix problems in this order:

```text
1. Broken layout
2. Incorrect hierarchy
3. Incorrect spacing
4. Responsive problems
5. RTL problems
6. Inconsistent components
7. Typography
8. Colors
9. Borders / shadows
10. Micro-interactions
```

Structural problems matter more than decorative details.

---

# Visual Quality Questions

Ask:

### Does the page have a focal point?

The user should know where to look first.

### Are sections clearly related?

Related information should visually belong together.

### Is there too much visual noise?

Reduce unnecessary:

- Borders
- Shadows
- Colors
- Icons
- Badges
- Cards

### Is whitespace intentional?

Whitespace should separate concepts, not simply consume space.

---

# Iteration Strategy

Never make random visual changes.

Each iteration should target a specific problem.

Bad:

> Make it more beautiful.

Good:

> Reduce excessive vertical spacing between the toolbar and table, strengthen the table header hierarchy, and make secondary actions less visually dominant.

---

# Iteration Passes

Use multiple focused passes.

## Pass 1 — Structure

Fix:

- Layout
- Sections
- Component placement
- Widths
- Heights

---

## Pass 2 — Hierarchy

Fix:

- Typography
- Primary action
- Section emphasis
- Visual weight

---

## Pass 3 — Density

Fix:

- Excessive whitespace
- Overcrowding
- Table density
- Form density
- Card size

---

## Pass 4 — Responsive

Check:

- Desktop
- Tablet
- Mobile

Fix:

- Overflow
- Stacking
- Hidden controls
- Table behavior
- Toolbar behavior
- Dialog behavior

---

## Pass 5 — RTL

Check:

- Direction
- Alignment
- Icons
- Action ordering
- Sidebar
- Tables
- Forms
- Technical values

---

## Pass 6 — States

Check:

- Loading
- Skeleton
- Empty
- Error
- Success
- Disabled
- Permission denied

---

## Pass 7 — Polish

Only now refine:

- Hover
- Focus
- Shadows
- Borders
- Transitions
- Icons
- Micro-interactions

---

# Do Not Over-Iterate

Iteration should improve the interface.

Do not continuously change working components without evidence.

Stop when:

- The structure is correct.
- Visual hierarchy is clear.
- Responsive behavior works.
- States are handled.
- Design system is respected.
- The page matches surrounding screens.
- There are no obvious usability problems.

---

# Preserve Existing Functionality

When redesigning an existing screen:

**Do not break existing behavior.**

Before modifying it, identify:

- Existing actions
- Existing API calls
- Existing state
- Existing permissions
- Existing URL parameters
- Existing filters
- Existing forms
- Existing business rules

The redesign should improve the interface without accidentally removing functionality.

---

# Separate UI From Business Logic

Avoid putting complex business logic directly into presentation components.

Prefer:

```text
Page
 ↓
UI Components
 ↓
Hooks / Services
 ↓
API
```

For example:

```text
CustomersPage
 ├── CustomerToolbar
 ├── CustomerTable
 └── CustomerDialogs

useCustomers()
customerService()
API
```

Keep UI composition understandable.

---

# Data Integration

Do not design around fake data if real APIs already exist.

Inspect:

- API services
- Types
- DTOs
- Hooks
- Existing queries
- Existing mutations

Use the project's existing data-fetching architecture.

Do not introduce a new state/data library without a clear reason.

---

# Progressive Enhancement

Start with the essential experience.

Then add:

```text
Basic page
    ↓
Search
    ↓
Filters
    ↓
Sorting
    ↓
Bulk actions
    ↓
Advanced interactions
```

Do not overload the initial interface.

---

# Responsive-First Thinking

While implementing desktop, continuously ask:

> What happens when this width disappears?

Examples:

### Toolbar

Desktop:

```text
Search | Filters | Sort | Export | Add
```

Mobile:

```text
Search
[Filters] [More]
```

### Table

Desktop:

```text
Name | Phone | Status | Branch | Owner | Actions
```

Mobile:

```text
Name
Status
Owner

...
```

or use a deliberate horizontal-scroll strategy.

Do not allow accidental overflow.

---

# RTL-First Thinking

For Arabic applications, do not build an LTR interface and flip it at the end.

Think RTL during composition.

Consider:

- Sidebar
- Header
- Navigation
- Grid
- Tables
- Forms
- Icons
- Action groups
- Breadcrumbs
- Directional arrows

Use logical CSS properties.

---

# Component Reuse Strategy

Prefer:

```text
Existing component
        ↓
Configure it
        ↓
Compose it
        ↓
Extend only if needed
        ↓
Create new component only when necessary
```

Avoid:

```text
New screen
 ↓
New Button
 ↓
New Card
 ↓
New Modal
 ↓
New Table
```

when those components already exist.

---

# New Component Rule

Create a new component when:

- Existing component cannot reasonably support the requirement.
- The new component has a clear responsibility.
- The component will simplify the page.
- The component is likely reusable.
- The existing abstraction would become more complicated by forcing the new behavior into it.

Do not create abstractions prematurely.

---

# Error Recovery

If implementation encounters an error:

1. Identify the actual root cause.
2. Fix the smallest relevant layer.
3. Re-run validation.
4. Continue the workflow.

Do not rewrite large sections of the application to solve a local problem.

---

# Avoid "Big Bang" Changes

Do not modify:

```text
Global CSS
+
Layout
+
Routing
+
Components
+
API
+
State
```

all at once unless absolutely necessary.

Prefer small, understandable changes.

This makes iteration safer.

---

# Prompt Interpretation

When the user says:

> "Make it like this screenshot."

Interpret it as:

```text
Extract design language
        ↓
Identify layout
        ↓
Identify hierarchy
        ↓
Identify interaction patterns
        ↓
Adapt to project
```

Not:

```text
Copy screenshot literally
```

---

# When User Says "Make It Professional"

Do not interpret "professional" as:

- More gradients
- More shadows
- More animations
- More cards
- Larger text
- More colors

Instead interpret it as:

- Better hierarchy
- Consistency
- Appropriate density
- Clear actions
- Strong typography
- Correct spacing
- Good responsive behavior
- Good states
- Accessibility
- Predictable interactions

---

# When User Says "Make It Like v0"

Interpret this as a workflow and quality target:

```text
Fast initial implementation
+
Strong visual hierarchy
+
Modern component composition
+
Responsive behavior
+
Design-system consistency
+
Iterative refinement
+
Production-quality result
```

Do not claim access to proprietary/internal v0 implementation details.

Use documented/publicly observable patterns.

---

# Definition of Done

A frontend task is not complete merely because:

```text
npm run build
```

passes.

A task is complete when:

### Structure

- [ ] Correct page anatomy
- [ ] Clear hierarchy
- [ ] Correct navigation context

### Design

- [ ] Existing design system followed
- [ ] Typography consistent
- [ ] Spacing consistent
- [ ] Colors semantic
- [ ] Components consistent

### UX

- [ ] Primary action clear
- [ ] User flow obvious
- [ ] No unnecessary complexity
- [ ] Feedback exists

### Responsive

- [ ] Desktop works
- [ ] Tablet works
- [ ] Mobile works
- [ ] No unintended overflow

### RTL

- [ ] Arabic direction works
- [ ] Alignment works
- [ ] Technical LTR values handled
- [ ] Icons/actions make sense

### States

- [ ] Loading
- [ ] Empty
- [ ] Error
- [ ] Success
- [ ] Disabled
- [ ] Permission states where relevant

### Engineering

- [ ] Existing architecture respected
- [ ] Existing components reused
- [ ] Business logic preserved
- [ ] No unnecessary dependencies
- [ ] No unnecessary global CSS changes
- [ ] No obvious runtime errors

---

# Final Workflow

For every substantial frontend task, follow:

```text
1. Understand the request
2. Inspect the existing codebase
3. Find similar existing screens
4. Identify the page type
5. Understand the user flow
6. Define information hierarchy
7. Create structural composition
8. Reuse design-system primitives
9. Implement the first complete draft
10. Validate functionality
11. Review visual hierarchy
12. Fix structural problems
13. Fix responsive behavior
14. Fix RTL behavior
15. Implement UI states
16. Polish interactions
17. Compare against existing screens
18. Verify production readiness
```

---

# Golden Rule

Do not try to produce the perfect interface in one pass.

Produce a **complete first version quickly**, inspect it critically, and then improve it through deliberate iterations.

The quality comes from:

```text
Good structure
+
Good design system
+
Fast implementation
+
Critical review
+
Focused iteration
```

not from generating more code.
