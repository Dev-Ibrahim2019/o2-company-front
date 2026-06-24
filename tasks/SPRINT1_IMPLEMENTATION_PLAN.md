# Sprint 1 Implementation Plan

## Laravel 12 Restaurant ERP - POS → Order → Invoice → Payment → Journal Entry

**Sprint Duration:** 2 weeks  
**Goal:** Complete working financial cycle  
**Scope:** POS, Orders, Invoices, Payments, Journal Entries  
**Team:** 1-2 developers  
**Date:** 2026-06-24

---

# Implementation Order

## Phase 1: Database Foundation (Days 1-2)

## Phase 2: Models & Relationships (Days 3-4)

## Phase 3: Core Services (Days 5-7)

## Phase 4: API Controllers (Days 8-10)

## Phase 5: Events & Integration (Days 11-12)

## Phase 6: Testing & Documentation (Days 13-14)

---

# Phase 1: Database Foundation (Days 1-2)

## 1.1 Migration Order

Execute migrations in this exact order:

### Step 1: Add Timestamps to Existing Tables

**File:** `database/migrations/2026_06_24_000001_add_timestamps_to_orders_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('created_at')->nullable()->after('total');
            $table->timestamp('updated_at')->nullable()->after('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000002_add_timestamps_to_invoices_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->timestamp('created_at')->nullable()->after('notes');
            $table->timestamp('updated_at')->nullable()->after('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000003_add_timestamps_to_payments_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->timestamp('created_at')->nullable()->after('notes');
            $table->timestamp('updated_at')->nullable()->after('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000004_add_timestamps_to_transactions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->timestamp('created_at')->nullable()->after('description');
            $table->timestamp('updated_at')->nullable()->after('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000005_add_timestamps_to_entries_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entries', function (Blueprint $table) {
            $table->timestamp('created_at')->nullable()->after('sort_order');
            $table->timestamp('updated_at')->nullable()->after('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('entries', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });
    }
};
```

---

### Step 2: Add User Attribution Fields

**File:** `database/migrations/2026_06_24_000006_add_user_attribution_to_orders_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('total');
            $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();

            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000007_add_user_attribution_to_invoices_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('notes');
            $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
            $table->unsignedBigInteger('approved_by')->nullable()->after('updated_by');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->unsignedBigInteger('posted_by')->nullable()->after('approved_at');
            $table->timestamp('posted_at')->nullable()->after('posted_by');
            $table->unsignedBigInteger('cancelled_by')->nullable()->after('posted_at');
            $table->timestamp('cancelled_at')->nullable()->after('cancelled_by');

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('posted_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('cancelled_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['created_by', 'approved_by', 'posted_by', 'cancelled_by']);
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['created_by', 'updated_by', 'approved_by', 'posted_by', 'cancelled_by']);
            $table->dropColumn([
                'created_by', 'updated_by', 'approved_by', 'approved_at',
                'posted_by', 'posted_at', 'cancelled_by', 'cancelled_at'
            ]);
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000008_add_user_attribution_to_payments_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('user_id');
            $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
            $table->unsignedBigInteger('reconciled_by')->nullable()->after('updated_by');
            $table->timestamp('reconciled_at')->nullable()->after('reconciled_by');

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('reconciled_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['created_by', 'reconciled_by']);
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['created_by', 'updated_by', 'reconciled_by']);
            $table->dropColumn(['created_by', 'updated_by', 'reconciled_by', 'reconciled_at']);
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000009_add_user_attribution_to_transactions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('description');
            $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');
            $table->unsignedBigInteger('reversed_by')->nullable()->after('updated_by');
            $table->timestamp('reversed_at')->nullable()->after('reversed_by');

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('reversed_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['created_by', 'reversed_by']);
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['created_by', 'updated_by', 'reversed_by']);
            $table->dropColumn(['created_by', 'updated_by', 'reversed_by', 'reversed_at']);
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000010_add_user_attribution_to_entries_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entries', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable()->after('sort_order');
            $table->unsignedBigInteger('updated_by')->nullable()->after('created_by');

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();

            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::table('entries', function (Blueprint $table) {
            $table->dropForeign(['created_by', 'updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });
    }
};
```

---

### Step 3: Add Missing Foreign Keys

**File:** `database/migrations/2026_06_24_000011_add_customer_fk_to_orders_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('customer_id')->nullable()->after('id');
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn(['customer_id']);
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000012_add_polymorphic_source_to_transactions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('source_type')->nullable()->after('type');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->string('reference_number')->nullable()->after('description');

            $table->index(['source_type', 'source_id']);
            $table->index('reference_number');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['source_type', 'source_id']);
            $table->dropIndex(['reference_number']);
            $table->dropColumn(['source_type', 'source_id', 'reference_number']);
        });
    }
};
```

---

### Step 4: Add SoftDeletes to Financial Tables

**File:** `database/migrations/2026_06_24_000013_add_soft_deletes_to_invoices_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->softDeletes()->after('cancelled_at');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000014_add_soft_deletes_to_payments_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->softDeletes()->after('reconciled_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
```

**File:** `database/migrations/2026_06_24_000015_add_soft_deletes_to_transactions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->softDeletes()->after('reversed_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
```

---

## 1.2 Migration Execution Command

```bash
# Execute all migrations in order
php artisan migrate --path=database/migrations/2026_06_24_000001_add_timestamps_to_orders_table.php
php artisan migrate --path=database/migrations/2026_06_24_000002_add_timestamps_to_invoices_table.php
php artisan migrate --path=database/migrations/2026_06_24_000003_add_timestamps_to_payments_table.php
php artisan migrate --path=database/migrations/2026_06_24_000004_add_timestamps_to_transactions_table.php
php artisan migrate --path=database/migrations/2026_06_24_000005_add_timestamps_to_entries_table.php
php artisan migrate --path=database/migrations/2026_06_24_000006_add_user_attribution_to_orders_table.php
php artisan migrate --path=database/migrations/2026_06_24_000007_add_user_attribution_to_invoices_table.php
php artisan migrate --path=database/migrations/2026_06_24_000008_add_user_attribution_to_payments_table.php
php artisan migrate --path=database/migrations/2026_06_24_000009_add_user_attribution_to_transactions_table.php
php artisan migrate --path=database/migrations/2026_06_24_000010_add_user_attribution_to_entries_table.php
php artisan migrate --path=database/migrations/2026_06_24_000011_add_customer_fk_to_orders_table.php
php artisan migrate --path=database/migrations/2026_06_24_000012_add_polymorphic_source_to_transactions_table.php
php artisan migrate --path=database/migrations/2026_06_24_000013_add_soft_deletes_to_invoices_table.php
php artisan migrate --path=database/migrations/2026_06_24_000014_add_soft_deletes_to_payments_table.php
php artisan migrate --path=database/migrations/2026_06_24_000015_add_soft_deletes_to_transactions_table.php
```

