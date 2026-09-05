/**
 * Google Ads / gtag conversion helpers (client-side).
 *
 * The base gtag.js tag + config('AW-18230510971') live in app/layout.tsx.
 * These helpers fire CONVERSION events at the real money/lead moments:
 *   - trackPaidConversion: after a Razorpay payment is verified & plan activated
 *   - trackTrialSignup:    after a free trial is started (a lead, not a sale)
 *
 * Each conversion needs a "send_to" label of the form  AW-XXXXXXXX/AbC-dEf...
 * created in the Google Ads UI (Goals -> Conversions -> New conversion action
 * -> Website). Put those labels in env so code never hardcodes account state:
 *   NEXT_PUBLIC_GADS_ID                (AW-18230510971)
 *   NEXT_PUBLIC_GADS_PURCHASE_LABEL    (i66WCM36ju8cEPuK_vRD — "Paid Plan Purchase" event-snippet action)
 *   NEXT_PUBLIC_GADS_TRIAL_LABEL       (OPTIONAL — leave unset. The current
 *                                       "Sign Up" action in Ads is URL-based
 *                                       (fires on a /select-plan page visit),
 *                                       so it has no event label to pair with
 *                                       trackTrialSignup(). Only set this once
 *                                       an EVENT-based Sign-up action exists.)
 *
 * If a label env is missing, we skip that send_to (so nothing fires to a
 * wrong/placeholder conversion) but still push a GA4-style event to dataLayer
 * for debugging. This is why the old setup mis-reported: the base tag was
 * present but NO conversion event was ever fired from a real purchase.
 */

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { gtag?: GtagFn };
  return typeof w.gtag === "function" ? w.gtag : null;
}

const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID ?? "AW-18230510971";

/** Fire a Google Ads PURCHASE conversion (a real paid signup). */
export function trackPaidConversion(opts: {
  value: number;
  currency?: string;
  transactionId?: string;
  planType?: string;
  planName?: string;
}): void {
  const gtag = getGtag();
  const label = process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL;
  const payload: Record<string, unknown> = {
    value: opts.value,
    currency: opts.currency ?? "INR",
    transaction_id: opts.transactionId, // dedupes repeat fires of the same payment
    plan_type: opts.planType,
    plan_name: opts.planName,
  };
  if (gtag && label) {
    gtag("event", "conversion", { send_to: `${GADS_ID}/${label}`, ...payload });
  } else if (gtag) {
    // Label not configured yet — record the event so it's visible in DebugView
    // without attributing it to a possibly-wrong conversion action.
    gtag("event", "purchase_pending_label", payload);
  }
}

/** Fire a Google Ads LEAD conversion (free-trial signup — not a sale). */
export function trackTrialSignup(opts: { planType?: string; planName?: string }): void {
  const gtag = getGtag();
  const label = process.env.NEXT_PUBLIC_GADS_TRIAL_LABEL;
  const payload: Record<string, unknown> = {
    plan_type: opts.planType,
    plan_name: opts.planName,
  };
  if (gtag && label) {
    gtag("event", "conversion", { send_to: `${GADS_ID}/${label}`, ...payload });
  } else if (gtag) {
    gtag("event", "trial_signup_pending_label", payload);
  }
}
