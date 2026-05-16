import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";

const BASE_URL = "https://www.myrentsaathi.com";

export const metadata: Metadata = {
  title: "RWA Management Software India — Run Your Residents Welfare Association Digitally",
  description:
    "MyRentSaathi helps RWA committees manage maintenance collection, polls & voting, notices, complaints, and audit-ready expense reports — all from one platform. Start free trial.",
  keywords: [
    "rwa management software india", "residents welfare association software",
    "rwa committee software", "housing society rwa software", "rwa maintenance collection",
    "rwa digital platform india", "apartment rwa management", "rwa accounting software india",
  ],
  alternates: { canonical: `${BASE_URL}/for-rwa-committees` },
  openGraph: {
    title: "RWA Management Software India — Run Your RWA Digitally",
    description: "Maintenance collection, polls, notices, complaints, and audit reports for Residents Welfare Associations. Start free trial.",
    url: `${BASE_URL}/for-rwa-committees`,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is RWA management software?",
      acceptedAnswer: { "@type": "Answer", text: "RWA management software helps Residents Welfare Associations digitize their operations — maintenance billing, expense tracking, complaint management, polls & voting, and resident communication. MyRentSaathi covers all of these, plus rent management for landlord members." },
    },
    {
      "@type": "Question",
      name: "How does MyRentSaathi help RWA committees collect maintenance?",
      acceptedAnswer: { "@type": "Answer", text: "The society admin auto-generates monthly maintenance bills for each flat. Bills are sent via WhatsApp as UPI payment links. Payments are tracked in real time. Defaulters get automated reminders on the 1st, 5th, and 10th of every month. The committee gets a real-time collection dashboard." },
    },
    {
      "@type": "Question",
      name: "Can RWA committees conduct online polls and voting?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. MyRentSaathi has a built-in polls & voting feature. The RWA secretary creates a poll (budget approval, rule changes, office bearer elections), sends it to all residents via WhatsApp, and results are tallied automatically. No paper ballots needed." },
    },
    {
      "@type": "Question",
      name: "Is the expense report audit-ready?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. All expenses — maintenance collected, vendor payments, petty cash — are logged with categories and timestamps. The annual expense report is downloadable as PDF, suitable for RWA annual audits and member meetings." },
    },
  ],
};

const FEATURES = [
  { icon: "💰", title: "Maintenance Collection", desc: "Auto-generate monthly bills, send UPI payment links via WhatsApp, track paid/pending in real time. Defaulter reminders are fully automated." },
  { icon: "🗳️", title: "Polls & Voting", desc: "Budget approvals, rule changes, office bearer elections — conduct online polls. Results tallied automatically. No paper ballots." },
  { icon: "📢", title: "Society Notices", desc: "Send digital notices to all residents via WhatsApp. Maintenance announcements, event invites, rule updates — with read receipts." },
  { icon: "🎫", title: "Complaint Tickets", desc: "Residents raise complaints via the tenant portal. RWA assigns to staff. Status updates go to resident on WhatsApp. Full audit trail." },
  { icon: "📊", title: "Audit-Ready Reports", desc: "Annual expense reports, maintenance collection history, defaulter lists — all downloadable as PDF. Ready for AGM presentations and auditors." },
  { icon: "🚗", title: "Parking Management", desc: "Assign parking slots to flats, track visitor parking, manage reserved vs. open spots. Digital parking register." },
  { icon: "📋", title: "Facility Booking", desc: "Residents book community hall, gym, swimming pool via the portal. No double-bookings. Auto-confirmation on WhatsApp." },
  { icon: "👥", title: "Staff Management", desc: "Attendance tracking for security guards, maintenance staff, and housekeeping. Salary records and duty rosters." },
];

const RWA_ROLES = [
  { role: "Secretary", tasks: "Send notices, manage complaints, run polls — all from one dashboard. Spend 80% less time on WhatsApp group chaos." },
  { role: "Treasurer", tasks: "Track every rupee — maintenance collected, vendor paid, petty cash spent. Year-end audit report in one click." },
  { role: "President", tasks: "Real-time view of society health — collection rate, pending complaints, upcoming renewals. Make data-driven decisions." },
  { role: "All Residents", tasks: "Pay maintenance via UPI on WhatsApp. Book facilities. Raise complaints. Vote in polls. No new app to download." },
];

