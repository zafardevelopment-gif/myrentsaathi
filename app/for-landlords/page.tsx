import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";

export const metadata: Metadata = {
  title: "Landlord Software India — Rent Collection & Property Management App",
  description:
    "MyRentSaathi is India's best landlord software. Automate rent collection, manage tenants, generate agreements, track expenses — all via WhatsApp. Plans from ₹499/mo.",
  keywords: [
    "landlord software India", "rent collection app India", "property management app landlord",
    "online rent collection India", "tenant management software", "NRI property management India",
  ],
  alternates: { canonical: "https://www.myrentsaathi.com/for-landlords" },
  openGraph: {
    title: "Landlord Software India — MyRentSaathi",
    description: "Automate rent collection, manage tenants, generate agreements. Plans from ₹499/mo.",
    url: "https://www.myrentsaathi.com/for-landlords",
  },
};

const FEATURES = [
  { icon: "💸", title: "Automated Rent Collection", desc: "Send UPI payment links via WhatsApp. Track paid, pending, and overdue — automatically." },
  { icon: "📄", title: "AI Agreement Generator", desc: "Generate legally-vetted rent agreements for 8 Indian cities in minutes. Lawyer-reviewed templates." },
  { icon: "👨‍👩‍👦", title: "Tenant Management", desc: "Digital onboarding, Aadhaar/PAN verification, auto credentials, and auto-deactivation on exit." },
  { icon: "📊", title: "Tax-Ready Reports", desc: "Download income reports, TDS statements, and Form 26AS-ready data at tax time." },
  { icon: "🏙️", title: "Multi-City Dashboard", desc: "Manage properties across Delhi, Mumbai, Bangalore, Pune — all in one view." },
  { icon: "🌍", title: "NRI-Friendly", desc: "Manage your Indian properties remotely. Power of Attorney support, NRI tax reports, WhatsApp-only operation." },
];

const FAQS = [
  { q: "How much does MyRentSaathi cost for landlords?", a: "Plans start at ₹499/month for up to 3 properties. The Pro plan at ₹999/month covers up to 10 properties. NRI plan at ₹1,999/month has unlimited properties." },
  { q: "Can I collect rent via UPI through MyRentSaathi?", a: "Yes. We generate UPI payment links and send them via WhatsApp. Once paid, receipts are automatically sent to tenants." },
  { q: "Does it work for NRI landlords?", a: "Absolutely. Our NRI plan is built for remote management — WhatsApp notifications, NRI-specific tax reports, Power of Attorney support, and multi-city dashboard." },
  { q: "Can I manage properties in multiple cities?", a: "Yes. The Pro and NRI plans support unlimited properties across all Indian cities in one dashboard." },
  { q: "Is there a free trial?", a: "Yes — all plans include a 14-day free trial with no credit card required." },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function ForLandlordsPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-brand-900 to-[#1a0f00] text-white text-center">
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-400 bg-brand-900/80 border border-brand-700 tracking-wider mb-4">
          FOR LANDLORDS
        </span>
        <h1 className="font-serif text-[44px] font-extrabold leading-tight tracking-tight max-w-[740px] mx-auto">
          India&apos;s Smartest Landlord Software — Collect Rent on Autopilot
        </h1>
        <p className="text-[18px] text-white/70 mt-4 max-w-[600px] mx-auto leading-relaxed">
          Automate rent collection, manage tenants, generate agreements, and track your portfolio —
          all via WhatsApp. Starting at just ₹499/month.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <button className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] hover:bg-brand-600 cursor-pointer">
            Start Free Trial — No Card Needed
          </button>
          <button className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10 cursor-pointer">
            View Pricing
          </button>
        </div>
        <div className="mt-6 text-[13px] text-white/50">14-day free trial · Cancel anytime · No setup fees</div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-[32px] font-extrabold text-ink">
            Everything a Landlord Needs
          </h2>
          <p className="text-[16px] text-ink/60 mt-3 max-w-[500px] mx-auto">
            From single flat to multi-city portfolio — MyRentSaathi handles it all.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-[16px] border border-border-default p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-ink text-[15px] mb-2">{f.title}</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-warm-50 px-6">
        <div className="max-w-[860px] mx-auto">
          <h2 className="font-serif text-[30px] font-extrabold text-ink text-center mb-10">
            Why Landlords Choose MyRentSaathi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              ["⏱ Save 10+ Hours/Month", "No more WhatsApp chasing. Automated reminders, UPI links, and receipts — zero manual work."],
              ["📵 No New App for Tenants", "Tenants pay and communicate entirely on WhatsApp — no downloads, no friction."],
              ["🔒 Bank-Level Security", "Aadhaar-linked tenant verification. Encrypted data. RLS-protected database."],
              ["📱 Manage from Anywhere", "Full dashboard on mobile. NRI landlords manage from abroad with WhatsApp-only operation."],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-4 bg-white rounded-[14px] p-5 border border-border-default">
                <div className="text-2xl flex-shrink-0">{title.slice(0, 2)}</div>
                <div>
                  <div className="font-bold text-ink text-[14px] mb-1">{title.slice(2).trim()}</div>
                  <div className="text-[13px] text-ink/60">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 max-w-[800px] mx-auto">
        <h2 className="font-serif text-[30px] font-extrabold text-ink text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-5">
          {FAQS.map((faq) => (
            <div key={faq.q} className="bg-white rounded-[14px] border border-border-default p-5">
              <h3 className="font-bold text-ink text-[14px] mb-2">{faq.q}</h3>
              <p className="text-[13px] text-ink/70 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <CTA />
      <Footer />
    </div>
  );
}
