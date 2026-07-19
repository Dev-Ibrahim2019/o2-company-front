# CALL CENTER PHASE 0 AUDIT REPORT
## تدقيق الكود وتثبيت العقود — نظام الكول سنتر وعمليات الطلبات

**تاريخ التدقيق:** 18 يوليو 2026  
**المراجعون:** Cline (AI Code Audit)  
**النطاق:** Frontend (`o2-company-front`) + Backend (`o2-system-backend`)  
**الفرع الحالي:** `call-center` (كلا المشروعين)  
**آخر commit:** Frontend `a17fc0f` / Backend `56611fb`

---

## 1. Executive Summary

### النسبة التقريبية للتنفيذ: **~45%**

النظام يحتوي على بنية أساسية جيدة للكول سنتر وعمليات الطلبات، لكنه يفتقر إلى عدة مكونات حرجة خاصة بمسارات التوصيل متعددة الطلبات، منع التكرار، والاختبارات.

### أهم 5 فجوات

| # | الفجوة | التأثير |
|---|--------|---------|
| 1 | **ميزة مسارات التوصيل متعددة الطلبات غير مكتملة** — الجداول (delivery_trips, delivery_trip_stops) موجودة لكن الـ migration Pending. لا يوجد حد أقصى 3 طلبات، ولا قيود على منع ازدواجية الطلب أو السائق في مسارين. | حرجة — تمنع إطلاق العمليات |
| 2 | **لا توجد Idempotency Key لمنع تكرار الطلب/الدفع/الفاتورة** — لا يوجد حقل `idempotency_key` في أي جدول. يمكن إعادة إرسال الطلب وإنشاء فاتورتين للطلب نفسه. | حرجة — خطر مالي |
| 3 | **لا يوجد UNIQUE constraint على reference_number في جدول payments** — يمكن إدخال نفس الرقم المرجعي البنكي لدفعتين مختلفتين. | حرجة — خطر مالي |
| 4 | **حالات الطلب غير موحدة بين Frontend و Backend** — `types.ts` في الفرونت تحتوي 12 حالة (PENDING, PREPARING, READY, ON_DELIVERY, DELIVERED, CANCELED, REFUNDED, COMPLETED, IN_PROGRESS, PENDING_CONFIRMATION, CONFIRMED, COLLECTED) بينما الباكند يستخدم 5 حالات فقط (PENDING_PAYMENT, PREPARATION, OUT_FOR_DELIVERY, DELIVERED, CANCELLED). | عالية — تسبب أخطاء في العرض والمنطق |
| 5 | **لا توجد اختبارات للعمليات المتزامنة (Concurrency Tests)** — لا توجد اختبارات لمنع إسناد السائق مرتين، أو إدخال الطلب في مسارين، أو تسليم الطلب مرتين. | عالية — خطر تشغيلي |

### أهم 5 مخاطر

1. **تكرار الفاتورة**: `InvoiceController::createFromOrder()` (سطر 49) يتحقق من وجود فاتورة مسبقة بـ `$order->invoice()->exists()` لكن هذا ليس كافياً في البيئات عالية التزامن — يمكن لطلبين متزامنين تجاوز هذا الفحص.
2. **تجاوز حد المسار**: لا يوجد فحص يمنع إضافة أكثر من 3 طلبات في مسار توصيل واحد.
3. **إسناد السائق مرتين**: لا يوجد قفل (row locking) يمنع إسناد طلب لسائقين مختلفين في وقت واحد.
4. **تعديل المسار بعد البدء**: لا يوجد فحص يمنع تعديل مسار بعد أن يكون `started_at` غير null.
5. **تسليم الطلب مرتين**: `OrderExecutionService::completeDelivery()` (سطر 59) يتحقق من `status === OUT_FOR_DELIVERY` لكن لا يوجد فحص `delivered_at === null`.

### هل المشروع جاهز للمرحلة التالية؟

**لا.** يجب إكمال الفجوات الحرجة التالية قبل الانتقال للمرحلة 1:
1. تشغيل migration `2027_01_01_000001_create_delivery_management_tables`
2. إضافة idempotency key للطلبات والمدفوعات
3. إضافة UNIQUE constraint على `reference_number` في جدول `payments`
4. توحيد حالات الطلب بين Frontend و Backend
5. إضافة قيود التزامن الأساسية

---

## 2. Repository Snapshot

### Frontend (`o2-company-front`)

| الخاصية | القيمة |
|---------|--------|
| الفرع | `call-center` |
| آخر commit | `a17fc0f` — "update callCenter Code" |
| حالة Git | معدلة (11 ملفات) + 6 ملفات غير متتبعة |
| التقنيات | React 18, TypeScript 5, Vite 5, Tailwind CSS 4, Zustand 5 |
| المدير | `npm` |
| أوامر الفحص | `npx tsc --noEmit` — لم يُظهر أخطاء (خرج فارغ) |

### Backend (`o2-system-backend`)

| الخاصية | القيمة |
|---------|--------|
| الفرع | `call-center` |
| آخر commit | `56611fb` — "update callCenter Code" |
| حالة Git | معدلة (16 ملفات) + 4 ملفات/مجلدات غير متتبعة |
| التقنيات | Laravel 12, PHP 8.2, Sanctum 4, Spatie Permission 6 |
| قاعدة البيانات | MySQL/MariaDB (غير مؤكدة — لم يتم تشغيل migrate) |
| Migration Pending | `2027_01_01_000001_create_delivery_management_tables` |

### أوامر الفحص التي تم تشغيلها

| الأمر | النتيجة |
|-------|---------|
| `git status` (Frontend) | ✅ نجح |
| `git status` (Backend) | ✅ نجح |
| `php artisan route:list --path=operations` | ✅ نجح — 7 routes |
| `php artisan migrate:status` | ✅ نجح — 1 migration Pending |
| `npx tsc --noEmit` | ✅ نجح — لا توجد أخطاء TypeScript |
| `php artisan test` | لم يتم تشغيله — قد يغير بيانات حقيقية |
| `npm run build` | لم يتم تشغيله — قد يستهلك وقتاً طويلاً |

---

## 3. Current Architecture Map

### Frontend Modules

| المسار | الوصف |
|--------|-------|
| `src/components/CallCenter/` | مكونات الكول سنتر (بحث العملاء، إدارة الشكاوى، الملف الشخصي) |
| `src/components/operations/` | لوحة العمليات (`OperationsDashboard.tsx`) وإدارة التوصيل (`DeliveryManagementPage.tsx`) |
| `src/components/POS/` | نقطة البيع (`pos.tsx`) مع وضع `isCallCenterMode` |
| `src/services/` | خدمات API (callCenterService, orderService, operationsService, deliveryManagementService) |
| `src/auth/` | نظام الصلاحيات والأدوار |
| `src/types.ts` | أنواع TypeScript (على مستوى الجذر) |
| `store.tsx` | حالة التطبيق (Zustand + Context) |

### Backend Modules

| المسار | الوصف |
|--------|-------|
| `app/Models/` | Order, Employee, Customer, Invoice, Payment, DeliveryTrip, DeliveryTripStop, OrderExecutionEvent |
| `app/Services/CallCenter/` | CallCenterService (بحث العملاء، إنشاء، شكاوى، ملاحظات) |
| `app/Services/Operations/` | OrderExecutionService (تجميع، توصيل، أحداث) |
| `app/Services/Invoice/` | InvoiceFromOrderService (إنشاء فاتورة من طلب) |
| `app/Services/Order/` | OrderPricingService (تسعير الطلبات) |
| `app/Services/Discount/` | DiscountEngineService (محرك الخصم) |
| `app/Http/Controllers/Api/` | OrderController, InvoiceController, CallCenterController, DeliveryOperationsController |
| `app/Http/Controllers/Api/Delivery/` | DeliveryTripController, DeliveryZoneController |
| `app/Http/Requests/Api/` | StoreOrderRequest, AddPaymentRequest, CreateInvoiceFromOrderRequest |

### Database Tables (ذات الصلة)

