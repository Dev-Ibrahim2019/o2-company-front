# Call Center Complete Implementation Report

## 1. Executive Summary

تم تنفيذ نواة مترابطة لنظام تذاكر المكالمات وCustomer 360، وإكمال العقد التشغيلي الأساسي للتجميع ومسارات التوصيل، وإضافة إلغاء السائق الخاضع للمراجعة. احتُفظ بجميع تعديلات المستخدم السابقة، ولم يتم Commit أو Push أو تشغيل Migration أو Seeder أو نشر Production.

التنفيذ الحالي يضيف مسارًا يدويًا للمكالمات وWebhook عامًا محميًا بتوقيع HMAC ومحدد المعدل، مع Polling كل 8 ثوانٍ. كما يضيف سجل Idempotency مركزيًا، لكن دمجه في جميع نقاط إنشاء الطلب/الفاتورة/الدفع القديمة يحتاج جولة لاحقة لأن تلك النقاط موزعة على خدمات قديمة متباينة.

## 2. Git Status قبل وبعد

- قبل: الفرع `call-center` في المشروعين، مع تعديلات مستخدم موجودة في 11 ملف Frontend و17 ملف Backend وعدة ملفات غير متتبعة.
- بعد: بقي الفرع نفسه ولم تُحذف أو تُسترجع أي تعديلات سابقة. أضيفت ملفات الكول سنتر والإلغاء والاختبارات الموضحة أدناه.

## 3. الملفات المنفذة وسببها

### Backend

- `app/Models/CallTicket.php`: نموذج تذكرة المكالمة وعلاقاتها.
- `app/Models/IdempotencyRecord.php`: سجل مركزي لمنع التكرار.
- `app/Models/OrderCancellationRequest.php`: دورة مراجعة الإلغاء.
- `app/Services/Support/PhoneNormalizer.php`: تطبيع الهاتف في Backend.
- `app/Services/Support/IdempotencyService.php`: replay آمن ورفض payload مختلف.
- `app/Services/CallCenter/CallTicketService.php`: فتح/قبول/ربط/إنهاء التذاكر داخل Transactions وأقفال.
- `app/Services/CallCenter/CustomerWorkspaceBuilder.php`: بناء استجابة Customer 360 مجمعة مع حجب المال افتراضيًا.
- `app/Services/Delivery/OrderCancellationService.php`: إلغاء مباشر لغير المدفوع ومراجعة عند الأثر المالي.
- `app/Http/Controllers/Api/CallTicketController.php`: API وWebhook وWorkspace.
- `app/Http/Controllers/Api/OrderCancellationController.php`: API السائق والمراجعة.
- `app/Models/Order.php`, `Item.php`, `OrderItem.php`: الحالات النهائية والأوزان والتعديل اليدوي.
- `app/Models/DeliveryTrip.php`, `DeliveryTripStop.php`: Snapshot الحد الأقصى وحالات/أوقات التوقف.
- `app/Services/Operations/OrderExecutionService.php`: `ASSEMBLING` ثم `READY_FOR_DELIVERY`.
- `routes/api.php`: مسارات التذاكر وWebhook والإلغاء والمراجعة.
- `database/seeders/RolesAndPermissionsSeeder.php`: الصلاحيات الجديدة بطريقة `firstOrCreate`.
- `tests/Unit/PhoneNormalizerTest.php`, `DeliveryWorkflowContractTest.php`: اختبارات العقد الجديد.

### Frontend

- `src/components/CallCenter/CallTicketWorkspacePage.tsx`: Polling، فتح يدوي، قبول/إنهاء، عميل مجهول، Customer 360 وربط الطلب.
- `src/components/operations/CancellationReviewPage.tsx`: قائمة المراجعة والموافقة والرفض.
- `src/services/callCenterService.ts`: عقود تذاكر المكالمات.
- `src/services/deliveryManagementService.ts`: عقود الإلغاء والمراجعة وحالات Stop.
- `src/App.tsx`: مسارات الشاشتين.

## 4. Migrations والجداول والفهارس

أضيفت `2027_01_02_000001_complete_call_center_delivery_workflow.php` ولم تُشغّل. تنشئ:

- `call_tickets`: unique على `external_call_id` وفهارس الهاتف/العميل/الموظف/الفرع والحالة/وقت البدء.
- `idempotency_records`: unique مركب على `scope,key` مع hash والاستجابة.
- `order_cancellation_requests`: علاقات الطلب/الرحلة/التوقف والمراجع، وفهرس `order_id,status`.
- حقول الرحلة: `max_stops`, `assigned_by`, أوقات وسبب الإلغاء.
- حقول Stop: أوقات الفشل والإلغاء والسبب.
- `items.is_weight_based`, `order_items.weight_grams`.
- حقول تعديل إجمالي الطلب مع الفاعل والسبب والوقت.

لم تُفحص بيانات MySQL الحقيقية ولم تُضف قيود مالية جديدة فوق بيانات قد تحتوي تكرارات.

## 5. CallTicket وCustomer 360

التذكرة تدعم `ringing/open/in_progress/completed/missed/cancelled`، تطبيع الهاتف، الربط التلقائي عند تطابق عميل واحد، وإرجاع مرشحين عند تعدد النتائج. Workspace يعيد التذكرة والملف الكامل الحالي والعناوين والملاحظات وآخر الطلبات وآخر التذاكر، ويحذف الرصيد والائتمان ما لم توجد صلاحية `view-sensitive-customer-finance`.

## 6. استقبال المكالمة

- حاليًا: فتح يدوي + Polling خفيف كل 8 ثوانٍ.
- مستقبلًا: `POST /api/call-center/webhook/incoming` بعقد محايد للمزود، HMAC في `X-Call-Signature`، rate limit، وidempotency عبر `external_call_id`. الاستجابة لا تكشف بيانات العميل.

## 7. Idempotency

أضيفت خدمة وسجل مركزيان يدعمان إعادة نفس الاستجابة لنفس المفتاح والبصمة ورفض اختلاف payload. لم يكتمل ربطهما بكل Controllers القديمة (الطلب/الفاتورة/الدفع/الرحلة)، لذلك تعد هذه النقطة مكتملة كبنية وغير مكتملة كتغطية شاملة.

## 8. حالات الطلب

الحالات المعرفة: `PENDING_PAYMENT`, `PREPARATION`, `ASSEMBLING`, `READY_FOR_DELIVERY`, `OUT_FOR_DELIVERY`, `CANCELLATION_REQUESTED`, `DELIVERED`, `FAILED_DELIVERY`, `CANCELLED`. التجميع يبدأ إلى `ASSEMBLING` وينتهي إلى `READY_FOR_DELIVERY`.

## 9. DeliveryTrip وStops

الحد الافتراضي 3 من `DELIVERY_TRIP_MAX_STOPS` ويخزن Snapshot. إنشاء الرحلة يرفض أكثر من 3، والطلبات غير الجاهزة أو متعددة الفروع أو الموجودة في رحلة نشطة. بداية الرحلة تنقل Stops إلى `out_for_delivery` والطلبات إلى `OUT_FOR_DELIVERY`. التسليم والفشل نهائيان، ويكتمل المسار عند انتهاء كل Stops.

## 10. إلغاء السائق

الأسباب Codes ثابتة و`other` يحتاج شرحًا. الطلب غير ذي الأثر المالي يلغى تشغيليًا مباشرة. وجود فاتورة فعالة أو دفعة ينقل الطلب وStop إلى `CANCELLATION_REQUESTED/cancellation_requested` ويظهر للمراجعة. الموافقة/الرفض مقفولان ولا يقبلان التنفيذ مرتين. لا تُحذف فاتورة أو دفعة أو قيد.

## 11. المدفوع وغير المدفوع

- غير المدفوع دون أثر مالي: `auto_approved` ثم `CANCELLED`.
- ذو الفاتورة/الدفعة: `pending` ثم قرار العمليات. تنفيذ Refund/Reversal المحاسبي الفعلي لم يُربط لأن المشروع لا يعرض خدمة reversal موحدة آمنة؛ لا يتم حذف أي سجل مالي.

## 12. الصلاحيات والتدقيق

أضيفت صلاحيات Customer 360 الحساسة، إدارة الرحلات، إسناد السائق، إكمال Stops، طلب/مراجعة الإلغاء، تعديل الإجمالي، ولوحة العمليات. أحداث التجميع والتوصيل الحالية يعاد استخدامها. سجل أحداث CallTicket مستقل تفصيلي لم يُنشأ؛ الانتقالات موثقة في التذكرة نفسها.

## 13. نتائج الأوامر والاختبارات

