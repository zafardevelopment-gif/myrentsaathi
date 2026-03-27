"use client";

import { useState } from "react";
import type { PricingPlan } from "@/lib/pricing-data";

interface Props {
  societyPlans: PricingPlan[];
  landlordPlans: PricingPlan[];
}

export default function PricingCards({ societyPlans, landlordPlans }: Props) {
  const [tab, setTab] = useState<"society" | "landlord">("society");
  const plans = tab === "society" ? societyPlans : landlordPlans;

  return (
    <>
      {/* Tab Toggle */}
      <div className="flex justify-center gap-1 mb-9">
        {[
          { id: "society" as const, label: "🏢 Society Plans" },
          { id: "landlord" as const, label: "👨‍💼 Landlord Plans" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all ${
              tab === t.id
                ? "bg-brand-500 text-white"
                : "bg-white/[0.08] text-white/60 hover:bg-white/[0.12]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[900px] mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`hover-lift rounded-[20px] p-8 text-center relative ${
              plan.is_popular
                ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white"
                : "bg-white/[0.05] text-white/90 border border-white/10"
            }`}
          >
            {plan.is_popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-brand-500 px-4 py-1 rounded-[20px] text-[11px] font-extrabold">
                {plan.badge_text || "MOST POPULAR"}
              </div>
            )}

            <div className="text-lg font-bold mb-1">{plan.name}</div>
            <div className="font-serif text-[40px] font-black my-2">
              ₹{Number(plan.price).toLocaleString("en-IN")}
              <span className="text-base font-normal opacity-70">/mo</span>
            </div>
            <div className="text-[13px] opacity-70 mb-5">{plan.description}</div>

            {(plan.features || []).map((feature) => (
              <div
                key={feature.id}
                className={`text-[13px] py-[5px] border-b border-white/[0.08] text-left ${
                  feature.is_highlight ? "font-semibold" : ""
                }`}
              >
                ✓ {feature.feature_text}
              </div>
            ))}

            <button
              className={`hover-lift w-full mt-5 py-3 px-7 rounded-xl text-sm font-bold cursor-pointer ${
                plan.is_popular
                  ? "border-2 border-white bg-white/15 text-white"
                  : "border-2 border-brand-500 bg-transparent text-brand-500 hover:bg-brand-500/10"
              }`}
            >
              {plan.cta_text}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
