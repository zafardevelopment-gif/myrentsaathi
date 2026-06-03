/**
 * Money helpers. All billing math rounds to 2 decimals (paise) at the
 * point of storage so totals reconcile exactly.
 */

/** Round to 2 decimal places (paise), avoiding binary float drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Indian-format currency string, e.g. 1234567.5 → "₹12,34,567.50". */
export function formatINR(n: number): string {
  return "₹" + (n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
