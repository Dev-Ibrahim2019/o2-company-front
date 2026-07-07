# STATEMENT CUSTOMER/SUPPLIER PARITY AUDIT

> **تاريخ التقرير:** 2026-07-06  
> **الهدف:** تحليل كشف حساب الموظفين الحالي ومقارنته مع حسابات العملاء والموردين لتحديد الفجوات وخطة التنفيذ  
> **ملاحظة:** تحليل فقط — لا تعديلات

---

## 1. Employee Statement Current Architecture

### 1.1 Frontend Architecture

| المكون | الملف | الوصف |
|--------|-------|-------|
| **EmployeeStatement** | `src/components/administration/GL/EmployeeStatement.tsx` | المكون الرئيسي — يدعم entityType: employee/customer/supplier |
| **AccountStatementModal** | `src/components/administration/GL/AccountStatementModal.tsx` | الغلاف (Modal) الذي يستدعي EmployeeStatement |
| **InvoiceDrawer** | `src/components/administration/GL/InvoiceDrawer.tsx` | Sidebar/Drawer لتفاصيل الفاتورة (9 تبويبات) |
| **InvoiceDetailsDrawer** | `src/components/administration/GL/InvoiceDetailsDrawer.tsx` | Drawer قديم يعتمد على orderId (لم يعد مستخدماً) |
| **FinancialStatementTable** | `src/components/administration/shared/FinancialStatementTable.tsx` | جدول مشترك (غير مستخدم حالياً) |
| **useAccountStatement** | `src/hooks/useAccountStatement.ts` | Hook موحد لجلب البيانات لجميع الكيانات |
| **financeService** | `src/services/financeService.ts` | Service موحد مع دوال لكل كيان |
| **invoiceDetailsService** | `src/services/invoiceDetailsService.ts` | Service لتفاصيل الفاتورة (9 endpoints) |

### 1.2 Props التي يستقبلها EmployeeStatement

```typescript
interface EmployeeStatementProps {
    entityType?: "employee" | "customer" | "supplier";  // يدعم الثلاثة
    entityId?: number;
    entityName?: string;
    employeeId?: number;   // backward compatibility
    employeeName?: string; // backward compatibility
}
```

### 1.3 تحميل البيانات

- **Hook:** `useAccountStatement(entityType, entityId, fromDate, toDate, statementType, extraFilters)`
- **Service calls:**
  - `financeService.getEmployeeStatement(id, filters)` → `/api/employees/{id}/account-statement`
  - `financeService.getCustomerStatement(id, from, to, filters)` → `/api/customers/{id}/statement`
  - `financeService.getSupplierStatement(id, from, to, filters)` → `/api/suppliers/{id}/statement`
- **Response structure يختلف بين الكيانات:**
  - **Employee:** `{ accounts: { advance, salary, loan, sales }, all_lines, totals, outstanding_advance, ... }`
  - **Customer/Supplier:** `{ customer/supplier: {...}, balance, period, statement: { lines, closing_balance, opening_balance, ... } }`

### 1.4 ViewMode

- **simple:** جدول بدون تفاصيل المنتجات، بدون expand
- **detailed:** جدول مع إمكانية expand لكل حركة لعرض المنتجات والخصومات والمدفوعات

### 1.5 الفلاتر

- **Date range:** fromDate / toDate
- **Movement type:** select dropdown مع خيارات حسب entityType
- **Search:** بحث نصي
- **Amount range:** from / to
- **View mode toggle:** simple / detailed

### 1.6 عرض السطور

- جدول رئيسي في `StatementTable` component
- أعمدة: التاريخ، رقم القيد، رقم المستند، نوع الحركة، البيان، مدين، دائن، الرصيد، الفرع، الحالة
- صف الرصيد الافتتاحي (أزرق)
- صف الرصيد الختامي (أخضر)
- صف إجمالي الفترة (تذييل)
- **simple mode:** click يفتح InvoiceDrawer مباشرة
- **detailed mode:** click يوسع الصف لعرض RowDetailPanel (منتجات، خصومات، مدفوعات)

### 1.7 عرض تفاصيل الفاتورة

- **InvoiceDrawer** — Slide-over drawer من اليمين بعرض 900px
- 9 تبويبات: نظرة عامة، المنتجات، المدفوعات، المحاسبة، الخصومات، المخزون، الجدول الزمني، المرفقات، الملاحظات
- كل تبويب يستدعي API منفصل من `invoiceDetailsService`
- يعتمد على `invoiceId` (رقم الفاتورة في جدول invoices)

