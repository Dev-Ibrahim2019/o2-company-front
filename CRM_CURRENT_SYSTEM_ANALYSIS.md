# CRM Current System Analysis

تاريخ التحليل: 2026-07-27  
النطاق: `o2-system-backend` و`o2-company-front`  
المنهج: قراءة ثابتة للكود، تعريفات الجداول، الـRoutes والخدمات والواجهات. لم تُنفذ migrations أو seeders ولم تُعدّل البيانات.

## 1. Executive Summary

### الحكم التنفيذي

النظام **قابل للبناء عليه، لكنه غير جاهز لبدء CRM شامل مباشرة**. التقدير التقريبي للجاهزية هو **55%**:

- 70% من الأساس التشغيلي موجود: عميل، طلبات، فواتير، دفعات، دفتر مساعد، عناوين، شكاوى، مناسبات، ملاحظات، كول سنتر.
- 40% فقط من متطلبات الاتساق والأمان والهوية مكتمل: لا توجد هوية هاتف موحدة على مستوى قاعدة البيانات، علاقات `Customer` ناقصة، صلاحيات CRM غير دقيقة، والولاء مجرد رصيد.

### إجابات الأسئلة التنفيذية

1. **هل النظام جاهز؟** جزئيًا. يصلح للتوسعة بعد Sprint تأسيسي لإصلاح الهوية والعلاقات والأمان.
2. **نسبة الجاهزية:** 55% (INFERENCE مبنية على الوحدات الموجودة مقابل الفجوات الحرجة).
3. **الأجزاء القابلة لإعادة الاستخدام:** `customers`، `orders`، `invoices`، `payments`، `transactions/entries`، `CustomerAccountingService`، `SubledgerService`، جداول العناوين والشكاوى والملاحظات والمناسبات، وبنية Call Center الحالية.
4. **أكثر الأجزاء خطورة:** Routes العملاء المالية العامة، تعارض/غياب علاقات Eloquent في `Customer`، تكرار الهاتف دون قيد canonical موحد، Migration chain غير مستقرة، وعدم وجود payment allocations.
5. **نموذج العميل:** يحتاج **EXTEND + REFACTOR** لا إعادة بناء كاملة.
6. **ربط العميل بالطلبات:** موجود عبر `orders.customer_id` لكنه اختياري، مع نسخ نصية `customer_name/customer_phone`؛ لا توجد سياسة ربط تلقائي موحدة.
7. **تصميم الذمم:** أساسه صحيح (Control Account 1120 + subledger)، لكنه غير مثبت بمطابقة دورية ولا يغطي تخصيص الدفعات للفواتير.
8. **Customer 360:** يمكن بناء نسخة تشغيلية بعد إصلاح علاقات `Customer` وحماية البيانات؛ الموجود حاليًا جزئي.
9. **الولاء قبل إصلاح الهوية:** لا. سيؤدي ذلك إلى نقاط موزعة على عملاء مكررين.
10. **ربط الموقع الخارجي:** ممكن عبر API/بوابة منفصلة، وليس عبر Routes QR الحالية وحدها. قرار الشبكة/Cloud Sync ما زال مطلوبًا.
11. **أول مرحلة موصى بها:** “Customer Identity & Security Foundation”.
12. **ملفات/جداول المرحلة الأولى:** `customers`, `orders`, `invoices`, `payments`, `customer_addresses`؛ نماذج `Customer/Order/Invoice/Payment`؛ Controllers العملاء والكول سنتر؛ `PhoneNormalizer`؛ Routes والصلاحيات؛ خدمات وأنواع العملاء في الواجهة.

### Critical findings

| الخطورة | Finding | Evidence | Status |
|---|---|---|---|
| Critical | CRUD والتقارير والعمليات المالية للعملاء غير محاطة بـ`auth:sanctum` | `routes/api.php:305-323` بعد إغلاق مجموعة المصادقة عند السطر 246 | BROKEN SECURITY |
| Critical | الكول سنتر يستدعي علاقات غير موجودة في Model العميل | `CallCenterController.php:78-86`, `CallCenterService.php:69,88` مقابل `app/Models/Customer.php` الذي يعرّف `branch` و`salesperson` فقط | BROKEN |
| High | إنشاء العميل له مساران وقاعدتا تطبيع/تحقق مختلفتان | `CustomerFinancialController::store()` و`CallCenterController::storeCustomer()` | DUPLICATED DOMAIN LOGIC |
| High | لا يوجد قيد Unique موحد للهاتف ولا `normalized_phone` | migrations `customers`؛ uniqueness موجود فقط في validation مسار الكول سنتر | DATA INTEGRITY GAP |
| High | رصيد الولاء رقم داخل `customers` بلا سجل حركة | `2026_07_11_000002_add_loyalty_points_to_customers_table.php` | PARTIALLY EXISTS |
| High | الذمم لا تملك Payment Allocation | لا يوجد جدول allocation بين الدفعات والفواتير؛ `payments.invoice_id` يربط الدفعة بفاتورة واحدة | MISSING |
| High | تسلسل migrations كان غير مستقر وترك schema جزئية | `customer_notes` يعتمد `orders`؛ حالة DB المفحوصة أظهرت `customer_notes` جزئيًا و`orders` غير موجود | BROKEN DEPLOYMENT |

## 2. System Architecture Inventory

### A. PROJECT ARCHITECTURE INVENTORY

#### Backend architecture

- PHP `8.2.12`، Laravel `12.56.0`، Sanctum `^4.0`، Spatie Permission `^6.25`.
- تنظيم **Mixed / Layer-based**:
  - Models في `app/Models`.
  - Controllers حسب Api/Admin/Auth.
  - Services للمحاسبة والكول سنتر والفواتير والطباعة.
  - Form Requests موجودة لبعض الوحدات، بينما Controllers العملاء تتحقق inline.
  - API Resources موجودة للطلبات والفواتير والدفعات، ولا يوجد CustomerResource.
