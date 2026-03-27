/**
 * Pricing — Server Component
 * Fetches dynamic plans from Supabase.
 * Falls back to static mock data if DB is unavailable (safe for dev/preview).
 */

import PricingCards from "./PricingCards";
import { getActivePricingPlans } from "@/lib/pricing-data";
import type { PricingPlan } from "@/lib/pricing-data";

// ── Static fallback data (mirrors original mock) ───────────
const FALLBACK_SOCIETY: PricingPlan[] = [
  {
    id: "fallback-s1", plan_type: "society", name: "Starter", price: 2999, price_yearly: 29990,
    duration: "monthly", property_limit: 30, is_popular: false, is_active: true, sort_order: 1,
    cta_text: "Start Free Trial", description: "Small societies (up to 30 flats)",
    badge_text: null, created_at: "", updated_at: "",
    features: [
      { id: "f1", plan_id: "fallback-s1", feature_text: "30 flats management",          is_highlight: false, sort_order: 1 },
      { id: "f2", plan_id: "fallback-s1", feature_text: "Maintenance collection",        is_highlight: false, sort_order: 2 },
      { id: "f3", plan_id: "fallback-s1", feature_text: "Complaint tickets",             is_highlight: false, sort_order: 3 },
      { id: "f4", plan_id: "fallback-s1", feature_text: "WhatsApp reminders (500/mo)",   is_highlight: false, sort_order: 4 },
      { id: "f5", plan_id: "fallback-s1", feature_text: "Basic reports",                 is_highlight: false, sort_order: 5 },
      { id: "f6", plan_id: "fallback-s1", feature_text: "Email support",                 is_highlight: false, sort_order: 6 },
    ],
  },
  {
    id: "fallback-s2", plan_type: "society", name: "Professional", price: 5999, price_yearly: 59990,
    duration: "monthly", property_limit: 100, is_popular: true, is_active: true, sort_order: 2,
    cta_text: "Start Free Trial", description: "Medium societies (up to 100 flats)",
    badge_text: "MOST POPULAR", created_at: "", updated_at: "",
    features: [
      { id: "f7",  plan_id: "fallback-s2", feature_text: "100 flats management",          is_highlight: true,  sort_order: 1 },
      { id: "f8",  plan_id: "fallback-s2", feature_text: "Everything in Starter",         is_highlight: false, sort_order: 2 },
      { id: "f9",  plan_id: "fallback-s2", feature_text: "Expense management + approval", is_highlight: false, sort_order: 3 },
      { id: "f10", plan_id: "fallback-s2", feature_text: "Parking management",            is_highlight: false, sort_order: 4 },
      { id: "f11", plan_id: "fallback-s2", feature_text: "Polls & voting",                is_highlight: false, sort_order: 5 },
      { id: "f12", plan_id: "fallback-s2", feature_text: "WhatsApp reminders (2,000/mo)", is_highlight: false, sort_order: 6 },
      { id: "f13", plan_id: "fallback-s2", feature_text: "Document vault",                is_highlight: false, sort_order: 7 },
      { id: "f14", plan_id: "fallback-s2", feature_text: "Priority support",              is_highlight: true,  sort_order: 8 },
    ],
  },
  {
    id: "fallback-s3", plan_type: "society", name: "Enterprise", price: 9999, price_yearly: 99990,
    duration: "monthly", property_limit: null, is_popular: false, is_active: true, sort_order: 3,
    cta_text: "Contact Sales", description: "Large societies (unlimited flats)",
    badge_text: null, created_at: "", updated_at: "",
    features: [
      { id: "f15", plan_id: "fallback-s3", feature_text: "Unlimited flats",              is_highlight: true,  sort_order: 1 },
      { id: "f16", plan_id: "fallback-s3", feature_text: "Everything in Professional",   is_highlight: false, sort_order: 2 },
      { id: "f17", plan_id: "fallback-s3", feature_text: "Multi-wing/tower support",     is_highlight: false, sort_order: 3 },
      { id: "f18", plan_id: "fallback-s3", feature_text: "WhatsApp unlimited",           is_highlight: false, sort_order: 4 },
      { id: "f19", plan_id: "fallback-s3", feature_text: "Custom reports",               is_highlight: false, sort_order: 5 },
      { id: "f20", plan_id: "fallback-s3", feature_text: "Dedicated account manager",    is_highlight: true,  sort_order: 6 },
      { id: "f21", plan_id: "fallback-s3", feature_text: "API access",                   is_highlight: false, sort_order: 7 },
      { id: "f22", plan_id: "fallback-s3", feature_text: "On-call support",              is_highlight: false, sort_order: 8 },
    ],
  },
];

