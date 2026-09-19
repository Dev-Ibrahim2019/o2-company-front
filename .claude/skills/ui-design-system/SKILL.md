---
name: ui-design-system
description: Defines, preserves, and evolves a production-grade UI design system for React, Tailwind CSS, and shadcn-style applications. Use when creating or modifying pages, components, layouts, forms, dashboards, tables, modals, navigation, or any visual interface. Inspects the existing design tokens, CSS variables, Tailwind configuration, component library, themes, RTL rules, typography, spacing, surfaces, states, and visual patterns before introducing new styles. Prevents visual inconsistency, arbitrary styling, duplicated components, and accidental design-system overrides.
---

---

# UI Design System

## Purpose

Build interfaces as parts of a coherent design system rather than as isolated collections of Tailwind classes.

The design system is the visual contract of the application.

Every new page, component, modal, table, form, card, navigation element, dashboard, and interaction must follow the existing system unless the task explicitly requires extending it.

The goal is:

- consistent visual language
- predictable component behavior
- reusable tokens
- controlled visual hierarchy
- responsive behavior
- RTL correctness
- light/dark theme compatibility
- accessible states
- scalable CRM/admin interfaces
- minimal visual drift between screens

Do not create a new visual language for every feature.

---

# 1. FIRST: Inspect the Existing Design System

Before writing UI code, inspect the project.

Look for:

- `globals.css`
- `index.css`
- `app.css`
- `tailwind.config.*`
- `components.json`
- `components/ui/*`
- theme providers
- theme utilities
- CSS variable definitions
- font configuration
- shared layout components
- shared button/input/card components
- utility classes
- design-token files
- existing pages that visually represent the application's current standard

For this project, treat the existing CSS variables and theme definitions as the primary design source.

Important existing concepts include:

### Brand

- `--o2-brand`
- `--o2-brand-hover`
- `--o2-brand-soft`
- `--o2-brand-ring`
- `--o2-brand-text`

### Gold

- `--o2-gold`
- `--o2-gold-hover`
- `--o2-gold-soft`
- `--o2-gold-text`

### Surfaces

- `--o2-bg`
- `--o2-surface`
- `--o2-surface-raised`
- `--o2-surface-muted`

### Content

- `--o2-text`
- `--o2-muted`

### Borders

- `--o2-border`

### Semantic states

- `--o2-success`
- `--o2-success-soft`
- `--o2-success-text`
- `--o2-warning`
- `--o2-warning-soft`
- `--o2-warning-text`
- `--o2-danger`
- `--o2-danger-soft`
- `--o2-info`
- `--o2-info-soft`

### Elevation

- `--o2-card-shadow`

Do not replace these tokens with a second competing token system unless there is a strong architectural reason.

---

# 2. Design-System Hierarchy

Think in this hierarchy:

```text
Brand
  ↓
Design Tokens
  ↓
Theme
  ↓
Primitives
  ↓
Components
  ↓
Patterns
  ↓
Pages
```

Never solve a global design problem at the page level if it belongs at a lower level.

For example:

Bad:

```tsx
<div className="bg-[#a30000] rounded-[17px] shadow-[...]">
```

Better:

```tsx
<Button variant="default">
```

Or:

```tsx
<div className="bg-[var(--o2-brand)] rounded-lg">
```

when a semantic component does not exist yet.

Best:

Create or reuse a semantic component/token when the pattern is repeated.

---

# 3. Existing Project Is the Source of Truth

Do NOT assume that Tailwind's default palette represents this application.

Do NOT blindly introduce:

```text
bg-red-500
bg-blue-600
text-gray-500
rounded-3xl
shadow-2xl
```

when equivalent application tokens already exist.

The project already contains compatibility bridges mapping legacy Tailwind classes into the application's visual language.

Understand those bridges before modifying them.

For example, existing mappings translate legacy classes such as:

```text
bg-slate-950
bg-slate-900
bg-slate-800
bg-red-500
bg-blue-600
text-slate-400
border-slate-700
shadow-xl
```

into O2 design tokens.

Therefore:

### Prefer

```tsx
bg-[var(--o2-surface)]
text-[var(--o2-text)]
border-[var(--o2-border)]
```

or existing semantic components.

### Avoid

introducing arbitrary colors merely because Tailwind makes them easy to write.

---

# 4. Design Tokens

All repeated visual decisions should eventually become tokens.

Primary token categories:

```text
Color
Typography
Spacing
Radius
Border
Shadow
Elevation
Motion
Opacity
Z-index
Breakpoints
Density
```

Do not create tokens for every individual element.

Create tokens for decisions that are reused.

---

# 5. Color System

