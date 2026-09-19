---
name: rtl-arabic
description: Designs, implements, and reviews Arabic RTL interfaces correctly across React, Tailwind CSS, shadcn/ui, CRM dashboards, forms, tables, navigation, dialogs, pagination, and data-heavy applications. Use when building or modifying Arabic interfaces, RTL layouts, directional icons, Arabic typography, mixed RTL/LTR content, numbers, dates, URLs, emails, and bidirectional text. Preserves logical layout behavior, accessibility, and the project's existing Arabic design system.
---

---

# RTL Arabic Skill

## Purpose

Build Arabic interfaces as **true RTL interfaces**, not as LTR interfaces with `direction: rtl` added afterward.

The interface must correctly handle:

- Arabic layout direction
- Logical spacing
- Sidebar positioning
- Navigation
- Breadcrumbs
- Tables
- Forms
- Dialogs
- Dropdowns
- Pagination
- Tabs
- Directional icons
- Arabic typography
- Numbers
- Dates
- Phone numbers
- Emails
- URLs
- Technical identifiers
- Mixed Arabic/English content
- Accessibility
- Responsive behavior

The goal is:

> **Native-feeling Arabic UI, not translated LTR UI.**

---

# 1. Core Principle

Never treat RTL as a final CSS patch.

Bad workflow:

```text
Build LTR UI
      ↓
Add dir="rtl"
      ↓
Fix broken pieces
      ↓
Add overrides
      ↓
More overrides
```

Correct workflow:

```text
RTL from the beginning
      ↓
Logical layout
      ↓
Arabic typography
      ↓
Directional behavior
      ↓
Mixed-content handling
      ↓
Responsive RTL review
```

---

# 2. Inspect the Existing Project

Before implementing or modifying RTL behavior, inspect:

- Global CSS
- Root layout
- `<html dir="rtl">`
- Tailwind configuration
- Tailwind version
- Existing RTL utilities
- Design tokens
- Font configuration
- shadcn/ui components
- Sidebar
- Header
- Navigation
- Tables
- Forms
- Dialogs
- Dropdowns
- Pagination
- Existing LTR exceptions

Search for:

```text
dir=
direction:
text-left
text-right
left-
right-
ml-
mr-
pl-
pr-
space-x-
translate-x-
rounded-l-
rounded-r-
border-l-
border-r-
inset-x-
```

Understand the existing conventions before introducing new ones.

---

# 3. Root RTL Configuration

The application should preferably establish RTL at the document level.

Typical structure:

```html
<html lang="ar" dir="rtl"></html>
```

or through the application's root layout.

Do not repeatedly add:

```tsx
<div dir="rtl">
```

to every component when the application is already globally RTL.

Local `dir` attributes should be used only when a section genuinely requires a different direction.

---

# 4. Arabic Language

For Arabic applications, use the correct language metadata.

Prefer:

```html
<html lang="ar" dir="rtl"></html>
```

This helps with:

- Screen readers
- Browser language behavior
- Text rendering
- Accessibility
- Search engines where relevant

Do not confuse:

```text
lang="ar"
```

with:

```text
dir="rtl"
```

They solve different problems.

---

# 5. Logical Properties

Prefer logical properties over physical left/right properties.

Instead of thinking:

```text
left
right
margin-left
margin-right
padding-left
padding-right
```

think:

```text
start
end
inline-start
inline-end
```

This allows the same components to behave correctly in RTL and LTR contexts.

Prefer logical Tailwind utilities when supported by the project's Tailwind version.

---

# 6. Avoid Physical Direction Assumptions

Be careful with:

```text
ml-*
mr-*
pl-*
pr-*
left-*
right-*
border-l-*
border-r-*
rounded-l-*
rounded-r-*
```

These are physical directions.

They may be correct in some cases, but do not use them automatically.

Ask:

> Is this styling supposed to represent the visual left/right side, or the logical start/end side?

---

# 7. When Physical Direction Is Correct

Physical direction is appropriate when the design explicitly refers to a physical edge.

Examples:

- A decorative line attached to the physical right edge
- A chart axis intentionally placed on the left
- A physical image crop
- A visual effect that should remain on the same physical side

Do not blindly convert every `left`/`right` declaration into logical properties.

Use intent.

---

# 8. Arabic Typography

Use the project's existing Arabic font system.

For this project, the primary font system is:

```text
Cairo
Tajawal
Arial
sans-serif
```

Respect the existing design tokens.

Do not introduce a new Arabic font on individual pages without a strong reason.

Typography must support:

- Arabic glyphs
- Latin text
- Numbers
- Mixed content
- Different font weights

---

# 9. Arabic Font Weight

Arabic fonts can visually appear heavier or lighter than Latin fonts at the same CSS weight.

Therefore do not assume:

```text
font-weight: 600
```

looks identical in Arabic and English.

Review:

- headings
- buttons
- navigation
- table headers
- labels
- badges

Use the minimum weight necessary for hierarchy.

Avoid excessive bold text.

---

# 10. Text Alignment

In a standard Arabic interface:

```text
text-start
```

is usually preferable to:

```text
text-left
```

because `text-start` follows the document direction.

Use:

```text
text-end
```

when the content should align toward the logical end.

Do not blindly use:

```text
text-right
```

throughout the application.

Physical alignment may still be correct for specific elements.

---

# 11. Page Layout

A standard Arabic CRM page should visually read:

```text
┌───────────────────────────────────────────┐
│ Header                              Menu  │
├───────────────────┬───────────────────────┤
│                   │                       │
│     Main          │ Sidebar               │
│     Content       │                       │
│                   │                       │
└───────────────────┴───────────────────────┘
```

The exact sidebar position must follow the project's established shell.

Do not create a separate RTL shell for every page.

Use one consistent application shell.

---

# 12. Sidebar

The Sidebar is one of the most visible RTL elements.

Ensure:

- Navigation starts from the correct logical side
- Active indicator is positioned correctly
- Icons and labels have correct spacing
- Collapse behavior works
- Mobile drawer follows the RTL convention
- Nested navigation remains readable

Do not simply mirror the Sidebar using arbitrary CSS transforms.

---

# 13. Sidebar Icons

Typical Arabic navigation:

```text
[icon] العملاء
[icon] العقارات
[icon] الطلبات
[icon] التقارير
```

Icons should remain visually associated with their labels.

Avoid manually adding:

```text
ml-4
```

everywhere.

Use logical gap/alignment where possible.

---

# 14. Header

Arabic header composition should naturally follow RTL.

For example:

```text
يمين
Logo / Menu / Page Context
                    ←
يسار
Notifications / User / Actions
```

The exact order depends on the project's established design.

The important rule is:

> Do not mirror every element mechanically.

Preserve semantic grouping.

---

# 15. Breadcrumbs

Arabic breadcrumbs should follow reading order.

Example:

```text
الرئيسية ← العملاء ← تفاصيل العميل
```

Do not blindly reuse an English breadcrumb with:

```text
Dashboard → Customers → Customer
```

and simply reverse CSS.

The semantic order should be correct.

---

# 16. Breadcrumb Separators

Be careful with directional separators:

```text
>
<
→
←
```

In RTL, these may need to change depending on their semantic meaning.

Prefer a separator component that understands the intended navigation direction.

Do not treat every arrow as decorative.

---

# 17. Directional Icons

Directional icons are one of the most common RTL mistakes.

Examples:

- ArrowLeft
- ArrowRight
- ChevronLeft
- ChevronRight
- MoveLeft
- MoveRight
- LogIn
- LogOut
- Undo
- Redo

Before using one, determine:

> Is the icon expressing physical direction or logical navigation?

---

# 18. Back Navigation

A "Back" action in Arabic should visually communicate movement toward the previous screen.

For example:

```text
رجوع  ←
```

The exact icon should follow the project's icon convention and RTL behavior.

Do not blindly write:

```tsx
<ArrowLeft />
```

for every "Back" action.

---

# 19. Forward Navigation

Likewise:

```text
التالي  →
```

should communicate forward movement in the current RTL navigation model.

