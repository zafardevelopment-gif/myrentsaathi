"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PricingPlan } from "@/lib/pricing-data";

interface Props {
  societyPlans: PricingPlan[];
  landlordPlans: PricingPlan[];
  freeTrialDays: number;
}

export default function PricingCards({ societyPlans, landlordPlans, freeTrialDays }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"society" | "landlord">("society");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function getQty(planId: string) {
    return quantities[planId] ?? 1;
  }

  function setQty(planId: string, val: number) {
    setQuantities((prev) => ({ ...prev, [planId]: Math.max(1, Math.min(999, val)) }));
  }

  const plans = tab === "society" ? societyPlans : landlordPlans;
  // Society plan is priced per landlord; Landlord plan is priced per flat/tenant
  const unitLabel    = tab === "society" ? "landlords" : "flats / tenants";
  const unitLabelHindi = tab === "society" ? "landlords" : "flats / tenants";

  function totalPrice(plan: PricingPlan) {
    return plan.price * getQty(plan.id);
  }

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

      {/* Per-unit explainer banner */}
      <div className="max-w-[900px] mx-auto mb-6 bg-white/[0.06] border border-white/10 rounded-2xl px-5 py-4 flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div>
          <div className="text-white text-sm font-bold mb-0.5">Per-Unit Pricing</div>
          <div className="text-white/60 text-[13px] leading-relaxed">
            {tab === "society"
              ? <>Plans are priced <strong className="text-white">per landlord</strong> in your society. Select how many landlords you manage — total updates automatically.</>
              : <>Plans are priced <strong className="text-white">per flat or tenant</strong> you manage. Select how many you need — price updates automatically.</>
            }
          </div>
        </div>
      </div>

      {/* Pricing Cards — grid adapts to plan count */}
      <div className={`grid grid-cols-1 gap-5 mx-auto w-full ${
        plans.length === 1 ? "max-w-[340px]" :
        plans.length === 2 ? "md:grid-cols-2 max-w-[620px]" :
                             "md:grid-cols-3 max-w-[900px]"
      }`}>
        {plans.map((plan) => {
          const qty = getQty(plan.id);
          const total = totalPrice(plan);

          return (
            <div
              key={plan.id}
              className={`hover-lift rounded-[20px] p-8 text-center relative flex flex-col ${
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

              {/* Price */}
              <div className="my-2">
                <div className="font-serif text-[36px] font-black">
                  ₹{Number(plan.price).toLocaleString("en-IN")}
                  <span className="text-sm font-normal opacity-70"> /{tab === "society" ? "landlord" : "flat"}/mo</span>
                </div>
                {qty > 1 && (
                  <div className={`text-[13px] font-bold mt-0.5 ${plan.is_popular ? "text-white/90" : "text-brand-400"}`}>
                    Total: ₹{total.toLocaleString("en-IN")}/mo
                  </div>
                )}
              </div>

              <div className="text-[13px] opacity-70 mb-4">{plan.description}</div>

              {/* Quantity selector */}
              <div className={`rounded-xl p-3 mb-4 ${plan.is_popular ? "bg-white/15" : "bg-white/[0.06] border border-white/10"}`}>
                <div className="text-[11px] font-bold opacity-70 mb-2 uppercase tracking-wide">
                  Kitne {tab === "society" ? "landlords hain?" : "flats / tenants hain?"}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setQty(plan.id, qty - 1)}
                    disabled={qty <= 1}
                    className={`w-8 h-8 rounded-lg text-lg font-bold cursor-pointer transition-all disabled:opacity-30 ${
                      plan.is_popular
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={qty}
                    onChange={(e) => setQty(plan.id, parseInt(e.target.value) || 1)}
                    className={`w-16 text-center text-[18px] font-extrabold rounded-lg py-1 bg-transparent border-2 outline-none ${
                      plan.is_popular ? "border-white/40 text-white" : "border-white/20 text-white"
                    }`}
                  />
                  <button
                    onClick={() => setQty(plan.id, qty + 1)}
                    className={`w-8 h-8 rounded-lg text-lg font-bold cursor-pointer transition-all ${
                      plan.is_popular
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    +
                  </button>
                </div>
                <div className="text-[11px] opacity-60 mt-1.5">
                  {qty} {tab === "society" ? (qty === 1 ? "landlord" : "landlords") : (qty === 1 ? "flat" : "flats")} × ₹{plan.price.toLocaleString("en-IN")}/mo
                  {qty > 1 && <> = <strong>₹{total.toLocaleString("en-IN")}/mo</strong></>}
                </div>
              </div>

              {/* Features */}
              <div className="flex-1">
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
              </div>

              {/* CTA */}
              <button
                onClick={() => router.push(`/signup?type=${tab}`)}
                className={`hover-lift w-full mt-5 py-3 px-7 rounded-xl text-sm font-bold cursor-pointer ${
                  plan.is_popular
                    ? "border-2 border-white bg-white/15 text-white"
                    : "border-2 border-brand-500 bg-transparent text-brand-500 hover:bg-brand-500/10"
                }`}
              >
                {plan.cta_text === "Start Free Trial"
                  ? `Start ${freeTrialDays}-Day Free Trial`
                  : plan.cta_text}
              </button>

              {plan.cta_text === "Start Free Trial" && (
                <div className="text-[11px] opacity-50 mt-2">
                  {freeTrialDays} din free • No credit card
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
