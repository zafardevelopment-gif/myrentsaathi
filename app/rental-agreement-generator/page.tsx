import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";

const BASE_URL = "https://www.myrentsaathi.com";

export const metadata: Metadata = {
  title: "Online Rental Agreement Generator India — Free Legal Draft in 2 Minutes",
  description:
    "Generate a legally valid rental agreement online in India — free AI draft, lawyer review at ₹499, registration support. Available for Delhi, Mumbai, Bangalore, Pune, Hyderabad & more.",
  keywords: [
    "online rental agreement india", "rent agreement generator", "rental agreement format india",
    "lease agreement india online", "rent agreement maker", "legal rental agreement india",
    "rent agreement delhi", "rent agreement mumbai", "rent agreement bangalore",
    "11 month rent agreement", "rent agreement stamp duty india",
  ],
  alternates: { canonical: `${BASE_URL}/rental-agreement-generator` },
  openGraph: {
    title: "Online Rental Agreement Generator India — Free Legal Draft",
    description: "AI-powered rent agreement generator for India. Free draft, lawyer verified at ₹499.",
    url: `${BASE_URL}/rental-agreement-generator`,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is an online rental agreement legally valid in India?",
      acceptedAnswer: { "@type": "Answer", text: "Yes — a rental agreement generated online is legally valid when printed on appropriate stamp paper and signed by both parties. For agreements exceeding 11 months, registration at the Sub-Registrar office is mandatory. MyRentSaathi's AI generator includes city-specific stamp duty guidance and registration support." },
    },
    {
      "@type": "Question",
      name: "What is the stamp duty for a rent agreement in India?",
      acceptedAnswer: { "@type": "Answer", text: "Stamp duty varies by state. For 11-month agreements: ₹100–₹500 (no registration needed). For 12+ months: 0.25%–2% of total rent depending on state. Maharashtra, Delhi, Karnataka, and Telangana have different slabs. Our generator provides city-specific guidance automatically." },
    },
    {
      "@type": "Question",
      name: "How quickly can I generate a rental agreement?",
      acceptedAnswer: { "@type": "Answer", text: "You can generate a free AI draft in under 2 minutes. Fill in the details — landlord name, tenant name, property address, rent amount, tenure — and download the PDF instantly. Lawyer review takes 24 hours." },
    },
    {
      "@type": "Question",
      name: "What is the difference between 11-month and 12-month rent agreement?",
      acceptedAnswer: { "@type": "Answer", text: "An 11-month agreement avoids mandatory registration (which is required for 12+ month agreements under the Registration Act, 1908). This saves registration costs. However, a registered agreement offers stronger legal protection. MyRentSaathi generates both formats with appropriate clauses." },
    },
    {
      "@type": "Question",
      name: "Can I get a lawyer to review my rental agreement?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. MyRentSaathi offers lawyer review of your generated agreement at ₹499. A licensed property lawyer reviews within 24 hours and certifies the agreement. Registration assistance is available at ₹999." },
    },
    {
      "@type": "Question",
      name: "Which cities does the rental agreement generator support?",
      acceptedAnswer: { "@type": "Answer", text: "Currently supported: Delhi, Mumbai, Bangalore, Hyderabad, Pune, Chennai, Kolkata, and Ahmedabad — with city-specific stamp duty, clauses, and registration guidance. More cities being added." },
    },
  ],
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MyRentSaathi Rental Agreement Generator",
  applicationCategory: "LegalService",
  operatingSystem: "Web",
  url: `${BASE_URL}/rental-agreement-generator`,
  description: "AI-powered online rental agreement generator for India. Free draft, city-specific clauses, lawyer review option.",
  offers: [
    { "@type": "Offer", name: "Free AI Draft", price: "0", priceCurrency: "INR" },
    { "@type": "Offer", name: "Lawyer Reviewed", price: "499", priceCurrency: "INR" },
    { "@type": "Offer", name: "Registered Agreement", price: "999", priceCurrency: "INR" },
  ],
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "500", bestRating: "5" },
};