---

# Phase 2: Models & Relationships (Days 3-4)

## 2.1 Update Order Model

**File:** `app/Models/Order.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Scopes\BranchScope;

class Order extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope);
    }

    protected $fillable = [
        'order_number',
        'branch_id',
        'customer_id',
        'cashier_id',
        'created_by',
        'updated_by',
        'order_type',
        'status',
        'table_number',
        'customer_name',
        'customer_phone',
        'note',
        'subtotal',
        'discount_value',
        'discount_type',
        'discount_amount',
        'tax_rate',
        'tax_amount',
        'service_charge_rate',
        'service_charge_amount',
        'total',
    ];

    protected $casts = [
        'subtotal' => 'decimal:3',
        'discount_value' => 'decimal:3',
        'discount_amount' => 'decimal:3',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:3',
        'service_charge_rate' => 'decimal:2',
        'service_charge_amount' => 'decimal:3',
        'total' => 'decimal:3',
    ];

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'cashier_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(ProductionTicket::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function payments(): HasManyThrough
    {
        return $this->hasManyThrough(Payment::class, Invoice::class);
    }

    // Helper Methods
    public static function generateOrderNumber(): string
    {
        $prefix = 'ORD-'.now()->format('Ymd').'-';
        $last = static::where('order_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('order_number');

        $seq = $last ? (int) substr($last, -4) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    public function recalculateTotals(): void
    {
        $subtotal = (float) $this->items()->sum('total');
        $discountAmount = $this->discount_type === 'percent'
            ? ($subtotal * (float) $this->discount_value / 100)
            : (float) $this->discount_value;

        $taxRate = (float) $this->tax_rate ?? 0;
        $serviceChargeRate = (float) $this->service_charge_rate ?? 0;

        $afterDiscount = max(0, $subtotal - $discountAmount);
        $taxAmount = $afterDiscount * ($taxRate / 100);
        $serviceChargeAmount = $afterDiscount * ($serviceChargeRate / 100);
        $total = $afterDiscount + $taxAmount + $serviceChargeAmount;

        $this->update([
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'tax_amount' => $taxAmount,
            'service_charge_amount' => $serviceChargeAmount,
            'total' => $total,
        ]);
    }

    public function canBeInvoiced(): bool
    {
        return $this->status === 'confirmed' && !$this->invoice;
    }
}
```

---

## 2.2 Update Invoice Model

**File:** `app/Models/Invoice.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Scopes\BranchScope;

class Invoice extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope);
    }

    protected $fillable = [
        'invoice_number',
        'order_id',
        'customer_id',
        'branch_id',
        'created_by',
        'updated_by',
        'approved_by',
        'posted_by',
        'cancelled_by',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total',
        'status',
        'payment_status',
        'due_date',
        'approved_at',
        'posted_at',
        'cancelled_at',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:3',
        'discount_amount' => 'decimal:3',
        'tax_amount' => 'decimal:3',
        'total' => 'decimal:3',
        'approved_at' => 'datetime',
        'posted_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function transaction(): HasOne
    {
        return $this->hasOne(Transaction::class);
    }

    // Helper Methods
    public static function generateInvoiceNumber(): string
    {
        $prefix = 'INV-'.now()->format('Y').'-';
        $last = static::where('invoice_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('invoice_number');

        $seq = $last ? (int) substr($last, -4) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    public function isPaid(): bool
    {
        return $this->payment_status === 'paid';
    }

    public function isPartiallyPaid(): bool
    {
        return $this->payment_status === 'partially_paid';
    }

    public function isPending(): bool
    {
        return $this->payment_status === 'pending';
    }

    public function getBalanceAttribute(): float
    {
        $paid = $this->payments()->where('status', 'completed')->sum('amount');
        return (float) ($this->total - $paid);
    }

    public function canBeEdited(): bool
    {
        return in_array($this->status, ['draft', 'rejected']) && !$this->payments()->exists();
    }

    public function canBeApproved(): bool
    {
        return $this->status === 'pending_approval';
    }

    public function canBePosted(): bool
    {
        return $this->status === 'approved';
    }

    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['draft', 'pending_approval', 'approved']);
    }
}
```

---

## 2.3 Update Payment Model

**File:** `app/Models/Payment.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Scopes\BranchScope;

class Payment extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope);
    }

    protected $fillable = [
        'payment_number',
        'invoice_id',
        'customer_id',
        'branch_id',
        'payment_method_id',
        'user_id',
        'created_by',
        'updated_by',
        'reconciled_by',
        'amount',
        'payment_date',
        'reference_number',
        'notes',
        'status',
        'reconciled_at',
    ];

    protected $casts = [
        'amount' => 'decimal:3',
        'payment_date' => 'date',
        'reconciled_at' => 'datetime',
    ];

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function reconciledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }

    public function transaction(): HasOne
    {
        return $this->hasOne(Transaction::class);
    }

    // Helper Methods
    public static function generatePaymentNumber(): string
    {
        $prefix = 'PAY-'.now()->format('Ymd').'-';
        $last = static::where('payment_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('payment_number');

        $seq = $last ? (int) substr($last, -4) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    public function isReconciled(): bool
    {
        return $this->status === 'reconciled';
    }

    public function markAsReconciled(int $userId): bool
    {
        return $this->update([
            'status' => 'reconciled',
            'reconciled_by' => $userId,
            'reconciled_at' => now(),
        ]);
    }
}
```

---

## 2.4 Update Transaction Model