### 1.8 أزرار التصدير

- **PDF بسيط:** `handleDownloadPdf("simple")`
- **PDF مفصل:** `handleDownloadPdf("detailed")`
- **Excel:** `handleExport("excel")`
- **طباعة:** `window.print()`
- **تحديث:** `refetch()`

---

## 2. Employee Invoice Drawer Analysis

### 2.1 InvoiceDrawer Component

| الخاصية | القيمة |
|---------|--------|
| **Component** | `InvoiceDrawer` |
| **File** | `src/components/administration/GL/InvoiceDrawer.tsx` |
| **Type** | Slide-over drawer (framer-motion, x: "100%" → 0) |
| **العرض** | `min(900px, 100vw)` |
| **الخلفية** | Overlay أسود `bg-black/70 backdrop-blur-sm` |
| **الإغلاق** | ESC key, click outside, زر X |
| **التنقل** | أزرار السابق/التالي مع keyboard arrows |

### 2.2 State & Opening

| الخاصية | القيمة |
|---------|--------|
| **State** | `selectedInvoiceId: number \| null` في EmployeeStatement |
| **Trigger** | `handleOpenInvoice(entry)` — يستخرج invoice_id من entry |
| **Required Fields** | `invoiceId` (number) |
| **API Used** | `invoiceDetailsService.getDetails(invoiceId)` للـ overview |
| **Tabs APIs** | `getProducts`, `getPayments`, `getAccounting`, `getDiscounts`, `getInventory`, `getTimeline`, `getAttachments`, `getNotes` |

### 2.3 Can Reuse for Customer/Supplier?

| السؤال | الإجابة |
|--------|---------|
| هل يعتمد على entityType؟ | **لا** — يعتمد فقط على `invoiceId` |
| هل invoiceId موجود للعملاء/الموردين؟ | **نعم** — الفواتير مخزنة في جدول invoices مع order/customer relation |
| هل يحتاج تعديل؟ | **لا** — يمكن إعادة استخدامه كما هو |
| هل الـ APIs تدعم العملاء/الموردين؟ | **نعم** — invoiceDetailsService يستخدم `/invoices/{id}/...` وهو عام |

### 2.4 Required Fields for InvoiceDrawer to Work

| الحقل | المصدر | موجود للعميل؟ | موجود للمورد؟ |
|-------|--------|--------------|--------------|
| `invoice_id` | من `entry.invoice_id` أو `entry.document_id` | نعم (إذا كان هناك فاتورة) | نعم (إذا كان هناك فاتورة) |
| `source_id` (order_id) | من `entry.source_id` | نعم (إذا source_type = Order) | لا (المشتريات قد لا يكون لها order_id) |
| `invoiceDetailsService` | API عام | نعم | نعم |

---

## 3. Employee PDF Generation Analysis

### 3.1 Backend PDF Architecture

| الخاصية | القيمة |
|---------|--------|
| **Controller** | `EmployeeFinancialController::accountStatementPdf()` |
| **Library** | **mPDF** (`Mpdf\Mpdf`) |
| **RTL Setup** | `'mode' => 'ar'`, `autoLangToFont => true`, `autoArabic => true` |
| **Fonts** | `DejaVu Sans` (مضمنة في mPDF) |
| **Blade Template** | `resources/views/pdf/employee-statement.blade.php` |
| **Style** | يدعم `pdf_style: "simple" | "detailed"` |

### 3.2 PDF Data Flow

```
Request → accountStatementPdf()
  → accountStatement() (يعيد استخدام نفس المنطق)
  → EmployeeStatementService::build()
  → SubledgerService::getStatement() (لكل حساب)
  → StatementClassifier::classifyLine() (تصنيف)
  → StatementClassifier::computeRunningBalances() (حساب الرصيد)
  → Enrichment (للمنتجات، الخصومات، المدفوعات، القيود)
  → view('pdf.employee-statement', [...]) → mPDF → response
```

### 3.3 PDF Features