- Repositories: **NOT FOUND**.
- DTOs: **NOT FOUND**.
- Actions: **NOT FOUND**.
- Enums PHP: **NOT FOUND**؛ الحالات موزعة كسلاسل وثوابت.
- Events/Listeners/Jobs/Notifications/Policies: **NOT FOUND** ضمن `app` في الجرد الحالي.
- Observers: `AuditObserver`, `CustomerObserver` (الأخير معطل وظيفيًا), `SupplierObserver`.

#### Frontend architecture

- React `18.2`, TypeScript `^5`, Vite `^5`, React Router `7.17`, Axios `1.17`, Zustand مثبت `5.0`.
- التنظيم **Mixed**: مكونات feature-like للكول سنتر والعملاء، مع services/types مركزية جزئيًا ومكونات كبيرة متعددة المسؤوليات.
- الحالة تعتمد أساسًا على local React state وContexts (`AuthContext`, Theme، POS contexts). Zustand مثبت لكن الاستخدام المركزي للـCRM غير مثبت من الجرد.
- `npx tsc --noEmit`: **PASS** بتاريخ التحليل.

#### Authentication architecture

- تسجيل الدخول يولّد Sanctum token؛ الواجهة تضيف Bearer token عبر `src/api/axios.ts`.
- Routes داخلية كثيرة تحت `auth:sanctum`.
- بوابة QR تحت `/api/customer/*` عامة عمدًا.
- **GAP:** Routes `/api/customers/*` المالية وCRUD عامة في الملف الحالي.

#### Authorization architecture

- Spatie roles/permissions.
- صلاحيات حالية عامة مثل `manage-customers`, `manage-accounting`, و`access-call-center/manage-call-center`.
- لا توجد Policies للعميل، ولا صلاحيات منفصلة للملاحظات الحساسة أو الرصيد أو التصدير أو الدمج.
- `BranchScope` مطبق على `Order` و`User`، وليس على `Customer`; الكول سنتر يضيف branch filtering يدويًا في directory فقط.

#### API architecture

- REST-like مع envelope موحد من `ApiController`.
- يوجد تكرار بين `/customers` (مالي/CRUD) و`/call-center/customers` (تشغيلي/CRM).
- لا توجد versioning (`/api/v1`) ولا Customer Resource contract مركزي.
- Pagination موجودة في directory والقائمة المالية؛ cursor pagination موجودة لطلبات العميل.

#### نقاط القوة

- فصل محاسبي جيد نسبيًا إلى Services.
- Subledger حقيقي في `entries`.
- بنية Call Center واسعة وقابلة لإعادة الاستخدام.
- Snapshot بيانات العميل داخل الطلب مفيد تاريخيًا.
- Audit trait موجود للعميل والمعاملات.

#### نقاط الضعف والمخاطر

- Controllers كبيرة وvalidation موزع.
- تشفير عربي مشوه ظاهر في عدة ملفات ومهاجرات.
- علاقات domain ناقصة رغم استخدام الواجهة والخدمات لها.
- الحالات والتصنيفات غير موحدة.
- migration timestamps وأسماء متكررة/ملفات غير قياسية (`database/migrations/2026_07_06_131304`).

## 3. Current Customer Domain

### B. CURRENT CUSTOMER DOMAIN ANALYSIS

#### CURRENT STATE

جدول `customers` موجود، Primary Key رقمي، Soft Deletes، code فريد، status، branch، salesperson، credit profile مبسط، وحقول اتصال مفردة.

الحقول الفعلية من migrations:  
`id, name, name_en, code, tax_number, phone, mobile, email, website, address, city, country, category, currency, status, risk_level, credit_limit, payment_terms, credit_days, opening_balance, is_opening_balance_posted, notes, gps_link, branch_id, salesperson_id, loyalty_points, meta, deleted_at, timestamps`.

Evidence:

- `database/migrations/2026_06_02_000004_create_customers_table.php`
- `2026_06_14_195000_update_customers_table.php`
- `2026_07_11_000002_add_loyalty_points_to_customers_table.php`
- `2026_07_27_000001_add_missing_customer_columns.php`

#### إجابات تفصيلية

1. جدول customers: EXISTS.
2. الحقول: كما أعلاه.
3. Soft Deletes: نعم، migration وModel.
4. حالة العميل: active/inactive/blocked.
5. فرد/شركة: **PARTIALLY EXISTS** عبر `category/tax_number/website`، لكن لا `customer_type`, legal name أو contacts.
6. الهاتف Unique: لا على DB؛ نعم فقط validation في مسار Call Center.
7. أرقام متعددة: phone + mobile فقط؛ لا جدول phones.
8. اختلاف الصيغ: خطر قائم.
9. التطبيع: يوجد `PhoneNormalizer`، لكن `CallCenterController` يطبق خوارزمية inline مختلفة، وCustomerFinancialController لا يطبق تطبيعًا.
10. العنوان: كلاهما؛ legacy `customers.address/city` وجدول مستقل.
11. عدة عناوين: نعم في `customer_addresses`.
12. افتراضي: `is_default`، لكن uniqueness غير مفروض بقاعدة البيانات.
13. فرع مفضل: `branch_id` يمكن تفسيره كذلك، لكن الدلالة غير موثقة: UNVERIFIED.
14. Segment: `category` فقط، وقيمه متعارضة بين المالي والكول سنتر.
15. Tags: NOT FOUND.
16. ملاحظات دائمة: `customers.notes` و`customer_notes`.
17. حساسة: `customer_notes.type=sensitive` و`customer_complaints.is_sensitive`، بلا permission مستقل.
18. سجل تفاعلات: Call tickets/followups جزئيًا؛ جدول customer_interactions غير موجود.
19. مناسبات: EXISTS.
20. تقييم: مكون Frontend `components/customer/rating-card.tsx`، لكن persistence/API: NOT FOUND.
21. شكاوى: EXISTS.
22. نقاط ولاء: عمود فقط.
23. حركات نقاط: NOT FOUND.
24. بيانات مالية مباشرة: limit/terms/opening balance؛ الرصيد محسوب من subledger.
25. تكرار البيانات: `orders.customer_name/customer_phone/customer_mobile/customer_address...` و`invoices.customer_name`.