- `php artisan route:list`: نجح؛ 341 route، ومسارات التذاكر والإلغاء ظاهرة.
- PHP lint للملفات الجديدة والمعدلة: نجح.
- اختبارات النطاق الجديدة: 4 passed، 7 assertions.
- `npx tsc --noEmit`: نجح.
- `npm.cmd run build`: نجح؛ 3006 modules. تحذير chunk كبير وتحذيرات dynamic/static imports موجودة مسبقًا.
- Lint: لا يوجد script باسم `lint` في `package.json`، لذلك لم يُشغّل.

## 14. اختبارات لم تعمل

`php artisan test --testsuite=Unit`: 15 passed، 23 failed، 3 risky. السبب المتكرر سابق للتنفيذ: migration `2026_07_10_000004_add_call_center_fields_to_orders_table.php` يحاول تعديل `orders` قبل migration إنشاء الجدول عند ترتيب SQLite in-memory. لم يتم تغيير ترتيب migrations التاريخية لأنه قد يؤثر على قواعد منشورة.

## 15. البيانات المكررة وBlockers

- لم يتم الاتصال بقاعدة MySQL الحقيقية، لذلك لم يُنفذ فحص duplicate reference numbers أو invoices per order.
- لا توجد علاقة موحدة صريحة بين `users` و`employees`؛ مطابقة السائق تستخدم username عند التحقق من هوية السائق.
- لا توجد خدمة Refund/Reversal موحدة يمكن استدعاؤها بأمان.
- ملفات مصدر موجودة مسبقًا تحتوي أجزاء mojibake عربية؛ لم تُستبدل الملفات كاملة لتجنب ضياع تعديلات المستخدم.

## 16. Manual QA Checklist

- فتح تذكرة يدويًا لرقم معروف ومجهول.
- قبول المكالمة والتحقق من Customer 360 وحجب الرصيد.
- إنشاء عميل مجهول وربطه.
- ربط طلب وإنهاء المكالمة بنتيجة.
- إكمال التجميع والتحقق من `READY_FOR_DELIVERY`.
- إنشاء رحلة من 1 و3 طلبات ورفض الرابع.
- بدء الرحلة وتسليم Stop وفشل أخرى.
- إلغاء Stop غير مدفوعة والتحقق من الإلغاء المباشر.
- إلغاء Stop مدفوعة والتحقق من قائمة المراجعة ومنع القرار المكرر.

## 17. Deployment Order وRollback

الترتيب المقترح دون تنفيذ: نسخة احتياطية وفحص duplicate read-only، نشر Backend، تشغيل migration في نافذة صيانة، تشغيل Seeder الصلاحيات، نشر Frontend، smoke test، ثم تفعيل Webhook secret. Rollback: تعطيل Webhook والواجهة أولًا، إعادة Frontend، ثم `migrate:rollback --step=1` فقط إن لم تُنشأ بيانات تشغيلية جديدة؛ وإلا rollback تطبيقي يحافظ على البيانات.

## 18. حالة المراحل

- المرحلة 1: مكتملة وظيفيًا مع قيود بيانات الملف الحالي.
- المرحلة 2: بنية Idempotency مكتملة، التكامل الشامل جزئي.
- المرحلة 3: الحالات والتجميع مكتملة في المسار الجديد.
- المرحلة 4: حد 1–3 وبداية/نهاية Stops مكتملة، اختبارات التكامل متوقفة على migrations القديمة.
- المرحلة 5: Backend والمراجعة UI مكتملان؛ Refund/Reversal الفعلي Blocked.
- المرحلة 6: حقول الوزن والتعديل أضيفت؛ تسعير الوزن واستئناف الطلب الشامل جزئيان.
- المرحلة 7: شروط السائق الأساسية موجودة؛ KPIs الإضافية غير مكتملة.
- المرحلة 8: الصلاحيات مضافة؛ سجل تدقيق CallTicket التفصيلي جزئي.
- المرحلة 9: Unit الجديدة وTypeScript/Build مكتملة؛ Feature/Concurrency/E2E غير مكتملة بسبب بيئة migrations وعدم تشغيل تطبيق حي.

## 19. Git Diff Stat النهائي

`git diff --stat` لا يعرض الملفات الجديدة غير المتتبعة. Frontend tracked: 11 files, 866 insertions, 1013 deletions (يشمل تعديلات المستخدم السابقة). Backend tracked: 20 files, 276 insertions, 20 deletions (يشمل تعديلات المستخدم السابقة). راجع `git status --short` للقائمة الكاملة.
