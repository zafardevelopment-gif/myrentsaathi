import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";
import { absoluteUrl } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Maintenance Collection Software for Housing Societies in India",
  description:
    "Collect society maintenance online, auto-flag defaulters, run AGM votes and keep CA-ready accounts. MyRentSaathi is WhatsApp-native society management software for Indian RWAs and apartments.",
  keywords: [
    "maintenance collection software for housing society",
    "collect society maintenance online",
    "society management system India",
    "apartment maintenance accounting software India",
    "society defaulter tracking",
    "housing society software",
    "CHS management software",
  ],
  alternates: { canonical: absoluteUrl("/for-societies") },
  openGraph: {
    title: "Maintenance Collection Software for Housing Societies — MyRentSaathi",
    description:
      "Collect maintenance online, flag defaulters, run AGM votes, keep CA-ready accounts. WhatsApp-native.",
    url: absoluteUrl("/for-societies"),
  },
};

const FEATURES = [
  { icon: "💰", title: "Maintenance Collection", desc: "Auto-generate monthly bills, send WhatsApp reminders, collect UPI payments, track defaulters." },
  { icon: "🧾", title: "Expense Management", desc: "Log society expenses with bill photos. Committee approval workflow. Monthly & annual reports." },
  { icon: "🚫", title: "Complaint Tickets", desc: "Residents raise tickets for plumbing, lift, parking. Priority escalation. Resolution tracking." },
  { icon: "🅿️", title: "Parking Management", desc: "Assign parking slots, manage visitor parking, track unauthorised vehicles." },
  { icon: "🗳️", title: "Online Polls & Voting", desc: "Conduct AGM votes, rule-change polls, committee elections — secret ballot, transparent results." },
  { icon: "📁", title: "Document Vault", desc: "Secure storage for NOCs, agreements and records with role-based access control." },
  { icon: "📢", title: "Notice Board", desc: "Send official notices, circulars and announcements to all residents via WhatsApp." },
  { icon: "📊", title: "Financial Reports", desc: "CA-ready balance sheets, income & expense summaries and audit-ready reports." },
];

