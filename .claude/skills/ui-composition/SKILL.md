---
name: ui-composition
description: Composes production-grade React interfaces from existing design-system primitives. Use when creating pages, dashboards, CRM screens, admin panels, forms, tables, settings, detail views, list views, modals, and responsive layouts. Plans information hierarchy, page anatomy, layout regions, component composition, density, responsive behavior, RTL, and UI states before coding.
---

---

# UI Composition

## Purpose

Build complete interfaces by composing existing design-system primitives into clear, coherent page structures.

This skill is responsible for:

- Page anatomy
- Information hierarchy
- Layout composition
- Component placement
- Content density
- Responsive composition
- RTL composition
- Data-heavy screen structure
- Dashboard composition
- Form composition
- Detail-page composition
- Modal and drawer composition
- Loading / empty / error states
- Navigation relationships
- Action hierarchy

The goal is not merely to make individual components look good.

The goal is to make the **entire page feel intentionally designed**.

---

# Core Principle

## Compose by hierarchy, not by components.

Do not start with:

> "I need a Card, Button, Table and Input."

Start with:

> "What is the user trying to accomplish on this page?"

Then construct the interface around that task.

A good composition should answer:

1. What page is this?
2. What is the user's primary task?
3. What information matters most?
4. What action should the user take?
5. What information should be visible immediately?
6. What can be secondary or collapsed?
7. What should happen on smaller screens?
8. What happens during loading, empty, error and success states?

---

# Before Coding

Before creating a new page, inspect the existing application.

Look for:

- Existing app shell
- Sidebar
- Header / topbar
- Navigation
- Breadcrumbs
- Page containers
- Existing page headers
- Existing cards
- Existing tables
- Existing forms
- Existing modals
- Existing drawers / sheets
- Existing tabs
- Existing filters
- Existing pagination
- Existing loading states
- Existing empty states
- Existing error states
- Existing responsive patterns
- Existing RTL patterns
- Existing route structure
- Existing reusable components

Prefer existing patterns over introducing new ones.

Do not create a second version of something the project already has.

---

# Composition Workflow

Use this sequence when building a page:

```text
Understand the task
      ↓
Inspect existing application patterns
      ↓
Identify page type
      ↓
Define information hierarchy
      ↓
Create page anatomy
      ↓
Compose layout
      ↓
Place existing primitives
      ↓
Add responsive behavior
      ↓
Add RTL behavior
      ↓
Add loading / empty / error states
      ↓
Connect data and actions
      ↓
Review visual hierarchy
      ↓
Refine
```

Do not begin with visual polish.

First create the structural composition.

---

# Page Anatomy

A typical CRM/admin page can follow this structure:

```text
App Shell
│
├── Sidebar / Navigation
│
├── Topbar
│
└── Main Content
    │
    ├── Breadcrumb
    │
    ├── Page Header
    │   ├── Title
    │   ├── Description
    │   └── Primary Action
    │
    ├── Summary / KPI Layer
    │
    ├── Toolbar
    │   ├── Search
    │   ├── Filters
    │   ├── Sort
    │   ├── View Switcher
    │   └── Actions
    │
    ├── Main Content
    │
    └── Supporting Content
```

Not every page needs every section.

Only include sections that support the user's task.

---

# 1. Application Shell

The application shell should establish the persistent structure of the application.

Typical structure:

```text
┌─────────────────────────────────────────────┐
│                  Topbar                     │
├───────────────┬─────────────────────────────┤
│               │                             │
│   Sidebar     │       Main Content          │
│               │                             │
│               │                             │
└───────────────┴─────────────────────────────┘
```

Respect the project's existing sidebar convention.

Do not redesign the global shell when implementing an individual page unless explicitly requested.

---

# 2. Content Container

Pages should have a consistent content width and horizontal rhythm.

Use the project's existing container utilities whenever available.

Avoid arbitrary widths unless necessary.

Prefer:

```text
Page
 └── Content Container
      ├── Header
      ├── Summary
      ├── Toolbar
      └── Content
```

Maintain consistent:

- Horizontal padding
- Vertical spacing
- Section spacing
- Maximum content width
- Grid gaps

The page should feel like one system.

---

# 3. Breadcrumb

Use breadcrumbs when:

- The page is nested
- The application has hierarchical navigation
- The user needs orientation
- The page belongs to a detail/edit workflow

Example:

```text
الرئيسية / العملاء / تفاصيل العميل
```

Do not use breadcrumbs simply because they look good.

They should provide orientation.

---