| الخاصية | موجودة | مكانها | قابلة لإعادة الاستخدام | المشكلة | التوصية |
|---|---:|---|---:|---|---|
| الاسم | نعم | customers | نعم | لا legal/display split واضح | توسيع تدريجي |
| الهاتف | جزئي | phone/mobile | مؤقتًا | لا canonical DB uniqueness | customer_phones + normalized value |
| العناوين | نعم | customer_addresses + legacy fields | نعم | ازدواجية وعدم فرض default واحد | اعتماد الجدول وإبقاء legacy للتوافق المؤقت |
| نوع العميل | جزئي | category | لا كنوع قانوني | category مستخدم segment | customer_type مستقل |
| التصنيف | نعم | category | جزئي | قيم المالي والكول سنتر متعارضة | CustomerSegment أو enum موحد |
| الوسوم | لا | NOT FOUND | — | — | BUILD NEW |
| الملاحظات | نعم | customer_notes/customers.notes | نعم | صلاحية sensitive مفقودة | Extend + policy |
| المناسبات | نعم | customer_occasions | نعم | منطق التاريخ السنوي يحتاج اختبار | KEEP/EXTEND |
| التفضيلات | جزئي | notes/address fields/meta | لا | غير structured | customer_preferences أو JSON schema |
| الولاء | جزئي | loyalty_points | لا كدفتر | لا audit/transactions | LoyaltyAccount + Transactions |
| الحساب المالي | نعم | entries subledger + customers credit fields | نعم | لا reconciliation invariant | KEEP + hardening |
| الشكاوى | نعم | customer_complaints/followups | نعم | branch_id string وFKs جزئية | REFACTOR |
| التفاعلات | جزئي | call_tickets/followups | جزئي | لا timeline موحد | customer_interactions |

## 4. Customer and Order Flow

### C. CUSTOMER-ORDER INTEGRATION ANALYSIS

#### CURRENT ORDER-CUSTOMER FLOW

```text
[POS أو Call Center أو QR]
        ↓
[بحث/اختيار عميل اختياري]
        ↓
[POST /api/orders أو POST /api/customer/orders]
        ↓
[orders + order_items]
        ↓ confirm
[production_tickets]
        ↓ invoice
[invoices + invoice_items]
        ↓ payment
[payments + transaction/entries]
        ↓
[paid / served / cancelled]
```

| الخطوة | الملف/الدالة | API | الجدول/الحالة | الملاحظة |
|---|---|---|---|---|
| بحث العميل | `CallCenterService::searchCustomers` | `/call-center/customers/search` | customers | like search غير index-friendly |
| إنشاء العميل | `CallCenterController::storeCustomer/quickCreateCustomer` | POST call-center customers | customers/addresses | يمنع بعض التكرار في application فقط |
| إنشاء الطلب الداخلي | `OrderController::store` | POST `/orders` | orders=`pending` | customer_id اختياري |
| إنشاء Call Center | `CallCenterPOS.tsx:244-250` ثم orderService | POST `/orders` | snapshot + customer_id | نفس endpoint الأساسي |
| إنشاء QR | `CustomerPortalController::addSubOrder` | POST `/customer/orders` | pending_confirmation | غالبًا بلا customer_id |
| التأكيد | `OrderController::confirm` | `/orders/{order}/confirm` | confirmed/tickets | يدعم pending_confirmation |
| الفاتورة | `InvoiceController::createFromOrder` | `/orders/{order}/invoice` | invoice draft | يستخدم order.customer_id افتراضيًا |
| الدفعة | `InvoiceController::addPayment` | `/invoices/{invoice}/payments` | partial/paid | عدة دفعات ممكنة |
| الإلغاء | `OrderController::cancel` | `/orders/{order}/cancel` | cancelled | لا يوجد loyalty reversal لأنه لا يوجد ledger |

#### Findings

- `StoreOrderRequest` يقبل `customer_id` كـ`nullable|integer` دون `exists:customers,id`.
- الطلب يخزن Snapshot مفيدًا، لكن لا يضمن أن snapshot مطابق للعميل عند الإنشاء.
- لا يتم إنشاء عميل تلقائيًا في `OrderController::store`; الكول سنتر ينشئ/يختار قبل الطلب.
- لا توجد قاعدة موحدة لما يحدث عند رقم غير موجود عبر POS/QR.
- `source` أضيف لاحقًا مع default `call_center`، ما قد يصنف طلبات غير Call Center خطأ.
- حالات الطلب موزعة بين migration enum قديم، migrations تحولها إلى VARCHAR، Controller، Frontend types، وحالات uppercase للطاولات. يلزم canonical state machine.
- لا يوجد refund/partial return flow واضح في الملفات المفحوصة: NOT FOUND.
- إحصائيات العميل تستبعد `cancelled` فقط؛ ينبغي تعريف completion event مالي/تشغيلي قبل الاعتماد عليها.

## 5. Customer and Invoice Integration

