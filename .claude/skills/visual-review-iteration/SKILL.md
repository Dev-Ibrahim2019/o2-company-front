---
name: visual-review-iteration
description: Reviews and iterates on React interfaces for visual quality, UX consistency, responsive behavior, RTL correctness, spacing, hierarchy, states, and design-system compliance. Use after implementing or redesigning pages, dashboards, CRM screens, forms, tables, dialogs, navigation, and responsive layouts. Requires identifying the highest-impact visual and UX problems, fixing them systematically, and re-reviewing instead of treating the first working implementation as finished.
---

---

# Visual Review & Iteration

## Purpose

Turn frontend implementation into an iterative visual-quality process.

A page is not finished because:

- It compiles.
- The route works.
- The API responds.
- The components render.
- The build succeeds.

A page is finished when it is:

- Visually coherent
- Consistent with the application
- Easy to scan
- Responsive
- RTL-correct
- Accessible
- Functionally clear
- Appropriate in density
- Correct across UI states

The workflow is:

```text
Implement
   ↓
Inspect
   ↓
Identify Problems
   ↓
Prioritize
   ↓
Fix
   ↓
Re-inspect
   ↓
Refine
   ↓
Validate
```

---

# Core Principle

## Never polish randomly.

Every visual change should solve an identifiable problem.

Bad iteration:

> Make it prettier.

Good iteration:

> The page header is visually competing with the KPI cards. Reduce the header's visual weight, tighten the spacing, and make the primary action more prominent.

---

# When to Use This Skill

Use this skill after:

- Creating a new page
- Redesigning a page
- Creating a dashboard
- Creating a CRM screen
- Creating a table
- Creating a form
- Creating a detail view
- Creating a modal
- Creating a responsive layout
- Implementing a design reference
- Replacing an old UI
- Refactoring UI components

It should also be used when the user says:

- "Make it more professional"
- "Improve the design"
- "Make it look better"
- "It doesn't look like the reference"
- "Make it like v0"
- "The UI feels wrong"
- "Fix the spacing"
- "Make it responsive"
- "Make it cleaner"

---

# Review Mindset

Review the interface as if you were a:

- Product designer
- UX designer
- Frontend engineer
- End user

Do not review only the code.

Ask:

> What does the user see?

> What does the user understand?

> What does the user do next?

> What feels inconsistent?

---

# Phase 1 — Establish the Baseline

Before changing anything, inspect:

- Existing page
- Existing design system
- Nearby screens
- Shared components
- Global CSS
- Responsive behavior
- Existing layout conventions

Determine what is already correct.

Do not redesign working patterns unnecessarily.

---

# Phase 2 — Visual Hierarchy Review

Check the visual hierarchy from top to bottom.

## Level 1 — Context

Can the user immediately understand:

- Where am I?
- What page is this?
- What is the primary task?

Check:

- Page title
- Breadcrumb
- Description
- Navigation state

---

## Level 2 — Primary Actions

Can the user immediately identify:

- What should I do?
- Where do I click?
- What is the primary action?

Check:

- Primary button
- Button placement
- Button emphasis
- Action grouping

If multiple elements compete equally for attention, reduce the visual competition.

---

## Level 3 — Important Information

Check:

- KPIs
- Status
- Main records
- Important alerts
- Main content

Important information should have stronger visual priority than metadata.

---

## Level 4 — Secondary Information

Check:

- Metadata
- Supporting descriptions
- Secondary actions
- Rare controls

These should not dominate the page.

---

# Hierarchy Test

Perform a quick visual scan.

Imagine the interface blurred.

You should still be able to identify:

```text
Page
  ↓
Primary purpose
  ↓
Primary action
  ↓
Main content
```

If everything has the same visual weight, the hierarchy needs improvement.

---

# Phase 3 — Layout Review

Inspect the overall composition.

Check:

- Content width
- Sidebar width
- Header height
- Page padding
- Section spacing
- Grid alignment
- Card dimensions
- Table width
- Form width

Look for:

- Uneven spacing
- Random alignment
- Excessive whitespace
- Overcrowding
- Misaligned columns
- Inconsistent widths

---

# Alignment

Look for invisible alignment lines.

For example:

```text
Page Header
────────────────────────────
Summary
────────────────────────────
Toolbar
────────────────────────────
Table
────────────────────────────
```

Important content should share consistent horizontal boundaries.

Avoid arbitrary shifts between sections.

---

# Spacing Review

Spacing should communicate relationships.

Use:

```text
Small
↓
Related elements

Medium
↓
Related groups

Large
↓
Major sections
```