| الجدول | الحالة | ملاحظات |
|--------|--------|---------|
| `orders` | ✅ موجود | يحتوي على حقول التجميع والتوصيل |
| `order_items` | ✅ موجود | |
| `invoices` | ✅ موجود | |
| `invoice_items` | ✅ موجود | |
| `payments` | ✅ موجود | **لا يوجد UNIQUE على reference_number** |
| `customers` | ✅ موجود | |
| `customer_addresses` | ✅ موجود | |
| `customer_notes` | ✅ موجود | |
| `customer_complaints` | ✅ موجود | |
| `employees` | ✅ موجود | يحتوي على `operational_role`, `is_operations_enabled`, `vehicle_type` |
| `order_execution_events` | ✅ موجود | سجل الأحداث |
| `delivery_zones` | ✅ موجود | |
| `delivery_trips` | ❌ Pending | الـ migration لم يُشغّل بعد |
| `delivery_trip_stops` | ❌ Pending | الـ migration لم يُشغّل بعد |

### Routes (Operations)

| Method | URL | Controller | Permission |
|--------|-----|-----------|------------|
| GET | `api/operations/assemblers` | DeliveryOperationsController@assemblers | manage-orders |
| GET | `api/operations/dashboard` | DeliveryOperationsController@dashboard | view-orders\|manage-orders |
| GET | `api/operations/delivery/available` | DeliveryOperationsController@available | manage-orders |
| PATCH | `api/operations/orders/{order}/assembly/start` | DeliveryOperationsController@startAssembly | manage-orders |
| PATCH | `api/operations/orders/{order}/assembly/complete` | DeliveryOperationsController@completeAssembly | manage-orders |
| PATCH | `api/operations/orders/{order}/assign-delivery` | DeliveryOperationsController@assign | manage-orders |
| GET | `api/operations/orders/{order}/events` | DeliveryOperationsController@events | view-orders\|manage-orders |

### Permissions (ذات الصلة بالكول سنتر والعمليات)

| الصلاحية | التعريف |
|----------|---------|
| `access-call-center` | الوصول لواجهة الكول سنتر |
| `manage-call-center` | إدارة الكول سنتر |
| `manage-orders` | إدارة الطلبات (تجميع، توصيل، إلغاء) |
| `create-orders` | إنشاء طلبات |
| `view-orders` | عرض الطلبات |
| `close-invoices` | إغلاق الفواتير |
| `add-payments` | إضافة مدفوعات |
| `manage-payments` | إدارة المدفوعات |

### Order State Machine (الحالية)

```
PENDING_PAYMENT ──(دفع كامل)──> PREPARATION ──(تجميع كامل)──> OUT_FOR_DELIVERY ──(تسليم)──> DELIVERED
       │                              │                            │
       └──(إلغاء)──> CANCELLED <───────┴────────────────────────────┘
```

---

## 4. Requirements Traceability Matrix

### أولاً: التهيئة التشغيلية للموظفين

| ID | المتطلب | الأولوية | الحالة | ملفات Frontend | ملفات Backend | جداول DB | دليل التحقق |
|----|---------|---------|--------|---------------|--------------|----------|------------|
| EMP-01 | قسم "كول سنتر وعمليات الطلبات" | P0 | ✅ IMPLEMENTED | `App.tsx:33-35` (CrmDirectoryPage, ComplaintsManagement, CallCenterEmployees) | `routes/api.php:111-148` (call-center prefix) | — | المسار `/pos/call-center/*` موجود |
| EMP-02 | Call Center Agent role | P0 | ✅ IMPLEMENTED | `permissions.ts:38` (CALL_CENTER), `permissions.ts:204-219` (صلاحيات) | `routes/api.php:111` (permission: access-call-center) | `employees.operational_role` | القيمة `call_center_agent` في Employee |
| EMP-03 | Assembler role | P0 | ✅ IMPLEMENTED | `types.ts:271` (ORDER_AGGREGATOR) | `OrderExecutionService.php:86` (assertAssembler) | `employees.operational_role` | القيمة `assembler` في Employee |
| EMP-04 | Delivery Driver role | P0 | ✅ IMPLEMENTED | `operationsService.ts:4` (delivery_driver) | `OrderExecutionService.php:50` (startDelivery) | `employees.operational_role` | القيمة `delivery_driver` في Employee |
| EMP-05 | is_operations_enabled | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:86` | `employees.is_operations_enabled` | موجود في `$fillable` Employee.php:41 |
| EMP-06 | operational_role | P0 | ✅ IMPLEMENTED | `operationsService.ts:4` | `Employee.php:39` | `employees.operational_role` | موجود في `$fillable` |
| EMP-07 | requires_vehicle | P1 | ❌ MISSING | — | — | — | غير موجود في Employee model |
| EMP-08 | vehicle_type | P0 | ✅ IMPLEMENTED | `OperationsDashboard.tsx:16` | `Employee.php:40` | `employees.vehicle_type` | موجود في `$fillable` |
| EMP-09 | ربط المسميات الوظيفية بالأقسام | P1 | ✅ IMPLEMENTED | `types.ts:223-228` (JobTitle.departmentIds) | `Employee.php:73-76` (department relation) | `employees.department_id` | موجود |
| EMP-10 | فلترة الموظفين حسب الفرع | P0 | ✅ IMPLEMENTED | `OperationsDashboard.tsx:73` (branch filter) | `Employee.php:16-19` (BranchScope) | `employees.branch_id` | BranchScope global |
| EMP-11 | عدم ظهور الموظف غير المفعّل | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:86` | `employees.status` | يتحقق من `status === 'ACTIVE'` |
| EMP-12 | اشتراط المركبة لموظف التوصيل | P1 | ⚠️ PARTIALLY_IMPLEMENTED | `OperationsDashboard.tsx:16` (vehicle labels) | — | `employees.vehicle_type` | لا يوجد validation يمنع تعيين سائق بدون vehicle_type |
| EMP-13 | صلاحيات الكول سنتر والتجميع والتوصيل | P0 | ✅ IMPLEMENTED | `permissions.ts:204-219` | `routes/api.php` (permission middleware) | `permissions` table (Spatie) | موجودة |
| EMP-14 | الموارد البشرية كمصدر أساسي | P1 | ✅ IMPLEMENTED | `types.ts:244-286` (Employee) | `Employee.php` | `employees` | لا توجد بيانات مكررة في وحدات أخرى |

### ثانياً: البحث عن العميل وبطاقة العميل

