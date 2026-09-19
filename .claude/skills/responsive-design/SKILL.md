---
name: responsive-design
description: Builds and reviews responsive React interfaces across desktop, tablet, and mobile using intentional composition rather than simply shrinking desktop layouts. Use for CRM/admin dashboards, tables, forms, sidebars, toolbars, dialogs, sheets, cards, navigation, and data-heavy interfaces. Prioritizes content hierarchy, touch usability, overflow strategy, responsive breakpoints, RTL behavior, and preserving the project's existing design system.
---

---

# Responsive Design Skill

## Purpose

Build responsive interfaces by **recomposing the UI for different viewport sizes**, not by shrinking the desktop layout.

The goal is to make every page feel intentionally designed for:

- Desktop
- Tablet
- Mobile

Responsive behavior must preserve:

- Information hierarchy
- Usability
- Visual consistency
- Accessibility
- RTL behavior
- Existing design tokens
- Existing component architecture
- Existing business functionality

This skill is especially important for CRM and admin systems where interfaces often contain:

- Data tables
- Filters
- Search
- Sidebars
- Dashboards
- KPI cards
- Forms
- Dialogs
- Sheets
- Navigation
- Dense information

---

# 1. Core Principle

## Responsive does NOT mean:

```text
Desktop UI
    ↓
Make everything smaller
    ↓
Add md: and lg:
    ↓
Done
```

Instead:

```text
Desktop
   ↓
Identify information hierarchy
   ↓
Identify interaction priorities
   ↓
Recompose layout
   ↓
Tablet adaptation
   ↓
Mobile adaptation
```

Think in terms of:

> **What should change structurally when space becomes limited?**

Not:

> **How can I fit the desktop UI into a smaller width?**

---

# 2. Inspect Before Changing

Before implementing responsive behavior, inspect the existing project.

Check:

- `tailwind.config.*` if present
- Tailwind CSS version
- global CSS
- design tokens
- existing breakpoints
- layout components
- Sidebar
- Header
- mobile navigation
- reusable containers
- table components
- dialog components
- sheet/drawer components
- existing responsive utilities
- existing page patterns

Search for patterns such as:

```text
container
max-w-
w-full
w-screen
min-w-
overflow-x
grid-cols-
flex-wrap
hidden
block
md:
lg:
xl:
2xl:
```

Do not introduce a new responsive system if the project already has one.

---

# 3. Establish Content Priority

Every responsive page must have an information hierarchy.

Classify elements as:

### Priority A — Essential

Must remain immediately accessible.

Examples:

- Page title
- Main action
- Search
- Critical status
- Primary navigation
- Important record information

### Priority B — Important

May move, collapse, wrap, or become secondary.

Examples:

- Filters
- Secondary actions
- Additional metadata
- Supporting KPIs

### Priority C — Secondary

Can collapse, hide, or move into another interaction.

Examples:

- Advanced filters
- Rarely used actions
- Secondary metadata
- Decorative elements

### Priority D — Optional

Can disappear on smaller screens if necessary.

Examples:

- Decorative graphics
- Non-essential descriptions
- Secondary visual elements

Never hide an element simply because the screen is smaller.

First determine its importance.

---

# 4. Think in Layout Transitions

Do not design around arbitrary device names.

Instead, identify layout transitions.

For example:

```text
Wide:
Sidebar + Main Content
Multi-column dashboard
Full table
Inline toolbar

↓ space decreases

Medium:
Collapsed sidebar
Reduced grid columns
Condensed toolbar
Fewer visible table columns

↓ space decreases

Small:
Mobile navigation
Single-column content
Stacked actions
Filter Sheet
Simplified data presentation
```

Breakpoints should represent **layout changes**, not arbitrary screen categories.

Prefer the project's existing Tailwind breakpoints.

Do not create custom breakpoints unless there is a real design requirement.

---

# 5. Desktop Composition

Desktop can use the full information architecture.

Typical CRM layout:

```text
┌─────────────────────────────────────────────┐
│ Header                                      │
├──────────────┬──────────────────────────────┤
│              │ Page Header                  │
│   Sidebar    │                              │
│              │ KPI Cards                    │
│              │                              │
│              │ Toolbar                      │
│              │                              │
│              │ Data / Content               │
│              │                              │
└──────────────┴──────────────────────────────┘
```

Desktop may use:

- Persistent Sidebar
- Multi-column layouts
- Full KPI grids
- Full table columns
- Inline filters
- Inline actions
- Larger content areas

However, do not fill every available pixel.

Maintain readable content widths and visual hierarchy.

---

# 6. Tablet Composition

Tablet is not simply a smaller desktop.

Consider:

- Sidebar collapse
- Reduced column counts
- Condensed navigation
- Wrapped toolbars
- Reduced table columns
- Smaller gaps
- Two-column instead of three/four-column grids
- Stacked page actions where necessary

Example:

```text
Desktop:

[KPI] [KPI] [KPI] [KPI]

Tablet:

[KPI] [KPI]
[KPI] [KPI]
```

But do not automatically force every component into a 2-column grid.

Use the content hierarchy to decide.

---

# 7. Mobile Composition

Mobile should usually prioritize:

```text
Primary information
        ↓
Primary action
        ↓
Search
        ↓
Filters
        ↓
Main content
        ↓
Secondary information
```

Typical mobile structure:

```text
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ Page Title          │
│ Primary Action      │
├─────────────────────┤
│ Search              │
├─────────────────────┤
│ Filters / More      │
├─────────────────────┤
│ Content             │
└─────────────────────┘
```

Avoid simply compressing desktop components.

---

# 8. Application Shell

The application shell must have an intentional responsive strategy.

### Desktop

```text
Sidebar
+
Main content
```

### Tablet

Potentially:

```text
Collapsed sidebar
+
Main content
```

### Mobile

Prefer:

```text
Header
+
Drawer / Sheet navigation
+
Main content
```

Do not leave a full desktop sidebar consuming most of the mobile viewport.

When using a mobile drawer:

- Preserve current route
- Preserve active navigation state
- Provide clear close behavior
- Support keyboard interaction
- Prevent background interaction when appropriate
- Maintain RTL positioning
- Avoid duplicated navigation logic

Prefer existing `Sheet`, `Drawer`, or navigation primitives when available.

---

# 9. Header Responsiveness

Desktop headers can contain:

```text
Logo
Navigation
Search
Notifications
User Menu
Actions
```

On mobile, prioritize:

```text
Menu
Page/context
Notifications
User/action
```

Do not allow the header to become:

```text
[Logo] [Search] [Notifications] [Actions] [User] ...
```

with severe horizontal compression.

Move secondary actions into:

- Menu
- Dropdown
- Sheet
- More actions

when appropriate.

---

# 10. Page Header

Desktop:

```text
Page Title                    [Primary Action]
Description

Breadcrumb
```

Mobile:

```text
Breadcrumb

Page Title

Description

[Primary Action]
```

or:

```text
Page Title                 [⋮]
Description
```

depending on the page.

The important principle:

> Do not let title and actions compete for insufficient horizontal space.

---

# 11. KPI Cards

For dashboards:

### Desktop

Potentially:

```text
[KPI] [KPI] [KPI] [KPI]
```

### Tablet

Potentially:

```text
[KPI] [KPI]
[KPI] [KPI]
```

### Mobile

Choose intentionally between:

```text
[KPI]
[KPI]
[KPI]
```

or a horizontally scrollable KPI row if the context benefits from quick comparison.

Do not force four tiny cards onto a mobile screen.

KPI cards should retain:

- readable number
- label
- status
- important trend
- sufficient padding

---

# 12. Toolbars

CRM toolbars are one of the most important responsive areas.

Desktop may contain:

```text
[Search] [Filter] [Status] [Date] [View]       [Export] [Add]
```

Do not simply allow everything to wrap randomly.

Use intentional grouping.

For example:

```text
Desktop:

[Search] [Filters] [View]                [Actions]
```

Tablet:

```text
[Search] [Filters]                       [Actions]
```

Mobile:

```text
[Search........................]

[Filter] [More]
```

Advanced filters may open in:

- Sheet
- Drawer
- Dialog

---

# 13. Search

Search should usually remain highly accessible on mobile.

Prefer:

```text
┌────────────────────────────┐
│ 🔍 Search customers...     │
└────────────────────────────┘
```

Avoid:

```text
tiny search icon
```

if search is a primary page function.

Search width should adapt naturally.

Prefer:

```tsx
className = "w-full";
```

within an appropriate container rather than arbitrary fixed widths.

---

# 14. Filters

Desktop:

```text
Search | Status | Date | Owner | Type
```

Mobile:

```text
Search

[Filters]
```

Opening:

```text
┌─────────────────────┐
│ Filters             │
├─────────────────────┤
│ Status              │
│                     │
│ Owner               │
│                     │
│ Date                │
│                     │
│ [Reset] [Apply]     │
└─────────────────────┘
```

Prefer a `Sheet` or `Drawer` for complex mobile filtering.

Do not create a huge filter dialog if a mobile sheet is more natural.

---

# 15. Data Tables

Tables require deliberate responsive design.

Never assume:

```tsx
<table className="w-full">
```

automatically makes a table responsive.

First decide which strategy fits the data.

## Strategy A — Horizontal Scroll

Use when:

- Columns are important
- Data comparison is central
- Table structure must remain intact

Example:

```tsx
<div className="overflow-x-auto">
  <Table />
</div>
```

Ensure the overflow container is correctly positioned.

Do not accidentally make the entire page horizontally scroll.

---

## Strategy B — Reduced Columns

Hide or move secondary columns.

Desktop:

```text
Name | Phone | Status | Owner | Created | Last Contact
```

Mobile:

```text
Name | Status | Actions
```

Secondary information can appear in:

- expandable row
- detail page
- sheet
- tooltip
- contextual menu

Only do this when information hierarchy supports it.

---

## Strategy C — Card/List Representation

For highly relational records, mobile may use:

```text
┌──────────────────────────┐
│ Customer Name            │
│ Phone                    │
│ Status                   │
│ Owner                    │
│                  [•••]   │
└──────────────────────────┘
```

Use this when a table becomes difficult to scan or interact with on mobile.

Do not convert every table into cards automatically.

---

# 16. Table Rules

Avoid:

```text
min-width: 1200px
```

on the page itself.

If minimum width is necessary, constrain it to the table's scroll container.

Avoid:

```text
overflow-x-auto
```

on the entire application shell unless intentional.

The user should not have to horizontally scroll the entire dashboard because one table is wide.

---

# 17. Forms

Desktop forms can use:

```text
[First Name]      [Last Name]

[Phone]           [Email]

[Status]          [Owner]

[Notes.........................]
```

Mobile should normally become:

```text
[First Name]

[Last Name]

[Phone]

[Email]

[Status]

[Owner]

[Notes................]
```

Use:

```text
grid-cols-1
```

as the natural mobile baseline and progressively introduce additional columns.

Do not make mobile fields unnecessarily narrow.

---

# 18. Form Actions

Desktop:

```text
                              [Cancel] [Save]
```

Mobile:

```text
[Cancel]        [Save]
```

or:

```text
[Save]
```

with secondary cancellation behavior if appropriate.

Primary actions should remain easy to reach.

For long forms, consider:

- sticky action bar
- bottom action area
- contextual save controls

only when it improves usability.

---

# 19. Dialogs

Desktop dialogs can have constrained widths.

Example:

```text
max-w-lg
max-w-xl
max-w-2xl
```

On mobile, do not preserve a narrow centered desktop modal if it creates a poor experience.

Depending on the content, use:

- responsive width
- near-full-width dialog
- `Sheet`
- `Drawer`

Example conceptual behavior:

```text
Desktop:
┌──────────────────────────┐
│        Dialog            │
│                          │
└──────────────────────────┘

Mobile:
┌──────────────────────────────┐
│ Dialog                       │
│                              │
│ Content                      │
│                              │
│ Actions                      │
└──────────────────────────────┘
```

For large forms, a mobile Sheet can often be better than a traditional centered modal.

---

# 20. Cards

Cards should adapt their internal composition.

Do not only change:

```text
grid-cols-4
```

to:

```text
grid-cols-1
```

Also consider:

- padding
- typography
- icon placement
- metadata
- action placement
- content density

Example:

Desktop:

```text
Icon        Value
            Label
            Trend
```

Mobile may become:

```text
Icon  Value
      Label
```

if that creates better hierarchy.

---

# 21. Grids

Prefer content-driven grids.

Example:

```tsx
grid - cols - 1;
sm: grid - cols - 2;
lg: grid - cols - 4;
```

when appropriate.

But do not blindly use the same pattern everywhere.

A page may need:

```text
1 → 2 → 3
```

while another needs:

```text
1 → 2
```

and another:

```text
1 → 1
```

The correct grid depends on:

- content width
- readability
- interaction
- information density

---

# 22. Width Strategy

Prefer:

```text
w-full
max-w-*
min-w-0
flex-1
```

over arbitrary fixed widths.

Avoid excessive:

```text
w-[487px]
w-[731px]
w-[912px]
```

unless the dimension is truly part of the design.

Be especially careful with:

- inputs
- cards
- dialogs
- sidebars
- toolbars

---

# 23. Height Strategy

Avoid unnecessary fixed heights.

Bad:

```text
h-[700px]
```

when content can vary.

Prefer:

```text
min-h-*
max-h-*
h-auto
```

when appropriate.

Fixed heights can cause:

- clipped content
- broken mobile layouts
- inaccessible actions
- unexpected scrolling

---

# 24. Touch Usability

Mobile interfaces must support touch comfortably.

Interactive elements should generally have a sufficiently large hit area.

Avoid:

```text
tiny icon-only button
```

especially for important actions.

Use:

- adequate padding
- clear spacing
- appropriate button sizes
- separated touch targets

Do not rely on hover for essential functionality.

Desktop hover behavior must have a mobile equivalent.

---

# 25. Icon Buttons

Icon-only buttons should be used carefully.

Always consider:

- accessible label
- tooltip on desktop where useful
- adequate hit area
- clear visual affordance
- mobile discoverability

Example:

```tsx
<Button size="icon" aria-label="Delete customer">
  <Trash2 />
</Button>
```

Do not make the icon itself tiny just because the button is visually compact.

---

# 26. Responsive Typography

Typography should preserve hierarchy.

Do not make mobile typography so small that users struggle to read.

Prefer modest adjustments.

Example:

```text
Desktop:
text-2xl

Mobile:
text-xl
```

rather than:

```text
Desktop:
text-4xl

Mobile:
text-xs
```

Maintain:

- readable body text
- strong page titles
- visible labels
- accessible contrast

---

# 27. Responsive Spacing

Spacing should become more compact when necessary, but not collapse completely.

Example:

Desktop:

```text
p-6
gap-6
```

Mobile:

```text
p-4
gap-4
```

Do not eliminate all whitespace simply to fit more content.

Whitespace is part of hierarchy.

---

# 28. RTL Responsive Design

This project uses Arabic RTL.

Responsive behavior must preserve RTL semantics.

Prefer logical CSS properties:

```css
margin-inline-start
margin-inline-end
padding-inline-start
padding-inline-end
inset-inline-start
inset-inline-end
```

In Tailwind, prefer logical utilities where supported.

Avoid assuming:

```text
left = start
right = end
```

because RTL reverses directional meaning.

Sidebar, drawers, menus, arrows, breadcrumbs and navigation must follow the project's RTL convention.

---

# 29. Directional Icons

Directional icons require special attention.

Examples:

- Arrow left
- Arrow right
- Chevron left
- Chevron right
- Back
- Forward
- Previous
- Next
- Login/logout directional indicators

Do not blindly hardcode visual direction.

Ask:

> Is this icon representing a physical direction or a logical action?

For logical navigation, ensure it behaves correctly in RTL.

---

# 30. Technical LTR Content

Some content should remain LTR.

Examples:

- Phone numbers
- URLs
- Email addresses
- IDs
- Codes
- Technical values
- Certain numeric strings

Respect the project's existing LTR exceptions.

Do not globally reverse technical content.

---

# 31. Mobile Navigation

Mobile navigation should be intentionally designed.

Recommended pattern:

```text
Header
  ↓
Menu button
  ↓
Sheet / Drawer
  ↓
Navigation
```

The navigation should preserve:

- active route
- hierarchy
- section labels
- permissions
- user state

Avoid rendering a completely different navigation system unless necessary.

Reuse the same navigation data where possible.

---

# 32. Responsive Sidebar

Recommended conceptual behavior:

```text
Desktop:
Persistent sidebar

Tablet:
Collapsed sidebar

Mobile:
Sheet / Drawer
```

If the project has a different established convention, follow it.

Do not create multiple sources of truth for navigation.

---

# 33. Overflow Management

Every page must be reviewed for unintended overflow.

Check:

- body
- main content
- cards
- tables
- forms
- headers
- toolbars
- dialogs
- code/content blocks

A responsive implementation should never introduce accidental:

```text
horizontal page scrolling
```

unless it is intentionally required.

---

# 34. Long Text

Responsive interfaces must handle:

- long Arabic names
- customer names
- company names
- addresses
- emails
- URLs
- notes
- status labels

Use appropriate:

```text
truncate
line-clamp-*
break-words
overflow-wrap
```

when appropriate.

Do not allow one long string to destroy the layout.

---

# 35. Arabic Text Considerations

Arabic text can produce different visual widths from English.

Test:

- long Arabic names
- long labels
- navigation items
- buttons
- badges
- table cells
- form labels

Never assume that a label fitting in English will fit in Arabic.

Avoid fixed-width controls based solely on English text.

---

# 36. Responsive Badges

Badges can become problematic when labels are long.

Prefer:

```text
inline-flex
max-width
truncate
```

when necessary.

For mobile, consider whether the badge should:

- remain inline
- move to another line
- become icon + tooltip
- use a shorter semantic label

Do not sacrifice clarity merely to save a few pixels.

---

# 37. Action Hierarchy

When space decreases, actions should be prioritized.

Example:

Desktop:

```text
[Edit] [Delete] [Duplicate] [Export] [More]
```

Mobile:

```text
[Edit] [More]
```

Inside More:

```text
Delete
Duplicate
Export
```

Do not hide the primary action while keeping secondary actions visible.

---

# 38. Responsive Details Pages

Desktop detail page:

```text
┌────────────────────────────────────────────┐
│ Customer Header                            │
├──────────────────────┬─────────────────────┤
│ Main Information     │ Sidebar Information │
│                      │                     │
│ Activity             │ Related Data        │
└──────────────────────┴─────────────────────┘
```

Mobile:

```text
Customer Header

Main Information

Activity

Related Data
```

Secondary panels should stack naturally.

---

# 39. Responsive Dashboards

Dashboard composition should be intentional.

Desktop may contain:

```text
KPI row
Large chart      Small chart

Table
Activity         Tasks
```

Mobile may become:

```text
KPI
KPI

Large chart

Small chart

Table

Activity
```

Prioritize the information that users actually need on smaller screens.

Do not preserve desktop chart dimensions on mobile.

---

# 40. Charts

Charts should adapt to available width.

Avoid hardcoded dimensions that break mobile.

Prefer responsive containers where the charting library supports them.

Ensure:

- labels remain readable
- legends do not overflow
- tooltips remain usable
- axes do not collide
- chart height remains useful

If a chart becomes unreadable, simplify it rather than merely shrinking it.

---

# 41. Responsive Tabs

If tabs exceed available width, consider:

### Option A

Horizontal scrolling tabs.

### Option B

Scrollable tab list.

### Option C

Dropdown/select for secondary navigation.

### Option D

Wrap only if the resulting hierarchy remains clear.

Do not allow tabs to overflow the page accidentally.

---

# 42. Responsive Breadcrumbs

Desktop:

```text
Dashboard / Customers / Customer Name
```

Mobile may use:

```text
Customers / Customer Name
```

or:

```text
← Customers
```

depending on the page hierarchy.

Avoid forcing a long breadcrumb into one line.

---

# 43. Responsive Empty States

Empty states should remain useful on mobile.

Desktop may use:

```text
Illustration

No customers found.

Create your first customer.

[Add Customer]
```

Mobile:

```text
No customers found.

Create your first customer.

[Add Customer]
```

Reduce decorative dimensions if necessary, but preserve:

- explanation
- action
- hierarchy

---

# 44. Loading States

Responsive skeletons should match the responsive layout.

If desktop has:

```text
4 KPI skeletons
```

mobile should not show:

```text
4 tiny skeletons
```

Instead use the same composition that the final UI will use.

Skeletons must represent the actual responsive structure.

---

# 45. Error States

Error messages should remain readable on narrow screens.

Avoid fixed-width error banners.

Prefer:

```text
w-full
break-words
```

and responsive action placement.

---

# 46. Animation

Responsive interfaces should not rely on animation to communicate essential information.

When using transitions:

- respect reduced motion
- avoid excessive mobile animation
- keep drawers and dialogs predictable
- avoid large movement that distracts users

Animation should support hierarchy, not compensate for poor layout.

---

# 47. Component Architecture

Responsive behavior should generally live close to the component that owns the layout.

Good:

```text
Sidebar
Header
Toolbar
DataTable
KpiGrid
CustomerForm
```

each owns its responsive behavior.

Avoid scattering unrelated responsive rules throughout pages.

Prefer reusable variants and layout primitives.

---

# 48. Avoid Responsive Duplication

Do not create:

```text
DesktopCustomerTable
MobileCustomerTable
TabletCustomerTable
```

unless the interaction model genuinely requires separate implementations.

Prefer shared data and shared logic with responsive presentation.

For example:

```text
CustomerData
      ↓
Desktop Table
Mobile Card/List
```

when the representations genuinely differ.

Business logic should remain shared.

---

# 49. Avoid CSS Hacks

Do not solve responsive problems with:

```css
!important
```

unless the existing project architecture genuinely requires it.

Avoid:

```text
negative margins
arbitrary pixel offsets
absolute positioning everywhere
viewport hacks
```

Use proper layout primitives:

- flex
- grid
- gap
- container
- min/max width
- overflow
- responsive variants

---

# 50. Common Anti-Patterns

Avoid:

### Anti-pattern 1

```text
Desktop toolbar simply wraps randomly on mobile.
```

Fix:

```text
Recompose toolbar.
```

---

### Anti-pattern 2

```text
Entire page gets overflow-x-auto because table is wide.
```

Fix:

```text
Only the table container scrolls.
```

---

### Anti-pattern 3

```text
Four KPI cards become tiny cards on mobile.
```

Fix:

```text
Use stacking or intentional horizontal scrolling.
```

---

### Anti-pattern 4

```text
Desktop sidebar remains permanently visible on mobile.
```

Fix:

```text
Use drawer/sheet navigation.
```

---

### Anti-pattern 5

```text
Fixed-width dialog on mobile.
```

Fix:

```text
Use responsive dialog/sheet behavior.
```

---

### Anti-pattern 6

```text
Tiny mobile buttons.
```

Fix:

```text
Increase touch target and simplify actions.
```

---

### Anti-pattern 7

```text
Hover-only functionality.
```

Fix:

```text
Provide touch and keyboard equivalents.
```

---

### Anti-pattern 8

```text
Hardcoded widths everywhere.
```

Fix:

```text
Use fluid width + max-width constraints.
```

---

### Anti-pattern 9

```text
Random md:/lg: classes added until the page looks acceptable.
```

Fix:

```text
Define the structural transition first.
```

---

# 51. Responsive Review Process

After implementation, review the page in this order.

## Pass 1 — Structure

Check:

- Shell
- Sidebar
- Header
- Main content
- Grids
- Sections

## Pass 2 — Overflow

Check:

- Horizontal page scrolling
- Tables
- Long text
- Buttons
- Toolbars
- Dialogs

## Pass 3 — Interaction

Check:

- Touch targets
- Menus
- Filters
- Forms
- Navigation
- Dialogs
- Drawers

## Pass 4 — Hierarchy

Check:

- What is visible?
- What is hidden?
- What moved?
- What became secondary?
- Is the primary action still obvious?

## Pass 5 — Visual Quality

Check:

- Spacing
- Typography
- Card density
- Alignment
- Consistency
- RTL
- Dark/light theme

---

# 52. Test Representative Widths

Do not test only:

```text
Desktop
Mobile
```

Review at representative ranges such as:

```text
Wide desktop
Normal desktop
Tablet landscape
Tablet portrait
Large mobile
Small mobile
```

Also test awkward intermediate widths.

Many responsive bugs appear between common device presets.

---

# 53. Visual Validation

If browser/screenshot/visual inspection tools are available:

1. Render the page.
2. Inspect desktop.
3. Inspect tablet.
4. Inspect mobile.
5. Identify the highest-impact responsive issue.
6. Fix it.
7. Render again.
8. Repeat.

Do not claim that a visual inspection was performed if no visual inspection tool or screenshot is actually available.

If visual tools are unavailable, perform a code-level responsive review and clearly reason from the implemented structure.

---

# 54. Iteration Priority

Fix responsive issues in this order:

### P0 — Broken

Examples:

- Page horizontally scrolls unexpectedly
- Navigation inaccessible
- Content clipped
- Primary action unreachable
- Form unusable

### P1 — Major UX

Examples:

- Toolbar unusable
- Table impossible to interact with
- Sidebar dominates screen
- Dialog broken
- Important information hidden