Avoid:

```text
10px
23px
17px
31px
14px
```

randomly across the page.

Use the project's established spacing scale.

---

# Density Review

For CRM/admin interfaces, check whether the page is too:

### Dense

Symptoms:

- Everything touches
- Hard to scan
- Tiny text
- Crowded controls

### Sparse

Symptoms:

- Huge cards
- Excessive whitespace
- Very few records visible
- Long scrolling for simple tasks

Target:

> Dense enough for productivity, spacious enough for clarity.

---

# Card Review

Cards should have a purpose.

Ask:

> Why is this information inside a card?

Good reasons:

- Separate distinct content
- Group a workflow
- Highlight an important metric
- Establish a clear visual boundary

Bad reason:

> Because cards look modern.

---

# Avoid Card Soup

If the page contains many cards:

```text
Card
Card
Card
Card
Card
Card
```

evaluate whether some can become:

- Sections
- Dividers
- Table rows
- Inline groups
- Surface areas

Reduce unnecessary visual boundaries.

---

# Surface Hierarchy

The project may have multiple surfaces:

```text
Background
Surface
Raised Surface
Muted Surface
```

Use them intentionally.

Do not make every element look like a raised card.

---

# Border Review

Borders should communicate structure.

Avoid excessive borders around:

- Every field
- Every section
- Every card
- Every row
- Every icon

Use spacing and surface changes when a border is unnecessary.

---

# Shadow Review

Shadows should communicate elevation.

Avoid:

```text
Shadow
Shadow
Shadow
Shadow
```

throughout the interface.

Use stronger elevation only when an element actually sits above another surface.

---

# Radius Review

Maintain the project's established radius language.

Do not mix:

```text
rounded-sm
rounded-lg
rounded-xl
rounded-2xl
rounded-3xl
```

randomly.

If the project has a restrained radius system, respect it.

---

# Typography Review

Check:

- Font family
- Font weight
- Font size
- Line height
- Heading hierarchy
- Label hierarchy
- Metadata hierarchy

The project uses Arabic typography.

Prefer the project's established:

```text
Cairo
Tajawal
Arial
```

stack rather than introducing unrelated fonts.

---

# Typography Hierarchy

Typical structure:

```text
Page Title
    ↓
Section Title
    ↓
Card / Group Title
    ↓
Body
    ↓
Metadata
```

Do not make everything bold.

Do not make every heading huge.

---

# Color Review

Colors should communicate meaning.

Check:

- Brand
- Primary actions
- Success
- Warning
- Danger
- Info
- Muted content
- Borders
- Surfaces

Prefer the project's semantic O2 tokens.

Avoid introducing arbitrary colors such as:

```text
#123456
#4F46E5
#22C55E
```

when equivalent project tokens already exist.

---

# Color Saturation

Do not overuse strong colors.

For example:

Bad:

```text
Red button
Red badge
Red border
Red card
Red icon
Red heading
```

Better:

```text
Brand → Primary action
Neutral → Structure
Muted → Secondary information
Semantic → Status
```

---

# Dark Mode Review

Always inspect dark mode when supported.

Check:

- Text contrast
- Borders
- Surfaces
- Shadows
- Brand colors
- Semantic states
- Inputs
- Tables
- Dialogs
- Hover states
- Disabled states

Do not assume a light design automatically works in dark mode.

---

# Light Mode Review

Likewise verify:

- Background hierarchy
- Card contrast
- Border visibility
- Text readability
- Muted text
- Status colors

Avoid excessive contrast that makes the interface noisy.

---

# RTL Review

For Arabic interfaces, perform a dedicated RTL review.

Check:

- Page direction
- Sidebar position
- Header alignment
- Breadcrumb order
- Text alignment
- Form labels
- Action groups
- Tables
- Pagination
- Dropdown menus
- Tooltips
- Icons
- Directional arrows

---

# RTL Icon Review

Directional icons require special attention.

Examples:

- Back arrow
- Forward arrow
- Chevron
- Navigation arrow
- Timeline direction

An icon that visually communicates direction may need to change in RTL.

Do not blindly mirror every icon.

---

# LTR Data Review

Verify that these remain readable:

- Phone numbers
- Email addresses
- URLs
- IDs
- Account numbers
- Technical codes

Use:

```html
dir="ltr"
```

where appropriate.

---

# Responsive Review

Review at minimum:

```text
Desktop
Tablet
Mobile
```

Do not review only desktop.

---

# Desktop Review

Check:

- Overall balance
- Sidebar
- Content width
- Grid
- Table density
- Toolbar
- Form columns

