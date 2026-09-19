---
name: shadcn-ui
description: Guides Claude Code in using shadcn/ui as a customizable component foundation for React applications. Use when creating, modifying, composing, or reviewing UI components such as buttons, dialogs, sheets, forms, tables, tabs, dropdowns, command menus, cards, badges, tooltips, and navigation. Prioritizes existing project components, accessibility, design-system consistency, composability, RTL support, responsive behavior, and minimal duplication.
---

---

# shadcn/ui

## Purpose

Use shadcn/ui as a **component foundation**, not as a rigid visual framework.

The goal is to:

- Reuse accessible primitives.
- Compose complex interfaces quickly.
- Keep components customizable.
- Preserve the project's visual identity.
- Avoid duplicate UI implementations.
- Maintain consistency.
- Support RTL.
- Support responsive layouts.
- Keep the codebase maintainable.

The guiding principle is:

> Use shadcn/ui for behavior and structure, then adapt its visual language to the application's design system.

---

# Core Philosophy

shadcn/ui components should be treated as:

```text
Accessible primitives
        +
Composable React components
        +
Project-owned source code
        +
Customizable styling
```

Do not treat shadcn/ui as:

```text
A fixed theme
A black-box component library
A reason to redesign the entire application
```

---

# Before Using shadcn/ui

Inspect the project first.

Look for:

```text
components/ui/
components/
lib/utils
components.json
tailwind configuration
global CSS
design tokens
existing primitives
```

Determine:

- Is shadcn already installed?
- Which components already exist?
- Which components have been customized?
- Which styling conventions are being used?
- Which components are project-specific?

Reuse existing components whenever possible.

---

# Existing Component Priority

When a project already has:

```text
Button
Input
Dialog
Sheet
Card
Table
Badge
Tabs
Select
Dropdown
Tooltip
```

use those components first.

Do not install or recreate another version.

Preferred decision:

```text
Existing project component
        ↓
Can it satisfy the requirement?
        ↓
YES → Reuse it
        ↓
NO
        ↓
Extend it carefully
        ↓
Only then create a new component
```

---

# shadcn Component Categories

Use components according to their responsibility.

## Actions

Use:

- Button
- Button variants
- Dropdown Menu
- Context Menu

For:

- Save
- Edit
- Delete
- Export
- More actions

---

## Overlays

Use:

- Dialog
- Alert Dialog
- Sheet
- Drawer
- Popover

Choose based on task complexity.

---

## Navigation

Use:

- Tabs
- Navigation Menu
- Breadcrumb
- Sidebar patterns

---

## Forms

Use:

- Input
- Textarea
- Select
- Checkbox
- Radio Group
- Switch
- Combobox
- Calendar
- Date Picker
- Form

Integrate with the project's form architecture.

---

## Feedback

Use:

- Toast / Sonner when available
- Alert
- Badge
- Progress
- Skeleton

---

## Data

Use:

- Table
- Data Table patterns
- Pagination
- Command
- Select / Combobox

Do not expect a primitive Table component to solve advanced data management automatically.

---

# Button Strategy

Use semantic button variants.

Typical hierarchy:

```text
Primary
Secondary
Outline
Ghost
Destructive
```

Do not create custom button styles for every screen.

Prefer variants.

Example:

```tsx
<Button>
  إضافة عميل
</Button>

<Button variant="outline">
  تصفية
</Button>

<Button variant="destructive">
  حذف
</Button>
```

The exact appearance should come from the project's design system.

---

# Button Rules

Do not:

- Use destructive styling for normal actions.
- Make every button primary.
- Use icons without clear meaning.
- Create dozens of button variants unnecessarily.

Prefer:

```text
Primary → Main task
Secondary → Supporting task
Ghost → Low emphasis
Destructive → Dangerous action
```

---

# Card

Use Card when a clear visual container improves comprehension.

Good uses:

- KPI
- Distinct information group
- Workflow section
- Important summary

Avoid wrapping every section inside a Card.

The application should not become:

```text
Card
Card
Card
Card
Card
```

---

# Dialog

Use Dialog for focused contextual tasks.

Good:

```text
Add Customer
Edit Employee
Confirm Action
```

Avoid using Dialog for very large workflows.

If the content becomes a full-page workflow, use a page.

---

# Dialog Structure

Prefer:

```text
Dialog
├── Header
│   ├── Title
│   └── Description
│
├── Content
│
└── Footer
    ├── Secondary
    └── Primary
```

Keep actions predictable.

---

# Alert Dialog

Use Alert Dialog for destructive or high-impact confirmations.

Example:

```text
حذف العميل؟

سيؤدي هذا الإجراء إلى حذف بيانات العميل بشكل نهائي.

[إلغاء] [حذف العميل]
```