- `InvoiceFromOrderService::createFromOrder()` يختار `data.customer_id ?? order.customer_id` ثم يحدّث الطلب بنفس المعرف (`lines 31,39,144`).
- Model `Order` يعرّف `invoice(): HasOne`، لذلك التصميم الحالي يقصد فاتورة واحدة لكل طلب، لكن `invoices.order_id` لا يحمل unique constraint؛ DB تسمح بأكثر من واحدة.
- `Invoice` يحتفظ `customer_id` و`customer_name` وentity polymorphic fields.
- `payments.invoice_id` إلزامي، وبالتالي كل Payment قياسي مرتبط بفاتورة واحدة.
- عدة دفعات مدعومة، والدفع الجزئي مدعوم عبر `partial`.
- البيع الآجل ممكن تشغيليًا ببقاء remaining amount، لكن سياسات الحد الائتماني والمنع قبل الطلب غير موجودة.
- لا يوجد ضمان FK واضح على `invoices.order_id/customer_id/branch_id` في migration الإنشاء.

**GAP:** يجب تثبيت invariant: customer على invoice يرث من order ولا يتغير بعد posting إلا بإجراء audited reassignment/reversal.

## 6. Customer Financial and Receivables Analysis

### D. CUSTOMER FINANCIAL AND RECEIVABLES ANALYSIS

#### CURRENT STATE

- Control Account: `1120`, “ذمم العملاء المدينة / Accounts Receivable”.
- الدفتر المساعد: `entries.subledger_type='customer'` و`subledger_id=customer.id`.
- الرصيد: `Customer::getBalanceAttribute()` → `SubledgerService::getCustomerBalance()`.
- العمليات: invoice, payment, credit/debit notes, opening balance عبر `CustomerAccountingService`.
- كشف الحساب، PDF/CSV/Excel، Aging، Collection موجودة.

#### معادلة المطابقة

المطلوب:

```text
GL(1120 posted entries)
= SUM(customer subledger balances on 1120)
```

لا يمكن إعلانها صحيحة حاليًا، للأسباب التالية:

1. `entries.subledger_*` nullable.
2. القيود اليدوية قد تستخدم 1120 بلا subledger.
3. لا يوجد FK polymorphic أو check constraint يضمن type/id.
4. يجب التأكد أن الاستعلامين يفلتران `transactions.status='posted'` بنفس الطريقة.
5. opening balances تعتمد وجود account `3999` وتعيين flag.
6. دفعات invoice تحمل entity/subledger اختياريًا.
7. لا توجد payment allocations مستقلة ولا unmatched cash workflow.

| الوظيفة المالية | الوضع الحالي | المصدر | المشكلة | المطلوب |
|---|---|---|---|---|
| رصيد العميل | EXISTS | entries/subledger | accessor قد يسبب N+1 بالقوائم | aggregate query/cache read model |
| كشف الحساب | EXISTS | SubledgerService | contract كبير ومتعدد modes | تثبيت contract واختبارات |
| أعمار الديون | EXISTS | CustomerAccountingService | aging مبني على قيود/وصف لا allocations | invoice-level aging |
| التحصيلات | EXISTS | payments + entries | لا allocation/unapplied cash | allocation ledger |
| البيع الآجل | PARTIAL | invoices remaining | لا credit approval | credit policy |
| الحد الائتماني | EXISTS | customers | لا enforcement | CreditService |
| شروط السداد | EXISTS | customers | strings فقط | policy + invoice due date |
| مطابقة الأستاذ | UNVERIFIED | 1120 vs subledger | لا reconciliation job/report | بناء reconciliation |
| تخصيص الدفعات | MISSING | — | payment مربوط بفاتورة واحدة فقط | customer_payment_allocations |
| الرصيد الافتتاحي | PARTIAL | customer + entry | duplicate source/flag | immutable opening transaction |

#### Performance

`CustomerFinancialController::index()` يحسب balance لكل عميل عبر accessor، ما يخلق N+1 queries. يلزم aggregate subquery أو balance projection قبل Customer 360 واسع.

## 7. Current Customer Frontend

### E. CURRENT CUSTOMER FRONTEND

#### واجهة الإدارة المالية

- `CustomerManagement.tsx` orchestrator.
- `customers/CustomerPortal.tsx` لوحة كبيرة متعددة tabs.
- `CustomerDirectory`, `CustomerProfile`, `CustomerDashboard`, `CustomerAgingReport`, `CustomerCollectionCenter`.
- `customerService.ts` contract مالي مستقل.

#### واجهة الكول سنتر

- CRM directory، phone search، profile drawer، quick preview، complaints، occasions، top customers، POS.
- Service مستقل وتعريفات TypeScript مستقلة في `components/call-center/services/callCenterService.ts`.

#### POS/Portal

- `components/POS/CustomerTab.tsx` لاختيار العميل.
- QR customer UI في `pages/customer` و`components/customer` مخصص للطاولة/القائمة/تتبع الطلب، وليس بوابة حساب عميل.

#### Findings

- يوجد تكرار واضح بين `Customer` في `customerService.ts` و`CustomerSearchResult/CustomerProfile` في call center service.
- `CustomerPortal.tsx` اسم مضلل: هو Portal إداري لحسابات العملاء، لا بوابة خارجية.
- Customer 360 الحالي موزع بين Admin Profile وCall Center Drawer.
- بعض مكونات customer العامة مثل `rating-card` تبدو UI-only بلا Backend.
- RTL موجود عمليًا عبر تصميم عربي، لكن نصوص source مشوهة encoding في عدة ملفات.
- Responsive يعتمد Tailwind classes، لكن المكونات الضخمة تحتاج اختبار viewport فعلي: UNVERIFIED.
- Frontend type-check ناجح، لكنه لا يثبت توافق runtime response.

**Recommendation:** إنشاء `src/features/customers` بعقود موحدة، مع adapters لشاشات Finance وCall Center بدل دمج صلاحياتهما.

## 8. Loyalty Readiness

### F. LOYALTY READINESS

CURRENT STATE:

- `customers.loyalty_points` فقط.
- يعرض في Call Center search/profile/directory.
- لا Models أو services أو routes لقواعد الولاء أو الحركات أو الاستبدال.

GAP:

- لا ledger، idempotency، expiry، tiers، rewards، reversal عند cancel/refund، أو audit reason.