Look for excessive unused space.

---

# Tablet Review

Check:

- Grid collapse
- Sidebar behavior
- Toolbar wrapping
- Table width
- Form columns
- Dialog size

Tablet layouts often expose hidden assumptions.

---

# Mobile Review

Check:

- Horizontal overflow
- Buttons
- Inputs
- Tables
- Cards
- Headers
- Filters
- Dialogs
- Navigation

The page should be intentionally composed for mobile.

---

# Mobile Toolbar

If the desktop toolbar is:

```text
Search | Filters | Sort | Export | Add
```

the mobile version should not become:

```text
Search | Filters | Sort | Export | Add
```

crammed into one row.

Instead consider:

```text
Search

[Filters] [More]
```

---

# Mobile Tables

Choose intentionally between:

### Horizontal scrolling

Useful when column relationships are important.

### Responsive card/list

Useful when each record can be represented vertically.

### Reduced columns

Useful when only a few fields are essential.

Never allow accidental layout destruction.

---

# Interaction Review

Check:

- Hover
- Focus
- Active
- Selected
- Disabled
- Loading
- Success
- Error

Every interactive element should communicate its state.

---

# Button Review

Check:

- Primary
- Secondary
- Ghost
- Destructive
- Disabled
- Loading

Avoid having many buttons with equal visual emphasis.

---

# Form Review

Check:

- Label clarity
- Input size
- Field spacing
- Required indicators
- Validation
- Error messages
- Focus state
- Disabled state
- Submit state

Errors should appear close to the field they describe.

---

# Table Review

Check:

- Header hierarchy
- Row density
- Column alignment
- Status badges
- Actions
- Hover state
- Selected state
- Empty state
- Loading state
- Pagination

Avoid making tables unnecessarily decorative.

---

# Dashboard Review

Check whether the dashboard answers:

```text
What happened?
What is happening?
What needs attention?
What should I do?
```

If the dashboard contains many charts but does not answer those questions, simplify it.

---

# Modal Review

Check:

- Width
- Height
- Padding
- Title
- Description
- Form layout
- Footer actions
- Close behavior
- Mobile behavior

Avoid huge dialogs for simple tasks.

---

# Drawer Review

Check:

- Width
- Scroll behavior
- Header
- Footer
- Mobile usability
- Focus behavior

Drawers should feel contextual, not like hidden pages.

---

# Animation Review

Animations should communicate:

- State changes
- Transitions
- Hierarchy
- Feedback

Avoid animation simply for decoration.

Prefer subtle:

- Opacity
- Transform
- Scale
- Height
- Color transitions

Respect reduced-motion preferences when applicable.

---

# State Review

Every data-driven component should be reviewed in:

```text
Loading
Empty
Error
Success
Disabled
Partial
Permission denied
```

Do not only review the successful populated state.

---

# Loading Review

Bad:

```text
Blank page
```

Bad:

```text
Huge spinner in center of entire application
```

Better:

- Skeleton for content
- Local spinner for action
- Progress indicator for submission

Loading should preserve layout when possible.

---

# Empty Review

A good empty state contains:

```text
What is empty?
Why?
What can I do?
```

Example:

```text
لا توجد طلبات

لم يتم إنشاء أي طلبات حتى الآن.

[ + إنشاء طلب ]
```

---

# Error Review

Errors should be understandable.

Bad:

```text
Error 500
```

Better:

```text
تعذر تحميل البيانات

حدث خطأ أثناء تحميل العملاء.

[ إعادة المحاولة ]
```

---

# Accessibility Review

Perform a basic accessibility review.

Check:

- Keyboard navigation
- Focus visibility
- Color contrast
- Button labels
- Input labels
- Form errors
- Dialog accessibility
- Semantic HTML
- Interactive element size
- Screen-reader context

Do not rely only on color to communicate state.

Example:

```text
Red badge
```

should ideally also contain meaningful text:

```text
متأخر
```

---

# Icon Review

Icons should support comprehension.

Use icons for:

- Familiar actions
- Status
- Navigation
- Search
- Add
- Edit
- Delete
- Filter

Avoid:

- Decorative icon overload
- Icons without meaning
- Inconsistent icon families
- Random icon sizes

Prefer the project's existing icon library.

---

# Consistency Review

Compare the current screen with nearby screens.

Check:

```text
Page Header
Button style
Input style
Card style
Table style
Badge style
Modal style
Spacing
Typography
Colors
```

The new page should feel like it belongs to the same application.

---

# Regression Review