**File:** `app/Models/Transaction.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Scopes\BranchScope;

class Transaction extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        static::addGlobalScope(new BranchScope);
    }

    protected $fillable = [
        'transaction_number',
        'branch_id',
        'type',
        'status',
        'total_amount',
        'description',
        'source_type',
        'source_id',
        'reference_number',
        'user_id',
        'created_by',
        'updated_by',
        'approved_by',
        'reversed_by',
        'posted_at',
        'reversed_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:3',
        'posted_at' => 'datetime',
        'reversed_at' => 'datetime',
    ];

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function reversedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(Entry::class);
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    // Helper Methods
    public static function generateTransactionNumber(): string
    {
        $prefix = 'JV-'.now()->format('Y').'-';
        $last = static::where('transaction_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('transaction_number');

        $seq = $last ? (int) substr($last, -4) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    public function isPosted(): bool
    {
        return $this->status === 'posted';
    }

    public function isReversed(): bool
    {
        return $this->status === 'reversed';
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function getDebitTotalAttribute(): float
    {
        return (float) $this->entries()->sum('debit');
    }

    public function getCreditTotalAttribute(): float
    {
        return (float) $this->entries()->sum('credit');
    }

    public function isBalanced(): bool
    {
        return abs($this->debit_total - $this->credit_total) < 0.01;
    }

    public function post(int $userId): bool
    {
        if (!$this->isBalanced()) {
            throw new \Exception('Transaction is not balanced');
        }

        return $this->update([
            'status' => 'posted',
            'posted_at' => now(),
            'approved_by' => $userId,
        ]);
    }

    public function reverse(int $userId): bool
    {
        if ($this->isReversed()) {
            throw new \Exception('Transaction is already reversed');
        }

        return $this->update([
            'status' => 'reversed',
            'reversed_by' => $userId,
            'reversed_at' => now(),
        ]);
    }
}
```

---

## 2.5 Update Entry Model

**File:** `app/Models/Entry.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Scopes\BranchScope;

class Entry extends Model
{
    protected $fillable = [
        'transaction_id',
        'account_id',
        'branch_id',
        'description',
        'debit',
        'credit',
        'sort_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'debit' => 'decimal:3',
        'credit' => 'decimal:3',
    ];

    // Relationships
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
```

---

# Phase 3: Core Services (Days 5-7)

## 3.1 Order Service

**File:** `app/Services/OrderService.php`

```php
<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;

class OrderService
{
    public function createOrder(array $data, int $userId): Order
    {
        return DB::transaction(function () use ($data, $userId) {
            $order = new Order();
            $order->order_number = Order::generateOrderNumber();
            $order->branch_id = $data['branch_id'];
            $order->customer_id = $data['customer_id'] ?? null;
            $order->cashier_id = $userId;
            $order->created_by = $userId;
            $order->order_type = $data['order_type'] ?? 'dine_in';
            $order->table_number = $data['table_number'] ?? null;
            $order->customer_name = $data['customer_name'] ?? null;
            $order->customer_phone = $data['customer_phone'] ?? null;
            $order->note = $data['note'] ?? null;
            $order->discount_type = $data['discount_type'] ?? 'fixed';
            $order->discount_value = $data['discount_value'] ?? 0;
            $order->tax_rate = $data['tax_rate'] ?? 15;
            $order->service_charge_rate = $data['service_charge_rate'] ?? 0;
            $order->status = 'pending';
            $order->save();

            // Create order items
            if (isset($data['items'])) {
                foreach ($data['items'] as $item) {
                    $order->items()->create($item);
                }
            }

            // Recalculate totals
            $order->recalculateTotals();

            return $order->fresh(['items', 'branch', 'customer']);
        });
    }

    public function confirmOrder(int $orderId, int $userId): Order
    {
        $order = Order::findOrFail($orderId);

        if (!$order->canBeInvoiced()) {
            throw new \Exception('Order cannot be confirmed');
        }

        $order->update([
            'status' => 'confirmed',
            'updated_by' => $userId,
        ]);

        return $order->fresh();
    }

    public function createInvoiceFromOrder(int $orderId, int $userId): Invoice
    {
        $order = Order::findOrFail($orderId);

        if (!$order->canBeInvoiced()) {
            throw new \Exception('Order cannot be invoiced');
        }

        return DB::transaction(function () use ($order, $userId) {
            // Create invoice
            $invoice = new Invoice();
            $invoice->invoice_number = Invoice::generateInvoiceNumber();
            $invoice->order_id = $order->id;
            $invoice->customer_id = $order->customer_id;
            $invoice->branch_id = $order->branch_id;
            $invoice->created_by = $userId;
            $invoice->subtotal = $order->subtotal;
            $invoice->discount_amount = $order->discount_amount;
            $invoice->tax_amount = $order->tax_amount;
            $invoice->total = $order->total;
            $invoice->status = 'draft';
            $invoice->payment_status = 'pending';
            $invoice->due_date = now()->addDays(30);
            $invoice->save();

            // Create invoice items from order items
            foreach ($order->items as $orderItem) {
                $invoice->items()->create([
                    'item_id' => $orderItem->item_id,
                    'item_name' => $orderItem->item_name,
                    'item_name_ar' => $orderItem->item_name_ar,
                    'quantity' => $orderItem->quantity,
                    'price' => $orderItem->price,
                    'total' => $orderItem->total,
                    'notes' => $orderItem->notes,
                ]);
            }

            // Update order status
            $order->update([
                'status' => 'invoiced',
                'updated_by' => $userId,
            ]);

            return $invoice->fresh(['items', 'order', 'customer', 'branch']);
        });
    }
}
```

---

## 3.2 Invoice Service

**File:** `app/Services/InvoiceService.php`

