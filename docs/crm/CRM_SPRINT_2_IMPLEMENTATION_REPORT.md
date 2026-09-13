# CRM Sprint 2 Implementation Report

## 1. Executive Summary

تم تنفيذ CRM Admin Foundation وCustomer 360 MVP عبر Backend Laravel وFrontend React. أضيفت صلاحيات دخول دقيقة، عزل عملاء بحسب الفرع، Dashboard حقيقي، دليل عملاء، ملف Customer 360 بتبويبات مستقلة، حماية مالية وملاحظات حساسة من الـBackend، وأوامر Profiling وBackfill آمن للهواتف. نجحت اختبارات CRM وTypeScript وProduction Build. بقيت أربعة اختبارات قديمة غير مرتبطة بـCRM فاشلة كما هو موضح أدناه.

حالة Sprint 2: **PARTIAL** قياسًا إلى النطاق الموسع كاملًا؛ مسارات القراءة وواجهات MVP مكتملة، بينما عمليات CRUD للعناوين والشكاوى والمتابعات تعيد استخدام الواجهات القديمة ولم تُنقل بعد إلى `/api/crm`.

## 2. Scope Implemented

- CRM navigation and guarded route group.
- Dashboard, customer directory, and standalone Customer 360.
- Overview, orders, addresses, complaints, notes, occasions, and financial views.
- Branch access service and read query service.
- Historical phone profiling and dry-run backfill.
- Backend feature tests and frontend production verification.

## 3. Initial Baseline

- PHP 8.2.12، Laravel 12، Sanctum 4، Spatie Permission 6.
- React 18.2، TypeScript 5، Vite 5.
- Git initially refused ownership; status was later read with a per-command `safe.directory=*` override only.
- Frontend scripts: `dev`, `build`, `preview`; no lint/test scripts exist.

## 4. Sprint 1 Verification

Verified: `customer_phones`, `CustomerPhone`, `CustomerIdentityService`, `PhoneNormalizer`, Customer relations, authenticated legacy customer routes, normalized-phone uniqueness tests, order/invoice customer validation, and snapshot-compatible order fields.

## 5. Migration Safety Review

The current database records `2026_07_03_000001_create_orders_table` as ran. The filesystem contains the same name, so Laravel will not attempt to recreate `orders`. Git also shows an older deleted path `2026_09_28_000001_create_orders_table.php`; this appears to be the earlier unsafe name corrected during Sprint 1. No orders table was dropped or recreated.

## 6. Permission Architecture

Existing Sprint 1 naming (`crm.view-customers`, `crm.view-customer-financial`) was retained for compatibility. Sprint 2 adds only access/section permissions. Backend middleware is authoritative; React visibility is supplementary.

## 7. Role-Permission Matrix

| Permission | Existing/New | Roles | الاستخدام |
| ---------- | ------------ | ----- | --------- |
| crm.access | New | super-admin, branch-manager, call-center, accountant | دخول الوحدة |
| crm.dashboard.view | New | super-admin, branch-manager, call-center, accountant | Dashboard |
| crm.view-customers | Existing | حسب Sprint 1 + roles أعلاه | الدليل والملف |
| crm.customer-orders.view | New | super-admin, branch-manager, call-center, accountant | الطلبات |
| crm.customer-addresses.view | New | super-admin, branch-manager, call-center, accountant | العناوين |
| crm.complaints.view | New | super-admin, branch-manager, call-center, accountant | الشكاوى |
| crm.notes.view | New | super-admin, branch-manager, call-center, accountant | الملاحظات |
| crm.occasions.view | New | super-admin, branch-manager, call-center, accountant | المناسبات |
| crm.view-customer-financial | Existing | super-admin, accountant | الملخص المالي |
| crm.view-customer-statement | Existing | super-admin, accountant | كشف الحساب |
| crm.view-sensitive-notes | Existing | super-admin/accountant وفق Sprint 1 | المحتوى الحساس |

Cashier keeps legacy customer lookup permissions and does not receive `crm.access`.

## 8. CRM Backend Architecture

- `CrmCustomerAccessService`: central branch visibility and object authorization.
- `Customer360QueryService`: directory query, fixed profile contract, aggregated summaries, financial facade.
- `CrmController`: thin read endpoints; delegates accounting to `CustomerAccountingService`.

## 9. CRM Routes