| ID | المتطلب | الأولوية | الحالة | ملفات Frontend | ملفات Backend | جداول DB | دليل التحقق |
|----|---------|---------|--------|---------------|--------------|----------|------------|
| CUS-01 | البحث برقم الهاتف | P0 | ✅ IMPLEMENTED | `CustomerPhoneSearch.tsx` | `CallCenterService.php:24-39` | `customers.phone` | `searchCustomers()` |
| CUS-02 | توحيد صيغة الرقم قبل البحث | P0 | ✅ IMPLEMENTED | `pos.tsx:62-69` (normalizePhoneForMatch) | — | — | موجود في frontend |
| CUS-03 | منع إنشاء عملاء مكررين | P1 | ❌ MISSING | — | `CallCenterService.php:45-100` | — | لا يوجد فحص `phone` موجود مسبقاً قبل الإنشاء |
| CUS-04 | إنشاء عميل جديد | P0 | ✅ IMPLEMENTED | `CustomerPhoneSearch.tsx:130-136` | `CallCenterService.php:45-100` | `customers` | موجود |
| CUS-05 | الحقول الإلزامية: الاسم والمنطقة/العنوان | P1 | ⚠️ PARTIALLY_IMPLEMENTED | — | `CallCenterService.php:53-65` | — | الاسم إلزامي، العنوان اختياري |
| CUS-06 | آخر 3 طلبات | P0 | ✅ IMPLEMENTED | `CustomerQuickPreview.tsx` | `CallCenterService.php:137-158` | `orders` | `getCustomerFullProfile()` |
| CUS-07 | الملاحظات الدائمة | P0 | ✅ IMPLEMENTED | `pos.tsx:1089-1094` | `CallCenterService.php:700-729` | `customer_notes` | `getCustomerNotes()` |
| CUS-08 | فصل ملاحظات العميل عن ملاحظة الطلب | P0 | ✅ IMPLEMENTED | — | `CallCenterService.php:151-156` (حيث order_id = null) | `customer_notes.order_id` | موجود |
| CUS-09 | العناوين المتعددة | P0 | ✅ IMPLEMENTED | `CustomerProfileDrawer.tsx` | `CallCenterService.php:277-290` | `customer_addresses` | موجود |
| CUS-10 | إجمالي الطلبات | P0 | ✅ IMPLEMENTED | `CustomerQuickPreview.tsx` | `CallCenterService.php:731-752` | `orders` | `getCustomerOrderStats()` |
| CUS-11 | إجمالي الإنفاق | P0 | ✅ IMPLEMENTED | `CustomerQuickPreview.tsx` | `CallCenterService.php:731-752` | `orders` | موجود |
| CUS-12 | آخر طلب | P0 | ✅ IMPLEMENTED | `pos.tsx:1097-1114` | `CallCenterService.php:137-158` | `orders` | موجود |
| CUS-13 | الأيام منذ آخر طلب | P1 | ⚠️ PARTIALLY_IMPLEMENTED | — | `CallCenterService.php:731-752` | — | `last_order_at` موجود لكن لا يُحسب الفرق |
| CUS-14 | الصنف المفضل | P1 | ✅ IMPLEMENTED | `CustomerQuickPreview.tsx:24` | `CallCenterService.php:251-272` | `order_items` | `getCustomerFavorites()` |
| CUS-15 | تقييم العميل | P1 | ✅ IMPLEMENTED | `types.ts:319` (Customer.rating) | — | `customers.rating` | موجود |
| CUS-16 | اقتراح الطلب المعتاد | P1 | ✅ IMPLEMENTED | `pos.tsx:1097-1114` | — | — | `handleSelectCustomer` يضيف أصناف آخر طلب |

### ثالثاً: إنشاء الطلب

| ID | المتطلب | الأولوية | الحالة | ملفات Frontend | ملفات Backend | جداول DB | دليل التحقق |
|----|---------|---------|--------|---------------|--------------|----------|------------|
| ORD-01 | إضافة الصنف بالكود | P0 | ✅ IMPLEMENTED | `pos.tsx:1228-1240` (handleQuickAdd) | `OrderController.php:88-98` | `items.code` | `findByCode(quickId)` |
| ORD-02 | تغيير الكمية | P0 | ✅ IMPLEMENTED | `pos.tsx` | — | `order_items.quantity` | موجود |
| ORD-03 | دعم الحلويات بالأوزان 250/500/1000 غرام | P1 | ❌ MISSING | — | — | — | لا يوجد دعم للأوزان في OrderItem |
| ORD-04 | إضافة الصنف نفسه أكثر من مرة | P0 | ✅ IMPLEMENTED | `useCart.ts` | — | `order_items` | مسموح |
| ORD-05 | دمج أو فصل الأسطر المتكررة | P1 | ❌ MISSING | — | — | — | لا توجد آلية دمج |
| ORD-06 | حساب السعر والضريبة والخصم والإجمالي | P0 | ✅ IMPLEMENTED | `pos.tsx:528-543` | `OrderPricingService.php` | `orders` | موجود |
| ORD-07 | تطبيق الخصم على كامل الكمية | P0 | ✅ IMPLEMENTED | — | `InvoiceFromOrderService.php:54-98` | — | `$lineGross = $originalPrice * $quantity` |
| ORD-08 | شرط AND عند ربط الخصم بموظف وأصناف | P1 | ⚠️ PARTIALLY_IMPLEMENTED | — | `DiscountEngineService.php` | `discount_targets` | يحتاج تدقيق إضافي |
| ORD-09 | ملاحظات الطلب والأصناف | P0 | ✅ IMPLEMENTED | `pos.tsx` | `Order.php:54` (note field) | `orders.note`, `order_items.notes` | موجود |
| ORD-10 | حفظ الطلب كمسودة | P0 | ✅ IMPLEMENTED | `pos.tsx` | `OrderController.php:41-100` | `orders.status = PENDING_PAYMENT` | موجود |
| ORD-11 | استئناف المسودة | P1 | ⚠️ PARTIALLY_IMPLEMENTED | — | — | — | لا توجد واجهة واضحة لاستئناف المسودات |
| ORD-12 | تعديل الإجمالي بصلاحية محددة | P1 | ❌ MISSING | — | — | — | لا توجد صلاحية منفصلة لتعديل الإجمالي |
| ORD-13 | اختصارات F1-F4 | P1 | ✅ IMPLEMENTED | `pos.tsx:1261-1289` | — | — | موجود |
| ORD-14 | عرض Table أو Kanban | P1 | ✅ IMPLEMENTED | `OperationsDashboard.tsx:78` | — | — | Kanban view موجود |
| ORD-15 | منع تكرار إنشاء الطلب | P0 | ❌ MISSING | — | `OrderController.php:41-100` | — | لا يوجد idempotency_key |

### رابعاً: الدفع والفاتورة

| ID | المتطلب | الأولوية | الحالة | ملفات Frontend | ملفات Backend | جداول DB | دليل التحقق |
|----|---------|---------|--------|---------------|--------------|----------|------------|
| PAY-01 | cash | P0 | ✅ IMPLEMENTED | `types.ts:22-31` | `Payment.php:13-28` | `payments.method` | موجود |
| PAY-02 | app | P0 | ✅ IMPLEMENTED | `types.ts:24` (WALLET) | — | — | موجود |
| PAY-03 | card | P0 | ✅ IMPLEMENTED | `types.ts:23` (CREDIT_CARD) | — | — | موجود |
| PAY-04 | bank | P0 | ✅ IMPLEMENTED | — | — | — | موجود كـ payment_method |
| PAY-05 | settlement_type | P1 | ❌ MISSING | — | — | — | غير موجود |
| PAY-06 | payment_method | P0 | ✅ IMPLEMENTED | `types.ts:22-31` | `Payment.php:16` | `payments.method` | موجود |
| PAY-07 | الرقم المرجعي البنكي | P0 | ✅ IMPLEMENTED | — | `Payment.php:19` | `payments.reference_number` | موجود |
| PAY-08 | validation للرقم المرجعي | P1 | ❌ MISSING | — | `AddPaymentRequest.php` | — | لا يوجد validation |
| PAY-09 | UNIQUE constraint على reference_number | P0 | ❌ MISSING | — | — | `payments.reference_number` | **غير موجود** — خطر مالي |
| PAY-10 | منع إدخال نفس الرقم المرجعي لفاتورتين | P0 | ❌ MISSING | — | — | — | لا يوجد فحص |
| PAY-11 | إنشاء الفاتورة من الطلب | P0 | ✅ IMPLEMENTED | `useCart.ts` | `InvoiceFromOrderService.php` | `invoices` | موجود |
| PAY-12 | منع إنشاء فاتورتين للطلب نفسه | P0 | ⚠️ PARTIALLY_IMPLEMENTED | — | `InvoiceController.php:49` | — | يتحقق بـ `$order->invoice()->exists()` لكن غير آمن للتزامن |
| PAY-13 | طباعة الفاتورة | P1 | ✅ IMPLEMENTED | — | `Order.php:174-246` (sectionsForPrint) | — | موجود |
| PAY-14 | استخدام Database Transaction | P0 | ✅ IMPLEMENTED | — | `InvoiceController.php:60-83` | — | DB::transaction مستخدم |
| PAY-15 | Idempotency لمنع تكرار الدفع | P0 | ❌ MISSING | — | `InvoiceController.php:100-183` | — | **غير موجود** |

### خامساً: دورة حالة الطلب

