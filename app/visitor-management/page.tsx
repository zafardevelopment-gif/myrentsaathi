import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";

const BASE_URL = "https://www.myrentsaathi.com";

export const metadata: Metadata = {
  title: "Visitor Management System for Housing Societies India — Go Digital in 1 Day",
  description:
    "Digital visitor management for housing societies. Replace paper registers with digital entry logs, pre-approved visitors, and guard notifications — all on WhatsApp. Start free trial.",
  keywords: [
    "visitor management system housing society india", "digital visitor log apartment",
    "society visitor management software", "gate management system india",
    "visitor entry log housing society", "apartment visitor management",
    "housing society security management", "mygate alternative visitor management",
  ],
  alternates: { canonical: `${BASE_URL}/visitor-management` },
  openGraph: {
    title: "Visitor Management System for Housing Societies — MyRentSaathi",
    description: "Digital visitor entry log, pre-approved visitors, WhatsApp guard alerts for housing societies. Go digital in 1 day.",
    url: `${BASE_URL}/visitor-management`,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does digital visitor management work for housing societies?",
      acceptedAnswer: { "@type": "Answer", text: "Guards log visitor entry via the MyRentSaathi portal — name, vehicle, purpose, and flat they're visiting. Residents get instant WhatsApp notification for approval. Entry is logged digitally with timestamp. No paper registers needed." },
    },
    {
      "@type": "Question",
      name: "Can residents pre-approve expected visitors?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Residents can add pre-approved visitors (family members, domestic helpers, delivery persons) to their profile. Guards can verify and grant access instantly without calling the resident every time." },
    },
    {
      "@type": "Question",
      name: "Is MyRentSaathi visitor management better than MyGate?",
      acceptedAnswer: { "@type": "Answer", text: "MyRentSaathi covers visitor management as part of a complete society + rent management platform. Unlike MyGate (which focuses primarily on gate/intercom), MyRentSaathi also handles maintenance billing, rent collection, complaint tickets, and agreements — all in one platform at a transparent price." },
    },
    {
      "@type": "Question",
      name: "How quickly can a society go live on digital visitor management?",
      acceptedAnswer: { "@type": "Answer", text: "Most societies are live within 1 day. Society admin creates the account, adds flat details, and guards start using the portal. Residents receive WhatsApp invites to join. No hardware installation or special devices needed." },
    },
  ],
};

const FEATURES = [
  { icon: "📋", title: "Digital Entry Log", desc: "Replace paper registers. Every visitor entry — name, time, flat, purpose — logged digitally with timestamp. Searchable history." },
  { icon: "✅", title: "Pre-Approved Visitors", desc: "Residents add frequent visitors (family, maids, delivery). Guards verify and grant access in one tap — no calls to residents." },
  { icon: "📱", title: "WhatsApp Guard Alerts", desc: "Guards can notify residents via WhatsApp for unexpected visitors. Resident approves or denies directly from WhatsApp." },
  { icon: "🚗", title: "Vehicle Entry Log", desc: "Log vehicle numbers alongside visitor details. Useful for tracking unauthorized vehicles and parking management." },
  { icon: "📊", title: "Visitor Reports", desc: "Monthly visitor frequency reports, peak hours analysis, and suspicious entry flags — all downloadable as PDF." },
  { icon: "🔒", title: "No Hardware Required", desc: "Works on any smartphone or tablet. No IP cameras, intercoms, or special hardware needed. Instantly deployable." },
];

const FAQS = [
  { q: "How does digital visitor management work?", a: "Guards log visitor entry via the portal — name, vehicle, purpose, flat. Residents get WhatsApp notification for approval. Entry logged with timestamp. No paper registers." },
  { q: "Can residents pre-approve expected visitors?", a: "Yes — family, domestic helpers, delivery persons can be pre-approved. Guards verify and grant access without calling the resident every time." },
  { q: "Is MyRentSaathi visitor management better than MyGate?", a: "MyRentSaathi covers visitor management as part of a complete society + rent platform — maintenance billing, rent collection, complaints, agreements — all in one at a transparent price." },
  { q: "How quickly can a society go live?", a: "Most societies are live within 1 day. Admin creates account, adds flats, guards start using the portal. No hardware installation needed." },
];