قرار التصميم: **لا تعتمد الرصيد كSource of Truth**. أنشئ `loyalty_accounts` و`loyalty_transactions`، ويصبح الرصيد projection محسوبًا/مخزنًا مع reconciliation.

توقيت الإضافة المقترح: عند حدث مالي محدد مثل invoice paid/settled، مع idempotency key؛ القرار التجاري النهائي مطلوب.

## 9. Complaints and Follow-ups

### G. COMPLAINTS AND FOLLOW-UPS

- EXISTS: `customer_complaints`, `complaint_followups`.
- روابط customer، order، invoice، assigned employee، creator.
- status/priority/severity/sensitivity/alerts موجودة.
- Call Center APIs وواجهات الإدارة موجودة.

المشكلات:

- `branch_id` معرف string وليس FK.
- invoice_id بلا FK في migration الأساسي.
- `description` مطلوب في migration بينما Controller يقبل nullable في بعض التدفقات: يجب التحقق.
- أسماء aliases (`title/subject`, `resolution/resolution_notes`) تشير لتوافق رجعي متراكم.
- sensitive notes/complaints ليست محمية بصلاحية مستقلة.
- scope `alertable()` يحتاج grouping دقيق بسبب `orWhere`.

القرار: **KEEP + REFACTOR**، لا استبدال.

## 10. Customer Portal Readiness

### H. CUSTOMER PORTAL READINESS

CURRENT STATE:

- Public QR experience: table lookup, menu, add sub-order, call waiter, request bill، active order.
- لا `customer_portal_users`, OTP/password auth، sessions، portal profile، invoice history، statement أو loyalty wallet.
- التتبع الحالي مرتبط QR/table وليس هوية عميل.

TARGET:

- Portal bounded context منفصل يستخدم Customer Core read APIs.
- مصادقة مستقلة (OTP أو password decision).
- endpoints scoped strictly to authenticated customer.
- order status projection يخفي الحالات الداخلية.
- لا يُسمح للبوابة باستدعاء `/api/customers/{id}`.

التكامل الخارجي ممكن، لكن نمط direct/local vs cloud sync: **ARCHITECTURAL DECISION REQUIRED**.

## 11. Database ERD and Gap Analysis

### I. DATABASE AND DATA MODEL GAP ANALYSIS

#### Current ERD

```text
customers [EXISTS]
 ├── customer_addresses [EXISTS; Model relation on Customer MISSING]
 ├── customer_notes [EXISTS in code; current migration state BROKEN]
 ├── customer_occasions [EXISTS]
 ├── customer_complaints [EXISTS]
 │    └── complaint_followups [EXISTS]
 ├── orders.customer_id [PARTIALLY EXISTS]
 │    ├── order_items
 │    ├── production_tickets
 │    └── invoice [intended hasOne; DB uniqueness MISSING]
 │         └── payments [hasMany]
 └── entries(subledger_type, subledger_id) [INFERRED polymorphic link]

call_tickets [EXISTS]
 ├── customer_id
 └── linked_order_id
```

#### أهم خصائص الجداول

| الجدول | PK/FKs/Indexes | Nullability/Soft delete | المشكلة |
|---|---|---|---|
| customers | PK id; unique code; branch/salesperson FK | معظم CRM fields nullable; soft delete | phone غير unique/canonical |
| customer_addresses | customer FK | تفاصيل كثيرة nullable; soft delete | default uniqueness مفقودة |
| customer_notes | customer/order/user FKs | order/user nullable; soft delete | migration failed before orders |
| customer_occasions | customer/user FKs | user nullable; soft delete | annual date query edge cases |
| customer_complaints | customer FK; indexes status/priority | order/invoice nullable; soft delete | branch type وFKs غير متسقة |
| complaint_followups | complaint/user FK; indexes | no soft delete | جيد كأساس timeline |
| orders | PK; branch/dining/cashier؛ customer FK لاحق | customer اختياري; soft delete | schema ناتج migrations تراكمية |
| invoices | unique number؛ روابط رقمية | order/customer nullable | FKs/unique order غير مثبتة |
| payments | invoice FK؛ unique number | entity/subledger nullable | لا allocations |
| transactions | unique transaction_number؛ source morph | status/type/currency | migration يحتوي fence نصي مشبوه بالبداية |
| entries | transaction/account FKs؛ subledger indexes | subledger nullable | لا integrity constraint |

#### Target CRM ERD

```text
Customer
 ├── CustomerPhone*
 ├── CustomerAddress*
 ├── CustomerContact*
 ├── CustomerTagAssignment* ── CustomerTag
 ├── CustomerSegmentMembership* ── CustomerSegment
 ├── CustomerNote*
 ├── CustomerInteraction*
 ├── CustomerOccasion*
 ├── CustomerCreditProfile(0..1)
 ├── LoyaltyAccount(0..1) ── LoyaltyTransaction*
 ├── CustomerComplaint* ── ComplaintUpdate/Followup*
 └── CustomerPortalUser(0..n)

Customer ── Order* ── Invoice* ── PaymentAllocation* ── Payment
Customer ── Subledger Entries* ── AR Control Account 1120
```

| المقترح | القرار |
|---|---|
| customer_phones | BUILD NEW |
| customer_addresses | EXTEND EXISTING |
| customer_contacts | BUILD NEW للشركات |
| customer_tags/assignments | BUILD NEW |
| customer_segments | BUILD NEW أو formalize category |
| customer_notes | EXTEND EXISTING |
| customer_interactions | BUILD NEW |
| customer_occasions | KEEP/EXTEND |
| customer_credit_profiles | SPLIT من customers لاحقًا |
| customer_account_entries | NOT REQUIRED إذا entries subledger مُحكم |
| customer_payment_allocations | BUILD NEW |
| loyalty_accounts/transactions/rules/tiers/rewards/redemptions | BUILD NEW |
| customer_complaints | EXTEND EXISTING |
| complaint_updates | MERGE/EXTEND complaint_followups |
| customer_followups | BUILD NEW فقط للمتابعات العامة غير الشكاوى |
| customer_portal_users | BUILD NEW |
| customer_notifications | BUILD NEW |
| customer_feedback | BUILD NEW |

