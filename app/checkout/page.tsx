"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/MockAuthProvider";
import { activatePaidPlan } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

// ── Duration options ──────────────────────────────────────────
const DURATIONS = [
  { months: 1,  label: "Monthly",     sublabel: "Billed every month",      discount: 0   },
  { months: 3,  label: "3 Months",    sublabel: "Save 5% vs monthly",       discount: 5   },
  { months: 6,  label: "6 Months",    sublabel: "Save 10% vs monthly",      discount: 10  },
  { months: 12, label: "12 Months",   sublabel: "Save 20% vs monthly",      discount: 20  },
];

// ── Promo code list — mirrors superadmin/promos page ─────────
// When DB promo table is added, replace this with a fetch call
const ALL_PROMOS = [
  { code: "LAUNCH50",   type: "percentage", value: 50,   maxUses: 500,  used: 234, validTill: "2026-04-30", status: "active"  },
  { code: "SOCIETY20",  type: "percentage", value: 20,   maxUses: 200,  used: 89,  validTill: "2026-06-30", status: "active"  },
  { code: "FLAT1000",   type: "fixed",      value: 1000, maxUses: 1000, used: 445, validTill: "2026-12-31", status: "active"  },
  { code: "AGENTRAHUL", type: "percentage", value: 10,   maxUses: 100,  used: 45,  validTill: "2026-12-31", status: "active"  },
  { code: "AGENTSNEHA", type: "percentage", value: 10,   maxUses: 100,  used: 28,  validTill: "2026-12-31", status: "active"  },
  { code: "NRI30",      type: "percentage", value: 30,   maxUses: 100,  used: 28,  validTill: "2026-09-30", status: "active"  },
  { code: "DIWALI25",   type: "percentage", value: 25,   maxUses: 300,  used: 300, validTill: "2025-11-30", status: "expired" },
  { code: "SUMMER10",   type: "percentage", value: 10,   maxUses: 400,  used: 145, validTill: "2026-08-31", status: "active"  },
];

type PromoResult = { type: "percent" | "flat"; value: number; label: string };

function validatePromo(code: string): { valid: true; promo: PromoResult } | { valid: false; error: string } {
  const found = ALL_PROMOS.find((p) => p.code === code.trim().toUpperCase());
  if (!found) return { valid: false, error: "Invalid promo code." };
  if (found.status === "expired") return { valid: false, error: "Yeh promo code expire ho chuka hai." };
  if (new Date() > new Date(found.validTill)) return { valid: false, error: "Yeh promo code expire ho chuka hai." };
  if (found.used >= found.maxUses) return { valid: false, error: "Yeh promo code ki limit khatam ho gayi hai." };
  const type: "percent" | "flat" = found.type === "percentage" ? "percent" : "flat";
  const label = type === "percent" ? `${found.value}% off` : `₹${found.value} flat discount`;
  return { valid: true, promo: { type, value: found.value, label } };
}