| ID | المتطلب | الأولوية | الحالة | ملفات Frontend | ملفات Backend | جداول DB | دليل التحقق |
|----|---------|---------|--------|---------------|--------------|----------|------------|
| STM-01 | استخراج جميع حالات الطلب | P0 | ✅ IMPLEMENTED | `types.ts:7-20` | `Order.php:23-27` | `orders.status` | موجود |
| STM-02 | وقت إنشاء الطلب | P0 | ✅ IMPLEMENTED | — | `Order.php` (timestamps) | `orders.created_at` | موجود |
| STM-03 | وقت بدء التحضير | P1 | ⚠️ PARTIALLY_IMPLEMENTED | — | — | `production_tickets.started_at` | عبر التذاكر وليس الطلب مباشرة |
| STM-04 | وقت بدء التجميع | P0 | ✅ IMPLEMENTED | — | `Order.php:72` | `orders.assembly_started_at` | موجود |
| STM-05 | وقت انتهاء التجميع | P0 | ✅ IMPLEMENTED | — | `Order.php:69` | `orders.assembled_at` | موجود |
| STM-06 | وقت إسناد السائق | P0 | ✅ IMPLEMENTED | — | `Order.php:78` | `orders.delivery_assigned_by` | موجود |
| STM-07 | وقت بدء التوصيل | P0 | ✅ IMPLEMENTED | — | `Order.php:74` | `orders.delivery_started_at` | موجود |
| STM-08 | وقت التسليم | P0 | ✅ IMPLEMENTED | — | `Order.php:75` | `orders.delivered_at` | موجود |
| STM-09 | سبب الإلغاء | P0 | ✅ IMPLEMENTED | — | `Order.php:81` | `orders.cancellation_reason` | موجود |
| STM-10 | الموظف الذي نفّذ كل انتقال | P0 | ✅ IMPLEMENTED | — | `OrderExecutionEvent.php:9` | `order_execution_events.employee_id` | موجود |
| STM-11 | سجل أحداث غير قابل للتلاعب | P1 | ✅ IMPLEMENTED | — | `OrderExecutionEvent.php` | `order_execution_events` | موجود (إضافة فقط) |

### سادساً: التجميع

| ID | المتطلب | الأولوية | الحالة | ملفات Frontend | ملفات Backend | جداول DB | دليل التحقق |
|----|---------|---------|--------|---------------|--------------|----------|------------|
| ASM-01 | قائمة المجمّعين المتاحين | P0 | ✅ IMPLEMENTED | `OperationsDashboard.tsx` | `DeliveryOperationsController@assemblers` | `employees` | موجود |
| ASM-02 | إسناد الطلب للمجمّع | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:14-23` | `orders.assembler_id` | موجود |
| ASM-03 | بدء التجميع | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:14-23` | `orders.assembly_started_at` | موجود |
| ASM-04 | إكمال التجميع | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:25-41` | `orders.assembled_at` | موجود |
| ASM-05 | assembler_id | P0 | ✅ IMPLEMENTED | — | `Order.php:71` | `orders.assembler_id` | موجود |
| ASM-06 | assembled_by | P0 | ✅ IMPLEMENTED | — | `Order.php:72` | `orders.assembled_by` | موجود |
| ASM-07 | assembly_started_at | P0 | ✅ IMPLEMENTED | — | `Order.php:72` | `orders.assembly_started_at` | موجود |
| ASM-08 | assembled_at | P0 | ✅ IMPLEMENTED | — | `Order.php:69` | `orders.assembled_at` | موجود |
| ASM-09 | assembly_duration_seconds | P0 | ✅ IMPLEMENTED | — | `Order.php:73` | `orders.assembly_duration_seconds` | موجود |
| ASM-10 | منع الإكمال قبل البدء | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:33` | — | يتحقق من `$started` |
| ASM-11 | منع تنفيذ الانتقال مرتين | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:18,30` | — | يتحقق من `assembled_at` و `assembly_started_at` |
| ASM-12 | تسجيل أحداث التنفيذ | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:43-46` | `order_execution_events` | موجود |

### سابعاً: إسناد السائق

| ID | المتطلب | الأولوية | الحالة | ملفات Frontend | ملفات Backend | جداول DB | دليل التحقق |
|----|---------|---------|--------|---------------|--------------|----------|------------|
| DRV-01 | operational_role = delivery_driver | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:50` | `employees.operational_role` | موجود |
| DRV-02 | is_operations_enabled = true | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:86` | `employees.is_operations_enabled` | موجود |
| DRV-03 | الموظف نشط | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:86` | `employees.status` | موجود |
| DRV-04 | السائق من الفرع نفسه | P0 | ✅ IMPLEMENTED | — | `OrderExecutionService.php:50` | `employees.branch_id` | `abort_unless((int) $driver->branch_id === (int) $order->branch_id)` |
| DRV-05 | لديه vehicle_type | P1 | ❌ MISSING | — | — | `employees.vehicle_type` | لا يوجد فحص |
| DRV-06 | غير موجود في توصيل نشط | P1 | ❌ MISSING | — | — | — | لا يوجد فحص |
| DRV-07 | available drivers endpoint | P0 | ✅ IMPLEMENTED | `deliveryManagementService.ts:18` | `DeliveryOperationsController@available` | — | موجود |
| DRV-08 | driver_id | P0 | ✅ IMPLEMENTED | — | `Order.php:77` | `orders.driver_id` | موجود |
| DRV-09 | delivery_assigned_by | P0 | ✅ IMPLEMENTED | — | `Order.php:78` | `orders.delivery_assigned_by` | موجود |
| DRV-10 | delivery_started_at | P0 | ✅ IMPLEMENTED | — | `Order.php:74` | `orders.delivery_started_at` | موجود |
| DRV-11 | حالة OUT_FOR_DELIVERY | P0 | ✅ IMPLEMENTED | — | `Order.php:25` | `orders.status` | موجود |
| DRV-12 | منع إسناد الطلب مرتين | P0 | ❌ MISSING | — | — | — | لا يوجد فحص `driver_id === null` |
| DRV-13 | ترتيب السائقين المتاحين | P1 | ❌ MISSING | — | — | — | لا توجد آلية ترتيب |
| DRV-14 | عدد الطلبات النشطة لكل سائق | P1 | ⚠️ PARTIALLY_IMPLEMENTED | `OperationsDashboard.tsx:48-49` | — | — | يُعرض في dashboard لكن لا يُستخدم في التصفية |

---

## 5. Order Lifecycle Audit

### حالات الطلب الحالية — مقارنة بين المصادر

| الحالة | Backend (Order.php) | Frontend (types.ts) | Database (orders.status) | ملاحظات |
|--------|-------------------|-------------------|------------------------|---------|
| PENDING_PAYMENT | ✅ `STATUS_PENDING_PAYMENT` | ❌ غير موجودة | ✅ مستخدمة | **تعارض** — الفرونت لا يعرف هذه الحالة |
| PREPARATION | ✅ `STATUS_PREPARATION` | ❌ غير موجودة (PREPARING موجودة) | ✅ مستخدمة | **تعارض** — PREPARING ≠ PREPARATION |
| OUT_FOR_DELIVERY | ✅ `STATUS_OUT_FOR_DELIVERY` | ❌ غير موجودة (ON_DELIVERY موجودة) | ✅ مستخدمة | **تعارض** — ON_DELIVERY ≠ OUT_FOR_DELIVERY |
| DELIVERED | ✅ `STATUS_DELIVERED` | ✅ DELIVERED | ✅ مستخدمة | ✅ متطابقة |
| CANCELLED | ✅ `STATUS_CANCELLED` | ✅ CANCELED (خطأ إملائي) | ✅ مستخدمة | **تعارض بسيط** — CANCELED vs CANCELLED |
| PENDING | ❌ غير موجودة | ✅ PENDING | ❌ غير مستخدمة | **تعارض** — موجودة في الفرونت فقط |
| READY | ❌ غير موجودة | ✅ READY | ❌ غير مستخدمة | **تعارض** — موجودة في الفرونت فقط |
| COMPLETED | ❌ غير موجودة | ✅ COMPLETED | ❌ غير مستخدمة | **تعارض** — موجودة في الفرونت فقط |
| IN_PROGRESS | ❌ غير موجودة | ✅ IN_PROGRESS | ❌ غير مستخدمة | **تعارض** — موجودة في الفرونت فقط |
| PENDING_CONFIRMATION | ❌ غير موجودة | ✅ PENDING_CONFIRMATION | ❌ غير مستخدمة | **تعارض** — موجودة في الفرونت فقط |
| CONFIRMED | ❌ غير موجودة | ✅ CONFIRMED | ❌ غير مستخدمة | **تعارض** — موجودة في الفرونت فقط |
| COLLECTED | ❌ غير موجودة | ✅ COLLECTED | ❌ غير مستخدمة | **تعارض** — موجودة في الفرونت فقط |
| REFUNDED | ❌ غير موجودة | ✅ REFUNDED | ❌ غير مستخدمة | **تعارض** — موجودة في الفرونت فقط |

### دورة الحالة المقترحة (موحدة)

```
DRAFT ──> PENDING_PAYMENT ──> PREPARATION ──> ASSEMBLING ──> READY_FOR_DELIVERY ──> OUT_FOR_DELIVERY ──> DELIVERED
  │            │                   │                │                │                     │
  └──> CANCELLED <────────────────┴────────────────┴────────────────┴─────────────────────┘
                                                                                            │
                                                                                            └──> FAILED_DELIVERY