Do not assume that an English "ArrowRight" remains correct after changing the document direction.

---

# 20. Icon Strategy

Prefer semantic abstraction when possible.

For example:

```tsx
<BackIcon />
<NextIcon />
```

can internally choose the correct directional icon.

This prevents every page from manually deciding between:

```text
ArrowLeft
ArrowRight
ChevronLeft
ChevronRight
```

---

# 21. Forms

Arabic forms should naturally align labels and controls.

Typical structure:

```text
┌─────────────────────────────┐
│ اسم العميل                  │
│ [........................]  │
│                             │
│ رقم الهاتف                 │
│ [........................]  │
└─────────────────────────────┘
```

Use:

```text
text-start
```

for labels and content unless a field has a specific alignment requirement.

---

# 22. Form Layout

Desktop:

```text
اسم العميل        اسم العائلة
[...........]     [...........]

رقم الهاتف        البريد الإلكتروني
[...........]     [...........]
```

Mobile:

```text
اسم العميل
[...........]

اسم العائلة
[...........]

رقم الهاتف
[...........]
```

RTL should remain correct throughout responsive changes.

---

# 23. Input Text Direction

Not every input should be RTL.

Examples:

### Arabic name

```text
direction: rtl
```

### Email

```text
direction: ltr
```

### URL

```text
direction: ltr
```

### Phone number

Usually:

```text
direction: ltr
```

### Technical ID

Usually:

```text
direction: ltr
```

### Account code

Usually:

```text
direction: ltr
```

Do not force all input values into RTL.

---

# 24. Input Placeholder

Placeholder language should follow the field's intended content.

Examples:

```text
ابحث عن عميل...
```

for Arabic search.

But:

```text
example@email.com
```

should remain visually appropriate for an email field.

---

# 25. Search Inputs

Arabic search:

```text
[ 🔍  ابحث عن العملاء... ]
```

The search icon should remain correctly positioned relative to the text and field direction.

Avoid manually placing icons using:

```text
left: 12px
```

unless that is intentionally physical.

Prefer the component's directional layout.

---

# 26. Input Icons

Common examples:

```text
Search
Calendar
User
Phone
Mail
Lock
```

The icon should maintain a logical relationship with the input content.

Avoid:

```text
absolute left-3
```

for every icon.

Prefer:

```text
flex
gap
logical positioning
```

where possible.

---

# 27. Password Inputs

Password inputs require special attention.

Arabic interface:

```text
كلمة المرور             [••••••••] [👁]
```

The visibility button must remain easy to discover and correctly aligned.

Do not accidentally move the icon into the text content area.

---

# 28. Select and Combobox

Dropdown content should respect RTL.

Example:

```text
الحالة
[ نشط                         ▼ ]
```

The menu should align appropriately with the trigger.

Check:

- trigger alignment
- menu alignment
- selected indicator
- search field
- keyboard navigation
- command menu
- check icons

---

# 29. Dropdown Menus

For Arabic interfaces, menus should normally align according to logical direction.

Avoid manually forcing:

```text
left-0
```

or:

```text
right-0
```

without understanding the component's intended alignment.

Use the positioning system provided by the UI primitive where possible.

---

# 30. Dialogs

Dialog content should use RTL.

Example:

```text
┌─────────────────────────────────┐
│ إضافة عميل                 ×    │
│                                 │
│ اسم العميل                      │
│ [.............................] │
│                                 │
│              [إلغاء] [حفظ]      │
└─────────────────────────────────┘
```

Buttons should follow the project's Arabic action hierarchy.

Do not mechanically reverse every button.

---

# 31. Dialog Close Button

The close button may appear at the logical end of the dialog header.

However, if the project's design system establishes a physical corner convention, follow that system consistently.

The key requirement is consistency.

---

# 32. Sheets and Drawers

A Sheet in RTL may open from the logical side.

For example:

```text
┌─────────────────────────────┐
│                             │
│          Page               │
│                             │
│                   ┌─────────┤
│                   │ Sheet   │
│                   │         │
│                   │         │
└───────────────────┴─────────┘
```

