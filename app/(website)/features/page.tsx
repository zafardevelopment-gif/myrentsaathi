import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";
import Features from "@/components/website/Features";
import CTA from "@/components/website/CTA";
import Footer from "@/components/website/Footer";

export const metadata: Metadata = {
  title: "Features — Complete Rent & Society Management Software",
  description:
    "Explore all features: automated rent collection, maintenance tracking, AI agreement generator, WhatsApp reminders, parking management, polls & voting. Built for India.",
  alternates: { canonical: "https://www.myrentsaathi.com/features" },
  openGraph: {
    title: "MyRentSaathi Features — Complete Property Management Suite",
    description: "12+ features for landlords and housing societies. WhatsApp-native. Built for India.",
    url: "https://www.myrentsaathi.com/features",
  },
};

export default function FeaturesPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <HomePageClient />
      <main className="pt-20">
        <div className="text-center py-14 px-6">
          <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-3">
            ALL FEATURES
          </span>
          <h1 className="font-serif text-[40px] font-extrabold text-ink leading-tight tracking-tight">
            Everything You Need to Manage Property in India
          </h1>
          <p className="text-[17px] text-ink/60 mt-3 max-w-[600px] mx-auto">
            From rent collection to maintenance tracking, agreements to WhatsApp notifications —
            every tool you need, in one place.
          </p>
        </div>
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
