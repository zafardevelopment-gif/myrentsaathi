/**
 * Common-meter allocation (§24). Pure & unit-testable. Splits a common
 * meter's consumption across beneficiary flats by the chosen method, with
 * rounding reconciliation so shares sum exactly to the total.
 */

import { round2 } from "./money";

export type AllocMethod = "equal" | "area_sqft" | "occupancy" | "submeter_diff" | "custom_weight";
export type AllocFlat = { flat_id: string; area_sqft?: number | null; occupancy?: number | null; weight?: number | null };
export type AllocShare = { flat_id: string; share: number };

export function allocateCommon(method: AllocMethod, total: number, flats: AllocFlat[]): AllocShare[] {
  const n = flats.length;
  if (n === 0 || total <= 0) return flats.map((f) => ({ flat_id: f.flat_id, share: 0 }));

  // Weight per flat by method. submeter_diff apportions the residual by equal base.
  const weightOf = (f: AllocFlat): number => {
    switch (method) {
      case "area_sqft": return Math.max(f.area_sqft ?? 0, 0);
      case "occupancy": return Math.max(f.occupancy ?? 0, 0);
      case "custom_weight": return Math.max(f.weight ?? 0, 0);
      case "equal":
      case "submeter_diff":
      default: return 1;
    }
  };

  const weights = flats.map(weightOf);
  const totalWeight = weights.reduce((a, w) => a + w, 0);
  // If a proportional method has no usable weights, fall back to equal.
  const useEqual = totalWeight <= 0;

  const shares: AllocShare[] = flats.map((f, i) => {
    const w = useEqual ? 1 : weights[i];
    const denom = useEqual ? n : totalWeight;
    return { flat_id: f.flat_id, share: round2((total * w) / denom) };
  });

  // Reconcile rounding drift onto the last share so the sum is exact.
  const allocated = round2(shares.reduce((a, s) => a + s.share, 0));
  const drift = round2(total - allocated);
  if (drift !== 0 && shares.length > 0) {
    shares[shares.length - 1].share = round2(shares[shares.length - 1].share + drift);
  }
  return shares;
}
