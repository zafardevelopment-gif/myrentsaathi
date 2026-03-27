import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";
import Pricing from "@/components/website/Pricing";
import FAQ from "@/components/website/FAQ";
import CTA from "@/components/website/CTA";
import Footer from "@/components/website/Footer";

export const metadata: Metadata = {
  title: "Pricing — Affordable Rent & Society Management Plans",
  description:
    "Transparent pricing for landlords and housing societies. Society plans from ₹2,999/mo. Landlord plans from ₹499/mo. 14-day free trial, no credit card.",
  alternates: { canonical: "https://www.myrentsaathi.com/pricing" },
  openGraph: {
    title: "MyRentSaathi Pricing — Society & Landlord Plans",
    description: "Society plans from ₹2,999/mo. Landlord plans from ₹499/mo. 14-day free trial.",
    url: "https://www.myrentsaathi.com/pricing",
  },
};

export default function PricingPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <HomePageClient />
      <main className="pt-20">
        <div className="text-center py-12 bg-gradient-to-b from-brand-900 to-brand-900/90 px-6">
          <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-3">
            PLANS & PRICING
          </span>
          <h1 className="font-serif text-[40px] font-extrabold text-white leading-tight tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-[17px] text-white/70 mt-3 max-w-[560px] mx-auto">
            No hidden fees. No long-term lock-in. Start free for 14 days — no credit card required.
          </p>
        </div>
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
