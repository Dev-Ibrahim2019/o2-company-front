---
name: accessibility
description: Builds and reviews accessible React interfaces for CRM, admin dashboards, forms, tables, dialogs, navigation, dropdowns, buttons, and data-heavy applications. Use when creating or modifying UI components to ensure semantic HTML, keyboard navigation, focus management, labels, ARIA usage, contrast, touch targets, error handling, screen-reader support, reduced motion, RTL compatibility, and accessible responsive behavior. Prefer native semantics and existing shadcn/Radix accessibility primitives over custom accessibility implementations.
---

---

# Accessibility Skill

## Purpose

Build interfaces that are not only visually polished, but also:

- Keyboard accessible
- Screen-reader accessible
- Semantically structured
- Focus predictable
- Understandable without color alone
- Usable with touch
- Compatible with RTL
- Compatible with responsive layouts
- Robust during loading/error states
- Respectful of reduced motion

Accessibility must be considered **during implementation**, not added as a final patch.

The goal is:

> **Accessible by default, visually excellent by design.**

---

# 1. Core Principle

Do not think:

```text id="x6j1q3"
Build UI
   ↓
Add aria-label
   ↓
Done
```

Instead:

```text id="8t7p4v"
Semantic structure
      ↓
Keyboard behavior
      ↓
Focus behavior
      ↓
Accessible names
      ↓
State communication
      ↓
Visual accessibility
      ↓
Responsive/touch accessibility
      ↓
Review
```

Accessibility is part of component architecture.

---

# 2. Inspect Before Changing

Before modifying accessibility behavior, inspect:

- Existing component library
- shadcn/ui components
- Radix primitives
- Form components
- Button components
- Dialogs
- Sheets
- Dropdowns
- Selects
- Comboboxes
- Tables
- Navigation
- Toast system
- Global CSS
- Focus styles
- Existing accessibility utilities

Do not replace accessible primitives with custom implementations without a strong reason.

---

# 3. Prefer Native HTML

Use semantic HTML whenever possible.

Prefer:

```tsx id="3vckn4"
<button>حذف العميل</button>
```

instead of:

```tsx id="f3yd7p"
<div onClick={deleteCustomer}>حذف العميل</div>
```

Prefer:

```tsx id="r4v8qs"
<a href="/customers">العملاء</a>
```

instead of:

```tsx id="c8r7xm"
<div onClick={goToCustomers}>العملاء</div>
```

Native elements provide accessibility behavior automatically.

---

# 4. Semantic HTML

Use appropriate elements:

```text id="z4q5t6"
<header>
<nav>
<main>
<aside>
<section>
<article>
<footer>
<form>
<button>
<a>
<table>
<thead>
<tbody>
<th>
<td>
<label>
```

Do not use `<div>` for everything.

Semantic structure helps:

- Screen readers
- Keyboard users
- Search engines
- Browser tooling
- Maintainability

---

# 5. Page Structure

A typical CRM page should have a clear semantic structure:

```text id="o4q0f7"
<header>
  Navigation / Context
</header>

<aside>
  Sidebar
</aside>

<main>
  <h1>العملاء</h1>

  Page content
</main>
```

There should generally be one clear primary page heading.

Avoid multiple competing `<h1>` elements.

---

# 6. Heading Hierarchy

Maintain logical hierarchy:

```text id="m1e3h7"
h1
 ├── h2
 │    ├── h3
 │    └── h3
 └── h2
```

Do not choose heading levels merely because of their font size.

Bad:

```text id="7e5w9d"
<h4 className="text-2xl">
```

when the content is actually a primary section.

Visual styling and semantic heading level are separate concerns.

---

# 7. Page Titles

Each page should have a clear title.

Example:

```tsx id="m2s8v1"
<h1>إدارة العملاء</h1>
```

The title should communicate:

- What page the user is on
- What task/context is active

Do not rely solely on breadcrumb text.

---

# 8. Navigation

Use:

```html id="k0f4y9"
<nav></nav>
```

for navigation areas.

For multiple navigation regions, provide accessible names when necessary.

Example:

```tsx id="e8p3m2"
<nav aria-label="التنقل الرئيسي">
```

This helps screen-reader users distinguish navigation regions.

---

# 9. Sidebar Navigation

The CRM Sidebar should be accessible.

Each navigation item should have:

- Accessible name
- Keyboard access
- Visible active state
- Current-route indication
- Sufficient hit area

Use:

```tsx id="n4r7t2"
aria-current="page"
```

for the active page where appropriate.

Do not communicate the active route only through color.

---

# 10. Mobile Navigation

Mobile navigation should support:

- Keyboard
- Touch
- Screen readers
- Escape to close
- Focus management
- Clear close button

If using a shadcn/Radix Sheet or Drawer, prefer the existing primitive rather than manually implementing focus trapping.

---

# 11. Buttons

Use actual buttons for actions.

Correct:

```tsx id="w8r3k1"
<button onClick={handleSave}>حفظ</button>
```

Incorrect:

```tsx id="e5m2q9"
<div onClick={handleSave}>حفظ</div>
```

Buttons should communicate their purpose clearly.

---

# 12. Button Names

A button must have an accessible name.

Good:

```tsx id="q7v2c4"
<Button>إضافة عميل</Button>
```

For icon-only buttons:

```tsx id="a4j8m5"
<Button size="icon" aria-label="حذف العميل">
  <Trash2 />
</Button>
```

Do not use:

```tsx id="b9t6x2"
<Button size="icon">
  <Trash2 />
</Button>
```

without an accessible name.

---

# 13. Icon-Only Actions

Every icon-only action must be understandable without seeing the icon.

Use:

```text id="u2q9h7"
aria-label
```

and optionally:

```text id="d8m1k3"
Tooltip
```

Do not treat a tooltip as a replacement for an accessible name.

---

# 14. Icons Are Not Text

Do not assume that an icon communicates universally.

For example:

```text id="p5r8c2"
🗑
✏️
⋮
+
×
```

may be visually obvious but still ambiguous to assistive technologies.

The semantic action must be exposed through the accessible name.

---

# 15. Decorative Icons

If an icon is purely decorative:

```tsx id="q3w6n8"
<Icon aria-hidden="true" />
```

This prevents screen readers from unnecessarily announcing it.

Examples:

- Decorative separators
- Visual enhancement icons
- Icons repeated next to an already-labeled button

---

# 16. Avoid Redundant Announcements

Avoid structures like:

```text id="z7v2k4"
button "حذف العميل"
  icon "حذف"
  text "حذف العميل"
```

The icon should usually be hidden from assistive technology.

Prefer:

```tsx id="m5t8r1"
<Button aria-label="حذف العميل">
  <Trash2 aria-hidden="true" />
</Button>
```

---

# 17. Forms

Every form control should have a clear accessible label.

Prefer:

```tsx id="h7p4d2"
<Label htmlFor="phone">
  رقم الهاتف
</Label>

<Input id="phone" />
```

Avoid relying solely on placeholder text.

---

# 18. Placeholder Is Not a Label

Do not use:

```tsx id="v8c1s4"
<Input placeholder="أدخل اسم العميل" />
```

as the only identification of the field.

Prefer:

```tsx id="n2q5m7"
<Label htmlFor="name">
  اسم العميل
</Label>

<Input
  id="name"
  placeholder="مثال: أحمد محمد"
/>
```

Placeholder provides an example.

Label provides the field's identity.

---

# 19. Required Fields

Required fields should be communicated clearly.

Use appropriate HTML when possible:

```tsx id="x4n8b2"
required;
```

and communicate visually where appropriate.

Do not rely only on:

```text id="m9c2w6"
red asterisk
```

to communicate required status.

---

# 20. Required Indicator

If using an asterisk:

```text id="r1q6t8"
اسم العميل *
```

ensure assistive technology receives meaningful information.

For example, the field can use:

```text id="k3v7p1"
required
```

while the visual indicator is decorative.

---

# 21. Input Types

Use appropriate input types.

Examples:

```text id="f7x2k5"
email
tel
number
date
password
search
url
```