```php
<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Transaction;
use App\Models\Entry;
use App\Models\Account;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function submitForApproval(int $invoiceId, int $userId): Invoice
    {
        $invoice = Invoice::findOrFail($invoiceId);

        if ($invoice->status !== 'draft') {
            throw new \Exception('Invoice is not in draft status');
        }

        $invoice->update([
            'status' => 'pending_approval',
            'updated_by' => $userId,
        ]);

        return $invoice->fresh();
    }

    public function approveInvoice(int $invoiceId, int $userId): Invoice
    {
        $invoice = Invoice::findOrFail($invoiceId);

        if (!$invoice->canBeApproved()) {
            throw new \Exception('Invoice cannot be approved');
        }

        $invoice->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => now(),
            'updated_by' => $userId,
        ]);

        return $invoice->fresh();
    }

    public function postInvoice(int $invoiceId, int $userId): Invoice
    {
        $invoice = Invoice::findOrFail($invoiceId);

        if (!$invoice->canBePosted()) {
            throw new \Exception('Invoice cannot be posted');
        }

        return DB::transaction(function () use ($invoice, $userId) {
            // Create journal entry
            $transaction = $this->createJournalEntry($invoice, $userId);

            // Update invoice
            $invoice->update([
                'status' => 'posted',
                'posted_by' => $userId,
                'posted_at' => now(),
                'updated_by' => $userId,
            ]);

            return $invoice->fresh(['transaction']);
        });
    }

    private function createJournalEntry(Invoice $invoice, int $userId): Transaction
    {
        // Get accounts
        $arAccount = Account::where('code', '1120')->first(); // Accounts Receivable
        $salesAccount = Account::where('code', '4100')->first(); // Sales Revenue
        $cogsAccount = Account::where('code', '4200')->first(); // Cost of Goods Sold
        $inventoryAccount = Account::where('code', '1200')->first(); // Inventory

        if (!$arAccount || !$salesAccount || !$cogsAccount || !$inventoryAccount) {
            throw new \Exception('Required accounts not found in Chart of Accounts');
        }

        // Create transaction
        $transaction = new Transaction();
        $transaction->transaction_number = Transaction::generateTransactionNumber();
        $transaction->branch_id = $invoice->branch_id;
        $transaction->type = 'sales';
        $transaction->status = 'posted';
        $transaction->total_amount = $invoice->total;
        $transaction->description = "Invoice {$invoice->invoice_number}";
        $transaction->source_type = Invoice::class;
        $transaction->source_id = $invoice->id;
        $transaction->reference_number = $invoice->invoice_number;
        $transaction->user_id = $userId;
        $transaction->created_by = $userId;
        $transaction->posted_at = now();
        $transaction->save();

        // Create entries
        $entries = [
            // Debit: Accounts Receivable
            [
                'account_id' => $arAccount->id,
                'debit' => $invoice->total,
                'credit' => 0,
                'description' => "Invoice {$invoice->invoice_number}",
                'sort_order' => 1,
            ],
            // Credit: Sales Revenue
            [
                'account_id' => $salesAccount->id,
                'debit' => 0,
                'credit' => $invoice->subtotal,
                'description' => "Invoice {$invoice->invoice_number}",
                'sort_order' => 2,
            ],
            // Debit: Cost of Goods Sold
            [
                'account_id' => $cogsAccount->id,
                'debit' => $invoice->subtotal * 0.6, // Assume 60% COGS
                'credit' => 0,
                'description' => "COGS for Invoice {$invoice->invoice_number}",
                'sort_order' => 3,
            ],
            // Credit: Inventory
            [
                'account_id' => $inventoryAccount->id,
                'debit' => 0,
                'credit' => $invoice->subtotal * 0.6,
                'description' => "Inventory reduction for Invoice {$invoice->invoice_number}",
                'sort_order' => 4,
            ],
        ];

        foreach ($entries as $entryData) {
            $transaction->entries()->create(array_merge($entryData, [
                'branch_id' => $invoice->branch_id,
                'created_by' => $userId,
            ]));
        }

        return $transaction;
    }

    public function cancelInvoice(int $invoiceId, int $userId, string $reason = null): Invoice
    {
        $invoice = Invoice::findOrFail($invoiceId);

        if (!$invoice->canBeCancelled()) {
            throw new \Exception('Invoice cannot be cancelled');
        }

        return DB::transaction(function () use ($invoice, $userId, $reason) {
            // Reverse journal entry if posted
            if ($invoice->status === 'posted' && $invoice->transaction) {
                $this->reverseJournalEntry($invoice->transaction, $userId);
            }

            // Update invoice
            $invoice->update([
                'status' => 'cancelled',
                'cancelled_by' => $userId,
                'cancelled_at' => now(),
                'updated_by' => $userId,
            ]);

            return $invoice->fresh();
        });
    }

    private function reverseJournalEntry(Transaction $transaction, int $userId): void
    {
        $reversal = new Transaction();
        $reversal->transaction_number = Transaction::generateTransactionNumber();
        $reversal->branch_id = $transaction->branch_id;
        $reversal->type = $transaction->type;
        $reversal->status = 'posted';
        $reversal->total_amount = $transaction->total_amount;
        $reversal->description = "Reversal of {$transaction->transaction_number}";
        $reversal->source_type = Transaction::class;
        $reversal->source_id = $transaction->id;
        $reversal->reference_number = $transaction->transaction_number;
        $reversal->user_id = $userId;
        $reversal->created_by = $userId;
        $reversal->posted_at = now();
        $reversal->save();

        foreach ($transaction->entries as $entry) {
            $reversal->entries()->create([
                'account_id' => $entry->account_id,
                'branch_id' => $entry->branch_id,
                'description' => "Reversal: {$entry->description}",
                'debit' => $entry->credit,
                'credit' => $entry->debit,
                'sort_order' => $entry->sort_order,
                'created_by' => $userId,
            ]);
        }

        $transaction->reverse($userId);
    }
}
```

---

## 3.3 Payment Service

**File:** `app/Services/PaymentService.php`

