import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";

export const metadata: Metadata = {
  title: "Society Management System India — Housing Society Software",
  description:
    "Complete housing society management system for India. Automate maintenance collection, manage expenses, track complaints, conduct polls & voting. Plans from ₹2,999/mo.",
  keywords: [
    "society management system India", "housing society software", "maintenance collection app",
    "apartment management software India", "CHS management software", "society committee software",
  ],
  alternates: { canonical: "https://www.myrentsaathi.com/for-societies" },
  openGraph: {
    title: "Society Management Software India — MyRentSaathi",
    description: "Automate maintenance, manage expenses, conduct polls, track complaints. Plans from ₹2,999/mo.",
    url: "https://www.myrentsaathi.com/for-societies",
  },
};

const FEATURES = [
  { icon: "💰", title: "Maintenance Collection", desc: "Auto-generate monthly bills, send WhatsApp reminders, collect UPI payments, track defaulters." },
  { icon: "🧾", title: "Expense Management", desc: "Log society expenses with bill photos. Committee approval workflow. Monthly & annual reports." },
  { icon: "🚫", title: "Complaint Tickets", desc: "Residents raise tickets for plumbing, lift, parking. Priority escalation. Resolution tracking." },
  { icon: "🅿️", title: "Parking Management", desc: "Assign parking slots, manage visitor parking, track unauthorized vehicles." },
  { icon: "🗳️", title: "Online Polls & Voting", desc: "Conduct AGM votes, rule-change polls, committee elections — secret ballot, transparent results." },
  { icon: "📁", title: "Document Vault", desc: "Secure cloud storage for NOCs, agreements, maintenance records. Role-based access control." },
  { icon: "📢", title: "Notice Board", desc: "Send official notices, circulars, and announcements to all residents via WhatsApp." },
  { icon: "📊", title: "Financial Reports", desc: "CA-ready balance sheets, income & expense summaries, tax-ready reports for audits." },
];

const FAQS = [
  { q: "What types of societies can use MyRentSaathi?", a: "Any registered CHS, apartment complex, or gated community — from 10 flats to 500+ flats. We have Starter (30 flats), Professional (100 flats), and Enterprise (unlimited) plans." },
  { q: "How does maintenance collection work?", a: "The system auto-generates monthly bills, sends WhatsApp reminders on due dates, collects UPI payments, and issues digital receipts. Defaulters are automatically flagged." },
  { q: "Can residents raise complaints?", a: "Yes. Residents submit tickets via WhatsApp or web. The admin dashboard tracks all open, in-progress, and resolved tickets with priority levels." },
  { q: "Can we conduct society elections online?", a: "Yes — our Polls & Voting module supports secret ballot elections, AGM votes, and rule-change polls with full audit trail." },
  { q: "Is the data secure?", a: "All data is encrypted at rest and in transit. Supabase-powered database with Row Level Security. Bank-level security standards." },
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

export default function ForSocietiesPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-[#0f2d1a] to-[#1b5e3b] text-white text-center">
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-green-300 bg-green-900/60 border border-green-700 tracking-wider mb-4">
          FOR HOUSING SOCIETIES
        </span>
        <h1 className="font-serif text-[44px] font-extrabold leading-tight tracking-tight max-w-[740px] mx-auto">
          Complete Society Management System for Indian Housing Societies
        </h1>
        <p className="text-[18px] text-white/70 mt-4 max-w-[600px] mx-auto leading-relaxed">
          Automate maintenance collection, manage expenses, conduct polls, handle complaints —
          all in one platform. WhatsApp-native. Starting at ₹2,999/month.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <button className="px-8 py-3.5 rounded-xl bg-green-500 text-white font-bold text-[15px] hover:bg-green-600 cursor-pointer">
            Start Free Trial — No Card Needed
          </button>
          <button className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10 cursor-pointer">
            View Plans
          </button>
        </div>
        <div className="mt-6 text-[13px] text-white/50">14-day free trial · All committee members included · No setup fees</div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-[32px] font-extrabold text-ink">
            Everything Your Society Committee Needs
          </h2>
          <p className="text-[16px] text-ink/60 mt-3 max-w-[520px] mx-auto">
            From daily maintenance to annual AGMs — manage your society digitally.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-[16px] border border-border-default p-5">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-ink text-[14px] mb-2">{f.title}</h3>
              <p className="text-[12px] text-ink/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-warm-50 px-6">
        <div className="max-w-[860px] mx-auto">
          <h2 className="font-serif text-[30px] font-extrabold text-ink text-center mb-10">
            Why Society Committees Choose MyRentSaathi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              ["📉 Reduce Maintenance Defaults", "Automated reminders reduce late payments by up to 70%. Defaulter tracking keeps committee informed."],
              ["🏦 Bank-Ready Accounts", "All collections automatically reconciled. Generate CA-ready reports for audits in one click."],
              ["🤝 Full Transparency", "Every expense, every vote, every notice — logged and accessible to all residents. Build trust."],
              ["📵 Zero App Downloads", "Residents receive everything on WhatsApp. No app installs needed. 100% adoption from day one."],
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