Correct types improve:

- Mobile keyboards
- Browser validation
- Assistive technology
- User experience

Do not use `type="text"` for everything.

---

# 22. Search Inputs

For search fields, use:

```tsx id="u6m2q9"
<Input type="search" />
```

when appropriate.

Provide a clear label.

The search icon alone is not an accessible name.

---

# 23. Error Messages

Errors must be understandable.

Example:

```text id="k2p7s5"
رقم الهاتف

[059123]

رقم الهاتف غير صحيح.
```

Do not rely solely on:

```text id="x9r4v1"
red border
```

The error should be exposed as text.

---

# 24. Associate Errors With Fields

When possible, connect the error message to the input.

Conceptually:

```tsx id="q8m3t6"
<Input
  aria-invalid={hasError}
  aria-describedby={hasError ? "phone-error" : undefined}
/>

<p id="phone-error">
  رقم الهاتف غير صحيح.
</p>
```

Use the project's existing Form components when they already handle this correctly.

---

# 25. aria-invalid

Use:

```tsx id="v2n7r5"
aria-invalid="true"
```

when a field is invalid.

Do not set `aria-invalid="true"` on every field by default.

It should reflect actual state.

---

# 26. Help Text

For fields with instructions:

```text id="m7q1c5"
البريد الإلكتروني

[....................]

سيتم استخدام البريد الإلكتروني لإرسال إشعارات النظام.
```

Associate help text with the field where appropriate.

Do not overload the placeholder with instructions.

---

# 27. Form Submission

When a form fails validation:

- Keep the user's entered data
- Clearly show errors
- Make errors discoverable
- Avoid silently failing
- Move focus appropriately when useful

For long forms, consider focusing the first invalid field when it improves usability.

Do not steal focus unnecessarily.

---

# 28. Loading Buttons

Loading state must be understandable.

Bad:

```text id="d8q4n2"
[ spinner ]
```

Better:

```text id="y3m7k1"
[ جاري الحفظ... ]
```

or an accessible label/state while preserving the button's purpose.

Do not remove all semantic context during loading.

---

# 29. Disabled Buttons

Disabled controls should:

- Look disabled
- Be programmatically disabled when appropriate
- Not be the only way to explain why an action is unavailable

If an action is unavailable because of a business rule, consider providing contextual explanation.

Do not disable a critical action with no indication of why it cannot be used.

---

# 30. Destructive Actions

For destructive actions such as:

```text id="g4k7m2"
حذف العميل
حذف الحساب
إلغاء الطلب
حذف المعاملة
```

provide clear context.

For important destructive actions, use an appropriate confirmation mechanism such as:

```text id="q5p8n3"
AlertDialog
```

when necessary.

The confirmation should clearly identify:

- What will be deleted
- Consequences
- Cancel action
- Confirm action

---

# 31. Dialog Accessibility

Dialogs must:

- Have an accessible title
- Have appropriate description when needed
- Trap focus appropriately
- Return focus appropriately
- Close predictably
- Support Escape where appropriate
- Work with keyboard
- Work with screen readers

Prefer existing shadcn/Radix Dialog and AlertDialog components.

Do not build custom focus management unless necessary.

---

# 32. Dialog Title

Every meaningful dialog should have a title.

Example:

```text id="a8m3q5"
إضافة عميل جديد
```

Do not create a visually beautiful dialog with no semantic title.

If a visual title is intentionally absent, provide an accessible name using the appropriate primitive.

---

# 33. Sheet and Drawer Accessibility

Sheets/drawers should behave like accessible modal or non-modal interfaces according to their intended use.

Ensure:

- Accessible title
- Close mechanism
- Keyboard behavior
- Focus behavior
- Screen-reader semantics

Again, prefer existing primitives.

---

# 34. Dropdown Menus

Use accessible menu primitives.

Do not create:

```text id="w4n9c7"
<div onClick={...}>
```

for every dropdown item.

Use the project's existing shadcn/Radix components.

They already provide important keyboard semantics.

---

# 35. Select and Combobox

Accessible select/combobox behavior includes:

- Keyboard navigation
- Selected state
- Focus
- Search behavior
- Clear naming
- Popup semantics

Do not replace an accessible primitive with a custom `<div>` implementation just for styling.

---

# 36. Tabs

Tabs must communicate:

- Active tab
- Tab relationship
- Associated content
- Keyboard behavior

Use semantic tab primitives where available.

Do not implement tabs as unrelated clickable `<div>` elements.

---

# 37. Accordion

Accordions should expose:

- Expanded state
- Collapsed state
- Button semantics
- Keyboard interaction

Use existing accessible primitives.

---

# 38. Tooltips

Tooltips should provide supplementary information.

Never use a tooltip as the only way to communicate an essential action.

Especially on mobile, hover does not exist.

---

# 39. Toasts

Toast notifications should be accessible.

Examples:

```text id="u4r7p2"
تم حفظ العميل بنجاح.
حدث خطأ أثناء حفظ البيانات.
```

The user should be able to understand important state changes without relying only on visual animation.

Use the project's existing toast implementation.

---

# 40. Live Regions

Use live-region behavior appropriately for dynamic status updates.

Examples:

- Save completed
- Error occurred
- Search result count changed
- Background process completed

Do not make the entire application a live region.

Overuse can create excessive screen-reader noise.

---

# 41. Loading States

Loading states should communicate state changes.

Examples:

```text id="b6m2q9"
جاري تحميل العملاء...
```

or an accessible status.

Do not make a page appear completely frozen without communicating what is happening.

---

# 42. Skeletons

Skeletons are visual placeholders.

Do not rely solely on skeleton animation to communicate loading to screen readers.

Provide an appropriate accessible status when necessary.

Respect reduced-motion preferences.

---

# 43. Empty States

Empty states should explain:

1. What is empty
2. Why it may be empty
3. What the user can do

Example:

```text id="s8q3m7"
لا يوجد عملاء

لم تتم إضافة أي عملاء حتى الآن.

[إضافة عميل]
```

Do not communicate an empty state only through an illustration.

---

# 44. Error States

A page-level error should be understandable without color.

Bad:

```text id="f2k8m4"
red card
```

Better:

```text id="p7n3q5"
حدث خطأ أثناء تحميل العملاء.

يرجى المحاولة مرة أخرى.

[إعادة المحاولة]
```

---

# 45. Color

Never rely on color alone to communicate meaning.

Bad:

```text id="r8m1c4"
Green = success
Red = error
Yellow = warning
```

without text or another indicator.

Better:

```text id="n4q7t2"
✓ نشط
! يحتاج مراجعة
× فشل
```

Color should reinforce meaning, not carry it alone.

---

# 46. Contrast

Text and interactive elements must have sufficient contrast.

Review:

- Body text
- Muted text
- Placeholder text
- Borders
- Buttons
- Badges
- Status indicators
- Dark mode

Do not make secondary text so muted that it becomes difficult to read.

This is especially important in the project's dark theme.

---

# 47. Focus States

Every interactive element should have a visible focus state.

The project already has focus styling based around its design system.

Preserve and reuse it.

Do not remove:

```css id="m7v2q9"
outline
```

without providing an accessible replacement.

---

# 48. Focus Ring

Focus should be visually obvious.

Do not use:

```css id="f4n8m2"
outline: none;
```

unless a proper replacement exists.

Use the project's existing focus ring tokens/utilities.

---

# 49. Focus vs Hover

Do not style important interactions only on hover.

Bad:

```text id="q3m7v1"
:hover {
  ...
}
```

with no focus equivalent.

Ensure interactive states cover:

```text id="u8n2k5"
default
hover
focus
focus-visible
active
disabled
loading
error
```

where appropriate.

---

# 50. Keyboard Navigation

Every interactive element must be reachable and usable by keyboard.

Test:

```text id="c5r8m2"
Tab
Shift + Tab
Enter
Space
Escape
Arrow keys
```

depending on component type.

Do not create keyboard traps.

---

# 51. Tab Order

The keyboard order should follow logical reading and interaction order.