```

### الفروقات المكتشفة

1. **Frontend `types.ts` (سطر 7-20)** يحتوي على 12 حالة بينما **Backend `Order.php` (سطر 23-27)** يحتوي على 5 حالات فقط.
2. **خطأ إملائي**: `CANCELED` في الفرونت (سطر 13) vs `CANCELLED` في الباكند (سطر 27).
3. **حالة PREPARING** في الفرونت (سطر 9) vs **PREPARATION** في الباكند (سطر 24).
4. **حالة ON_DELIVERY** في الفرونت (سطر 11) vs **OUT_FOR_DELIVERY** في الباكند (سطر 25).
5. **حالة ASSEMBLING** غير موجودة في أي من المصدرين — رغم أن `assembly_started_at` موجود.
6. **حالة READY_FOR_DELIVERY** غير موجودة في أي من المصدرين — رغم أن `assembled_at` موجود.

---

## 6. Delivery Route Audit

### الموجود حالياً

- **Models**: `DeliveryTrip.php` و `DeliveryTripStop.php` موجودة في `app/Models/`
- **Controllers**: `DeliveryTripController.php` في `app/Http/Controllers/Api/Delivery/`
- **Routes**: مسارات delivery-management كاملة (سطر 355-369 في `routes/api.php`)
- **Frontend Service**: `deliveryManagementService.ts` مع دوال كاملة (createTrip, start, cancel, stop)
- **Frontend Page**: `DeliveryManagementPage.tsx` موجود
- **Migration**: `2027_01_01_000001_create_delivery_management_tables.php` — **Pending**

### المفقود

1. **الـ migration لم يُشغّل بعد** — الجداول غير موجودة في قاعدة البيانات
2. **لا يوجد حد أقصى 3 طلبات** — لا يوجد validation في `DeliveryTripController@store`
3. **لا يوجد فحص لازدواجية الطلب** — لا يمنع إضافة الطلب لمسارين نشطين
4. **لا يوجد فحص لازدواجية السائق** — لا يمنع إسناد سائق لمسارين نشطين
5. **لا يوجد فحص `started_at` قبل التعديل** — يمكن تعديل المسار بعد بدئه
6. **لا يوجد `cancelled_at` أو `cancellation_reason`** في `DeliveryTrip` model
7. **لا يوجد `failed_at`** في `DeliveryTripStop` model
8. **لا يوجد `assigned_by`** في `DeliveryTrip` model

### نموذج البيانات المقترح

#### `delivery_trips` (موجود — يحتاج إضافة)

```php
Schema::table('delivery_trips', function (Blueprint $table) {
    $table->foreignId('assigned_by')->nullable()->after('driver_id')->constrained('users')->nullOnDelete();
    $table->timestamp('cancelled_at')->nullable()->after('completed_at');
    $table->text('cancellation_reason')->nullable()->after('cancelled_at');
    $table->unsignedTinyInteger('max_stops')->default(3)->after('notes');
});
```

#### `delivery_trip_stops` (موجود — يحتاج إضافة)

```php
Schema::table('delivery_trip_stops', function (Blueprint $table) {
    $table->timestamp('failed_at')->nullable()->after('delivered_at');
    $table->string('failure_reason')->nullable()->change(); // موجود لكن needs failed_at
});
```

### حالات المسار المقترحة

| الحالة | الوصف |
|--------|-------|
| `draft` | قيد الإنشاء — يمكن تعديل الطلبات والسائق |
| `ready` | جاهز — تم تحديد السائق والطلبات |
| `in_progress` | قيد التنفيذ — السائق في الطريق |
| `completed` | مكتمل — تم تسليم جميع الطلبات |
| `cancelled` | ملغي — أُلغي المسار بالكامل |

### حالات الطلب داخل المسار المقترحة

| الحالة | الوصف |
|--------|-------|
| `pending` | بانتظار التوصيل |
| `out_for_delivery` | خارج للتوصيل (عند بدء المسار) |
| `delivered` | تم التسليم |
| `failed` | تعذر التسليم |

### القيود المطلوبة

1. **منع إدخال الطلب في أكثر من مسار نشط**:
   ```sql
   -- لا يمكن تطبيق هذا كـ UNIQUE constraint بسيط
   -- يجب تطبيقه في Service باستخدام:
   -- 1. WHERE status IN ('draft', 'ready', 'in_progress')
   -- 2. DB::transaction + lockForUpdate
   ```

2. **منع تكرار الطلب داخل المسار**:
   ```sql
   UNIQUE (delivery_trip_id, order_id) -- موجود بالفعل
   ```

3. **تجاوز الحد الأقصى**:
   ```php
   if ($trip->stops()->count() >= 3) {
       throw ValidationException::withMessages(['order_ids' => 'لا يمكن إضافة أكثر من 3 طلبات في المسار']);
   }
   ```

4. **منع إسناد السائق لمسارين نشطين**:
   ```php
   $activeTrips = DeliveryTrip::where('driver_id', $driverId)
       ->whereIn('status', ['draft', 'ready', 'in_progress'])
       ->where('id', '!=', $tripId)
       ->exists();
   if ($activeTrips) {
       throw ValidationException::withMessages(['driver_id' => 'السائق مشغول في مسار آخر']);
   }
   ```

5. **منع تعديل المسار بعد البدء**:
   ```php
   if ($trip->started_at) {
       throw ValidationException::withMessages(['trip' => 'لا يمكن تعديل مسار بعد بدئه']);
   }
   ```

### APIs المقترحة

#### إنشاء مسار
```
POST /api/delivery-management/trips
Permission: manage-orders
Request: {
    driver_id: number,
    order_ids: number[] (1-3),
    notes?: string
}
Response 201: {
    data: Trip
}
Error 422: {
    message: "لا يمكن إضافة أكثر من 3 طلبات",
    errors: { order_ids: [...] }
}
```

#### عرض المسارات
```
GET /api/delivery-management/trips?status=draft&branch_id=1
Permission: manage-orders
Response: {
    data: Trip[],
    meta: { current_page, last_page, total }
}
```

#### عرض تفاصيل مسار
```
GET /api/delivery-management/trips/{trip}
Permission: manage-orders
Response: {
    data: Trip (with stops.order)
}
```

#### إضافة طلب للمسار
```
POST /api/delivery-management/trips/{trip}/stops
Permission: manage-orders
Request: { order_id: number }
Response 200: { data: Trip }
Error 422: "المسار بدأ بالفعل" / "الطلب في مسار آخر" / "تجاوز الحد الأقصى"
```

#### إزالة طلب قبل بدء المسار
```
DELETE /api/delivery-management/trips/{trip}/stops/{stop}
Permission: manage-orders
Response 200: { data: Trip }
Error 422: "لا يمكن إزالة طلب من مسار بدأ بالفعل"
```

#### إعادة ترتيب الطلبات
```
PUT /api/delivery-management/trips/{trip}/stops/reorder
Permission: manage-orders
Request: { sequences: [{ stop_id: number, sequence: number }] }
Response 200: { data: Trip }
```

#### إسناد السائق
```
PUT /api/delivery-management/trips/{trip}
Permission: manage-orders
Request: { driver_id: number }
Response 200: { data: Trip }
Error 422: "السائق مشغول في مسار آخر"
```

#### بدء المسار
```
POST /api/delivery-management/trips/{trip}/start
Permission: manage-orders
Response 200: { data: Trip }
Action: تحديث جميع الـ stops إلى out_for_delivery
```

#### تسليم طلب داخل المسار
```
PATCH /api/delivery-management/trips/{trip}/stops/{stop}
Permission: manage-orders
Request: { status: "delivered" | "failed", failure_reason?: string }
Response 200: { data: Trip }
Action: تحديث order.status + تسجيل الحدث
```

#### إكمال المسار
```
POST /api/delivery-management/trips/{trip}/complete
Permission: manage-orders
Response 200: { data: Trip }
Action: التحقق من أن جميع الـ stops تمت معالجتها
```

#### إلغاء المسار
```
POST /api/delivery-management/trips/{trip}/cancel
Permission: manage-orders
Request: { reason: string }
Response 200: { data: Trip }
Action: إعادة جميع الطلبات إلى PREPARATION
```

---

## 7. API Contract Audit

### Endpoints موجودة — تحتاج تدقيق

#### `POST /api/orders`
| الخاصية | القيمة |
|---------|--------|
| Form Request | `StoreOrderRequest.php` |
| Validation | ✅ موجود (سطر 19-54) |
| Idempotency | ❌ غير موجود |
| Transaction | ✅ DB::beginTransaction (سطر 45) |
| Error codes | 422 validation, 500 server error |

#### `POST /api/orders/{order}/invoice`
| الخاصية | القيمة |
|---------|--------|
| Form Request | `CreateInvoiceFromOrderRequest.php` |
| Validation | ✅ موجود |
| Idempotency | ❌ غير موجود — `$order->invoice()->exists()` غير آمن للتزامن |
| Transaction | ✅ DB::beginTransaction (سطر 60) |
| Error codes | 422 (فاتورة موجودة/طلب ملغي), 500 |

#### `POST /api/invoices/{invoice}/payments`
| الخاصية | القيمة |
|---------|--------|
| Form Request | `AddPaymentRequest.php` |
| Validation | ✅ موجود |
| Idempotency | ❌ غير موجود |
| Transaction | ✅ DB::beginTransaction (سطر 118) |
| Error codes | 422 (فاتورة مدفوعة/مبلغ يتجاوز المتبقي), 500 |

#### `PATCH /api/operations/orders/{order}/assembly/start`
| الخاصية | القيمة |
|---------|--------|
| Validation | ✅ في `OrderExecutionService.php:18` |
| Idempotency | ✅ يتحقق من `assembly_started_at` |
| Transaction | ✅ DB::transaction (سطر 16) |
| Row locking | ✅ `lockForUpdate()` (سطر 17) |

#### `PATCH /api/operations/orders/{order}/assembly/complete`
| الخاصية | القيمة |
|---------|--------|
| Validation | ✅ في `OrderExecutionService.php:30-31` |
| Idempotency | ✅ يتحقق من `assembled_at` |
| Transaction | ✅ DB::transaction (سطر 27) |
| Row locking | ✅ `lockForUpdate()` (سطر 28) |

#### `PATCH /api/operations/orders/{order}/assign-delivery`
| الخاصية | القيمة |
|---------|--------|
| Validation | ✅ في `OrderExecutionService.php:50` |
| Idempotency | ❌ غير موجود — لا يتحقق من `driver_id === null` |
| Transaction | ✅ |
| Row locking | ❌ غير موجود |

---

## 8. Database and Migration Plan

### الجداول الحالية (ذات الصلة)

| الجدول | الحالة | التعديلات المطلوبة |
|--------|--------|-------------------|
| `orders` | ✅ موجود | إضافة `idempotency_key` (string, unique, nullable) |
| `payments` | ✅ موجود | إضافة `UNIQUE (reference_number)` حيث reference_number NOT NULL |
| `invoices` | ✅ موجود | إضافة `idempotency_key` (string, unique, nullable) |
| `delivery_trips` | ❌ Pending | تشغيل migration + إضافة `assigned_by`, `cancelled_at`, `cancellation_reason`, `max_stops` |
| `delivery_trip_stops` | ❌ Pending | تشغيل migration + إضافة `failed_at` |

### ترتيب الـ Migrations المطلوبة

1. **تشغيل الموجود**: `php artisan migrate` (لتشغيل `2027_01_01_000001_create_delivery_management_tables`)
2. **migration جديد 1**: إضافة `idempotency_key` إلى `orders` و `invoices`
3. **migration جديد 2**: إضافة `UNIQUE` constraint على `payments.reference_number`
4. **migration جديد 3**: إضافة الحقول المفقودة إلى `delivery_trips` و `delivery_trip_stops`
5. **migration جديد 4**: إضافة قيود الفهارس لمنع ازدواجية الطلب في المسارات النشطة

### التوافق الخلفي

- جميع التغييرات المقترحة هي `ADD COLUMN` أو `ADD INDEX` — لا تؤثر على البيانات الحالية
- `idempotency_key` يجب أن يكون `nullable` للتوافق مع الطلبات الحالية
- `UNIQUE` constraint على `reference_number` يجب أن يكون `WHERE reference_number IS NOT NULL` (unique index مع شرط)

### خطة Rollback

- كل migration يجب أن يكون له `down()` method يعكس التغيير
- `UNIQUE` index يمكن إزالته بـ `$table->dropUnique(...)`

---

## 9. Security and Concurrency Review

### سيناريوهات التكرار والخطورة

| السيناريو | الخطر | الحماية الحالية | الحماية المطلوبة |
|-----------|-------|----------------|-----------------|
| **تكرار الطلب** | عالي | ❌ غير موجودة | Idempotency key + UNIQUE constraint |
| **تكرار الفاتورة** | عالي | ⚠️ `$order->invoice()->exists()` (غير آمن للتزامن) | Idempotency key + DB transaction + lockForUpdate |
| **تكرار الدفع** | عالي | ❌ غير موجودة | Idempotency key + فحص `paid_at` |
| **إسناد السائق مرتين** | عالي | ❌ غير موجودة | فحص `driver_id === null` + lockForUpdate |
| **إدخال الطلب في مسارين** | عالي | ❌ غير موجودة | فحص في Service + unique index شرطي |
| **تجاوز 3 طلبات** | متوسط | ❌ غير موجودة | Validation في Service |
| **تعديل مسار بدأ بالفعل** | متوسط | ❌ غير موجودة | فحص `started_at === null` |
| **تسليم الطلب مرتين** | عالي | ⚠️ فحص `status === OUT_FOR_DELIVERY` | فحص `delivered_at === null` + lockForUpdate |

### تحليل `OrderExecutionService.php`

```php
// سطر 17: lockForUpdate مستخدم — ✅ جيد
$order = Order::query()->lockForUpdate()->findOrFail($order->id);

