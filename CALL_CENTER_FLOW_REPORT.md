# تقرير تحليل سيناريو الكول سنتر (Call Center) - نظام O2 ERP

## نظرة عامة

هذا التقرير يوثق تحليلاً شاملاً لتدفق العمل في الكول سنتر ضمن نظام O2 ERP، مع التركيز على:
- إنشاء الفواتير (Invoice Creation)
- التنقل بين حالات الطلب (Order Status Transitions)
- تجميع الطلبات (Order Aggregation / Assembly)
- تسكير الفواتير (Invoice Closing / Settlement)

---

## 1. هيكل النظام (System Architecture)

### 1.1 الطبقات (Layers)

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Vite)                       │
│  - store.tsx (Zustand + Context API)                        │
│  - components/POS/pos.tsx (واجهة الكاشير)                   │
│  - components/CallCenter/ (لوحة الكول سنتر)                 │
│  - hooks/useCart.ts, useOrders.ts, useCallCenter.ts         │
│  - services/orderService.ts, callCenterService.ts           │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Laravel Sanctum)                                │
│  - routes/api.php (تعريف المسارات)                          │
│  - Controllers: OrderController, InvoiceController,         │
│    SettleController, CallCenterController                   │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (Business Logic)                             │
│  - InvoiceFromOrderService (إنشاء الفاتورة من الطلب)        │
│  - SettlementEngine (تسوية الفواتير والدفعات المختلطة)      │
│  - OrderExecutionService (إدارة تنفيذ الطلب)                │
│  - DiscountEngineService (محرك الخصم)                       │
│  - AccountingService (القيد المحاسبي)                       │
├─────────────────────────────────────────────────────────────┤
│  Models (Database Layer)                                    │
│  - Order, OrderItem, ProductionTicket, ProductionTicketItem │
│  - Invoice, InvoiceItem, Payment                            │
│  - Customer, CustomerAddress, CustomerNote, CustomerOccasion│
│  - Transaction (قيد محاسبي), PaymentMethod                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 الأدوار المسموح لها بالوصول للكول سنتر

- `CALL_CENTER` - وكيل الكول سنتر
- `SUPER_ADMIN` - مدير النظام
- `BRANCH_MANAGER` - مدير الفرع
- `CASHIER` - الكاشير (عبر POS)

المسارات المخصصة للكول سنتر في `/pos/call-center/`:
- `/pos/call-center/pos` - واجهة الطلبات
- `/pos/call-center/customers` - إدارة العملاء
- `/pos/call-center/complaints` - إدارة الشكاوى
- `/pos/call-center/employees` - موظفو الكول سنتر
- `/pos/call-center/occasions` - المناسبات

---

## 2. دورة حياة الطلب (Order Lifecycle)

### 2.1 حالات الطلب (Order Statuses)

```
PENDING_PAYMENT ──► PREPARATION ──► OUT_FOR_DELIVERY ──► DELIVERED
       │                                                      │
       └──► CANCELLED (في أي وقت قبل DELIVERED)              │
                                                              │
  ملاحظة: DELIVERED = COMPLETED (نفس الشيء في النظام)
```

### 2.2 حالات تذاكر الإنتاج (Production Ticket Statuses)

```
pending ──► preparing ──► ready ──► served
  │                                    │
  └──► cancelled                       │
                                       │
  ملاحظة: served = تم تسليم الطلب للعميل
```

### 2.3 حالات الفاتورة (Invoice Statuses)

```
draft ──► awaiting_approval ──► partial ──► paid
  │                              │            │
  └──► cancelled                 └──► paid    │
                                              │
  الحالات التلقائية:                           │
  - لا دفعات → awaiting_approval              │
  - دفعات جزئية → partial                     │
  - مدفوع بالكامل → paid ──────────────────────┘
```

### 2.4 حالات عناصر الطلب (Order Item Statuses)

```
pending ──► ready ──► served ──► collected
  │                                    │
  └──► cancelled                       │
                                       │
  ملاحظة: collected = تم تجميع الطلب من قبل ORDER_AGGREGATOR
```

---

## 3. تدفق العمل الكامل (Complete Workflow)

### 3.1 السيناريو الكامل من البداية إلى النهاية