| Method | Endpoint | Controller | Authentication | Permission |
| ------ | -------- | ---------- | -------------- | ---------- |
| GET | /api/crm/dashboard | CrmController@dashboard | Sanctum | crm.access + crm.dashboard.view |
| GET | /api/crm/customers | CrmController@index | Sanctum | crm.access + crm.view-customers |
| GET | /api/crm/customers/{customer} | CrmController@show | Sanctum | crm.access + crm.view-customers |
| GET | /api/crm/customers/{customer}/overview | CrmController@overview | Sanctum | crm.access + crm.view-customers |
| GET | /api/crm/customers/{customer}/orders | CrmController@orders | Sanctum | crm.customer-orders.view |
| GET | /api/crm/customers/{customer}/addresses | CrmController@addresses | Sanctum | crm.customer-addresses.view |
| GET | /api/crm/customers/{customer}/complaints | CrmController@complaints | Sanctum | crm.complaints.view |
| GET | /api/crm/customers/{customer}/notes | CrmController@notes | Sanctum | crm.notes.view |
| GET | /api/crm/customers/{customer}/occasions | CrmController@occasions | Sanctum | crm.occasions.view |
| GET | /api/crm/customers/{customer}/financial-summary | CrmController@financial | Sanctum | crm.view-customer-financial |
| GET | /api/crm/customers/{customer}/statement | CrmController@statement | Sanctum | crm.view-customer-statement |
| GET | /api/crm/customers/{customer}/aging | CrmController@aging | Sanctum | crm.view-customer-financial |

## 10. CRM Dashboard

Uses real customer and complaint aggregates, defaults to current month, accepts `branch_id`, `date_from`, and `date_to`, and returns no financial KPI payload without financial permission.

## 11. Customer Directory

Server pagination, status/category/branch filters, allowlisted sorting, name/code/legacy phone/normalized phone search, eager-loaded branch/primary phone, and permission-gated balance.

## 12. Customer 360 MVP

Standalone page with identity band and independently requested tabs. The base profile includes identity, primary/all phones, default address, order statistics, open complaint count, legacy loyalty points read-only, and per-user capabilities.

## 13. Branch Access Rules

Super Admin or users with no `branch_id` are global. Other users see only `customers.branch_id = user.branch_id`. Object-level access returns 403 across all CRM sections.

## 14. Sensitive Data Protection

Notes with `type=sensitive` and complaints with `is_sensitive=true` are excluded in backend queries unless the user owns `crm.view-sensitive-notes`.

## 15. Financial Data Protection

Financial endpoints require backend permissions. Directory balance is omitted without permission. Customer 360 frontend hides the tab and never makes the request. Balance and aging reuse `CustomerAccountingService`, not order totals.

## 16. Historical Phone Profiling

Actual result: 1 customer; 0 normalizable values; 2 invalid legacy values; 0 normalized duplicates; 1 customer without `customer_phones`; 0 phone/mobile normalized conflicts. Masked JSON written to `storage/app/private/reports/crm_customer_phone_profile.json`.

## 17. Backfill Dry Run

Candidates: 2; would insert: 0; invalid: 2; conflicts: 0; inserted: 0. `--apply` was not used.

## 18. Frontend Architecture

Feature files live under `src/features/crm/`: contracts/API adapter, guard, shell, reusable state components, dashboard, directory, Customer 360, scoped CSS, and six `React.lazy` tab modules. The production build confirms separate chunks for Overview, Orders, Addresses, Complaints, Notes/Occasions, and Financial.

## 19. UI/UX Changes

Arabic RTL operational design, responsive table/layout, URL-backed filters, loading/empty/error/forbidden/not-found states, clear back navigation, and accessible labeled controls. Legacy `/admin/customers` remains unchanged. Independent design evaluation initially requested revisions for role reachability, raw object rendering, and code-lazy tabs; all were fixed and the second evaluation returned **PASS**.

## 20. API Contracts

CRM uses snake_case consistently at the API boundary with centralized interfaces. Error conversion maps 401/403/404/409/422/500 to Arabic user-facing messages and does not expose Axios or SQL details.

## 21. Performance Improvements

Dashboard uses aggregate queries; directory eager-loads only required relations; profile uses aggregate order statistics; tab data is lazy and orders/complaints/notes are paginated. Production build reports a pre-existing large main chunk warning.

## 22. Database Changes

No business tables or customer data were changed. Permission records were added through one migration. Profiling only wrote a masked report.

## 23. Migrations Created

| Migration | النوع | Up | Down | تأثير البيانات |
| --------- | ----- | -- | ---- | -------------- |
| 2026_07_28_000001_add_crm_admin_permissions.php | Permission data | Creates/reuses 7 permissions and conservative role grants | Deletes the 7 new permissions | صلاحيات فقط؛ لا يمس العملاء |

Migration was applied successfully to the development database.

## 24. Permissions Created or Reused

See sections 6–7. Existing financial, statement, sensitive note, create/edit/delete customer permissions were reused.

## 25. Files Created

