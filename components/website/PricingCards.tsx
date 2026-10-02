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
  // All plans in ONE grid (no Society/Landlord tabs) — each card says who it is
  // for. Landlord plans first, matching the signup page default.
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function getQty(planId: string) {
    return quantities[planId] ?? 1;
  }

  function setQty(planId: string, val: number) {
    setQuantities((prev) => ({ ...prev, [planId]: Math.max(1, Math.min(999, val)) }));
  }

  type Kind = "society" | "landlord";
  const items: { plan: PricingPlan; kind: Kind }[] = [
    ...landlordPlans.map((plan) => ({ plan, kind: "landlord" as Kind })),
    ...societyPlans.map((plan) => ({ plan, kind: "society" as Kind })),
  ];

  function totalPrice(plan: PricingPlan) {
    return plan.price * getQty(plan.id);
  }

  return (
    <>
      {/* Per-unit explainer */}
      <div className="max-w-[900px] mx-auto mb-8 bg-white/[0.06] border border-white/10 rounded-2xl px-5 py-4 flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div className="text-white/70 text-[13px] leading-relaxed">
          <strong className="text-white">Simple per-unit pricing.</strong> Landlords pay <strong className="text-white">per flat / tenant</strong>; societies pay <strong className="text-white">per landlord</strong> in the society. Choose the quantity — the total updates automatically. {freeTrialDays}-day free trial on every plan, no credit card.
        </div>
      </div>

      {/* Pricing Cards — grid adapts to plan count */}
      <div className={`grid grid-cols-1 gap-5 mx-auto w-full ${
        items.length === 1 ? "max-w-[340px]" :
        items.length === 2 ? "md:grid-cols-2 max-w-[700px]" :
                             "md:grid-cols-3 max-w-[900px]"
      }`}>
        {items.map(({ plan, kind }) => {
          const qty = getQty(plan.id);
          const tab = kind;
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

              <div className={`inline-block mx-auto mb-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${plan.is_popular ? "bg-white/20 text-white" : "bg-brand-500/15 text-brand-400"}`}>
                {kind === "landlord" ? "👨‍💼 For Landlords" : "🏢 For Societies & RWAs"}
              </div>
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
                  How many {tab === "society" ? "landlords?" : "flats / tenants?"}
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