```
┌─────────────────────────────────────────────────────────────────────┐
│  المرحلة 1: إنشاء الطلب (Order Creation)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [وكيل الكول سنتر]                                                  │
│       │                                                             │
│       ├── 1.1 البحث عن العميل (Customer Search)                     │
│       │     - API: GET /call-center/customers/search?q=             │
│       │     - يعرض: الاسم، الهاتف، الموبايل، الكود، الحالة،         │
│       │              المدينة، العنوان، الفرع، نقاط الولاء            │
│       │     - البحث يتم بعد 400ms من التوقف عن الكتابة (debounce)   │
│       │                                                             │
│       ├── 1.2 عرض ملف العميل (Customer Profile)                     │
│       │     - API: GET /call-center/customers/{id}/profile          │
│       │     - يعرض: الرصيد، الحد الائتماني، إجمالي الطلبات،         │
│       │              إجمالي الإنفاق، متوسط قيمة الطلب،               │
│       │              تاريخ أول وآخر طلب، الشكاوى المفتوحة            │
│       │                                                             │
│       ├── 1.3 عرض تنبيهات العميل (Customer Alerts)                  │
│       │     - API: GET /call-center/customers/{id}/alerts           │
│       │     - أنواع التنبيهات: info, warning, critical              │
│       │                                                             │
│       ├── 1.4 إنشاء طلب جديد (Create Order)                         │
│       │     - API: POST /orders                                     │
│       │     - الحالة الابتدائية: PENDING_PAYMENT                    │
│       │     - البيانات: order_type, source='call_center',           │
│       │       customer_id, customer_name, customer_phone,           │
│       │       call_center_agent_id, call_notes, delivery_notes      │
│       │                                                             │
│       └── 1.5 إضافة الأصناف للطلب (Add Items)                       │
│             - API: POST /orders/{order}/items                       │
│             - يتم جلب السعر من branch_item (priceForBranch)         │
│             - يسمح فقط في حالة PENDING_PAYMENT                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  المرحلة 2: تأكيد الدفع وإرسال الطلب للمطبخ (Payment & Confirm)    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [وكيل الكول سنتر / كاشير]                                          │
│       │                                                             │
│       ├── 2.1 تأكيد الدفع (Confirm Payment)                         │
│       │     - API: PUT /orders/{order}/confirm-payment              │
│       │     - الشروط: الحالة يجب أن تكون PENDING_PAYMENT            │
│       │     - يجب أن يحتوي الطلب على أصناف                          │
│       │     - النتائج:                                              │
│       │       • تحديث الحالة → PREPARATION                          │
│       │       • تحديث payment_status → PAID                         │
│       │       • تسجيل transaction_id و paid_at                      │
│       │       • إنشاء تذاكر الإنتاج (Production Tickets)            │
│       │                                                             │
│       └── 2.2 إنشاء تذاكر الإنتاج (Sync Production Tickets)        │
│             - لكل قسم (department) يتم إنشاء تذكرة منفصلة           │
│             - API: يتم داخلياً عبر syncProductionTickets()          │
│             - كل تذكرة تحتوي على أصناف القسم المختصة                │
│             - حالة التذكرة الابتدائية: pending                      │
│             - يتم إرسالها للطابعة/KDS الخاصة بكل قسم                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  المرحلة 3: تحضير الطلب في المطبخ (Kitchen Preparation)            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [طاهي / كوك]                                                       │
│       │                                                             │
│       ├── 3.1 بدء تحضير التذكرة (Start Preparing)                   │
│       │     - API: POST /production-tickets/{ticket}/start          │
│       │     - تحديث حالة التذكرة → preparing                        │
│       │                                                             │
│       ├── 3.2 تجهيز صنف (Mark Item Prepared)                        │
│       │     - API: POST /orders/{order}/items/{item}/prepared       │
│       │     - الشروط: الحالة PREPARATION                            │
│       │     - تحديث: item_prepared_at, prepared_duration_seconds    │
│       │     - إذا كانت كل أصناف التذكرة جاهزة → تحديث التذكرة ready │
│       │                                                             │
│       └── 3.3 تجهيز التذكرة كاملة (Mark Ticket Ready)               │
│             - API: POST /production-tickets/{ticket}/ready          │
│             - تحديث حالة التذكرة → ready                            │
│             - تسجيل ready_at                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  المرحلة 4: تجميع الطلب (Order Assembly)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [مجمع الطلبات - ORDER_AGGREGATOR]                                  │
│       │                                                             │
│       ├── 4.1 بدء التجميع (Start Assembly)                          │
│       │     - API: PATCH /operations/orders/{order}/assembly/start  │
│       │     - الشروط: الحالة PREPARATION                            │
│       │     - يجب أن يكون الموظف assembler ومفعل                    │
│       │     - تحديث: assembly_started_at, assembler_id              │
│       │     - تسجيل حدث: assembly_started                           │
│       │                                                             │
│       ├── 4.2 تجميع الأصناف (Collect Items)                         │
│       │     - API: POST /orders/{order}/items/{item}/prepared       │
│       │     - أو عبر واجهة المجمع في الفرونت: collectOrderItemByAggregator
│       │     - تحديث حالة الصنف → collected                          │
│       │     - إذا كانت كل الأصناف collected/ready → تحديث الطلب     │
│       │                                                             │
│       └── 4.3 إنهاء التجميع (Complete Assembly)                     │
│             - API: PATCH /operations/orders/{order}/assembly/complete
│             - الشروط:                                               │
│               • جميع الأصناف مستلمة (item_prepared_at not null)     │
│               • لم يتم إنهاء التجميع مسبقاً                         │
│             - تحديث: assembled_at, assembled_by,                    │
│               assembly_duration_seconds                             │
│             - تحديث جميع التذاكر → ready                            │
│             - تحديث جميع الأصناف → ready                            │
│             - تسجيل حدث: assembly_completed                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  المرحلة 5: التوصيل (Delivery) - للطلبات الخارجية                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [مندوب التوصيل]                                                    │
│       │                                                             │
│       ├── 5.1 تعيين مندوب التوصيل (Assign Driver)                   │
│       │     - API: PATCH /operations/orders/{order}/assign-delivery │
│       │     - تحديث: driver_id, delivery_employee_name,            │
│       │       delivery_assigned_by, delivery_started_at             │
│       │     - تحديث الحالة → OUT_FOR_DELIVERY                      │
│       │                                                             │
│       └── 5.2 تأكيد التسليم (Mark Delivered)                        │
│             - API: POST /orders/{order}/delivered                   │
│             - الشروط: الحالة OUT_FOR_DELIVERY                       │
│             - تحديث: delivered_at, delivery_duration_seconds        │
│             - تحديث الحالة → DELIVERED                              │
│             - تحديث التذاكر → served                                │
│             - تحديث الأصناف → served                                │
│             - تسجيل حدث: delivered                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  المرحلة 6: إنشاء الفاتورة (Invoice Creation)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [وكيل الكول سنتر / كاشير]                                          │
│       │                                                             │
│       ├── 6.1 إنشاء الفاتورة من الطلب (Create Invoice from Order)   │
│       │     - API: POST /orders/{order}/invoice                     │
│       │     - أو: POST /orders/{order}/close (نفس الشيء)            │
│       │     - الشروط:                                               │
│       │       • الطلب غير ملغي (ليس cancelled)                      │
│       │       • الطلب مقسم للأقسام (tickets موجودة)                 │
│       │       • لا توجد فاتورة مسبقة للطلب                          │
│       │     - إذا كان الطلب PENDING_PAYMENT → تحديث إلى PREPARATION │
│       │                                                             │
│       └── 6.2 آلية إنشاء الفاتورة (InvoiceFromOrderService)         │
│             - لكل صنف في الطلب:                                     │
│               1. حساب السعر الإجمالي (original_price * quantity)    │
│               2. تطبيق محرك الخصم (DiscountEngine)                   │
│                  - يبحث عن أفضل خصم للعميل/الموظف/المورد            │
│                  - بناءً على: القسم، الصنف، الفرع                   │
│               3. إنشاء بند في الفاتورة (InvoiceItem)                 │
│                  - السعر الأصلي، الخصم، السعر النهائي               │
│                  - ربط الخصم المستخدم (discount_id)                 │
│               4. تسجيل استخدام الخصم (logDiscountUsage)             │
│             - حساب المجاميع:                                        │
│               • subtotal = مجموع الأسعار الأصلية                    │
│               • engine_discount = خصم المحرك                        │
│               • manual_discount = خصم يدوي من الطلب                 │
│               • total_discount = engine + manual                    │
│               • total = subtotal - total_discount                   │
│             - مزامنة مجاميع الطلب مع الفاتورة                       │
│             - حالة الفاتورة الابتدائية: draft                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  المرحلة 7: تسوية الفاتورة (Invoice Settlement)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [وكيل الكول سنتر / كاشير]                                          │
│       │                                                             │
│       ├── الطريقة الأولى: إضافة دفعات منفردة (Add Payments)         │
│       │     - API: POST /invoices/{invoice}/payments                │
│       │     - الشروط: الفاتورة غير ملغاة وغير مدفوعة بالكامل       │
│       │     - المبلغ يجب ألا يتجاوز المتبقي                        │
│       │     - إذا أصبح المدفوع >= الإجمالي:                         │
│       │       • تحديث حالة الفاتورة → paid                         │
│       │       • تحديث closed_by, closed_at                         │
│       │       • تحديث الطلب: status=PREPARATION, payment_status=PAID│
│       │       • إنشاء القيد المحاسبي (Journal Entry)                │
│       │     - إذا كان المدفوع > 0: تحديث الحالة → partial          │
│       │                                                             │
│       ├── الطريقة الثانية: تسوية كاملة (Settlement Engine)          │
│       │     - API: POST /orders/{order}/settle                     │
│       │     - يدعم الدفعات المختلطة (Mixed Payments):               │
│       │       • نقدي (CASH)                                         │
│       │       • بطاقة (CARD)                                        │
│       │       • محفظة (WALLET)                                      │
│       │       • حساب عميل (CUSTOMER)                                │
│       │       • حساب مورد (SUPPLIER)                                │
│       │       • حساب موظف (EMPLOYEE)                                │
│       │     - الشروط:                                               │
│       │       • مجموع الدفعات = إجمالي الفاتورة (± 0.01)           │
│       │       • طرق الدفع من نوع entity تتطلب entity_type/entity_id │
│       │     - الخطوات:                                              │
│       │       1. إنشاء الفاتورة إذا لم تكن موجودة                   │
│       │       2. إنشاء جميع الدفعات                                 │
│       │       3. تحديث حالة الفاتورة → paid                        │
│       │       4. تحديث الطلب: status=PREPARATION, paid_at          │
│       │       5. إنشاء القيد المحاسبي الموحد                        │
│       │                                                             │
│       └── 7.3 القيد المحاسبي (Journal Entry)                        │
│             - يتم عبر AccountingService.createJournalEntryForInvoice│
│             - القيد المحاسبي:                                       │
│               • مدين: حساب الصندوق/البنك/العميل (حسب طريقة الدفع)   │
│               • دائن: حساب المبيعات (إيراد)                         │
│             - يمكن عرضه عبر: GET /invoices/{invoice}/journal-entry  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. تفاصيل API للكول سنتر

### 4.1 مسارات العملاء (Customer Routes)

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/call-center/customers/search?q=` | GET | البحث عن العملاء |
| `/call-center/customers` | POST | إنشاء عميل جديد |
| `/call-center/customers/analytics` | GET | إحصائيات العملاء |
| `/call-center/customers/top` | GET | أفضل العملاء |
| `/call-center/customers/{id}/profile` | GET | ملف العميل |
| `/call-center/customers/{id}/full-profile` | GET | الملف الكامل |
| `/call-center/customers/{id}/orders` | GET | طلبات العميل |
| `/call-center/customers/{id}/favorites` | GET | الأصناف المفضلة |
| `/call-center/customers/quick-create` | POST | إنشاء سريع |
| `/call-center/customers/{id}/occasions` | GET/POST | المناسبات |
| `/call-center/customers/{id}/notes` | GET/POST | الملاحظات |
| `/call-center/customers/{id}/important-notes` | GET | ملاحظات هامة |
| `/call-center/customers/{id}/addresses` | GET/POST | العناوين |
| `/call-center/customers/{id}/complaints` | GET | الشكاوى |
| `/call-center/customers/{id}/alerts` | GET | التنبيهات |