```php
<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Invoice;
use App\Models\Transaction;
use App\Models\Entry;
use App\Models\Account;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function createPayment(array $data, int $userId): Payment
    {
        $invoice = Invoice::findOrFail($data['invoice_id']);

        if ($invoice->isPaid()) {
            throw new \Exception('Invoice is already paid');
        }

        if ($data['amount'] > $invoice->balance) {
            throw new \Exception('Payment amount exceeds invoice balance');
        }

        return DB::transaction(function () use ($data, $invoice, $userId) {
            // Create payment
            $payment = new Payment();
            $payment->payment_number = Payment::generatePaymentNumber();
            $payment->invoice_id = $invoice->id;
            $payment->customer_id = $invoice->customer_id;
            $payment->branch_id = $invoice->branch_id;
            $payment->payment_method_id = $data['payment_method_id'];
            $payment->user_id = $userId;
            $payment->created_by = $userId;
            $payment->amount = $data['amount'];
            $payment->payment_date = $data['payment_date'] ?? now();
            $payment->reference_number = $data['reference_number'] ?? null;
            $payment->notes = $data['notes'] ?? null;
            $payment->status = 'completed';
            $payment->save();

            // Create journal entry
            $this->createJournalEntry($payment, $userId);

            // Update invoice payment status
            $this->updateInvoicePaymentStatus($invoice);

            return $payment->fresh(['invoice', 'customer', 'paymentMethod']);
        });
    }

    private function createJournalEntry(Payment $payment, int $userId): Transaction
    {
        // Get accounts
        $cashAccount = Account::where('code', '1110')->first(); // Cash
        $arAccount = Account::where('code', '1120')->first(); // Accounts Receivable

        if (!$cashAccount || !$arAccount) {
            throw new \Exception('Required accounts not found');
        }

        // Create transaction
        $transaction = new Transaction();
        $transaction->transaction_number = Transaction::generateTransactionNumber();
        $transaction->branch_id = $payment->branch_id;
        $transaction->type = 'payment';
        $transaction->status = 'posted';
        $transaction->total_amount = $payment->amount;
        $transaction->description = "Payment {$payment->payment_number} for Invoice {$payment->invoice->invoice_number}";
        $transaction->source_type = Payment::class;
        $transaction->source_id = $payment->id;
        $transaction->reference_number = $payment->payment_number;
        $transaction->user_id = $userId;
        $transaction->created_by = $userId;
        $transaction->posted_at = now();
        $transaction->save();

        // Create entries
        $transaction->entries()->create([
            'account_id' => $cashAccount->id,
            'branch_id' => $payment->branch_id,
            'description' => "Payment {$payment->payment_number}",
            'debit' => $payment->amount,
            'credit' => 0,
            'sort_order' => 1,
            'created_by' => $userId,
        ]);

        $transaction->entries()->create([
            'account_id' => $arAccount->id,
            'branch_id' => $payment->branch_id,
            'description' => "Payment {$payment->payment_number}",
            'debit' => 0,
            'credit' => $payment->amount,
            'sort_order' => 2,
            'created_by' => $userId,
        ]);

        return $transaction;
    }

    private function updateInvoicePaymentStatus(Invoice $invoice): void
    {
        $paidAmount = $invoice->payments()
            ->where('status', 'completed')
            ->sum('amount');

        if ($paidAmount >= $invoice->total) {
            $invoice->update(['payment_status' => 'paid']);
        } elseif ($paidAmount > 0) {
            $invoice->update(['payment_status' => 'partially_paid']);
        }
    }

    public function reconcilePayment(int $paymentId, int $userId): Payment
    {
        $payment = Payment::findOrFail($paymentId);

        if ($payment->isReconciled()) {
            throw new \Exception('Payment is already reconciled');
        }

        $payment->markAsReconciled($userId);

        return $payment->fresh();
    }
}
```

---

## 3.4 Journal Entry Service

**File:** `app/Services/JournalEntryService.php`

```php
<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Entry;
use App\Models\Account;
use Illuminate\Support\Facades\DB;

class JournalEntryService
{
    public function createJournalEntry(array $data, int $userId): Transaction
    {
        return DB::transaction(function () use ($data, $userId) {
            // Create transaction
            $transaction = new Transaction();
            $transaction->transaction_number = Transaction::generateTransactionNumber();
            $transaction->branch_id = $data['branch_id'];
            $transaction->type = $data['type'] ?? 'manual';
            $transaction->status = 'draft';
            $transaction->total_amount = 0;
            $transaction->description = $data['description'] ?? null;
            $transaction->source_type = $data['source_type'] ?? null;
            $transaction->source_id = $data['source_id'] ?? null;
            $transaction->reference_number = $data['reference_number'] ?? null;
            $transaction->user_id = $userId;
            $transaction->created_by = $userId;
            $transaction->save();

            // Create entries
            $totalDebit = 0;
            $totalCredit = 0;

            foreach ($data['entries'] as $index => $entryData) {
                $entry = $transaction->entries()->create([
                    'account_id' => $entryData['account_id'],
                    'branch_id' => $data['branch_id'],
                    'description' => $entryData['description'] ?? null,
                    'debit' => $entryData['debit'] ?? 0,
                    'credit' => $entryData['credit'] ?? 0,
                    'sort_order' => $index + 1,
                    'created_by' => $userId,
                ]);

                $totalDebit += $entry->debit;
                $totalCredit += $entry->credit;
            }

            // Update transaction total
            $transaction->update([
                'total_amount' => max($totalDebit, $totalCredit),
            ]);

            // Validate balance
            if (!$transaction->isBalanced()) {
                throw new \Exception('Journal entry is not balanced');
            }

            return $transaction->fresh(['entries', 'entries.account']);
        });
    }

    public function postTransaction(int $transactionId, int $userId): Transaction
    {
        $transaction = Transaction::findOrFail($transactionId);

        if (!$transaction->isDraft()) {
            throw new \Exception('Transaction is not in draft status');
        }

        if (!$transaction->isBalanced()) {
            throw new \Exception('Transaction is not balanced');
        }

        $transaction->post($userId);

        // Update account balances
        foreach ($transaction->entries as $entry) {
            $account = $entry->account;
            if ($account->normal_balance === 'debit') {
                $account->current_balance += $entry->debit - $entry->credit;
            } else {
                $account->current_balance += $entry->credit - $entry->debit;
            }
            $account->save();
        }

        return $transaction->fresh();
    }
}
```

---

# Phase 4: API Controllers (Days 8-10)

## 4.1 Order Controller

**File:** `app/Http/Controllers/Api/OrderController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Branch;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    public function __construct(
        private OrderService $orderService
    ) {}

    public function index(Request $request)
    {
        $query = Order::with(['branch', 'customer', 'items', 'invoice']);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return response()->json($query->paginate(20));
    }

    public function show(int $id)
    {
        $order = Order::with(['branch', 'customer', 'items', 'tickets', 'invoice'])->findOrFail($id);
        return response()->json($order);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|exists:branches,id',
            'customer_id' => 'nullable|exists:customers,id',
            'order_type' => 'required|in:dine_in,takeaway,delivery',
            'table_number' => 'nullable|integer|min:0',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'note' => 'nullable|string|max:1000',
            'discount_type' => 'required|in:fixed,percent',
            'discount_value' => 'required|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'service_charge_rate' => 'nullable|numeric|min:0|max:100',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|exists:items,id',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.item_name_ar' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.total' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $order = $this->orderService->createOrder($request->all(), $request->user()->id);

        return response()->json($order, 201);
    }

    public function confirm(int $id)
    {
        $order = $this->orderService->confirmOrder($id, auth()->id());
        return response()->json($order);
    }

    public function createInvoice(Request $request, int $id)
    {
        $validator = Validator::make($request->all(), [
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $invoice = $this->orderService->createInvoiceFromOrder($id, auth()->id());

        return response()->json($invoice, 201);
    }
}
```