But do not assume every Sheet must open from the right.

Use the intended interaction:

- navigation drawer
- filter sheet
- details panel
- action panel

and follow the project's established direction.

---

# 33. Tables

Tables are especially important in CRM systems.

Arabic table:

```text
┌────────────┬────────────┬───────────┐
│ العميل     │ الحالة     │ الهاتف    │
├────────────┼────────────┼───────────┤
│ أحمد       │ نشط        │ 059...    │
└────────────┴────────────┴───────────┘
```

Ensure:

- Header alignment
- Cell alignment
- Actions column
- Checkbox column
- Sorting indicators
- Pagination
- Horizontal scrolling

all behave correctly in RTL.

---

# 34. Table Alignment

Do not force every table cell to:

```text
text-right
```

Different data types may need different alignment.

Typical approach:

### Arabic text

```text
text-start
```

### Numeric values

Often:

```text
text-end
```

or a deliberate numeric alignment.

### Dates

Follow the project's data formatting convention.

### Technical IDs

Often:

```text
text-start
```

with LTR direction.

---

# 35. Numeric Data

Numbers require special care.

Examples:

```text
1,250.00
₪ 4,500
25%
2026
```

Do not assume Arabic UI means Arabic-Indic numerals everywhere.

Use the project's established number formatting convention.

The important requirement is:

> **Consistent and readable numeric presentation.**

---

# 36. Currency

Currency values should have a deliberate presentation.

For example:

```text
₪ 4,500
```

or:

```text
4,500 ₪
```

depending on the project's established convention.

Do not mix formats across pages.

---

# 37. Financial Interfaces

For accounting and financial CRM screens, numeric alignment is especially important.

Examples:

```text
مدين       دائن       الرصيد
1,500.00    —         8,500.00
—           500.00    8,000.00
```

Numbers should be easy to compare vertically.

Do not prioritize RTL over numeric readability.

---

# 38. Dates

Arabic UI may contain:

```text
6 سبتمبر 2026
```

or:

```text
2026/09/06
```

or:

```text
06/09/2026
```

Use the application's existing date format consistently.

Do not change date formatting merely because the page is RTL.

---

# 39. Time

Times can remain visually predictable.

Examples:

```text
10:30 ص
```

or:

```text
10:30 AM
```

depending on the project's localization strategy.

Avoid manually reversing strings.

Use proper locale-aware formatting where available.

---

# 40. Phone Numbers

Phone numbers should generally remain LTR.

Example:

```text
0591234567
```

Use an appropriate LTR wrapper:

```tsx
<span dir="ltr">0591234567</span>
```

when necessary.

Do not allow Arabic shaping or RTL reordering to make phone numbers confusing.

---

# 41. Email Addresses

Emails should remain LTR.

Example:

```text
user@example.com
```

Use:

```html
dir="ltr"
```

or an appropriate CSS direction rule.

Never rely on the surrounding RTL context for email rendering.

---

# 42. URLs

URLs should remain LTR.

Example:

```text
https://example.com/customers/123
```

Do not allow RTL rendering to visually reorder the URL.

Use:

```html
dir="ltr"
```

for technical URLs.

---

# 43. IDs and Codes

Examples:

```text
CUS-000123
INV-2026-00124
ACC-1100
USR-4821
```

These should normally remain LTR.

Consider using:

```tsx
<span dir="ltr">INV-2026-00124</span>
```

when necessary.

---

# 44. Mixed Arabic and English

Mixed text is common in CRM applications.

Examples:

```text
Customer CRM
CRM العملاء
O2 Restaurant
API Status
```

Do not force the entire sentence into one direction if that produces confusing rendering.

Use directional isolation where appropriate.

---

# 45. Bidirectional Text

Mixed RTL/LTR strings can cause unexpected visual ordering.

Be careful with:

- Arabic + English
- Arabic + numbers
- Arabic + IDs
- Arabic + URLs
- Arabic + punctuation

Use `dir="ltr"` or `dir="rtl"` at the smallest meaningful boundary when needed.

Do not globally change direction to solve a local bidi problem.

---