const FAQS = [
  { q: "What is RWA management software?", a: "Software that digitizes RWA operations — maintenance billing, expense tracking, complaints, polls, and resident communication. MyRentSaathi covers all this, plus rent management." },
  { q: "How does MyRentSaathi help RWA collect maintenance?", a: "Auto-generate bills, send UPI links via WhatsApp, track paid/pending in real time. Automated reminders on 1st, 5th, 10th of every month." },
  { q: "Can RWA conduct online polls and voting?", a: "Yes — built-in polls feature. Secretary creates poll, sends to all residents via WhatsApp, results tallied automatically. No paper ballots." },
  { q: "Is the expense report audit-ready?", a: "Yes. All expenses logged with categories and timestamps. Annual expense report downloadable as PDF — suitable for RWA audits and member meetings." },
];

export default function ForRwaCommitteesPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-[#1e1b4b] to-[#0c1a4a] text-white text-center">
        <nav className="text-[12px] text-white/50 mb-6 flex items-center justify-center gap-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <span>For RWA Committees</span>
        </nav>
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-indigo-300 bg-indigo-900/50 border border-indigo-700 tracking-wider mb-4">
          BUILT FOR RWA SECRETARIES & COMMITTEES
        </span>
        <h1 className="font-serif text-[40px] font-extrabold leading-tight tracking-tight max-w-[820px] mx-auto">
          RWA Management Software — Run Your Residents Welfare Association Digitally
        </h1>
        <p className="text-[17px] text-white/70 mt-4 max-w-[640px] mx-auto leading-relaxed">
          Maintenance collection, polls & voting, digital notices, complaint management, and audit-ready reports — all in one platform. WhatsApp-native. No new app for residents.
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
          {["🗳️ Online polls & voting", "💰 Maintenance via UPI", "📊 Audit-ready reports", "📱 WhatsApp-native"].map((t) => <span key={t}>{t}</span>)}
        </div>
      </section>

      {/* Pain points */}
      <section className="py-14 px-6 max-w-[860px] mx-auto">
        <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-4">
          The RWA Committee's Biggest Headaches
        </h2>
        <p className="text-center text-[15px] text-ink/60 mb-10 max-w-[560px] mx-auto">
          And how MyRentSaathi eliminates each one.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { prob: "WhatsApp group chaos — 100+ daily messages", sol: "Structured notices, polls, and complaints replace group noise" },
            { prob: "Manual maintenance collection — chasing defaulters", sol: "Auto UPI links + automated reminders = collections in 3 days, not 15" },
            { prob: "Paper expense records — auditors reject them", sol: "Digital expense log with categories — audit-ready PDF in one click" },
            { prob: "Paper ballots for AGM — fraud risk, slow counting", sol: "Online polls with tamper-proof results tallied instantly" },
            { prob: "No visibility on complaints — residents frustrated", sol: "Ticket system with status updates on WhatsApp — full audit trail" },
            { prob: "Parking disputes — no digital records", sol: "Digital parking assignment per flat — no disputes" },
          ].map((row) => (
            <div key={row.prob} className="bg-white rounded-[14px] border border-border-default p-5">
              <div className="text-[13px] font-bold text-red-500 mb-1.5">❌ {row.prob}</div>
              <div className="text-[12px] text-green-600">✅ {row.sol}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-14 bg-warm-50 px-6">
        <div className="max-w-[960px] mx-auto">
          <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-10">
            Everything Your RWA Needs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-[14px] border border-border-default p-4">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="font-bold text-ink text-[13px] mb-1.5">{f.title}</h3>
                <p className="text-[11px] text-ink/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-wise view */}
      <section className="py-14 px-6 max-w-[860px] mx-auto">
        <h2 className="font-serif text-[26px] font-extrabold text-ink text-center mb-8">
          How Different RWA Roles Benefit
        </h2>
        <div className="space-y-4">
          {RWA_ROLES.map((r) => (
            <div key={r.role} className="bg-white rounded-[14px] border border-border-default p-5 flex gap-4 items-start">
              <div className="w-24 flex-shrink-0 text-[13px] font-extrabold text-brand-500">{r.role}</div>
              <div className="text-[13px] text-ink/70 leading-relaxed">{r.tasks}</div>
            </div>
          ))}
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
            { label: "Visitor Management", href: "/visitor-management" },
            { label: "vs MyGate", href: "/vs-mygate" },
            { label: "Pricing", href: "/pricing" },
            { label: "Rent Management Hyderabad", href: "/rent-management-software/hyderabad" },
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