## 12. API Readiness Matrix

### J. CRM API READINESS MATRIX

| Method | Endpoint | Controller::method | المستخدمون الفعليون | الحالة |
|---|---|---|---|---|
| GET | `/api/customers` | CustomerFinancialController@index | غير محمي حاليًا | Working / Critical security |
| POST | `/api/customers` | store | غير محمي | Working / duplicated |
| GET | `/api/customers/{id}` | show | غير محمي | Working / sensitive |
| PUT/DELETE | `/api/customers/{id}` | update/destroy | غير محمي | Critical |
| GET | `/api/customers/aging-report` | agingReport | غير محمي | Working |
| GET | `/api/customers/collection-report` | collectionReport | غير محمي | Working |
| GET | `/api/customers/{id}/statement` | statement | غير محمي | Working / critical |
| GET | `/api/customers/{id}/orders` | — | — | Missing (يوجد تحت call-center فقط) |
| GET/POST | `/api/customers/{id}/addresses` | — | — | Missing بهذا المسار؛ call-center variant exists |
| GET | `/api/customers/{id}/complaints` | — | — | Missing بهذا المسار؛ call-center variant exists |
| GET | `/api/customers/{id}/loyalty` | — | — | Missing |
| GET | `/api/call-center/customers/directory` | CallCenterController@customerDirectory | call-center permission | Broken بسبب Model relations |
| GET | `/api/call-center/customers/{id}/full-profile` | customerFullProfile | call-center | Partial/Broken |
| CRUD | `/api/call-center/complaints*` | CallCenterController | call-center | Partial working |
| CRUD | `/api/call-center/...addresses` | CallCenterController | call-center | Partial working |
| CRUD | `/api/call-center/...occasions` | CallCenterController | call-center | Working candidate |
| GET/POST | `/api/customer/*` | CustomerPortalController | public QR guest | Working, not CRM portal |

API concerns:

- N+1 في list balances.
- `sort_by` في CustomerFinancialController يمر مباشرة إلى orderBy دون allowlist.
- directory يستخدم MySQL-specific `DATE_FORMAT`, ما يضعف portability/tests.
- response types مكررة ولا CustomerResource.
- frontend fallback في quick create يعالج خطأ schema `42S22` داخل client؛ هذا tech debt ويخفي اختلاف schema.

## 13. Security and Permissions

### K. CRM SECURITY AND PERMISSIONS ANALYSIS

| العملية | الحالي | الفجوة |
|---|---|---|
| رؤية/إنشاء/تعديل العملاء الماليين | Public routes فعليًا | auth + granular permissions |
| الحساب المالي/كشف الحساب | Public routes | `CRM_VIEW_FINANCIAL/STATEMENT` |
| الحد الائتماني | ضمن update عام | `CRM_MANAGE_CREDIT` + approval |
| الولاء | لا API | permissions مستقبلية |
| الملاحظات الحساسة | call-center permission عام | `CRM_VIEW_SENSITIVE_NOTES` |
| دمج العملاء | NOT FOUND | permission + audited workflow |
| التصدير | public statement export | `CRM_EXPORT_CUSTOMERS` |
| تقييد الفرع | غير متسق | policy/scope موحد |
| Audit | Customer Auditable | لا يسجل merge/loyalty لأنها غير موجودة |

الصلاحيات المستهدفة المذكورة في الطلب كلها **MISSING كصلاحيات مستقلة**. توجد بدائل coarse-grained فقط.

ملاحظة إضافية: Seeder يستخدم `access-call-center-interface` بينما Route middleware يتحقق من `access-call-center|manage-call-center`؛ الاسم الأول مختلف، وقد يعتمد النجاح على `manage-call-center` فقط.

## 14. Data Quality and Migration Risks

### L. DATA QUALITY AND MIGRATION READINESS

#### استعلامات Read-Only مقترحة

```sql
-- هواتف مكررة بالقيمة الحالية
SELECT phone, COUNT(*) c FROM customers
WHERE deleted_at IS NULL AND phone IS NOT NULL AND phone <> ''
GROUP BY phone HAVING COUNT(*) > 1;

-- تطبيع تقريبي للفحص فقط (يجب اعتماد دالة canonical لاحقًا)
SELECT REPLACE(REPLACE(REPLACE(REPLACE(phone,'+',''),' ',''),'-',''),'(', '') AS phone_key,
       COUNT(*) c
FROM customers
WHERE deleted_at IS NULL AND phone IS NOT NULL
GROUP BY phone_key HAVING COUNT(*) > 1;

SELECT COUNT(*) FROM customers
WHERE deleted_at IS NULL AND COALESCE(phone, mobile, '') = '';

SELECT id, order_number, customer_phone, customer_id
FROM orders
WHERE customer_id IS NULL AND customer_phone IS NOT NULL;

SELECT name, COUNT(*) c
FROM customers WHERE deleted_at IS NULL
GROUP BY name HAVING COUNT(*) > 1;

SELECT customer_id, COUNT(*) c
FROM customer_addresses WHERE deleted_at IS NULL AND is_default = 1
GROUP BY customer_id HAVING COUNT(*) > 1;

SELECT id, number FROM invoices WHERE customer_id IS NULL;

SELECT e.id, e.transaction_id, e.account_id
FROM entries e JOIN accounts a ON a.id=e.account_id
WHERE a.code='1120' AND (e.subledger_type <> 'customer' OR e.subledger_id IS NULL);

SELECT
  SUM(CASE WHEN e.debit>0 THEN e.debit ELSE -e.credit END) gl_ar
FROM entries e
JOIN transactions t ON t.id=e.transaction_id
JOIN accounts a ON a.id=e.account_id
WHERE a.code='1120' AND t.status='posted';
```

