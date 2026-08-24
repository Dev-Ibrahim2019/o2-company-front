// Canonical, endpoint-safe field mapping for the CRM "Add Customer" flow.
//
// Why this file exists: the codebase has THREE different accepted `category`
// value lists depending on which write endpoint is used (documented in the
// B-CRM-01 review). The CRM "Add Customer" flow submits through the legacy
// `POST /customers` endpoint (the only working create path today — see the
// Phase-1 discovery report), and that endpoint's OWN inline validation
// (CustomerFinancialController::store()) only accepts the 5 values below —
// NOT the broader 12-value list `StoreCustomerRequest`/`CustomerCategory`
// would otherwise suggest is valid. Offering a broader list here would let
// the user pick a category that silently 422s on submit.
//
// If the create path ever moves to a canonical `/crm/customers` POST with a
// single reconciled enum, only this file needs to change.
export const CRM_CREATE_CATEGORY_OPTIONS: Array<[string, string]> = [
  ["retail", "تجزئة"],
  ["wholesale", "جملة"],
  ["corporate", "شركات"],
  ["government", "حكومي"],
  ["service", "خدمي"],
];

export const CRM_CREATE_STATUS_OPTIONS: Array<[string, string]> = [
  ["active", "نشط"],
  ["inactive", "غير نشط"],
  ["blocked", "محظور"],
];
