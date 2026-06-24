# تقرير التحليل المالي الشامل - نظام RestoMaster

---

## Executive Summary

نظام RestoMaster هو نظام ERP متكامل لإدارة المطاعم والضيافة، يتبنى نموذج **Sales Invoice → Payment → Journal Entry** للقيد المحاسبي. النظام يستخدم أسلوب **Direct Journal Entry Creation** عند السداد، مع دعم كامل للخصومات والمدفوعات المختلطة.

**النموذج المحاسبي المعتمد:** E) Credit Note Based Accounting مع Direct Entry Creation

---

## Financial Architecture

### الوحدات المتعلقة بالمحاسبة:

1. **Accounting Module** - الوحدة المحاسبية الرئيسية
   - `app/Services/AccountingService.php` - خدمة إنشاء القيود
   - `app/Models/Transaction.php` - رأس القيد المحاسبي
   - `app/Models/Entry.php` - سطور القيد
   - `app/Models/Account.php` - شجرة الحسابات
   - `app/Models/CostCenter.php` - مراكز التكلفة

2. **Sales Module**
   - `app/Models/Order.php` - الطلب
   - `app/Models/Invoice.php` - الفاتورة
   - `app/Models/InvoiceItem.php` - بنود الفاتورة
   - `app/Models/Payment.php` - الدفعات

3. **Discount Module** (جديد)
   - `app/Models/Discount.php` - الخصومات
   - `app/Models/DiscountTarget.php` - مستهدفي الخصم
   - `app/Models/DiscountUsageLog.php` - سجل استخدام الخصومات

4. **Settlement Module**
   - `app/Services/SettlementEngine.php` - محرك التسوية
   - `app/Http/Controllers/Api/SettleController.php` - API التسوية

---

## Database Financial Entities

### الجداول الأساسية:

```
customers (id, name, phone, email, balance, ...)
    ↓
orders (id, order_number, customer_id, branch_id, status, total, ...)
    ↓
invoices (id, number, order_id, customer_id, branch_id, status, subtotal, discount, total, ...)
    ↓
invoice_items (id, invoice_id, item_id, quantity, price, original_price, discount_amount, discount_percent, discount_id, final_price, ...)
    ↓
payments (id, invoice_id, method, amount, entity_type, entity_id, ...)
    ↓
transactions (id, transaction_number, type, status, source_type, source_id, reversal_of_id, is_reversal, ...)
    ↓
entries (id, transaction_id, account_id, debit, credit, description, cost_center_id, subledger_type, subledger_id, ...)
```

### العلاقات:

**Customers ↔ Invoices:**

- `Invoice.customer_id` → `Customer.id`
- `Invoice.hasMany(Payment)`
- `Invoice.hasMany(InvoiceItem)`

**Invoices ↔ Invoice Items:**

- `InvoiceItem.invoice_id` → `Invoice.id`
- `InvoiceItem.belongsTo(Discount)` - عبر `discount_id`

**Invoices ↔ Payments:**

- `Payment.invoice_id` → `Invoice.id`
- `Invoice.hasMany(Payment)`

**Invoices ↔ Journal Entries:**

- `Invoice.journalEntry()` - عبر `Transaction.where('source_type', Order::class).where('source_id', order_id)`
- **ملاحظة:** القيد يُربط بالطلب (Order) وليس الفاتورة مباشرة

**Transactions ↔ Entries:**

- `Transaction.hasMany(Entry)`
- `Entry.belongsTo(Transaction)`
- `Entry.belongsTo(Account)`

**Subledger Integration:**

- `Entry.subledger_type` = 'customer' | 'employee' | 'supplier' | null
- `Entry.subledger_id` = ID الكيان
- يسمح بتتبع القيود على مستوى الكيانات بدون إنشاء حسابات منفصلة

---

## Invoice Lifecycle

### 1. إنشاء فاتورة جديدة:

**الملف:** `app/Http/Controllers/Api/InvoiceController.php`

```php
// createFromOrder()
public function createFromOrder(Request $request, Order $order)
```

**العملية:**

1. التحقق من صحة الطلب
2. إنشاء `Invoice` من بيانات الطلب
3. نسخ بنود الطلب إلى `InvoiceItem`
4. حساب `subtotal`, `discount`, `total`
5. حفظ الفاتورة بحالة `pending` أو `paid`