# 46. Technical Content

Code, JSON, SQL, API responses and technical strings should generally remain LTR.

Example:

```json
{
  "status": "active"
}
```

Use:

```text
dir="ltr"
```

for code blocks and technical displays.

---

# 47. Pagination

Pagination requires directional thinking.

Arabic UI might show:

```text
السابق   1  2  3   التالي
```

The visual order must match the project's navigation semantics.

Do not simply translate:

```text
Previous | 1 | 2 | 3 | Next
```

and assume it is correct.

Check:

- labels
- arrows
- disabled state
- active page
- keyboard navigation

---

# 48. Pagination Icons

The arrow associated with:

```text
السابق
```

must communicate moving backward in the current navigation context.

Likewise:

```text
التالي
```

must communicate moving forward.

Use semantic navigation components whenever possible.

---

# 49. Tabs

Arabic tabs should follow reading order.

Example:

```text
المعلومات | النشاط | الطلبات | الملاحظات
```

Do not accidentally reverse the semantic order because the CSS direction changed.

---

# 50. Stepper / Wizard

Multi-step forms require careful RTL handling.

Example:

```text
المعلومات ← البيانات ← المراجعة ← التأكيد
```

The visual flow should communicate the correct sequence.

Do not simply mirror the stepper if doing so changes the meaning of the progression.

---

# 51. Status Indicators

Status indicators should remain associated with their labels.

Example:

```text
● نشط
● قيد الانتظار
● متوقف
```

Do not use physical positioning assumptions such as:

```text
left: 8px
```

for status dots.

Prefer flex/grid relationships.

---

# 52. Badges

Arabic badges may become wider than their English equivalents.

Test:

- short labels
- long labels
- Arabic text
- mixed text

Avoid fixed widths for badges.

Prefer:

```text
inline-flex
whitespace-nowrap
```

when appropriate.

---

# 53. Action Buttons

Arabic button text can have different widths.

Examples:

```text
إضافة عميل
حفظ التغييرات
إلغاء
حذف العميل
تصدير التقرير
```

Do not hardcode button widths simply because the English version had a particular width.

Let content determine size unless a design system constraint exists.

---

# 54. Button Icons

For non-directional actions:

```text
[+ إضافة عميل]
[↓ تصدير]
[🗑 حذف]
```

the icon placement should follow the project's established visual convention.

For directional actions, icon direction must be semantically correct.

Do not automatically put every icon on the same side.

---

# 55. Toasts and Notifications

Arabic toast messages should:

- align correctly
- support multi-line text
- avoid clipping
- remain readable
- place action buttons correctly

Do not use fixed-width notification containers that break with long Arabic text.

---

# 56. Tooltips

Tooltips should:

- support Arabic
- remain readable
- avoid clipping
- not depend exclusively on hover
- work with keyboard focus

Remember:

> Tooltips supplement labels; they should not replace essential labels on mobile.

---

# 57. Accessibility

RTL implementation must preserve accessibility.

Check:

- `lang="ar"`
- `dir="rtl"`
- keyboard navigation
- focus order
- accessible labels
- form labels
- dialog focus trapping
- menu navigation
- screen-reader semantics

Visual mirroring must never break logical keyboard order.

---

# 58. Keyboard Navigation

Do not assume that visual RTL means keyboard behavior should be mechanically reversed.

Keyboard interaction must follow the component's semantics.

For example:

- Tab should follow logical DOM order
- Enter should activate controls
- Escape should close overlays
- Arrow keys should follow the component's documented interaction model

Do not manipulate DOM order purely for visual mirroring.

---

# 59. DOM Order vs Visual Order

Do not abuse:

```css
order
```

to visually reverse everything.

The DOM should maintain a logical and accessible structure.

Use CSS direction and appropriate layout systems rather than creating confusing DOM order.

---

# 60. Flexbox

Remember that RTL changes the meaning of the flex direction context.

Do not blindly use:

```text
flex-row-reverse
```

everywhere.

Often:

```text
flex-row
```

inside RTL is already sufficient.

Before adding `flex-row-reverse`, ask:

> Am I fixing a real layout requirement or accidentally double-reversing the interface?

---

# 61. Grid

CSS Grid generally works naturally with RTL.

Do not manually reverse grid items unless the semantic order requires it.

Use:

```text
grid
```

with logical alignment where possible.

Avoid complicated RTL-specific grid hacks.

---

# 62. Space Utilities

Be careful with directional spacing utilities such as:

```text
space-x-*
```

They can produce confusing behavior in RTL depending on implementation and Tailwind version.

Prefer:

```text
gap-*
```

for many modern layouts.

`gap` is often easier to reason about because it describes the relationship between elements rather than a physical side.

---

# 63. Margin and Padding

Prefer:

```text
gap
```

for sibling spacing.

When individual spacing is necessary, prefer logical start/end utilities where available.

Avoid building an entire RTL system from:

```text
ml-*
mr-*
```

overrides.

---

# 64. Borders

Be careful with:

```text
border-l
border-r
```

Ask whether the border belongs to:

- physical left/right
- logical start/end

For navigation and structural separators, logical direction is often more appropriate.

---

# 65. Rounded Corners

RTL does not automatically mean every corner radius should be reversed.

If a component has:

```text
rounded-s-*
rounded-e-*
```

use logical semantics when the radius belongs to the start/end of the component.

If a design intentionally uses physical corners, preserve that design.

---

# 66. Shadows

Shadows generally do not need mirroring.

For example:

```text
box-shadow: 0 18px 45px ...
```

should usually remain the same.

Do not mirror shadows simply because the page is RTL.

Only directional shadows need deliberate review.

---

# 67. Animations

RTL can affect animation direction.

Examples:

- Sidebar entering
- Sheet opening
- Drawer closing
- Carousel movement
- Step transitions
- Navigation arrows

An animation representing navigation should respect the intended direction.

Do not blindly reverse every animation.

---

# 68. Carousels

Carousels require special care.

Determine whether:

- item order is semantic
- swipe direction is meaningful
- arrows indicate navigation
- autoplay direction matters

Do not simply apply:

```text
direction: rtl
```

and assume the carousel logic is correct.

---

# 69. Charts

Charts may need different treatment from standard UI.

Do not blindly reverse:

- X-axis
- Y-axis
- time progression
- financial values
- category order

Charts communicate data semantics, not merely reading direction.

For example, chronological time should usually remain chronological even in an Arabic UI.

---

# 70. Financial Tables and Ledgers

Accounting screens need special care.

For example:

```text
التاريخ | البيان | مدين | دائن | الرصيد
```

The table should remain readable and comparable.

Numeric columns should have consistent alignment.

Do not reverse accounting semantics just because the interface is RTL.

---

# 71. Search and Filter Toolbars

Arabic CRM toolbar:

```text
[بحث........................]

[الحالة] [المسؤول] [التاريخ]        [تصدير] [إضافة]
```

On mobile:

```text
[بحث........................]

[الفلاتر] [المزيد]
```

RTL must remain consistent while preserving responsive composition.

Coordinate this skill with:

```text
responsive-design
```

Do not solve responsive RTL problems independently.

---

# 72. Empty States

Arabic empty state:

```text
لا يوجد عملاء

لم تتم إضافة أي عملاء حتى الآن.

[إضافة عميل]
```

Alignment should follow the component's design.

Do not force all empty states to `text-center` simply because many templates do.

---

# 73. Error Messages

Error messages should be:

- Arabic when appropriate
- readable
- properly aligned
- close to the relevant field
- accessible

Example:

```text
رقم الهاتف
[................]

يرجى إدخال رقم هاتف صحيح.
```

Do not rely solely on color to communicate the error.

---

# 74. Loading States

Arabic loading states should maintain correct alignment.

Examples:

```text
جاري تحميل العملاء...
```

Skeleton layouts should match the RTL layout of the final component.

---

# 75. Existing O2 Design System

This project already has Arabic RTL conventions.

Respect the existing tokens:

```text
Cairo
Tajawal

RTL

#a30000
#7a0000
#c8a44e

O2 surface colors
O2 text colors
O2 muted colors
O2 border colors
```