When redesigning an existing screen, verify that you did not remove:

- Existing functionality
- Filters
- Actions
- Permissions
- API calls
- URL state
- Business rules
- Keyboard behavior

Visual improvement must not become functional regression.

---

# Prioritization Framework

Not every problem deserves equal attention.

Classify issues:

## P0 — Broken

Examples:

- Layout broken
- Feature unusable
- Mobile overflow
- Wrong RTL direction
- Runtime error

Fix immediately.

---

## P1 — Major UX Problem

Examples:

- Primary action unclear
- Important information buried
- Bad responsive composition
- Confusing navigation
- Poor hierarchy

Fix before polish.

---

## P2 — Visual Inconsistency

Examples:

- Wrong spacing
- Wrong radius
- Inconsistent typography
- Incorrect colors
- Misaligned elements

Fix after structural issues.

---

## P3 — Polish

Examples:

- Subtle hover state
- Minor shadow adjustment
- Tiny spacing improvement
- Micro-animation

Fix last.

---

# One Iteration = One Goal

Each review pass should have a purpose.

Examples:

```text
Iteration 1
Fix layout hierarchy

Iteration 2
Fix spacing and density

Iteration 3
Fix responsive behavior

Iteration 4
Fix RTL

Iteration 5
Fix UI states

Iteration 6
Polish interactions
```

Avoid changing unrelated things simultaneously.

---

# Change the Highest-Impact Problem First

When several issues exist, ask:

> Which single problem most harms usability or visual quality?

Fix that first.

Then review again.

---

# Do Not Rewrite Unnecessarily

If 90% of the page works:

Do not rewrite 100% of it.

Modify the problematic 10%.

Preserve stable components.

---

# Before / After Thinking

For every major change, understand:

```text
Current problem
        ↓
Proposed change
        ↓
Expected improvement
```

Example:

```text
Problem:
Toolbar is crowded.

Change:
Move secondary actions into More menu on mobile.

Result:
Primary search and filters become easier to use.
```

---

# Screenshot-Based Review

When screenshots or visual references are available, compare:

### Layout

- Relative positions
- Widths
- Section ordering

### Hierarchy

- Which elements dominate?
- Which elements are secondary?

### Density

- Amount of visible information
- Spacing between groups

### Styling

- Surfaces
- Borders
- Radius
- Typography
- Color treatment

Do not copy pixels blindly.

Extract the underlying design decisions.

---

# Visual Review Without Screenshot

If direct visual inspection is unavailable, perform a code-level review using:

- Component structure
- CSS classes
- Layout rules
- Responsive breakpoints
- Existing design tokens
- Similar screens

Be explicit about uncertainty.

Do not claim to have visually inspected something you could not inspect.

---

# Review Report Format

When appropriate, summarize findings internally in this structure:

```text
Visual Review

P0
- ...

P1
- ...

P2
- ...

P3
- ...

Next iteration:
- ...
```

Focus implementation on the highest-priority findings.

---

# Final Quality Gate

Before declaring the interface finished:

## Visual

- [ ] Clear hierarchy
- [ ] Consistent spacing
- [ ] Consistent typography
- [ ] Correct surfaces
- [ ] Correct colors
- [ ] Appropriate density

## Layout

- [ ] Correct alignment
- [ ] No unnecessary whitespace
- [ ] No overcrowding
- [ ] No accidental overflow

## Responsive

- [ ] Desktop
- [ ] Tablet
- [ ] Mobile

## RTL

- [ ] Direction
- [ ] Alignment
- [ ] Navigation
- [ ] Actions
- [ ] Directional icons
- [ ] LTR technical values

## Interaction

- [ ] Hover
- [ ] Focus
- [ ] Active
- [ ] Disabled
- [ ] Loading
- [ ] Success
- [ ] Error

## States

- [ ] Loading
- [ ] Empty
- [ ] Error
- [ ] Permission
- [ ] Partial data

## Accessibility

- [ ] Keyboard
- [ ] Focus
- [ ] Labels
- [ ] Contrast
- [ ] Semantic structure

## Consistency

- [ ] Existing components reused
- [ ] Existing design tokens respected
- [ ] Nearby screens match
- [ ] No unnecessary global changes

---

# Golden Rule

## The first implementation is a draft, not the final result.

The correct workflow is:

```text
Build
 ↓
Review
 ↓
Identify the biggest problem
 ↓
Fix it
 ↓
Review again
 ↓
Repeat
 ↓
Polish
```

High-quality frontend work comes from **intentional iteration**, not from trying to get every detail perfect in the first pass.