# 4. Page Header

The page header establishes the page's purpose.

Typical structure:

```text
Title
Description
Primary Action
```

Example:

```text
إدارة العملاء
متابعة العملاء والطلبات والتواصل معهم

                         + إضافة عميل
```

Rules:

- Use one clear primary action.
- Avoid competing primary buttons.
- Keep secondary actions visually quieter.
- Do not fill the header with unnecessary controls.
- Keep title and description close together.
- Put actions near the title unless the project's pattern says otherwise.

---

# Primary vs Secondary Actions

Every important page should have an intentional action hierarchy.

Use:

```text
Primary
Secondary
Tertiary
Destructive
```

Example:

```text
+ إضافة عميل       ← Primary

تصدير
استيراد            ← Secondary

المزيد ⋮           ← Tertiary

حذف                 ← Destructive
```

Do not make every button visually prominent.

If everything is primary, nothing is primary.

---

# 5. KPI / Summary Layer

Use summary cards when the page benefits from high-level information.

Example:

```text
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ العملاء    │ │ الجدد      │ │ قيد المتابعة│ │ متأخرون    │
│ 1,284       │ │ 124        │ │ 86         │ │ 21         │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

Rules:

- Show only useful metrics.
- Prioritize actionable metrics.
- Avoid decorative KPIs.
- Keep card structure consistent.
- Use semantic states intentionally.
- Do not turn every number into a card.

For dense CRM interfaces, KPI sections should remain compact.

---

# 6. Toolbar

The toolbar controls the main dataset or content.

Typical structure:

```text
Search
Filters
Sort
View
Bulk Actions
More Actions
```

Example:

```text
┌──────────────────────┐
│ 🔍 بحث عن عميل...    │
└──────────────────────┘

[ الحالة ] [ الفرع ] [ التاريخ ] [ ترتيب ]

                                      [تصدير]
```

Rules:

- Search should be easy to find.
- Filters should be grouped together.
- Destructive actions should not be mixed casually with normal filters.
- Bulk actions should appear when records are selected.
- Avoid excessive toolbar controls.
- On mobile, allow controls to collapse into a filter sheet/drawer.

---

# 7. Main Content

The main content should represent the user's primary task.

Possible patterns:

- Data table
- Cards
- Kanban
- Timeline
- Form
- Detail panel
- Chart
- Calendar
- Activity feed
- Mixed dashboard
- Workflow

Choose the pattern based on the information.

Do not force everything into cards.

---

# Avoid Card Soup

A common failure pattern is:

```text
Card
 ├── Card
 │    └── Card
 │
 ├── Card
 │    └── Card
 │
 └── Card
```

Avoid unnecessary nested cards.

Use visual grouping through:

- Spacing
- Dividers
- Background surfaces
- Typography
- Borders
- Section headers

A section does not always need a card.

---

# Page Type: List / Index

Typical structure:

```text
Page Header
    ↓
Summary
    ↓
Toolbar
    ↓
Data Table / List
    ↓
Pagination
```

Example CRM:

```text
إدارة العملاء
        ↓
[ إجمالي العملاء ][ العملاء الجدد ][ المتأخرون ]
        ↓
[ بحث ] [ الحالة ] [ الفرع ] [ التاريخ ]
        ↓
┌────────────────────────────────────────────┐
│ العميل │ الهاتف │ الحالة │ المسؤول │ ... │
├────────────────────────────────────────────┤
│ ...                                        │
└────────────────────────────────────────────┘
        ↓
Pagination
```

The table should dominate the page because it represents the primary task.

---

# Page Type: Detail

Typical structure:

```text
Breadcrumb
    ↓
Entity Header
    ↓
Status / Important Actions
    ↓
Key Information
    ↓
Tabs / Sections
    ↓
Activity / Related Records
```

Example:

```text
العملاء / أحمد محمد

┌─────────────────────────────────────────────┐
│ أحمد محمد                         [نشط]     │
│ عميل منذ 2025                    [تعديل]    │
└─────────────────────────────────────────────┘

[ معلومات العميل ] [ الطلبات ] [ النشاط ]

┌─────────────────────────────────────────────┐
│ معلومات أساسية                              │
│ الهاتف     البريد     الفرع     المسؤول     │
└─────────────────────────────────────────────┘
```

Prioritize identity and status before secondary information.

---

# Page Type: Create / Edit Form

Typical structure:

```text
Page Header
    ↓
Form Sections
    ↓
Validation
    ↓