Use semantic colors instead of raw colors.

The system should conceptually contain:

```text
Brand
Brand Hover
Brand Soft
Brand Ring
Brand Text

Accent / Gold
Accent Hover
Accent Soft
Accent Text

Background
Surface
Raised Surface
Muted Surface

Primary Text
Muted Text
Border

Success
Success Soft
Success Text

Warning
Warning Soft
Warning Text

Danger
Danger Soft
Danger Text

Info
Info Soft
```

When creating a new UI:

Ask:

1. Is this element primary?
2. Is it secondary?
3. Is it informational?
4. Is it destructive?
5. Is it a success state?
6. Is it a warning?
7. Is it disabled?
8. Is it selected?
9. Is it interactive?
10. Is it purely decorative?

Then choose the semantic token.

Do not invent colors because they "look nice".

---

# 6. Brand Usage

The O2 brand color is:

```text
#A30000
```

with the existing darker hover state:

```text
#7A0000
```

The gold accent is:

```text
#C8A44E
```

Use these through existing variables whenever possible.

Do not repeatedly hardcode:

```css
#a30000
#7a0000
#c8a44e
```

Prefer:

```css
var(--o2-brand)
var(--o2-brand-hover)
var(--o2-gold)
```

This preserves theme consistency and makes future brand changes possible.

---

# 7. Typography

The existing application uses:

```text
Cairo
Tajawal
Arial
sans-serif
```

for the main Arabic UI.

Respect the existing typography system.

Use typography hierarchy intentionally:

```text
Display
Page title
Section title
Card title
Body
Secondary text
Caption
Label
Helper text
```

Do not make every heading large and bold.

CRM interfaces should prioritize:

- readability
- information density
- hierarchy
- scanning
- consistent line-height

Arabic text should never be treated as an afterthought.

---

# 8. Typography Rules for Arabic RTL

For Arabic interfaces:

- preserve RTL direction
- use Arabic-compatible fonts
- maintain comfortable line-height
- avoid excessive letter-spacing
- avoid uppercase transformations
- do not use English-oriented typography rules blindly
- ensure numbers remain visually readable
- support LTR fields where necessary

Fields such as:

```text
Email
Phone
URL
Amounts
IDs
Account numbers
Transaction numbers
Dates
```

may require:

```css
direction: ltr;
text-align: left;
unicode-bidi: plaintext;
```

Use the existing project convention instead of recreating it.

---

# 9. Spacing System

Use a consistent spacing rhythm.

Prefer existing Tailwind spacing values and established project patterns.

Typical hierarchy:

```text
xs   → micro spacing
sm   → compact spacing
md   → normal spacing
lg   → section spacing
xl   → major separation
2xl  → page-level separation
```

Avoid arbitrary values such as:

```text
mt-[13px]
gap-[19px]
px-[27px]
```

unless the visual requirement genuinely demands them.

For CRM/admin interfaces, prioritize compact but breathable layouts.

---

# 10. Radius System

The project intentionally normalizes many excessive Tailwind radius utilities.

Respect the existing visual direction.

Default application surfaces should generally use restrained radii.

Prefer:

```text
rounded-md
rounded-lg
```

or the project's shared component radius.

Do not introduce excessive:

```text
rounded-3xl
rounded-[3rem]
rounded-[4rem]
```

unless the component is intentionally decorative.

Use `rounded-full` only for:

- avatars
- status pills
- tags
- circular controls
- badges
- compact indicators

---

# 11. Shadows and Elevation

Use shadows to establish hierarchy, not decoration.

The project already defines:

```text
--o2-card-shadow
```

and additional card-depth patterns.

Use elevation levels conceptually:

```text
Level 0 → flat surface
Level 1 → card
Level 2 → elevated card
Level 3 → dropdown/popover
Level 4 → modal/dialog
Level 5 → critical overlay
```

Avoid putting strong shadows on everything.

A CRM should feel structured, not floating.

---

# 12. Surface Hierarchy

Every interface should have clear surface levels.

Example:

```text
Application Background
    ↓
Surface
    ↓
Raised Surface
    ↓
Interactive Surface
    ↓
Overlay
```

For the existing system:

```text
--o2-bg
--o2-surface
--o2-surface-raised
--o2-surface-muted
```

Use them consistently.

Do not create five visually indistinguishable card backgrounds.

Each surface should communicate hierarchy.

---

# 13. Borders

Borders should be subtle and structural.

Use:

```text
--o2-border
```

for standard boundaries.

Do not create random border colors for individual components.

Borders should communicate:

- separation
- containment
- input boundaries
- selected states
- hierarchy

They should not dominate the interface.