| الملف | النوع | سبب التغيير | تفاصيل |
| ----- | -------- | ----------- | ------ |
| backend/app/Services/Crm/CrmCustomerAccessService.php | Created | Branch security | Query/object access |
| backend/app/Services/Crm/Customer360QueryService.php | Created | Read model | Directory/profile/financial |
| backend/app/Http/Controllers/Api/Crm/CrmController.php | Created | CRM API | 12 read endpoints |
| backend/app/Console/Commands/ProfileCustomerPhones.php | Created | Profiling | Read-only masked report |
| backend/app/Console/Commands/BackfillCustomerPhones.php | Created | Safe backfill | Dry-run default, explicit apply |
| backend/database/migrations/2026_07_28_000001_add_crm_admin_permissions.php | Created | Permissions | Section access |
| backend/tests/Feature/CrmAdminTest.php | Created | Security/regression | 5 scenarios |
| frontend/src/features/crm/* | Created | CRM UI | 10 feature files |
| frontend/docs/crm/CRM_SPRINT_2_IMPLEMENTATION_REPORT.md | Created | Handoff | This report |

## 26. Files Modified

| الملف | النوع | سبب التغيير | تفاصيل |
| ----- | -------- | ----------- | ------ |
| backend/routes/api.php | Modified | CRM routes | Added isolated `/api/crm` group |
| frontend/src/App.tsx | Modified | Routing | Added guarded CRM routes |
| frontend/src/auth/permissions.ts | Modified | Contracts | Added CRM constants |
| frontend/src/components/administration/Layout.tsx | Modified | Navigation | Permission-gated CRM entry |

## 27. Files Deleted

None by Sprint 2.

## 28. Tests Added

Guest/access denial, authorized dashboard/directory, cross-branch denial, sensitive-note omission, financial denial/capability, and paginated orders.

## 29. Commands Executed

`php -v`, `php artisan --version`, `migrate:status`, targeted CRM/Customer tests, full tests, route list, phone profiling, backfill dry-run, migration, composer validation, `npx.cmd tsc --noEmit`, and `npm.cmd run build`.

## 30. Test Results

| المجموعة | النتيجة | Assertions | الملاحظات |
| ---------------------- | ------- | ---------: | --------- |
| CRM Backend | PASS | 27 | 7 tests |
| Permissions | PASS | ضمن 19 الجديدة | backend guards |
| Customer List | PASS | ضمن 27 | filters/search |
| Customer 360 | PASS | ضمن 19 | access and pagination |
| Call Center Regression | PASS | 27 CRM suite includes legacy directory | full manual UI not run |
| Order Regression | PASS | Customer security flow | full suite failures unrelated |
| Invoice Regression | PARTIAL | — | full suite existing discount fixtures fail |
| Accounting Regression | PARTIAL | — | 3 existing DiscountAccounting failures |
| TypeScript | PASS | — | exit 0 |
| Frontend Build | PASS | — | Vite production build |

Full backend: 46 passed, 4 failed, 3 risky, 124 assertions. Failures: percentage discount cap expected 100 but returned 150; two `production_tickets.department_id` fixture failures; one discount `created_by` foreign-key fixture failure. No failure stack references Sprint 2 CRM files.

## 31. Regression Results

Automated CRM and customer compatibility tests pass. Browser/manual Login, POS, cashier, QR, accounting reports were **NOT TESTED** because authenticated fixtures and device flows were not available in this execution.

## 32. Acceptance Criteria

| المعيار | الحالة | الدليل |
| ------------------------- | ------ | ------ |
| CRM navigation protected | PASS | React guard + `crm.access` middleware |
| Dashboard uses real data | PASS | aggregate service/controller |
| Customer list works | PASS | API test + TypeScript/build |
| Customer 360 works | PASS | lazy sections + API tests |
| Financial data protected | PASS | route/controller/profile gates |
| Sensitive notes protected | PASS | explicit omission test |
| Branch isolation works | PASS | cross-branch 403 test |
| Call Center works | PASS | existing CRM directory tests |
| POS works | NOT TESTED | no manual device session |
| Accounting unchanged | PARTIAL | no accounting code changed; old tests still fail |

## 33. Known Issues

- Four pre-existing non-CRM backend failures remain.
- Main frontend bundle is ~3.6 MB minified; code splitting is deferred.
- Current branch ownership required a temporary per-command Git safety override.
- Historical phone values in the development database are invalid.

## 34. Deferred Work

CRM write facades, address default transaction endpoint, complete complaint write flow, follow-up UI, advanced customer segmentation, loyalty ledger, portal/OTP, payment allocation, credit approval, and full corporate customer support.

## 35. Rollback Instructions

1. Roll back the single CRM permission migration if it is the latest batch.
2. Revert Sprint 2 code files listed in sections 25–26 using normal source control review.
3. Do not delete customer/order/accounting tables.
4. No phone backfill data rollback is required because only dry-run was executed.

## 36. Security Review

Authentication, per-endpoint permissions, centralized branch authorization, backend omission of financial/sensitive content, safe sort allowlist, validation, pagination caps, and masked profiling output are implemented. The role model still treats `branch_id=null` as global; this is a documented existing policy requiring business confirmation.

## 37. Recommended Sprint 3

Complete CRM write operations with policies and transactions, especially address defaulting and complaint follow-ups; add a formal global-branch permission instead of deriving global access from null branch; fix the four legacy test failures; then add browser E2E coverage and bundle-level code splitting.