---

## 4.2 Invoice Controller

**File:** `app/Http/Controllers/Api/InvoiceController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InvoiceController extends Controller
{
    public function __construct(
        private InvoiceService $invoiceService
    ) {}

    public function index(Request $request)
    {
        $query = Invoice::with(['branch', 'customer', 'order', 'payments']);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return response()->json($query->paginate(20));
    }

    public function show(int $id)
    {
        $invoice = Invoice::with(['branch', 'customer', 'order', 'items', 'payments', 'transaction'])->findOrFail($id);
        return response()->json($invoice);
    }

    public function submitForApproval(int $id)
    {
        $invoice = $this->invoiceService->submitForApproval($id, auth()->id());
        return response()->json($invoice);
    }

    public function approve(int $id)
    {
        $invoice = $this->invoiceService->approveInvoice($id, auth()->id());
        return response()->json($invoice);
    }

    public function post(int $id)
    {
        $invoice = $this->invoiceService->postInvoice($id, auth()->id());
        return response()->json($invoice);
    }

    public function cancel(Request $request, int $id)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $invoice = $this->invoiceService->cancelInvoice($id, auth()->id(), $request->reason);
        return response()->json($invoice);
    }
}
```

---

## 4.3 Payment Controller

**File:** `app/Http/Controllers/Api/PaymentController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    public function __construct(
        private PaymentService $paymentService
    ) {}

    public function index(Request $request)
    {
        $query = Payment::with(['branch', 'customer', 'invoice', 'paymentMethod']);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('invoice_id')) {
            $query->where('invoice_id', $request->invoice_id);
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('payment_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('payment_date', '<=', $request->date_to);
        }

        return response()->json($query->paginate(20));
    }

    public function show(int $id)
    {
        $payment = Payment::with(['branch', 'customer', 'invoice', 'paymentMethod', 'transaction'])->findOrFail($id);
        return response()->json($payment);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'invoice_id' => 'required|exists:invoices,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $payment = $this->paymentService->createPayment($request->all(), auth()->id());

        return response()->json($payment, 201);
    }

    public function reconcile(int $id)
    {
        $payment = $this->paymentService->reconcilePayment($id, auth()->id());
        return response()->json($payment);
    }
}
```

---

## 4.4 Journal Entry Controller

**File:** `app/Http/Controllers/Api/JournalEntryController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\JournalEntryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class JournalEntryController extends Controller
{
    public function __construct(
        private JournalEntryService $journalEntryService
    ) {}

    public function index(Request $request)
    {
        $query = Transaction::with(['branch', 'entries', 'entries.account']);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return response()->json($query->paginate(20));
    }

    public function show(int $id)
    {
        $transaction = Transaction::with(['branch', 'entries', 'entries.account', 'source'])->findOrFail($id);
        return response()->json($transaction);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|exists:branches,id',
            'type' => 'required|in:sales,purchase,payment,receipt,manual',
            'description' => 'nullable|string|max:1000',
            'reference_number' => 'nullable|string|max:100',
            'entries' => 'required|array|min:2',
            'entries.*.account_id' => 'required|exists:accounts,id',
            'entries.*.debit' => 'nullable|numeric|min:0',
            'entries.*.credit' => 'nullable|numeric|min:0',
            'entries.*.description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Validate that each entry has either debit or credit
        foreach ($request->entries as $index => $entry) {
            if (($entry['debit'] ?? 0) == 0 && ($entry['credit'] ?? 0) == 0) {
                return response()->json([
                    'errors' => ["Entry {$index} must have either debit or credit amount"]
                ], 422);
            }
        }

        $transaction = $this->journalEntryService->createJournalEntry($request->all(), auth()->id());

        return response()->json($transaction, 201);
    }

    public function post(int $id)
    {
        $transaction = $this->journalEntryService->postTransaction($id, auth()->id());
        return response()->json($transaction);
    }
}
```

---

# Phase 5: Events & Integration (Days 11-12)

## 5.1 Events

**File:** `app/Events/OrderCreated.php`

```php
<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Order $order) {}
}
```

**File:** `app/Events/OrderConfirmed.php`

```php
<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderConfirmed
{
    use Dispatchable, SerializesModels;

    public function __construct(public Order $order) {}
}
```

**File:** `app/Events/InvoiceCreated.php`

```php
<?php

namespace App\Events;

use App\Models\Invoice;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InvoiceCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Invoice $invoice) {}
}
```

**File:** `app/Events/InvoicePosted.php`

```php
<?php

namespace App\Events;

use App\Models\Invoice;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InvoicePosted
{
    use Dispatchable, SerializesModels;

    public function __construct(public Invoice $invoice) {}
}
```

**File:** `app/Events/PaymentReceived.php`

```php
<?php

namespace App\Events;

use App\Models\Payment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PaymentReceived
{
    use Dispatchable, SerializesModels;

    public function __construct(public Payment $payment) {}
}
```

---

## 5.2 Event Listeners

**File:** `app/Listeners/UpdateCustomerBalanceOnPayment.php`

```php
<?php

namespace App\Listeners;

use App\Events\PaymentReceived;
use App\Models\Customer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class UpdateCustomerBalanceOnPayment implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(PaymentReceived $event): void
    {
        $payment = $event->payment;
        $customer = $payment->customer;

        if ($customer) {
            $customer->decrement('balance', $payment->amount);
        }
    }
}
```

**File:** `app/Listeners/SendInvoiceNotification.php`

```php
<?php

namespace App\Listeners;

use App\Events\InvoicePosted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendInvoiceNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(InvoicePosted $event): void
    {
        // TODO: Send notification to customer
        // This is a placeholder for future implementation
    }
}
```

---

## 5.3 Event Service Provider

**File:** `app/Providers/EventServiceProvider.php`

```php
<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        \App\Events\OrderCreated::class => [
            // Add listeners here
        ],
        \App\Events\OrderConfirmed::class => [
            // Add listeners here
        ],
        \App\Events\InvoiceCreated::class => [
            // Add listeners here
        ],
        \App\Events\InvoicePosted::class => [
            \App\Listeners\SendInvoiceNotification::class,
        ],
        \App\Events\PaymentReceived::class => [
            \App\Listeners\UpdateCustomerBalanceOnPayment::class,
        ],
    ];

    public function boot(): void
    {
        //
    }
}
```