Do not abuse:

```html id="h7q3m1"
tabindex="1" tabindex="2"
```

Positive tabindex values usually create maintenance and accessibility problems.

Prefer natural DOM order.

---

# 52. tabindex

Use:

```text id="w2k9r5"
tabindex="0
```

only when an element genuinely needs to enter the keyboard navigation sequence.

Use:

```text id="v8m3q6"
tabindex="-1"
```

for programmatic focus targets when appropriate.

Avoid positive tabindex values.

---

# 53. Focus Management

Focus should move intentionally.

Examples:

### Opening Dialog

Focus should move into the dialog.

### Closing Dialog

Focus should return to the triggering element when appropriate.

### Form Error

Focus may move to the first invalid field when useful.

### Navigation

Focus should not disappear unexpectedly.

Prefer Radix/shadcn focus management.

---

# 54. Skip Navigation

For complex admin layouts, consider a skip link:

```text id="x6p2m8"
تخطي إلى المحتوى الرئيسي
```

This is especially useful when:

- Sidebar is large
- Header contains many controls
- Navigation is persistent

A keyboard user should be able to reach main content efficiently.

---

# 55. Tables

Tables must use semantic table structure when the content is truly tabular.

Prefer:

```html id="m8q3v7"
<table>
  <thead>
    <tr>
      <th></th>
      <td>
        <tbody></tbody>
      </td>
    </tr>
  </thead>
</table>
```

Do not recreate tables entirely from `<div>` elements unless the design genuinely requires a different representation.

---

# 56. Table Headers

Column headers should clearly identify their columns.

Use `<th>` appropriately.

For complex tables, consider additional associations where necessary.

Do not make the first row of a `<div>` grid visually look like a table and assume assistive technologies will understand it.

---

# 57. Sortable Tables

If a column can be sorted, communicate:

- It is sortable
- Current sort direction
- Active sort state

Do not rely only on an arrow icon.

The accessible name/state should communicate sorting behavior.

---

# 58. Pagination Accessibility

Pagination controls should have clear names.

Example:

```text id="j5m8q2"
الصفحة السابقة
الصفحة التالية
```

Icon-only pagination buttons must have accessible labels.

Current page should be programmatically distinguishable where appropriate.

---

# 59. Data-Dense CRM Interfaces

CRM screens can contain a lot of information.

Accessibility does not mean removing information.

Instead:

```text id="k4p8m2"
Prioritize
Structure
Group
Label
Expose state
Preserve keyboard access
```

Use:

- clear headings
- landmarks
- table semantics
- grouped controls
- accessible labels
- predictable focus

---

# 60. Responsive Accessibility

Responsive layouts must remain accessible.

When desktop changes to mobile:

- Do not remove essential controls without replacement
- Do not create inaccessible overflow
- Do not make buttons too small
- Do not rely on hover
- Keep focus behavior correct
- Preserve reading order

A mobile redesign is still the same application.

---

# 61. RTL Accessibility

The project is Arabic RTL.

Accessibility must work correctly with:

```text id="s7m2q5"
lang="ar"
dir="rtl"
```

Do not manipulate DOM order simply to visually mirror the UI.

Screen-reader and keyboard order should remain logical.

---

# 62. Arabic Accessible Labels

Accessible labels should be in Arabic when the interface is Arabic.

Examples:

```text id="p3q8m1"
إضافة عميل
تعديل العميل
حذف العميل
فتح القائمة
إغلاق القائمة
البحث عن العملاء
الصفحة التالية
الصفحة السابقة
```

Do not leave invisible labels in English when the user-facing application is Arabic unless there is a specific reason.

---

# 63. Accessible Names Must Be Specific

Avoid:

```text id="q6m2v8"
aria-label="زر"
aria-label="إجراء"
aria-label="فتح"
```

Prefer:

```text id="f4p9n3"
aria-label="إضافة عميل"
aria-label="تعديل العميل"
aria-label="حذف العميل"
aria-label="فتح قائمة الإجراءات"
```

The user should understand the action without visual context.

---