### 4.2 مسارات الطلبات (Order Routes)

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/orders` | GET | قائمة الطلبات |
| `/orders` | POST | إنشاء طلب |
| `/orders/{id}` | GET | تفاصيل الطلب |
| `/orders/{id}` | PUT | تحديث الطلب |
| `/orders/{id}/items` | POST | إضافة صنف |
| `/orders/{id}/items/{item}` | DELETE | حذف صنف |
| `/orders/{id}/confirm-payment` | PUT | تأكيد الدفع |
| `/orders/{id}/confirm` | POST | تأكيد الطلب (قديم) |
| `/orders/{id}/cancel` | POST | إلغاء الطلب |
| `/orders/{id}/void` | POST | إلغاء (للطلبات المتقدمة) |
| `/orders/{id}/invoice` | POST | إنشاء فاتورة |
| `/orders/{id}/close` | POST | إغلاق (نفس الفاتورة) |
| `/orders/{id}/settle` | POST | تسوية كاملة |
| `/orders/{id}/settlement` | GET | تفاصيل التسوية |
| `/orders/{id}/items/{item}/prepared` | POST | تجهيز صنف |
| `/orders/{id}/assembled` | POST | إنهاء تجميع |
| `/orders/{id}/delivered` | POST | تأكيد تسليم |
| `/orders/{id}/print-sections` | GET | أقسام الطباعة |
| `/orders/{id}/journal-entry` | GET | القيد المحاسبي |

### 4.3 مسارات الفواتير (Invoice Routes)

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/invoices` | GET | قائمة الفواتير |
| `/invoices/{id}/payments` | POST | إضافة دفعة |
| `/invoices/{id}/journal-entry` | GET | القيد المحاسبي |
| `/invoices/{id}/details` | GET | تفاصيل الفاتورة |
| `/invoices/{id}/products` | GET | منتجات الفاتورة |
| `/invoices/{id}/payments` | GET | دفعات الفاتورة |
| `/invoices/{id}/accounting` | GET | محاسبة الفاتورة |
| `/invoices/{id}/discounts` | GET | خصومات الفاتورة |
| `/invoices/{id}/timeline` | GET | الجدول الزمني |