| الميزة | Simple | Detailed |
|--------|--------|----------|
| عرض الحركات | ✅ جدول بسيط | ✅ جدول مع تفاصيل |
| عرض المنتجات | ❌ | ✅ inline items |
| عرض الخصومات | ❌ | ✅ summary row |
| عرض المدفوعات | ❌ | ❌ (فقط في InvoiceDrawer) |
| عرض القيود المحاسبية | ❌ | ❌ (فقط في InvoiceDrawer) |
| Running balance | ✅ | ✅ |
| الرصيد الافتتاحي/الختامي | ✅ | ✅ |
| Header/Footer | ✅ | ✅ |
| Arabic RTL | ✅ | ✅ |

### 3.4 PDF Input Parameters

| المعامل | الوصف |
|---------|-------|
| `from` | تاريخ البداية |
| `to` | تاريخ النهاية |
| `type` | نوع الحركة (all, sales, advance, ...) |
| `pdf_style` | simple / detailed |
| `employee` | Eloquent model (route model binding) |

### 3.5 Data Prepared for Blade

| المتغير | المصدر |
|---------|--------|
| `$employeeName` | `$data['data']['employee']['name']` |
| `$employeeId` | `$data['data']['employee']['id']` |
| `$fromDate`, `$toDate` | من request |
| `$statementTypeLabel` | من type labels map |
| `$entries` | `$data['data']['all_lines']` (مثراة بالمنتجات والمدفوعات) |
| `$openingBalance` | `$data['data']['totals']['opening_balance']` |
| `$closingBalance` | `$data['data']['totals']['closing_balance']` |
| `$totalDebit`, `$totalCredit` | `$data['data']['totals']` |
| `$pdfStyle` | simple / detailed |
| `$companyName`, `$companyLocation`, `$currency` | ثوابت في controller |
| `$printedBy`, `$printedAt` | من user/timestamp |

### 3.6 Running Balance

- **يُحسب في Backend** عبر `StatementClassifier::computeRunningBalances()`
- يتم تمريره إلى الـ Blade كـ `$entry['running_balance']`
- في simple mode: يُحسب لكل حركة
- في detailed mode: يُحسب لكل حركة مع الأخذ بالاعتبار تفاصيل المنتجات

---

## 4. Employee Export Analysis

### 4.1 Export Endpoints

| التنسيق | Endpoint | Controller Method |
|---------|----------|-------------------|
| **CSV** | `GET /api/employees/{id}/account-statement/export?format=csv` | `accountStatementExport()` |
| **Excel (XML)** | `GET /api/employees/{id}/account-statement/export?format=excel` | `accountStatementExport()` |
| **PDF** | `GET /api/employees/{id}/account-statement/pdf` | `accountStatementPdf()` |

### 4.2 Export Service

- **Service:** `StatementExportService`
- **CSV:** `exportCsv()` — Streamed response مع BOM UTF-8
- **Excel:** `exportExcelXml()` — Spreadsheet XML مع 4 أوراق عمل:
  1. **Summary** — ملخص (الرصيد الافتتاحي/الختامي، الإجماليات)
  2. **Transactions** — كل الحركات
  3. **Products** — تفاصيل المنتجات لكل حركة
  4. **Discounts** — تفاصيل الخصومات لكل منتج

### 4.3 Frontend Export Flow

```typescript
// EmployeeStatement.tsx lines 595-638
handleDownloadPdf(style) → financeService.getEmployeeStatementPdf(id, from, to, type, style)
handleExport(format) → financeService.exportEmployeeStatement(id, filters, format)
```

---

## 5. Customer Statement Current Architecture

### 5.1 Frontend

| المكون | الحالة | التفاصيل |
|--------|--------|----------|
| **EmployeeStatement** | ✅ مستخدم | يُمرر `entityType="customer"` |
| **AccountStatementModal** | ✅ مستخدم | يُمرر entityType للـ EmployeeStatement |
| **useAccountStatement** | ✅ مستخدم | يستدعي `financeService.getCustomerStatement()` |
| **InvoiceDrawer** | ✅ يمكن استخدامه | يعتمد على invoiceId فقط |
| **Export buttons** | ✅ موجودة | تستدعي `getCustomerStatementPdf()` و `exportCustomerStatement()` |

### 5.2 Backend