---

# 14. Semantic States

Every interactive component should have appropriate states.

At minimum consider:

```text
default
hover
focus
active
selected
disabled
loading
error
success
warning
```

For example:

### Button

```text
default
hover
active
focus
disabled
loading
```

### Input

```text
default
focus
error
disabled
readonly
```

### Table row

```text
default
hover
selected
disabled
```

### Status badge

```text
success
warning
danger
info
neutral
```

Do not rely solely on color.

Combine:

- color
- icon
- text
- shape
- position

when necessary.

---

# 15. Component Variants

When a component has meaningful visual variations, use variants instead of duplicating components.

Preferred architecture:

```tsx
<Button variant="primary" size="sm" />
<Button variant="secondary" size="sm" />
<Button variant="destructive" size="sm" />
```

rather than:

```tsx
<RedButton />
<BlueButton />
<SmallRedButton />
<DeleteButton />
```

When shadcn-style components are present, follow the existing variant architecture.

If the project uses CVA, preserve the existing CVA conventions.

---

# 16. shadcn/ui Integration

When shadcn/ui exists in the project:

- reuse existing components
- inspect their source
- preserve their API
- extend variants when appropriate
- customize tokens instead of duplicating components
- compose components rather than rebuilding primitives

Common primitives include:

```text
Button
Input
Textarea
Select
Checkbox
Radio
Switch
Dialog
Sheet
Popover
DropdownMenu
Tooltip
Tabs
Card
Badge
Alert
Table
Form
```

Do not create a custom primitive when an existing primitive already solves the problem.

---

# 17. Component Customization

When a shadcn component does not visually match the project:

First modify its design through:

1. existing tokens
2. variants
3. component classes
4. composition
5. theme variables

Only then consider creating a new component.

Do not copy the component into another folder simply to make a small visual change.

---

# 18. CRM Density

This application is an administrative/CRM system.

Optimize for:

```text
high information density
fast scanning
clear grouping
minimal wasted space
predictable controls
strong hierarchy
keyboard usability
responsive behavior
```

Do not blindly follow marketing-site spacing.

A CRM dashboard does not need huge empty hero sections.

Cards should contain useful information.

Tables should be compact but readable.

Forms should minimize unnecessary vertical scrolling.

---

# 19. Cards

A good CRM card should have:

```text
clear purpose
title/header
primary content
optional metadata
optional actions
consistent padding
controlled elevation
```

Avoid:

```text
card inside card inside card
```

unless hierarchy genuinely requires it.

Do not make every section a card.

Use plain layout sections when a card adds no semantic value.

---

# 20. Buttons

Buttons should communicate hierarchy.

Recommended conceptual hierarchy:

```text
Primary
Secondary
Outline
Ghost
Destructive
Success
Link
Icon-only
```

A screen should usually have one visually dominant primary action.

Avoid making every button red.

Brand color should communicate importance.

---

# 21. Forms

Forms should use the design system's:

```text
Label
Input
Select
Textarea
Checkbox
Radio
Switch
Helper text
Error message
```

Maintain consistent:

```text
label spacing
input height
border
radius
focus ring
error state
disabled state
```

Never create a completely different input design for one page.

---

# 22. Tables

Tables are first-class CRM components.

Maintain consistency across:

```text
header
row height
cell padding
alignment
sorting
filtering
selection
pagination
empty state
loading state
responsive behavior
```

Arabic text should generally be RTL.

Numbers, amounts, IDs, and technical values may require LTR alignment.

Do not center every table cell.

Use semantic alignment:

```text
Text → right
Numbers → appropriate numeric alignment
Actions → consistent edge
Status → center or right depending on layout
```

---

# 23. Status Colors

Use semantic status tokens.

Example:

```text
Success → completed / active / paid
Warning → pending / attention
Danger → failed / deleted / critical
Info → informational
Neutral → inactive / unknown
```

Do not use green/red merely as decoration.

A status color must communicate meaning.

---

# 24. Theme Support

The project supports dark and light themes.

Do not write components that only work in dark mode.

Test:

```text
dark
light
```

before considering the component complete.

Avoid hardcoded:

```text
bg-white
text-black
bg-black
```

when they conflict with semantic theme tokens.

If literal white is required for a specific component, make sure it is intentional and does not break the theme.

---

# 25. Existing Legacy Tailwind Compatibility

This project contains compatibility bridges for older screens.

Do not casually remove or rewrite those bridges.

Before changing global CSS:

1. determine why the rule exists
2. identify affected pages
3. identify whether it is legacy compatibility
4. check CRM-specific exceptions
5. test both themes
6. verify existing screens