Do not use a normal Dialog when the user needs a clear destructive confirmation.

---

# Sheet / Drawer

Use Sheet when content should remain contextual while providing more space than a Dialog.

Common CRM uses:

- Filters
- Detail preview
- Mobile forms
- Secondary information
- Advanced search

---

# Mobile Overlay Strategy

On mobile, consider:

```text
Dialog
   ↓
Sheet / Drawer
```

when a standard centered dialog becomes too cramped.

Do not blindly use the same desktop overlay dimensions on mobile.

---

# Form Components

Use shadcn primitives to establish consistent form structure.

Typical:

```text
Form
├── FormField
│   ├── FormLabel
│   ├── FormControl
│   ├── FormDescription
│   └── FormMessage
```

Keep validation close to the field.

---

# Form Integration

If the project uses:

- React Hook Form
- Zod
- Custom form hooks
- Existing validation utilities

integrate with the existing architecture.

Do not introduce a second validation architecture simply because shadcn examples use a particular approach.

---

# Input

Inputs should inherit the project's:

- Font
- Border
- Background
- Text color
- Focus ring
- Radius
- Height

Do not hardcode a new visual language inside each Input.

---

# Select

Use Select when the list is relatively short and controlled.

Example:

```text
الحالة
[ نشط ▼ ]
```

For larger searchable datasets, prefer a Combobox / Command-based pattern.

---

# Combobox

Use Combobox when the user needs to:

- Search options
- Select from many records
- Search customers
- Search employees
- Search branches
- Search accounts

Example:

```text
اختر العميل
[ 🔍 ابحث عن عميل... ]
```

This is especially useful in CRM and ERP interfaces.

---

# Command

Command interfaces are useful for:

- Global search
- Quick actions
- Entity selection
- Keyboard navigation
- Command palette

Do not add a command palette simply because it is fashionable.

It should solve a real navigation or productivity problem.

---

# Dropdown Menu

Use Dropdown Menu for:

- Secondary actions
- Row actions
- More actions
- Contextual commands

Example:

```text
⋮
 ├── تعديل
 ├── عرض
 ├── نسخ
 └── حذف
```

Do not hide primary actions inside a dropdown.

---

# Tooltip

Use Tooltips primarily for:

- Icon-only buttons
- Abbreviated controls
- Additional contextual information

Do not use tooltips as the only way to communicate critical information.

---

# Badge

Use Badge for:

- Status
- Category
- State
- Small classification

Examples:

```text
نشط
متوقف
قيد المراجعة
متأخر
مدفوع
```

Avoid using badges for every piece of metadata.

---

# Status Colors

Status colors should come from the project's semantic tokens.

Conceptually:

```text
Success
Warning
Danger
Info
Neutral
```

Do not create arbitrary status colors.

For the O2 design system, respect the existing semantic tokens instead of introducing unrelated colors.

---

# Table

Use shadcn Table primitives as a foundation.

A simple table:

```text
Table
├── TableHeader
├── TableBody
│   ├── TableRow
│   └── TableCell
└── TableFooter
```

For advanced CRM tables, compose the table with:

```text
Search
+
Filters
+
Sorting
+
Selection
+
Pagination
+
Row Actions
```

The primitive does not replace the data-management architecture.

---

# Data Table

For complex data tables, separate:

```text
Data
State
Columns
UI
Actions
```

Prefer a structure such as:

```text
CustomerTable
├── CustomerTableToolbar
├── CustomerTableContent
├── CustomerTablePagination
└── CustomerTableDialogs
```

Keep table-specific logic organized.

---

# Table Density

CRM tables should usually prioritize scanability and information density.

Avoid:

- Huge row heights
- Excessive padding
- Giant icons
- Decorative content

But do not make rows so compact that readability suffers.

---

# Tabs

Use Tabs when multiple related views share one context.

Good:

```text
[ المعلومات ] [ الطلبات ] [ النشاط ]
```

Avoid using tabs for unrelated application sections.

Those belong in navigation.

---

# Breadcrumb

Use the project's existing Breadcrumb component if available.

Typical:

```text
الرئيسية / العملاء / أحمد محمد
```

Make sure RTL ordering is correct.

---

# Navigation

Do not replace the application's navigation architecture with a shadcn example.

Adapt shadcn navigation primitives to:

- Existing sidebar
- Existing routes
- Existing active states
- Existing permissions
- Existing RTL

---

# RTL

shadcn components must be evaluated in RTL.

Check:

- Dialog alignment
- Dropdown positioning
- Popover positioning
- Select menus
- Calendar
- Command
- Tabs
- Breadcrumbs
- Icons
- Navigation

