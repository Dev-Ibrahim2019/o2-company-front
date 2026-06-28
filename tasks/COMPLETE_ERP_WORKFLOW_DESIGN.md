# Complete ERP Workflow Design

## O2 Company ERP System - Business & Accounting Architecture

**Document Version:** 1.0  
**Date:** 2026-06-24  
**Prepared By:** ERP Architect / CFO / Chief Accountant / Laravel Senior Architect / Database Architect / Product Manager / Senior UI/UX Architect  
**Classification:** CONFIDENTIAL - Internal Use Only  
**Target Audience:** Large Restaurants, Multi-Branch Businesses, Audited Companies

---

# Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Recommended ERP Workflow](#recommended-erp-workflow)
3. [Recommended Accounting Workflow](#recommended-accounting-workflow)
4. [Recommended Roles & Permissions](#recommended-roles--permissions)
5. [Recommended Database Structure](#recommended-database-structure)
6. [Recommended UI/UX Flow](#recommended-uiux-flow)
7. [Approval Matrix](#approval-matrix)
8. [Audit Trail Design](#audit-trail-design)
9. [Financial Compliance Review](#financial-compliance-review)
10. [Implementation Roadmap](#implementation-roadmap)

---

# Current State Assessment

## Executive Summary

The current O2 Company ERP system is a **POS-first, accounting-second** application that lacks enterprise-grade financial controls. While it has the foundational components (invoices, payments, transactions, journal entries), the implementation has **critical gaps** that make it unsuitable for audited financial reporting.

## Current System Capabilities

### ✅ What EXISTS

- Order management (pending → confirmed → paid)
- Invoice creation from orders
- Payment recording (single and mixed methods)
- Basic journal entry creation (on full payment only)
- Customer subledger tracking (partial)
- Discount engine
- Basic audit log model (not integrated)

### ❌ What's MISSING

- Invoice approval workflow
- Invoice posting (accrual accounting)
- Invoice cancellation/voiding
- Credit note process
- Return processing (full/partial)
- Product replacement workflow
- Journal entry reversal
- Payment reversal/refund
- Accounting period controls
- Role-based permissions
- Comprehensive audit trail
- Multi-level approval
- Financial reporting integration

## Current State Diagram

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Order  │────▶│ Invoice │────▶│ Payment │────▶│   JE    │
│ pending │     │  draft  │     │  paid   │     │ posted  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │                │                │
     │                └────────────────┘                │
     │                 (only when fully paid)           │
     │                                                  │
     └──────────────── No reversal path ────────────────┘
```

## Critical Gaps Analysis

| Area                | Current State                  | Required State                                         | Gap Severity |
| ------------------- | ------------------------------ | ------------------------------------------------------ | ------------ |
| Revenue Recognition | Cash basis (on payment)        | Accrual basis (on invoice)                             | 🔴 CRITICAL  |
| Invoice States      | draft → partial → paid         | draft → pending → approved → posted → paid → cancelled | 🔴 CRITICAL  |
| Payment Accounting  | Single JE on full payment      | JE per payment, AR subledger                           | 🔴 CRITICAL  |
| Cancellation        | Not implemented                | Void with reversal                                     | 🔴 CRITICAL  |
| Credit Notes        | Service exists, not integrated | Full workflow                                          | 🔴 CRITICAL  |
| Returns             | Not implemented                | Full/partial with inventory                            | 🔴 CRITICAL  |
| Approval            | None                           | Multi-level                                            | 🔴 CRITICAL  |
| Audit Trail         | Partial                        | Comprehensive                                          | 🔴 CRITICAL  |
| Permissions         | None                           | Role-based                                             | 🟡 HIGH      |
| Period Controls     | None                           | Lock/close                                             | 🟡 HIGH      |

---

# Recommended ERP Workflow

## 1. Invoice Creation Workflow

### Business Process

```
Sales Order → Invoice Draft → Approval → Posting → Payment → Completion
```

### Detailed Workflow

#### Step 1: Order Creation (POS/Manual)

**Actor:** Cashier / Sales Rep  
**Permission:** `orders.create`

**User Actions:**

1. Select customer (or walk-in customer)
2. Add items to order
3. Apply discounts (if authorized)
4. Select branch/location
5. Save as "pending" or "confirmed"

**System Actions:**

- Generate order number: `ORD-20260624-0001`
- Calculate subtotal, discount, tax, total
- Reserve inventory (if applicable)
- Create order_items records

**Database Changes:**

```sql
INSERT INTO orders (order_number, branch_id, customer_id, status, subtotal, discount_amount, total, created_by)
VALUES ('ORD-20260624-0001', 1, 5, 'pending', 100.00, 0.00, 100.00, 3);

INSERT INTO order_items (order_id, item_id, quantity, price, total)
VALUES (1, 10, 2, 50.00, 100.00);
```

**Accounting Impact:** None (operational only)

**UI/UX Requirements:**

- POS interface with item search
- Customer selection modal
- Discount application dialog
- Real-time total calculation
- Order summary panel

**Risks:**

- Order modification after confirmation
- Inventory overselling
- Discount abuse

**Audit Requirements:**

- Log order creation
- Capture user ID, timestamp, branch
- Track all changes to order items

---

#### Step 2: Invoice Creation

**Actor:** Cashier / Sales Rep  
**Permission:** `invoices.create`

**User Actions:**

1. Select confirmed order
2. Review order details
3. Add invoice notes (optional)
4. Set payment terms (if applicable)
5. Click "Create Invoice"

**System Actions:**

- Validate order is confirmed and not already invoiced
- Generate invoice number: `INV-20260624-0001`
- Copy order items to invoice_items
- Set invoice status = 'draft'
- Create invoice record

**Database Changes:**

```sql
INSERT INTO invoices (number, order_id, customer_id, branch_id, status, subtotal, discount, total, invoice_date, created_by)
VALUES ('INV-20260624-0001', 1, 5, 1, 'draft', 100.00, 0.00, 100.00, NOW(), 3);

INSERT INTO invoice_items (invoice_id, item_id, item_name, quantity, price, total)
SELECT 1, item_id, item_name, quantity, price, total FROM order_items WHERE order_id = 1;
```

**Accounting Impact:** None (draft status)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Invoice preview before creation
- Editable fields (notes, payment terms)
- Print preview option
- "Submit for Approval" button

**Risks:**

- Duplicate invoices for same order
- Incorrect customer assignment
- Missing items

**Audit Requirements:**

- Log invoice creation
- Link to source order
- Capture all item details
- Record user, timestamp, branch

---

#### Step 3: Invoice Approval

**Actor:** Accounting Manager  
**Permission:** `invoices.approve`

**User Actions:**

1. View pending invoices dashboard
2. Review invoice details
3. Verify order and items
4. Check customer credit limit (if applicable)
5. Click "Approve" or "Reject"

**System Actions:**

- Validate user has approval authority
- Check invoice total against customer credit limit
- Update invoice status = 'approved'
- Record approver ID and timestamp
- Create approval log

**Database Changes:**

```sql
UPDATE invoices
SET status = 'approved', approved_by = 5, approved_at = NOW()
WHERE id = 1;

INSERT INTO audit_logs (auditable_type, auditable_id, event, old_values, new_values, user_id, reason)
VALUES ('Invoice', 1, 'approved',
        '{"status":"draft"}',
        '{"status":"approved","approved_by":5,"approved_at":"2026-06-24 10:30:00"}',
        5, 'Invoice approved');
```

**Accounting Impact:** None (still not posted)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Pending invoices list with filters
- Invoice detail view with approval/rejection buttons
- Rejection reason dialog
- Approval history timeline
- Customer credit limit indicator

**Risks:**

- Approving incorrect invoices
- Exceeding credit limits
- Conflict of interest (self-approval)

**Audit Requirements:**

- Record approver identity
- Capture approval timestamp
- Log rejection reasons
- Maintain approval chain

---

#### Step 4: Invoice Posting

**Actor:** System (automatic) or Accountant  
**Permission:** `invoices.post` (if manual)

**User Actions:**

- None (automatic on approval) OR
- Click "Post Invoice" button (if manual posting required)

**System Actions:**

- Validate invoice is approved
- Check accounting period is open
- Create journal entry:
  ```
  Dr AR Control (1120) | subledger: customer
  Cr Revenue (4110)
  Cr Tax Payable (2140) if applicable
  ```
- Post journal entry (status = 'posted')
- Update invoice status = 'posted'
- Record posting timestamp
- Update account balances
- Update customer subledger

**Database Changes:**

```sql
-- Create journal entry
INSERT INTO transactions (transaction_number, date, type, status, description, branch_id, user_id, source_type, source_id, posted_at)
VALUES ('JV-2026-0001', '2026-06-24', 'sale', 'posted', 'Invoice INV-20260624-0001', 1, 3, 'Invoice', 1, NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
VALUES
  (1, 15, 100.00, 0.00, 'Invoice INV-20260624-0001', 'customer', 5),  -- AR Control
  (1, 20, 0.00, 100.00, 'Sales Revenue', NULL, NULL);  -- Revenue

-- Update invoice
UPDATE invoices SET status = 'posted', posted_at = NOW() WHERE id = 1;

-- Update customer balance
UPDATE customer_balances
SET current_balance = current_balance + 100.00,
    last_updated = NOW()
WHERE customer_id = 5;
```

**Accounting Impact:**

- AR Control account increases (debit)
- Revenue account increases (credit)
- Customer subledger updated
- Customer balance increased

**Journal Entry Impact:**

- Transaction created and posted
- Two entries created (balanced)
- Account balances updated
- Subledger entries created

**UI/UX Requirements:**

- Posted invoice indicator
- Journal entry link
- Accounting period status indicator
- Posting confirmation dialog

**Risks:**

- Posting to closed period
- Posting unapproved invoices
- Duplicate posting
- Unbalanced entries

**Audit Requirements:**

- Log posting event
- Record user, timestamp
- Link to journal entry
- Capture pre/post balances

---

## 2. Payment Processing Workflow

### Business Process

```
Invoice Posted → Payment Entry → Reconciliation → Completion
```

### Detailed Workflow

#### Step 1: Payment Entry

**Actor:** Cashier  
**Permission:** `payments.create`

**User Actions:**

1. Select invoice to pay
2. Enter payment amount
3. Select payment method (cash, card, bank, customer account, etc.)
4. Enter reference number (for bank transfers)
5. Add payment notes (optional)
6. Click "Record Payment"

**System Actions:**

- Validate invoice is posted or partial
- Validate amount ≤ remaining balance
- Generate payment number: `PAY-20260624-0001`
- Create payment record
- Update invoice status:
  - If full payment: status = 'paid'
  - If partial: status = 'partial'
- Create journal entry:
  ```
  Dr Cash/Bank/AR Account (per method)
  Cr AR Control (1120) | subledger: customer
  ```
- Post journal entry
- Update customer balance

**Database Changes:**

```sql
INSERT INTO payments (number, invoice_id, method, amount, reference_number, paid_at, branch_id, user_id, entity_type, entity_id)
VALUES ('PAY-20260624-0001', 1, 'cash', 100.00, NULL, NOW(), 1, 3, NULL, NULL);

-- Update invoice
UPDATE invoices
SET status = 'paid', payment_method = 'cash', paid_at = NOW()
WHERE id = 1;

-- Create journal entry
INSERT INTO transactions (transaction_number, date, type, status, description, branch_id, user_id, source_type, source_id, posted_at)
VALUES ('JV-2026-0002', '2026-06-24', 'receipt', 'posted', 'Payment PAY-20260624-0001', 1, 3, 'Payment', 1, NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
VALUES
  (2, 10, 100.00, 0.00, 'Cash receipt - INV-20260624-0001', NULL, NULL),  -- Cash
  (2, 15, 0.00, 100.00, 'Payment for INV-20260624-0001', 'customer', 5);  -- AR Control

-- Update customer balance
UPDATE customer_balances
SET current_balance = current_balance - 100.00,
    last_updated = NOW()
WHERE customer_id = 5;
```

**Accounting Impact:**

- Cash/Bank account increases (debit)
- AR Control account decreases (credit)
- Customer subledger updated
- Customer balance decreased

**Journal Entry Impact:**

- Transaction created and posted
- Two entries created (balanced)
- Account balances updated

**UI/UX Requirements:**

- Payment entry form
- Payment method selector
- Remaining balance display
- Split payment option (multiple methods)
- Receipt preview/print
- Payment confirmation

**Risks:**

- Overpayment
- Incorrect payment method
- Duplicate payments
- Unauthorized payment methods

**Audit Requirements:**

- Log payment creation
- Record payment method
- Capture reference numbers
- Link to invoice
- Record user, timestamp, branch

---

#### Step 2: Payment Reconciliation

**Actor:** Accountant  
**Permission:** `payments.reconcile`

**User Actions:**

1. View unreconciled payments
2. Match payment to bank statement
3. Confirm reconciliation
4. Add reconciliation notes

**System Actions:**

- Validate payment is not already reconciled
- Update payment status = 'reconciled'
- Record reconciliation date and user
- Create reconciliation log

**Database Changes:**

```sql
UPDATE payments
SET status = 'reconciled',
    reconciliation_date = '2026-06-25',
    reconciled_by = 5
WHERE id = 1;
```

**Accounting Impact:** None (operational)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Unreconciled payments list
- Bank statement import
- Match/reconcile interface
- Reconciliation history

**Risks:**

- Reconciling incorrect payments
- Missing payments
- Duplicate reconciliation

**Audit Requirements:**

- Log reconciliation event
- Record reconciler identity
- Capture bank statement reference
- Maintain reconciliation history

---

## 3. Invoice Correction Workflow

### Business Process

```
Posted Invoice → Error Detected → Correction Request → Approval → Correction (not cancellation)
```

### Detailed Workflow

#### Step 1: Error Detection

**Actor:** Any user  
**Permission:** None (detection only)

**User Actions:**

1. Identify error in posted invoice
2. Note error details
3. Request correction from accounting

**System Actions:**

- None (manual process)

**UI/UX Requirements:**

- Error reporting form
- Invoice detail view with error highlighting

---

#### Step 2: Correction Request

**Actor:** Accountant  
**Permission:** `invoices.correct`

**User Actions:**

1. Review error details
2. Determine correction type:
   - Amount correction
   - Item correction
   - Customer correction
   - Tax correction
3. Create correction request
4. Submit for approval

**System Actions:**

- Create correction request record
- Lock original invoice (prevent further modifications)
- Generate correction request number
- Send approval notification

**Database Changes:**

```sql
INSERT INTO invoice_corrections (correction_number, invoice_id, correction_type, reason, status, requested_by)
VALUES ('COR-2026-0001', 1, 'amount', 'Incorrect total calculation', 'pending', 5);

UPDATE invoices SET is_locked = true WHERE id = 1;
```

**Accounting Impact:** None (pending approval)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Correction request form
- Correction type selector
- Reason field (required)
- Approval workflow indicator

**Risks:**

- Unauthorized corrections
- Incorrect correction type
- Missing approval

**Audit Requirements:**

- Log correction request
- Record requester identity
- Capture reason
- Maintain approval chain

---

#### Step 3: Correction Approval

**Actor:** Accounting Manager / CFO  
**Permission:** `invoices.correct_approve`

**User Actions:**

1. Review correction request
2. Verify error and correction
3. Approve or reject
4. Add approval notes

**System Actions:**

- Validate approver authority
- Update correction status
- If approved: proceed to correction
- If rejected: unlock invoice

**Database Changes:**

```sql
UPDATE invoice_corrections
SET status = 'approved', approved_by = 2, approved_at = NOW(), notes = 'Approved - recalculate total'
WHERE id = 1;
```

**Accounting Impact:** None (pending execution)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Approval dashboard
- Correction detail view
- Approve/reject buttons
- Notes field

**Risks:**

- Approving incorrect corrections
- Conflict of interest
- Missing documentation

**Audit Requirements:**

- Log approval/rejection
- Record approver identity
- Capture approval notes
- Maintain approval chain

---

#### Step 4: Correction Execution

**Actor:** Accountant  
**Permission:** `invoices.correct_execute`

**User Actions:**

1. Execute approved correction
2. Review generated journal entries
3. Confirm execution

**System Actions:**

- Create reversal journal entry for original
- Create corrected journal entry
- Update invoice details
- Update invoice_items
- Recalculate totals
- Update customer balance
- Unlock invoice

**Database Changes:**

```sql
-- Create reversal entry
INSERT INTO transactions (transaction_number, date, type, status, description, reversal_of_id, is_reversal, posted_at)
VALUES ('REV-2026-0001', '2026-06-24', 'sale', 'posted', 'Reversal of INV-20260624-0001', 1, true, NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
SELECT 3, account_id, credit, debit, description, subledger_type, subledger_id
FROM entries WHERE transaction_id = 1;

-- Create corrected entry
INSERT INTO transactions (transaction_number, date, type, status, description, posted_at)
VALUES ('JV-2026-0003', '2026-06-24', 'sale', 'posted', 'Corrected INV-20260624-0001', NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
VALUES
  (4, 15, 110.00, 0.00, 'Corrected Invoice INV-20260624-0001', 'customer', 5),
  (4, 20, 0.00, 110.00, 'Corrected Sales Revenue', NULL, NULL);

-- Update invoice
UPDATE invoices
SET subtotal = 110.00, total = 110.00, is_locked = false
WHERE id = 1;

-- Update customer balance
UPDATE customer_balances
SET current_balance = current_balance + 10.00,  -- Difference
    last_updated = NOW()
WHERE customer_id = 5;
```

**Accounting Impact:**

- Original entry reversed
- Corrected entry posted
- Account balances updated
- Customer balance adjusted

**Journal Entry Impact:**

- Reversal transaction created
- Corrected transaction created
- Both posted
- Linked to original

**UI/UX Requirements:**

- Correction execution confirmation
- Before/after comparison
- Journal entry preview
- Execution summary

**Risks:**

- Incorrect reversal
- Missing entries
- Balance discrepancies
- Unauthorized execution

**Audit Requirements:**

- Log correction execution
- Record executor identity
- Link to reversal and corrected entries
- Capture before/after values
- Maintain full audit trail

---

## 4. Invoice Cancellation Workflow

### Business Process

```
Posted Invoice → Cancellation Request → Approval → Void with Reversal
```

### Detailed Workflow

#### Step 1: Cancellation Request

**Actor:** Cashier / Accountant  
**Permission:** `invoices.cancel`

**User Actions:**

1. Select invoice to cancel
2. Verify invoice is posted (not paid)
3. Select cancellation reason:
   - Duplicate invoice
   - Customer request
   - Error in order
   - Other (specify)
4. Add cancellation notes
5. Click "Request Cancellation"

**System Actions:**

- Validate invoice is posted (not paid)
- Check if payments exist (prevent cancellation if paid)
- Create cancellation request
- Lock invoice
- Send approval notification

**Database Changes:**

```sql
INSERT INTO invoice_cancellations (cancellation_number, invoice_id, reason, notes, status, requested_by)
VALUES ('CAN-2026-0001', 1, 'duplicate', 'Duplicate of INV-20260624-0002', 'pending', 3);

UPDATE invoices SET is_locked = true WHERE id = 1;
```

**Accounting Impact:** None (pending approval)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Cancellation request form
- Reason dropdown
- Notes field (required)
- Warning if payments exist
- Confirmation dialog

**Risks:**

- Cancelling paid invoices
- Unauthorized cancellations
- Missing documentation
- Duplicate cancellations

**Audit Requirements:**

- Log cancellation request
- Record requester identity
- Capture reason and notes
- Maintain approval chain

---

#### Step 2: Cancellation Approval

**Actor:** Accounting Manager / CFO  
**Permission:** `invoices.cancel_approve`

**User Actions:**

1. Review cancellation request
2. Verify reason and impact
3. Check for payments (must be refunded first)
4. Approve or reject
5. Add approval notes

**System Actions:**

- Validate approver authority
- Check for payments (block if exists)
- Update cancellation status
- If approved: proceed to void
- If rejected: unlock invoice

**Database Changes:**

```sql
UPDATE invoice_cancellations
SET status = 'approved', approved_by = 2, approved_at = NOW()
WHERE id = 1;
```

**Accounting Impact:** None (pending execution)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Approval dashboard
- Cancellation detail view
- Payment check indicator
- Approve/reject buttons

**Risks:**

- Approving incorrect cancellations
- Missing payment refund
- Conflict of interest

**Audit Requirements:**

- Log approval/rejection
- Record approver identity
- Capture approval notes

---

#### Step 3: Cancellation Execution (Void)

**Actor:** Accountant  
**Permission:** `invoices.cancel_execute`

**User Actions:**

1. Execute approved cancellation
2. Review reversal journal entry
3. Confirm void

**System Actions:**

- Create reversal journal entry:
  ```
  Dr Revenue (4110)
  Cr AR Control (1120) | subledger: customer
  ```
- Post reversal entry
- Update invoice status = 'cancelled'
- Record cancellation details
- Update customer balance
- Unlock invoice (but marked cancelled)

**Database Changes:**

```sql
-- Create reversal entry
INSERT INTO transactions (transaction_number, date, type, status, description, reversal_of_id, is_reversal, posted_at)
VALUES ('REV-2026-0002', '2026-06-24', 'sale_reversal', 'posted', 'Void INV-20260624-0001', 1, true, NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
VALUES
  (3, 20, 100.00, 0.00, 'Void - Revenue reversal', NULL, NULL),
  (3, 15, 0.00, 100.00, 'Void - AR reversal', 'customer', 5);

-- Update invoice
UPDATE invoices
SET status = 'cancelled',
    cancelled_by = 5,
    cancelled_at = NOW(),
    cancellation_reason = 'duplicate',
    reversal_transaction_id = 3
WHERE id = 1;

-- Update customer balance
UPDATE customer_balances
SET current_balance = current_balance - 100.00,
    last_updated = NOW()
WHERE customer_id = 5;
```

**Accounting Impact:**

- Revenue reversed (debit)
- AR Control reversed (credit)
- Customer balance decreased
- Invoice marked as cancelled

**Journal Entry Impact:**

- Reversal transaction created and posted
- Linked to original transaction
- Balanced entries
- Account balances updated

**UI/UX Requirements:**

- Execution confirmation
- Reversal journal entry preview
- Cancellation summary
- Void stamp on invoice

**Risks:**

- Incorrect reversal
- Missing entries
- Balance discrepancies
- Unauthorized execution

**Audit Requirements:**

- Log cancellation execution
- Record executor identity
- Link to reversal entry
- Capture before/after values
- Maintain full audit trail

---

## 5. Product Replacement Workflow

### Business Process

```
Original Invoice → Replacement Request → Approval → New Invoice + Credit Note
```

### Detailed Workflow

#### Step 1: Replacement Request

**Actor:** Cashier / Store Manager  
**Permission:** `replacements.create`

**User Actions:**

1. Select original invoice
2. Select item to replace
3. Select replacement item
4. Enter quantity
5. Add reason (defective, wrong item, etc.)
6. Click "Request Replacement"

**System Actions:**

- Validate invoice is posted
- Validate replacement item is available
- Create replacement request
- Lock original invoice
- Send approval notification

**Database Changes:**

```sql
INSERT INTO replacements (replacement_number, original_invoice_id, original_item_id, replacement_item_id, quantity, reason, status, requested_by)
VALUES ('REP-2026-0001', 1, 10, 25, 1, 'Defective product', 'pending', 3);

UPDATE invoices SET is_locked = true WHERE id = 1;
```

**Accounting Impact:** None (pending approval)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Replacement request form
- Item selector (original + replacement)
- Quantity input
- Reason dropdown
- Price difference display
- Confirmation dialog

**Risks:**

- Replacing paid invoices
- Unavailable replacement items
- Price discrepancies
- Unauthorized replacements

**Audit Requirements:**

- Log replacement request
- Record requester identity
- Capture reason
- Link to original invoice

---

#### Step 2: Replacement Approval

**Actor:** Store Manager / Department Head  
**Permission:** `replacements.approve`

**User Actions:**

1. Review replacement request
2. Verify items and quantities
3. Check price difference
4. Approve or reject
5. Add approval notes

**System Actions:**

- Validate approver authority
- Calculate price difference
- Update replacement status
- If approved: proceed to execution
- If rejected: unlock invoice

**Database Changes:**

```sql
UPDATE replacements
SET status = 'approved', approved_by = 2, approved_at = NOW()
WHERE id = 1;
```

**Accounting Impact:** None (pending execution)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Approval dashboard
- Replacement detail view
- Price difference indicator
- Approve/reject buttons

**Risks:**

- Approving incorrect replacements
- Missing price adjustment
- Conflict of interest

**Audit Requirements:**

- Log approval/rejection
- Record approver identity
- Capture approval notes

---

#### Step 3: Replacement Execution

**Actor:** Accountant  
**Permission:** `replacements.execute`

**User Actions:**

1. Execute approved replacement
2. Review generated documents
3. Confirm execution

**System Actions:**

- Create credit note for original item
- Create new invoice for replacement item
- Create journal entries:

  ```
  For credit note:
  Dr Revenue (4110)
  Cr AR Control (1120) | subledger: customer

  For new invoice:
  Dr AR Control (1120) | subledger: customer
  Cr Revenue (4110)
  ```

- Update inventory
- Update customer balance
- Unlock original invoice
- Mark replacement as completed

**Database Changes:**

```sql
-- Create credit note
INSERT INTO credit_notes (credit_note_number, invoice_id, customer_id, amount, reason, status, created_by)
VALUES ('CN-2026-0001', 1, 5, 50.00, 'Product replacement', 'posted', 5);

-- Create journal entry for credit note
INSERT INTO transactions (transaction_number, date, type, status, description, posted_at)
VALUES ('JV-2026-0004', '2026-06-24', 'credit_note', 'posted', 'Credit Note CN-2026-0001', NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
VALUES
  (4, 20, 50.00, 0.00, 'Credit Note - Replacement', NULL, NULL),
  (4, 15, 0.00, 50.00, 'Credit Note - Customer 5', 'customer', 5);

-- Create new invoice
INSERT INTO invoices (number, customer_id, branch_id, status, subtotal, total, created_by)
VALUES ('INV-20260624-0003', 5, 1, 'posted', 60.00, 60.00, 5);

INSERT INTO invoice_items (invoice_id, item_id, item_name, quantity, price, total)
VALUES (3, 25, 'Replacement Product', 1, 60.00, 60.00);

-- Create journal entry for new invoice
INSERT INTO transactions (transaction_number, date, type, status, description, posted_at)
VALUES ('JV-2026-0005', '2026-06-24', 'sale', 'posted', 'Invoice INV-20260624-0003 (Replacement)', NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
VALUES
  (5, 15, 60.00, 0.00, 'Replacement Invoice', 'customer', 5),
  (5, 20, 0.00, 60.00, 'Replacement Revenue', NULL, NULL);

-- Update customer balance
UPDATE customer_balances
SET current_balance = current_balance - 50.00 + 60.00,
    last_updated = NOW()
WHERE customer_id = 5;

-- Update inventory
UPDATE branch_item SET quantity = quantity - 1 WHERE branch_id = 1 AND item_id = 25;

-- Update replacement status
UPDATE replacements SET status = 'completed', completed_by = 5, completed_at = NOW() WHERE id = 1;
```

**Accounting Impact:**

- Credit note: Revenue decreased, AR decreased
- New invoice: AR increased, Revenue increased
- Net effect: Revenue +10.00, AR +10.00
- Customer balance adjusted

**Journal Entry Impact:**

- Credit note transaction created
- New invoice transaction created
- Both posted
- Account balances updated

**UI/UX Requirements:**

- Execution confirmation
- Credit note preview
- New invoice preview
- Price difference summary
- Inventory update confirmation

**Risks:**

- Incorrect credit note amount
- Missing new invoice
- Inventory not updated
- Balance discrepancies

**Audit Requirements:**

- Log replacement execution
- Record executor identity
- Link to credit note and new invoice
- Capture before/after values
- Maintain full audit trail

---

## 6. Full Return Workflow

### Business Process

```
Original Invoice → Return Request → Approval → Credit Note + Refund
```

### Detailed Workflow

#### Step 1: Return Request

**Actor:** Cashier / Customer Service  
**Permission:** `returns.create`

**User Actions:**

1. Select original invoice
2. Select items to return (all items)
3. Verify items are returnable (not consumed, within return period)
4. Check item condition
5. Select return reason
6. Add return notes
7. Click "Process Return"

**System Actions:**

- Validate invoice is paid
- Validate return period (e.g., within 30 days)
- Validate items are returnable
- Create return request
- Lock original invoice
- Send approval notification

**Database Changes:**

```sql
INSERT INTO returns (return_number, invoice_id, customer_id, return_type, reason, notes, status, requested_by)
VALUES ('RET-2026-0001', 1, 5, 'full', 'Customer dissatisfied', 'All items returned', 'pending', 3);

UPDATE invoices SET is_locked = true WHERE id = 1;
```

**Accounting Impact:** None (pending approval)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Return request form
- Item list with condition selector
- Return reason dropdown
- Return period indicator
- Confirmation dialog

**Risks:**

- Returning paid invoices
- Returning non-returnable items
- Exceeding return period
- Unauthorized returns

**Audit Requirements:**

- Log return request
- Record requester identity
- Capture reason and condition
- Link to original invoice

---

#### Step 2: Return Approval

**Actor:** Store Manager / Customer Service Manager  
**Permission:** `returns.approve`

**User Actions:**

1. Review return request
2. Verify items and condition
3. Check return policy compliance
4. Approve or reject
5. Add approval notes

**System Actions:**

- Validate approver authority
- Check return policy
- Update return status
- If approved: proceed to execution
- If rejected: unlock invoice

**Database Changes:**

```sql
UPDATE returns
SET status = 'approved', approved_by = 2, approved_at = NOW()
WHERE id = 1;
```

**Accounting Impact:** None (pending execution)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Approval dashboard
- Return detail view
- Item condition photos (if applicable)
- Return policy indicator
- Approve/reject buttons

**Risks:**

- Approving incorrect returns
- Missing documentation
- Policy violations
- Conflict of interest

**Audit Requirements:**

- Log approval/rejection
- Record approver identity
- Capture approval notes

---

#### Step 3: Return Execution

**Actor:** Accountant / Cashier  
**Permission:** `returns.execute`

**User Actions:**

1. Execute approved return
2. Process refund (if applicable)
3. Confirm execution

**System Actions:**

- Create credit note for full amount
- Create journal entry:
  ```
  Dr Revenue (4110)
  Cr AR Control (1120) | subledger: customer
  ```
- Post credit note
- Update invoice status = 'returned'
- Update customer balance
- Update inventory (add back items)
- Create refund record (if applicable)
- Unlock invoice

**Database Changes:**

```sql
-- Create credit note
INSERT INTO credit_notes (credit_note_number, invoice_id, customer_id, amount, reason, status, created_by)
VALUES ('CN-2026-0002', 1, 5, 100.00, 'Full return - Customer dissatisfied', 'posted', 5);

-- Create journal entry
INSERT INTO transactions (transaction_number, date, type, status, description, posted_at)
VALUES ('JV-2026-0006', '2026-06-24', 'credit_note', 'posted', 'Credit Note CN-2026-0002 - Full Return', NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
VALUES
  (6, 20, 100.00, 0.00, 'Full Return - Revenue reversal', NULL, NULL),
  (6, 15, 0.00, 100.00, 'Full Return - Customer 5', 'customer', 5);

-- Update invoice
UPDATE invoices SET status = 'returned' WHERE id = 1;

-- Update customer balance
UPDATE customer_balances
SET current_balance = current_balance - 100.00,
    last_updated = NOW()
WHERE customer_id = 5;

-- Update inventory (add back items)
INSERT INTO branch_item (branch_id, item_id, quantity)
SELECT branch_id, item_id, quantity
FROM invoice_items
WHERE invoice_id = 1
ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity);

-- Create refund record (if cash refund)
INSERT INTO refunds (refund_number, credit_note_id, customer_id, amount, method, status, processed_by)
VALUES ('REF-2026-0001', 2, 5, 100.00, 'cash', 'completed', 5);

-- Update return status
UPDATE returns SET status = 'completed', completed_by = 5, completed_at = NOW() WHERE id = 1;
```

**Accounting Impact:**

- Revenue reversed (debit)
- AR Control reversed (credit)
- Customer balance decreased
- Inventory increased

**Journal Entry Impact:**

- Credit note transaction created and posted
- Linked to original invoice
- Balanced entries
- Account balances updated

**UI/UX Requirements:**

- Execution confirmation
- Credit note preview
- Refund processing dialog
- Return summary
- Inventory update confirmation

**Risks:**

- Incorrect credit note amount
- Missing inventory update
- Refund not processed
- Balance discrepancies

**Audit Requirements:**

- Log return execution
- Record executor identity
- Link to credit note
- Capture before/after values
- Maintain full audit trail

---

## 7. Partial Return Workflow

### Business Process

```
Original Invoice → Partial Return Request → Approval → Partial Credit Note
```

### Detailed Workflow

#### Step 1-3: Similar to Full Return

**Differences:**

- Select specific items to return (not all)
- Calculate partial amount
- Credit note for partial amount only
- Invoice status = 'partial_return' (not 'returned')

**Database Changes:**

```sql
-- Create partial credit note
INSERT INTO credit_notes (credit_note_number, invoice_id, customer_id, amount, reason, status, created_by)
VALUES ('CN-2026-0003', 1, 5, 50.00, 'Partial return - Defective item', 'posted', 5);

-- Journal entry for partial credit note
INSERT INTO transactions (transaction_number, date, type, status, description, posted_at)
VALUES ('JV-2026-0007', '2026-06-24', 'credit_note', 'posted', 'Credit Note CN-2026-0003 - Partial Return', NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
VALUES
  (7, 20, 50.00, 0.00, 'Partial Return - Revenue reversal', NULL, NULL),
  (7, 15, 0.00, 50.00, 'Partial Return - Customer 5', 'customer', 5);

-- Update invoice (mark as partial return, keep remaining items)
UPDATE invoices
SET status = 'partial_return',
    return_amount = 50.00
WHERE id = 1;

-- Update customer balance
UPDATE customer_balances
SET current_balance = current_balance - 50.00,
    last_updated = NOW()
WHERE customer_id = 5;

-- Update inventory (add back returned items only)
UPDATE branch_item bi
JOIN invoice_items ii ON bi.item_id = ii.item_id AND bi.branch_id = 1
SET bi.quantity = bi.quantity + ii.quantity
WHERE ii.invoice_id = 1 AND ii.item_id IN (returned_item_ids);
```

**Accounting Impact:**

- Partial revenue reversal
- Partial AR reduction
- Customer balance adjusted
- Inventory updated for returned items only

**Journal Entry Impact:**

- Partial credit note transaction
- Linked to original invoice
- Balanced entries

**UI/UX Requirements:**

- Item selector (checkboxes)
- Partial amount calculation
- Return summary by item
- Remaining invoice display

---

## 8. Credit Notes Workflow

### Business Process

```
Credit Note Request → Approval → Posting → Application
```

### Detailed Workflow

#### Step 1: Credit Note Creation

**Actor:** Accountant  
**Permission:** `credit_notes.create`

**User Actions:**

1. Select source (invoice, return, replacement)
2. Enter credit note amount
3. Select reason
4. Add notes
5. Click "Create Credit Note"

**System Actions:**

- Validate source document
- Calculate credit amount
- Generate credit note number: `CN-2026-0001`
- Create credit note record
- Send for approval

**Database Changes:**

```sql
INSERT INTO credit_notes (credit_note_number, invoice_id, customer_id, amount, reason, notes, status, created_by)
VALUES ('CN-2026-0001', 1, 5, 50.00, 'Goodwill', 'Customer satisfaction gesture', 'draft', 5);
```

**Accounting Impact:** None (draft)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Credit note creation form
- Source document selector
- Amount input
- Reason dropdown
- Notes field

**Risks:**

- Unauthorized credit notes
- Incorrect amounts
- Missing documentation

**Audit Requirements:**

- Log credit note creation
- Record creator identity
- Link to source document

---

#### Step 2: Credit Note Approval

**Actor:** Accounting Manager  
**Permission:** `credit_notes.approve`

**User Actions:**

1. Review credit note
2. Verify reason and amount
3. Approve or reject
4. Add approval notes

**System Actions:**

- Validate approver authority
- Update credit note status
- If approved: proceed to posting
- If rejected: mark as rejected

**Database Changes:**

```sql
UPDATE credit_notes
SET status = 'approved', approved_by = 2, approved_at = NOW()
WHERE id = 1;
```

**Accounting Impact:** None (pending posting)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Approval dashboard
- Credit note detail view
- Approve/reject buttons

---

#### Step 3: Credit Note Posting

**Actor:** System (automatic) or Accountant  
**Permission:** `credit_notes.post`

**User Actions:**

- None (automatic) OR
- Click "Post Credit Note"

**System Actions:**

- Validate credit note is approved
- Create journal entry:
  ```
  Dr Revenue (4110) or Dr Sales Discount (4120)
  Cr AR Control (1120) | subledger: customer
  ```
- Post journal entry
- Update credit note status = 'posted'
- Update customer balance

**Database Changes:**

```sql
-- Create journal entry
INSERT INTO transactions (transaction_number, date, type, status, description, posted_at)
VALUES ('JV-2026-0008', '2026-06-24', 'credit_note', 'posted', 'Credit Note CN-2026-0001', NOW());

INSERT INTO entries (transaction_id, account_id, debit, credit, description, subledger_type, subledger_id)
VALUES
  (8, 20, 50.00, 0.00, 'Credit Note - Goodwill', NULL, NULL),
  (8, 15, 0.00, 50.00, 'Credit Note - Customer 5', 'customer', 5);

-- Update credit note
UPDATE credit_notes
SET status = 'posted', posted_at = NOW(), transaction_id = 8
WHERE id = 1;

-- Update customer balance
UPDATE customer_balances
SET current_balance = current_balance - 50.00,
    last_updated = NOW()
WHERE customer_id = 5;
```

**Accounting Impact:**

- Revenue or discount account decreased
- AR Control decreased
- Customer balance decreased

**Journal Entry Impact:**

- Credit note transaction created and posted
- Balanced entries
- Account balances updated

**UI/UX Requirements:**

- Posting confirmation
- Journal entry preview
- Customer balance update indicator

---

#### Step 4: Credit Note Application

**Actor:** Accountant  
**Permission:** `credit_notes.apply`

**User Actions:**

1. Select credit note to apply
2. Select invoice to apply to
3. Confirm application

**System Actions:**

- Validate credit note is posted
- Validate invoice is posted
- Apply credit note to invoice
- Update invoice balance
- Update credit note status = 'applied'

**Database Changes:**

```sql
UPDATE credit_notes
SET status = 'applied',
    applied_to_invoice_id = 1,
    applied_at = NOW()
WHERE id = 1;

-- Update invoice (reduce balance)
UPDATE invoices
SET credit_note_amount = 50.00,
    balance_due = 50.00  -- Original 100 - credit 50
WHERE id = 1;
```

**Accounting Impact:** None (already posted)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Credit note list
- Invoice selector
- Application confirmation
- Balance update display

---

## 9. Reversal Entries Workflow

### Business Process

```
Posted Transaction → Reversal Request → Approval → Reversal Entry
```

### Detailed Workflow

#### Step 1: Reversal Request

**Actor:** Accountant  
**Permission:** `transactions.reverse`

**User Actions:**

1. Select transaction to reverse
2. Verify transaction is posted
3. Enter reversal reason
4. Add reversal notes
5. Click "Request Reversal"

**System Actions:**

- Validate transaction is posted
- Validate transaction is not already reversed
- Create reversal request
- Lock original transaction
- Send approval notification

**Database Changes:**

```sql
INSERT INTO transaction_reversals (reversal_number, original_transaction_id, reason, notes, status, requested_by)
VALUES ('REV-2026-0001', 1, 'Error in entry', 'Incorrect account used', 'pending', 5);

UPDATE transactions SET is_locked = true WHERE id = 1;
```

**Accounting Impact:** None (pending approval)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Reversal request form
- Transaction selector
- Reason field (required)
- Notes field
- Original entry preview

**Risks:**

- Reversing incorrect transactions
- Unauthorized reversals
- Missing documentation
- Duplicate reversals

**Audit Requirements:**

- Log reversal request
- Record requester identity
- Capture reason
- Link to original transaction

---

#### Step 2: Reversal Approval

**Actor:** Accounting Manager / CFO  
**Permission:** `transactions.reverse_approve`

**User Actions:**

1. Review reversal request
2. Verify original transaction
3. Check impact on financial statements
4. Approve or reject
5. Add approval notes

**System Actions:**

- Validate approver authority
- Update reversal status
- If approved: proceed to execution
- If rejected: unlock transaction

**Database Changes:**

```sql
UPDATE transaction_reversals
SET status = 'approved', approved_by = 2, approved_at = NOW()
WHERE id = 1;
```

**Accounting Impact:** None (pending execution)

**Journal Entry Impact:** None

**UI/UX Requirements:**

- Approval dashboard
- Reversal detail view
- Original transaction preview
- Impact analysis
- Approve/reject buttons

**Risks:**

- Approving incorrect reversals
- Missing impact analysis
- Conflict of interest

**Audit Requirements:**

- Log approval/rejection
- Record approver identity
- Capture approval notes

---

#### Step 3: Reversal Execution

**Actor:** Accountant  
**Permission:** `transactions.reverse_execute`

**User Actions:**

1. Execute approved reversal
2. Review reversal journal entry
3. Confirm execution

**System Actions:**

- Create reversal transaction:
  ```
  For each entry in original:
    Swap debit and credit
  ```
- Post reversal transaction
- Update original transaction status = 'reversed'
- Link reversal to original
- Update account balances
- Unlock original transaction

**Database Changes:**

```sql
-- Create reversal transaction
INSERT INTO transactions (transaction_number, date, type, status, description, reversal_of_id, is_reversal, posted_at)
VALUES ('REV-2026-0002', '2026-06-24', 'sale_reversal', 'posted', 'Reversal of JV-2026-0001', 1, true, NOW());

-- Reverse each entry (swap debit/credit)
INSERT INTO entries (transaction_id, account_id, debit, credit, description, cost_center_id, subledger_type, subledger_id)
SELECT
  9,  -- reversal transaction ID
  account_id,
  credit,  -- swapped
  debit,   -- swapped
  CONCAT('Reversal - ', description),
  cost_center_id,
  subledger_type,
  subledger_id
FROM entries
WHERE transaction_id = 1;

-- Update original transaction
UPDATE transactions
SET status = 'reversed',
    reversed_by = 5,
    reversed_at = NOW(),
    reversal_transaction_id = 9
WHERE id = 1;

-- Update account balances (automatically via triggers or batch job)
-- This would be handled by account balance update logic
```

**Accounting Impact:**

- All entries reversed
- Account balances restored to pre-transaction state
- Original transaction marked as reversed

**Journal Entry Impact:**

- Reversal transaction created and posted
- Linked to original
- All entries reversed
- Balanced

**UI/UX Requirements:**

- Execution confirmation
- Reversal entry preview
- Before/after comparison
- Execution summary

**Risks:**

- Incorrect reversal
- Missing entries
- Balance discrepancies
- Unauthorized execution

**Audit Requirements:**

- Log reversal execution
- Record executor identity
- Link to reversal transaction
- Capture before/after values
- Maintain full audit trail

---

## 10. Approval Workflows

### Workflow Types

#### 1. Invoice Approval Workflow

```
Invoice Created (draft)
  ↓
Submit for Approval
  ↓
Accounting Manager Review
  ↓
[Approve] → Posted
[Reject] → Draft (with notes)
```

**Roles:**

- Requester: Cashier, Sales Rep
- Approver: Accounting Manager, CFO

**Conditions:**

- Invoice total > 0
- Order is confirmed
- Customer is valid

**Time Limits:**

- Approval within 24 hours
- Auto-escalation after 48 hours

---

#### 2. Payment Approval Workflow

```
Payment Entered
  ↓
[Amount < 1000] → Auto-approved
[Amount >= 1000] → Manager Approval
[Amount >= 10000] → Dual Approval (Manager + Director)
```

**Roles:**

- Requester: Cashier
- Approver: Manager, Director

**Conditions:**

- Payment amount threshold
- Payment method validation

**Time Limits:**

- Immediate for small amounts
- Within 4 hours for large amounts

---

#### 3. Credit Note Approval Workflow

```
Credit Note Created
  ↓
[Amount < 500] → Accountant Approval
[Amount >= 500] → Manager Approval
[Amount >= 5000] → CFO Approval
```

**Roles:**

- Requester: Accountant, Customer Service
- Approver: Manager, CFO

**Conditions:**

- Credit note amount
- Customer credit limit check
- Reason validation

**Time Limits:**

- Within 24 hours

---

#### 4. Journal Entry Approval Workflow

```
Journal Entry Created (draft)
  ↓
[Auto-generated] → Auto-posted (if balanced)
[Manual entry] → Accountant Approval
[Amount > 10000] → Manager Approval
```

**Roles:**

- Creator: Accountant, System
- Approver: Accounting Manager

**Conditions:**

- Entry is balanced
- Accounts are active
- Period is open

**Time Limits:**

- Auto-post: immediate
- Manual approval: within 24 hours

---

#### 5. Cancellation Approval Workflow

```
Cancellation Requested
  ↓
[No payments] → Manager Approval
[Has payments] → CFO Approval + Refund Required
```

**Roles:**

- Requester: Cashier, Accountant
- Approver: Manager, CFO

**Conditions:**

- No payments OR refund processed
- Valid reason
- Documentation complete

**Time Limits:**

- Within 48 hours

---

## 11. Audit Trails

### Audit Event Types

```php
enum AuditEvent: string
{
    // Invoice events
    INVOICE_CREATED = 'invoice.created';
    INVOICE_SUBMITTED = 'invoice.submitted';
    INVOICE_APPROVED = 'invoice.approved';
    INVOICE_POSTED = 'invoice.posted';
    INVOICE_PAID = 'invoice.paid';
    INVOICE_CANCELLED = 'invoice.cancelled';
    INVOICE_CORRECTED = 'invoice.corrected';

    // Payment events
    PAYMENT_CREATED = 'payment.created';
    PAYMENT_RECONCILED = 'payment.reconciled';
    PAYMENT_REFUNDED = 'payment.refunded';
    PAYMENT_VOIDED = 'payment.voided';

    // Journal entry events
    TRANSACTION_CREATED = 'transaction.created';
    TRANSACTION_POSTED = 'transaction.posted';
    TRANSACTION_REVERSED = 'transaction.reversed';
    TRANSACTION_APPROVED = 'transaction.approved';

    // Credit note events
    CREDIT_NOTE_CREATED = 'credit_note.created';
    CREDIT_NOTE_APPROVED = 'credit_note.approved';
    CREDIT_NOTE_POSTED = 'credit_note.posted';
    CREDIT_NOTE_APPLIED = 'credit_note.applied';

    // Return events
    RETURN_REQUESTED = 'return.requested';
    RETURN_APPROVED = 'return.approved';
    RETURN_COMPLETED = 'return.completed';

    // System events
    USER_LOGIN = 'user.login';
    USER_LOGOUT = 'user.logout';
    PERMISSION_DENIED = 'permission.denied';
}
```

### Audit Log Structure

```php
class AuditLog extends Model
{
    'id'
    'event_type'          // AuditEvent enum
    'auditable_type'      // Model class
    'auditable_id'        // Model ID
    'user_id'             // User who performed action
    'branch_id'           // Branch where action occurred
    'ip_address'          // User IP
    'user_agent'          // Browser/client info
    'session_id'          // User session
    'old_values'          // JSON - before state
    'new_values'          // JSON - after state
    'changes_summary'     // Human-readable summary
    'reason'              // Reason for change (if applicable)
    'metadata'            // Additional context (JSON)
    'created_at'

    // Indexes
    INDEX: (event_type, auditable_type, auditable_id)
    INDEX: (user_id, created_at)
    INDEX: (branch_id, created_at)
    INDEX: (created_at)
}
```

### Audit Log Examples

```json
// Invoice creation
{
  "event_type": "invoice.created",
  "auditable_type": "Invoice",
  "auditable_id": 1,
  "user_id": 3,
  "branch_id": 1,
  "old_values": null,
  "new_values": {
    "number": "INV-20260624-0001",
    "order_id": 1,
    "customer_id": 5,
    "total": 100.00,
    "status": "draft"
  },
  "changes_summary": "Invoice INV-20260624-0001 created for Customer 5, Total: 100.00",
  "reason": null
}

// Invoice approval
{
  "event_type": "invoice.approved",
  "auditable_type": "Invoice",
  "auditable_id": 1,
  "user_id": 5,
  "branch_id": 1,
  "old_values": {
    "status": "draft"
  },
  "new_values": {
    "status": "approved",
    "approved_by": 5,
    "approved_at": "2026-06-24 10:30:00"
  },
  "changes_summary": "Invoice INV-20260624-0001 approved by User 5",
  "reason": "Verified order and items"
}

// Payment creation
{
  "event_type": "payment.created",
  "auditable_type": "Payment",
  "auditable_id": 1,
  "user_id": 3,
  "branch_id": 1,
  "old_values": null,
  "new_values": {
    "number": "PAY-20260624-0001",
    "invoice_id": 1,
    "method": "cash",
    "amount": 100.00
  },
  "changes_summary": "Payment PAY-20260624-0001 recorded for Invoice INV-20260624-0001, Amount: 100.00, Method: cash",
  "reason": null
}

// Journal entry reversal
{
  "event_type": "transaction.reversed",
  "auditable_type": "Transaction",
  "auditable_id": 1,
  "user_id": 5,
  "branch_id": 1,
  "old_values": {
    "status": "posted",
    "transaction_number": "JV-2026-0001"
  },
  "new_values": {
    "status": "reversed",
    "reversed_by": 5,
    "reversed_at": "2026-06-24 11:00:00",
    "reversal_transaction_id": 9
  },
  "changes_summary": "Transaction JV-2026-0001 reversed by User 5, Reversal: REV-2026-0002",
  "reason": "Error in account used"
}
```

### Audit Trail Implementation

```php
// Observer for all financial models
class AuditObserver
{
    public function created(Model $model)
    {
        if (!$this->shouldAudit($model)) return;

        AuditLog::create([
            'event_type' => $this->getEventType($model, 'created'),
            'auditable_type' => get_class($model),
            'auditable_id' => $model->id,
            'user_id' => auth()->id(),
            'branch_id' => $this->getBranchId($model),
            'new_values' => $model->toArray(),
            'changes_summary' => $this->getSummary($model, 'created'),
        ]);
    }

    public function updated(Model $model)
    {
        if (!$this->shouldAudit($model)) return;

        AuditLog::create([
            'event_type' => $this->getEventType($model, 'updated'),
            'auditable_type' => get_class($model),
            'auditable_id' => $model->id,
            'user_id' => auth()->id(),
            'branch_id' => $this->getBranchId($model),
            'old_values' => $model->getOriginal(),
            'new_values' => $model->getChanges(),
            'changes_summary' => $this->getSummary($model, 'updated'),
        ]);
    }

    private function shouldAudit(Model $model): bool
    {
        return in_array(get_class($model), [
            Invoice::class,
            Payment::class,
            Transaction::class,
            Entry::class,
            CreditNote::class,
            Return::class,
            Replacement::class,
        ]);
    }
}
```

---

# Recommended Roles & Permissions

## Role Hierarchy

```
┌─────────────────────────────────────────┐
│           SUPER ADMIN                    │
│  (System Administrator)                 │
│  - Full system access                    │
│  - User management                       │
│  - System configuration                   │
└─────────────────────────────────────────┘
                   │
                   ├─────────────────────────────────────────┐
                   │                                         │
          ┌────────▼────────┐                    ┌──────────▼─────────┐
          │   CFO / Finance │                    │  Operations Manager │
          │    Director     │                    │                     │
          │  - All financial│                    │ - Branch oversight  │
          │    approvals     │                    │ - Operations access │
          └─────────────────┘                    └─────────────────────┘
                   │
                   ├─────────────────────────────────────────┐
                   │                                         │
          ┌────────▼────────┐                    ┌──────────▼─────────┐
          │ Accounting      │                    │  Store Manager      │
          │ Manager         │                    │                     │
          │ - JE approval   │                    │ - Store operations  │
          │ - Period close  │                    │ - Staff management  │
          └─────────────────┘                    └─────────────────────┘
                   │
                   ├─────────────────────────────────────────┐
                   │                                         │
          ┌────────▼────────┐                    ┌──────────▼─────────┐
          │  Accountant     │                    │    Cashier          │
          │                 │                    │                     │
          │ - JE creation   │                    │ - POS operations    │
          │ - Reconciliation│                    │ - Payment entry     │
          │ - Reporting     │                    │ - Invoice creation  │
          └─────────────────┘                    └─────────────────────┘
                   │
                   ├─────────────────────────────────────────┐
                   │                                         │
          ┌────────▼────────┐                    ┌──────────▼─────────┐
          │  Auditor        │                    │  Customer Service   │
          │                 │                    │                     │
          │ - Read-only     │                    │ - Returns           │
          │ - Audit access  │                    │ - Replacements      │
          │ - Reports       │                    │ - Credit notes      │
          └─────────────────┘                    └─────────────────────┘
```

## Detailed Permissions Matrix

### Invoice Permissions

| Permission                 | Cashier        | Accountant | Manager | CFO     | Auditor |
| -------------------------- | -------------- | ---------- | ------- | ------- | ------- |
| `invoices.create`          | ✓              | ✓          | ✓       | ✓       | ✗       |
| `invoices.view`            | ✓ (own branch) | ✓ (all)    | ✓ (all) | ✓ (all) | ✓ (all) |
| `invoices.edit` (draft)    | ✓ (own)        | ✓ (all)    | ✓ (all) | ✓ (all) | ✗       |
| `invoices.submit`          | ✓              | ✓          | ✓       | ✓       | ✗       |
| `invoices.approve`         | ✗              | ✗          | ✓       | ✓       | ✗       |
| `invoices.post`            | ✗              | ✓          | ✓       | ✓       | ✗       |
| `invoices.cancel`          | ✗              | ✗          | ✓       | ✓       | ✗       |
| `invoices.cancel_approve`  | ✗              | ✗          | ✗       | ✓       | ✗       |
| `invoices.correct`         | ✗              | ✓          | ✓       | ✓       | ✗       |
| `invoices.correct_approve` | ✗              | ✗          | ✓       | ✓       | ✗       |

### Payment Permissions

| Permission                | Cashier | Accountant | Manager | CFO     | Auditor |
| ------------------------- | ------- | ---------- | ------- | ------- | ------- |
| `payments.create`         | ✓       | ✓          | ✓       | ✓       | ✗       |
| `payments.view`           | ✓ (own) | ✓ (all)    | ✓ (all) | ✓ (all) | ✓ (all) |
| `payments.edit` (entered) | ✓ (own) | ✓ (all)    | ✓ (all) | ✓ (all) | ✗       |
| `payments.reconcile`      | ✗       | ✓          | ✓       | ✓       | ✗       |
| `payments.refund`         | ✗       | ✗          | ✓       | ✓       | ✗       |
| `payments.void`           | ✗       | ✗          | ✓       | ✓       | ✗       |

### Journal Entry Permissions

| Permission                     | Cashier | Accountant | Manager | CFO | Auditor |
| ------------------------------ | ------- | ---------- | ------- | --- | ------- |
| `transactions.create`          | ✗       | ✓          | ✓       | ✓   | ✗       |
| `transactions.view`            | ✗       | ✓          | ✓       | ✓   | ✓       |
| `transactions.edit` (draft)    | ✗       | ✓          | ✓       | ✓   | ✗       |
| `transactions.post`            | ✗       | ✓          | ✓       | ✓   | ✗       |
| `transactions.approve`         | ✗       | ✗          | ✓       | ✓   | ✗       |
| `transactions.reverse`         | ✗       | ✗          | ✓       | ✓   | ✗       |
| `transactions.reverse_approve` | ✗       | ✗          | ✗       | ✓   | ✗       |

### Credit Note Permissions

| Permission             | Cashier | Accountant | Manager | CFO | Auditor |
| ---------------------- | ------- | ---------- | ------- | --- | ------- |
| `credit_notes.create`  | ✗       | ✓          | ✓       | ✓   | ✗       |
| `credit_notes.view`    | ✗       | ✓          | ✓       | ✓   | ✓       |
| `credit_notes.approve` | ✗       | ✗          | ✓       | ✓   | ✗       |
| `credit_notes.post`    | ✗       | ✓          | ✓       | ✓   | ✗       |
| `credit_notes.apply`   | ✗       | ✓          | ✓       | ✓   | ✗       |

### Return Permissions

| Permission        | Cashier | Accountant | Manager | CFO     | Auditor |
| ----------------- | ------- | ---------- | ------- | ------- | ------- |
| `returns.create`  | ✓       | ✓          | ✓       | ✓       | ✗       |
| `returns.view`    | ✓ (own) | ✓ (all)    | ✓ (all) | ✓ (all) | ✓ (all) |
| `returns.approve` | ✗       | ✗          | ✓       | ✓       | ✗       |
| `returns.execute` | ✗       | ✓          | ✓       | ✓       | ✗       |

### Replacement Permissions

| Permission             | Cashier | Accountant | Manager | CFO     | Auditor |
| ---------------------- | ------- | ---------- | ------- | ------- | ------- |
| `replacements.create`  | ✓       | ✓          | ✓       | ✓       | ✗       |
| `replacements.view`    | ✓ (own) | ✓ (all)    | ✓ (all) | ✓ (all) | ✓ (all) |
| `replacements.approve` | ✗       | ✗          | ✓       | ✓       | ✗       |
| `replacements.execute` | ✗       | ✓          | ✓       | ✓       | ✗       |

### System Permissions

| Permission       | Cashier | Accountant | Manager | CFO | Auditor |
| ---------------- | ------- | ---------- | ------- | --- | ------- |
| `periods.open`   | ✗       | ✗          | ✗       | ✓   | ✗       |
| `periods.close`  | ✗       | ✗          | ✗       | ✓   | ✗       |
| `reports.view`   | ✗       | ✓          | ✓       | ✓   | ✓       |
| `reports.export` | ✗       | ✓          | ✓       | ✓   | ✓       |
| `audit.view`     | ✗       | ✗          | ✗       | ✓   | ✓       |
| `users.manage`   | ✗       | ✗          | ✗       | ✓   | ✗       |
| `roles.manage`   | ✗       | ✗          | ✗       | ✓   | ✗       |

---

# Recommended Database Structure

## Core Tables

### invoices

```sql
CREATE TABLE invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    number VARCHAR(50) UNIQUE NOT NULL,
    order_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    branch_id BIGINT UNSIGNED NOT NULL,

    -- Status
    status ENUM('draft', 'pending_approval', 'approved', 'posted', 'partial', 'paid', 'partial_return', 'returned', 'cancelled', 'void') DEFAULT 'draft',

    -- Financial
    subtotal DECIMAL(15,3) NOT NULL DEFAULT 0,
    discount DECIMAL(15,3) NOT NULL DEFAULT 0,
    discount_type ENUM('fixed', 'percent') NULL,
    discount_value DECIMAL(15,3) NULL,
    tax DECIMAL(15,3) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,3) NOT NULL DEFAULT 0,
    balance_due DECIMAL(15,3) NOT NULL DEFAULT 0,
    credit_note_amount DECIMAL(15,3) NOT NULL DEFAULT 0,

    -- Payment
    payment_method VARCHAR(50) NULL,
    paid_at DATETIME NULL,

    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE NULL,

    -- Approval
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,
    posted_by BIGINT UNSIGNED NULL,
    posted_at DATETIME NULL,

    -- Cancellation
    cancelled_by BIGINT UNSIGNED NULL,
    cancelled_at DATETIME NULL,
    cancellation_reason TEXT NULL,
    reversal_transaction_id BIGINT UNSIGNED NULL,

    -- Other
    notes TEXT NULL,
    terms_conditions TEXT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    created_by BIGINT UNSIGNED NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_number (number),
    INDEX idx_customer (customer_id),
    INDEX idx_branch (branch_id),
    INDEX idx_status (status),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_created_at (created_at),
    INDEX idx_approved_at (approved_at),
    INDEX idx_posted_at (posted_at),

    -- Foreign Keys
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (posted_by) REFERENCES users(id),
    FOREIGN KEY (cancelled_by) REFERENCES users(id),
    FOREIGN KEY (reversal_transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### invoice_items

```sql
CREATE TABLE invoice_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NULL,
    item_name VARCHAR(255) NOT NULL,
    item_name_ar VARCHAR(255) NULL,
    description TEXT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    price DECIMAL(15,3) NOT NULL,
    discount DECIMAL(15,3) NOT NULL DEFAULT 0,
    discount_type ENUM('fixed', 'percent') NULL,
    tax DECIMAL(15,3) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,3) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_invoice (invoice_id),
    INDEX idx_item (item_id),

    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### payments

```sql
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id BIGINT UNSIGNED NOT NULL,
    method ENUM('cash', 'card', 'bank_transfer', 'cheque', 'wallet', 'account') NOT NULL,
    payment_method_id BIGINT UNSIGNED NULL,
    amount DECIMAL(15,3) NOT NULL,
    reference_number VARCHAR(255) NULL,
    paid_at DATETIME NOT NULL,

    -- Entity payment (customer/employee/supplier account)
    entity_type ENUM('customer', 'employee', 'supplier') NULL,
    entity_id BIGINT UNSIGNED NULL,
    subledger_type ENUM('customer', 'employee', 'supplier') NULL,
    subledger_id BIGINT UNSIGNED NULL,

    -- Status
    status ENUM('entered', 'applied', 'reconciled', 'refunded', 'void') DEFAULT 'entered',

    -- Reconciliation
    reconciliation_date DATE NULL,
    reconciled_by BIGINT UNSIGNED NULL,

    -- Refund
    refund_transaction_id BIGINT UNSIGNED NULL,
    refunded_at DATETIME NULL,
    refunded_by BIGINT UNSIGNED NULL,

    -- Other
    notes TEXT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_number (number),
    INDEX idx_invoice (invoice_id),
    INDEX idx_method (method),
    INDEX idx_status (status),
    INDEX idx_paid_at (paid_at),
    INDEX idx_entity (entity_type, entity_id),

    -- Foreign Keys
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (reconciled_by) REFERENCES users(id),
    FOREIGN KEY (refund_transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (refunded_by) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### transactions (Journal Entries)

```sql
CREATE TABLE transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    reference VARCHAR(255) NULL,
    type ENUM('sale', 'receipt', 'payment', 'purchase', 'disbursement', 'journal', 'opening', 'closing', 'adjustment', 'reversal', 'credit_note', 'debit_note', 'write_off') NOT NULL,
    status ENUM('draft', 'pending_approval', 'posted', 'reversed', 'cancelled') DEFAULT 'draft',
    description TEXT NOT NULL,
    notes TEXT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,

    -- Source document
    source_type VARCHAR(255) NULL,
    source_id BIGINT UNSIGNED NULL,

    -- Reversal
    reversal_of_id BIGINT UNSIGNED NULL,
    is_reversal BOOLEAN DEFAULT FALSE,

    -- Approval
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,

    -- Posting
    posted_at DATETIME NULL,

    -- Period
    period_id BIGINT UNSIGNED NULL,

    -- Currency
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(15,6) DEFAULT 1,

    -- Other
    is_auto_generated BOOLEAN DEFAULT FALSE,
    source_document VARCHAR(255) NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_transaction_number (transaction_number),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_date (date),
    INDEX idx_branch (branch_id),
    INDEX idx_user (user_id),
    INDEX idx_source (source_type, source_id),
    INDEX idx_period (period_id),
    INDEX idx_posted_at (posted_at),

    -- Foreign Keys
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (reversal_of_id) REFERENCES transactions(id),
    FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### entries (Journal Entry Lines)

```sql
CREATE TABLE entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    debit DECIMAL(15,3) NOT NULL DEFAULT 0,
    credit DECIMAL(15,3) NOT NULL DEFAULT 0,
    description TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,

    -- Cost center
    cost_center_id BIGINT UNSIGNED NULL,

    -- Subledger
    subledger_type ENUM('customer', 'employee', 'supplier') NULL,
    subledger_id BIGINT UNSIGNED NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_transaction (transaction_id),
    INDEX idx_account (account_id),
    INDEX idx_cost_center (cost_center_id),
    INDEX idx_subledger (subledger_type, subledger_id),

    -- Foreign Keys
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### credit_notes

```sql
CREATE TABLE credit_notes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15,3) NOT NULL,
    reason ENUM('return', 'replacement', 'goodwill', 'error', 'other') NOT NULL,
    notes TEXT NULL,
    status ENUM('draft', 'pending_approval', 'approved', 'posted', 'applied', 'cancelled') DEFAULT 'draft',

    -- Approval
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,

    -- Posting
    posted_at DATETIME NULL,
    transaction_id BIGINT UNSIGNED NULL,

    -- Application
    applied_to_invoice_id BIGINT UNSIGNED NULL,
    applied_at DATETIME NULL,

    -- Other
    created_by BIGINT UNSIGNED NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_credit_note_number (credit_note_number),
    INDEX idx_invoice (invoice_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_posted_at (posted_at),

    -- Foreign Keys
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (applied_to_invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### returns

```sql
CREATE TABLE returns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    return_type ENUM('full', 'partial') NOT NULL,
    reason ENUM('defective', 'wrong_item', 'not_as_described', 'customer_dissatisfied', 'other') NOT NULL,
    notes TEXT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',

    -- Financial
    total_amount DECIMAL(15,3) NOT NULL,
    refund_amount DECIMAL(15,3) NULL,
    refund_method ENUM('cash', 'card', 'bank_transfer', 'store_credit', 'exchange') NULL,

    -- Approval
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,

    -- Completion
    completed_by BIGINT UNSIGNED NULL,
    completed_at DATETIME NULL,
    credit_note_id BIGINT UNSIGNED NULL,

    -- Other
    requested_by BIGINT UNSIGNED NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_return_number (return_number),
    INDEX idx_invoice (invoice_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),

    -- Foreign Keys
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id),
    FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id),
    FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### return_items

```sql
CREATE TABLE return_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_id BIGINT UNSIGNED NOT NULL,
    invoice_item_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    price DECIMAL(15,3) NOT NULL,
    total DECIMAL(15,3) NOT NULL,
    condition ENUM('new', 'used', 'damaged', 'defective') NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_return (return_id),
    INDEX idx_invoice_item (invoice_item_id),
    INDEX idx_item (item_id),

    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### replacements

```sql
CREATE TABLE replacements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    replacement_number VARCHAR(50) UNIQUE NOT NULL,
    original_invoice_id BIGINT UNSIGNED NOT NULL,
    original_item_id BIGINT UNSIGNED NOT NULL,
    replacement_item_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    reason ENUM('defective', 'wrong_item', 'damaged', 'other') NOT NULL,
    notes TEXT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',

    -- Financial
    original_amount DECIMAL(15,3) NOT NULL,
    replacement_amount DECIMAL(15,3) NOT NULL,
    price_difference DECIMAL(15,3) NOT NULL DEFAULT 0,

    -- Credit note
    credit_note_id BIGINT UNSIGNED NULL,
    new_invoice_id BIGINT UNSIGNED NULL,

    -- Approval
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,

    -- Completion
    completed_by BIGINT UNSIGNED NULL,
    completed_at DATETIME NULL,

    -- Other
    requested_by BIGINT UNSIGNED NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_replacement_number (replacement_number),
    INDEX idx_original_invoice (original_invoice_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),

    -- Foreign Keys
    FOREIGN KEY (original_invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (original_item_id) REFERENCES invoice_items(id),
    FOREIGN KEY (replacement_item_id) REFERENCES items(id),
    FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id),
    FOREIGN KEY (new_invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id),
    FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### invoice_corrections

```sql
CREATE TABLE invoice_corrections (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    correction_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id BIGINT UNSIGNED NOT NULL,
    correction_type ENUM('amount', 'item', 'customer', 'tax', 'discount') NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',

    -- Changes
    old_values JSON NULL,
    new_values JSON NULL,

    -- Approval
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,

    -- Execution
    completed_by BIGINT UNSIGNED NULL,
    completed_at DATETIME NULL,
    reversal_transaction_id BIGINT UNSIGNED NULL,
    corrected_transaction_id BIGINT UNSIGNED NULL,

    -- Other
    requested_by BIGINT UNSIGNED NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_correction_number (correction_number),
    INDEX idx_invoice (invoice_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),

    -- Foreign Keys
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id),
    FOREIGN KEY (reversal_transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (corrected_transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### audit_logs

```sql
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    auditable_type VARCHAR(255) NOT NULL,
    auditable_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    branch_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    session_id VARCHAR(255) NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    changes_summary TEXT NULL,
    reason TEXT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_event_type (event_type),
    INDEX idx_auditable (auditable_type, auditable_id),
    INDEX idx_user (user_id),
    INDEX idx_branch (branch_id),
    INDEX idx_created_at (created_at),

    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### accounting_periods

```sql
CREATE TABLE accounting_periods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_number INT NOT NULL,
    year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('open', 'closed', 'locked') DEFAULT 'open',
    closed_by BIGINT UNSIGNED NULL,
    closed_at DATETIME NULL,
    closed_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    UNIQUE KEY unique_period (year, period_number),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),

    -- Foreign Keys
    FOREIGN KEY (closed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### customer_balances

```sql
CREATE TABLE customer_balances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    branch_id BIGINT UNSIGNED NULL,
    opening_balance DECIMAL(15,3) NOT NULL DEFAULT 0,
    current_balance DECIMAL(15,3) NOT NULL DEFAULT 0,
    as_of_date DATE NOT NULL,
    recalculated_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    UNIQUE KEY unique_customer (customer_id, branch_id),
    INDEX idx_account (account_id),
    INDEX idx_as_of_date (as_of_date),

    -- Foreign Keys
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

# Recommended UI/UX Flow

## 1. Invoice Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INVOICE CREATION FLOW                     │
└─────────────────────────────────────────────────────────────┘

Step 1: Order Selection
┌──────────────┐
│ Select Order │
│   Screen     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • List of confirmed orders           │
│ • Filter by date, customer, branch   │
│ • Search by order number             │
│ • Show order details on selection    │
└──────────────────────────────────────┘
       │
       ▼
Step 2: Invoice Preview
┌──────────────┐
│ Invoice      │
│ Preview      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • Invoice number (auto-generated)    │
│ • Customer information               │
│ • Order items (editable)             │
│ • Subtotal, discount, tax, total     │
│ • Notes field                        │
│ • Payment terms                      │
│ • [Create Invoice] button            │
└──────────────────────────────────────┘
       │
       ▼
Step 3: Invoice Created (Draft)
┌──────────────┐
│ Invoice      │
│ Dashboard    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • Status: DRAFT                      │
│ • [Submit for Approval] button       │
│ • [Edit] button (if allowed)         │
│ • [Print Preview] button             │
│ • [Cancel] button                    │
└──────────────────────────────────────┘
       │
       ▼
Step 4: Approval Queue (Manager)
┌──────────────┐
│ Approval     │
│ Dashboard    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • List of pending invoices           │
│ • Invoice details                    │
│ • Customer credit limit check        │
│ • [Approve] / [Reject] buttons       │
│ • Rejection reason field             │
└──────────────────────────────────────┘
       │
       ▼
Step 5: Posted Invoice
┌──────────────┐
│ Posted       │
│ Invoice      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • Status: POSTED                     │
│ • Journal entry created              │
│ • [Record Payment] button            │
│ • [Print] button                     │
│ • [View Journal Entry] link          │
└──────────────────────────────────────┘
```

## 2. Payment Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  PAYMENT PROCESSING FLOW                     │
└─────────────────────────────────────────────────────────────┘

Step 1: Select Invoice
┌──────────────┐
│ Select       │
│ Invoice      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • List of posted/partial invoices    │
│ • Show remaining balance             │
│ • Filter by customer, date, branch   │
└──────────────────────────────────────┘
       │
       ▼
Step 2: Payment Entry
┌──────────────┐
│ Payment      │
│ Entry Form   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • Invoice details                    │
│ • Remaining balance display          │
│ • Payment amount input               │
│ • Payment method selector            │
│   - Cash                             │
│   - Card                             │
│   - Bank Transfer                    │
│   - Customer Account                 │
│ • Reference number (if applicable)   │
│ • Split payment option               │
│ • [Record Payment] button            │
└──────────────────────────────────────┘
       │
       ▼
Step 3: Payment Confirmation
┌──────────────┐
│ Payment      │
│ Confirmed    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • Payment number generated           │
│ • Journal entry created              │
│ • Invoice status updated             │
│ • [Print Receipt] button             │
│ • [View Journal Entry] link          │
│ • [Done] button                      │
└──────────────────────────────────────┘
```

## 3. Return Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   RETURN PROCESSING FLOW                     │
└─────────────────────────────────────────────────────────────┘

Step 1: Return Request
┌──────────────┐
│ Return       │
│ Request      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • Select invoice                     │
│ • Return type: Full / Partial        │
│ • Item selection (if partial)        │
│ • Quantity input                     │
│ • Condition selector                 │
│ • Reason dropdown                    │
│ • Notes field                        │
│ • [Submit Return] button             │
└──────────────────────────────────────┘
       │
       ▼
Step 2: Return Approval
┌──────────────┐
│ Return       │
│ Approval     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • Return details                     │
│ • Items and quantities                │
│ • Condition photos (if applicable)   │
│ • Return policy check                │
│ • [Approve] / [Reject] buttons       │
│ • Rejection reason field             │
└──────────────────────────────────────┘
       │
       ▼
Step 3: Return Execution
┌──────────────┐
│ Return       │
│ Execution    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ • Credit note created                │
│ • Journal entry posted               │
│ • Inventory updated                  │
│ • Refund processed (if applicable)   │
│ • [Print Credit Note] button         │
│ • [Done] button                      │
└──────────────────────────────────────┘
```

## 4. Dashboard Design

### Cashier Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    CASHIER DASHBOARD                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │   Today's Sales   │  │  Pending Orders   │               │
│  │   $5,250.00       │  │       12          │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Recent Invoices                                     │  │
│  │  ┌──────┬──────────┬────────┬────────┬──────────┐   │  │
│  │  │  #   │ Customer │  Date  │ Amount │  Status  │   │  │
│  │  ├──────┼──────────┼────────┼────────┼──────────┤   │  │
│  │  │ 001  │ John Doe │ 06/24  │ $100   │ Posted   │   │  │
│  │  │ 002  │ Jane Doe │ 06/24  │ $250   │ Draft    │   │  │
│  │  └──────┴──────────┴────────┴────────┴──────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Quick Actions:                                             │
│  [New Order] [Create Invoice] [Record Payment]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Accountant Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                  ACCOUNTANT DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Pending Approvals│  │  Draft Entries   │               │
│  │       8          │  │       5          │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Approval Queue                                      │  │
│  │  ┌──────┬──────────┬────────┬────────┬────────────┐  │  │
│  │  │ Type │ Document │ Amount │ Date  │   Action   │  │  │
│  │  ├──────┼──────────┼────────┼────────┼────────────┤  │  │
│  │  │ Inv  │ INV-001  │ $100   │ 06/24 │ [Approve]  │  │  │
│  │  │ CN   │ CN-001   │ $50    │ 06/24 │ [Approve]  │  │  │
│  │  │ JE   │ JV-001   │ $200   │ 06/24 │ [Approve]  │  │  │
│  │  └──────┴──────────┴────────┴────────┴────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Quick Actions:                                             │
│  [Create Journal Entry] [Reconcile Payments] [Run Reports] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Manager Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                   MANAGER DASHBOARD                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Total Revenue   │  │  Pending Returns │               │
│  │   $125,000       │  │       3          │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Approval Queue                                      │  │
│  │  ┌──────┬──────────┬────────┬────────┬────────────┐  │  │
│  │  │ Type │ Document │ Amount │ Date  │   Action   │  │  │
│  │  ├──────┼──────────┼────────┼────────┼────────────┤  │  │
│  │  │ Can  │ INV-005  │ $500   │ 06/24 │ [Review]   │  │  │
│  │  │ Ret  │ RET-003  │ $75    │ 06/24 │ [Review]   │  │  │
│  │  │ Rep  │ REP-002  │ $120   │ 06/24 │ [Review]   │  │  │
│  │  └──────┴──────────┴────────┴────────┴────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Quick Actions:                                             │
│  [Approve Invoices] [Review Returns] [View Reports]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# Approval Matrix

## Approval Authority Matrix

| Document Type | Amount Range     | Required Approver    | Time Limit | Auto-Approval |
| ------------- | ---------------- | -------------------- | ---------- | ------------- |
| Invoice       | $0 - $1,000      | Manager              | 24 hours   | No            |
| Invoice       | $1,001 - $10,000 | CFO                  | 24 hours   | No            |
| Invoice       | > $10,000        | Dual: CFO + Director | 48 hours   | No            |
| Payment       | $0 - $500        | Auto                 | Immediate  | Yes           |
| Payment       | $501 - $5,000    | Manager              | 4 hours    | No            |
| Payment       | > $5,000         | CFO                  | 4 hours    | No            |
| Credit Note   | $0 - $500        | Accountant           | 24 hours   | No            |
| Credit Note   | $501 - $5,000    | Manager              | 24 hours   | No            |
| Credit Note   | > $5,000         | CFO                  | 24 hours   | No            |
| Return        | Any              | Manager              | 24 hours   | No            |
| Replacement   | Any              | Manager              | 24 hours   | No            |
| Cancellation  | No payment       | Manager              | 24 hours   | No            |
| Cancellation  | With payment     | CFO                  | 48 hours   | No            |
| Journal Entry | Auto-generated   | None                 | N/A        | Yes           |
| Journal Entry | Manual < $1,000  | Accountant           | 24 hours   | No            |
| Journal Entry | Manual > $1,000  | Manager              | 24 hours   | No            |
| Reversal      | Any              | CFO                  | 24 hours   | No            |

## Approval Rules

### Rule 1: Segregation of Duties

- Creator cannot approve own documents
- Cashier cannot approve invoices
- Accountant cannot approve own journal entries
- Manager cannot create invoices (conflict)

### Rule 2: Amount Thresholds

- Small amounts: Lower-level approval
- Large amounts: Higher-level approval
- Very large amounts: Dual approval

### Rule 3: Time Limits

- Auto-escalation if not approved within time limit
- Notification to approver and backup approver
- Document expires if not approved within 7 days

### Rule 4: Delegation

- Approver can delegate to backup
- Delegation has time limit
- Delegation logged in audit trail

---

# Audit Trail Design

## Audit Trail Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIT TRAIL ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────┘

Financial Transaction
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌───────────────┐                    ┌──────────────────┐
│  Audit Log     │                    │  Change Log       │
│  (High-level)  │                    │  (Detailed)       │
└───────┬───────┘                    └──────────────────┘
        │
        ├─ Event Type
        ├─ User ID
        ├─ Timestamp
        ├─ IP Address
        ├─ Old Values
        ├─ New Values
        └─ Reason

       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌───────────────┐                    ┌──────────────────┐
│  Document      │                    │  Report          │
│  History       │                    │  Generation      │
└───────┬───────┘                    └──────────────────┘
        │
        ├─ Timeline view
        ├─ User attribution
        ├─ Change details
        └─ Export capability
```

## Audit Report Types

### 1. Invoice Audit Report

```
Invoice Audit Trail Report
Invoice: INV-20260624-0001
Period: 2026-06-01 to 2026-06-30

Date/Time           Event              User        Changes
─────────────────────────────────────────────────────────────
2026-06-24 10:00   Created            John Doe    Invoice created
2026-06-24 10:05   Submitted          John Doe    Status: draft → pending
2026-06-24 10:30   Approved           Jane Smith  Status: pending → approved
2026-06-24 10:31   Posted             Jane Smith  Status: approved → posted
2026-06-24 14:00   Payment Received   John Doe    Payment: $100.00
2026-06-24 14:01   Marked Paid        System      Status: posted → paid
```

### 2. Journal Entry Audit Report

```
Journal Entry Audit Trail Report
Transaction: JV-2026-0001
Period: 2026-06-01 to 2026-06-30

Date/Time           Event              User        Changes
─────────────────────────────────────────────────────────────
2026-06-24 10:31   Created            System      Entry created
2026-06-24 10:31   Posted             System      Status: draft → posted
2026-06-25 09:00   Reversed           Jane Smith  Status: posted → reversed
2026-06-25 09:01   Reversal Created   Jane Smith  REV-2026-0001 created
```

### 3. User Activity Report

```
User Activity Report
User: John Doe (ID: 3)
Period: 2026-06-01 to 2026-06-30

Date/Time           Event              Document     Details
─────────────────────────────────────────────────────────────
2026-06-24 10:00   Invoice Created    INV-001      Customer: 5
2026-06-24 10:05   Invoice Submitted  INV-001      -
2026-06-24 14:00   Payment Created    PAY-001      $100.00, Cash
2026-06-25 09:15   Return Created      RET-001      Full return
```

## Audit Trail Queries

### Query 1: Document History

```php
$history = AuditLog::where('auditable_type', 'Invoice')
    ->where('auditable_id', $invoiceId)
    ->orderBy('created_at')
    ->get();
```

### Query 2: User Activity

```php
$activity = AuditLog::where('user_id', $userId)
    ->whereBetween('created_at', [$from, $to])
    ->orderBy('created_at', 'desc')
    ->get();
```

### Query 3: Financial Changes

```php
$changes = AuditLog::whereIn('auditable_type', ['Invoice', 'Payment', 'Transaction'])
    ->whereBetween('created_at', [$from, $to])
    ->orderBy('created_at', 'desc')
    ->get();
```

---

# Financial Compliance Review

## IFRS Compliance

### IFRS 15: Revenue from Contracts with Customers

| Requirement                      | Implementation           | Status       |
| -------------------------------- | ------------------------ | ------------ |
| Identify contract                | Order/invoice linked     | ✓            |
| Identify performance obligations | Invoice items            | ✓            |
| Determine transaction price      | Invoice total            | ✓            |
| Allocate price to obligations    | Item-level pricing       | ✓            |
| Recognize revenue when satisfied | On posting (not payment) | ✓ (with fix) |

**Current Gap:** Revenue recognized on payment (cash basis)  
**Required:** Revenue recognized on invoice posting (accrual basis)  
**Impact:** Financial statements misstate revenue timing

---

### IFRS 9: Financial Instruments

| Requirement                | Implementation   | Status |
| -------------------------- | ---------------- | ------ |
| Recognize AR at fair value | Invoice amount   | ✓      |
| Measure at amortized cost  | Customer balance | ✓      |
| Impairment testing         | Not implemented  | ⚠️     |
| Write-off process          | Service exists   | ✓      |

**Current Gap:** No automated impairment testing  
**Required:** Periodic assessment of AR collectability  
**Impact:** AR may be overstated

---

### IAS 18: Revenue (Legacy)

| Requirement                     | Implementation  | Status       |
| ------------------------------- | --------------- | ------------ |
| Revenue measured at fair value  | Invoice total   | ✓            |
| Revenue recognized when earned  | On posting      | ✓ (with fix) |
| Discounts deducted from revenue | Not implemented | ❌           |

**Current Gap:** Discounts not deducted from revenue  
**Required:** Record discounts as reduction of revenue  
**Impact:** Revenue overstated

---

## GAAP Compliance (US)

### ASC 606: Revenue from Contracts with Customers

Same as IFRS 15 above.

### ASC 310: Receivables

| Requirement                     | Implementation  | Status |
| ------------------------------- | --------------- | ------ |
| Record at principal amount      | Invoice amount  | ✓      |
| Allowance for doubtful accounts | Not implemented | ⚠️     |
| Write-off uncollectible         | Service exists  | ✓      |

**Current Gap:** No allowance for doubtful accounts  
**Required:** Estimate and record bad debt expense  
**Impact:** AR may be overstated

---

## Tax Compliance

### VAT/GST Compliance

| Requirement            | Implementation       | Status |
| ---------------------- | -------------------- | ------ |
| Calculate VAT on sales | Hardcoded in service | ⚠️     |
| Record VAT payable     | Account 2140         | ✓      |
| VAT on returns/credits | Not implemented      | ❌     |
| VAT reconciliation     | Not implemented      | ❌     |

**Current Gap:** VAT not integrated in main flow  
**Required:** Automatic VAT calculation and reporting  
**Impact:** Tax liability incorrect

---

## Audit Standards (ISA)

### ISA 330: Audit Procedures

| Requirement               | Implementation      | Status |
| ------------------------- | ------------------- | ------ |
| Sufficient audit evidence | Partial audit trail | ⚠️     |
| Test of controls          | No automated tests  | ❌     |
| Substantive procedures    | Manual              | ⚠️     |

**Current Gap:** Insufficient automated audit procedures  
**Required:** Comprehensive audit trail and controls  
**Impact:** Audit effort increased, cost higher

---

### ISA 240: Fraud

| Requirement            | Implementation  | Status |
| ---------------------- | --------------- | ------ |
| Fraud risk assessment  | Not documented  | ❌     |
| Segregation of duties  | Not implemented | ❌     |
| Authorization controls | Partial         | ⚠️     |

**Current Gap:** No fraud prevention controls  
**Required:** Segregation of duties, authorization  
**Impact:** Fraud risk increased

---

### ISA 265: Internal Control

| Requirement         | Implementation | Status |
| ------------------- | -------------- | ------ |
| Control environment | Weak           | ❌     |
| Risk assessment     | Not documented | ❌     |
| Control activities  | Partial        | ⚠️     |
| Information systems | Partial        | ⚠️     |
| Monitoring          | None           | ❌     |

**Current Gap:** Weak internal controls  
**Required:** Comprehensive control framework  
**Impact:** Material weaknesses in internal control

---

# Implementation Roadmap

## Phase 1: Foundation (Weeks 1-4)

**Goal:** Establish core infrastructure

### Week 1: Database & Models

- [ ] Create new database tables
- [ ] Update existing models
- [ ] Create relationships
- [ ] Add database migrations

### Week 2: Core Services

- [ ] Implement InvoiceService
- [ ] Implement PaymentService
- [ ] Implement JournalEntryService
- [ ] Implement CreditNoteService

### Week 3: Approval Framework

- [ ] Create approval trait
- [ ] Implement approval workflow
- [ ] Add approval notifications
- [ ] Create approval dashboard

### Week 4: Audit Trail

- [ ] Create AuditObserver
- [ ] Implement audit logging
- [ ] Create audit reports
- [ ] Add audit dashboard

**Deliverable:** Core infrastructure ready

---

## Phase 2: Invoice Lifecycle (Weeks 5-8)

**Goal:** Complete invoice workflow

### Week 5: Invoice Creation

- [ ] Invoice creation UI
- [ ] Order-to-invoice conversion
- [ ] Invoice preview
- [ ] Draft management

### Week 6: Invoice Approval

- [ ] Approval queue
- [ ] Approval/rejection UI
- [ ] Approval notifications
- [ ] Credit limit check

### Week 7: Invoice Posting

- [ ] Automatic posting
- [ ] Journal entry creation
- [ ] Account balance updates
- [ ] Subledger updates

### Week 8: Invoice Management

- [ ] Invoice listing
- [ ] Invoice search/filter
- [ ] Invoice detail view
- [ ] Invoice printing

**Deliverable:** Complete invoice workflow

---

## Phase 3: Payment Processing (Weeks 9-11)

**Goal:** Complete payment workflow

### Week 9: Payment Entry

- [ ] Payment entry form
- [ ] Multiple payment methods
- [ ] Split payment support
- [ ] Payment validation

### Week 10: Payment Processing

- [ ] Journal entry creation
- [ ] Account balance updates
- [ ] Invoice status updates
- [ ] Receipt generation

### Week 11: Payment Management

- [ ] Payment listing
- [ ] Payment reconciliation
- [ ] Reconciliation dashboard
- [ ] Bank statement import

**Deliverable:** Complete payment workflow

---

## Phase 4: Returns & Credits (Weeks 12-15)

**Goal:** Handle returns and credits

### Week 12: Return Processing

- [ ] Return request form
- [ ] Return approval workflow
- [ ] Return execution
- [ ] Inventory updates

### Week 13: Credit Notes

- [ ] Credit note creation
- [ ] Credit note approval
- [ ] Credit note posting
- [ ] Credit note application

### Week 14: Replacements

- [ ] Replacement request form
- [ ] Replacement approval
- [ ] Replacement execution
- [ ] Price difference handling

### Week 15: Refunds

- [ ] Refund processing
- [ ] Refund methods
- [ ] Refund tracking
- [ ] Refund reporting

**Deliverable:** Complete returns/credits workflow

---

## Phase 5: Corrections & Reversals (Weeks 16-18)

**Goal:** Handle errors and corrections

### Week 16: Invoice Corrections

- [ ] Correction request form
- [ ] Correction approval
- [ ] Correction execution
- [ ] Reversal entries

### Week 17: Journal Entry Reversals

- [ ] Reversal request form
- [ ] Reversal approval
- [ ] Reversal execution
- [ ] Reversal linking

### Week 18: Payment Reversals

- [ ] Payment void
- [ ] Payment refund
- [ ] Reversal entries
- [ ] Balance adjustments

**Deliverable:** Complete correction/reversal workflow

---

## Phase 6: Controls & Compliance (Weeks 19-22)

**Goal:** Implement financial controls

### Week 19: Role-Based Access

- [ ] Role management
- [ ] Permission assignment
- [ ] Access control implementation
- [ ] Permission testing

### Week 20: Accounting Periods

- [ ] Period management
- [ ] Period close
- [ ] Period lock
- [ ] Period reopen (with approval)

### Week 21: Approval Workflows

- [ ] Multi-level approvals
- [ ] Delegation
- [ ] Escalation
- [ ] Time limits

### Week 22: Financial Controls

- [ ] Dual authorization
- [ ] Segregation of duties
- [ ] Limit checks
- [ ] Control reports

**Deliverable:** Complete control framework

---

## Phase 7: Reporting (Weeks 23-26)

**Goal:** Financial reporting

### Week 23: Standard Reports

- [ ] Invoice reports
- [ ] Payment reports
- [ ] Customer statements
- [ ] AR aging

### Week 24: Financial Statements

- [ ] Trial balance
- [ ] Income statement
- [ ] Balance sheet
- [ ] Cash flow statement

### Week 25: Management Reports

- [ ] Sales reports
- [ ] Return analysis
- [ ] Credit note analysis
- [ ] Audit reports

### Week 26: Custom Reports

- [ ] Report builder
- [ ] Custom filters
- [ ] Export functionality
- [ ] Scheduled reports

**Deliverable:** Complete reporting suite

---

## Phase 8: Testing & Deployment (Weeks 27-32)

**Goal:** Production readiness

### Week 27-28: Unit Testing

- [ ] Service tests
- [ ] Controller tests
- [ ] Model tests
- [ ] Workflow tests

### Week 29-30: Integration Testing

- [ ] End-to-end workflows
- [ ] Approval workflows
- [ ] Reversal workflows
- [ ] Audit trail tests

### Week 31: UAT

- [ ] User acceptance testing
- [ ] Scenario testing
- [ ] Bug fixes
- [ ] Documentation

### Week 32: Deployment

- [ ] Production deployment
- [ ] Data migration
- [ ] User training
- [ ] Go-live support

**Deliverable:** Production-ready system

---

# Conclusion

This comprehensive workflow design provides a **complete, enterprise-grade ERP system** suitable for:

- **Large Restaurants:** Multi-location, high-volume transactions
- **Multi-Branch Businesses:** Centralized control with local operations
- **Audited Companies:** Full audit trail, compliance, controls

## Key Principles

1. **Accrual Accounting:** Revenue recognized on invoice, not payment
2. **Double-Entry:** Every transaction has balanced entries
3. **Approval Workflows:** Multi-level authorization
4. **Audit Trail:** Comprehensive logging of all actions
5. **Role-Based Access:** Segregation of duties
6. **Reversals:** Proper correction mechanism
7. **Compliance:** IFRS/GAAP compliant

## Implementation Strategy

- **32 weeks** (8 months) with 2-3 developers
- **Phased approach:** Foundation → Core workflows → Controls → Reporting
- **Test-driven:** Comprehensive testing at each phase
- **User-centric:** UAT at each phase

## Success Criteria

1. ✓ Passes external audit
2. ✓ IFRS/GAAP compliant
3. ✓ Supports multi-branch operations
4. ✓ Handles 1000+ transactions/day
5. ✓ Complete audit trail
6. ✓ Role-based access control
7. ✓ Comprehensive reporting

---

**Document Status:** FINAL  
**Next Review:** 2026-07-24  
**Approval Required:** CFO, CTO, Head of Operations
