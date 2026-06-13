# Financial ERP Architecture — تحليل وتصميم متكامل

> ════════════════════════════════════════════════════════════════
> **النظام:** O2-Company ERP | **النسخة:** 1.0  
> **المحلّل:** ERP Architect & Financial Systems Expert  
> **التاريخ:** 11 يونيو 2026  
> **المستوى:** Enterprise-Grade Accounting Analysis  
> ════════════════════════════════════════════════════════════════

---

## 📋 فهرس المحتويات

1. [المرحلة 1: تحليل المشاكل الحالية](#phase1)
2. [المرحلة 2: تحليل النظام المحاسبي الحالي](#phase2)
3. [المرحلة 3: تصميم ERP Architecture المقترح](#phase3)
4. [المرحلة 4: تحليل واجهة المستخدم](#phase4)
5. [المرحلة 5: تصميم شاشة القيود الاحترافية](#phase5)
6. [المرحلة 6: Roadmap التنفيذ والأولويات](#phase6)

---

<a name="phase1"></a>

## 🚨 المرحلة 1: تحليل المشاكل الحالية

### 1.1 مشاكل معمارية – Architecture Problems (CRITICAL)

| #   | المشكلة                                                                                                            | التأثير                            | المخاطرة     |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------------ |
| P1  | **لا يوجد Posting Engine مركزي** – عملية الترحيل تتم كـ API call واحد بدون أي validation قبل الترحيل               | يمكن ترحيل قيود غير صحيحة          | **CRITICAL** |
| P2  | **لا يوجد Double-Entry Validation في الباك** – الـ backend يتوقع بيانات صحيحة من الـ frontend فقط                  | يمكن تجاوز validation الـ frontend | **CRITICAL** |
| P3  | **لا يوجد Accounting Periods/Fiscal Years في الباك** – `FiscalYearsView` يعرض واجهة فقط بدون API                   | لا يمكن منع الترحيل في فترة مغلقة  | **CRITICAL** |
| P4  | **لا يوجد Locking Mechanism** – لا يوجد قفل على الحسابات أو السنوات المالية أثناء الترحيل                          | Race Conditions, Double Posting    | **CRITICAL** |
| P5  | **لا يوجد Audit Trail** – لا يوجد سجل تاريخي للتغييرات على القيود (من عدّل ومتى)                                   | مخاطر قانونية وتدقيق               | **HIGH**     |
| P6  | **لا يوجد Approval Workflow** – القيد ينتقل مباشرة من DRAFT إلى POSTED بدون موافقة                                 | لا يوجد رقابة مالية                | **HIGH**     |
| P7  | **Ledger يتم احتسابه مباشرة بدون تراكم** – الأرصدة تُحتسب من API فقط ولا يتم تخزينها                               | ضعف أداء مع كثرة البيانات          | **HIGH**     |
| P8  | **لا يوجد Separation of Concerns** – المودال الواحد يحتوي على Account, Transaction, Cost Center, Ledger, Subledger | يصعب الصيانة والتوسع               | **HIGH**     |

### 1.2 مشاكل محاسبية – Accounting Problems (CRITICAL)

| #   | المشكلة                                                                                                                                | التأثير                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| A1  | **Journal Form في frontend يسمح بأنواع حسابات غير صحيحة** – يمكن اختيار حساب "إيراد" في جهة مدين أو حساب "مصروف" في جهة دائن دون تحذير | أخطاء محاسبية محتملة              |
| A2  | **Subledger لا يتم التحقق من صحته محاسبياً** – يمكن ربط subledger "موظف" بحساب "نقدية"                                                 | تلوث البيانات المالية             |
| A3  | **لا يوجد مفهوم Normal Balance Direction** – كل حساب له طبيعة (مدين/دائن) لكن لا يتم enforce في النظام                                 | انتفاخ الأرصدة الخاطئة            |
| A4  | **لا يوجد حساب لحسابات (Suspense Account)** – إذا كان القيد غير متوازن، لا يوجد حساب تعليق                                             | فقدان القيود غير المتوازنة        |
| A5  | **يمكن تعديل أي قيد قبل POST** – لكن لا يوجد audit trail للتعديلات                                                                     | مشاكل تدقيق                       |
| A6  | **Reverse Entry ليس مدعوماً** – `isReversal` في الـ TypeScript لكن لا توجد آلية إنشاء عكسي                                             | لا يمكن التراجع عن القيود المرحلة |

### 1.3 مشاكل Data Integrity (CRITICAL)

| #   | المشكلة                                                                                                | التأثير                     |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------- |
| D1  | **الأرصدة تُحتسب من query مباشرة** – كل مرة تفتح فيها شاشة، يتم SUM للأرصدة                            | أداء بطيء مع ملايين السجلات |
| D2  | **لا يوجد Transactional Integrity في الـ posting** – إذا فشل الترحيل، قد يبقى القيد في حالة غير مستقرة | Corruption محتمل            |
| D3  | **لا يوجد Unique Constraint على transaction_number** – يمكن تكرار أرقام القيود                         | فوضى محاسبية                |
| D4  | **يمكن حذف قيد مرحل (Posted)** – `handleDeleteTransaction` لا يمنع حذف القيود المرحلة                  | خرق محاسبي خطير             |
| D5  | **يمكن تعديل حساب له حركات** – لا يوجد check قبل تعديل `allow_posting` أو `type`                       | تدمير التسلسل المحاسبي      |

### 1.4 مشاكل UX/UI

| #   | المشكلة                                                                                                               | التأثير                    |
| --- | --------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| U1  | **Journal Lines Grid غير مهنية** – تصميم كروت بدلاً من Grid احترافي مثل Excel                                         | صعوبة إدخال القيود الكبيرة |
| U2  | **جدول القيود بدائي** – يفتقر إلى Grouping و Sorting و Filtering احترافية                                             | تجربة استخدام سيئة         |
| U3  | **لا يوجد Preview للقيد قبل الحفظ** – المستخدم لا يرى summary كامل                                                    | يمكن حفظ قيد خاطئ          |
| U4  | **لا يوجد Keyboard Shortcuts كافية** – فقط Ctrl+S و Esc                                                               | بطء في الإدخال             |
| U5  | **خطأ في `toJournalShape`** – سطر `return toJournalShapeEnterprise(tx);` ثم `return { ... }` بعدها (unreachable code) | **BUG** – dead code        |
| U6  | **Dashboard يستخدم بيانات وهمية** – `monthlyData` values مكتوبة يدوياً Hard-coded                                     | لا يعكس الواقع             |

### 1.5 مشاكل Validation

| #   | المشكلة                                                                              | التأثير                            |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------- |
| V1  | **Frontend validation فقط** – لا يوجد Server-side validation للقيود                  | يمكن تجاوز الحماية بالـ API مباشرة |
| V2  | **لا يتم التحقق من الميزانية** – لا يوجد حد أعلى للمبالغ أو التحقق من توفر الميزانية | صرف بدون رقابة                     |
| V3  | **لا يتم التحقق من تاريخ القيد** – يمكن إنشاء قيد بتاريخ مستقبلي أو سنة مغلقة        | فوضى مالية                         |
| V4  | **لا يتم التحقق من الحسابات غير النشطة** – يمكن استخدام حساب معطّل                   | مخالفة محاسبية                     |

### 1.6 مشاكل Performance

| #   | المشكلة                                                                          |
| --- | -------------------------------------------------------------------------------- |
| PR1 | **Ledger يحتسب من صفر كل مرة** – مع نمو البيانات سيصبح بطيئاً جداً               |
| PR2 | **لا Pagination في شجرة الحسابات** – مئات الحسابات تُحمّل دفعة واحدة             |
| PR3 | **Fetch من API لكل transaction** – `fetchAccountTree()` يُستدعى بعد كل عملية حفظ |

---

<a name="phase2"></a>

## 🔍 المرحلة 2: تحليل النظام المحاسبي الحالي

### 2.1 تدفق إنشاء القيد

```
Frontend                          Backend                         Database
────────                          ───────                         ────────
AccountingWorkspace
  └─ Validate form locally
  └─ acc.createTransaction(payload) → POST /transactions
                                    └─ store()                     transactions
                                    └─ return Transaction          transaction_entries
  └─ acc.postTransaction(tx.id)   → POST /transactions/{id}/post
                                    └─ post()                      (update status)
  └─ fetchAccountTree()           → GET /accounts
                                    └─ aggregate balances          (SUM from entries)
```

### 2.2 التحليل العميق للمشاكل المحاسبية

#### 2.2.1 هل النظام محاسبيًا صحيح؟

**إجابة: جزئياً – لكنه خطير ولا يمكن الاعتماد عليه للمؤسسات الحقيقية.**

الأسباب:

1. **لا يوجد posting engine** – `POST /transactions/{id}/post` مجرد تحديث status
2. **الأرصدة غير مخزنة** – تُحتسب من `SUM(entries)` كل مرة
3. **لا محاسبة على أساس الاستحقاق** – النظام cash-based أكثر منه accrual
4. **لا يوجد concept لـ contra accounts**
5. **لا يوجد closing process**

#### 2.2.2 المخاطر المالية

| المخاطرة                 | الوصف                                               | Severity |
| ------------------------ | --------------------------------------------------- | -------- |
| **Double Posting**       | يمكن إرسال POST /post مرتين ونفس القيد يُرحّل مرتين | CRITICAL |
| **Data Loss**            | DELETE على قيد مرحل يحذفه للأبد                     | CRITICAL |
| **Balance Corruption**   | تعديل entries بعد الترحيل                           | CRITICAL |
| **Race Condition**       | عملية حفظ+ترحيل غير ذرية                            | HIGH     |
| **No Audit Trail**       | لا يمكن تتبع من أنشأ/عدّل/رحّل                      | HIGH     |
| **Fiscal Period Breach** | يمكن ترحيل قيود في سنة مغلقة                        | HIGH     |

#### 2.2.3 هل يوجد احتمالية Corruption للأرصدة؟

**نعم، بكل تأكيد. إليك السيناريوهات:**

1. **حذف قيد مرحل →** الأرصدة تبقى متأثرة بدون مرجع
2. **تعديل entries بعد ترحيل partial →** نصف المبلغ يترحل
3. **خطأ في حساب الأرصدة →** لو حصل bug في Query، كل الأرصدة تتصفر
4. **Duplicate transaction_number →** لا يمكن التمييز بين القيود

#### 2.2.4 هل يوجد مشاكل في Audit Trail؟

**نعم، كاملة. لا يوجد:**

- `created_by` (`user_id`)
- `updated_by`
- `approved_by`
- `posted_at` (موجود لكن لا يملأ تلقائياً)
- `deleted_at` (soft delete غير موجود)
- `change_log` (سجل تغييرات)

### 2.3 تحليل الـ Subledger

#### الوضع الحالي:

```
Subledger يدعم:
├── employee → API: /employees
├── customer → API: /customers
└── supplier → API: /suppliers
```

**المشاكل:**

- أي حساب يمكن ربطه بأي subledger (حتى النقدية مع موظف)
- لا aging للذمم
- لا ترصيد تلقائي
- لا يوجد تاريخ استحقاق

### 2.4 تحليل Cost Centers

#### الوضع الحالي:

- هيكل شجري (parent-child)
- 4 أنواع: operational, administrative, service, production
- عرض حركات لكل مركز

**المشاكل:**

- لا يوجد budget tracking
- لا يوجد comparison بين actual vs budget
- لا يوجد rollup تلقائي للإجماليات

---

<a name="phase3"></a>

## 🏗️ المرحلة 3: تصميم ERP Architecture المقترح

### 3.1 Database Design – الجداول الأساسية

#### جدول `accounts` (محسّن)

```sql
CREATE TABLE accounts (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code              VARCHAR(20) NOT NULL,
    name              VARCHAR(255) NOT NULL,
    name_ar           VARCHAR(255),
    type              ENUM('asset','liability','equity','revenue','expense') NOT NULL,
    normal_balance    ENUM('debit','credit') NOT NULL,
    level             TINYINT UNSIGNED NOT NULL DEFAULT 0,
    parent_id         BIGINT UNSIGNED NULL,
    is_posting        BOOLEAN NOT NULL DEFAULT TRUE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    is_system         BOOLEAN NOT NULL DEFAULT FALSE,
    is_parent         BOOLEAN NOT NULL DEFAULT FALSE,
    notes             TEXT NULL,
    allowed_subledger_types JSON NULL,
    -- تعديلات جديدة
    is_contra         BOOLEAN NOT NULL DEFAULT FALSE,    -- حساب مقابل
    is_bank           BOOLEAN NOT NULL DEFAULT FALSE,
    is_cash           BOOLEAN NOT NULL DEFAULT FALSE,
    is_receivable     BOOLEAN NOT NULL DEFAULT FALSE,
    is_payable        BOOLEAN NOT NULL DEFAULT FALSE,
    tax_rate          DECIMAL(5,2) NULL,
    currency_code     CHAR(3) NULL DEFAULT 'ILS',
    branch_id         BIGINT UNSIGNED NULL,
    opening_balance   DECIMAL(15,2) NOT NULL DEFAULT 0,
    opening_date      DATE NULL,
    -- Managed fields
    created_by        BIGINT UNSIGNED NULL,
    updated_by        BIGINT UNSIGNED NULL,
    deleted_at        TIMESTAMP NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_account_code (code),
    FOREIGN KEY (parent_id) REFERENCES accounts(id),
    INDEX idx_accounts_type (type),
    INDEX idx_accounts_active (is_active, is_posting)
);
```

#### جدول `transaction_types` (نوع القيد)

```sql
CREATE TABLE transaction_types (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code              VARCHAR(30) NOT NULL UNIQUE,
    name_ar           VARCHAR(255) NOT NULL,
    name_en           VARCHAR(255),
    voucher_type      ENUM('journal','payment','receipt','opening','adjustment','salary','expense','transfer') NOT NULL,
    number_prefix     VARCHAR(10) NOT NULL,
    number_pattern    VARCHAR(50) NOT NULL DEFAULT '{PREFIX}-{YEAR}-{MONTH}-{SEQ}',
    posting_behavior  ENUM('single','double') NOT NULL DEFAULT 'double',
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    is_system         BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### جدول `accounting_periods` (السنوات المالية)

```sql
CREATE TABLE accounting_periods (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fiscal_year_id    BIGINT UNSIGNED NOT NULL,
    period_number     TINYINT UNSIGNED NOT NULL COMMENT '1-12 or 1-4 for quarterly',
    start_date        DATE NOT NULL,
    end_date          DATE NOT NULL,
    status            ENUM('open','closed','locked') NOT NULL DEFAULT 'open',
    closed_by         BIGINT UNSIGNED NULL,
    closed_at         TIMESTAMP NULL,
    notes             TEXT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_fiscal_period (fiscal_year_id, period_number),
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id)
);
```

#### جدول `transactions` (محسّن بالكامل)

```sql
CREATE TABLE transactions (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_number  VARCHAR(50) NOT NULL,
    transaction_type_id BIGINT UNSIGNED NOT NULL,
    date                DATE NOT NULL,
    reference           VARCHAR(100) NULL,
    description         TEXT NOT NULL,
    notes               TEXT NULL,

    -- Workflow
    status              ENUM('draft','approved','posted','cancelled','reversed') NOT NULL DEFAULT 'draft',
    approval_status     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    approved_by         BIGINT UNSIGNED NULL,
    approved_at         TIMESTAMP NULL,
    rejection_reason    TEXT NULL,

    -- Currency
    currency_code       CHAR(3) NOT NULL DEFAULT 'ILS',
    exchange_rate       DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
    is_multicurrency    BOOLEAN NOT NULL DEFAULT FALSE,

    -- Posting
    posted_by           BIGINT UNSIGNED NULL,
    posted_at           TIMESTAMP NULL,
    posting_period_id   BIGINT UNSIGNED NULL,

    -- Reversal
    is_reversal         BOOLEAN NOT NULL DEFAULT FALSE,
    reversed_from_id    BIGINT UNSIGNED NULL COMMENT 'Original transaction that was reversed',
    reversal_reason     TEXT NULL,

    -- Source
    source_type         VARCHAR(50) NULL COMMENT 'Module name (sales, purchases, hr...)',
    source_id           BIGINT UNSIGNED NULL COMMENT 'Record ID in source module',

    -- Audit
    created_by          BIGINT UNSIGNED NOT NULL,
    updated_by          BIGINT UNSIGNED NULL,
    cancelled_by        BIGINT UNSIGNED NULL,
    cancelled_at        TIMESTAMP NULL,
    cancel_reason       TEXT NULL,

    -- Soft delete
    deleted_at          TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_transaction_number (transaction_number),
    FOREIGN KEY (transaction_type_id) REFERENCES transaction_types(id),
    FOREIGN KEY (posted_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (reversed_from_id) REFERENCES transactions(id),
    INDEX idx_transactions_date (date),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_source (source_type, source_id)
);
```

#### جدول `transaction_entries` (محسّن)

```sql
CREATE TABLE transaction_entries (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id    BIGINT UNSIGNED NOT NULL,
    line_number       SMALLINT UNSIGNED NOT NULL,
    account_id        BIGINT UNSIGNED NOT NULL,
    description       TEXT NULL,

    -- المبالغ (بالعملة الأساسية)
    debit             DECIMAL(15,2) NOT NULL DEFAULT 0,
    credit            DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- المبالغ (بالعملة الأجنبية)
    fc_debit          DECIMAL(15,2) NULL,
    fc_credit         DECIMAL(15,2) NULL,
    fc_currency       CHAR(3) NULL,

    -- Cost Center
    cost_center_id    BIGINT UNSIGNED NULL,

    -- Subledger
    subledger_type    ENUM('employee','customer','supplier','asset') NULL,
    subledger_id      BIGINT UNSIGNED NULL,

    -- Tax
    tax_rate          DECIMAL(5,2) NULL,
    tax_amount        DECIMAL(15,2) NULL,
    is_tax_inclusive  BOOLEAN NOT NULL DEFAULT FALSE,

    -- Reference
    reference         VARCHAR(100) NULL,
    notes             TEXT NULL,

    -- Due Date (للمدفوعات)
    due_date          DATE NULL,

    -- Reconciliation
    reconciled        BOOLEAN NOT NULL DEFAULT FALSE,
    reconciled_at     TIMESTAMP NULL,
    reconciled_by     BIGINT UNSIGNED NULL,

    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
    INDEX idx_entries_account (account_id),
    INDEX idx_entries_subledger (subledger_type, subledger_id),
    INDEX idx_entries_cost_center (cost_center_id)
);
```

#### جدول `account_balances` (تخزين الأرصدة)

```sql
CREATE TABLE account_balances (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_id        BIGINT UNSIGNED NOT NULL,
    period_id         BIGINT UNSIGNED NOT NULL,
    -- Opening
    opening_debit     DECIMAL(15,2) NOT NULL DEFAULT 0,
    opening_credit    DECIMAL(15,2) NOT NULL DEFAULT 0,
    -- Period activity
    period_debit      DECIMAL(15,2) NOT NULL DEFAULT 0,
    period_credit     DECIMAL(15,2) NOT NULL DEFAULT 0,
    -- Closing
    closing_debit     DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_credit    DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_movement      DECIMAL(15,2) NOT NULL DEFAULT 0 GENERATED ALWAYS AS (period_debit - period_credit) STORED,

    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    calculated_by     BIGINT UNSIGNED NULL,

    UNIQUE KEY uk_balance_period (account_id, period_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
);
```

#### جدول `subledger_balances` (أرصدة الذمم)

```sql
CREATE TABLE subledger_balances (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subledger_type    ENUM('employee','customer','supplier','asset') NOT NULL,
    subledger_id      BIGINT UNSIGNED NOT NULL,
    period_id         BIGINT UNSIGNED NOT NULL,
    opening_balance   DECIMAL(15,2) NOT NULL DEFAULT 0,
    period_debit      DECIMAL(15,2) NOT NULL DEFAULT 0,
    period_credit     DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_balance   DECIMAL(15,2) NOT NULL DEFAULT 0,

    UNIQUE KEY uk_subledger_period (subledger_type, subledger_id, period_id),
    FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
);
```

#### جدول `audit_log` (سجل التدقيق)

```sql
CREATE TABLE audit_log (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id           BIGINT UNSIGNED NOT NULL,
    action            ENUM('create','update','delete','post','cancel','reverse','approve','reject','reconcile') NOT NULL,
    auditable_type    VARCHAR(100) NOT NULL COMMENT 'Transaction, Account, CostCenter...',
    auditable_id      BIGINT UNSIGNED NOT NULL,
    old_values        JSON NULL,
    new_values        JSON NULL,
    ip_address        VARCHAR(45) NULL,
    user_agent        TEXT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_type_id (auditable_type, auditable_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action)
);
```

### 3.2 Posting Engine Design

```
                       ┌──────────────────────┐
                       │   Journal Entry Form  │
                       │   (DRAFT)             │
                       └──────────┬───────────┘
                                  │ POST
                                  ▼
                    ┌─────────────────────────────┐
                    │    POSTING ENGINE            │
                    │                              │
                    │ 1. Validate Period is OPEN   │
                    │ 2. Validate Account is ACTIVE│
                    │ 3. Validate Normal Balance   │
                    │ 4. Validate Subledger        │
                    │ 5. Validate Debit = Credit   │
                    │ 6. Generate transaction_no   │
                    │ 7. BEGIN TRANSACTION         │
                    │ 8. Insert Transaction        │
                    │ 9. Insert Entries            │
                    │ 10. Update Account Balances  │
                    │ 11. Update Subledger Balances│
                    │ 12. Write Audit Log          │
                    │ 13. COMMIT                   │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │      STATUS: POSTED          │
                    │      لا يمكن التعديل أو الحذف│
                    └─────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
           ┌──────────────┐          ┌──────────────────┐
           │ Reverse Entry │          │ Cancel (soft)     │
           │ - creates new │          │ - mark cancelled  │
           │   opposite    │          │ - لا يؤثر على     │
           │   entry       │          │   الأرصدة         │
           └──────────────┘          └──────────────────┘
```

### 3.3 Posting Engine – Server Logic

```php
// PostingEngine.php — Core Business Logic
class PostingEngine
{
    public function post(Transaction $transaction): Transaction
    {
        // 1. Validate period is open
        $period = $this->validatePeriod($transaction->date);

        // 2. Validate accounts
        foreach ($transaction->entries as $entry) {
            $this->validateAccount($entry->account, $transaction->date);
            $this->validateSubledger($entry->account, $entry->subledger_type);
            $this->validateNormalBalance($entry->account, $entry->debit, $entry->credit);
        }

        // 3. Validate balance
        $this->validateBalance($transaction->entries);

        // 4. Generate transaction number
        $transaction->transaction_number = $this->generateNumber($transaction->transactionType, $transaction->date);

        // 5. Atomic posting
        DB::transaction(function () use ($transaction, $period) {
            // Save transaction
            $transaction->status = 'posted';
            $transaction->posted_at = now();
            $transaction->posting_period_id = $period->id;
            $transaction->save();

            // Update account balances
            BalanceManager::updateBalances($transaction->entries, $period->id);

            // Update subledger balances
            if ($transaction->hasSubledgerEntries()) {
                SubledgerManager::updateBalances($transaction->entries, $period->id);
            }

            // Audit log
            AuditLog::write('post', $transaction);
        });

        return $transaction->fresh();
    }

    private function validateAccount(Account $account, Carbon $date): void
    {
        if (!$account->is_active) {
            throw new AccountingException("Account {$account->code} is inactive");
        }
        if (!$account->is_posting) {
            throw new AccountingException("Account {$account->code} is a parent account");
        }
        if ($account->is_system && !auth()->user()->can('post_to_system_accounts')) {
            throw new AccountingException("Cannot post to system account {$account->code}");
        }
    }

    private function validateNormalBalance(Account $account, float $debit, float $credit): void
    {
        // Check if transaction respects normal balance direction
        if ($account->normal_balance === 'debit' && $credit > 0 && $debit === 0) {
            // Warning or block? Configurable
        }
        if ($account->normal_balance === 'credit' && $debit > 0 && $credit === 0) {
            // Warning or block
        }
    }

    private function validateBalance(Collection $entries): void
    {
        $totalDebit = $entries->sum('debit');
        $totalCredit = $entries->sum('credit');

        if (abs($totalDebit - $totalCredit) > 0.001) {
            throw new AccountingException(
                "Journal entry is not balanced: Debit={$totalDebit}, Credit={$totalCredit}"
            );
        }
    }
}
```

### 3.4 Balance Manager

```php
// BalanceManager.php — إدارة الأرصدة
class BalanceManager
{
    public static function updateBalances(Collection $entries, int $periodId): void
    {
        foreach ($entries->groupBy('account_id') as $accountId => $accountEntries) {
            $debit = $accountEntries->sum('debit');
            $credit = $accountEntries->sum('credit');

            // Upsert balance
            AccountBalance::updateOrCreate(
                ['account_id' => $accountId, 'period_id' => $periodId],
                [
                    'period_debit' => DB::raw("period_debit + {$debit}"),
                    'period_credit' => DB::raw("period_credit + {$credit}"),
                ]
            );

            // Update parent account rollups
            self::rollupParentBalances($accountId, $periodId);
        }
    }

    public static function calculateBalance(int $accountId, ?int $periodId = null): float
    {
        $query = AccountBalance::where('account_id', $accountId);
        if ($periodId) {
            $query->where('period_id', '<=', $periodId);
        }

        $balances = $query->get();
        $totalDebit = $balances->sum('opening_debit') + $balances->sum('period_debit');
        $totalCredit = $balances->sum('opening_credit') + $balances->sum('period_credit');

        $account = Account::find($accountId);
        return $account->normal_balance === 'debit'
            ? $totalDebit - $totalCredit
            : $totalCredit - $totalDebit;
    }
}
```

### 3.5 Voucher Architecture

```
           ┌────────────────────────────────────────────────────┐
           │                  SOURCE MODULES                    │
           │                                                    │
           │  POS ───> Sales ───> Receipts                      │
           │  Purchases ───> AP ───> Payments                   │
           │  HR ───> Payroll ───> Employee Advances             │
           │  Inventory ───> Adjustments                         │
           └──────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
           ┌────────────────────────────────────────────────────┐
           │              VOUCHER SYSTEM                        │
           │                                                    │
           │  Voucher Types:                                    │
           │  ├── PV (Payment Voucher)                          │
           │  ├── RV (Receipt Voucher)                          │
           │  ├── JV (Journal Voucher)                          │
           │  ├── CV (Credit Voucher)                           │
           │  ├── SV (Salary Voucher)                           │
           │  └── OV (Opening Voucher)                          │
           │                                                    │
           │  Each voucher:                                     │
           │  ├── Has unique numbering per type                 │
           │  ├── Has approval workflow                         │
           │  ├── Maps to specific GL accounts                  │
           │  └── Creates journal entry on POST                 │
           └──────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
           ┌────────────────────────────────────────────────────┐
           │              JOURNAL ENTRY                         │
           │                                                    │
           │  - Always double-entry                             │
           │  - Always balanced                                 │
           │  - Links back to voucher                           │
           │  - Links to source module                          │
           └──────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
           ┌────────────────────────────────────────────────────┐
           │              POSTING ENGINE                        │
           │  - Validates                                       │
           │  - Posts to GL                                     │
           │  - Updates balances                                │
           │  - Updates subledger                               │
           └────────────────────────────────────────────────────┘
```

### 3.6 Journal Entry Workflow

```
                    ┌─────────────┐
                    │    DRAFT     │
                    │ (مسودة)      │
                    └──────┬──────┘
                           │ Save
                           ▼
                    ┌─────────────┐
                    │  SUBMITTED  │
                    │ (مُرسل)      │
                    └──────┬──────┘
                           │ Approve
                           ▼
                    ┌─────────────┐
                    │  APPROVED   │
                    │ (معتمد)      │
                    └──────┬──────┘
                           │ Post
                           ▼
                    ┌─────────────┐
                    │   POSTED    │ ◄── لا يمكن التعديل أو الحذف
                    │ (مرحَّل)     │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │  CANCELLED   │          │  REVERSED   │
       │ (ملغي)       │          │ (عكسي)      │
       │ Soft cancel  │          │ New entry   │
       │ لا يؤثر      │          │ opposite    │
       │ على الأرصدة  │          │ direction   │
       └─────────────┘          └─────────────┘
```

**قواعد العمل:**
| الخطوة | ما يمكن فعله | ما يمنع |
|--------|-------------|---------|
| **DRAFT** | تعديل, حذف, إرسال | ترحيل, اعتماد |
| **SUBMITTED** | سحب, تعديل بسيط | ترحيل, حذف |
| **APPROVED** | ترحيل, رفض | تعديل, حذف |
| **POSTED** | عرض, عكس, إلغاء | تعديل, حذف, إعادة ترحيل |
| **CANCELLED** | عرض فقط | أي تعديل |
| **REVERSED** | عرض, كشف حساب | تعديل, حذف |

### 3.7 Subledger Architecture الجديد

```php
// SubledgerManager.php
class SubledgerManager
{
    // تحديد أنواع subledger المسموحة لكل حساب
    public static function allowedSubledgerTypes(Account $account): array
    {
        // قواعد محاسبية صارمة
        return match ($account->type) {
            'asset' => match (true) {
                $account->is_bank => ['supplier', 'employee'],    // حساب بنك → موردين وموظفين
                $account->is_cash => ['employee'],                // صندوق → موظفين (عهد)
                $account->is_receivable => ['customer', 'employee'], // ذمم مدينة → عملاء وموظفين
                default => [],
            },
            'liability' => match (true) {
                $account->is_payable => ['supplier', 'employee'],    // ذمم دائنة → موردين وموظفين
                $account->type === 'liability' => ['supplier'],
                default => [],
            },
            'revenue' => ['customer'],
            'expense' => ['supplier', 'employee'],
            'equity' => [],
        };
    }

    // تحديث أرصدة subledger بعد الترحيل
    public static function updateBalances(Collection $entries, int $periodId): void
    {
        $subledgerEntries = $entries->filter(fn($e) => $e->subledger_type && $e->subledger_id);

        foreach ($subledgerEntries->groupBy(fn($e) => "{$e->subledger_type}_{$e->subledger_id}") as $key => $group) {
            $first = $group->first();

            SubledgerBalance::updateOrCreate(
                [
                    'subledger_type' => $first->subledger_type,
                    'subledger_id' => $first->subledger_id,
                    'period_id' => $periodId,
                ],
                [
                    'period_debit' => DB::raw("period_debit + {$group->sum('debit')}"),
                    'period_credit' => DB::raw("period_credit + {$group->sum('credit')}"),
                ]
            );
        }
    }
}
```

### 3.8 Approval Workflow

```php
// ApprovalEngine.php
class ApprovalEngine
{
    const RULES = [
        'journal' => ['min_amount' => 10000, 'require_approval' => true],
        'payment' => ['min_amount' => 5000, 'require_approval' => true],
        'receipt' => ['min_amount' => 10000, 'require_approval' => false],
        'salary'  => ['min_amount' => 1, 'require_approval' => true],
    ];

    public function needsApproval(Transaction $transaction): bool
    {
        $type = $transaction->transactionType;
        $rule = self::RULES[$type->code] ?? self::RULES['journal'];

        $total = $transaction->entries->sum('debit');

        if (!$rule['require_approval']) return false;
        if ($total >= $rule['min_amount']) return true;

        // Additional rules
        if ($transaction->is_reversal) return true;
        if ($transaction->currency_code !== 'ILS') return true;

        return false;
    }
}
```

---

<a name="phase4"></a>

## 🎨 المرحلة 4: تحليل واجهة المستخدم

### 4.1 مشاكل UI/UX الحالية

| المنطقة                 | المشكلة                                   | الحل المقترح                                          |
| ----------------------- | ----------------------------------------- | ----------------------------------------------------- |
| `AccountingWorkspace`   | تصميم كروت للأسطر بدلاً من Grid مثل Excel | **Journal Grid احترافي** مع إدخال سريع                |
| `EnterpriseJournalView` | جدول عرض القيود قديم وبدائي               | **DataTable احترافي** مع Sorting, Grouping, Filtering |
| `ViewJournalModal`      | Modal صغير لعرض التفاصيل                  | **Drawer جانبي** (Slide Panel) مثل ERP الحديثة        |
| `AddCOAModal`           | جيد بشكل عام                              | إضافة **نوع الحساب المحاسبي** (نقدية، بنك، ذمم...)    |
| `CostCentersView`       | جيد                                       | إضافة **مقارنة Actual vs Budget** و **Progress Bars** |

### 4.2 تصميم UI المقترح

```
┌─────────────────────────────────────────────────────────────────┐
│  GL Module → Professional Accounting Interface                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  HEADER: Voucher Info                                  │   │
│  │  ┌──────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌──────────┐ │   │
│  │  │ رقم   │ │تاريخ │ │المرجع  │ │العملة  │ │نوع القيد │ │   │
│  │  │ القيد │ │      │ │        │ │ ILS    │ │          │ │   │
│  │  └──────┘ └──────┘ └────────┘ └────────┘ └──────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ الوصف: ________________________________________ │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  JOURNAL LINES GRID (Excel-like)                       │   │
│  │  ┌──────┬────────┬────────┬────────┬────────┬────────┐ │   │
│  │  │ #    │ الحساب │ مدين   │ دائن   │مركز   │Subledg │ │   │
│  │  │      │        │        │        │تكلفة  │        │ │   │
│  │  ├──────┼────────┼────────┼────────┼────────┼────────┤ │   │
│  │  │ 1    │1100-نقد│ 5000   │        │مطبخ   │---     │ │   │
│  │  │ 2    │5100-رواتب│      │ 5000   │إداري  │موظف #5 │ │   │
│  │  ├──────┼────────┼────────┼────────┼────────┼────────┤ │   │
│  │  │      │الإجمالي│ 5000   │ 5000   │        │        │ │   │
│  │  └──────┴────────┴────────┴────────┴────────┴────────┘ │   │
│  │                                                         │   │
│  │  [+ إضافة سطر]  [⚖️ توازن تلقائي]  [📋 نسخ]  [🗑️ كل] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  BALANCE INDICATOR                                       │   │
│  │  ✅ القيد متوازن | مدين: ₪5,000 | دائن: ₪5,000          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ACTIONS                                                │   │
│  │  [💾 حفظ كـ مسودة] [✅ إرسال للاعتماد] [🔄 عكس]        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

<a name="phase5"></a>

## 💻 المرحلة 5: تصميم شاشة القيود الاحترافية

### 5.1 Journal Grid Component (Professional)

```tsx
// Suggested Architecture
interface JournalGridColumn {
  key: string;
  title: string;
  width?: number;
  type: "text" | "select" | "number" | "date" | "entity";
  editable: boolean;
  required: boolean;
  options?: {
    accountType?: string;
    entityType?: string;
    costCenterType?: string;
  };
}

interface JournalGridProps {
  lines: JournalLine[];
  onChange: (lines: JournalLine[]) => void;
  accounts: Account[];
  costCenters: CostCenter[];
  // Smart features
  enableAutoComplete?: boolean;
  enableTabNavigation?: boolean;
  enableCopyPaste?: boolean;
  enableKeyboardShortcuts?: boolean;
  // Validation
  validationEngine?: ValidationEngine;
  onError?: (errors: ValidationError[]) => void;
}
```

### 5.2 Validation Engine

```ts
// ValidationEngine.ts — Smart Accounting Validation
class JournalValidationEngine {
  validate(
    lines: JournalLine[],
    context: ValidationContext,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Check balance
    const { debit, credit } = this.sumTotals(lines);
    if (Math.abs(debit - credit) > 0.001) {
      errors.push({
        type: "IMBALANCE",
        field: "global",
        message: `القيد غير متوازن: فرق ₪${(debit - credit).toFixed(2)}`,
        severity: "ERROR",
      });
    }

    // 2. Validate each line
    lines.forEach((line, index) => {
      // Account is posting
      if (line.account && !line.account.isPosting) {
        errors.push({
          type: "NON_POSTING_ACCOUNT",
          field: `lines[${index}].accountId`,
          message: `الحساب ${line.account.nameAr} غير حركي`,
          severity: "ERROR",
        });
      }

      // Normal balance check (warning only)
      if (
        line.account &&
        line.debit > 0 &&
        line.account.normalBalance === "credit"
      ) {
        errors.push({
          type: "NORMAL_BALANCE_WARNING",
          field: `lines[${index}].debit`,
          message: `تنبيه: ${line.account.nameAr} طبيعته دائن`,
          severity: "WARNING",
        });
      }

      // Subledger validation
      if (line.subledgerType && line.subledgerType !== "none") {
        const allowed = this.getAllowedSubledgerTypes(line.account);
        if (!allowed.includes(line.subledgerType)) {
          errors.push({
            type: "INVALID_SUBLEDGER",
            field: `lines[${index}].subledgerType`,
            message: `لا يمكن ربط ${line.account.nameAr} مع ${line.subledgerType}`,
            severity: "ERROR",
          });
        }
      }

      // Cost center required for expense accounts
      if (line.account?.type === "expense" && !line.costCenterId) {
        errors.push({
          type: "REQUIRED_COST_CENTER",
          field: `lines[${index}].costCenterId`,
          message: "حسابات المصروفات تتطلب مركز تكلفة",
          severity: "WARNING",
        });
      }
    });

    // 3. Validate date
    if (context.date) {
      const period = context.accountingPeriods?.find(
        (p) => context.date >= p.start_date && context.date <= p.end_date,
      );
      if (!period || period.status !== "open") {
        errors.push({
          type: "CLOSED_PERIOD",
          field: "date",
          message: "الفترة المحددة مغلقة أو غير موجودة",
          severity: "ERROR",
        });
      }
    }

    return errors;
  }
}
```

### 5.3 Keyboard Shortcuts (Enterprise-Grade)

```ts
const KEYBOARD_SHORTCUTS = {
  "Ctrl+Enter": "حفظ القيد وترحيله مباشرة",
  "Ctrl+S": "حفظ كمسودة",
  "Ctrl+Shift+S": "حفظ وإرسال للاعتماد",
  "Alt+A": "إضافة سطر جديد",
  "Alt+D": "حذف السطر المحدد",
  "Ctrl+C": "نسخ السطر",
  "Ctrl+V": "لصق سطر",
  "Ctrl+Z": "تراجع",
  "Ctrl+Shift+Z": "إعادة",
  "Ctrl+B": "توازن تلقائي",
  "Ctrl+R": "عكس القيد",
  "Ctrl+P": "طباعة/PDF",
  "Ctrl+.": "إكمال تلقائي للحساب",
  Tab: "الانتقال للحقل التالي",
  "Shift+Tab": "الانتقال للحقل السابق",
  F2: "تعديل الخلية",
  F3: "بحث عن حساب",
  Delete: "مسح القيمة",
  Escape: "إغلاق/خروج",
};
```

---

<a name="phase6"></a>

## 🗺️ المرحلة 6: Roadmap التنفيذ والأولويات

### 6.1 Priority Matrix

| الأولوية | المهمة                               | الوقت المقدر | التأثير                    |
| -------- | ------------------------------------ | ------------ | -------------------------- |
| **P0**   | Posting Engine (Atomic + Validation) | 3 أسابيع     | يمنع Corruption            |
| **P0**   | إضافة Soft Delete للقيود             | 3 أيام       | يمنع فقدان البيانات        |
| **P0**   | منع حذف القيود المرحلة               | 1 يوم        | أمان محاسبي                |
| **P0**   | Server-side Validation               | 2 أسبوع      | أمان API                   |
| **P1**   | Account Balances Table               | 2 أسبوع      | أداء + صحة                 |
| **P1**   | Audit Trail System                   | 1 أسبوع      | تدقيق                      |
| **P1**   | Accounting Periods                   | 2 أسبوع      | منع الترحيل في فترات مغلقة |
| **P1**   | Approval Workflow                    | 3 أسابيع     | رقابة مالية                |
| **P2**   | Subledger Validation                 | 1 أسبوع      | نقاء البيانات              |
| **P2**   | Normal Balance Enforcement           | 1 أسبوع      | دقة محاسبية                |
| **P2**   | Journal Grid (Excel-like UI)         | 3 أسابيع     | UX احترافي                 |
| **P3**   | Aging Reports                        | 2 أسبوع      | تقارير                     |
| **P3**   | Budget vs Actual                     | 2 أسبوع      | رقابة                      |
| **P3**   | Recurring Journals                   | 1 أسبوع      | أتمتة                      |

### 6.2 Implementation Phases

```
Phase 0 (Weeks 1-2) — إصلاحات عاجلة
├── [ ] منع DELETE للقيود المرحلة
├── [ ] إضافة verified ف lag للمعاملات
├── [ ] إضافة transaction_number التلقائي
├── [ ] Server-side validation أساسي
└── [ ] Fix toJournalShape dead code

Phase 1 (Weeks 3-6) — Posting Engine
├── [ ] جدول account_balances
├── [ ] جدول accounting_periods
├── [ ] جدول audit_log
├── [ ] PostingEngine class
├── [ ] BalanceManager class
└── [ ] Atomic posting (DB transactions)

Phase 2 (Weeks 7-10) — Approval + Workflow
├── [ ] ApprovalEngine
├── [ ] Voucher system
├── [ ] Status workflow (Draft → Approved → Posted)
├── [ ] SubledgerManager
└── [ ] Reverse Entry system

Phase 3 (Weeks 11-14) — UI Refactor
├── [ ] Journal Grid Component
├── [ ] Validation Engine (frontend)
├── [ ] Keyboard Shortcuts
├── [ ] Journal Preview
└── [ ] Professional Dashboard

Phase 4 (Weeks 15-18) — Reports & Integration
├── [ ] Trial Balance
├── [ ] Income Statement
├── [ ] Balance Sheet
├── [ ] Aging Reports
├── [ ] POS Integration
├── [ ] Purchases Integration
└── [ ] HR/Payroll Integration
```

### 6.3 التوصيات النهائية

```
╔══════════════════════════════════════════════════════════════════╗
║                   التوصيات النهائية                             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. ❗ **أوقف الإنتاج فوراً** إذا كان النظام في production      ║
║     → المخاطر المالية أكبر من أن تُتحمل                          ║
║                                                                  ║
║  2. 🔴 **أصلح المشاكل الحرجة أولاً** (P0)                       ║
║     → Posting Engine, Soft Delete, منع الحذف                    ║
║                                                                  ║
║  3. 🟡 **المشاكل العالية** (P1) ثانياً                         ║
║     → Audit Trail, Accounting Periods, Approval Workflow        ║
║                                                                  ║
║  4. 🟢 **التصميم الجديد** بعد استقرار المحاسبة الأساسية          ║
║     → Voucher System, Recurring, Reports                        ║
║                                                                  ║
║  5. 🎨 **تحسين الـ UI** في النهاية بعد اكتمال business logic    ║
║     → Journal Grid, Keyboard Shortcuts, Smart Features          ║
║                                                                  ║
║  🎯 **الهدف النهائي**: نظام محاسبي Enterprise-grade             ║
║     آمن، قابل للتدقيق، دقيق، وسريع                               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

_تم إعداد هذا التحليل بواسطة Senior ERP Architect & Financial Systems Expert_
_التاريخ: 11 يونيو 2026_