export default function VisitorManagementPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-[#052e16] to-[#1a0f00] text-white text-center">
        <nav className="text-[12px] text-white/50 mb-6 flex items-center justify-center gap-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <span>Visitor Management System</span>
        </nav>
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-green-300 bg-green-900/50 border border-green-700 tracking-wider mb-4">
          GO DIGITAL IN 1 DAY — NO HARDWARE NEEDED
        </span>
        <h1 className="font-serif text-[40px] font-extrabold leading-tight tracking-tight max-w-[820px] mx-auto">
          Visitor Management System for Housing Societies — Replace Paper Registers Today
        </h1>
        <p className="text-[17px] text-white/70 mt-4 max-w-[640px] mx-auto leading-relaxed">
          Digital entry log, pre-approved visitors, WhatsApp guard alerts — all without any hardware. Part of MyRentSaathi's complete society management platform.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] hover:bg-brand-600">
            Start Free Trial →
          </Link>
          <Link href="/for-societies" className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10">
            Society Plans
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-[13px] text-white/60">
          {["📋 Digital entry log", "✅ Pre-approved visitors", "📱 WhatsApp alerts", "🔒 No hardware required"].map((t) => <span key={t}>{t}</span>)}
        </div>
      </section>

      {/* vs paper registers */}
      <section className="py-14 px-6 max-w-[900px] mx-auto">
        <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-8">
          Digital vs Paper Register — Why It Matters
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-red-50 border border-red-100 rounded-[16px] p-6">
            <div className="font-bold text-red-700 text-[14px] mb-3">❌ Paper Register Problems</div>
            <ul className="space-y-2 text-[13px] text-red-600">
              {["Illegible handwriting", "Lost or damaged registers", "No search or history", "Guards can manipulate entries", "No real-time resident notification", "No monthly reports for RWA"].map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-[16px] p-6">
            <div className="font-bold text-green-700 text-[14px] mb-3">✅ Digital Visitor Log Benefits</div>
            <ul className="space-y-2 text-[13px] text-green-600">
              {["Searchable history — any date, any flat", "Tamper-proof timestamped records", "Real-time WhatsApp alerts to residents", "Monthly visitor frequency reports", "Pre-approved visitor lists save time", "Accessible by society admin anytime"].map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 bg-warm-50 px-6">
        <div className="max-w-[960px] mx-auto">
          <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-10">
            Visitor Management Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-[16px] border border-border-default p-5">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-ink text-[14px] mb-2">{f.title}</h3>
                <p className="text-[12px] text-ink/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitor angle */}
      <section className="py-14 px-6 max-w-[800px] mx-auto text-center">
        <h2 className="font-serif text-[26px] font-extrabold text-ink mb-4">
          One Platform — Society + Rent + Visitor Management
        </h2>
        <p className="text-[15px] text-ink/60 mb-8 leading-relaxed">
          Unlike standalone visitor management apps, MyRentSaathi combines visitor management with maintenance billing, rent collection, complaint tickets, and rental agreements — all at one transparent price.
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "🏢", title: "Society Management", sub: "Maintenance, expenses, notices, polls" },
            { icon: "💸", title: "Rent Collection", sub: "UPI links, receipts, auto-reminders" },
            { icon: "👋", title: "Visitor Management", sub: "Digital log, WhatsApp alerts, reports" },
          ].map((c) => (
            <div key={c.title} className="bg-white rounded-[14px] border border-border-default p-4">
              <div className="text-2xl mb-2">{c.icon}</div>
              <div className="font-bold text-ink text-[13px] mb-1">{c.title}</div>
              <div className="text-[11px] text-ink/50">{c.sub}</div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/vs-mygate" className="text-brand-500 font-semibold text-[13px] hover:underline">
            Compare with MyGate →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-6 max-w-[800px] mx-auto">
        <h2 className="font-serif text-[26px] font-extrabold text-ink text-center mb-8">FAQs</h2>
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
            { label: "For Societies", href: "/for-societies" },
            { label: "vs MyGate", href: "/vs-mygate" },
            { label: "For RWA Committees", href: "/for-rwa-committees" },
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
