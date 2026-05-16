import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";

const BASE_URL = "https://www.myrentsaathi.com";

export const metadata: Metadata = {
  title: "MyRentSaathi vs MyGate — Best MyGate Alternative for Rent & Society Management",
  description:
    "Honest comparison: MyRentSaathi vs MyGate. See why 500+ landlords switched — WhatsApp-native rent collection, AI agreements, and transparent pricing vs MyGate's limited rent features.",
  keywords: [
    "mygate alternative", "best mygate alternative 2026", "mygate vs myrentsaathi",
    "society management software india", "mygate competitor", "rent collection mygate",
    "housing society app india", "mygate alternative free",
  ],
  alternates: { canonical: `${BASE_URL}/vs-mygate` },
  openGraph: {
    title: "MyRentSaathi vs MyGate — Which is Better for Your Society?",
    description: "Fair comparison of MyRentSaathi vs MyGate. WhatsApp-native rent collection, AI agreements, transparent pricing.",
    url: `${BASE_URL}/vs-mygate`,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is MyRentSaathi a good alternative to MyGate?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. MyRentSaathi covers everything MyGate does for society management, but adds WhatsApp-native rent collection, AI rental agreement generation, NRI property management, and transparent ₹499/month pricing. MyGate is primarily a visitor management and communication app — it lacks integrated rent collection and agreement tools." },
    },
    {
      "@type": "Question",
      name: "Does MyGate have rent collection features?",
      acceptedAnswer: { "@type": "Answer", text: "MyGate has basic maintenance collection features, but does not offer WhatsApp-native payment links, AI rental agreement generation, landlord-specific dashboards, or NRI remote management. MyRentSaathi is purpose-built for the full rent + society management workflow." },
    },
    {
      "@type": "Question",
      name: "What is the pricing difference between MyGate and MyRentSaathi?",
      acceptedAnswer: { "@type": "Answer", text: "MyGate charges per-flat fees and has opaque pricing that varies by society size. MyRentSaathi starts at ₹499/month for landlords and ₹2,999/month for societies — transparent, flat pricing with all features included. 14-day free trial, no credit card required." },
    },
    {
      "@type": "Question",
      name: "Can MyRentSaathi replace MyGate completely?",
      acceptedAnswer: { "@type": "Answer", text: "For most housing societies, yes. MyRentSaathi covers maintenance billing, expense management, complaint tickets, notices, polls & voting, visitor management, and WhatsApp communication — plus rent collection and agreement tools that MyGate doesn't offer." },
    },
  ],
};

const COMPARISON = [
  { feature: "WhatsApp-native rent collection", mrs: true, mygate: false, note: "Send UPI links directly on WhatsApp" },
  { feature: "AI rental agreement generator", mrs: true, mygate: false, note: "Free draft + lawyer review ₹499" },
  { feature: "Maintenance billing & collection", mrs: true, mygate: true, note: "" },
  { feature: "Visitor management", mrs: true, mygate: true, note: "" },
  { feature: "Expense management", mrs: true, mygate: true, note: "" },
  { feature: "Complaint ticketing", mrs: true, mygate: true, note: "" },
  { feature: "Polls & voting (RWA)", mrs: true, mygate: true, note: "" },
  { feature: "NRI remote management", mrs: true, mygate: false, note: "WhatsApp-only, no app needed" },
  { feature: "Landlord-specific dashboard", mrs: true, mygate: false, note: "Multi-property, multi-city" },
  { feature: "Tenant onboarding & KYC", mrs: true, mygate: false, note: "Aadhaar/PAN verification" },
  { feature: "Tax-ready income reports", mrs: true, mygate: false, note: "TDS, Form 26AS prep" },
  { feature: "Transparent flat pricing", mrs: true, mygate: false, note: "₹499/mo landlord, ₹2,999/mo society" },
  { feature: "14-day free trial", mrs: true, mygate: false, note: "" },
  { feature: "Guard app / intercom", mrs: false, mygate: true, note: "MyGate's core strength" },
  { feature: "Vehicle management", mrs: false, mygate: true, note: "" },
];

const FAQS = [
  { q: "Is MyRentSaathi a good alternative to MyGate?", a: "Yes. MyRentSaathi covers everything MyGate does for society management, but adds WhatsApp-native rent collection, AI agreements, NRI management, and transparent pricing. MyGate is primarily a visitor/communication app." },
  { q: "Does MyGate have rent collection features?", a: "MyGate has basic maintenance collection but lacks WhatsApp-native payment links, AI agreement generation, landlord dashboards, or NRI support. MyRentSaathi is purpose-built for the full rent + society workflow." },
  { q: "What is the pricing difference?", a: "MyGate has opaque per-flat pricing. MyRentSaathi: ₹499/month for landlords, ₹2,999/month for societies — all features included, 14-day free trial, no credit card." },
  { q: "Can MyRentSaathi replace MyGate completely?", a: "For most societies, yes. Only exception: guard app with physical intercom/vehicle barrier integration. For rent + society management, MyRentSaathi is significantly more capable." },
];