| المكون | الحالة | التفاصيل |
|--------|--------|----------|
| **CustomerFinancialController** | ✅ موجود | فيه `statement()`, `statementExport()`, `statementPdf()` routes |
| **statement()** | ✅ موجود | يستدعي `CustomerAccountingService::getStatement()` → `SubledgerService::getFullStatement()` |
| **statementExport()** | ⚠️ **غير مطبق** | الـ route موجود لكن الـ method غير موجود في الـ Controller |
| **statementPdf()** | ⚠️ **غير مطبق** | الـ route موجود لكن الـ method غير موجود في الـ Controller |
| **CustomerAccountingService** | ✅ موجود | فيه `getStatement()` → `SubledgerService::getFullStatement('customer', ...)` |
| **SubledgerService::getFullStatement()** | ✅ موجود | يدعم `'customer'` type |

### 5.3 Response Structure (Customer)

```json
{
  "success": true,
  "data": {
    "customer": { "id": 1, "name": "...", "code": "..." },
    "balance": 5000.00,
    "period": { "from": "2026-01-01", "to": "2026-12-31" },
    "statement": {
      "subledger": { "type": "customer", "id": 1 },
      "opening_balance": 0,
      "closing_balance": 5000.00,
      "total_debit": 10000.00,
      "total_credit": 5000.00,
      "lines": [...],
      "accounts": [...]
    }
  }
}
```

### 5.4 Key Differences from Employee

| الميزة | Employee | Customer |
|--------|----------|----------|
| **Response structure** | `accounts: { advance, salary, loan, sales }` + `all_lines` | `statement: { lines, opening_balance, closing_balance }` |
| **Movement classification** | ✅ عبر `StatementClassifier` | ❌ **لا يوجد** — يستخدم `getFullStatement()` مباشرة |
| **Simple/Detailed mode** | ✅ مدعوم | ❌ **غير مدعوم** — لا `mode` parameter |
| **Items (products)** | ✅ في detailed mode | ❌ **غير مدعوم** — `getFullStatement()` لا يجلب items |
| **Invoice details** | ✅ عبر InvoiceDrawer | ✅ يمكن استخدام InvoiceDrawer (نفس invoiceId) |
| **PDF** | ✅ mPDF + Blade | ⚠️ **route موجود لكن method غير مطبق** |
| **Export CSV/Excel** | ✅ عبر StatementExportService | ⚠️ **route موجود لكن method غير مطبق** |
| **Running balance** | ✅ محسوب | ✅ محسوب (في `getFullStatement()`) |
| **Movement type filter** | ✅ 8 أنواع | ❌ **غير مدعوم** — لا `type` parameter |
| **Employee-specific fields** | outstanding_advance, loan, salary | ❌ غير مطلوبة |

---

## 6. Supplier Statement Current Architecture

### 6.1 Frontend

| المكون | الحالة | التفاصيل |
|--------|--------|----------|
| **EmployeeStatement** | ✅ مستخدم | يُمرر `entityType="supplier"` |
| **AccountStatementModal** | ✅ مستخدم | يُمرر entityType للـ EmployeeStatement |
| **useAccountStatement** | ✅ مستخدم | يستدعي `financeService.getSupplierStatement()` |
| **InvoiceDrawer** | ⚠️ محدود | الموردين ليس لديهم invoices (لديهم bills/purchase orders) |
| **Export buttons** | ✅ موجودة | تستدعي `getSupplierStatementPdf()` و `exportSupplierStatement()` |

### 6.2 Backend

| المكون | الحالة | التفاصيل |
|--------|--------|----------|
| **SupplierFinancialController** | ✅ موجود | فيه `statement()`, `statementExport()`, `statementPdf()` routes |
| **statement()** | ✅ موجود | يستدعي `SupplierAccountingService::getStatement()` → `SubledgerService::getFullStatement()` |
| **statementExport()** | ⚠️ **غير مطبق** | الـ route موجود لكن الـ method غير موجود |
| **statementPdf()** | ⚠️ **غير مطبق** | الـ route موجود لكن الـ method غير موجود |
| **SupplierAccountingService** | ✅ موجود | فيه `getStatement()` → `SubledgerService::getFullStatement('supplier', ...)` |
| **SubledgerService::getFullStatement()** | ✅ موجود | يدعم `'supplier'` type |

### 6.3 Response Structure (Supplier)

نفس بنية Customer مع `supplier` بدلاً من `customer`.

### 6.4 Key Differences from Employee

