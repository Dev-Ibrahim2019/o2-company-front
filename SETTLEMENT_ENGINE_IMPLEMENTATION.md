# Unified Settlement & Payment Routing Engine — Implementation Documentation

## 1. Root Cause Analysis

### Current Architecture Problems

1. **Hardcoded Account Numbers in `AccountingService`**
   - `findCashAccount()` used hardcoded codes: `'101'`, `'102'`, `'103'`, `'104'`, `'105'`
   - These codes did NOT match the actual Chart of Accounts (which uses `11101`, `11102`, etc.)
   - No way to configure which account each payment method uses

2. **No Payment Method Configuration**
   - Payment methods were strings (`'cash'`, `'card'`, `'bank'`, `'wallet'`) with no database table
   - No linkage between payment methods and financial accounts
   - Entity types (customer, employee, supplier) had no configurable routing

3. **No Mixed Payment Support**
   - The old `AccountingService::createJournalEntryForInvoice()` only supported single payment methods
   - No way to split payment across cash + card + customer credit

4. **No Entity Validation in POS Flow**
   - Customer credit limits were not validated during POS settlement
   - Employee/supplier status was not checked

5. **Frontend Hardcoded Account IDs**
   - `orderService.ts` had `cashAccountMap` with hardcoded IDs: `{ cash: 1001, credit_card: 1002, wallet: 1003, bank_transfer: 1004 }`
   - These IDs were arbitrary and didn't match the actual database

### What Already Existed (Good)

- **Subledger Architecture**: `entries.subledger_type` + `entries.subledger_id` already implemented
- **CustomerAccountingService**: Proper AR posting with subledger linkage
- **EmployeeAccountingService**: Proper advance/loan/salary posting with subledger linkage
- **SubledgerService**: Full statement generation for all entity types
- **TransactionPostingService**: Robust double-entry posting with validation
- **Frontend SettlementPanel**: Already built with full UI for mixed payments
- **Frontend settlementService**: Already built with API client

---

## 2. Database Changes

### New Table: `payment_methods`

```sql
CREATE TABLE payment_methods (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    name_en     VARCHAR(255) NULL,
    type        VARCHAR(50) NOT NULL,  -- cash, bank, card, wallet, customer, employee, supplier
    account_id  BIGINT UNSIGNED NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    is_entity   BOOLEAN DEFAULT FALSE, -- TRUE for customer/employee/supplier
    sort_order  INT DEFAULT 0,
    description TEXT NULL,
    created_at  TIMESTAMP NULL,
    updated_at  TIMESTAMP NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);
```

### New Accounts Created by Seeder

| Code  | Name                 | Type  | Purpose                |
| ----- | -------------------- | ----- | ---------------------- |
| 11103 | حساب بطاقات الائتمان | asset | Card Clearing Account  |
| 11104 | المحفظة الرقمية      | asset | Digital Wallet Account |

### Default Payment Methods

| Name         | Type     | Account Code | Is Entity |
| ------------ | -------- | ------------ | --------- |
| نقداً        | cash     | 11101        | No        |
| تحويل بنكي   | bank     | 11102        | No        |
| بطاقة ائتمان | card     | 11103        | No        |
| محفظة رقمية  | wallet   | 11104        | No        |
| حساب عميل    | customer | 1120         | Yes       |
| حساب موظف    | employee | 1130         | Yes       |
| حساب مورد    | supplier | 2110         | Yes       |

---

## 3. Backend Implementation

### New Files Created

| File                                                                     | Purpose                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `database/migrations/2026_06_20_130000_create_payment_methods_table.php` | Migration for payment_methods table                          |
| `app/Models/PaymentMethod.php`                                           | Eloquent model with scopes                                   |
| `database/seeders/PaymentMethodSeeder.php`                               | Seeds default payment methods + creates card/wallet accounts |
| `app/Services/Accounting/SettlementEngine.php`                           | Core settlement engine with mixed payment support            |
| `app/Http/Controllers/Api/PaymentMethodController.php`                   | CRUD for payment methods                                     |
| `app/Http/Controllers/Api/SettleController.php`                          | Settlement endpoints                                         |

### Modified Files

| File                                  | Changes                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `routes/api.php`                      | Added settlement routes + payment-methods resource           |
| `database/seeders/DatabaseSeeder.php` | Added PaymentMethodSeeder call                               |
| `app/Services/AccountingService.php`  | Replaced hardcoded account mapping with PaymentMethod lookup |
| `src/services/orderService.ts`        | Removed hardcoded account IDs, delegated to SettlementEngine |

