---
name: animation-micro-interactions
description: Designs and implements purposeful animations and micro-interactions for React interfaces, CRM/admin dashboards, shadcn/ui components, navigation, forms, tables, dialogs, loading states, and responsive RTL applications. Use to improve feedback, hierarchy, continuity, and perceived performance without excessive motion. Respects prefers-reduced-motion, accessibility, performance, RTL direction, and existing O2 design tokens.
---

---

# Animation & Micro-Interactions

## Purpose

Create purposeful, restrained, high-quality motion for React interfaces.

Motion should communicate:

- State
- Feedback
- Hierarchy
- Continuity
- Spatial relationships
- Progress
- Interaction response

Motion is not decoration.

The goal is to make the interface feel:

- Responsive
- Polished
- Predictable
- Modern
- Calm
- Professional

Especially for CRM/admin applications, animations must never interfere with productivity.

---

# 1. Core Principle

Every animation must answer at least one question:

> What does this animation help the user understand?

Good reasons include:

- "The action succeeded."
- "This menu came from this button."
- "The content is loading."
- "This section expanded."
- "The filter changed the result."
- "This item was added."
- "The dialog is opening."
- "The navigation moved to another state."

Avoid animations whose only purpose is:

> "It looks cool."

If the animation does not communicate anything useful, remove it.

---

# 2. Inspect Before Implementing

Before adding animation:

1. Inspect the existing project.
2. Check `package.json`.
3. Check whether Motion or Framer Motion is already installed.
4. Inspect existing animation utilities.
5. Inspect shadcn/ui components.
6. Inspect global CSS.
7. Inspect existing transitions.
8. Check whether the project already has motion tokens.
9. Check dark/light theme behavior.
10. Check RTL behavior.

Do not introduce a new animation library if the project already has an established solution.

If Motion/Framer Motion is already installed:

- Reuse it.
- Follow existing conventions.
- Prefer shared variants.
- Avoid creating competing animation systems.

If no animation library exists:

Use CSS transitions for simple interactions.

Do not add a dependency merely for:

- Button hover
- Input focus
- Simple fade
- Simple color transition
- Simple transform

---

# 3. Motion Categories

Treat animations as different categories rather than one global animation style.

## Micro Feedback

Examples:

- Button press
- Toggle change
- Checkbox state
- Copy confirmation
- Favorite action
- Save confirmation

These should be fast and subtle.

---

## State Transitions

Examples:

- Loading → success
- Loading → error
- Disabled → enabled
- Closed → open
- Empty → populated

The animation should clarify the state change.

---

## Enter / Exit

Examples:

- Cards appearing
- Toast notifications
- Dropdown menus
- Dialogs
- Sheets
- Sidebars
- Tooltips

Use short transitions.

Avoid dramatic page entrances.

---

## Layout Changes

Examples:

- Expanding filters
- Opening advanced search
- Collapsing sidebar
- Expanding table rows
- Changing grid layout

Prefer smooth spatial continuity when it improves comprehension.

---

## Navigation

Examples:

- Sidebar collapse
- Mobile drawer
- Tabs
- Breadcrumb transitions
- Page-level content changes

Do not delay navigation unnecessarily.

---

## Loading

Examples:

- Skeletons
- Progress indicators
- Spinners
- Loading buttons

Loading animations should communicate activity without distracting the user.

---

## Success / Error

Examples:

- Saved successfully
- Record created
- Validation error
- Request failed
- Payment completed
- Operation cancelled

Motion should reinforce the state but never replace text or semantic feedback.

---

# 4. Motion Timing

Use short, consistent durations.

Suggested hierarchy:

### Micro

Approximately:

```text
120–160ms
```

Use for:

- Hover
- Focus
- Press
- Small state changes

### Standard

Approximately:

```text
180–240ms
```

Use for:

- Dropdowns
- Tooltips
- Cards
- Small panels
- Form states

### Emphasis

Approximately:

```text
250–350ms
```

Use sparingly for:

- Sheets
- Important layout transitions
- Larger state changes

These are guidelines, not mandatory values.

If the project already has motion tokens, use those instead.