Do not assume that a component designed in LTR will automatically feel correct in RTL.

---

# RTL and Directional Icons

Pay special attention to:

- Chevron
- Arrow
- Back
- Forward
- Expand
- Collapse

Do not blindly rotate all icons.

Determine whether the icon communicates direction or simply represents an action.

---

# Styling Strategy

shadcn components should consume the application's design system.

Prefer:

```text
Design Tokens
      ↓
shadcn primitives
      ↓
Feature components
      ↓
Pages
```

Not:

```text
Page
 ↓
Random Tailwind classes
 ↓
Random colors
 ↓
Random radius
 ↓
Random shadows
```

---

# Existing O2 Design System

When working in this project, existing O2 variables are authoritative.

Respect tokens such as:

```text
--o2-bg
--o2-surface
--o2-surface-raised
--o2-surface-muted
--o2-text
--o2-muted
--o2-border

--o2-brand
--o2-brand-hover
--o2-brand-soft

--o2-gold
--o2-gold-hover
--o2-gold-soft

--o2-success
--o2-warning
--o2-danger
--o2-info
```

Use semantic tokens rather than inventing new colors.

---

# Theme Compatibility

Components should work in:

```text
Light
Dark
```

when the application supports both.

Check:

- Surface contrast
- Text
- Border
- Focus
- Hover
- Disabled
- Status
- Dialog overlays

Never assume a component is theme-safe just because the default shadcn theme works.

---

# Customizing shadcn

Customization is expected.

Modify:

- Variants
- Classes
- Tokens
- Component composition
- Layout
- Typography
- States

when necessary.

But preserve:

- Accessibility
- Keyboard behavior
- Component semantics
- Existing API where practical
- Maintainability

---

# Do Not Fight the Primitive

If a component becomes heavily modified just to behave like a completely different component, stop and reassess.

Example:

```text
Dialog
 ↓
Massively modified
 ↓
Becomes full-page workflow
```

This probably should be a page instead.

Use the right primitive.

---

# Extend vs Create

Use this decision tree:

```text
Does an existing component solve it?
        │
       YES
        ↓
Reuse

       NO
        ↓
Can it be extended cleanly?
        │
       YES
        ↓
Extend

       NO
        ↓
Create a project-specific component
```

---

# Project-Specific Components

It is acceptable to create higher-level components.

Examples:

```text
CustomerStatusBadge
CustomerTable
CustomerFilters
PageHeader
StatsCard
EntityHeader
FormSection
```

These should compose lower-level primitives.

Example:

```text
CustomerStatusBadge
        ↓
Badge
```

rather than reimplementing Badge from scratch.

---

# Composition Layers

Prefer three levels:

## Level 1 — Primitive

Examples:

```text
Button
Input
Dialog
Badge
Table
```

## Level 2 — Feature Component

Examples:

```text
CustomerFilters
CustomerTable
CustomerForm
StatsCard
```

## Level 3 — Page

Examples:

```text
CustomersPage
CustomerDetailsPage
CustomerCreatePage
```

This creates a clean hierarchy.

---

# Avoid Primitive Leakage

Pages should not contain excessive low-level styling logic.

Bad:

```tsx
<Page>
  <div className="...50 utility classes...">
    <div className="...">
      <button className="...">
```

when existing components can express the same structure.

Prefer:

```tsx
<Page>
  <PageHeader />
  <CustomerToolbar />
  <CustomerTable />
</Page>
```

---

# Variants

When a component needs multiple visual modes, prefer variants over duplicated components.

Example:

```text
Button
├── default
├── secondary
├── outline
├── ghost
└── destructive
```

Avoid:

```text
PrimaryButton
SecondaryButton
DangerButton
DeleteButton
SaveButton
```

unless there is a genuine semantic difference beyond styling.

---

# Accessibility

shadcn primitives often provide strong accessibility foundations.

Do not remove them unnecessarily.

Preserve:

- Labels
- Keyboard interaction
- Focus management
- ARIA attributes
- Dialog semantics
- Menu semantics
- Form semantics

When customizing a component, verify that accessibility behavior remains intact.

---

# Focus States

Focus must remain visible.

Do not remove focus rings simply because they look less polished.

Adapt them to the design system instead.

---

# Disabled States

Disabled components should communicate:

- Cannot interact
- Why, when appropriate

Do not rely only on opacity.

Ensure text remains understandable.

---

# Loading Buttons

For async actions:

```text
[ حفظ ]
```

becomes:

```text
[ ⟳ جارٍ الحفظ... ]
```

or an equivalent project pattern.

Prevent duplicate submissions when appropriate.

---

