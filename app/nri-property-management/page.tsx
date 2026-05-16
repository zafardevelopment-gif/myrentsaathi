import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";

const BASE_URL = "https://www.myrentsaathi.com";

export const metadata: Metadata = {
  title: "NRI Property Management India — Manage Your Indian Rentals from Abroad",
  description:
    "NRI landlords: manage Indian rental properties remotely via WhatsApp. Collect rent via UPI, generate agreements, track tenants — no new app needed. NRI plan from ₹1,999/mo.",
  keywords: [
    "nri property management india", "nri landlord india", "manage indian property from abroad",
    "nri rental income india", "nri rent collection india", "property management nri",
    "nri real estate india", "manage property abroad india whatsapp",
  ],
  alternates: { canonical: `${BASE_URL}/nri-property-management` },
  openGraph: {
    title: "NRI Property Management India — Manage Your Indian Rentals from Abroad",
    description: "Manage Indian rental properties remotely via WhatsApp. UPI rent collection, agreements, tenant tracking. NRI plan ₹1,999/mo.",
    url: `${BASE_URL}/nri-property-management`,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can NRIs manage Indian rental properties remotely?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. MyRentSaathi is built for NRI landlords. Everything operates via WhatsApp — rent collection, tenant communication, receipts, and notices. No new app for tenants to download. You manage from anywhere in the world via the web dashboard." },
    },
    {
      "@type": "Question",
      name: "How do NRIs collect rent from Indian tenants?",
      acceptedAnswer: { "@type": "Answer", text: "MyRentSaathi sends monthly UPI payment links to tenants via WhatsApp. Money goes directly to your Indian bank account (T+2 days via Razorpay). You get automatic receipts and payment confirmations on your phone — wherever you are." },
    },
    {
      "@type": "Question",
      name: "Do NRI landlords need Power of Attorney for property management?",
      acceptedAnswer: { "@type": "Answer", text: "For registration of rent agreements, a Power of Attorney (POA) holder in India is needed. MyRentSaathi supports POA workflows — we can coordinate with your local representative for agreement registration. For day-to-day management (rent collection, tenant communication), POA is not needed." },
    },
    {
      "@type": "Question",
      name: "What is the NRI plan pricing?",
      acceptedAnswer: { "@type": "Answer", text: "The NRI plan is ₹1,999/month — includes unlimited properties across all Indian cities, WhatsApp-native rent collection, NRI-specific tax reports (TDS, Form 26AS), Power of Attorney support, and a multi-city dashboard. 14-day free trial included." },
    },
  ],
};

const PAIN_POINTS = [
  { icon: "🌍", title: "Distance & Communication Gap", desc: "Tenants don't respond to emails. Calls across time zones are awkward. WhatsApp works — and MyRentSaathi runs entirely on WhatsApp, matching how your tenants already communicate." },
  { icon: "💸", title: "Late Rent Payments", desc: "Without automated reminders, NRI landlords lose thousands in delayed rent. Our system sends reminders on the 1st, 5th, and 10th of every month — automatically." },
  { icon: "📄", title: "Agreement Expiry & Renewal", desc: "Miss a renewal date from abroad and you may lose legal protection. MyRentSaathi alerts you 60 days before any agreement expires and generates the renewal agreement." },
  { icon: "🏦", title: "Banking & Remittance", desc: "Rent goes directly to your Indian bank account via UPI/Razorpay. NRI tax reports (TDS deduction tracking, Form 26AS prep) are downloadable at year-end." },
  { icon: "🤝", title: "Tenant Trust & Verification", desc: "Digital Aadhaar/PAN verification during onboarding. Tenants get a professional experience — payment receipts, WhatsApp notices, complaint portal. Fewer disputes." },
  { icon: "⚖️", title: "Power of Attorney Support", desc: "For agreement registration, we coordinate with your POA holder in India. Full documentation checklist included in the NRI plan." },
];

const FAQS = [
  { q: "Can NRIs manage Indian rental properties remotely?", a: "Yes. MyRentSaathi is built for NRI landlords. Everything via WhatsApp — rent collection, tenant communication, receipts, notices. No new app for tenants." },
  { q: "How do NRIs collect rent from Indian tenants?", a: "Monthly UPI payment links to tenants via WhatsApp. Money to your Indian bank account (T+2 via Razorpay). Automatic receipts and confirmations wherever you are." },
  { q: "Do NRI landlords need Power of Attorney?", a: "For agreement registration: yes, a POA holder in India is needed. For day-to-day management (rent, tenant communication): no POA required. We support both workflows." },
  { q: "What is the NRI plan pricing?", a: "₹1,999/month — unlimited properties, all cities, NRI tax reports, POA support, multi-city dashboard. 14-day free trial included." },
];