### 4.4 مسارات العمليات (Operations Routes)

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/operations/dashboard` | GET | لوحة العمليات |
| `/operations/assemblers` | GET | قائمة المجمعين |
| `/operations/delivery/available` | GET | طلبات جاهزة للتوصيل |
| `/operations/orders/{id}/assembly/start` | PATCH | بدء التجميع |
| `/operations/orders/{id}/assembly/complete` | PATCH | إنهاء التجميع |
| `/operations/orders/{id}/assign-delivery` | PATCH | تعيين مندوب |
| `/operations/orders/{id}/events` | GET | أحداث الطلب |

---

## 5. سيناريوهات خاصة (Edge Cases)

### 5.1 إلغاء الطلب (Order Cancellation)

```
سيناريو: العميل يلغي الطلب بعد تأكيد الدفع

القيود:
- يمكن إلغاء الطلب فقط في حالة PENDING_PAYMENT أو PREPARATION
- لا يمكن إلغاء طلب في حالة DELIVERED أو OUT_FOR_DELIVERY

الإجراء:
1. API: POST /orders/{order}/cancel مع سبب الإلغاء
2. تحديث حالة الطلب → cancelled
3. تحديث جميع تذاكر الإنتاج → cancelled
4. تحديث جميع أصناف الطلب → cancelled
5. تسجيل حدث: cancelled مع سبب الإلغاء
6. تحرير الطاولة (إذا كان dine-in)
```

### 5.2 تعديل الطلب بعد التأكيد (Order Modification)

```
القيود:
- لا يمكن تعديل طلب في حالة DELIVERED أو CANCELLED
- يمكن إضافة أصناف فقط في حالة PENDING_PAYMENT
- يمكن حذف صنف فقط إذا لم يتم إرساله للمطبخ بعد (status = pending)