# 64. Avoid ARIA When Native HTML Is Enough

Do not add ARIA everywhere.

Bad:

```tsx id="m7q2r5"
<button
  role="button"
  aria-label="حفظ"
>
```

A `<button>` already has button semantics.

Prefer:

```tsx id="c4n8p1"
<button>حفظ</button>
```

Use ARIA to fill genuine semantic gaps.

---

# 65. Avoid Invalid ARIA

Do not add random ARIA attributes simply because they look useful.

Every ARIA attribute should have a semantic purpose.

Before adding ARIA, ask:

> Does the native element or existing component already provide this behavior?

If yes, prefer the native behavior.

---

# 66. shadcn/Radix Principle

The project uses shadcn-style components.

Prefer:

```text id="h5q9m3"
shadcn
+
Radix primitives
+
existing project components
```

over custom accessibility logic.

Do not remove:

- keyboard behavior
- focus management
- aria relationships
- portal behavior
- dismissal logic

just to simplify styling.

---

# 67. Forms With React Hook Form / Validation

When the project uses a form library:

Ensure:

- Labels are connected
- Errors are associated
- Invalid fields expose state
- Submission state is communicated
- Loading state is communicated
- Focus behavior is intentional

Do not create a second validation/accessibility system if the existing Form components already handle these relationships.

---

# 68. Status Badges

Status badges should not rely only on:

```text id="n2m8q5"
color
```

Prefer:

```text id="f6p3r1"
نشط
متوقف
قيد المراجعة
مرفوض
```

Icons may supplement the state.

---

# 69. Icons + Status

If using status icons:

```tsx id="x4q7m2"
<Check aria-hidden="true" />
<span>نشط</span>
```

The text carries the semantic meaning.

Do not announce decorative icons separately.

---

# 70. Motion

Respect:

```text id="q9m2v5"
prefers-reduced-motion
```

Animations should not be required to understand:

- navigation
- state changes
- errors
- success
- loading

Avoid excessive motion.

---

# 71. Loading Animation

Spinners should not be the only communication of loading.

For example:

```text id="n7p4c2"
[spinner] جاري الحفظ...
```

is generally clearer than:

```text id="m3q8v1"
[spinner]
```

where the meaning is ambiguous.

---

# 72. Toast Animation

Do not make critical notifications disappear too quickly.

Important errors should remain discoverable.

Provide persistent or actionable feedback when appropriate.

---

# 73. Touch Targets

On mobile, controls should have sufficiently large interaction areas.

Avoid:

```text id="r5m8q2"
6px × 6px
```

icon buttons.

Use appropriate button sizes from the design system.

Do not sacrifice usability for visual compactness.

---

# 74. Hover-Only Interactions

Avoid essential actions that appear only on hover.

Bad:

```text id="c7n2m5"
Hover row → actions appear
```

if keyboard and touch users cannot access them.

Provide:

- always-visible action
- focus-visible action
- accessible overflow menu
- equivalent interaction

---

# 75. Data Table Row Actions

For CRM tables:

```text id="j4q8m2"
Customer
Phone
Status
Actions
```

The Actions column should remain accessible.

For mobile cards, make the action menu accessible without hover.

---

# 76. Images

Every meaningful image should have appropriate alternative text.

Example:

```tsx id="v8m3q1"
<img src={avatar} alt="صورة أحمد محمد" />
```

Decorative images:

```tsx id="k5q2r7"
<img src={decoration} alt="" />
```

Do not describe decorative content unnecessarily.

---

# 77. Avatars

If an avatar is meaningful, provide a useful name.

If the user's name is already adjacent to the avatar and the image adds no additional information, the image can be decorative.

Do not announce duplicate information.

---

# 78. Logos

Brand logos should have appropriate accessible labeling depending on context.

For a logo that links to home:

```text id="m6p3q8"
aria-label="الصفحة الرئيسية"
```

may be more useful than merely announcing "logo".

Follow the actual purpose of the element.

---

# 79. Links

Links should communicate their destination.

Avoid:

```text id="n4q7m2"
اضغط هنا
```

when possible.

Prefer:

```text id="w8p3k5"
عرض تفاصيل العميل
```

The link should make sense when read out of context.

---

# 80. External Links

If a link opens an external resource and that distinction matters, communicate it appropriately.

Do not rely only on a small external-link icon.

---

# 81. File Uploads

File upload controls need:

- Clear label
- Accepted file information
- Error feedback
- Loading/upload state
- Progress where useful
- Keyboard access

Do not hide all meaningful information behind a visual drop zone.

---

# 82. Drag and Drop

Drag-and-drop must not be the only interaction method.

Provide an alternative such as:

```text id="g2m7q4"
[اختيار ملف]
```

Users should not be forced to drag files.

---

# 83. Modals With Forms

For modal forms:

```text id="b8q3m6"
Dialog title
Description

Field
Field
Field

Errors

Cancel
Save
```

Maintain logical focus.

Do not allow keyboard focus to escape unexpectedly.

---

# 84. Confirmation Dialogs

For destructive actions:

```text id="t5m9q2"
هل تريد حذف العميل؟

سيؤدي هذا الإجراء إلى حذف بيانات العميل نهائياً.

[إلغاء] [حذف العميل]
```

The destructive action must be explicit.

Avoid ambiguous:

```text id="j7p2c4"
[نعم] [لا]
```

because the buttons do not describe the action.

---

# 85. Permission-Based UI

CRM systems often have permission-dependent controls.

If a user cannot perform an action:

- Hide it when appropriate
- Disable it when context requires visibility
- Explain why when useful

Do not create inaccessible controls that appear active but fail silently.

---

# 86. Keyboard Shortcuts

If the application provides shortcuts:

- Do not make them the only way to perform actions
- Document them where useful
- Avoid conflicts with browser/screen-reader shortcuts
- Respect user expectations

---

# 87. Focus Visibility During Navigation

When navigating between views, avoid situations where focus disappears completely.

For SPA navigation, consider whether focus should move to:

- Page heading
- Main content
- Newly opened panel

Use the least disruptive behavior that improves orientation.

---

# 88. Accessibility and URL State

If filters/search/sort state is reflected in the URL:

Ensure that navigating to the URL produces an understandable UI.

Dynamic changes should not create confusing focus behavior.

---

# 89. Accessibility Review Process

After implementation:

## Pass 1 — Semantics

Check:

- HTML elements
- headings
- landmarks
- labels

## Pass 2 — Keyboard

Check:

- Tab
- Shift+Tab
- Enter
- Space
- Escape
- Arrow keys

## Pass 3 — Focus

Check:

- focus visibility
- dialog focus
- sheet focus
- dropdown focus
- focus return

## Pass 4 — Screen Reader Semantics

Check:

- accessible names
- states
- errors
- dynamic updates

## Pass 5 — Visual Accessibility

Check:

- contrast
- text size
- focus indicators
- color independence

## Pass 6 — Responsive

Check:

- mobile
- tablet
- desktop
- touch

## Pass 7 — RTL

Check:

- Arabic labels
- reading order
- directional icons
- navigation

---

# 90. Accessibility Priority

Fix accessibility problems in this order:

### P0 — Blocking

Examples:

- Keyboard cannot access primary actions
- Dialog traps focus incorrectly
- Form fields have no accessible labels
- Critical content is inaccessible
- Navigation cannot be operated without a mouse

### P1 — Major

Examples:

- Wrong accessible names
- Missing error association
- Missing active state
- Important controls depend on hover
- Poor focus management

### P2 — Visual/UX

Examples:

- Weak focus indicator
- Low contrast
- Small touch targets
- Confusing hierarchy

### P3 — Polish

Examples:

- Minor label improvements
- Better announcement wording
- Small interaction refinements

---

# 91. Automated Checks

When available, use appropriate accessibility tooling such as:

- ESLint accessibility rules
- axe-based testing
- browser accessibility inspection
- component tests
- automated audits

Do not assume automated tools catch everything.

Automated checks should complement human reasoning.

---

# 92. Visual Inspection

If screenshot/browser inspection is available:

Review:

- focus states
- contrast
- button sizes
- labels
- error presentation
- mobile touch areas
- dialogs
- dropdowns
- tables

If visual inspection tools are unavailable, do not claim visual testing was performed.

Perform a code-level accessibility review instead.

---

# 93. Common Accessibility Anti-Patterns

Avoid:

```text id="e4m8q2"
<div onClick>
```

for buttons.

Avoid:

```text id="x7p3n5"
placeholder as label
```

Avoid:

```text id="r2k9m4"
aria-label="زر"
```

Avoid:

```text id="m5q8c1"
red = error
```

without text.

Avoid:

```text id="v3n7p2"
outline: none
```

without replacement.

Avoid:

```text id="k8m2q5"
hover-only actions
```

Avoid:

```text id="j4p9r3"
positive tabindex
```

Avoid:

```text id="w6q2m8"
custom dialog without focus management
```

Avoid:

```text id="c3n8v1"
custom dropdown replacing accessible primitives
```

---

# 94. CRM Accessibility Checklist

Before completing a CRM page:

### Navigation

- [ ] Sidebar is keyboard accessible
- [ ] Active route is identifiable
- [ ] Mobile navigation works without mouse
- [ ] Navigation has semantic structure

### Page

- [ ] One clear primary heading
- [ ] Logical heading hierarchy
- [ ] Main landmark exists
- [ ] Page structure is semantic

### Actions

- [ ] Buttons use `<button>`
- [ ] Links use `<a>`
- [ ] Icon-only buttons have names
- [ ] Destructive actions are clear

### Forms

- [ ] Every field has a label
- [ ] Required fields are communicated
- [ ] Errors are visible
- [ ] Errors are associated with fields
- [ ] Invalid fields expose state
- [ ] Loading/submission state is understandable

### Data

- [ ] Tables use semantic structure
- [ ] Sort state is accessible
- [ ] Pagination is accessible
- [ ] Status does not rely only on color

### Overlays

- [ ] Dialog has accessible title
- [ ] Focus enters dialog
- [ ] Focus returns appropriately
- [ ] Escape behavior works
- [ ] Sheet/drawer is accessible
- [ ] Dropdowns are keyboard accessible

### Visual

- [ ] Contrast is adequate
- [ ] Focus is visible
- [ ] Text is readable
- [ ] Touch targets are usable
- [ ] Hover is not the only interaction

### Arabic RTL

- [ ] `lang="ar"`
- [ ] `dir="rtl"`
- [ ] Accessible labels are Arabic
- [ ] Keyboard order is logical
- [ ] Directional icons are correct
- [ ] Technical LTR content remains readable

### Responsive

- [ ] Desktop works
- [ ] Tablet works
- [ ] Mobile works
- [ ] No inaccessible overflow

---

# 95. Definition of Done

An interface is not accessibility-complete merely because:

```text id="r6m2q8"
aria-label
```

was added.

It is complete when:

```text id="p8q3m5"
Semantic HTML
      +
Keyboard access
      +
Focus management
      +
Accessible names
      +
Form/error semantics
      +
Contrast
      +
Touch usability
      +
Responsive behavior
      +
RTL compatibility
      +
Reduced motion
      +
Screen-reader support
```

work together.

---

# Golden Rules

> **Use semantic HTML before ARIA.**

> **Use existing shadcn/Radix primitives before building custom accessibility behavior.**

> **Every interactive element needs an accessible name and keyboard behavior.**

> **Never rely on color alone.**

> **Never rely on hover alone.**

> **Never remove focus indicators without a better replacement.**

> **Labels identify fields; placeholders provide examples.**

> **Do not use ARIA to compensate for incorrect HTML.**

> **Keep DOM order logical even when the visual layout is RTL.**

> **Accessibility is part of the component architecture, not a final patch.**

The mental model should be:

```text id="z5q8m2"
Semantic HTML
      ↓
Clear names
      ↓
Keyboard
      ↓
Focus
      ↓
State communication
      ↓
Visual accessibility
      ↓
Responsive + RTL
      ↓
Validation
```