const CITIES = [
  { name: "Delhi", slug: "delhi", stamp: "2% of annual rent", note: "Mandatory registration >11 months" },
  { name: "Mumbai", slug: "mumbai", stamp: "0.25% (Leave & Licence)", note: "iGR Maharashtra online registration" },
  { name: "Bangalore", slug: "bangalore", stamp: "0.5% of total rent", note: "Karnataka Kaveri portal" },
  { name: "Hyderabad", slug: "hyderabad", stamp: "0.5% of total rent", note: "IGRS Telangana portal" },
  { name: "Pune", slug: "pune", stamp: "0.25% (Leave & Licence)", note: "Same as Maharashtra" },
  { name: "Chennai", slug: "chennai", stamp: "1% of rent + deposit", note: "TNREGINET online" },
  { name: "Kolkata", slug: "kolkata", stamp: "1% of annual rent", note: "Registration mandatory >1 year" },
  { name: "Ahmedabad", slug: "ahmedabad", stamp: "1.75% of total rent", note: "IGR Gujarat portal" },
];

const FAQS = [
  { q: "Is an online rental agreement legally valid in India?", a: "Yes — when printed on stamp paper and signed by both parties. For 12+ month agreements, Sub-Registrar registration is mandatory." },
  { q: "What is the stamp duty for a rent agreement?", a: "Varies by state. For 11-month agreements: ₹100–₹500. For 12+ months: 0.25%–2% of total rent. Our generator shows city-specific guidance." },
  { q: "How quickly can I generate a rental agreement?", a: "Free AI draft in under 2 minutes. Fill in the details, download the PDF instantly. Lawyer review within 24 hours." },
  { q: "What is the difference between 11-month and 12-month agreement?", a: "11-month agreements avoid mandatory registration (required for 12+ months under Registration Act, 1908). Registered agreements offer stronger legal protection." },
  { q: "Can I get a lawyer to review my agreement?", a: "Yes — lawyer review at ₹499, within 24 hours by a licensed property lawyer. Full registration assistance at ₹999." },
  { q: "Which cities are supported?", a: "Delhi, Mumbai, Bangalore, Hyderabad, Pune, Chennai, Kolkata, Ahmedabad — with city-specific stamp duty and clauses. More cities being added." },
];

export default function RentalAgreementGeneratorPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd).replace(/</g, "\\u003c") }} />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-brand-900 to-[#1a0f00] text-white text-center">
        <nav className="text-[12px] text-white/50 mb-6 flex items-center justify-center gap-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <span>Rental Agreement Generator</span>
        </nav>
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-400 bg-brand-900/80 border border-brand-700 tracking-wider mb-4">
          FREE AI DRAFT — READY IN 2 MINUTES
        </span>
        <h1 className="font-serif text-[42px] font-extrabold leading-tight tracking-tight max-w-[820px] mx-auto">
          Generate a Legal Rental Agreement Online in India — Free Draft in 2 Minutes
        </h1>
        <p className="text-[17px] text-white/70 mt-4 max-w-[640px] mx-auto leading-relaxed">
          AI-powered rent agreement generator with city-specific clauses, stamp duty guidance, and optional lawyer review. Trusted by 500+ landlords across 8 Indian cities.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] hover:bg-brand-600">
            Generate Free Agreement →
          </Link>
          <Link href="/pricing" className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10">
            View Pricing
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-[13px] text-white/60">
          {["✅ Free AI draft", "📋 Lawyer review ₹499", "🏛️ Registration support ₹999", "🏙️ 8 cities supported"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 max-w-[900px] mx-auto">
        <h2 className="font-serif text-[30px] font-extrabold text-ink text-center mb-10">
          How It Works — 3 Simple Steps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: "1", icon: "📝", title: "Fill in the Details", desc: "Enter landlord name, tenant name, property address, rent amount, tenure, and security deposit. Takes 2 minutes." },
            { step: "2", icon: "🤖", title: "AI Generates the Draft", desc: "Our AI creates a legally structured agreement with city-specific clauses, stamp duty guidance, and both-party protections." },
            { step: "3", icon: "✅", title: "Download & Sign", desc: "Download the PDF. Print on stamp paper of appropriate value. Sign both copies. Get registered if tenure >11 months." },
          ].map((s) => (
            <div key={s.step} className="text-center p-6 bg-white rounded-[16px] border border-border-default">
              <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-3">{s.step}</div>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-bold text-ink text-[15px] mb-2">{s.title}</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="py-14 bg-warm-50 px-6">
        <div className="max-w-[860px] mx-auto">
          <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-8">
            Choose Your Agreement Plan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                name: "Free Draft", price: "₹0", badge: null,
                features: ["AI-generated agreement", "Standard clauses", "PDF download", "Instant delivery"],
                cta: "Generate Free",
              },
              {
                name: "Lawyer Reviewed", price: "₹499", badge: "Most Popular",
                features: ["Everything in Free", "Licensed property lawyer review", "Certified legally sound", "Delivered in 24 hours", "1 revision included"],
                cta: "Get Lawyer Review",
              },
              {
                name: "Registered Agreement", price: "₹999", badge: null,
                features: ["Everything in Lawyer Reviewed", "Full registration assistance", "Sub-Registrar office guidance", "City-specific stamp duty advice", "Document checklist"],
                cta: "Get Registered",
              },
            ].map((plan) => (
              <div key={plan.name} className={`bg-white rounded-[16px] border p-6 relative ${plan.badge ? "border-brand-500 shadow-lg" : "border-border-default"}`}>
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">{plan.badge}</span>
                )}
                <div className="text-[13px] font-bold text-ink-muted mb-1">{plan.name}</div>
                <div className="font-serif text-[32px] font-extrabold text-ink mb-4">{plan.price}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-ink/70">
                      <span className="text-green-500 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`block text-center py-2.5 rounded-xl font-bold text-[13px] ${plan.badge ? "bg-brand-500 text-white hover:bg-brand-600" : "border border-brand-500 text-brand-500 hover:bg-brand-50"}`}>
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* City-wise stamp duty */}
      <section className="py-16 px-6 max-w-[900px] mx-auto">
        <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-8">
          Stamp Duty & Registration — City-Wise Guide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CITIES.map((city) => (
            <div key={city.name} className="bg-white rounded-[14px] border border-border-default p-4 flex items-start gap-4">
              <div className="text-2xl">🏙️</div>
              <div>
                <div className="font-bold text-ink text-[14px] mb-1">
                  <Link href={`/rent-management-software/${city.slug}`} className="hover:text-brand-500">
                    {city.name}
                  </Link>
                </div>
                <div className="text-[12px] text-ink/60">Stamp duty: {city.stamp}</div>
                <div className="text-[11px] text-brand-500 mt-0.5">{city.note}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 max-w-[800px] mx-auto">
        <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-8">
          Frequently Asked Questions
        </h2>
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
      <section className="py-10 px-6 max-w-[900px] mx-auto">
        <div className="bg-warm-50 rounded-[16px] p-6 border border-border-default">
          <div className="text-[13px] font-bold text-ink mb-3">Explore More:</div>
          <div className="flex flex-wrap gap-3 text-[13px]">
            {[
              { label: "For Landlords", href: "/for-landlords" },
              { label: "For Societies", href: "/for-societies" },
              { label: "NRI Property Management", href: "/nri-property-management" },
              { label: "Rent Management Delhi", href: "/rent-management-software/delhi" },
              { label: "Rent Management Mumbai", href: "/rent-management-software/mumbai" },
              { label: "Rent Management Bangalore", href: "/rent-management-software/bangalore" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="text-brand-500 font-semibold hover:underline">{l.label}</Link>
            ))}
          </div>
        </div>
      </section>

      <CTA />
      <Footer />
    </div>
  );
}