نفس فجوات Customer مع إضافة:
- **لا يوجد مفهوم "فاتورة مبيعات" للمورد** — المورد لديه "فواتير شراء" (bills)
- **InvoiceDrawer** قد لا يعمل للمورد لأن `source_type` قد يكون `PurchaseOrder` وليس `Order`
- **المنتجات** للمشتريات قد تكون مختلفة (purchase items vs sales items)

---

## 7. Feature Gap Matrix

| # | الميزة | Employee | Customer | Supplier | Gap | How to Implement |
|---|--------|----------|----------|----------|-----|------------------|
| 1 | **Same UI** | ✅ | ✅ (مستخدم) | ✅ (مستخدم) | ✅ لا فجوة | EmployeeStatement يدعم entityType |
| 2 | **Simple mode** | ✅ | ❌ | ❌ | **حرج** | إضافة `mode` parameter لـ `getFullStatement()` |
| 3 | **Detailed mode** | ✅ | ❌ | ❌ | **حرج** | إضافة items/products للـ `getFullStatement()` |
| 4 | **Movement filters** | ✅ (8 أنواع) | ❌ | ❌ | **حرج** | إضافة `StatementClassifier::classifyLine()` للعملاء/الموردين |
| 5 | **Invoice details** | ✅ (Drawer) | ✅ (نفس Drawer) | ⚠️ (bills) | **متوسط** | إنشاء BillDrawer للمورد أو تعميم InvoiceDrawer |
| 6 | **Sidebar/Drawer** | ✅ InvoiceDrawer | ✅ يمكن استخدامه | ⚠️ يحتاج تعديل | **متوسط** | إضافة entityType للـ Drawer |
| 7 | **Products** | ✅ (detailed) | ❌ | ❌ | **حرج** | إضافة items لـ `getFullStatement()` response |
| 8 | **Discounts** | ✅ (detailed) | ❌ | ❌ | **منخفض** | إضافة discount info للـ items |
| 9 | **Payments** | ✅ (Drawer) | ❌ (في statement) | ❌ (في statement) | **متوسط** | إضافة payments_data للـ lines |
| 10 | **Journal entries** | ✅ (Drawer) | ❌ | ❌ | **منخفض** | إضافة journal_entries للـ lines |
| 11 | **PDF simple** | ✅ | ⚠️ route فقط | ⚠️ route فقط | **حرج** | تنفيذ `statementPdf()` في Customer/Supplier Controllers |
| 12 | **PDF detailed** | ✅ | ⚠️ route فقط | ⚠️ route فقط | **حرج** | تنفيذ `statementPdf()` مع دعم detailed |
| 13 | **Excel** | ✅ (4 sheets) | ⚠️ route فقط | ⚠️ route فقط | **حرج** | تنفيذ `statementExport()` في Customer/Supplier Controllers |
| 14 | **CSV** | ✅ | ⚠️ route فقط | ⚠️ route فقط | **حرج** | تنفيذ `statementExport()` مع دعم CSV |
| 15 | **Running balance** | ✅ (Backend) | ✅ (Backend) | ✅ (Backend) | ✅ لا فجوة | موجود في `getFullStatement()` |
| 16 | **Movement classification** | ✅ (StatementClassifier) | ❌ | ❌ | **حرج** | تطبيق `StatementClassifier::classifyLine()` على customer/supplier lines |
| 17 | **Export buttons** | ✅ (PDF/Excel/CSV) | ✅ (لكن backend ناقص) | ✅ (لكن backend ناقص) | **حرج** | تنفيذ backend methods |
| 18 | **Arabic RTL** | ✅ | ✅ | ✅ | ✅ لا فجوة | UI يدعم RTL |
| 19 | **mPDF support** | ✅ | ⚠️ غير مطبق | ⚠️ غير مطبق | **حرج** | إعادة استخدام mPDF logic |
| 20 | **Blade template** | ✅ employee-statement.blade.php | ❌ | ❌ | **حرج** | إنشاء قالب موحد أو إعادة استخدام الموجود |

---

## 8. Reuse Feasibility

### 8.1 Frontend Reuse