// سطر 18: فحص مزدوج — ✅ جيد
$this->assertOrderCanAssemble($order);
$this->assertAssembler($assembler);

// سطر 18: فحص التكرار — ✅ جيد
if ($order->assembly_started_at) throw ...

// سطر 28: lockForUpdate مستخدم — ✅ جيد
$order = Order::query()->lockForUpdate()->findOrFail($order->id);

// سطر 30: فحص التكرار — ✅ جيد
if ($order->assembled_at) throw ...

// سطر 50: لا يوجد lockForUpdate — ❌ خطر
// سطر 52: لا يوجد فحص driver_id === null — ❌ خطر
$order->update(['driver_id' => $driver->id, ...]);

// سطر 59: فحص الحالة فقط — ⚠️ غير كافٍ
abort_unless($order->status === Order::STATUS_OUT_FOR_DELIVERY, ...);
// يجب إضافة: if ($order->delivered_at) throw ...
```

---

## 10. Testing Gap Analysis

### الاختبارات المطلوبة

| نوع الاختبار | الحالة | المطلوب |
|-------------|--------|---------|
| **Unit Tests** | ❌ غير موجودة | Models, Services, Discount Engine |
| **Backend Feature Tests** | ⚠️ موجودة جزئياً | `tests/Feature/CrmCustomerDirectoryTest.php`, `tests/Feature/DeliveryManagementAuthorizationTest.php`, `tests/Feature/DiscountAccountingTest.php` |
| **Integration Tests** | ❌ غير موجودة | API endpoints, database transactions |
| **Frontend Tests** | ❌ غير موجودة | Components, hooks, services |
| **E2E Tests** | ❌ غير موجودة | Full order lifecycle |
| **Concurrency Tests** | ❌ غير موجودة | Race conditions, duplicate prevention |

### اختبارات التزامن المطلوبة (Concurrency Tests)

1. **إنشاء فاتورتين لنفس الطلب** — محاكاة طلبين متزامنين
2. **تسجيل دفعتين بنفس reference_number** — محاكاة إدخال متزامن
3. **إسناد سائقين لنفس الطلب** — محاكاة طلبين متزامنين
4. **إدخال الطلب في مسارين** — محاكاة إنشاء مسارين متزامنين
5. **تسليم الطلب مرتين** — محاكاة تأكيدين متزامنين
6. **تجاوز حد 3 طلبات في المسار** — محاكاة إضافة متزامنة

---

## 11. Development Backlog

### Epic 1: Idempotency and Duplicate Prevention (P0)

| ID | العنوان | P | الوصف | Frontend/Backend/DB | الجهد |
|----|---------|---|-------|-------------------|-------|
| T-001 | إضافة idempotency_key للطلبات | P0 | إضافة حقل `idempotency_key` (string, unique, nullable) إلى جدول `orders` + التحقق في `OrderController@store` | Backend + DB | S |
| T-002 | إضافة idempotency_key للفواتير | P0 | إضافة حقل `idempotency_key` إلى `invoices` + التحقق في `InvoiceController@createFromOrder` | Backend + DB | S |
| T-003 | إضافة idempotency_key للمدفوعات | P0 | إضافة حقل `idempotency_key` إلى `payments` + التحقق في `InvoiceController@addPayment` | Backend + DB | S |
| T-004 | إضافة UNIQUE constraint على reference_number | P0 | إضافة unique index على `payments.reference_number` حيث `IS NOT NULL` | DB | S |
| T-005 | منع إسناد السائق مرتين | P0 | إضافة فحص `driver_id === null` + `lockForUpdate` في `OrderExecutionService@startDelivery` | Backend | S |
| T-006 | منع تسليم الطلب مرتين | P0 | إضافة فحص `delivered_at === null` + `lockForUpdate` في `OrderExecutionService@completeDelivery` | Backend | S |

### Epic 2: Delivery Routes (P0)

| ID | العنوان | P | الوصف | Frontend/Backend/DB | الجهد |
|----|---------|---|-------|-------------------|-------|
| T-007 | تشغيل migration delivery_management_tables | P0 | تشغيل `php artisan migrate` لإنشاء جداول `delivery_trips` و `delivery_trip_stops` | DB | S |
| T-008 | إضافة الحقول المفقودة لـ delivery_trips | P0 | إضافة `assigned_by`, `cancelled_at`, `cancellation_reason`, `max_stops` | Backend + DB | S |
| T-009 | إضافة failed_at لـ delivery_trip_stops | P0 | إضافة `failed_at` timestamp | Backend + DB | S |
| T-010 | تطبيق حد 3 طلبات في المسار | P0 | إضافة validation في `DeliveryTripController@store` و `addStop` | Backend | S |
| T-011 | منع إدخال الطلب في مسارين نشطين | P0 | إضافة فحص في Service + unique index شرطي | Backend + DB | M |
| T-012 | منع إسناد السائق لمسارين نشطين | P0 | إضافة فحص في `DeliveryTripController@update` | Backend | S |
| T-013 | منع تعديل المسار بعد البدء | P0 | إضافة فحص `started_at === null` في جميع دوال التعديل | Backend | S |

### Epic 3: Order Status Unification (P1)

| ID | العنوان | P | الوصف | Frontend/Backend/DB | الجهد |
|----|---------|---|-------|-------------------|-------|
| T-014 | توحيد حالات الطلب بين Frontend و Backend | P1 | تحديث `types.ts` لتطابق حالات Backend + إضافة ASSEMBLING و READY_FOR_DELIVERY | Frontend | M |
| T-015 | إضافة حالة ASSEMBLING | P1 | إضافة `STATUS_ASSEMBLING` في Order.php + تحديث `assembly_started_at` logic | Backend | S |
| T-016 | إضافة حالة READY_FOR_DELIVERY | P1 | إضافة `STATUS_READY_FOR_DELIVERY` في Order.php + تحديث `completeAssembly` logic | Backend | S |
| T-017 | تصحيح CANCELED → CANCELLED | P1 | توحيد التهجئة في `types.ts` | Frontend | S |

### Epic 4: Operations Dashboard Enhancement (P1)

| ID | العنوان | P | الوصف | Frontend/Backend/DB | الجهد |
|----|---------|---|-------|-------------------|-------|
| T-018 | إضافة عدد المسارات النشطة للـ KPI | P1 | إضافة `active_trips` إلى `OperationsKpis` + حسابها في `DeliveryOperationsController@dashboard` | Frontend + Backend | S |
| T-019 | إضافة متوسط الطلبات لكل مسار | P1 | إضافة `avg_orders_per_trip` إلى `OperationsKpis` | Backend | S |
| T-020 | إضافة الطلبات المتعثرة داخل المسارات | P1 | إضافة `failed_stops` إلى `OperationsKpis` | Backend | S |
| T-021 | تحسين أداء استعلامات dashboard | P1 | إضافة فهارس + حل N+1 queries | Backend | M |

### Epic 5: Testing (P1)

| ID | العنوان | P | الوصف | Frontend/Backend/DB | الجهد |
|----|---------|---|-------|-------------------|-------|
| T-022 | اختبارات Unit للـ Services | P1 | اختبارات لـ OrderExecutionService, InvoiceFromOrderService, CallCenterService | Backend | M |
| T-023 | اختبارات Concurrency | P1 | اختبارات للسيناريوهات المتزامنة (6 سيناريوهات) | Backend | L |
| T-024 | اختبارات API Feature | P1 | اختبارات لجميع endpoints العمليات | Backend | M |
| T-025 | اختبارات Frontend | P1 | اختبارات للمكونات والـ hooks | Frontend | M |

### Epic 6: Vehicle and Driver Validation (P1)

| ID | العنوان | P | الوصف | Frontend/Backend/DB | الجهد |
|----|---------|---|-------|-------------------|-------|
| T-026 | إضافة requires_vehicle للموظف | P1 | إضافة حقل `requires_vehicle` (boolean) إلى `employees` | Backend + DB | S |
| T-027 | منع تعيين سائق بدون vehicle_type | P1 | إضافة validation في `OrderExecutionService@startDelivery` | Backend | S |
| T-028 | ترتيب السائقين المتاحين | P1 | إضافة ترتيب حسب عدد الطلبات النشطة (الأقل أولاً) | Backend | S |

### Epic 7: Customer Management (P2)

| ID | العنوان | P | الوصف | Frontend/Backend/DB | الجهد |
|----|---------|---|-------|-------------------|-------|
| T-029 | منع إنشاء عملاء مكررين بالهاتف | P2 | إضافة فحص `phone` موجود مسبقاً في `CallCenterService@createCustomer` | Backend | S |
| T-030 | دعم الحلويات بالأوزان | P2 | إضافة حقل `weight_grams` إلى `order_items` + واجهة اختيار الوزن | Frontend + Backend | M |
| T-031 | دمج الأسطر المتكررة | P2 | إضافة خيار دمج/فصل في `useCart.ts` | Frontend | M |
| T-032 | إضافة صلاحية تعديل الإجمالي | P2 | إضافة permission `adjust-total` + التحقق في `OrderController` | Backend | S |

---

## 12. Recommended Implementation Order

### المرحلة 1: الأمان ومنع التكرار (P0 — يجب التنفيذ أولاً)

**المدة المقدرة: 3-5 أيام**

1. T-001: Idempotency key للطلبات
2. T-002: Idempotency key للفواتير
3. T-003: Idempotency key للمدفوعات
4. T-004: UNIQUE constraint على reference_number
5. T-005: منع إسناد السائق مرتين
6. T-006: منع تسليم الطلب مرتين

**السبب**: هذه التغييرات تمنع مخاطر مالية وتشغيلية حرجة. بدونها، أي خطأ في الشبكة أو ضغط على الخادم يمكن أن يسبب تكرار الفواتير والمدفوعات.

### المرحلة 2: مسارات التوصيل (P0)

**المدة المقدرة: 5-7 أيام**

1. T-007: تشغيل migration
2. T-008: إضافة الحقول المفقودة
3. T-009: إضافة failed_at
4. T-010: حد 3 طلبات
5. T-011: منع ازدواجية الطلب
6. T-012: منع ازدواجية السائق
7. T-013: منع تعديل المسار بعد البدء

**السبب**: مسارات التوصيل متعددة الطلبات هي الميزة الأساسية المطلوبة. يجب أن تكون كاملة وآمنة قبل الإطلاق.

### المرحلة 3: توحيد حالات الطلب (P1)

**المدة المقدرة: 2-3 أيام**

1. T-014: توحيد الحالات
2. T-015: إضافة ASSEMBLING
3. T-016: إضافة READY_FOR_DELIVERY
4. T-017: تصحيح CANCELED

**السبب**: بدون توحيد الحالات، ستعرض الواجهة حالات غير موجودة في قاعدة البيانات والعكس.

### المرحلة 4: تحسين لوحة العمليات (P1)

**المدة المقدرة: 3-4 أيام**

1. T-018: عدد المسارات النشطة
2. T-019: متوسط الطلبات لكل مسار
3. T-020: الطلبات المتعثرة
4. T-021: تحسين الأداء

### المرحلة 5: الاختبارات (P1)

**المدة المقدرة: 5-7 أيام**

1. T-022: Unit tests
2. T-023: Concurrency tests
3. T-024: API Feature tests
4. T-025: Frontend tests

### المرحلة 6: تحسينات إضافية (P2)

**المدة المقدرة: 4-5 أيام**

1. T-026 إلى T-032

---

## 13. Verified Discrepancies

| # | الادعاء | الحقيقة الموجودة | الملف ورقم السطر | التصحيح المقترح |
|---|---------|-----------------|-----------------|----------------|
| 1 | "حالات الطلب في الفرونت تطابق الباكند" | الفرونت يحتوي 12 حالة، الباكند 5 حالات فقط | `types.ts:7-20` vs `Order.php:23-27` | توحيد الحالات |
| 2 | "CANCELED هي التهجئة الصحيحة" | الباكند يستخدم `CANCELLED` (بحرفين L) | `types.ts:13` vs `Order.php:27` | تغيير `CANCELED` → `CANCELLED` |
| 3 | "ON_DELIVERY هي حالة التوصيل" | الباكند يستخدم `OUT_FOR_DELIVERY` | `types.ts:11` vs `Order.php:25` | تغيير `ON_DELIVERY` → `OUT_FOR_DELIVERY` |
| 4 | "PREPARING هي حالة التحضير" | الباكند يستخدم `PREPARATION` | `types.ts:9` vs `Order.php:24` | تغيير `PREPARING` → `PREPARATION` |
| 5 | "حالة ASSEMBLING موجودة" | غير موجودة في أي مصدر | — | إضافة `STATUS_ASSEMBLING` |
| 6 | "حالة READY_FOR_DELIVERY موجودة" | غير موجودة في أي مصدر | — | إضافة `STATUS_READY_FOR_DELIVERY` |
| 7 | "الـ reference_number فريد" | لا يوجد UNIQUE constraint | `payments.reference_number` | إضافة unique index |
| 8 | "الدفع محمي من التكرار" | لا يوجد idempotency_key | `InvoiceController.php:100-183` | إضافة idempotency |
| 9 | "الفاتورة محمية من التكرار" | الفحص `$order->invoice()->exists()` غير آمن للتزامن | `InvoiceController.php:49` | إضافة idempotency + lockForUpdate |
| 10 | "مسارات التوصيل جاهزة" | الـ migration Pending | `2027_01_01_000001_create_delivery_management_tables` | تشغيل migration |

---

## 14. Blockers and Open Decisions

### القرارات التي تمنع التنفيذ

| # | القرار | التأثير | الخيارات |
|---|--------|---------|---------|
| B-01 | **آلية Idempotency**: هل نستخدم UUID من العميل أم ننشئه من الباكند؟ | يؤثر على تصميم API والـ Frontend | (أ) Client-generated UUID — يسمح بإعادة المحاولة من العميل. (ب) Server-generated hash من محتوى الطلب — شفاف للعميل. |
| B-02 | **حالات الطلب النهائية**: هل نعتمد الحالات المقترحة (DRAFT → PENDING_PAYMENT → PREPARATION → ASSEMBLING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED) أم نبسطها؟ | يؤثر على كل من Frontend و Backend و Database | (أ) 7 حالات — دورة كاملة. (ب) 5 حالات — دورة مبسطة (حذف ASSEMBLING و READY_FOR_DELIVERY). |
| B-03 | **الحد الأقصى للمسار**: هل نجعل 3 قيمة افتراضية قابلة للتعديل من الإعدادات فوراً أم نثبته في الكود حالياً؟ | يؤثر على تصميم الإعدادات | (أ) ثابت 3 في الكود — بسيط. (ب) متغير في `delivery_trips.max_stops` — مرن. (ج) إعداد عام في `settings` table. |
| B-04 | **معالجة تعذر التسليم**: هل نعيد الطلب للمخزون أم نتركه معلقاً؟ | يؤثر على المخزون والمحاسبة | (أ) إعادة للمخزون — دقيق محاسبياً. (ب) تركه معلقاً — بسيط. |
| B-05 | **اختبارات التزامن**: هل نستخدم Laravel's built-in testing مع database transactions أم نحتاج أداة خارجية؟ | يؤثر على وقت التطوير | (أ) Laravel testing + DB transactions — كافٍ. (ب) أداة مثل Laravel Dusk أو أداة خارجية. |

---

## الخلاصة

### أول Ticket يجب تنفيذه في المرحلة التالية

**T-001: إضافة idempotency_key للطلبات**

**السبب**: هذا هو الأساس الذي تبنى عليه جميع حمايات التكرار الأخرى. بدون idempotency، أي خطأ في الشبكة يمكن أن يسبب إنشاء طلبات مكررة.

**معايير القبول**:
1. إضافة حقل `idempotency_key` (string, 255, unique, nullable) إلى جدول `orders`
2. إضافة validation في `StoreOrderRequest` لقبول `idempotency_key` كـ string optional
3. إضافة فحص في `OrderController@store`: إذا وُجد طلب بنفس `idempotency_key`، أعد الطلب الموجود بدلاً من إنشاء جديد
4. إضافة اختبار يثبت أن الطلب المتكرر بنفس `idempotency_key` لا ينشئ طلباً جديداً
5. إضافة اختبار يثبت أن طلبين مختلفين بنفس `idempotency_key` في نفس الوقت يعيد الأول فقط

---

*هذا التقرير مبني بالكامل على الكود الفعلي في المسارين:*
- *Frontend: `o2-company-front/src/`*
- *Backend: `o2-system-backend/app/`*
- *Routes: `o2-system-backend/routes/api.php`*
- *Migrations: `o2-system-backend/database/migrations/`*