# Destructive Actions

For actions such as:

- Delete
- Remove
- Cancel irreversible operation
- Reset critical data

use:

```text
Destructive styling
+
Clear confirmation
+
Explicit action
```

Do not hide destructive intent.

---

# Toasts

Use toast notifications for short-lived feedback.

Good:

```text
تم حفظ العميل بنجاح.
```

Bad:

```text
تم!
```

Feedback should explain what happened.

Avoid excessive toast notifications.

---

# Skeleton

Use Skeleton when the final content has a known shape.

For example:

```text
KPI Card
Table
Profile
```

Skeletons should resemble the final layout.

Avoid giant generic loading screens for localized content.

---

# Empty States

Combine shadcn primitives into meaningful empty states.

Example:

```text
Card
 ├── Icon
 ├── Title
 ├── Description
 └── Action
```

But do not create a Card solely because the empty state needs visual styling.

---

# Error States

Use Alert or an equivalent project component for errors.

Provide:

```text
Problem
+
Explanation
+
Recovery action
```

Example:

```text
تعذر تحميل العملاء.

حدث خطأ أثناء الاتصال بالخادم.

[ إعادة المحاولة ]
```

---

# Responsive shadcn

shadcn components should be adapted based on viewport.

Examples:

```text
Desktop
Dialog

Mobile
Sheet
```

or:

```text
Desktop
Dropdown Menu

Mobile
Bottom Sheet
```

when appropriate.

Do not force desktop interaction models onto mobile.

---

# Popover Positioning

In RTL layouts, verify that Popover and Dropdown positioning makes visual sense.

Do not assume:

```text
side="right"
```

always means the same UX relationship in RTL.

Think in terms of the user's visual context.

---

# Calendar / Date Picker

Date controls require special attention in Arabic interfaces.

Check:

- RTL
- Month navigation
- Day ordering
- Selected date
- Keyboard navigation
- Date formatting
- LTR technical representation when needed

Use the application's date conventions.

---

# Command / Search

For Arabic search:

- Support Arabic text
- Preserve readable highlighting
- Handle RTL
- Consider transliteration only if the application requires it
- Do not assume all search values are English

---

# Installation Rule

Before adding a new shadcn component:

1. Check whether it already exists.
2. Check whether the project uses the official component pattern.
3. Add only what is required.
4. Avoid adding unused components.
5. Do not add entire component collections unnecessarily.

Keep the codebase intentional.

---

# Dependency Discipline

Do not introduce additional dependencies merely to reproduce a shadcn component.

Prefer the project's existing stack.

If a dependency is truly necessary:

- Explain why.
- Confirm it fits the architecture.
- Avoid duplicating existing functionality.

---

# Updating Components

When modifying an existing shadcn component:

Check for:

- Existing consumers
- Existing variants
- Existing props
- Existing customizations
- Existing imports

Do not make breaking changes casually.

---

# Visual Consistency

A shadcn component should look like part of the application.

It should not look like:

> "This component came directly from a template."

Adapt:

- Colors
- Radius
- Typography
- Shadows
- Surfaces
- Spacing
- States

to the project's design system.

---

# Component Review Checklist

Before using a shadcn component, verify:

### Architecture

- [ ] Existing component checked.
- [ ] Correct primitive selected.
- [ ] No unnecessary duplication.

### Design

- [ ] Project tokens respected.
- [ ] Typography consistent.
- [ ] Radius consistent.
- [ ] Surfaces consistent.
- [ ] States consistent.

### RTL

- [ ] RTL behavior verified.
- [ ] Alignment correct.
- [ ] Directional icons reviewed.
- [ ] Overlay positioning verified.

### Responsive

- [ ] Desktop works.
- [ ] Tablet works.
- [ ] Mobile works.
- [ ] Overlay behavior works on small screens.

### Accessibility

- [ ] Keyboard behavior preserved.
- [ ] Focus visible.
- [ ] Labels available.
- [ ] Semantic structure preserved.
- [ ] Dialog/menu behavior accessible.

---

# Golden Rules

## Rule 1

Use shadcn as a foundation, not as a visual identity.

## Rule 2

Reuse existing project components before adding new ones.

## Rule 3

Customize primitives to match the project's design system.

## Rule 4

Do not duplicate components unnecessarily.

## Rule 5

Preserve accessibility when customizing.

## Rule 6

Design for RTL and responsive behavior from the beginning.

## Rule 7

Use the correct primitive for the interaction.

## Rule 8

Keep feature components above primitives and pages above feature components.

## Rule 9

Do not allow shadcn defaults to override the project's established visual language.

## Rule 10

A component should serve the user task, not exist merely because shadcn provides it.