| المكون | إعادة الاستخدام | التعديلات المطلوبة |
|--------|----------------|-------------------|
| **EmployeeStatement** | ✅ **كامل** — يدعم entityType بالفعل | لا تعديلات — فقط تأكد من أن البيانات تصل بشكل صحيح |
| **AccountStatementModal** | ✅ **كامل** | لا تعديلات |
| **InvoiceDrawer** | ✅ **كامل** للعملاء | لا تعديلات — يعتمد على invoiceId |
| **InvoiceDrawer** | ⚠️ **جزئي** للموردين | قد يحتاج BillDrawer منفصل أو إضافة entityType |
| **useAccountStatement** | ✅ **كامل** | لا تعديلات — يدعم الكيانات الثلاثة |
| **financeService** | ✅ **كامل** | لا تعديلات — جميع الدوال موجودة |
| **StatementTable** | ✅ **كامل** | لا تعديلات — يستقبل entries array |
| **RowDetailPanel** | ✅ **كامل** | لا تعديلات — يعرض items من entry |
| **SummaryBar** | ✅ **كامل** | لا تعديلات — يدعم entityType |

### 8.2 Backend Reuse

| المكون | إعادة الاستخدام | التعديلات المطلوبة |
|--------|----------------|-------------------|
| **EmployeeStatementService** | ⚠️ **جزئي** | خاص بالموظفين (buildSalesLines, getEmployeeBalances) |
| **SubledgerService::getFullStatement()** | ✅ **كامل** | يدعم customer/supplier — لكن ينقصه items و movement classification |
| **StatementClassifier** | ✅ **كامل** | يمكن استخدامه لتصنيف حركات العملاء/الموردين |
| **StatementExportService** | ✅ **كامل** | يمكن إعادة استخدامه كما هو |
| **employee-statement.blade.php** | ⚠️ **جزئي** | يمكن تعميمه ليصبح `statement.blade.php` مع entity name |
| **mPDF logic** | ✅ **كامل** | يمكن إعادة استخدامه في Customer/Supplier Controllers |

### 8.3 What Can Be Reused Without Changes

1. **EmployeeStatement.tsx** — يدعم entityType بالفعل
2. **AccountStatementModal.tsx** — wrapper بسيط
3. **InvoiceDrawer.tsx** — يعتمد على invoiceId فقط
4. **useAccountStatement.ts** — يدعم الكيانات الثلاثة
5. **financeService.ts** — جميع دوال customer/supplier موجودة
6. **StatementClassifier.php** — محرك تصنيف عام
7. **StatementExportService.php** — خدمة تصدير عامة
8. **SubledgerService.php::getFullStatement()** — يدعم الكيانات الثلاثة

### 8.4 What Needs Modification

1. **CustomerFinancialController.php** — إضافة `statementPdf()`, `statementExport()`
2. **SupplierFinancialController.php** — إضافة `statementPdf()`, `statementExport()`
3. **employee-statement.blade.php** — تعميم ليصبح `statement.blade.php`
4. **SubledgerService.php::getFullStatement()** — إضافة items/products و movement classification

---

## 9. Minimal Implementation Plan

### Phase 1: Backend — Customer/Supplier PDF & Export (حرج)

**الهدف:** تشغيل PDF و Excel للعملاء والموردين

| الخطوة | الملف | التعديل |
|--------|-------|---------|
| 1 | `CustomerFinancialController.php` | إضافة `statementPdf()` — نسخ من EmployeeFinancialController::accountStatementPdf() مع تعديل بسيط |
| 2 | `CustomerFinancialController.php` | إضافة `statementExport()` — نسخ من EmployeeFinancialController::accountStatementExport() |
| 3 | `SupplierFinancialController.php` | إضافة `statementPdf()` — نفس المنطق |
| 4 | `SupplierFinancialController.php` | إضافة `statementExport()` — نفس المنطق |
| 5 | `employee-statement.blade.php` | تعميم القالب: تغيير `$employeeName` → `$entityName`، `$employeeId` → `$entityId` |
| 6 | `routes/api.php` | ✅ routes موجودة بالفعل — لا تعديل |

### Phase 2: Backend — Movement Classification & Items (حرج)

**الهدف:** جعل كشف حساب العملاء/الموردين يدعم simple/detailed mode مع تصنيف الحركات

