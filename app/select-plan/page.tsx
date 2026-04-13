"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { getActivePricingPlans, type PricingPlan } from "@/lib/pricing-data";
import {
  getFreeTiralDays,
  createFreeTrialSubscription,
} from "@/lib/subscription";
import toast, { Toaster } from "react-hot-toast";

function SelectPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const planTypeParam = searchParams.get("type") as "society" | "landlord" | null;
  const societyId = searchParams.get("society") ?? null;

  const [planType, setPlanType] = useState<"society" | "landlord">(
    planTypeParam ?? "society"
  );
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [freeTrialDays, setFreeTrialDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  // quantity per plan (landlord mode)
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [fetchedPlans, days] = await Promise.all([
        getActivePricingPlans(planType),
        getFreeTiralDays(),
      ]);
      setPlans(fetchedPlans);
      setFreeTrialDays(days);
      setLoading(false);
    }
    load();
  }, [planType]);

  function getQty(planId: string) {
    return quantities[planId] ?? 1;
  }
  function setQty(planId: string, val: number) {
    setQuantities((p) => ({ ...p, [planId]: Math.max(1, Math.min(999, val)) }));
  }

  function totalPrice(plan: PricingPlan) {
    return plan.price * getQty(plan.id);
  }

  async function handleFreeTrial(plan: PricingPlan) {
    if (!user) { router.push("/"); return; }
    setActivating(plan.id);
    const result = await createFreeTrialSubscription({
      userId: user.id,
      societyId: societyId,
      planType: planType,
      planName: plan.name,
      planPrice: totalPrice(plan),
      trialDays: freeTrialDays,
    });
    setActivating(null);
    if (!result.success) {
      toast.error(result.error ?? "Could not start free trial.");
      return;
    }
    toast.success(`${freeTrialDays}-day free trial started! Welcome to MyRentSaathi.`);
    router.push(planType === "society" ? "/admin" : "/landlord");
  }

  function handleActivatePaid(plan: PricingPlan) {
    if (!user) { router.push("/"); return; }
    const qty = getQty(plan.id);
    const params = new URLSearchParams({
      plan:    plan.name,
      type:    planType,
      price:   String(plan.price),
      qty:     String(qty),
      ...(societyId ? { society: societyId } : {}),
    });
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center py-12 px-4">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="text-center mb-2">
        <a href="/" className="inline-flex items-center gap-2 mb-6">
          <span className="text-3xl">🏠</span>
          <span className="font-serif text-2xl font-extrabold text-white">
            MyRent<span className="text-[#e07b2e]">Saathi</span>
          </span>
        </a>
        <h1 className="text-3xl font-extrabold text-white mt-4">Choose Your Plan</h1>
        <p className="text-gray-400 mt-2 text-sm">
          {freeTrialDays}-day free trial. No credit card. Cancel anytime.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-[#1a1a1a] rounded-full p-1 mt-6 mb-6 border border-[#2a2a2a]">
        <button
          onClick={() => setPlanType("society")}
          className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer ${
            planType === "society" ? "bg-[#e07b2e] text-white shadow" : "text-gray-400 hover:text-white"
          }`}
        >
          🏢 Society Plans
        </button>
        <button
          onClick={() => setPlanType("landlord")}
          className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer ${
            planType === "landlord" ? "bg-[#e07b2e] text-white shadow" : "text-gray-400 hover:text-white"
          }`}
        >
          🏠 Landlord Plans
        </button>
      </div>

      {/* Per-unit explainer */}
      {!loading && (
        <div className="w-full max-w-5xl mb-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-2xl mt-0.5">💡</span>
          <div>
            <div className="text-white text-sm font-bold mb-0.5">Per-Unit Pricing</div>
            <div className="text-gray-400 text-[13px]">
              {planType === "society"
                ? <>Yeh plans <strong className="text-white">per landlord</strong> ke hisaab se hain. Apni society mein kitne landlords hain woh select karo — total price automatically calculate hoga.</>
                : <>Yeh plans <strong className="text-white">per flat ya tenant</strong> ke hisaab se hain. Kitne flats manage karne hain woh select karo — total price automatically calculate hoga.</>
              }
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      {loading ? (
        <div className="text-gray-400 text-sm py-20">Loading plans...</div>
      ) : (
        <div className={`grid grid-cols-1 gap-6 w-full ${
          plans.length === 1 ? "max-w-sm" :
          plans.length === 2 ? "md:grid-cols-2 max-w-2xl" :
                               "md:grid-cols-3 max-w-5xl"
        }`}>
          {plans.map((plan) => {
            const qty = getQty(plan.id);
            const total = totalPrice(plan);
            const isActivating = activating === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border flex flex-col p-6 transition-all ${
                  plan.is_popular
                    ? "bg-[#e07b2e] border-[#e07b2e] text-white scale-[1.03] shadow-[0_8px_40px_rgba(224,123,46,0.35)]"
                    : "bg-[#1a1a1a] border-[#2a2a2a] text-white"
                }`}
              >
                {/* Badge */}
                {plan.badge_text && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-white text-[#e07b2e] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide shadow">
                      {plan.badge_text}
                    </span>
                  </div>
                )}

                <div className="text-lg font-extrabold mb-1">{plan.name}</div>

                {/* Price */}
                <div className="mb-1">
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-extrabold">
                      ₹{plan.price.toLocaleString("en-IN")}
                    </span>
                    <span className={`text-xs mb-1.5 ${plan.is_popular ? "text-white/80" : "text-gray-400"}`}>
                      /{planType === "society" ? "landlord" : "flat"}/mo
                    </span>
                  </div>
                  {qty > 1 && (
                    <div className={`text-sm font-bold ${plan.is_popular ? "text-white/90" : "text-[#e07b2e]"}`}>
                      Total: ₹{total.toLocaleString("en-IN")}/mo
                    </div>
                  )}
                </div>

                {plan.description && (
                  <div className={`text-xs mb-3 ${plan.is_popular ? "text-white/80" : "text-gray-400"}`}>
                    {plan.description}
                  </div>
                )}

                {/* Quantity selector — both society and landlord */}
                <div className={`rounded-xl p-3 mb-4 ${plan.is_popular ? "bg-white/15" : "bg-white/[0.04] border border-[#333]"}`}>
                    <div className="text-[11px] font-bold opacity-60 mb-2 uppercase tracking-wide">
                      {planType === "society" ? "Kitne landlords hain?" : "Kitne flats / tenants hain?"}
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setQty(plan.id, qty - 1)}
                        disabled={qty <= 1}
                        className={`w-8 h-8 rounded-lg text-base font-bold cursor-pointer transition-all disabled:opacity-30 ${
                          plan.is_popular ? "bg-white/20 hover:bg-white/30" : "bg-white/10 hover:bg-white/20"
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
                          plan.is_popular ? "border-white/40" : "border-[#444]"
                        }`}
                      />
                      <button
                        onClick={() => setQty(plan.id, qty + 1)}
                        className={`w-8 h-8 rounded-lg text-base font-bold cursor-pointer transition-all ${
                          plan.is_popular ? "bg-white/20 hover:bg-white/30" : "bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        +
                      </button>
                    </div>
                    <div className="text-[11px] opacity-50 text-center mt-1.5">
                      {qty} {planType === "society" ? (qty === 1 ? "landlord" : "landlords") : (qty === 1 ? "flat" : "flats")} × ₹{plan.price}/mo = ₹{total.toLocaleString("en-IN")}/mo
                    </div>
                  </div>

                {/* Features */}
                <ul className="flex-1 space-y-2 mb-5">
                  {(plan.features ?? []).map((f) => (
                    <li key={f.id} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 ${plan.is_popular ? "text-white" : "text-[#e07b2e]"}`}>✓</span>
                      <span className={f.is_highlight ? "font-bold" : ""}>{f.feature_text}</span>
                    </li>
                  ))}
                </ul>

                {/* Free Trial button */}
                <button
                  onClick={() => handleFreeTrial(plan)}
                  disabled={isActivating}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-60 mb-2 ${
                    plan.is_popular
                      ? "bg-white text-[#e07b2e] hover:bg-gray-100"
                      : "bg-[#e07b2e] text-white hover:bg-[#c96d24]"
                  }`}
                >
                  {isActivating ? "Starting..." : `Start ${freeTrialDays}-Day Free Trial`}
                </button>

                {/* Go to Checkout */}
                {plan.price > 0 && (
                  <button
                    onClick={() => handleActivatePaid(plan)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      plan.is_popular
                        ? "border-white/40 text-white hover:bg-white/10"
                        : "border-[#3a3a3a] text-gray-300 hover:bg-[#2a2a2a]"
                    }`}
                  >
                    Buy Plan — ₹{total.toLocaleString("en-IN")}/mo →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-gray-600 mt-8">
        Aapka data safe hai — plan expire hone ke baad bhi sab records preserve rahenge.
      </p>
    </div>
  );
}

export default function SelectPlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-gray-400 text-sm">Loading plans...</div>}>
      <SelectPlanContent />
    </Suspense>
  );
}