### P2 — Visual

Examples:

- Bad spacing
- Poor wrapping
- Inconsistent card sizes
- Awkward alignment

### P3 — Polish

Examples:

- Minor typography adjustment
- Tiny spacing improvements
- Subtle animation refinement

Always fix P0/P1 before P2/P3.

---

# 55. Responsive Implementation Strategy

When implementing a page:

### Step 1

Understand the desktop composition.

### Step 2

Identify the essential content.

### Step 3

Identify what can:

```text
stack
collapse
hide
move
scroll
expand
```

### Step 4

Define tablet composition.

### Step 5

Define mobile composition.

### Step 6

Implement using the existing design system.

### Step 7

Check RTL behavior.

### Step 8

Check overflow.

### Step 9

Check interaction.

### Step 10

Perform visual review.

---

# 56. Example Mental Model

For a CRM customer page:

```text
Desktop
────────────────────────────

Sidebar | Header

         Customer Header
         [Edit] [Delete]

         KPI
         [Total] [Orders] [Revenue] [Last Contact]

         Toolbar
         [Search] [Filters] [Export] [Add]

         Full Data Table


Tablet
────────────────────────────

Collapsed Sidebar

Customer Header
[Edit] [More]

KPI
[KPI] [KPI]
[KPI] [KPI]

Toolbar
[Search]
[Filters] [Actions]

Reduced Data Table


Mobile
────────────────────────────

Header
Customer

Customer Header
[Edit] [More]

KPI
[KPI]
[KPI]

Search

[Filters]

Customer List / Compact Table

```

This is responsive composition.

Not simply:

```text
Desktop width × 0.4
```

---

# 57. Preserve Existing Design System

Responsive changes must not introduce a separate visual language.

Continue using:

- Existing colors
- Existing typography
- Existing spacing
- Existing radius
- Existing shadows
- Existing shadcn components
- Existing tokens
- Existing dark/light theme
- Existing RTL conventions

Responsive behavior changes **composition**, not the identity of the interface.

---

# 58. CRM-Specific Principle

CRM interfaces often contain more information than consumer applications.

Therefore:

> Do not aggressively simplify CRM interfaces merely to make them "mobile friendly."

Instead determine:

```text
What must be visible?
What can move?
What can collapse?
What can scroll?
What can open in a sheet?
What can move to the detail page?
```

The goal is:

> **High information density without sacrificing usability.**

---

# 59. Final Responsive Checklist

Before considering a page complete, verify:

### Layout

- [ ] Desktop composition works
- [ ] Tablet composition is intentional
- [ ] Mobile composition is intentional
- [ ] No accidental horizontal page scrolling
- [ ] Containers behave correctly
- [ ] Fixed widths are justified

### Navigation

- [ ] Sidebar adapts correctly
- [ ] Mobile navigation is accessible
- [ ] Active route remains visible
- [ ] RTL positioning is correct

### Content

- [ ] Primary content remains visible
- [ ] Secondary content is intentionally handled
- [ ] Long Arabic text does not break layout
- [ ] Tables have a deliberate responsive strategy

### Interaction

- [ ] Touch targets are comfortable
- [ ] No essential hover-only behavior
- [ ] Dialogs work on mobile
- [ ] Filters work on mobile
- [ ] Forms are usable
- [ ] Actions remain discoverable

### Visual

- [ ] Typography remains readable
- [ ] Spacing remains balanced
- [ ] Cards remain coherent
- [ ] KPI layout adapts correctly
- [ ] Dark/light themes remain correct
- [ ] RTL remains correct

### Quality

- [ ] No unnecessary CSS hacks
- [ ] No unnecessary duplicated components
- [ ] Existing design system is preserved
- [ ] Responsive behavior is componentized
- [ ] Representative widths were considered

---

# Golden Rule

> **Responsive design is not shrinking the desktop interface.**
>
> **Responsive design is intelligently recomposing the interface around the user's available space, priorities, and interaction method.**

When working on CRM/admin interfaces, always prefer:

```text
Intentional composition
        ↓
Clear hierarchy
        ↓
Responsive structure
        ↓
Touch-friendly interaction
        ↓
RTL correctness
        ↓
Visual validation
```

over:

```text
Desktop UI
    ↓
Add breakpoints
    ↓
Hide things
    ↓
Hope it works
```