Do not create a new Arabic design system.

RTL changes direction and language behavior; it does not replace the existing visual identity.

---

# 76. Dark and Light Mode

RTL behavior must remain identical in:

- light mode
- dark mode

Do not create separate RTL layouts for themes.

Only visual tokens should change.

---

# 77. Responsive RTL

Always review RTL together with responsive behavior.

Check:

### Desktop

- Sidebar
- Header
- Toolbar
- Tables

### Tablet

- Collapsed sidebar
- Toolbar wrapping
- Tables
- Forms

### Mobile

- Drawer
- Sheets
- Search
- Filters
- Cards
- Tables
- Dialogs

A component that works in desktop RTL can still break in mobile RTL.

---

# 78. Avoid RTL CSS Hacks

Do not solve RTL issues with large blocks of overrides such as:

```css
[dir="rtl"] .something {
  left: auto;
  right: 0;
}
```

unless the component genuinely requires it.

Prefer:

```text
logical properties
direction-aware components
flex/grid
design tokens
shared primitives
```

---

# 79. Do Not Double-Reverse

One of the most common RTL bugs is applying multiple reversals.

Example:

```text
RTL
+
flex-row-reverse
+
ArrowRight → ArrowLeft
```

may result in a component that is reversed twice.

Before changing direction, inspect:

1. Document direction
2. Flex direction
3. Component positioning
4. Icon direction
5. DOM order

Fix the actual source of the problem.

---

# 80. Do Not Translate Only

A correct Arabic interface is not:

```text
English UI
+
Arabic strings
```

It must also adapt:

- direction
- alignment
- spacing
- navigation
- icons
- typography
- numbers
- dates
- mixed content
- responsive behavior

---

# 81. Do Not Mirror Everything

RTL does not mean:

```text
Mirror the entire screen
```

Some things should not be mirrored:

- Logos
- Brand marks
- Product imagery
- Code
- URLs
- Phone numbers
- Charts where data semantics require fixed order
- Technical identifiers

Always distinguish:

```text
Reading direction
```

from:

```text
Visual/data semantics
```

---

# 82. Component Architecture

Build direction-aware reusable components.

Examples:

```text
PageHeader
Breadcrumbs
Sidebar
MobileNav
SearchInput
FilterBar
DataTable
Pagination
Dialog
Sheet
FormField
StatusBadge
```

Do not solve the same RTL issue separately in every page.

---

# 83. Direction-Aware Utilities

If the project repeatedly needs directional behavior, create reusable abstractions.

Examples:

```text
BackIcon
NextIcon
DirectionalSeparator
LogicalIcon
RtlTable
```

Use abstractions only when they actually reduce duplication.

Do not build a huge RTL framework for simple utilities.

---

# 84. Review Existing shadcn Components

Before modifying a shadcn component:

1. Inspect the existing implementation.
2. Check whether it already supports RTL.
3. Check Radix behavior.
4. Check alignment props.
5. Check positioning.
6. Check keyboard behavior.
7. Check focus behavior.
8. Modify minimally.

Do not rewrite a working primitive just to make one page look correct.

---

# 85. RTL Review Process

After implementing an Arabic page:

## Pass 1 — Direction

Check:

- `lang`
- `dir`
- main layout
- sidebar
- header

## Pass 2 — Alignment

Check:

- headings
- labels
- inputs
- tables
- buttons
- cards

## Pass 3 — Directional Elements

Check:

- arrows
- chevrons
- breadcrumbs
- pagination
- back/next
- drawers

## Pass 4 — Mixed Content

Check:

- phone
- email
- URLs
- IDs
- codes
- numbers

## Pass 5 — Responsive

Check:

- desktop
- tablet
- mobile

## Pass 6 — Accessibility

Check:

- keyboard
- focus
- labels
- screen-reader semantics

---

# 86. RTL Quality Priority

Fix issues in this order:

### P0 — Broken

Examples:

- Text unreadable
- Navigation reversed incorrectly
- Input content reordered incorrectly
- Mobile navigation inaccessible
- Dialog positioning broken