Actions
```

Group fields according to user intent.

Example:

```text
معلومات أساسية
────────────────────────
الاسم
الهاتف
البريد الإلكتروني

معلومات العمل
────────────────────────
الفرع
المسؤول
الحالة

ملاحظات
────────────────────────
...
```

Do not create a separate card for every field.

---

# Long Forms

For long forms:

- Group related fields.
- Use multiple columns on desktop when appropriate.
- Collapse to one column on mobile.
- Keep labels close to fields.
- Keep validation near the relevant field.
- Use sticky actions when the form is long enough to justify it.

Example:

```text
Desktop:

┌──────────────────┬──────────────────┐
│ الاسم             │ الهاتف           │
├──────────────────┼──────────────────┤
│ البريد            │ الفرع            │
└──────────────────┴──────────────────┘
```

Mobile:

```text
الاسم
────────────

الهاتف
────────────

البريد
────────────

الفرع
────────────
```

---

# Page Type: Dashboard

A dashboard should answer:

> "What is happening, and what should I do?"

Recommended composition:

```text
Page Header
    ↓
KPI Summary
    ↓
Primary Trend / Analytics
    ↓
Operational Insights
    ↓
Recent Activity / Data
```

Possible structure:

```text
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Revenue │ │ Orders  │ │ Clients │ │ Issues  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘

┌──────────────────────────────┐
│ Revenue / Orders Trend       │
│                              │
│           Chart              │
└──────────────────────────────┘

┌──────────────────┐ ┌─────────────────────┐
│ Alerts / Issues  │ │ Recent Activity     │
└──────────────────┘ └─────────────────────┘
```

Charts must communicate useful information.

Do not add charts only to make the dashboard look impressive.

---

# Page Type: Settings

Settings pages should prioritize discoverability.

Possible structure:

```text
Settings
│
├── General
├── Account
├── Notifications
├── Permissions
├── Appearance
└── Integrations
```

Use tabs or a settings navigation pattern when there are many categories.

Keep individual settings sections visually distinct without excessive cards.

---

# Page Type: Workflow / Operations

Operational screens should optimize for speed.

Prioritize:

- Current status
- Current task
- Important actions
- Exceptions
- Pending work
- Recent activity

Reduce unnecessary decorative content.

CRM/POS/admin users often interact with these screens repeatedly.

Optimize for repeated use.

---

# Data-Heavy Interfaces

For tables and data management screens, composition usually follows:

```text
Context
    ↓
Search
    ↓
Filters
    ↓
Selection
    ↓
Data
    ↓
Pagination
```

Important capabilities may include:

- Search
- Filters
- Sorting
- Pagination
- Column visibility
- Bulk selection
- Bulk actions
- Export
- Import
- Row actions
- Status indicators

Do not expose every possible control by default.

Prioritize the most common actions.

---

# Table Composition

A table page should maintain strong hierarchy:

```text
Page Header
        ↓
Toolbar
        ↓
Table
        ↓
Pagination
```

Avoid:

```text
Header
KPI
Large promotional banner
Multiple decorative cards
Huge empty spacing
Toolbar
Small table
```

If the user's primary task is managing records, the records should receive the majority of the visual attention.

---

# Responsive Composition

Responsive design is not simply:

> "Make everything smaller."

Instead, change the composition based on available space.

---

## Desktop

Use:

- Sidebar
- Multi-column layouts
- Dense tables
- Horizontal toolbars
- Expanded filters
- Side-by-side form fields

---

## Tablet

Consider:

- Reduced columns
- Compact toolbar
- Collapsible secondary controls
- Smaller content gaps
- Reduced sidebar width

---

## Mobile

Prefer:

- Single-column layout
- Stacked sections
- Collapsible filters
- Bottom sheets / drawers
- Horizontal scrolling for complex tables
- Condensed actions
- Touch-friendly controls

Do not simply shrink desktop layouts.

---

# Mobile Priority

When space is limited, preserve:

1. Page identity
2. Primary action
3. Important information
4. Search
5. Critical filters
6. Main content

Move secondary controls into:

- More menu
- Filter drawer
- Sheet
- Collapsible section

---

# RTL Composition

The project uses Arabic RTL.

Composition must respect RTL at the layout level.

Use:

```css
direction: rtl;
```

and logical CSS properties where appropriate:

```css
margin-inline
padding-inline
inset-inline
border-inline
text-align: start
```

Avoid hardcoding:

```css
margin-left
margin-right
left
right
```

unless the behavior is intentionally directional.

---

# RTL Action Ordering

Do not blindly reverse every control.

Consider the meaning of the action.

Example:

```text
[ حفظ ] [ إلغاء ]
```

The project's established convention should determine the actual visual ordering.

Be consistent across screens.

---

# Technical Values

Some values should remain LTR even inside RTL interfaces.

Examples:

- Phone numbers
- URLs
- Email addresses
- IDs
- Account numbers
- Technical codes
- Dates where the project requires a fixed format

Use:

```html
dir="ltr"
```

or the project's existing `.ltr` utility.

---

# Grid Composition

Use CSS Grid for structured layouts.

Example:

```tsx
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
```

Use:

- `grid-cols-1` for mobile
- `md:grid-cols-*` for tablet
- `lg` / `xl` for larger layouts

Do not create overly complex breakpoint logic unless necessary.

---

# Flex Composition

Use Flexbox for:

- Toolbars
- Header actions
- Button groups
- Navigation
- Inline metadata
- Simple horizontal/vertical relationships

Example:

```tsx
<div className="flex items-center justify-between gap-3">
```

Use Grid when the relationship is fundamentally two-dimensional.

---

# Spacing Hierarchy

Spacing should communicate relationships.

Use smaller spacing for:

```text
Label
Field
```

Medium spacing for:

```text
Field
Field
```

Larger spacing for:

```text
Section
Section
```

Largest spacing for:

```text
Page Header
Main Content
```

Do not use identical spacing everywhere.

---

# Visual Rhythm

A page should have predictable rhythm:

```text
Page Header
     ↓