Global CSS changes can silently affect the entire application.

Treat global CSS as infrastructure.

---

# 26. Avoid `!important` by Default

Do not add:

```css
!important
```

unless there is a demonstrated cascade/integration reason.

Before using it, determine:

- which layer currently wins
- whether CSS specificity is the issue
- whether Tailwind layer ordering is involved
- whether a component variant can solve it
- whether the selector can be scoped

Existing compatibility rules may use `!important`.

Do not copy that strategy into new components without justification.

---

# 27. Gradients

Gradients are allowed only when they serve the visual language.

Good uses:

- subtle brand backgrounds
- intentional hero areas
- decorative accents
- selected visual sections

Avoid:

- gradient on every card
- gradient buttons everywhere
- excessive colorful backgrounds
- gradients used to compensate for weak hierarchy

The interface should remain professional.

---

# 28. Glass Effects

The project contains a `glass-surface` pattern.

Use glass effects selectively.

Good:

```text
floating navigation
bottom navigation
overlays
special floating controls
```

Avoid using glass everywhere.

Excessive blur reduces clarity and can harm readability.

---

# 29. Decorative Effects

Background grids, blobs, glowing shapes, and decorative effects may be used when they belong to the relevant page style.

However:

Do not automatically apply the login-page visual language to the CRM.

A decorative login screen can have:

```text
background grid
blurred blobs
large rounded card
dramatic shadow
```

The CRM dashboard should generally prioritize:

```text
clarity
data
hierarchy
navigation
productivity
```

Different surfaces may share tokens without sharing the same composition.

---

# 30. Reference Image Extraction

When the user provides a design reference:

Do not copy the page literally.

Extract its:

```text
color relationships
typography hierarchy
spacing rhythm
surface hierarchy
component shape
border treatment
shadow style
button treatment
navigation style
information density
interaction states
```

Then translate those decisions into the application's existing tokens.

Example:

Reference:

```text
dark surface
thin border
subtle shadow
red accent
compact card
```

Implementation:

```text
--o2-bg
--o2-surface
--o2-border
--o2-card-shadow
--o2-brand
```

The result should feel inspired by the reference while remaining native to the application's design system.

---

# 31. New Token Decision Rule

Before adding a new token, ask:

```text
Does an existing token already represent this concept?
```

If yes:

Reuse it.

If no:

Ask:

```text
Will this value be reused?
```

If no:

Prefer a local style.

If yes:

Create a semantic token.

Never create:

```text
--red-card-title
--customer-red
--invoice-red
--dashboard-red
```

when all represent the same semantic brand color.

---

# 32. Avoid Arbitrary Values

Avoid excessive:

```text
w-[437px]
h-[63px]
gap-[17px]
rounded-[19px]
text-[13.5px]
shadow-[...]
```

Arbitrary values are acceptable when:

- matching a precise design reference
- solving a real layout constraint
- implementing a special visualization
- integrating an external design requirement

Otherwise use the design system.

---

# 33. Responsive Design

The design system must work across:

```text
mobile
tablet
laptop
desktop
large desktop
```

Do not create desktop-only components.

For dense CRM screens:

### Desktop

Use:

```text
multi-column layouts
sidebars
wide tables
toolbars
filter panels
```

### Tablet

Adapt:

```text
columns
navigation
actions
table density
```

### Mobile

Prefer:

```text
stacked sections
horizontal scrolling where appropriate
bottom sheets
compact action menus
cards instead of impossible tables
collapsible filters
```

Never simply shrink the desktop UI.

---

# 34. RTL Design System

The application is RTL-first.

Design components with RTL in mind.

Prefer logical properties where possible:

```css
margin-inline
padding-inline
inset-inline
border-inline
text-align: start
```

Avoid unnecessary:

```css
margin-left
margin-right
left
right
```

unless the element genuinely requires physical positioning.

Icons that represent directional movement may need mirroring.

Examples:

```text
ChevronRight
ArrowRight
Back
Forward
```

Do not blindly mirror:

```text
calendar
phone
search
settings
```

---

# 35. Iconography

Use one consistent icon system.

If the project uses Lucide or another established icon library:

- reuse it
- maintain consistent stroke width
- maintain consistent icon size
- avoid mixing unrelated icon styles
- avoid emoji as UI icons

Common sizes:

```text
14px → compact metadata
16px → standard controls
18px → buttons
20px → navigation
24px → prominent actions
```

Follow the existing project convention.

---

# 36. Focus and Accessibility

Every interactive component must have a visible focus state.

Use the existing brand focus ring:

```text
--o2-brand-ring
```

when appropriate.

Do not remove outlines without providing an accessible replacement.