---

## 4. Settlement Engine Architecture

### Flow Diagram

```
POST /orders/{order}/settle
         │
         ▼
  ┌─────────────────┐
  │ Validate Order   │  ← Check order not cancelled/paid
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ Ensure Invoice   │  ← Create if not exists, copy order items
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ Validate Total   │  ← paid_total must equal order total
  └────────┬────────┘
           ▼
  ┌─────────────────────────┐
  │ Validate Each Payment   │  ← Check payment method exists & active
  └────────┬────────────────┘
           ▼
  ┌─────────────────────────┐
  │ Resolve Entities        │  ← For customer/employee/supplier:
  │                         │     1. Load entity
  │                         │     2. Check active status
  │                         │     3. Check credit limit (customer)
  └────────┬────────────────┘
           ▼
  ┌─────────────────┐
  │ Create Payments  │  ← Payment records in payments table
  └────────┬────────┘
           ▼
  ┌─────────────────────────┐
  │ Create Journal Entry    │  ← Double-entry with subledger linkage
  │                         │
  │  Dr: Cashbox (11101)    │  200  ← from payment method account
  │  Dr: AR Control (1120)  │  200  ← subledger: customer X
  │  Cr: Sales Revenue      │  400  ← revenue account
  └────────┬────────────────┘
           ▼
  ┌─────────────────┐
  │ Mark Paid        │  ← invoice.status = paid, order.status = paid
  └─────────────────┘
```

### Validation Rules

| Entity   | Validation                                                             |
| -------- | ---------------------------------------------------------------------- |
| Customer | Must exist, status must be 'active', not 'blocked', credit limit check |
| Employee | Must exist, status must be 'active'                                    |
| Supplier | Must exist, status must be 'active'                                    |

### Mixed Payment Journal Entry Example

**Scenario**: Invoice Total = 500

- Cash = 200
- Card = 100
- Customer Credit = 200 (Customer ID: 12)

**Generated Journal**:

```
Dr: Main Cashbox (11101)                   200
Dr: Card Clearing (11103)                  100
Dr: Accounts Receivable (1120)             200
    subledger_type: 'customer'
    subledger_id: 12
Cr: Sales Revenue (4110)                             500
```

---

## 5. Journal Entry Examples

### Cash Payment (100 ILS)

```
Dr: Main Cashbox (11101)                   100
Cr: Sales Revenue (4110)                             100
```

### Bank Transfer (100 ILS)

```
Dr: Main Bank (11102)                      100
Cr: Sales Revenue (4110)                             100
```

### Card Payment (100 ILS)

```
Dr: Card Clearing (11103)                  100
Cr: Sales Revenue (4110)                             100
```

### Digital Wallet (100 ILS)

```
Dr: Digital Wallet (11104)                 100
Cr: Sales Revenue (4110)                             100
```

### Customer Credit Sale (100 ILS, Customer ID: 5)

```
Dr: Accounts Receivable (1120)             100
    subledger_type: 'customer'
    subledger_id: 5
Cr: Sales Revenue (4110)                             100
```

### Employee Account Purchase (100 ILS, Employee ID: 33)

```
Dr: Employee Advances (1130)               100
    subledger_type: 'employee'
    subledger_id: 33
Cr: Sales Revenue (4110)                             100
```

### Supplier Offset (100 ILS, Supplier ID: 7)

```
Dr: Accounts Payable (2110)                100
    subledger_type: 'supplier'
    subledger_id: 7
Cr: Sales Revenue (4110)                             100
```

### Mixed Payment (500 ILS Total)

```
Dr: Main Cashbox (11101)                   200
Dr: Card Clearing (11103)                  100
Dr: Accounts Receivable (1120)             200
    subledger_type: 'customer'
    subledger_id: 12
Cr: Sales Revenue (4110)                             500
```

---

## 6. Subledger Integration

All entity transactions automatically appear in the entity's statement because:

1. **Journal entries** store `subledger_type` and `subledger_id` in the `entries` table
2. **SubledgerService** queries entries by `subledger_type` + `subledger_id` to generate statements
3. **Customer statements** show all POS credit sales automatically
4. **Employee statements** show all POS purchases automatically
5. **Supplier statements** show all POS offsets automatically

No additional code needed — the existing SubledgerService handles this.

---

## 7. API Endpoints