الإجراء للتسعير:
- API: POST /orders/{order}/sync-pricing
- يعيد حساب الخصومات والمجاميع
- يسمح فقط للطلبات غير المسلمة أو الملغاة
```

### 5.3 دمج الطلبات (Order Merging)

```
يتم على مستوى الفرونت (store.tsx):
1. دمج أصناف طلبين في طلب واحد
2. إلغاء الطلب المصدر
3. تحرير الطاولة المصدرة

ملاحظة: هذا يختلف عن دمج الطاولات (Table Merging)
```

### 5.4 تقسيم الطلب (Order Splitting)

```
يتم على مستوى الفرونت (store.tsx):
1. اختيار أصناف معينة من الطلب الأصلي
2. إنشاء طلب جديد بهذه الأصناف
3. تحديث الطلب الأصلي بالأصناف المتبقية
4. الحفاظ على نفس نوع الطلب
```

### 5.5 الدفعات المختلطة (Mixed Payments)

```
يدعم SettlementEngine الدفعات المختلطة:
- يمكن للعميل الدفع جزء نقدي وجزء من المحفظة
- يجب أن يكون مجموع الدفعات = إجمالي الفاتورة
- طرق الدفع من نوع entity (عميل/موظف/مورد) تتطلب entity_id

مثال:
{
  "payments": [
    { "payment_method_id": 1, "amount": 50.00 },  // نقدي
    { "payment_method_id": 5, "amount": 30.00,     // حساب عميل
      "entity_type": "customer", "entity_id": 12 }
  ]
}
```

### 5.6 المزامنة الغير متصلة (Offline Sync)

```
لحالات انقطاع الإنترنت:
- API: POST /orders/offline-deliveries/sync
- يستقبل مصفوفة من التوصيلات مع وقت التسليم
- يقوم بتحديث الطلبات واحداً تلو الآخر
```

---

## 6. تدفق الكول سنتر الكامل (Complete Call Center Flow)

### 6.1 السيناريو النموذجي (Typical Scenario)

```
1. استقبال المكالمة
   │
2. البحث عن العميل (رقم الهاتف / الاسم)
   │
3. عرض ملف العميل:
   ├── الرصيد والحد الائتماني
   ├── التنبيهات (شكاوى مفتوحة، ملاحظات هامة)
   ├── آخر الطلبات
   └── الأصناف المفضلة
   │
4. إنشاء طلب جديد:
   ├── اختيار نوع الطلب (توصيل / استلام)
   ├── اختيار عنوان التوصيل (من عناوين العميل المسجلة)
   ├── إضافة الأصناف (مع إمكانية إضافة ملاحظات)
   ├── تطبيق الخصم (يدوي أو تلقائي)
   └── إضافة ملاحظات الكول سنتر (call_notes)
   │
5. تأكيد الطلب وإرساله للمطبخ
   │
6. متابعة حالة الطلب:
   ├── في المطبخ (PREPARATION)
   ├── تم التجهيز (READY)
   ├── في التجميع (ASSEMBLY)
   ├── خارج للتوصيل (OUT_FOR_DELIVERY)
   └── تم التسليم (DELIVERED)
   │
7. إنشاء الفاتورة (تلقائي أو يدوي)
   │
8. تسوية الدفع:
   ├── نقدي / بطاقة / محفظة
   └── إنشاء القيد المحاسبي
   │
9. إغلاق الطلب
```

### 6.2 السيناريو مع الشكاوى (Complaint Scenario)

```
1. استقبال مكالمة شكوى
   │
2. البحث عن العميل والطلب المرتبط بالشكوى
   │
3. إنشاء شكوى جديدة:
   ├── API: POST /call-center/complaints
   ├── البيانات: customer_id, order_id, title, description,
   │            type, priority, severity, is_sensitive
   └── إذا كانت is_sensitive = true → تظهر تنبيه للكول سنتر
   │
4. تعيين الشكوى لموظف معين (assigned_to)
   │
5. متابعة الشكوى:
   ├── إضافة متابعات (followups)
   ├── تحديث الحالة
   └── إضافة ملاحظات الحل (resolution_notes)
   │
