import { useMemo } from "react";

export interface ValidationRule<TValues> {
  message: string;
  test: (values: TValues) => boolean;
}

export function useFormValidation<TValues>(
  values: TValues,
  rules: ValidationRule<TValues>[],
) {
  return useMemo(() => {
    const errors = rules
      .filter((rule) => !rule.test(values))
      .map((rule) => rule.message);

    return {
      errors,
      isValid: errors.length === 0,
    };
  }, [values, rules]);
}
