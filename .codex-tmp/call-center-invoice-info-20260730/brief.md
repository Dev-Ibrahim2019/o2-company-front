# Call-center invoice information tab

## Objective

Update the real `/call-center/pos` “بيانات الفاتورة” tab so it has the same visual structure and content depth as the cashier `InvoiceInfoTab`, adapted to real call-center information.

## References

- User-provided component:
  `C:\Users\LT\.codex\attachments\76909f90-48d9-40fb-90cf-975273b4ad98\pasted-text.txt`
- Cashier reference:
  `C:\Users\LT\OneDrive\سطح المكتب\O2-File\Programing\o2-company-front\src\components\POS\InvoiceInfoTab.tsx`
- Call-center targets:
  - `src/components/call-center/CallCenterPOS.tsx`
  - `src/components/call-center/CallCenterWorkspace.tsx`
  - `src/hooks/useCallCenterCart.ts`
  - `src/services/callCenterOrderWorkflow.ts`
  - call-center service DTOs

## Required content

Preserve the cashier visual hierarchy: dark panel, responsive 1/2-column card grids, section icons, labels, value cards, opening/closing sections and pre-payment empty message.

Adapt the data semantics:

### Call-center workstation

- Workstation/device code from real configuration when available; otherwise an honest “غير متوفر”, never fake POS-002.
- Workstation name or “محطة الكول سنتر”.
- Current branch from actual selected/current branch state.
- Current call-center agent.

### Invoice details

- Invoice number after creation; before creation “تلقائي عند الحفظ”.
- Invoice date and time/opened at.
- ILS / شيكل فلسطيني.
- Financial account number when actually available, otherwise “غير متوفر”.
- Invoice status: draft, awaiting payment, paid, cancelled as real state allows.
- Invoice source: كول سنتر.
- Call Ticket number or “فاتورة يدوية”.
- Linked order ID/number when saved.

### Opening details

- Agent who opened it.
- Call-center workstation, not cashier register/session.
- Open date/time.

### Closing details

Only after successful paid invoice:

- Closing agent.
- Workstation/source.
- Close date/time.
- Invoice number.
- Payment summary.
- Kitchen dispatch state.

Before close, show the cashier-style dashed message that closing details appear after payment.

## Data and architecture

- Use real current state and successful workflow response. Extend call-center success/view-model types only as needed.
- Do not import cashier `useCart`, POS session/register activation, tables/halls or cashier business logic.
- Prefer a call-center-specific presentation component such as `CallCenterInvoiceInfoTab` or a pure prop-driven shared card view.
- Do not invent backend values or add backend changes unless required for existing returned data.
- Preserve all dirty user work.

## Visual direction

Exact sibling of cashier `InvoiceInfoTab`: O2/slate tokens, Cairo/Tajawal, 24–32px panel radius, responsive padding, max-width content, 12px value-card radius, subtle borders, semantic section icon colors.

## Validation

- TypeScript.
- Relevant frontend tests.
- Production build if environment allows.
- Verify rendered call-center route actually uses the new/updated component.
- Verify no forbidden cashier/table imports.
- Browser screenshots only if a supported authenticated browser session exists.

## Output

Modify the real application in place. Do not change cashier behavior.
