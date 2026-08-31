/**
 * Occasion types accepted by the CRM directory's `occasion_type` filter.
 *
 * These are the exact keys of CrmController::OCCASION_LABELS on the backend —
 * the same map the dashboard's occasion distribution renders and the one the
 * `occasion_type` filter validates against (`in:` rule). Offering any other
 * value here would 422 on submit, so this list must stay in step with that
 * constant.
 */
export const CRM_OCCASION_OPTIONS: Array<[string, string]> = [
  ["birthday", "عيد ميلاد"],
  ["anniversary", "ذكرى سنوية"],
  ["wedding", "زواج"],
  ["graduation", "تخرج"],
  ["other", "أخرى"],
];