export default function NriPropertyManagementPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-[#0c1a4a] to-[#1a0f00] text-white text-center">
        <nav className="text-[12px] text-white/50 mb-6 flex items-center justify-center gap-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <span>NRI Property Management India</span>
        </nav>
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-blue-300 bg-blue-900/50 border border-blue-700 tracking-wider mb-4">
          BUILT FOR NRI LANDLORDS
        </span>
        <h1 className="font-serif text-[42px] font-extrabold leading-tight tracking-tight max-w-[820px] mx-auto">
          NRI Property Management India — Manage Your Indian Rentals from Abroad
        </h1>
        <p className="text-[17px] text-white/70 mt-4 max-w-[640px] mx-auto leading-relaxed">
          Collect rent via UPI, manage tenants, generate agreements — all via WhatsApp. No new app for tenants. Full remote control from USA, UK, UAE, Canada, or anywhere in the world.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] hover:bg-brand-600">
            Book Demo →
          </Link>
          <Link href="/pricing" className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10">
            NRI Plan ₹1,999/mo
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-[13px] text-white/60">
          {["📱 WhatsApp-only operation", "🌍 Works from any country", "💸 UPI rent to Indian bank", "📄 NRI tax reports"].map((t) => <span key={t}>{t}</span>)}
        </div>
      </section>

      {/* Pain points */}
      <section className="py-16 px-6 max-w-[960px] mx-auto">
        <h2 className="font-serif text-[30px] font-extrabold text-ink text-center mb-4">
          The Real Problems NRI Landlords Face
        </h2>
        <p className="text-center text-ink/60 text-[15px] mb-10 max-w-[560px] mx-auto">
          And how MyRentSaathi solves each one — without you being physically present in India.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PAIN_POINTS.map((p) => (
            <div key={p.title} className="bg-white rounded-[16px] border border-border-default p-5">
              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="font-bold text-ink text-[14px] mb-2">{p.title}</h3>
              <p className="text-[12px] text-ink/60 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NRI Plan */}
      <section className="py-14 bg-warm-50 px-6">
        <div className="max-w-[700px] mx-auto text-center">
          <h2 className="font-serif text-[28px] font-extrabold text-ink mb-6">NRI Landlord Plan</h2>
          <div className="bg-white rounded-[20px] border-2 border-brand-500 p-8 shadow-lg">
            <div className="text-[13px] font-bold text-brand-500 mb-1">NRI PLAN</div>
            <div className="font-serif text-[44px] font-extrabold text-ink mb-1">₹1,999<span className="text-[20px] text-ink/50">/mo</span></div>
            <div className="text-[13px] text-ink/50 mb-6">14-day free trial · No credit card required</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
              {[
                "Unlimited properties — all Indian cities",
                "WhatsApp-native rent collection via UPI",
                "AI rental agreement generator",
                "NRI-specific tax reports (TDS, Form 26AS)",
                "Power of Attorney workflow support",
                "Multi-city dashboard — one view",
                "Tenant onboarding & KYC",
                "Automated reminders & receipts",
                "Complaint & maintenance tracking",
                "Agreement expiry alerts (60 days)",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2 text-[13px] text-ink/70">
                  <span className="text-green-500 mt-0.5">✓</span> {f}
                </div>
              ))}
            </div>
            <Link href="/signup" className="block w-full py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] hover:bg-brand-600 text-center">
              Start Free Trial →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 max-w-[800px] mx-auto">
        <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-8">FAQs for NRI Landlords</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <div key={faq.q} className="bg-white rounded-[14px] border border-border-default p-5">
              <h3 className="font-bold text-ink text-[14px] mb-2">{faq.q}</h3>
              <p className="text-[13px] text-ink/70 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-8 px-6 max-w-[900px] mx-auto">
        <div className="bg-warm-50 rounded-[16px] p-5 border border-border-default flex flex-wrap gap-3 text-[13px]">
          {[
            { label: "For Landlords", href: "/for-landlords" },
            { label: "Rental Agreement Generator", href: "/rental-agreement-generator" },
            { label: "Rent Management Mumbai", href: "/rent-management-software/mumbai" },
            { label: "Rent Management Delhi", href: "/rent-management-software/delhi" },
            { label: "Rent Management Bangalore", href: "/rent-management-software/bangalore" },
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