### P1 — Major UX

Examples:

- Wrong directional icons
- Confusing table alignment
- Broken toolbar
- Bad pagination
- Incorrect sidebar behavior

### P2 — Visual

Examples:

- Spacing inconsistency
- Misaligned icons
- Typography issues
- Badge sizing

### P3 — Polish

Examples:

- Minor alignment
- Tiny spacing
- Subtle animation direction

---

# 87. RTL Testing Content

When reviewing an Arabic UI, test realistic strings.

Use examples such as:

```text
أحمد محمد
شركة فلسطين للتطوير العقاري
عميل جديد
قيد المراجعة
تم إكمال الطلب بنجاح
لا توجد بيانات متاحة حالياً
```

Also test:

```text
user@example.com
https://example.com/customers/123
CUS-000123
0591234567
₪ 4,500.00
```

Mixed content is where many RTL bugs become visible.

---

# 88. Arabic Length Testing

Do not test only short strings.

Use long labels such as:

```text
إدارة العملاء المحتملين ومتابعة عمليات التواصل
```

and:

```text
إجمالي قيمة المبيعات المتوقعة خلال الشهر الحالي
```

Long Arabic text exposes:

- fixed-width bugs
- bad wrapping
- toolbar overflow
- button problems
- table problems
- navigation issues

---

# 89. Final RTL Checklist

Before considering an Arabic interface complete:

### Document

- [ ] `lang="ar"`
- [ ] `dir="rtl"`
- [ ] RTL established at the correct root level

### Layout

- [ ] Sidebar follows project convention
- [ ] Header follows logical direction
- [ ] Main content is correctly aligned
- [ ] No accidental mirroring

### Typography

- [ ] Cairo/Tajawal or project font is used
- [ ] Arabic hierarchy is readable
- [ ] Long Arabic text works
- [ ] Font weights are appropriate

### Components

- [ ] Forms work
- [ ] Inputs work
- [ ] Selects work
- [ ] Comboboxes work
- [ ] Dialogs work
- [ ] Sheets work
- [ ] Dropdowns work
- [ ] Tables work
- [ ] Pagination works
- [ ] Tabs work

### Directional UI

- [ ] Back icon is correct
- [ ] Next icon is correct
- [ ] Breadcrumb arrows are correct
- [ ] Pagination arrows are correct
- [ ] Sidebar/drawer direction is correct
- [ ] Directional animations are correct

### Data

- [ ] Numbers are readable
- [ ] Currency is consistent
- [ ] Dates are consistent
- [ ] Phone numbers remain readable
- [ ] Emails remain LTR
- [ ] URLs remain LTR
- [ ] IDs/codes remain LTR
- [ ] Mixed Arabic/English content is readable

### Responsive

- [ ] Desktop RTL works
- [ ] Tablet RTL works
- [ ] Mobile RTL works
- [ ] No accidental horizontal scrolling

### Accessibility

- [ ] Keyboard navigation works
- [ ] Focus order is logical
- [ ] Labels are accessible
- [ ] Dialogs maintain focus correctly
- [ ] Direction is communicated correctly to assistive technology

### Architecture

- [ ] No unnecessary RTL CSS hacks
- [ ] No double-reversal
- [ ] No duplicated RTL implementations
- [ ] Existing design system is preserved
- [ ] Existing shadcn components are reused

---

# Golden Rules

> **RTL is a layout model, not a translation feature.**

> **Use logical direction whenever the design is semantic.**

> **Do not mirror everything.**

> **Do not double-reverse components.**

> **Keep technical content such as URLs, emails, phone numbers, and IDs LTR when appropriate.**

> **Preserve data semantics even when the surrounding interface is RTL.**

> **Build RTL from the beginning, not as a final patch.**

The final mental model should be:

```text
Arabic
  ↓
RTL document
  ↓
Logical layout
  ↓
Correct typography
  ↓
Correct directional behavior
  ↓
Correct mixed-content handling
  ↓
Responsive RTL
  ↓
Accessibility
  ↓
Visual review
```