#### خطة ترحيل مستقبلية

1. Backup واختبار restore.
2. Data profiling read-only.
3. إضافة canonical phone nullable ثم backfill على batches.
4. duplicate candidate scoring بالهاتف ثم الاسم/العنوان.
5. merge workflow يحفظ survivor + aliases + audit.
6. ربط orders القديمة بثقة عالية فقط؛ البقية queue review.
7. مطابقة invoices/payments/subledger.
8. تحويل opening balances إلى transactions موثقة.
9. إنشاء opening loyalty transactions من الرصيد القديم.
10. reconciliation reports وrollback عبر mapping tables، لا delete مباشر.

## 15. Keep-Refactor-Replace Matrix

### M. KEEP-REFACTOR-REPLACE DECISION MATRIX

| الوحدة | الحالي | القرار | السبب | البديل المستهدف |
|---|---|---|---|---|
| العملاء | customers/Customer | EXTEND + REFACTOR | أساس جيد وهوية ضعيفة | Customer Core |
| العناوين | customer_addresses | KEEP/EXTEND | schema غني | canonical address service |
| الطلبات | orders/Order | KEEP/REFACTOR | دورة حياة موجودة | customer linking policy |
| الفواتير | invoices | KEEP/REFACTOR | وظائف واسعة وFKs ضعيفة | invariant محكم |
| الدفعات | payments | EXTEND | partial مدعوم | allocations/unapplied cash |
| الذمم | entries/subledger | KEEP/HARDEN | تصميم صحيح | reconciliation |
| كشف الحساب | SubledgerService | KEEP/REFACTOR | موجود وثري | stable query/read model |
| الولاء | loyalty_points | DEPRECATE as source | بلا ledger | BUILD NEW module |
| الشكاوى | complaints/followups | KEEP/REFACTOR | جاهزية عالية | Customer Care |
| المتابعات | complaint_followups فقط | EXTEND | مرتبطة بالشكاوى فقط | generic followups/interactions |
| Customer 360 | CallCenter profile + Admin profile | REFACTOR | تكرار وعلاقات مكسورة | unified read model |
| بوابة العميل | QR portal | SPLIT | ليست بوابة حساب | BUILD NEW portal |
| الصلاحيات | Spatie coarse permissions | EXTEND | بنية موجودة | CRM granular permissions |
| التقارير | financial reports | KEEP/OPTIMIZE | موجودة | secured optimized reporting |

## 16. Target CRM Architecture

### N. TARGET CRM ARCHITECTURE

```text
CRM
 ├── Customer Core
 │    ├── Identity (phones, contacts, dedupe)
 │    ├── Profile (addresses, tags, segments, occasions)
 │    └── Interaction Timeline
 ├── Customer Care
 │    ├── Complaints
 │    ├── Follow-ups
 │    └── Feedback
 ├── Customer Finance Facade
 │    ├── Credit policy
 │    ├── Statement/Aging read models
 │    └── Payment allocation
 ├── Loyalty
 │    ├── Ledger/rules/tiers/rewards
 │    └── Balance projection
 └── Portal
      ├── Customer auth
      ├── Orders/invoices/statements
      └── Notifications/loyalty wallet
```

حدود الوحدات:

- Orders يبقى مالك دورة الطلب والحالات.
- Accounting يبقى مالك GL/subledger/posting.
- CRM يملك هوية العميل والعلاقة والتصنيف والتفاعلات.
- POS/Call Center consumers للـCustomer Core.
- Delivery يملك التنفيذ والعنوان snapshot.
- Portal يقرأ projections ولا يملك البيانات المالية الأصلية.

PROPOSED services: `CustomerIdentityService`, `CustomerMergeService`, `CustomerCreditService`, `Customer360Query`, `PaymentAllocationService`, `LoyaltyLedgerService`.

## 17. Phased Implementation Roadmap

### O. PHASED CRM IMPLEMENTATION ROADMAP

| المرحلة | الهدف | أهم العمل | الاختبارات/القبول | المخاطر/rollback |
|---|---|---|---|---|
| 0 | تثبيت baseline | migration audit، API contracts، security inventory | clean migrate on disposable DB؛ route audit | لا بيانات؛ revert docs/config |
| 1 | توحيد الهوية والأمان | canonical phones، Customer relations، secure routes، granular permissions | duplicate tests، authorization، branch isolation | dual-write/backfill rollback |
| 2 | ربط orders/invoices | exists FK، snapshot policy، reassignment workflow | POS/Call Center/QR regression | feature flag |
| 3 | الذمم | GL-subledger reconciliation، allocations، credit policy | accounting invariants | additive tables + disable flag |
| 4 | Customer 360 | read model موحد وواجهة مشتركة | contract/performance/RTL | keep old screens |
| 5 | الولاء | ledger/rules/tiers | idempotency/reversal | shadow calculation |
| 6 | Customer Care | harden complaints + generic followups | sensitive access/workflow | old endpoints adapter |
| 7 | الشركات | contacts/legal/tax/credit workflow | company scenarios | additive |
| 8 | البوابة | auth/order tracking/history | tenant/IDOR/security | independent deployment |
| 9 | التحليلات | segments/cohorts/LTV | data validation | read-only projections |

لكل مرحلة يطبق التسلسل: Discovery → Database additive change → Backend contract → Frontend behind flag → Integration → Automated testing → Controlled data migration → Deployment → Verification. لا تبدأ المرحلة التالية قبل reconciliation وشروط القبول.

## 18. Risk Register

### P. RISK REGISTER