const FAQS = [
  { q: "How does online maintenance collection work for a society?", a: "MyRentSaathi auto-generates each flat's monthly maintenance bill, sends it with a UPI payment link on WhatsApp, and records payment automatically with a digital receipt. The committee sees a live paid/pending/overdue view for the whole society instead of a treasurer manually maintaining a register." },
  { q: "How does the software track defaulters?", a: "Any flat that hasn't paid by the due date is flagged automatically and can be sent repeat reminders. The committee gets a clear defaulters list with amounts and how long each has been outstanding — so follow-up is based on data, not memory, and there's a dated record of every reminder sent." },
  { q: "Can we run our AGM elections and polls online?", a: "Yes. The Polls & Voting module supports secret-ballot committee elections, AGM resolutions and rule-change polls, with transparent results and an audit trail. Residents vote from their phone, which usually lifts participation well above a physical meeting." },
  { q: "Does it keep accounts our CA and auditor can use?", a: "Yes. Every collection and expense is logged, expenses can carry a bill photo and an approval step, and the system produces income-and-expense summaries and balance-sheet-style reports you can hand to your CA or auditor at year-end." },
  { q: "What size of society is this built for?", a: "From small buildings of around 10 flats to large complexes of 500+ flats. Plans scale by flat count, so a small CHS isn't paying for enterprise features it doesn't need. See the pricing page for current tiers." },
  { q: "Do residents have to install an app?", a: "No. Residents receive bills, reminders, notices and poll links on WhatsApp and pay through their own UPI app. Only the committee and admins use the web dashboard — which is what keeps adoption high, because there's nothing for residents to download." },
  { q: "Can it also handle visitors and parking at the gate?", a: "Yes. Visitor entry, pre-approvals and gate logs are covered by the visitor-management module, and parking slots (including visitor parking) can be assigned and tracked. See the visitor management page for how the guard flow works." },
  { q: "Is our society's financial data secure?", a: "Data is encrypted in transit and at rest and sits behind row-level security, so one society can never see another's records. Payments run over standard UPI rails through a regulated gateway; no card or bank-account numbers are stored." },
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
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-forest-500 to-[#0c2e1c] text-white text-center">
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-forest-100 bg-black/20 border border-white/20 tracking-wider mb-4">
          FOR HOUSING SOCIETIES
        </span>
        <h1 className="font-serif text-[42px] font-extrabold leading-tight tracking-tight max-w-[780px] mx-auto">
          Maintenance Collection Software for Housing Societies
        </h1>
        <p className="text-[18px] text-white/75 mt-4 max-w-[620px] mx-auto leading-relaxed">
          Collect maintenance online, flag defaulters automatically, run AGM votes and keep
          CA-ready accounts — all WhatsApp-native, with nothing for residents to install.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-white text-forest-500 font-bold text-[15px] hover:bg-white/90">
            Start Free Trial
          </Link>
          <Link href="/pricing" className="px-8 py-3.5 rounded-xl border border-white/40 text-white font-bold text-[15px] hover:bg-white/10">
            View Pricing
          </Link>
        </div>
        <div className="mt-6 text-[13px] text-white/60">14-day free trial · From 10 to 500+ flats · WhatsApp-native</div>
      </section>

      {/* Intro prose */}
      <section className="py-16 px-6">
        <div className="max-w-[760px] mx-auto text-[15px] leading-[1.85] text-ink/80 space-y-5">
          <h2 className="font-serif text-[30px] font-extrabold text-ink leading-tight">
            Run your society&apos;s finances without a shoebox of receipts
          </h2>
          <p>
            In most Indian housing societies, maintenance collection still runs on a treasurer&apos;s
            personal effort: bills typed into a spreadsheet, reminders sent one WhatsApp at a time,
            payments matched against bank SMS, and a register that only one person truly understands.
            It works until that person is travelling, or steps down at the AGM, and the whole memory
            of who-owes-what leaves with them. MyRentSaathi replaces that with a system the entire
            committee can see.
          </p>
          <p>
            Each month the software generates every flat&apos;s maintenance bill, sends it on WhatsApp
            with a UPI link, records payments as they arrive, and issues receipts automatically. The
            committee opens one dashboard and sees the society&apos;s real position — collected, pending,
            and overdue — flat by flat. Defaulters are flagged the day they miss the due date, so
            follow-up is prompt, consistent and based on a dated record rather than someone&apos;s
            recollection.
          </p>
          <h3 className="font-serif text-[22px] font-bold text-ink pt-2">
            Transparency that survives a change of committee
          </h3>
          <p>
            Because collections, expenses and approvals are all logged in one place, handing over to
            a new committee is no longer a leap of faith. Expenses carry a bill photo and an approval
            step, so spending is accountable; income-and-expense summaries and balance-sheet-style
            reports come out in a form your CA and auditor can actually use. When it is time for an
            AGM, the{" "}
            <Link href="/for-rwa-committees" className="text-brand-600 underline underline-offset-2">
              governance and voting tools
            </Link>{" "}
            let you run secret-ballot elections and rule-change polls online, with a clean audit
            trail and far higher turnout than a physical meeting usually manages.
          </p>
          <h3 className="font-serif text-[22px] font-bold text-ink pt-2">
            One platform for the whole complex
          </h3>
          <p>
            Residents raise complaints — plumbing, lift, parking — as tickets that the committee can
            prioritise and track to resolution. Notices reach every flat on WhatsApp instantly. And
            the gate is covered too:{" "}
            <Link href="/visitor-management" className="text-brand-600 underline underline-offset-2">
              visitor management
            </Link>{" "}
            handles entry, pre-approvals and logs, while parking slots and visitor parking are
            assigned and tracked in the same system. Residents never install an app; only the
            committee uses the dashboard, which is exactly why adoption sticks.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-[32px] font-extrabold text-ink">Everything a Committee Needs</h2>
          <p className="text-[16px] text-ink/60 mt-3 max-w-[520px] mx-auto">
            Collection, accounting, governance and gate — in one WhatsApp-native platform.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-[16px] border border-border-default p-6">
              <div className="text-3xl mb-3" aria-hidden="true">{f.icon}</div>
              <h3 className="font-bold text-ink text-[15px] mb-2">{f.title}</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related links */}
      <section className="pb-4 px-6">
        <div className="max-w-[760px] mx-auto bg-warm-50 rounded-[16px] border border-border-default p-6">
          <h2 className="font-bold text-ink text-[15px] mb-3">Explore related features</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[14px]">
            <li><Link href="/for-rwa-committees" className="text-brand-600 underline underline-offset-2">For RWA committees</Link></li>
            <li><Link href="/visitor-management" className="text-brand-600 underline underline-offset-2">Visitor management</Link></li>
            <li><Link href="/vs-mygate" className="text-brand-600 underline underline-offset-2">MyRentSaathi vs MyGate</Link></li>
            <li><Link href="/pricing" className="text-brand-600 underline underline-offset-2">Society pricing plans</Link></li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 max-w-[800px] mx-auto">
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