6. إغلاق الشكوى
```

---

## 7. ملخص الحالات والانتقالات (State Transition Summary)

### 7.1 الطلب (Order)

```
PENDING_PAYMENT ──[confirmPayment]──► PREPARATION
PENDING_PAYMENT ──[cancel]──────────► CANCELLED
PREPARATION ──────[startAssembly]───► PREPARATION (يبقى)
PREPARATION ──────[completeAssembly]─► PREPARATION (يبقى)
PREPARATION ──────[assignDelivery]──► OUT_FOR_DELIVERY
OUT_FOR_DELIVERY ─[markDelivered]───► DELIVERED
PREPARATION ──────[void]────────────► CANCELLED
DELIVERED ────────[void]────────────► (ممنوع)
```

### 7.2 تذكرة الإنتاج (Production Ticket)

```
pending ──[startPreparing]──► preparing
preparing ─[markReady]──────► ready
ready ─────[markServed]─────► served
pending ───[cancel]─────────► cancelled
preparing ─[cancel]─────────► cancelled
```

### 7.3 الفاتورة (Invoice)
   
```
draft ──────────────[approve]──────────► awaiting_approval
awaiting_approval ──[addPayment جزئي]──► partial
awaiting_approval ──[addPayment كامل]──► paid
partial ────────────[addPayment كامل]──► paid
draft ──────────────[voidFinancial]────► cancelled
awaiting_approval ─[voidFinancial]────► cancelled
paid ──────────────[voidFinancial]────► (ممنوع - حالة نهائية)
```

---

## 8. توصيات (Recommendations)

1. **توحيد مسارات API**: يوجد تكرار في المسارات (مثلاً `/orders/{order}/invoice` و `/orders/{order}/close` يؤديان لنفس الوظيفة). يفضل توحيدها.

2. **تحسين تجربة الكول سنتر**: إضافة إمكانية إنشاء طلب سريع من ملف العميل مباشرة، وعرض حالة الطلب بشكل لحظي.

3. **إدارة الخصومات**: توثيق أفضل لكيفية عمل محرك الخصم (DiscountEngine) لمساعدة وكلاء الكول سنتر على فهم الخصومات المتاحة.

4. **التقارير**: إضافة تقارير متخصصة للكول سنتر مثل:
   - عدد الطلبات لكل وكيل
   - متوسط وقت معالجة الطلب
   - أكثر الأصناف طلباً عبر الكول سنتر
   - تقارير الشكاوى والأداء

5. **التكامل مع أنظمة التوصيل الخارجية**: إضافة دعم للتكامل مع خدمات التوصيل الخارجية (مثل طلبات، كريم، أوبر إيتس).

6. **الإشعارات**: تفعيل إشعارات لحظية لوكلاء الكول سنتر عند تغير حالة الطلب (جاهز، خارج للتوصيل، تم التسليم).

---

## 9. خريطة API كاملة (Complete API Map)

```
POST   /api/login
POST   /api/logout
GET    /api/auth/me

── Orders ──
GET    /api/orders
POST   /api/orders
GET    /api/orders/{order}
PUT    /api/orders/{order}
POST   /api/orders/{order}/items
DELETE /api/orders/{order}/items/{orderItem}
PUT    /api/orders/{order}/confirm-payment
POST   /api/orders/{order}/confirm
POST   /api/orders/{order}/cancel
POST   /api/orders/{order}/void
POST   /api/orders/{order}/invoice
POST   /api/orders/{order}/close
POST   /api/orders/{order}/settle
GET    /api/orders/{order}/settlement
POST   /api/orders/{order}/items/{orderItem}/prepared
POST   /api/orders/{order}/assembled
POST   /api/orders/{order}/delivered
GET    /api/orders/{order}/print-sections
GET    /api/orders/{order}/journal-entry
POST   /api/orders/{order}/sync-pricing
POST   /api/orders/offline-deliveries/sync

── Invoices ──
GET    /api/invoices
POST   /api/invoices/{invoice}/payments
GET    /api/invoices/{invoice}/journal-entry
GET    /api/invoices/{invoice}/details
GET    /api/invoices/{invoice}/products
GET    /api/invoices/{invoice}/payments
GET    /api/invoices/{invoice}/accounting
GET    /api/invoices/{invoice}/discounts
GET    /api/invoices/{invoice}/timeline

── Production Tickets ──
GET    /api/production-tickets
POST   /api/production-tickets/{ticket}/start
POST   /api/production-tickets/{ticket}/ready
POST   /api/production-tickets/{ticket}/served

── Operations ──
GET    /api/operations/dashboard
GET    /api/operations/assemblers
GET    /api/operations/delivery/available
PATCH  /api/operations/orders/{order}/assembly/start
PATCH  /api/operations/orders/{order}/assembly/complete
PATCH  /api/operations/orders/{order}/assign-delivery
GET    /api/operations/orders/{order}/events

