"use client";

import { useState } from "react";
import {
  WEBSITE_SOCIETY_PRICING,
  WEBSITE_LANDLORD_PRICING,
} from "@/lib/mockData";

export default function Pricing() {
  const [tab, setTab] = useState<"society" | "landlord">("society");
  const plans = tab === "society" ? WEBSITE_SOCIETY_PRICING : WEBSITE_LANDLORD_PRICING;

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
              key={plan.name}
              className={`hover-lift rounded-[20px] p-8 text-center relative ${
                plan.popular
                  ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white"
                  : "bg-white/[0.05] text-white/90 border border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-brand-500 px-4 py-1 rounded-[20px] text-[11px] font-extrabold">
                  MOST POPULAR
                </div>
              )}

              <div className="text-lg font-bold mb-1">{plan.name}</div>
              <div className="font-serif text-[40px] font-black my-2">
                {plan.price}
                <span className="text-base font-normal opacity-70">
                  {plan.period}
                </span>
              </div>
              <div className="text-[13px] opacity-70 mb-5">{plan.desc}</div>

              {plan.features.map((feature) => (
                <div
                  key={feature}
                  className="text-[13px] py-[5px] border-b border-white/[0.08] text-left"
                >
                  ✓ {feature}
                </div>
              ))}

              <button
                className={`hover-lift w-full mt-5 py-3 px-7 rounded-xl text-sm font-bold cursor-pointer ${
                  plan.popular
                    ? "border-2 border-white bg-white/15 text-white"
                    : "border-2 border-brand-500 bg-transparent text-brand-500 hover:bg-brand-500/10"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