---

# Phase 6: API Routes (Days 8-10)

## 6.1 Routes File

**File:** `routes/api.php` (Add these routes)

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\JournalEntryController;

// Orders
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::post('/orders/{id}/confirm', [OrderController::class, 'confirm']);
    Route::post('/orders/{id}/invoice', [OrderController::class, 'createInvoice']);
});

// Invoices
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::post('/invoices/{id}/submit', [InvoiceController::class, 'submitForApproval']);
    Route::post('/invoices/{id}/approve', [InvoiceController::class, 'approve']);
    Route::post('/invoices/{id}/post', [InvoiceController::class, 'post']);
    Route::post('/invoices/{id}/cancel', [InvoiceController::class, 'cancel']);
});

// Payments
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/payments', [PaymentController::class, 'index']);
    Route::get('/payments/{id}', [PaymentController::class, 'show']);
    Route::post('/payments', [PaymentController::class, 'store']);
    Route::post('/payments/{id}/reconcile', [PaymentController::class, 'reconcile']);
});

// Journal Entries
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/journal-entries', [JournalEntryController::class, 'index']);
    Route::get('/journal-entries/{id}', [JournalEntryController::class, 'show']);
    Route::post('/journal-entries', [JournalEntryController::class, 'store']);
    Route::post('/journal-entries/{id}/post', [JournalEntryController::class, 'post']);
});
```

---

# Phase 7: Testing & Documentation (Days 13-14)

## 7.1 Test Plan

### Unit Tests

**File:** `tests/Unit/Services/OrderServiceTest.php`

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class OrderServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_order(): void
    {
        $service = new OrderService();
        $user = \App\Models\User::factory()->create();

        $order = $service->createOrder([
            'branch_id' => 1,
            'order_type' => 'dine_in',
            'table_number' => 5,
            'items' => [
                [
                    'item_id' => 1,
                    'item_name' => 'Test Item',
                    'quantity' => 2,
                    'price' => 10.00,
                    'total' => 20.00,
                ]
            ]
        ], $user->id);

        $this->assertInstanceOf(Order::class, $order);
        $this->assertEquals('pending', $order->status);
        $this->assertNotNull($order->order_number);
    }
}
```

**File:** `tests/Unit/Services/InvoiceServiceTest.php`

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InvoiceServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_approve_invoice(): void
    {
        $service = new InvoiceService();
        $user = \App\Models\User::factory()->create();

        $invoice = Invoice::factory()->create([
            'status' => 'pending_approval'
        ]);

        $approved = $service->approveInvoice($invoice->id, $user->id);

        $this->assertEquals('approved', $approved->status);
        $this->assertNotNull($approved->approved_at);
    }
}
```

**File:** `tests/Unit/Services/PaymentServiceTest.php`

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PaymentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_payment(): void
    {
        $service = new PaymentService();
        $user = \App\Models\User::factory()->create();

        $invoice = \App\Models\Invoice::factory()->create([
            'total' => 100.00,
            'payment_status' => 'pending'
        ]);

        $payment = $service->createPayment([
            'invoice_id' => $invoice->id,
            'payment_method_id' => 1,
            'amount' => 100.00,
        ], $user->id);

        $this->assertInstanceOf(Payment::class, $payment);
        $this->assertEquals(100.00, $payment->amount);
    }
}
```

---

## 7.2 Integration Tests

**File:** `tests/Integration/FinancialCycleTest.php`

```php
<?php

namespace Tests\Integration;

use Tests\TestCase;
use App\Models\{
    Order, Invoice, Payment, Transaction, Entry, Account
};
use Illuminate\Foundation\Testing\RefreshDatabase;

class FinancialCycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_financial_cycle(): void
    {
        $user = \App\Models\User::factory()->create();
        $branch = \App\Models\Branch::factory()->create();
        $customer = \App\Models\Customer::factory()->create();
        $item = \App\Models\Item::factory()->create();

        // Step 1: Create Order
        $order = \App\Models\Order::create([
            'order_number' => \App\Models\Order::generateOrderNumber(),
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'cashier_id' => $user->id,
            'created_by' => $user->id,
            'order_type' => 'dine_in',
            'status' => 'pending',
            'subtotal' => 100.00,
            'discount_amount' => 0,
            'tax_amount' => 15.00,
            'total' => 115.00,
        ]);

        $this->assertNotNull($order);

        // Step 2: Confirm Order
        $order->update(['status' => 'confirmed']);
        $this->assertEquals('confirmed', $order->status);

        // Step 3: Create Invoice
        $invoice = \App\Models\Invoice::create([
            'invoice_number' => \App\Models\Invoice::generateInvoiceNumber(),
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'created_by' => $user->id,
            'subtotal' => 100.00,
            'discount_amount' => 0,
            'tax_amount' => 15.00,
            'total' => 115.00,
            'status' => 'draft',
            'payment_status' => 'pending',
        ]);

        $this->assertNotNull($invoice);

        // Step 4: Approve Invoice
        $invoice->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        $this->assertEquals('approved', $invoice->status);

        // Step 5: Post Invoice (creates journal entry)
        $arAccount = Account::create([
            'code' => '1120',
            'name' => 'Accounts Receivable',
            'type' => 'asset',
            'is_active' => true,
        ]);

        $salesAccount = Account::create([
            'code' => '4100',
            'name' => 'Sales Revenue',
            'type' => 'revenue',
            'is_active' => true,
        ]);

        $transaction = \App\Models\Transaction::create([
            'transaction_number' => \App\Models\Transaction::generateTransactionNumber(),
            'branch_id' => $branch->id,
            'type' => 'sales',
            'status' => 'posted',
            'total_amount' => 115.00,
            'description' => "Invoice {$invoice->invoice_number}",
            'source_type' => Invoice::class,
            'source_id' => $invoice->id,
            'reference_number' => $invoice->invoice_number,
            'user_id' => $user->id,
            'created_by' => $user->id,
            'posted_at' => now(),
        ]);

        // Create entries
        $transaction->entries()->create([
            'account_id' => $arAccount->id,
            'branch_id' => $branch->id,
            'debit' => 115.00,
            'credit' => 0,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $transaction->entries()->create([
            'account_id' => $salesAccount->id,
            'branch_id' => $branch->id,
            'debit' => 0,
            'credit' => 115.00,
            'sort_order' => 2,
            'created_by' => $user->id,
        ]);

        $this->assertTrue($transaction->isBalanced());

        $invoice->update([
            'status' => 'posted',
            'posted_by' => $user->id,
            'posted_at' => now(),
        ]);

        $this->assertEquals('posted', $invoice->status);

        // Step 6: Create Payment
        $payment = \App\Models\Payment::create([
            'payment_number' => \App\Models\Payment::generatePaymentNumber(),
            'invoice_id' => $invoice->id,
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'payment_method_id' => 1,
            'user_id' => $user->id,
            'created_by' => $user->id,
            'amount' => 115.00,
            'payment_date' => now(),
            'status' => 'completed',
        ]);

        $this->assertNotNull($payment);

        // Step 7: Create Payment Journal Entry
        $cashAccount = Account::create([
            'code' => '1110',
            'name' => 'Cash',
            'type' => 'asset',
            'is_active' => true,
        ]);

        $paymentTransaction = \App\Models\Transaction::create([
            'transaction_number' => \App\Models\Transaction::generateTransactionNumber(),
            'branch_id' => $branch->id,
            'type' => 'payment',
            'status' => 'posted',
            'total_amount' => 115.00,
            'description' => "Payment {$payment->payment_number}",
            'source_type' => Payment::class,
            'source_id' => $payment->id,
            'reference_number' => $payment->payment_number,
            'user_id' => $user->id,
            'created_by' => $user->id,
            'posted_at' => now(),
        ]);

        $paymentTransaction->entries()->create([
            'account_id' => $cashAccount->id,
            'branch_id' => $branch->id,
            'debit' => 115.00,
            'credit' => 0,
            'sort_order' => 1,
            'created_by' => $user->id,
        ]);

        $paymentTransaction->entries()->create([
            'account_id' => $arAccount->id,
            'branch_id' => $branch->id,
            'debit' => 0,
            'credit' => 115.00,
            'sort_order' => 2,
            'created_by' => $user->id,
        ]);

        $this->assertTrue($paymentTransaction->isBalanced());

        // Update invoice payment status
        $invoice->update(['payment_status' => 'paid']);

        $this->assertEquals('paid', $invoice->payment_status);

        // Verify complete cycle
        $this->assertEquals('confirmed', $order->status);
        $this->assertEquals('posted', $invoice->status);
        $this->assertEquals('paid', $invoice->payment_status);
        $this->assertNotNull($payment->transaction);
    }
}
```