small gap
     ↓
Summary
     ↓
medium gap
     ↓
Toolbar
     ↓
small gap
     ↓
Main Content
```

Avoid random spacing decisions.

---

# Tabs

Use tabs when multiple related views share the same context.

Good:

```text
العميل

[المعلومات] [الطلبات] [النشاط] [المدفوعات]
```

Avoid tabs when the sections are actually separate workflows.

Use navigation instead.

---

# Modal vs Page

Use a modal/dialog when:

- The task is short.
- The user needs the current page context.
- The task has a small number of fields.
- The task is clearly isolated.

Use a page when:

- The workflow is complex.
- Many fields are required.
- The task needs navigation.
- The user needs significant context.
- The form is long.

---

# Drawer / Sheet

Use a drawer/sheet when:

- Filters need to be accessible on mobile.
- Secondary details should appear without leaving context.
- A compact workflow can happen beside the main content.

Example:

```text
Mobile:

[ Filters ]

┌─────────────────────┐
│ Filter Sheet        │
│                     │
│ Status              │
│ Branch              │
│ Date                │
│                     │
│ [Apply]             │
└─────────────────────┘
```

---

# Loading States

Every data-driven page should have an intentional loading state.

Prefer:

- Skeletons for content-heavy areas
- Spinner for small localized actions
- Disabled button + progress indicator for submissions

Avoid blank screens.

Do not show a giant spinner when only one table is loading.

---

# Empty States

An empty state should explain:

1. What is empty?
2. Why might it be empty?
3. What can the user do next?

Example:

```text
لا يوجد عملاء

لم تتم إضافة أي عملاء حتى الآن.

[ + إضافة عميل ]
```

Avoid empty states that only say:

```text
No data
```

---

# Error States

Errors should be localized.

If the table failed:

```text
تعذر تحميل العملاء

حدث خطأ أثناء تحميل البيانات.