const FALLBACK_LANDLORD: PricingPlan[] = [
  {
    id: "fallback-l1", plan_type: "landlord", name: "Basic", price: 499, price_yearly: 4990,
    duration: "monthly", property_limit: 3, is_popular: false, is_active: true, sort_order: 1,
    cta_text: "Start Free Trial", description: "Up to 3 properties",
    badge_text: null, created_at: "", updated_at: "",
    features: [
      { id: "lf1", plan_id: "fallback-l1", feature_text: "3 property management",       is_highlight: false, sort_order: 1 },
      { id: "lf2", plan_id: "fallback-l1", feature_text: "Rent collection + tracking",  is_highlight: false, sort_order: 2 },
      { id: "lf3", plan_id: "fallback-l1", feature_text: "Tenant management",           is_highlight: false, sort_order: 3 },
      { id: "lf4", plan_id: "fallback-l1", feature_text: "WhatsApp reminders",          is_highlight: false, sort_order: 4 },
      { id: "lf5", plan_id: "fallback-l1", feature_text: "Payment receipts",            is_highlight: false, sort_order: 5 },
      { id: "lf6", plan_id: "fallback-l1", feature_text: "Basic reports",               is_highlight: false, sort_order: 6 },
    ],
  },
  {
    id: "fallback-l2", plan_type: "landlord", name: "Pro", price: 999, price_yearly: 9990,
    duration: "monthly", property_limit: 10, is_popular: true, is_active: true, sort_order: 2,
    cta_text: "Start Free Trial", description: "Up to 10 properties",
    badge_text: "MOST POPULAR", created_at: "", updated_at: "",
    features: [
      { id: "lf7",  plan_id: "fallback-l2", feature_text: "10 property management",           is_highlight: true,  sort_order: 1 },
      { id: "lf8",  plan_id: "fallback-l2", feature_text: "Everything in Basic",              is_highlight: false, sort_order: 2 },
      { id: "lf9",  plan_id: "fallback-l2", feature_text: "Agreement generator (free drafts)", is_highlight: false, sort_order: 3 },
      { id: "lf10", plan_id: "fallback-l2", feature_text: "Tax-ready reports",                is_highlight: false, sort_order: 4 },
      { id: "lf11", plan_id: "fallback-l2", feature_text: "Multi-society view",               is_highlight: false, sort_order: 5 },
      { id: "lf12", plan_id: "fallback-l2", feature_text: "Priority support",                 is_highlight: true,  sort_order: 6 },
    ],
  },
  {
    id: "fallback-l3", plan_type: "landlord", name: "NRI", price: 1999, price_yearly: 19990,
    duration: "monthly", property_limit: null, is_popular: false, is_active: true, sort_order: 3,
    cta_text: "Start Free Trial", description: "Unlimited + remote management",
    badge_text: null, created_at: "", updated_at: "",
    features: [
      { id: "lf13", plan_id: "fallback-l3", feature_text: "Unlimited properties",         is_highlight: true,  sort_order: 1 },
      { id: "lf14", plan_id: "fallback-l3", feature_text: "Everything in Pro",            is_highlight: false, sort_order: 2 },
      { id: "lf15", plan_id: "fallback-l3", feature_text: "NRI tax reports",              is_highlight: true,  sort_order: 3 },
      { id: "lf16", plan_id: "fallback-l3", feature_text: "Power of Attorney support",    is_highlight: false, sort_order: 4 },
      { id: "lf17", plan_id: "fallback-l3", feature_text: "Multi-city dashboard",         is_highlight: false, sort_order: 5 },
      { id: "lf18", plan_id: "fallback-l3", feature_text: "WhatsApp-only management",     is_highlight: false, sort_order: 6 },
      { id: "lf19", plan_id: "fallback-l3", feature_text: "Dedicated NRI support",        is_highlight: true,  sort_order: 7 },
    ],
  },
];

export default async function Pricing() {
  let societyPlans: PricingPlan[] = FALLBACK_SOCIETY;
  let landlordPlans: PricingPlan[] = FALLBACK_LANDLORD;

  try {
    const [society, landlord] = await Promise.all([
      getActivePricingPlans("society"),
      getActivePricingPlans("landlord"),
    ]);
    if (society.length > 0) societyPlans = society;
    if (landlord.length > 0) landlordPlans = landlord;
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
            14-day free trial. No credit card. Cancel anytime.
          </p>
        </div>

        {/* Dynamic Cards (client component for tab interaction) */}
        <PricingCards societyPlans={societyPlans} landlordPlans={landlordPlans} />
      </div>
    </section>
  );
}