---

## 7.3 Seeder for Testing

**File:** `database/seeders/FinancialCycleSeeder.php`

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Item;
use App\Models\Account;
use App\Models\PaymentMethod;

class FinancialCycleSeeder extends Seeder
{
    public function run(): void
    {
        // Create user
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Create branch
        $branch = Branch::factory()->create([
            'name' => 'Main Branch',
            'name_ar' => 'الفرع الرئيسي',
        ]);

        // Create customer
        $customer = Customer::factory()->create([
            'name' => 'Test Customer',
            'phone' => '0501234567',
        ]);

        // Create item
        $item = Item::factory()->create([
            'name' => 'Test Item',
            'name_ar' => 'منتج تجريبي',
            'price' => 50.00,
        ]);

        // Create payment methods
        PaymentMethod::create([
            'name' => 'Cash',
            'name_ar' => 'نقدي',
            'is_active' => true,
        ]);

        PaymentMethod::create([
            'name' => 'Credit Card',
            'name_ar' => 'بطاقة ائتمان',
            'is_active' => true,
        ]);

        // Create Chart of Accounts
        Account::create([
            'code' => '1110',
            'name' => 'Cash',
            'name_ar' => 'نقدي',
            'type' => 'asset',
            'is_active' => true,
        ]);

        Account::create([
            'code' => '1120',
            'name' => 'Accounts Receivable',
            'name_ar' => 'ذمم مدينة',
            'type' => 'asset',
            'is_active' => true,
        ]);

        Account::create([
            'code' => '1200',
            'name' => 'Inventory',
            'name_ar' => 'مخزون',
            'type' => 'asset',
            'is_active' => true,
        ]);

        Account::create([
            'code' => '4100',
            'name' => 'Sales Revenue',
            'name_ar' => 'إيرادات المبيعات',
            'type' => 'revenue',
            'is_active' => true,
        ]);

        Account::create([
            'code' => '4200',
            'name' => 'Cost of Goods Sold',
            'name_ar' => 'تكلفة البضاعة المباعة',
            'type' => 'expense',
            'is_active' => true,
        ]);
    }
}
```

---

# Implementation Checklist

## Week 1 Checklist

- [ ] Execute all 15 migrations
- [ ] Update Order model
- [ ] Update Invoice model
- [ ] Update Payment model
- [ ] Update Transaction model
- [ ] Update Entry model
- [ ] Create OrderService
- [ ] Create InvoiceService
- [ ] Create PaymentService
- [ ] Create JournalEntryService

## Week 2 Checklist

- [ ] Create OrderController
- [ ] Create InvoiceController
- [ ] Create PaymentController
- [ ] Create JournalEntryController
- [ ] Add API routes
- [ ] Create Events (5 events)
- [ ] Create Event Listeners (2 listeners)
- [ ] Register events in EventServiceProvider
- [ ] Write unit tests (3 test files)
- [ ] Write integration test (1 test file)
- [ ] Create FinancialCycleSeeder
- [ ] Run all tests
- [ ] Test complete financial cycle manually
- [ ] Document API endpoints

---

# Success Criteria

Sprint 1 is complete when:

1. ✅ All migrations executed successfully
2. ✅ All models updated with timestamps and relationships
3. ✅ All services implemented and tested
4. ✅ All API endpoints functional
5. ✅ Complete financial cycle works: POS → Order → Invoice → Payment → Journal Entry
6. ✅ All tests passing
7. ✅ Manual testing successful

---

# Next Steps After Sprint 1

1. Implement audit trail (Sprint 2)
2. Add approval workflows (Sprint 2)
3. Implement credit notes (Sprint 3)
4. Add refund processing (Sprint 3)
5. Implement financial reports (Sprint 4)

---

**Document Status:** FINAL  
**Sprint Start:** 2026-06-24  
**Sprint End:** 2026-07-08  
**Owner:** Development Team