── Call Center ──
GET    /api/call-center/customers/search
POST   /api/call-center/customers
GET    /api/call-center/customers/analytics
GET    /api/call-center/customers/top
GET    /api/call-center/customers/{customer}/profile
GET    /api/call-center/customers/{customer}/full-profile
GET    /api/call-center/customers/{customer}/orders
GET    /api/call-center/customers/{customer}/favorites
POST   /api/call-center/customers/quick-create
GET    /api/call-center/customers/{customer}/occasions
POST   /api/call-center/customers/{customer}/occasions
GET    /api/call-center/customers/{customer}/notes
POST   /api/call-center/customers/{customer}/notes
GET    /api/call-center/customers/{customer}/important-notes
POST   /api/call-center/customers/{customer}/addresses
PATCH  /api/call-center/customer-addresses/{address}
POST   /api/call-center/customer-addresses/{address}/use
PATCH  /api/call-center/customer-occasions/{occasion}
DELETE /api/call-center/customer-occasions/{occasion}
GET    /api/call-center/occasions
GET    /api/call-center/customers/{customer}/addresses
GET    /api/call-center/customers/{customer}/complaints
GET    /api/call-center/customers/{customer}/alerts
GET    /api/call-center/orders/{order}
GET    /api/call-center/complaints
POST   /api/call-center/complaints
GET    /api/call-center/complaints/{complaint}
PATCH  /api/call-center/complaints/{complaint}
POST   /api/call-center/complaints/{complaint}/followups
GET    /api/call-center/complaints/{complaint}/timeline
```

---

## 10. استكشاف الأخطاء وإصلاحها (Troubleshooting Guide)

### 10.1 موظفي الدليفري لا يظهرون في قائمة "تعيين دليفري" (في AssemblerDashboard)

**الأعراض:** عند محاولة تعيين مندوب توصيل لطلب جاهز (بعد الضغط على "استدعاء دليفري")، لا تظهر قائمة المندوبين أو تظهر فارغة.

**مكان الكود المسؤول:**
- الفرونت: `AssemblerDashboard.tsx` سطر 186-189
  ```typescript
  const loadAvailableDrivers = async (order: OrderFromApi) => {
      setDrivers(await orderService.getAvailableDeliveryDrivers({ 
          branch_id: order.branch_id, order_id: order.id 
      }));
  ```
- API: `GET /operations/delivery/available` ← `DeliveryAssignmentService.php` سطر 16-38
- الباك إند: `DeliveryAssignmentService::availableDrivers()`

**الفحص خطوة بخطوة (الأسباب المحتملة من الأكثر شيوعاً للأقل):**

#### السبب 1 🔴: `operational_role` غير مضبوط
```sql
SELECT id, name, operational_role, is_operations_enabled, status, vehicle_type 
FROM employees;
```
- يجب أن يكون `operational_role = 'delivery_driver'` (بالضبط)
- إذا كان `'driver'` أو `'delivery'` أو `null` → لن يظهر

#### السبب 2 🔴: `is_operations_enabled = 0`
- الشرط في الكود: `->where('is_operations_enabled', true)`
- يجب أن تكون القيمة `1` في قاعدة البيانات

#### السبب 3 🔴: `vehicle_type` فارغ (NULL)
- الشرط في الكود: `->whereNotNull('vehicle_type')`
- القيم المقبولة: `bicycle`, `electric_bike`, `motorcycle`, `external`
- إذا كان `NULL` → لن يظهر! (وهذا هو السبب رقم 1)
- ✅ النظام يحاول التنبيه عن هذا التنبيه في Dashboard: "بيانات دليفري ناقصة"

#### السبب 4 🔴: `status` ليس `ACTIVE`
- الشرط: `->where('status', 'ACTIVE')`

#### السبب 5: المندوب مشغول (لديه طلب نشط `OUT_FOR_DELIVERY`)
- الشرط: `->when(! $includeBusy, fn ($q) => $q->whereDoesntHave('deliveryOrders', ...))`
- الـ API الحالي يستدعي بدون `include_busy` → القيمة `false`
- لو المندوب عنده طلب `OUT_FOR_DELIVERY` حالياً، لن يظهر في القائمة
- لكن **الأصل في التقرير هو عدم الظهور مطلقاً** وليس بسبب الانشغال

#### السبب 6 🔴: `BranchScope` العالمي (Global Scope) - السبب الحقيقي!
**هذا هو السبب الأكثر ترجيحاً في حالتك!**

في `Employee.php` سطر 16-19:
```php
protected static function booted(): void
{
    static::addGlobalScope(new BranchScope);
}
```

و `BranchScope.php` سطر 29:
```php
$builder->where($model->getTable().'.branch_id', $user->branch_id);
```

**المعنى:** أي استعلام على جدول `employees` يتم تلقائياً إضافة شرط:
```sql
WHERE employees.branch_id = {branch_id الخاص بالمستخدم المسجل دخوله}
```

لذا حتى لو كان الموظفين 14 (ابراهيم ابو غالي) و 15 (عز جبر) و 17 (بسس) لديهم كل الشروط الصحيحة (`operational_role='delivery_driver'`, `is_operations_enabled=1`, `status='ACTIVE'`, `vehicle_type` موجود)، **إذا كان `branch_id` الخاص بهم مختلف عن `branch_id` الخاص بالمستخدم الحالي (اللي مسجل دخول على AssemblerDashboard)، فلن يظهروا!**

**التحقق:**
```sql
SELECT id, name, operational_role, is_operations_enabled, status, vehicle_type, branch_id 
FROM employees 
WHERE operational_role = 'delivery_driver';
```

**الحل:**
1. تأكد من أن `branch_id` للموظفين (14, 15, 17) يطابق `branch_id` للمستخدم الحالي
2. أو اجعل `branch_id = NULL` للموظفين (لأن `BranchScope` لا يطبق الفلترة إذا كان `branch_id` فارغاً)
3. أو سجل الدخول كمستخدم `super-admin` (لأن `BranchScope` لا يطبق على `super-admin`)

```sql
-- الحل: تحديث branch_id ليطابق المستخدم الحالي
UPDATE employees SET branch_id = (SELECT branch_id FROM users WHERE id = ?) 
WHERE id IN (14, 15, 17);
```
(استبدل `?` بمعرف المستخدم الحالي)

### 🛠️ الحل الكامل

**الخطوة 1: تشغيل استعلام التأكد**
```sql
SELECT id, name, operational_role, is_operations_enabled, status, vehicle_type 
FROM employees;
```
تأكد من وجود موظفين بالقيم المطلوبة.

**الخطوة 2: تحديث البيانات (إذا لزم الأمر)**
```sql
UPDATE employees 
SET operational_role = 'delivery_driver',
    is_operations_enabled = 1,
    vehicle_type = 'motorcycle',   -- أو bicycle / electric_bike / external
    status = 'ACTIVE'
WHERE id = ?;
```
(استبدل `?` برقم معرف الموظف)

**الخطوة 3: تحقق من ظهورهم عبر API مباشرة**
افتح في المتصفح أو استخدم curl:
```
GET http://localhost:8000/api/operations/delivery/available
مع Header: Authorization: Bearer {token}
```
إذا كان الـ API يرجع قائمة فارغة → المشكلة في الباك إند (الشروط المذكورة أعلاه)
إذا كان الـ API يرجع بيانات → المشكلة في معالجة الاستجابة في الفرونت (نادر)

**الخطوة 4: إذا استمرت المشكلة - تفعيل وضع التصحيح**
أضف `include_busy=true` مؤقتاً لاختبار إذا المشكلة بسبب الانشغال:
```typescript
setDrivers(await orderService.getAvailableDeliveryDrivers({ 
    branch_id: order.branch_id, 
    order_id: order.id,
    include_busy: true   // ← أضف هذا للتجربة
}));
```

### 10.2 خطأ 422 عند إنشاء فاتورة

**الأعراض:** `POST /orders/{order}/invoice` يرجع HTTP 422 مع رسالة "الطلب غير مقسّم للأقسام"

**السبب:** يجب أن يكون الطلب قد تم تأكيده (confirmed) أولاً لإنشاء تذاكر الإنتاج.

**الحل:**
```
1. POST /orders/{order}/confirm-payment   ← ينشئ تذاكر الإنتاج
   { "transaction_id": "TXN-12345" }
   
2. POST /orders/{order}/invoice           ← ينشئ الفاتورة
```

### 10.3 خطأ 403 في الفواتير

**الأعراض:** `GET /api/invoices` يرجع HTTP 403

**السبب:** المستخدم الحالي ليس لديه صلاحية `manage-invoices` أو `access-call-center`.

**الحل:** إضافة الصلاحية المناسبة للمستخدم عبر واجهة إدارة الأدوار والصلاحيات.

### 10.4 مجمع الطلبات لا يرى جميع الطلبات

**الأعراض:** مجمع الطلبات (ORDER_AGGREGATOR) لا يرى الطلبات في لوحة العمليات.

**الفحص:**
1. تحقق من أن `operational_role = 'assembler'` للموظف
2. تحقق من أن `is_operations_enabled = 1`
3. الطلبات تظهر فقط إذا كانت في حالة `PREPARATION` (ولم يتم تجميعها بعد)
4. إذا كان هناك `branch_id` محدد، يرتبط بفرع المستخدم

### 10.5 خطأ في مزامنة التسعير

**الأعراض:** `POST /orders/{order}/sync-pricing` يرجع خطأ.

**السبب:** لا يمكن تعديل تسعير طلب في حالة `DELIVERED` أو `CANCELLED`.

**الحل:** تأكد من أن الطلب لا يزال في حالة `PENDING_PAYMENT` أو `PREPARATION`.

---

## 11. المصطلحات (Glossary)

| المصطلح | المعنى |
|---------|--------|
| PENDING_PAYMENT | الطلب قيد الانتظار للدفع - يمكن تعديله |
| PREPARATION | الطلب في المطبخ قيد التحضير |
| OUT_FOR_DELIVERY | الطلب خارج للتوصيل |
| DELIVERED | تم تسليم الطلب للعميل (حالة نهائية) |
| CANCELLED | تم إلغاء الطلب |
| Production Ticket | تذكرة إنتاج - تمثل جزء من الطلب لقسم معين |
| Assembly | تجميع - عملية تجهيز الطلب للتوصيل |
| Settlement | تسوية - عملية الدفع وإغلاق الفاتورة |
| Journal Entry | قيد محاسبي - تسجيل المعاملة في الدفاتر المحاسبية |
| Discount Engine | محرك الخصم - نظام تلقائي لحساب الخصومات |
| Entity Payment | دفعة مرتبطة بكيان (عميل/موظف/مورد) |