function applyPromo(price: number, promo: PromoResult | null): number {
  if (!promo) return price;
  if (promo.type === "percent") return Math.round(price * (1 - promo.value / 100));
  return Math.max(0, price - promo.value);
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Params from select-plan
  const planName    = searchParams.get("plan") ?? "";
  const planType    = (searchParams.get("type") ?? "society") as "society" | "landlord";
  const basePrice   = Number(searchParams.get("price") ?? 0);   // per unit per month
  const qty         = Number(searchParams.get("qty")   ?? 1);
  const societyId   = searchParams.get("society") ?? null;

  const monthlyTotal = basePrice * qty; // before duration discount

  const [duration, setDuration]       = useState(DURATIONS[0]);
  const [promoInput, setPromoInput]   = useState("");
  const [promoApplied, setPromoApplied] = useState<PromoResult | null>(null);
  const [promoError, setPromoError]   = useState("");
  const [paying, setPaying]           = useState(false);

  // Redirect if no plan info
  useEffect(() => {
    if (!planName || !basePrice) router.push("/select-plan");
  }, [planName, basePrice, router]);

  // ── Price calculations ──────────────────────────────────────
  const priceAfterDuration  = Math.round(monthlyTotal * (1 - duration.discount / 100));
  const totalForPeriod      = priceAfterPriceCalc(priceAfterDuration, duration.months);
  const priceAfterPromo     = applyPromo(totalForPeriod, promoApplied);
  const savings             = totalForPeriod - priceAfterPromo
                            + (monthlyTotal * duration.months - totalForPeriod); // duration savings
  const totalSavings        = monthlyTotal * duration.months - priceAfterPromo;

  function priceAfterPriceCalc(monthlyRate: number, months: number) {
    return monthlyRate * months;
  }

  function handleApplyPromo() {
    const code = promoInput.trim();
    if (!code) { setPromoError("Promo code enter karein."); return; }
    const result = validatePromo(code);
    if (!result.valid) { setPromoError(result.error); setPromoApplied(null); return; }
    setPromoApplied(result.promo);
    setPromoError("");
    toast.success(`Promo applied: ${result.promo.label}`);
  }

  function handleRemovePromo() {
    setPromoApplied(null);
    setPromoInput("");
    setPromoError("");
  }

  async function handlePayNow() {
    if (!user) { router.push("/"); return; }
    setPaying(true);

    // Payment gateway not active yet — directly activate plan
    const result = await activatePaidPlan({
      userId: user.id,
      societyId: societyId,
      planType: planType,
      planName: planName,
      planPrice: priceAfterPromo,
      durationDays: duration.months * 30,
    });

    setPaying(false);

    if (!result.success) {
      toast.error(result.error ?? "Plan activate nahi hua.");
      return;
    }

    toast.success(`${planName} plan ${duration.months} month ke liye activate ho gaya!`);
    router.push(planType === "society" ? "/admin" : "/landlord");
  }

  const unitLabel = planType === "society" ? "landlord" : "flat";

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center py-10 px-4">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="w-full max-w-xl mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 mb-6 cursor-pointer">
          ← Back to plans
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏠</span>
          <span className="font-serif text-xl font-extrabold">
            MyRent<span className="text-[#e07b2e]">Saathi</span>
          </span>
        </div>
        <h1 className="text-2xl font-extrabold mt-4">Checkout</h1>
        <p className="text-gray-400 text-sm mt-1">Review your plan and complete payment.</p>
      </div>

      <div className="w-full max-w-xl space-y-4">

        {/* ── Plan Summary ── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Selected Plan</div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-extrabold">{planName} <span className="text-[#e07b2e] text-sm font-bold capitalize">({planType})</span></div>
              <div className="text-gray-400 text-sm mt-0.5">
                {qty} {qty === 1 ? unitLabel : unitLabel + "s"} × ₹{basePrice.toLocaleString("en-IN")}/{unitLabel}/mo
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-extrabold">₹{monthlyTotal.toLocaleString("en-IN")}</div>
              <div className="text-gray-500 text-xs">/month</div>
            </div>
          </div>
        </div>

        {/* ── Duration Selector ── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Kitne Months Ke Liye?</div>
          <div className="grid grid-cols-2 gap-2.5">
            {DURATIONS.map((d) => (
              <button
                key={d.months}
                onClick={() => setDuration(d)}
                className={`relative rounded-xl p-3.5 text-left border-2 transition-all cursor-pointer ${
                  duration.months === d.months
                    ? "border-[#e07b2e] bg-[#e07b2e]/10"
                    : "border-[#2a2a2a] hover:border-[#444]"
                }`}
              >
                {d.discount > 0 && (
                  <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                    -{d.discount}%
                  </span>
                )}
                <div className="font-extrabold text-[14px]">{d.label}</div>
                <div className="text-gray-400 text-[11px] mt-0.5">{d.sublabel}</div>
                <div className={`text-sm font-bold mt-1.5 ${duration.months === d.months ? "text-[#e07b2e]" : "text-white"}`}>
                  ₹{Math.round(monthlyTotal * (1 - d.discount / 100)).toLocaleString("en-IN")}/mo
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Promo Code ── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Promo Code</div>
          {promoApplied ? (
            <div className="flex items-center justify-between bg-green-900/30 border border-green-700/40 rounded-xl px-4 py-3">
              <div>
                <div className="text-green-400 font-bold text-sm">✓ {promoInput.toUpperCase()}</div>
                <div className="text-green-300/70 text-xs mt-0.5">{promoApplied.label}</div>
              </div>
              <button onClick={handleRemovePromo} className="text-gray-400 hover:text-white text-xs cursor-pointer underline">
                Remove
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                  placeholder="Enter promo code"
                  className="flex-1 bg-[#0f0f0f] border border-[#333] rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-[#e07b2e] text-white placeholder-gray-600 uppercase"
                />
                <button
                  onClick={handleApplyPromo}
                  className="px-4 py-2.5 rounded-xl bg-[#e07b2e] text-white text-sm font-bold cursor-pointer hover:bg-[#c96d24] transition-colors"
                >
                  Apply
                </button>
              </div>
              {promoError && <div className="text-red-400 text-xs mt-1.5">{promoError}</div>}
            </div>
          )}
        </div>

        {/* ── Price Breakdown ── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Price Breakdown</div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>{qty} {unitLabel}{qty > 1 ? "s" : ""} × ₹{basePrice}/mo × {duration.months} month{duration.months > 1 ? "s" : ""}</span>
              <span>₹{(monthlyTotal * duration.months).toLocaleString("en-IN")}</span>
            </div>

            {duration.discount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>{duration.label} discount (−{duration.discount}%)</span>
                <span>−₹{(monthlyTotal * duration.months - totalForPeriod).toLocaleString("en-IN")}</span>
              </div>
            )}

            {promoApplied && (
              <div className="flex justify-between text-green-400">
                <span>Promo: {promoInput.toUpperCase()}</span>
                <span>−₹{(totalForPeriod - priceAfterPromo).toLocaleString("en-IN")}</span>
              </div>
            )}

            <div className="border-t border-[#2a2a2a] pt-2.5 flex justify-between font-extrabold text-base">
              <span>Total ({duration.months} month{duration.months > 1 ? "s" : ""})</span>
              <span className="text-[#e07b2e]">₹{priceAfterPromo.toLocaleString("en-IN")}</span>
            </div>

            {totalSavings > 0 && (
              <div className="bg-green-900/20 border border-green-800/30 rounded-lg px-3 py-2 text-green-400 text-xs font-bold text-center">
                🎉 Aap ₹{totalSavings.toLocaleString("en-IN")} bache is plan pe!
              </div>
            )}
          </div>
        </div>

        {/* ── Payment Gateway Notice ── */}
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-400 text-lg mt-0.5">🔧</span>
          <div className="text-xs text-amber-300/80 leading-relaxed">
            <strong className="text-amber-300">Payment gateway coming soon.</strong> Abhi "Pay Now" click karne se plan directly activate ho jaayega. Actual payment integration jald aayegi.
          </div>
        </div>

        {/* ── Pay Now Button ── */}
        <button
          onClick={handlePayNow}
          disabled={paying}
          className="w-full py-4 rounded-2xl bg-[#e07b2e] text-white font-extrabold text-base cursor-pointer hover:bg-[#c96d24] transition-colors disabled:opacity-60 shadow-[0_4px_20px_rgba(224,123,46,0.4)]"
        >
          {paying
            ? "Activating..."
            : `Pay ₹${priceAfterPromo.toLocaleString("en-IN")} & Activate Plan →`}
        </button>

        <p className="text-center text-[11px] text-gray-600 pb-6">
          Aapka data safe hai. Plan expire hone ke baad bhi sab records preserved rahenge.
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-gray-400 text-sm">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