**الجداول المحدثة:**

- `invoices` - إدراج فاتورة جديدة
- `invoice_items` - إدراج بنود الفاتورة

**لا يتم إنشاء قيود محاسبية في هذه المرحلة.**

---

### 2. حفظ الفاتورة:

**الحالات (Status):**

- `pending` - قيد الانتظار
- `paid` - مدفوعة
- `cancelled` - ملغاة
- `void` - باطلة

**عند الحفظ:**

- الفاتورة تُحفظ في قاعدة البيانات
- لا يُنشأ قيد محاسبي
- لا يُحدث رصيد العميل
- لا يُخصم من المخزون (يتم عند تأكيد الطلب)

---

### 3. اعتماد (Post) الفاتورة:

**النظام الحالي:** لا يوجد اعتماد منفصل للفواتير

**الاعتماد يتم تلقائياً عند:**

- تحويل الطلب إلى فاتورة (`createFromOrder`)
- إضافة دفعة (`addPayment`)
- إغلاق الطلب (`closeOrderWithPayments`)

**الحالة النهائية:** `paid`

---

### 4. متى يتم إنشاء القيود المحاسبية:

**الملف:** `app/Services/AccountingService.php`

```php
public function createJournalEntryForInvoice(Invoice $invoice): ?Transaction
```

**الشروط:**

1. `Invoice.status === 'paid'`
2. لا يوجد قيد سابق مرتبط بالطلب (`!Transaction::forSource($order)->exists()`)
3. `total > 0`
4. يوجد دفعات (`!$payments->isEmpty()`)

**المنطق:**

```php
// عند السداد الكامل
if ($invoice->status === 'paid') {
    $accountingService->createJournalEntryForInvoice($invoice);
}
```

---

### 5. هل القيود تُنشأ تلقائياً أم يدوياً:

**تلقائياً** - عند السداد الكامل للفاتورة.

**الملف المسؤول:** `app/Services/AccountingService.php`

**الدالة:** `createJournalEntryForInvoice()`

---

### 6. ما الجداول التي يتم تحديثها:

عند إنشاء قيد محاسبي:

1. **transactions** - رأس القيد

   ```php
   Transaction::create([
       'transaction_number' => 'JV-20260101-0001',
       'type' => 'sale',
       'status' => 'posted',
       'source_type' => Order::class,
       'source_id' => $order->id,
       'reference' => $invoice->number,
   ]);
   ```

2. **entries** - سطور القيد

   ```php
   // لكل دفعة: سطر مدين
   Entry::create([
       'account_id' => $debitAccount->id,  // حساب الصندوق/البنك
       'debit' => $amount,
       'credit' => 0,
       'subledger_type' => $entityType,  // optional
       'subledger_id' => $entityId,      // optional
   ]);

   // سطر دائن واحد
   Entry::create([
       'account_id' => $revenueAccount->id,  // 4110
       'debit' => 0,
       'credit' => $total,
   ]);
   ```

---

## Journal Entry Lifecycle

### أنواع القيود (Transaction Types):

1. **sale** - مبيعات
2. **purchase** - مشتريات
3. **payment** - مدفوعات
4. **receipt** - مقبوضات
5. **adjustment** - تسويات
6. **reversal** - إلغاء/عكس

### حالات القيد (Status):

1. **draft** - مسودة (قابل للتعديل والحذف)
2. **posted** - مرحّل (ثابت، لا يمكن تعديله)
3. **cancelled** - ملغى

### الحماية من التعديل:

**الملف:** `app/Models/Entry.php`

```php
protected static function booted(): void
{
    static::updating(function (Entry $entry) {
        if ($entry->transaction && $entry->transaction->status === 'posted') {
            throw new \RuntimeException('لا يمكن تعديل قيود مرحّلة');
        }
    });

    static::deleting(function (Entry $entry) {
        if ($entry->transaction && $entry->transaction->status === 'posted') {
            throw new \RuntimeException('لا يمكن حذف قيود مرحّلة');
        }
    });
}
```

**النتيجة:** القيود المرحّلة (posted) **ثابتة ولا يمكن تعديلها أو حذفها**.

---

## Invoice Modification Analysis

### الوضع الحالي:

**لا يمكن تعديل الفاتورة بعد ترحيلها.**