Do not randomly mix:

```text
100ms
175ms
213ms
287ms
420ms
```

throughout the application.

Consistency matters more than exact numbers.

---

# 5. Easing

Prefer natural easing.

Typical choices:

- ease-out for entering
- ease-in for exiting
- ease-in-out for reversible state changes

Avoid excessive:

- bounce
- elastic effects
- exaggerated spring motion
- dramatic cubic-bezier curves

CRM interfaces should feel controlled and professional.

---

# 6. Performance

Prefer animations using:

```text
transform
opacity
```

These are generally safer for rendering performance.

Prefer:

```css
transform: translateX(...);
opacity: ...;
```

over repeatedly animating:

```css
left
top
width
height
```

when the same visual result can be achieved using transforms.

Avoid animation patterns that cause unnecessary layout recalculation.

Do not animate large amounts of DOM unnecessarily.

---

# 7. Avoid Layout Thrashing

Be careful with animations that repeatedly change:

- width
- height
- margin
- padding
- top
- left

For expandable content, use the existing component implementation when possible.

Do not create expensive JavaScript measurement loops unless genuinely necessary.

---

# 8. Buttons

Buttons may have subtle interaction feedback.

Good examples:

- Small opacity change
- Background transition
- Border transition
- Very subtle scale on press
- Loading indicator
- Success state

Avoid:

- Large movement
- Excessive bounce
- Long transitions
- Delayed click feedback

A button should feel immediate.

---

# 9. Button Loading

For async actions:

```text
Normal
↓
Loading
↓
Success / Error
```

Example:

```text
حفظ
↓
جارٍ الحفظ...
↓
تم الحفظ
```

The animation must not prevent the user from understanding the state.

Never use animation as a substitute for loading state.

Disable the action appropriately when duplicate submissions would be dangerous.

---

# 10. Forms

Use motion carefully in forms.

Good uses:

- Focus transition
- Validation feedback
- Error message appearance
- Success indication
- Conditional field appearance

Avoid moving the entire form when validation fails.

Do not cause severe layout jumping.

For validation errors:

Prefer:

```text
field border
+
error message
+
small transition
```

rather than dramatic shaking.

A brief shake can occasionally be appropriate for a critical invalid action, but it should not become the default pattern.

---

# 11. Inputs and Focus

Inputs should have fast visual feedback.

Examples:

```text
Default
→ Focus
→ Filled
→ Error
→ Valid
```

Transitions may affect:

- border
- ring
- background
- label
- helper text

Never animate away the focus indicator.

Keyboard users must receive the same meaningful feedback as mouse users.

---

# 12. Dialogs

For shadcn/ui Dialog and Radix-based components:

Prefer existing component behavior.

Do not replace established accessibility/focus behavior merely to create a custom animation.

A good dialog transition is usually:

```text
Backdrop fade
+
Dialog opacity
+
small scale/translate
```

Keep it subtle.

Avoid:

- dramatic zoom
- spinning dialogs
- large bouncing movement

Focus management remains more important than animation.

---

# 13. Sheets and Drawers

Sheets should communicate their origin.

For RTL interfaces:

- A right-side sheet should enter from the right when that is its semantic origin.
- A left-side sheet should enter from the left.
- Do not blindly reverse every animation just because the application is RTL.

Think about semantic direction rather than simply swapping coordinates.

Example:

```text
RTL sidebar
→ enters from the right
```

But:

```text
previous/next content
```

should be based on navigation semantics, not arbitrary visual reversal.

---

# 14. Dropdowns and Popovers

Use short transitions.

Good:

```text
opacity
+
small translate/scale
```

Avoid:

- large movement
- slow entrance
- complex choreography

The menu should feel attached to its trigger.

---

# 15. Sidebar

Sidebar animation should communicate state:

```text
Expanded
↔
Collapsed
```

Animate:

- width when appropriate
- content opacity
- icon/text visibility
- layout transitions

Do not make the sidebar animation slow.

For CRM applications, users may open and close navigation frequently.

The interface should remain responsive.

---

# 16. Mobile Navigation