Ensure:

- sufficient contrast
- keyboard access
- visible focus
- disabled state clarity
- meaningful labels
- icon-only buttons have accessible names

---

# 37. Visual Hierarchy

Before styling a page, identify:

```text
Primary information
Secondary information
Supporting information
Actions
Status
Navigation
```

Then express hierarchy through:

```text
size
weight
spacing
surface
contrast
position
color
```

Do not use color as the only hierarchy mechanism.

---

# 38. Design-System Consistency Check

Before finishing a UI task, inspect it against nearby screens.

Ask:

### Typography

- Is the same font used?
- Are heading sizes consistent?
- Is line-height appropriate?

### Color

- Are semantic tokens used?
- Are raw colors avoided?
- Does dark mode work?
- Does light mode work?

### Spacing

- Is the spacing rhythm consistent?
- Are arbitrary values justified?

### Radius

- Are radii consistent?

### Shadows

- Is elevation intentional?

### Components

- Could an existing component be reused?

### States

- Are hover/focus/disabled/loading/error states handled?

### RTL

- Does the layout work correctly in Arabic?

### Responsive

- Does the design adapt rather than merely shrink?

---

# 39. Do Not Over-Design

Avoid automatically adding:

```text
gradients
glassmorphism
giant shadows
huge rounded corners
glowing borders
animated backgrounds
decorative blobs
excessive icons
```

A professional CRM should feel intentional.

Use visual effects only when they improve:

```text
hierarchy
feedback
brand recognition
navigation
comprehension
```

---

# 40. Do Not Over-Abbreviate

Do not compress useful UI information just to make a card smaller.

Bad:

```text
Cust.
Ord.
Inv.
```

unless the product's established language already uses these abbreviations.

Arabic CRM interfaces should prioritize clear terminology.

---

# 41. Design System Extension Workflow

When a new visual requirement appears:

### Step 1

Inspect existing tokens.

### Step 2

Inspect existing components.

### Step 3

Inspect similar screens.

### Step 4

Determine whether the requirement is:

```text
existing pattern
new variant
new pattern
new token
```

### Step 5

Reuse the lowest existing abstraction possible.

### Step 6

Only extend the design system if necessary.

### Step 7

Apply the extension consistently.

### Step 8

Verify all affected themes and responsive states.

---

# 42. When the User Says "Make It Like v0"

Interpret this as:

```text
high-quality generated UI
strong visual hierarchy
clean component composition
consistent design tokens
shadcn-style primitives
Tailwind-friendly implementation
responsive behavior
polished states
production-ready structure
```

Do NOT interpret it as:

```text
copy v0's exact colors
copy v0's exact page
invent a new component library
replace the application's branding
```

The application's existing design system remains authoritative.

---

# 43. When the User Provides a Screenshot

Analyze it in this order:

```text
1. Overall visual language
2. Layout
3. Typography
4. Color
5. Surfaces
6. Borders
7. Radius
8. Shadows
9. Components
10. Spacing
11. Interaction states
12. Responsive behavior
13. RTL implications
```

Then map those findings onto existing project tokens.

Do not immediately start writing JSX.

---

# 44. Production Rule

A design system change is not complete when it looks correct in one component.

It is complete when:

```text
existing components remain stable
new component follows tokens
dark mode works
light mode works
RTL works
responsive behavior works
focus states work
semantic states work
no unnecessary duplication exists
no unnecessary global CSS was introduced
```

---

# 45. Final Design-System Checklist

Before completing any UI implementation:

```text
[ ] Existing design system inspected
[ ] Existing components reused where possible
[ ] Existing tokens reused
[ ] No unnecessary new colors
[ ] No unnecessary new spacing tokens
[ ] No unnecessary arbitrary values
[ ] Typography follows project system
[ ] Arabic RTL supported
[ ] LTR technical fields handled
[ ] Dark mode verified
[ ] Light mode verified
[ ] Responsive behavior verified
[ ] Focus states verified
[ ] Disabled states verified
[ ] Loading states verified
[ ] Error states verified
[ ] Success/warning states verified
[ ] Component variants used appropriately
[ ] Global CSS changes justified
[ ] No unnecessary !important
[ ] No excessive gradients
[ ] No excessive glass effects
[ ] No excessive shadows
[ ] No excessive rounded corners
[ ] Visual hierarchy is clear
[ ] CRM density is appropriate
[ ] Nearby screens remain visually consistent
```

---

# Core Rule

> **Do not style every component independently. Build every component as a member of the same visual system.**

The correct implementation is not the one with the most beautiful individual component.

The correct implementation is the one where the entire application feels like it was designed by one system.