| الخطوة | الملف | التعديل |
|--------|-------|---------|
| 7 | `SubledgerService.php::getFullStatement()` | إضافة `mode` parameter (simple/detailed) |
| 8 | `SubledgerService.php::getFullStatement()` | تطبيق `StatementClassifier::classifyLine()` على كل line |
| 9 | `SubledgerService.php::getFullStatement()` | إضافة items/products للـ lines في detailed mode (جلب من invoices/orders) |
| 10 | `CustomerAccountingService.php::getStatement()` | تمرير `mode` parameter |
| 11 | `SupplierAccountingService.php::getStatement()` | تمرير `mode` parameter |
| 12 | `CustomerFinancialController.php::statement()` | إضافة `mode` validation وقبول `type` parameter |
| 13 | `SupplierFinancialController.php::statement()` | إضافة `mode` validation وقبول `type` parameter |

### Phase 3: Frontend — Verify & Test (متوسط)

**الهدف:** التأكد من أن UI يعمل مع البيانات الجديدة

| الخطوة | الملف | التعديل |
|--------|-------|---------|
| 14 | `useAccountStatement.ts` | ✅ لا تعديل — يدعم customer/supplier بالفعل |
| 15 | `EmployeeStatement.tsx` | ✅ لا تعديل — يدعم entityType بالفعل |
| 16 | `financeService.ts` | ✅ لا تعديل — جميع الدوال موجودة |
| 17 | اختبار PDF للعميل | اختبار يدوي |
| 18 | اختبار PDF للمورد | اختبار يدوي |
| 19 | اختبار Excel للعميل | اختبار يدوي |
| 20 | اختبار Excel للمورد | اختبار يدوي |

### Phase 4: InvoiceDrawer for Supplier Bills (منخفض)

**الهدف:** دعم عرض تفاصيل فاتورة المورد

| الخطوة | الملف | التعديل |
|--------|-------|---------|
| 21 | `InvoiceDrawer.tsx` | إضافة entityType parameter لدعم supplier bills |
| 22 | `invoiceDetailsService.ts` | إضافة `getBillDetails(billId)` API |
| 23 | `EmployeeStatement.tsx` | تعديل `handleOpenInvoice()` لدعم supplier source_type |

---

## 10. Risks and Limitations

### 10.1 Risks

| المخاطرة | الوصف | مستوى الخطورة | الحل |
|----------|-------|--------------|------|
| **اختلاف بنية البيانات** | Customer/Supplier response يختلف عن Employee | **عالي** | توحيد response في `useAccountStatement` |
| **StatementClassifier غير مطبق** | التصنيف لا يعمل للعملاء/الموردين | **عالي** | تطبيق `classifyLine()` في `getFullStatement()` |
| **لا يوجد items للعملاء** | `getFullStatement()` لا يجلب products | **عالي** | إضافة join مع invoices/orders |
| **PDF/Export غير مطبق** | routes موجودة لكن methods مفقودة | **عالي** | إضافة methods في controllers |
| **Supplier ليس لديه invoices** | المورد لديه bills وليس invoices | **متوسط** | إنشاء BillDrawer أو تعميم InvoiceDrawer |
| **Running balance قد يختلف** | Employee يستخدم `computeRunningBalances()` المخصص | **منخفض** | `getFullStatement()` يحسب running balance بالفعل |

### 10.2 Limitations

| القيد | الوصف |
|-------|-------|
| **Employee-specific fields** | `outstanding_advance`, `outstanding_loan`, `accrued_salary`, `net_payable` غير موجودة للعملاء/الموردين — وهذا صحيح |
| **Sales lines** | `buildSalesLines()` في EmployeeStatementService خاص بالموظفين (يستخدم `cashier_id`) |
| **Invoice enrichment** | إثراء الفواتير في `accountStatementPdf()` خاص بالموظفين (يستخدم Order model) |
| **Movement type options** | `TYPE_OPTIONS_BY_ENTITY` في frontend يدعم customer/supplier لكن backend لا يستجيب |

---

## 11. Exact Files That Need Modification

### Backend (6 files)

| # | الملف | التعديل المطلوب | الأولوية |
|---|-------|----------------|----------|
| 1 | `app/Http/Controllers/Api/CustomerFinancialController.php` | إضافة `statementPdf()` و `statementExport()` methods | **حرجة** |
| 2 | `app/Http/Controllers/Api/SupplierFinancialController.php` | إضافة `statementPdf()` و `statementExport()` methods | **حرجة** |
| 3 | `app/Services/Accounting/SubledgerService.php` | تعديل `getFullStatement()`: إضافة `mode` parameter، تطبيق `StatementClassifier::classifyLine()`، إضافة items | **حرجة** |
| 4 | `app/Services/Accounting/CustomerAccountingService.php` | تعديل `getStatement()`: تمرير `mode` و `type` parameters | **متوسطة** |
| 5 | `app/Services/Accounting/SupplierAccountingService.php` | تعديل `getStatement()`: تمرير `mode` و `type` parameters | **متوسطة** |
| 6 | `resources/views/pdf/employee-statement.blade.php` | تعميم القالب: `$employeeName` → `$entityName`، `$employeeId` → `$entityId` | **متوسطة** |