**الأدلة من الكود:**

1. **Entry Model** - يمنع تعديل القيود المرحّلة:

   ```php
   // app/Models/Entry.php
   public function isEditable(): bool
   {
       return $this->status === 'draft';
   }
   ```

2. **Transaction Model** - يمنع تعديل القيود المرحّلة:

   ```php
   // app/Models/Transaction.php
   public function isEditable(): bool
   {
       return $this->status === 'draft';
   }
   ```

3. **لا يوجد دالة تعديل فاتورة** في `InvoiceController`

### ماذا يحدث عند محاولة التعديل:

1. **قبل السداد (status = pending):**
   - يمكن تعديل الفاتورة
   - لا يوجد قيد محاسبي بعد
   - يُحذف القيد القديم (إن وجد) ويُنشأ قيد جديد

2. **بعد السداد (status = paid):**
   - **لا يمكن تعديل الفاتورة**
   - القيد المحاسبي ثابت (posted)
   - الحل الوحيد: إنشاء فاتورة جديدة + Credit Note

---

## Invoice Cancellation Analysis

### كيف يتم الإلغاء حالياً:

**الملف:** `app/Http/Controllers/Api/OrderController.php`

```php
public function cancel(Request $request, Order $order)
```

**العملية:**

1. تغيير حالة الطلب إلى `cancelled`
2. تغيير حالة الفاتورة إلى `cancelled`
3. **لا يتم إنشاء قيد عكسي تلقائياً**

### تأثير الإلغاء:

1. **على القيود المحاسبية:**
   - **لا يتم إنشاء قيد عكسي**
   - القيد الأصلي يبقى كما هو (posted)
   - **مشكلة محاسبية:** القيد يظهر في الدفاتر رغم إلغاء الفاتورة

2. **على العملاء:**
   - يُحدَث رصيد العميل
   - الفاتورة تظهر كملغاة

3. **على المخزون:**
   - **لا يتم إعادة المخزون تلقائياً**
   - يحتاج إلى عملية يدوية

4. **على الضرائب:**
   - **لا يتم تعديل تقارير الضرائب**
   - الفاتورة الملغاة تظهر في التقارير

---

## Accounting Risks

### 1. عدم وجود قيد عكسي عند الإلغاء:

**المخاطر:**

- القيود المحاسبية لا تعكس الواقع الفعلي
- تقارير الأرباح والخسائر غير دقيقة
- مشاكل في التدقيق المالي

**الأدلة:**

```php
// app/Http/Controllers/Api/OrderController.php
public function cancel(Request $request, Order $order)
{
    // لا يوجد استدعاء لـ createReversalEntry()
    $order->update(['status' => 'cancelled']);
}
```

### 2. عدم وجود Versioning:

**المخاطر:**

- لا يمكن تتبع التعديلات
- لا يوجد Audit Trail للقيود
- صعوبة في اكتشاف الأخطاء

**الأدلة:**

- لا يوجد `revision_history` جدول
- لا يوجد `version` عمود في `transactions`
- `Auditable` trait موجود لكن غير مستخدم في القيود

### 3. عدم وجود Credit Notes:

**المخاطر:**

- مرتجعات المبيعات تُعالج كإلغاء
- لا يوجد وثيقة محاسبية للارتجاع
- صعوبة في تتبع المرتجعات

---

## Recommended Accounting Design

### الخيار الموصى به: **E) Credit Note Based Accounting**

**السبب:**

1. يتبع المعايير المحاسبية الدولية (IFRS/GAAP)
2. يوفر Audit Trail كامل
3. يسمح بتتبع المرتجعات والتعديلات
4. مرن وقابل للتوسع

### التصميم المقترح:

```
Sales Invoice (Posted)
    ↓
[Modification/Cancellation Request]
    ↓
Credit Note (Created)
    ↓
Reversal Entry (Posted)
    ↓
New Invoice/Adjustment (Optional)
    ↓
New Entry (Posted)
```

### المزايا:

1. **Audit Trail كامل:** كل عملية لها وثيقة
2. **قابلية التتبع:** يمكن تتبع أي تعديل
3. **الامتثال المحاسبي:** يتبع المعايير الدولية
4. **مرونة:** يدعم التعديل الجزئي والكلي

### العيوب:

1. **تعقيد:** يحتاج إلى جداول ووظائف إضافية
2. **أداء:** استعلامات إضافية للتقارير
3. **تدريب:** يحتاج إلى تدريب المستخدمين

---

## Recommended Technical Implementation

### 1. إنشاء Credit Note Model:

```php
// app/Models/CreditNote.php
class CreditNote extends Model
{
    protected $fillable = [
        'number',
        'invoice_id',
        'order_id',
        'customer_id',
        'branch_id',
        'type', // 'refund' | 'adjustment' | 'cancellation'
        'reason',
        'total',
        'status', // 'draft' | 'posted' | 'cancelled'
        'posted_at',
        'created_by',
    ];

    public function invoice() { return $this->belongsTo(Invoice::class); }
    public function order() { return $this->belongsTo(Order::class); }
    public function customer() { return $this->belongsTo(Customer::class); }
    public function transaction() { return $this->hasOne(Transaction::class); }
    public function items() { return $this->hasMany(CreditNoteItem::class); }
}
```

### 2. إنشاء Credit Note Item Model:

```php
// app/Models/CreditNoteItem.php
class CreditNoteItem extends Model
{
    protected $fillable = [
        'credit_note_id',
        'invoice_item_id',
        'item_id',
        'quantity',
        'unit_price',
        'total',
        'reason',
    ];
}
```

### 3. تحديث Transaction Model:

```php
// إضافة حقول جديدة
protected $fillable = [
    // ... existing
    'credit_note_id', // ربط القيد بCredit Note
    'parent_transaction_id', // ربط بالقيد الأصلي
];

// علاقات
public function creditNote() { return $this->belongsTo(CreditNote::class); }
public function parentTransaction() { return $this->belongsTo(Transaction::class, 'parent_transaction_id'); }
public function reversalTransaction() { return $this->hasOne(Transaction::class, 'reversal_of_id'); }
```

### 4. إنشاء Credit Note Service:

```php
// app/Services/CreditNoteService.php
class CreditNoteService
{
    public function createCreditNote(Invoice $invoice, array $items, string $reason): CreditNote
    {
        return DB::transaction(function () use ($invoice, $items, $reason) {
            // 1. إنشاء Credit Note
            $creditNote = CreditNote::create([...]);

            // 2. إنشاء بنود Credit Note
            foreach ($items as $item) {
                CreditNoteItem::create([...]);
            }

            // 3. إنشاء قيد عكسي
            $this->createReversalEntry($invoice, $creditNote);

            // 4. تحديث حالة الفاتورة
            $invoice->update(['status' => 'cancelled']);

            return $creditNote;
        });
    }

    private function createReversalEntry(Invoice $invoice, CreditNote $creditNote): Transaction
    {
        // جلب القيد الأصلي
        $originalTransaction = $invoice->journalEntry();

        // إنشاء قيد عكسي
        $reversal = Transaction::create([
            'transaction_number' => Transaction::generateNumber('CN'),
            'type' => 'reversal',
            'status' => 'posted',
            'source_type' => CreditNote::class,
            'source_id' => $creditNote->id,
            'reversal_of_id' => $originalTransaction->id,
            'is_reversal' => true,
        ]);

        // عكس كل سطر
        foreach ($originalTransaction->entries as $entry) {
            Entry::create([
                'transaction_id' => $reversal->id,
                'account_id' => $entry->account_id,
                'debit' => $entry->credit, // عكس
                'credit' => $entry->debit, // عكس
                'description' => "عكس - {$entry->description}",
                'subledger_type' => $entry->subledger_type,
                'subledger_id' => $entry->subledger_id,
            ]);
        }

        return $reversal;
    }
}
```

### 5. تحديث InvoiceController:

```php
// app/Http/Controllers/Api/InvoiceController.php
public function cancel(Request $request, Invoice $invoice)
{
    if ($invoice->status !== 'paid') {
        return response()->json(['error' => 'لا يمكن إلغاء فاتورة غير مدفوعة'], 422);
    }

    $creditNoteService = new CreditNoteService();
    $creditNote = $creditNoteService->createCreditNote(
        $invoice,
        $invoice->items,
        $request->reason
    );

    return response()->json([
        'message' => 'تم إلغاء الفاتورة وإنشاء قيد عكسي',
        'credit_note' => $creditNote,
    ]);
}
```