### Payment Methods

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| GET    | `/payment-methods`      | List all payment methods |
| POST   | `/payment-methods`      | Create payment method    |
| GET    | `/payment-methods/{id}` | Show payment method      |
| PUT    | `/payment-methods/{id}` | Update payment method    |
| DELETE | `/payment-methods/{id}` | Delete payment method    |

### Settlement

| Method | Endpoint                     | Description                |
| ------ | ---------------------------- | -------------------------- |
| POST   | `/orders/{order}/settle`     | Settle order with payments |
| GET    | `/orders/{order}/settlement` | Get settlement details     |

### Settle Request Body

```json
{
  "payments": [
    {
      "payment_method_id": 1,
      "amount": 200.0,
      "reference_number": "REF123",
      "entity_type": "customer",
      "entity_id": 5
    },
    {
      "payment_method_id": 5,
      "amount": 300.0,
      "entity_type": "customer",
      "entity_id": 12
    }
  ]
}
```

### Settle Response

```json
{
  "success": true,
  "message": "تمت تسوية الفاتورة بنجاح",
  "data": {
    "order": { ... },
    "transaction": {
      "id": 1,
      "transaction_number": "SET-20260620-0001",
      "status": "posted",
      "entries": [
        {
          "account": { "id": 1, "code": "11101", "name": "الصندوق الرئيسي" },
          "debit": 200.00,
          "credit": 0,
          "subledger": null
        },
        {
          "account": { "id": 5, "code": "1120", "name": "ذمم العملاء المدينة" },
          "debit": 300.00,
          "credit": 0,
          "subledger": { "type": "customer", "id": 12 }
        },
        {
          "account": { "id": 10, "code": "4110", "name": "إيرادات المبيعات" },
          "debit": 0,
          "credit": 500.00,
          "subledger": null
        }
      ]
    },
    "payments": [ ... ],
    "invoice": { ... }
  }
}
```

---

## 8. Backward Compatibility Notes

1. **Old `AccountingService::createJournalEntryForInvoice()`** still works but now uses `PaymentMethod` lookup instead of hardcoded codes. It will throw a clear error if the payment method is not configured.

2. **Old `InvoiceController::addPayment()`** still works for single-payment flows. It calls `AccountingService::createJournalEntryForInvoice()` which now uses configurable accounts.

3. **Old `orderService.pay()`** now delegates to the SettlementEngine endpoint. The response format is slightly different but backward-compatible.

4. **Old `orderService.transferClosedOrderToSales()`** now uses the SettlementEngine. No hardcoded account IDs.

5. **Old `orderService.createJournalEntryFromInvoice()`** now delegates to the SettlementEngine. No hardcoded account IDs.

6. **Migration**: Run `php artisan migrate` to create the `payment_methods` table, then `php artisan db:seed --class=PaymentMethodSeeder` to populate default methods.

7. **No data loss**: Existing transactions, entries, payments, and invoices remain unchanged.

---

## 9. Frontend Integration

The frontend already has:

- **`SettlementPanel.tsx`** — Full settlement UI with:
  - Payment method grid (direct + entity methods)
  - Entity search (customer/employee/supplier)
  - Balance display
  - Credit limit display
  - Mixed payment allocation
  - Progress bar
  - Reference number input

- **`settlementService.ts`** — API client with:
  - `settle(orderId, payments)` — POST to SettlementEngine
  - `getSettlement(orderId)` — GET settlement details
  - `getPaymentMethods()` — GET all payment methods
  - `createPaymentMethod()` — POST new method
  - `updatePaymentMethod()` — PUT update method
  - `deletePaymentMethod()` — DELETE method

The SettlementPanel is already integrated into the POS flow and ready to use.

---

## 10. Files Created/Modified Summary

### New Backend Files (6)

```
database/migrations/2026_06_20_130000_create_payment_methods_table.php
app/Models/PaymentMethod.php
database/seeders/PaymentMethodSeeder.php
app/Services/Accounting/SettlementEngine.php
app/Http/Controllers/Api/PaymentMethodController.php
app/Http/Controllers/Api/SettleController.php
```

### Modified Backend Files (3)

```
routes/api.php
database/seeders/DatabaseSeeder.php
app/Services/AccountingService.php
```

### Modified Frontend Files (1)

```
src/services/orderService.ts
```

### Already Existing Frontend Files (2)

```
src/components/POS/SettlementPanel.tsx
src/services/settlementService.ts
```