### Frontend (0 files — analysis only)

| # | الملف | التعديل المطلوب | الأولوية |
|---|-------|----------------|----------|
| — | لا تعديلات مطلوبة حالياً | EmployeeStatement يدعم entityType بالفعل | — |

---

## 12. Exact Files That Must Not Be Modified

### Backend (7 files)

| # | الملف | السبب |
|---|-------|-------|
| 1 | `app/Services/Accounting/EmployeeStatementService.php` | خاص بالموظفين — لا تلمسه |
| 2 | `app/Services/Accounting/EmployeeAccountingService.php` | خاص بالموظفين |
| 3 | `app/Services/Accounting/EmployeeModuleService.php` | خاص بالموظفين |
| 4 | `app/Services/Accounting/StatementClassifier.php` | **لا تعديل** — يعمل بشكل صحيح، يمكن إعادة استخدامه فقط |
| 5 | `app/Services/Accounting/StatementExportService.php` | **لا تعديل** — يعمل بشكل صحيح، يمكن إعادة استخدامه |
| 6 | `app/Services/Accounting/StatementResponseEnricher.php` | **لا تعديل** — يعمل بشكل صحيح |
| 7 | `app/Http/Controllers/Api/EmployeeFinancialController.php` | **لا تعديل** — خاص بالموظفين |

### Frontend (5 files)

| # | الملف | السبب |
|---|-------|-------|
| 1 | `src/components/administration/GL/EmployeeStatement.tsx` | **لا تعديل** — يدعم entityType بالفعل |
| 2 | `src/components/administration/GL/InvoiceDrawer.tsx` | **لا تعديل** — يعمل مع invoiceId |
| 3 | `src/components/administration/GL/AccountStatementModal.tsx` | **لا تعديل** — wrapper بسيط |
| 4 | `src/hooks/useAccountStatement.ts` | **لا تعديل** — يدعم الكيانات الثلاثة |
| 5 | `src/services/financeService.ts` | **لا تعديل** — جميع الدوال موجودة |

---

## Summary

### الفجوات الحرجة (Must Fix)

1. **CustomerFinancialController** ينقصه `statementPdf()` و `statementExport()`
2. **SupplierFinancialController** ينقصه `statementPdf()` و `statementExport()`
3. **SubledgerService::getFullStatement()** لا يدعم `mode` (simple/detailed)
4. **SubledgerService::getFullStatement()** لا يطبق `StatementClassifier::classifyLine()`
5. **SubledgerService::getFullStatement()** لا يجلب items/products

### الفجوات المتوسطة (Should Fix)

6. **employee-statement.blade.php** يحتاج تعميماً
7. **CustomerAccountingService::getStatement()** يحتاج تمرير `mode` و `type`
8. **SupplierAccountingService::getStatement()** يحتاج تمرير `mode` و `type`

### ما يعمل بالفعل (لا تعديل)

- ✅ EmployeeStatement.tsx — يدعم entityType
- ✅ useAccountStatement.ts — يدعم الكيانات الثلاثة
- ✅ financeService.ts — جميع الدوال موجودة
- ✅ InvoiceDrawer.tsx — يعمل مع invoiceId
- ✅ AccountStatementModal.tsx — wrapper بسيط
- ✅ StatementClassifier.php — محرك تصنيف عام
- ✅ StatementExportService.php — خدمة تصدير عامة
- ✅ Routes — جميع routes موجودة

### خطة التنفيذ المقترحة (أقل عدد ملفات)

1. **تعديل 6 ملفات Backend** فقط
2. **تعديل 0 ملفات Frontend** (كل شيء جاهز)
3. **إعادة استخدام** StatementClassifier, StatementExportService, mPDF logic, Blade template
4. **عدم لمس** Employee-specific files (EmployeeStatementService, EmployeeFinancialController, EmployeeAccountingService)