Mobile drawers should:

- enter from the correct semantic side
- use a backdrop
- preserve focus behavior
- prevent accidental interaction with background content
- close predictably

Animation should reinforce the drawer's relationship to the menu trigger.

Never sacrifice usability for visual effects.

---

# 17. Tables

Tables are usually information-dense.

Avoid animating every row on initial render.

Do not create:

```text
row 1 fade
row 2 fade
row 3 fade
row 4 fade
...
row 100 fade
```

This creates visual noise and can hurt performance.

Prefer subtle animation for meaningful changes:

- Newly created row
- Updated row
- Deleted row
- Expanded details
- Selection state

For large datasets, prioritize performance over animation.

---

# 18. Data Tables

When filters change table results:

Avoid dramatic transitions.

Prefer:

```text
Filter changed
↓
Loading state
↓
Updated results
```

A subtle transition is enough.

Do not make users wait for decorative animation before interacting with the new data.

---

# 19. Dashboard and KPI Cards

Dashboard animations should communicate data changes.

Good examples:

- Number changes
- Chart data refresh
- KPI status changes
- Progress updates

Avoid perpetual animation.

Do not make every KPI card:

- bounce
- float
- pulse
- rotate
- continuously move

A CRM dashboard should remain readable.

---

# 20. Charts

Animate chart changes only when useful.

Good:

```text
Old dataset
→
New dataset
```

Avoid:

```text
Infinite chart animation
```

Charts must remain understandable even when motion is disabled.

Never make animation necessary to interpret the data.

---

# 21. Skeleton Loading

Skeletons can use subtle movement.

Good:

```text
subtle shimmer
```

Avoid:

```text
bright continuous flashing
```

Skeleton animation should be quiet.

If the content loads quickly, avoid unnecessary visual complexity.

---

# 22. Empty States

Empty states generally do not need animation.

If used:

- keep it subtle
- reinforce the next action
- do not delay the interface

Example:

```text
لا توجد عملاء حتى الآن
[إضافة عميل]
```

The action remains the focus.

---

# 23. Success States

For successful operations:

```text
Action
→
success feedback
```

Possible feedback:

- check icon
- color transition
- toast
- status badge
- subtle icon animation

Do not create excessive celebration for routine CRM actions.

For example:

Saving a customer does not need a large confetti animation.

---

# 24. Error States

Error animations should attract attention without causing anxiety.

Prefer:

- subtle appearance
- icon transition
- border/ring state
- toast

Avoid excessive shaking.

The error message must remain readable without animation.

---

# 25. Toast Notifications

Toasts can:

- fade in
- slide in
- fade out

Use consistent placement.

For RTL applications, ensure the visual direction and positioning are correct.

Toasts must not cover critical controls.

---

# 26. Hover

Hover animation should only be meaningful on devices that support hover.

Never make essential information dependent on hover.

Avoid relying on:

```text
:hover
```

for mobile interactions.

Good hover behavior:

- subtle background change
- border change
- elevation
- icon opacity
- small transform

Avoid exaggerated scaling.

---

# 27. Press Feedback

Buttons and interactive elements may have subtle press feedback.

For example:

```text
scale: 0.98
```

or a small visual state change.

Keep it extremely short.

The goal is:

> "I received your click."

Not:

> "Watch this animation."

---

# 28. Tooltips

Tooltips should appear quickly and disappear predictably.

Do not create long entrance animations.

Tooltips should never be required to understand essential information.

---

# 29. RTL Motion

RTL is not simply:

```text
reverse everything
```

Determine the semantic direction.

Examples:

### Navigation

```text
Back
← semantic previous
```

### Sidebar

```text
RTL sidebar
→ usually right side
```

### Horizontal workflow

Determine whether movement represents:

- progress
- regression
- previous
- next

based on meaning.

Use logical concepts rather than blindly replacing:

```text
left → right
```

with:

```text
right → left
```

---

# 30. Reduced Motion

Respect:

```css
prefers-reduced-motion
```

Users who prefer reduced motion should not be forced to experience unnecessary movement.

For CSS:

```css
@media (prefers-reduced-motion: reduce) {
  /* reduce or remove non-essential motion */
}
```

If Motion/Framer Motion is used, configure its reduced-motion support according to the installed version and project conventions.

When reduced motion is enabled:

Prefer:

```text
instant state changes
opacity changes
minimal transitions
```

Avoid:

```text
large movement
parallax
zoom
bouncing
continuous motion
```

Never remove important feedback.

---

# 31. Accessibility

Animation must never compromise accessibility.

Ensure:

- focus remains visible
- keyboard navigation remains functional
- screen readers receive semantic state changes
- animation is not required to understand content
- no flashing content
- reduced-motion preference is respected
- dialogs preserve focus behavior
- dropdowns remain keyboard accessible
- loading states are announced when necessary

Motion is supplementary.

Semantic HTML and accessible interaction come first.

---

# 32. Do Not Animate Critical Delays

Never intentionally delay:

- navigation
- form submission
- search results
- opening essential controls
- confirmation actions

for visual effect.

The application should feel fast.

Animation should happen around the interaction, not block the interaction.

---

# 33. Shared Motion Tokens

If the application contains multiple animations, create reusable motion conventions.

For example:

```text
motion-micro
motion-standard
motion-emphasis
```

Or shared Motion variants:

```text
fadeIn
fadeOut
slideIn
slideOut
scaleIn
```

Do not duplicate slightly different animation values across dozens of components.

Consistency creates polish.

---

# 34. Component-Level Motion

Prefer motion at the component level.

Examples:

```text
Button
Dialog
Dropdown
Toast
Sidebar
TableRow
KpiCard
```

rather than adding one huge global animation system.

Each component should have predictable behavior.

---

# 35. Page Transitions

Use page transitions very carefully.

For CRM applications, a full-page fade every time the route changes can become annoying.

Prefer:

- immediate navigation
- loading indicators where necessary
- subtle content transition when useful

Do not make the user wait 300–500ms on every page.

---

# 36. Responsive Motion

Animation should behave correctly across:

- desktop
- tablet
- mobile

On mobile:

- reduce unnecessary transforms
- avoid hover-dependent effects
- avoid expensive animations
- ensure touch interactions remain immediate

Do not assume desktop interaction patterns work on touch devices.

---

# 37. Performance in Large CRM Screens

Be especially careful with:

- large tables
- thousands of rows
- dashboards
- charts
- infinite lists
- complex filters
- virtualized content

Avoid animating large collections simultaneously.

If a performance optimization conflicts with decorative animation:

> Keep the performance optimization.

---

# 38. Design-System Compatibility

Respect the existing design system.

For the O2 CRM project:

- Use existing O2 colors.
- Use existing dark/light tokens.
- Use existing border system.
- Use existing radius system.
- Use existing shadows.
- Use Cairo/Tajawal typography.
- Preserve RTL.
- Reuse shadcn/ui components.
- Reuse existing component variants.
- Do not create unrelated visual language.

Animation should reinforce the existing design system, not create another one.

---

# 39. Animation and Color

Do not use animation to compensate for weak visual hierarchy.

If a button needs excessive animation to attract attention:

First check:

- color
- size
- position
- hierarchy
- typography
- spacing

Motion should support hierarchy, not replace it.

---

# 40. Animation and Shadows

Avoid rapidly changing heavy shadows.

Prefer:

```text
border transition
+
subtle shadow transition
```

instead of large dramatic elevation changes.

This is especially important in dark mode.

---

# 41. Animation and Glass Effects

If the project uses glass or translucent surfaces:

Do not animate expensive blur effects unnecessarily.

Avoid continuously animating:

```text
backdrop-filter
filter
large blur regions
```

Prefer opacity and transform.

---

# 42. Common Anti-Patterns

Avoid:

### Everything animates

Bad:

```text
page
header
sidebar
cards
buttons
icons
tables
rows
text
```

all animate simultaneously.

---

### Huge page entrance

Avoid:

```text
whole dashboard
→ scale from 0.8
→ fade
→ slide
```

This slows perceived usability.

---