[ إعادة المحاولة ]
```

Do not replace the entire page with an error if only one section failed.

---

# Permission States

If the user cannot perform an action:

- Hide actions only when appropriate.
- Disable when discoverability matters.
- Explain permission limitations when useful.

Example:

```text
ليس لديك صلاحية تعديل هذا السجل.
```

Do not create confusing dead-end UI.

---

# Success Feedback

Use appropriate feedback:

- Toast
- Inline success message
- Status update
- Redirect
- Updated data

Do not show a success message if the interface already clearly reflects the successful operation.

Avoid excessive notifications.

---

# URL State

For data-management pages, consider keeping these in URL state when useful:

- Search
- Filters
- Sort
- Pagination
- Selected view

Benefits:

- Bookmarkable
- Shareable
- Back-button friendly
- Preserves context

Do not put transient UI state into the URL unnecessarily.

---

# Component Boundaries

Do not build the entire page inside one enormous component.

Prefer:

```text
CustomersPage
├── CustomersPageHeader
├── CustomerStats
├── CustomerToolbar
├── CustomerTable
├── CustomerPagination
└── CustomerDialogs
```

But also avoid over-fragmentation.

Do not create:

```text
CustomerTitle
CustomerDescription
CustomerTitleWrapper
CustomerHeaderLeft
CustomerHeaderRight
```

unless those pieces are genuinely reusable or complex.

---

# Composition Before Polish

Build the page in two passes.

## Pass 1 — Structural

Focus on:

- Layout
- Hierarchy
- Sections
- Components
- Data placement
- Responsive structure

Ignore minor visual details.

Think:

> "Is this page organized correctly?"

---

## Pass 2 — Visual

Then refine:

- Typography
- Spacing
- Borders
- Shadows
- Colors
- Icons
- Hover states
- Transitions
- Density

Think:

> "Does this page feel polished and consistent?"

---

# Consistency Rule

Before introducing a new visual pattern, inspect nearby screens.

Ask:

- Does the project already solve this?
- Is there an existing component?
- Is there an existing spacing pattern?
- Is there an existing table pattern?
- Is there an existing page header?
- Is there an existing modal?
- Is there an existing filter toolbar?

Reuse first.

Create new patterns only when necessary.

---

# Design Reference Adaptation

When the user provides a screenshot or external design reference:

Do not copy the design blindly.

Extract:

- Layout hierarchy
- Section relationships
- Density
- Spacing rhythm
- Card structure
- Navigation pattern
- Toolbar composition
- Information hierarchy
- Responsive behavior

Then adapt those ideas to the project's existing design system.

The project's tokens remain the source of truth.

---

# Avoid These Patterns

Do not create:

- Giant unnecessary hero sections
- Excessive gradients
- Excessive glassmorphism
- Huge rounded cards everywhere
- Excessive shadows
- Random colors
- Multiple competing primary actions
- Decorative charts with no purpose
- Excessive whitespace in CRM screens
- Nested card structures
- Huge typography for admin interfaces
- Desktop-only layouts
- Fixed widths that break mobile
- Directionally incorrect RTL layouts

---

# CRM Density

CRM interfaces are operational tools.

They should generally prioritize:

- Information density
- Scanability
- Clear statuses
- Fast actions
- Searchability
- Filtering
- Keyboard/mouse efficiency
- Predictable layout
- Low cognitive load

Do not turn a CRM screen into a marketing landing page.

---

# Visual Hierarchy Review

After composing a page, ask:

### Level 1

Can I immediately identify:

- Page title
- Current context
- Primary action

### Level 2

Can I quickly find:

- Important metrics
- Search
- Filters
- Main content

### Level 3

Can I access:

- Secondary actions
- Metadata
- Supporting information

### Level 4

Are:

- Decorative elements
- Secondary details
- Rare actions

appropriately de-emphasized?

---

# Final Composition Checklist

Before considering a page complete:

## Structure

- [ ] Page has a clear purpose.
- [ ] Information hierarchy is obvious.
- [ ] Main content matches the primary task.
- [ ] Sections are grouped logically.
- [ ] No unnecessary nested cards.

## Actions

- [ ] One clear primary action exists where appropriate.
- [ ] Secondary actions are visually quieter.
- [ ] Destructive actions are clearly differentiated.
- [ ] Actions are close to the content they affect.

## Data

- [ ] Search is easy to find when needed.
- [ ] Filters are organized.
- [ ] Sorting is available when useful.
- [ ] Pagination exists when required.
- [ ] Bulk actions are handled appropriately.

## Responsive

- [ ] Desktop layout is intentional.
- [ ] Tablet layout is intentional.
- [ ] Mobile layout is intentionally composed.
- [ ] Controls do not overflow.
- [ ] Tables have a mobile strategy.
- [ ] Modals/forms work on small screens.

## RTL

- [ ] Layout follows RTL.
- [ ] Logical properties are used.
- [ ] Text alignment is intentional.
- [ ] Technical values can use LTR.
- [ ] Action ordering is consistent.

## States

- [ ] Loading state exists.
- [ ] Empty state exists.
- [ ] Error state exists.
- [ ] Success feedback exists where necessary.
- [ ] Permission restrictions are handled.

## Consistency

- [ ] Existing project components are reused.
- [ ] Existing design tokens are respected.
- [ ] Existing page patterns are respected.
- [ ] No unnecessary global CSS changes were introduced.

---

# Golden Rule

Do not ask:

> "Which components should I put on this page?"

Ask:

> "What is the clearest and fastest way for the user to accomplish the task?"

Then compose the page around that answer.