---

## Final Decision With Justification

### القرار النهائي: **Credit Note Based Accounting**

### الأسباب:

1. **الامتثال المحاسبي:**
   - يتبع المعايير الدولية (IFRS/GAAP)
   - كل عملية لها وثيقة محاسبية
   - Audit Trail كامل

2. **المرونة:**
   - يدعم التعديل الجزئي والكلي
   - يدعم المرتجعات والتسويات
   - يمكن تتبع كل تعديل

3. **الأمان:**
   - القيود الأصلية تبقى ثابتة
   - التعديلات تُسجل كعمليات منفصلة
   - لا يمكن حذف أو تعديل قيود مرحّلة

4. **التدقيق:**
   - كل عملية قابلة للتدقيق
   - يمكن تتبع المسؤول عن كل تعديل
   - تقارير دقيقة وموثوقة

### الأثر البرمجي:

**الملفات المطلوب تعديلها:**

1. **جداول جديدة:**
   - `credit_notes`
   - `credit_note_items`

2. **Models جديدة:**
   - `app/Models/CreditNote.php`
   - `app/Models/CreditNoteItem.php`

3. **Services جديدة:**
   - `app/Services/CreditNoteService.php`

4. **Controllers محدّثة:**
   - `app/Http/Controllers/Api/InvoiceController.php` - إضافة `cancel()`
   - `app/Http/Controllers/Api/OrderController.php` - تحديث `cancel()`

5. **Routes جديدة:**
   - `POST /api/invoices/{invoice}/cancel`
   - `GET /api/credit-notes`
   - `POST /api/credit-notes`

### الأثر المحاسبي:

**الإيجابيات:**

- قيود دقيقة وموثوقة
- تقارير مالية صحيحة
- امتثال للوائح الضريبية
- سهولة التدقيق

**السلبيات:**

- زيادة عدد القيود
- تعقيد التقارير
- حجم قاعدة بيانات أكبر

### الأثر على الأداء:

- **استعلامات إضافية:** +2-3 استعلامات لكل إلغاء
- **حجم قاعدة البيانات:** +10-15% (بعد سنة)
- **سرعة التقارير:** -5-10% (يمكن تحسينها بـ Indexes)

---

## File References

### Models:

- `app/Models/Invoice.php` - نموذج الفاتورة
- `app/Models/InvoiceItem.php` - بنود الفاتورة
- `app/Models/Transaction.php` - رأس القيد المحاسبي
- `app/Models/Entry.php` - سطور القيد
- `app/Models/Payment.php` - الدفعات
- `app/Models/Discount.php` - الخصومات (جديد)

### Services:

- `app/Services/AccountingService.php` - خدمة إنشاء القيود
  - `createJournalEntryForInvoice()` - إنشاء قيد عند السداد
  - `findRevenueAccount()` - حساب الإيرادات (4110)
  - `findSalesDiscountsAccount()` - حساب الخصومات (4120)

### Controllers:

- `app/Http/Controllers/Api/InvoiceController.php` - API الفواتير
- `app/Http/Controllers/Api/OrderController.php` - API الطلبات
- `app/Http/Controllers/Api/DiscountController.php` - API الخصومات (جديد)

### Database Migrations:

- `database/migrations/2026_06_23_161717_create_discounts_table.php`
- `database/migrations/2026_06_23_161724_create_discount_targets_table.php`
- `database/migrations/2026_06_23_161725_create_discount_usage_logs_table.php`
- `database/migrations/2026_06_23_161725_add_discount_fields_to_invoice_items_table.php`
- `database/migrations/2026_06_23_161726_create_discount_settings_table.php`

---

## الخلاصة

النظام الحالي يستخدم نموذج **Direct Journal Entry Creation** عند السداد، مع **عدم وجود آلية للإلغاء العكسي**. يُوصى بتبني نموذج **Credit Note Based Accounting** لضمان:

1. امتثال محاسبي كامل
2. Audit Trail شامل
3. مرونة في التعديل والإلغاء
4. دقة التقارير المالية

**الخطوات التالية:**

1. إنشاء Credit Note Module
2. تحديث InvoiceController و OrderController
3. إضافة Credit Note Service
4. تحديث التقارير المالية
5. تدريب المستخدمين