### Bounce everywhere

Avoid bouncing:

- buttons
- cards
- icons
- menus
- dialogs

unless there is a very specific semantic reason.

---

### Hover transform abuse

Avoid large:

```text
scale(1.1)
translateY(-10px)
```

on standard CRM controls.

---

### Infinite decorative animation

Avoid perpetual:

- floating cards
- rotating icons
- pulsing buttons
- moving backgrounds

especially in admin interfaces.

---

### Animation delays

Do not make users wait for animation.

---

### Custom dialog animation replacing primitives

Do not rebuild shadcn/Radix behavior only to achieve a custom transition.

---

### Animating huge lists

Avoid animation on every row in a large table.

---

### Motion without reduced-motion support

Never ship significant motion without considering:

```text
prefers-reduced-motion
```

---

# 43. Review Process

After implementing motion, review it in this order.

## Step 1 — Intent

Ask:

> What does this animation communicate?

If there is no answer, remove it.

---

## Step 2 — Timing

Check:

- Is it too slow?
- Is it too fast?
- Is it consistent with other components?

---

## Step 3 — Easing

Check:

- Does it feel natural?
- Does it overshoot?
- Does it bounce unnecessarily?

---

## Step 4 — Direction

Check:

- Is movement semantically correct?
- Does RTL make sense?
- Is the origin clear?

---

## Step 5 — Accessibility

Check:

- reduced motion
- keyboard interaction
- focus
- screen readers
- no flashing

---

## Step 6 — Performance

Check:

- large lists
- layout changes
- expensive properties
- unnecessary JavaScript animation
- simultaneous animations

---

## Step 7 — Responsive Behavior

Check:

- desktop
- tablet
- mobile
- touch interaction
- hover assumptions

---

## Step 8 — Consistency

Check:

- durations
- easing
- directions
- component variants
- design tokens

---

# 44. Prioritization

When reviewing animation issues:

### P0 — Broken interaction

Examples:

- animation blocks interaction
- dialog focus broken
- keyboard navigation broken
- content inaccessible

Fix immediately.

### P1 — Major UX problem

Examples:

- navigation feels slow
- excessive animation
- important state unclear
- animation causes major layout problems

Fix next.

### P2 — Visual inconsistency

Examples:

- inconsistent timing
- inconsistent easing
- one component behaves differently

Fix after functional issues.

### P3 — Polish

Examples:

- slightly imperfect easing
- minor transition refinement
- subtle consistency improvements

Fix when practical.

---

# 45. Implementation Rules

Before implementing animation:

1. Inspect the existing project.
2. Reuse existing animation infrastructure.
3. Identify the interaction being improved.
4. Choose the smallest useful animation.
5. Prefer transform/opacity.
6. Keep timing consistent.
7. Preserve accessibility.
8. Respect reduced motion.
9. Verify RTL semantics.
10. Verify responsive behavior.
11. Verify performance.
12. Review the result.
13. Remove unnecessary motion.

---

# 46. Definition of Done

An animation implementation is complete when:

- The animation has a clear purpose.
- It improves feedback or continuity.
- It does not delay user actions.
- It follows project conventions.
- It uses existing dependencies when possible.
- It respects shadcn/Radix behavior.
- It respects O2 design tokens.
- It works in RTL.
- It works in dark and light themes.
- It works responsively.
- It supports keyboard interaction.
- It respects reduced motion.
- It does not introduce unnecessary performance cost.
- It is consistent with other animations.
- No decorative animation remains without a clear UX purpose.

---

# 47. Golden Rules

1. **Motion communicates; it does not decorate.**
2. **Keep CRM motion fast and restrained.**
3. **Prefer transform and opacity.**
4. **Reuse the existing animation system.**
5. **Do not animate everything.**
6. **Never delay critical actions for animation.**
7. **Respect `prefers-reduced-motion`.**
8. **Never compromise accessibility for visual effects.**
9. **RTL changes semantics, not simply coordinates.**
10. **Performance is more important than decorative motion.**
11. **Use shared motion conventions.**
12. **If removing an animation makes the interface clearer, remove it.**