| الخطر | المصدر | الاحتمال | التأثير | المعالجة |
|---|---|---:|---:|---|
| تكرار العملاء | هواتف غير canonical | عالٍ | عالٍ | identity layer + unique canonical |
| عدم تطابق الذمم | nullable subledger/manual entries | متوسط | حرج | reconciliation gate |
| ربط طلب بعميل خاطئ | customer_id اختياري/snapshot حر | متوسط | عالٍ | verified selection/reassignment audit |
| تكرار النقاط | لا ledger/idempotency | عالٍ عند البناء | عالٍ | transaction ledger |
| تعارض الحالات | strings/migrations/UI | عالٍ | عالٍ | state machine contract |
| كشف بيانات مالية | public customers routes | قائم | حرج | إصلاح أمني قبل CRM |
| فشل المزامنة | local backend topology غير محسوم | متوسط | عالٍ | outbox/sync architecture |
| فقد بيانات | migration chain غير مستقرة | متوسط | حرج | clean migration test + backups |
| كسر POS/Call Center | types/endpoints duplicated | عالٍ | عالٍ | adapters + contract tests |
| أداء Customer 360 | N+1/aggregates | عالٍ | متوسط | read model/indexes |

## 19. Architectural Decisions Required

1. OTP أم password أم كلاهما للبوابة؟
2. هل هوية الهاتف canonical إقليمية (+970 افتراضيًا) أم متعددة الدول؟
3. متى تكتسب النقاط: payment، invoice paid، delivered، أم بعد فترة الإرجاع؟
4. هل البيع الآجل للأفراد أم للشركات/المعتمدين فقط؟
5. هل العملاء مشتركون بين الفروع أم توجد ownership + visibility rules؟
6. سياسة merge: من يوافق وما الحقول التي تفوز؟
7. direct internet access إلى Backend المحلي أم Cloud API/Sync؟
8. ما حالات الطلب العامة المعروضة للعميل؟
9. هل يمكن توزيع دفعة على عدة فواتير واستخدام رصيد غير مخصص؟
10. هل category الحالية segment يدوي أم تصنيف تشغيلي مؤقت؟

## 20. Recommended First Implementation Phase

### Sprint 1: Customer Identity & Security Foundation

مدة مقترحة: Sprint واحد 2–3 أسابيع، دون Customer 360 جديد.

#### Discovery

- تثبيت schema قابلة للبناء من الصفر على DB مؤقتة.
- استخراج profile للهواتف والتكرار.
- حصر consumers لكل customer endpoint.

#### Database

- تصميم `customer_phones` وcanonical format (PROPOSED).
- indexes/constraints بعد تنظيف البيانات.
- تثبيت FKs `orders.customer_id`, `invoices.customer_id` بطريقة additive.

#### Backend

- إضافة علاقات Customer الناقصة.
- توحيد التطبيع والإنشاء في Service واحد.
- حماية `/api/customers` بـSanctum وصلاحيات دقيقة.
- منع mass/unsafe sort وإضافة Form Requests/Resource.
- عدم بناء loyalty في هذا Sprint.

#### Frontend

- توحيد Customer identity types.
- جعل Finance وCall Center يستخدمان client مشتركًا مع view-specific DTOs.
- إزالة schema-error fallback بعد تثبيت backend.

#### Integration and testing

- Contract tests لجميع customer APIs.
- Authorization/IDOR/branch tests.
- duplicate phone format tests.
- regression: POS, Call Center, QR, invoice creation/payment.
- accounting reconciliation snapshot قبل/بعد.

#### Acceptance criteria

1. لا endpoint مالي للعميل يعمل دون مصادقة وصلاحية.
2. رقم canonical واحد لا ينشئ عميلين فعالين.
3. كل علاقة Customer المستخدمة في code معرفة ومختبرة.
4. إنشاء order/invoice بعميل غير موجود يفشل validation.
5. POS وCall Center يعملان دون تغيير contract غير مُدار.
6. تقرير GL/subledger لا يتغير بسبب Sprint الهوية.
7. migrations تعمل على قاعدة مؤقتة نظيفة وعلى نسخة مماثلة للإنتاج.

#### Rollback

- additive schema أولًا.
- dual-read قبل قطع legacy phone.
- feature flag للـidentity resolver.
- إبقاء phone/mobile والواجهات القديمة حتى اكتمال backfill.
- mapping/audit لكل merge؛ لا hard delete.

## FINAL RECOMMENDATION

### ما سنحتفظ به

- Customer الأساسي وSoft Deletes.
- Orders/Invoices/Payments.
- Control Account 1120 وentries subledger.
- CustomerAccountingService/SubledgerService.
- العناوين والمناسبات والشكاوى والمتابعات والملاحظات.
- Call Center routes/screens كقاعدة تشغيلية.

### ما سنوسعه

- هوية العميل والهواتف والعلاقات.
- Customer addresses/complaints/notes security.
- payment allocation والـcredit policy.
- Spatie permissions وbranch visibility.
- Audit والتقارير.

### ما سنعيد هيكلته

- مساري إنشاء العميل.
- Customer types في Frontend.
- Customer 360 read aggregation.
- حالات وتصنيفات الطلب/العميل.
- migration discipline والعقود.

### ما سنبنيه من جديد

- Loyalty ledger/rules/tiers/rewards.
- Customer interactions/tags/segments/company contacts.
- Payment allocations.
- Customer portal identity/auth/notifications.
- Customer merge workflow.

### ما يجب إصلاحه قبل CRM

1. إغلاق الثغرة في `/api/customers`.
2. إصلاح علاقات Customer المستخدمة.
3. تثبيت migration chain.
4. توحيد الهاتف ومنع التكرار.
5. إثبات GL = subledger.
6. تثبيت customer_id عبر order/invoice.

### أول Sprint مقترح

ابدأ بـCustomer Identity & Security Foundation أعلاه. لا تبدأ الولاء أو Portal أو إعادة تصميم Customer 360 قبل نجاح شروط القبول والمطابقة المحاسبية.