export default function VsMygatePage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] text-white text-center">
        <nav className="text-[12px] text-white/50 mb-6 flex items-center justify-center gap-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <span>MyRentSaathi vs MyGate</span>
        </nav>
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-purple-300 bg-purple-900/50 border border-purple-700 tracking-wider mb-4">
          HONEST COMPARISON — 2026
        </span>
        <h1 className="font-serif text-[40px] font-extrabold leading-tight tracking-tight max-w-[820px] mx-auto">
          MyRentSaathi vs MyGate — Which Society Management Software is Right for You?
        </h1>
        <p className="text-[17px] text-white/70 mt-4 max-w-[640px] mx-auto leading-relaxed">
          A fair, feature-by-feature comparison. See which platform covers rent collection, agreements, and society management better — and at what price.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] hover:bg-brand-600">
            Start Free Trial — No Credit Card
          </Link>
          <Link href="/pricing" className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10">
            View Pricing
          </Link>
        </div>
      </section>

      {/* Quick verdict */}
      <section className="py-12 px-6 max-w-[900px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-green-50 border border-green-200 rounded-[16px] p-6">
            <div className="text-2xl mb-2">✅</div>
            <div className="font-bold text-green-800 text-[15px] mb-2">Choose MyRentSaathi if you…</div>
            <ul className="space-y-1.5 text-[13px] text-green-700">
              {[
                "Want WhatsApp-native rent collection",
                "Need AI rental agreement generation",
                "Are an NRI managing properties remotely",
                "Own multiple properties across cities",
                "Want transparent, flat pricing",
                "Need tax reports & TDS compliance",
              ].map((i) => <li key={i}>• {i}</li>)}
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-[16px] p-6">
            <div className="text-2xl mb-2">ℹ️</div>
            <div className="font-bold text-blue-800 text-[15px] mb-2">Consider MyGate if you…</div>
            <ul className="space-y-1.5 text-[13px] text-blue-700">
              {[
                "Need physical guard app + intercom integration",
                "Require vehicle barrier/boom gate control",
                "Already have all residents on MyGate",
                "Only need visitor log + society communication",
                "Don't have landlords collecting rent separately",
              ].map((i) => <li key={i}>• {i}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-12 px-6 max-w-[900px] mx-auto">
        <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-8">
          Feature-by-Feature Comparison
        </h2>
        <div className="bg-white rounded-[16px] border border-border-default overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_120px] bg-warm-50 border-b border-border-default px-5 py-3 text-[12px] font-bold text-ink-muted">
            <span>Feature</span>
            <span className="text-center text-brand-600">MyRentSaathi</span>
            <span className="text-center text-gray-500">MyGate</span>
          </div>
          {COMPARISON.map((row, i) => (
            <div key={row.feature} className={`grid grid-cols-[1fr_120px_120px] px-5 py-3.5 items-center ${i < COMPARISON.length - 1 ? "border-b border-border-light" : ""}`}>
              <div>
                <span className="text-[13px] font-semibold text-ink">{row.feature}</span>
                {row.note && <span className="ml-2 text-[11px] text-ink-muted">({row.note})</span>}
              </div>
              <div className="text-center text-[18px]">{row.mrs ? "✅" : "❌"}</div>
              <div className="text-center text-[18px]">{row.mygate ? "✅" : "❌"}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing comparison */}
      <section className="py-12 bg-warm-50 px-6">
        <div className="max-w-[800px] mx-auto">
          <h2 className="font-serif text-[26px] font-extrabold text-ink text-center mb-8">Pricing Comparison</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white rounded-[16px] border-2 border-brand-500 p-6">
              <div className="font-bold text-brand-600 text-[14px] mb-1">MyRentSaathi</div>
              <div className="text-[12px] text-ink/60 mb-4">Transparent flat pricing</div>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between"><span>Landlord Basic</span><strong>₹499/mo</strong></div>
                <div className="flex justify-between"><span>Landlord Pro (10 properties)</span><strong>₹999/mo</strong></div>
                <div className="flex justify-between"><span>NRI Plan (unlimited)</span><strong>₹1,999/mo</strong></div>
                <div className="flex justify-between"><span>Society Starter</span><strong>₹2,999/mo</strong></div>
                <div className="flex justify-between text-green-600"><span>Free Trial</span><strong>14 days ✓</strong></div>
              </div>
            </div>
            <div className="bg-white rounded-[16px] border border-border-default p-6">
              <div className="font-bold text-gray-600 text-[14px] mb-1">MyGate</div>
              <div className="text-[12px] text-ink/60 mb-4">Per-flat pricing (varies)</div>
              <div className="space-y-2 text-[13px] text-ink/70">
                <div>Pricing negotiated per society</div>
                <div>Per-flat charges apply</div>
                <div>Add-ons for advanced features</div>
                <div>No landlord-specific plan</div>
                <div>No rent collection pricing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 max-w-[800px] mx-auto">
        <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-8">FAQs</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <div key={faq.q} className="bg-white rounded-[14px] border border-border-default p-5">
              <h3 className="font-bold text-ink text-[14px] mb-2">{faq.q}</h3>
              <p className="text-[13px] text-ink/70 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Internal links */}
      <section className="py-8 px-6 max-w-[900px] mx-auto">
        <div className="bg-warm-50 rounded-[16px] p-5 border border-border-default flex flex-wrap gap-3 text-[13px]">
          {[
            { label: "For Societies", href: "/for-societies" },
            { label: "For Landlords", href: "/for-landlords" },
            { label: "Rental Agreement Generator", href: "/rental-agreement-generator" },
            { label: "NRI Property Management", href: "/nri-property-management" },
            { label: "Visitor Management", href: "/visitor-management" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-brand-500 font-semibold hover:underline">{l.label}</Link>
          ))}
        </div>
      </section>

      <CTA />
      <Footer />
    </div>
  );
}
