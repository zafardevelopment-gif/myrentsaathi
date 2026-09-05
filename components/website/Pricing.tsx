/**
 * Pricing — Server Component
 * Fetches dynamic plans from Supabase.
 * Falls back to static mock data if DB is unavailable (safe for dev/preview).
 */

import PricingCards from "./PricingCards";
import LeadCapture from "./LeadCapture";
import { getActivePricingPlans } from "@/lib/pricing-data";
import type { PricingPlan } from "@/lib/pricing-data";
import { getFreeTiralDays } from "@/lib/subscription";

// ── Static fallback data (mirrors original mock) ───────────
const FALLBACK_SOCIETY: PricingPlan[] = [
  {
    id: "fallback-society", plan_type: "society", name: "Society", price: 10, price_yearly: 100,
    duration: "per unit / month", property_limit: null, is_popular: true, is_active: true, sort_order: 1,
    cta_text: "Start Free Trial", description: "Per-unit pricing that scales with your society",
    badge_text: "PER-UNIT", created_at: "", updated_at: "",
    features: [
      { id: "sf1", plan_id: "fallback-society", feature_text: "Maintenance collection via UPI",     is_highlight: true,  sort_order: 1 },
      { id: "sf2", plan_id: "fallback-society", feature_text: "Automatic defaulter tracking",       is_highlight: false, sort_order: 2 },
      { id: "sf3", plan_id: "fallback-society", feature_text: "Expense management + approvals",      is_highlight: false, sort_order: 3 },
      { id: "sf4", plan_id: "fallback-society", feature_text: "Complaint tickets & notices",         is_highlight: false, sort_order: 4 },
      { id: "sf5", plan_id: "fallback-society", feature_text: "Online polls & AGM voting",           is_highlight: false, sort_order: 5 },
      { id: "sf6", plan_id: "fallback-society", feature_text: "Visitor management & CA-ready reports", is_highlight: false, sort_order: 6 },
    ],
  },
];

const FALLBACK_LANDLORD: PricingPlan[] = [
  {
    id: "fallback-landlord", plan_type: "landlord", name: "Landlord", price: 10, price_yearly: 100,
    duration: "per landlord / month", property_limit: null, is_popular: true, is_active: true, sort_order: 1,
    cta_text: "Start Free Trial", description: "₹10 per landlord per month — pay for what you manage",
    badge_text: "PER-UNIT", created_at: "", updated_at: "",
    features: [
      { id: "lf1", plan_id: "fallback-landlord", feature_text: "Rent collection via UPI + tracking", is_highlight: true,  sort_order: 1 },
      { id: "lf2", plan_id: "fallback-landlord", feature_text: "Automated WhatsApp reminders",        is_highlight: false, sort_order: 2 },
      { id: "lf3", plan_id: "fallback-landlord", feature_text: "Tenant management + receipts",        is_highlight: false, sort_order: 3 },
      { id: "lf4", plan_id: "fallback-landlord", feature_text: "AI rental agreement generator",       is_highlight: false, sort_order: 4 },
      { id: "lf5", plan_id: "fallback-landlord", feature_text: "Tax-ready income reports",            is_highlight: false, sort_order: 5 },
      { id: "lf6", plan_id: "fallback-landlord", feature_text: "NRI-friendly remote management",      is_highlight: false, sort_order: 6 },
    ],
  },
];

export default async function Pricing() {
  let societyPlans: PricingPlan[] = FALLBACK_SOCIETY;
  let landlordPlans: PricingPlan[] = FALLBACK_LANDLORD;
  let freeTrialDays = 14;

  try {
    const [society, landlord, trialDays] = await Promise.all([
      getActivePricingPlans("society"),
      getActivePricingPlans("landlord"),
      getFreeTiralDays(),
    ]);
    if (society.length > 0) societyPlans = society;
    if (landlord.length > 0) landlordPlans = landlord;
    freeTrialDays = trialDays;
  } catch {
    // DB unavailable — use static fallback silently
  }

  return (
    <section id="pricing" className="py-20 bg-brand-900">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Section Title */}
        <div className="text-center mb-12 animate-fade-up">
          <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-3">
            PRICING
          </span>
          <h2 className="font-serif text-[38px] font-extrabold text-white leading-tight tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-[17px] text-white/70 mt-3.5 leading-relaxed max-w-[600px] mx-auto">
            {freeTrialDays}-day free trial. No credit card. Cancel anytime.
          </p>
        </div>

        {/* Dynamic Cards (client component for tab interaction) */}
        <PricingCards societyPlans={societyPlans} landlordPlans={landlordPlans} freeTrialDays={freeTrialDays} />

        {/* Lead capture — callback / WhatsApp demo */}
        <LeadCapture />
      </div>
    </section>
  );
}
