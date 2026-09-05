import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";
import { absoluteUrl } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Rent Collection Software for Landlords in India",
  description:
    "Stop chasing rent on WhatsApp manually. MyRentSaathi lets Indian landlords collect rent via UPI, auto-send reminders & receipts, manage tenants and generate agreements. Free 14-day trial.",
  keywords: [
    "rent collection software for landlords India",
    "collect rent online from tenants India",
    "landlord software India",
    "manage rental property India",
    "collect rent on WhatsApp",
    "rent collection app India",
    "NRI property management India",
  ],
  alternates: { canonical: absoluteUrl("/for-landlords") },
  openGraph: {
    title: "Rent Collection Software for Landlords in India — MyRentSaathi",
    description:
      "Collect rent via UPI, auto-send reminders and receipts, manage tenants and agreements. Simple per-unit pricing from ₹10/landlord/month.",
    url: absoluteUrl("/for-landlords"),
  },
};

const FEATURES = [
  { icon: "💸", title: "Automated Rent Collection", desc: "Send UPI payment links via WhatsApp. Track paid, pending, and overdue — automatically." },
  { icon: "📄", title: "AI Agreement Generator", desc: "Generate India-specific rent agreements from lawyer-reviewed templates in minutes." },
  { icon: "👨‍👩‍👦", title: "Tenant Management", desc: "Digital onboarding, document storage, auto credentials, and auto-deactivation on exit." },
  { icon: "📊", title: "Tax-Ready Reports", desc: "Download income statements and rent-receipt records at tax time for your IT return." },
  { icon: "🏙️", title: "Multi-City Dashboard", desc: "Manage properties across Delhi, Mumbai, Bangalore, Pune — all in one view." },
  { icon: "🌍", title: "NRI-Friendly", desc: "Manage your Indian properties remotely, over WhatsApp, from any time zone." },
];

const FAQS = [
  { q: "How much does MyRentSaathi cost for landlords?", a: "Pricing is simple and per-unit — ₹10 per landlord per month — so you only pay for what you manage, and there is a free trial with no card required. See the pricing page for current, live plans." },
  { q: "How do I collect rent online from my tenants?", a: "You add each tenant and their rent amount once. On the due date MyRentSaathi sends a UPI payment link to the tenant on WhatsApp. They pay from any UPI app (GPay, PhonePe, Paytm), and a receipt is generated and sent automatically. You see paid, pending and overdue status on your dashboard without asking anyone." },
  { q: "Do my tenants need to download an app?", a: "No. That is the main reason landlords choose us. Tenants receive the payment link and reminders directly on WhatsApp and pay with the UPI app they already use. There is nothing for them to install or log into, which means far fewer 'I can't find the app' excuses." },
  { q: "Can it automatically remind tenants who haven't paid?", a: "Yes. Reminders go out on the due date and can repeat for overdue rent, so you stop manually messaging tenants every month. Defaulters are flagged on your dashboard, and you always have a dated record of when the reminder was sent." },
  { q: "Does it work for NRI landlords managing property from abroad?", a: "Yes. Because the whole flow runs over WhatsApp and UPI, you can manage Indian property from any country without phone calls or visits. NRI-oriented plans add remote-management features and reports suited to owners living abroad. See the NRI property management page for details." },
  { q: "Can I manage properties in more than one city?", a: "Yes. Higher plans support multiple properties across any Indian cities in a single dashboard, so a landlord with flats in, say, Pune and Noida manages both from one screen." },
  { q: "Is my and my tenants' data secure?", a: "Payments run over standard UPI rails through a regulated gateway — MyRentSaathi never stores card or bank-account numbers, only payment status and receipts. Your data sits in an access-controlled database with row-level security so one landlord can never see another's records." },
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
        <h1 className="font-serif text-[44px] font-extrabold leading-tight tracking-tight max-w-[760px] mx-auto">
          Rent Collection Software for Landlords in India
        </h1>
        <p className="text-[18px] text-white/70 mt-4 max-w-[620px] mx-auto leading-relaxed">
          Stop chasing rent on WhatsApp by hand. Collect rent via UPI, auto-send reminders and
          receipts, manage tenants and generate agreements — from just ₹10 per landlord/month.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] hover:bg-brand-600">
            Start Free Trial — No Card Needed
          </Link>
          <Link href="/pricing" className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10">
            View Pricing
          </Link>
        </div>
        <div className="mt-6 text-[13px] text-white/50">14-day free trial · Cancel anytime · No setup fees</div>
      </section>

      {/* Intro prose */}
      <section className="py-16 px-6">
        <div className="max-w-[760px] mx-auto text-[15px] leading-[1.85] text-ink/80 space-y-5">
          <h2 className="font-serif text-[30px] font-extrabold text-ink leading-tight">
            The end of chasing rent every month
          </h2>
          <p>
            If you own one flat or ten, the monthly routine is the same: message each tenant,
            remind the ones who forget, wait for a screenshot of the payment, and write out a
            receipt by hand. It is not hard work, but it is <em>constant</em> — and it is easy for
            a payment to slip through the cracks when life gets busy. MyRentSaathi is built for
            individual Indian landlords and NRI owners who want that whole cycle to run itself.
          </p>
          <p>
            You set up each tenant and their rent once. From then on, MyRentSaathi sends a UPI
            payment link to the tenant on WhatsApp on the due date, nudges them again if they are
            late, records the payment the moment it lands, and issues a dated receipt automatically.
            You open your dashboard and see, at a glance, who has paid, who is pending, and who is
            overdue — across every property you own, in every city. No spreadsheet, no mental
            ledger, no awkward reminder messages typed out one by one.
          </p>
          <h3 className="font-serif text-[22px] font-bold text-ink pt-2">
            Why WhatsApp-first matters for landlords
          </h3>
          <p>
            Most rent-collection apps fail for the same reason: they ask your tenant to download
            something. In practice, half of them never do, and you are back to chasing manually.
            MyRentSaathi keeps the tenant entirely on WhatsApp and their existing UPI app — GPay,
            PhonePe, Paytm, whatever they already have. There is nothing for them to install,
            no login for them to forget, and therefore far fewer excuses. For you, the landlord,
            everything lives in one clean web dashboard.
          </p>
          <h3 className="font-serif text-[22px] font-bold text-ink pt-2">
            Built for the paperwork too
          </h3>
          <p>
            Rent collection is only half the job. MyRentSaathi also generates India-specific rent
            agreements from lawyer-reviewed templates, stores each tenant&apos;s documents, and keeps
            an income record you can hand to your CA at tax time — including the rent-receipt trail
            tenants often need for their HRA claims. When a tenant moves out, their access is
            deactivated automatically, so old tenants never keep seeing your property. If you
            manage property from abroad, the same WhatsApp-and-UPI flow works from any time zone —
            see our{" "}
            <Link href="/nri-property-management" className="text-brand-600 underline underline-offset-2">
              NRI property management
            </Link>{" "}
            page for how remote owners use it.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-[32px] font-extrabold text-ink">Everything a Landlord Needs</h2>
          <p className="text-[16px] text-ink/60 mt-3 max-w-[500px] mx-auto">
            From a single flat to a multi-city portfolio — MyRentSaathi handles it all.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <li><Link href="/whatsapp-rent-collection" className="text-brand-600 underline underline-offset-2">WhatsApp rent collection</Link></li>
            <li><Link href="/rental-agreement-generator" className="text-brand-600 underline underline-offset-2">Rental agreement generator</Link></li>
            <li><Link href="/nri-property-management" className="text-brand-600 underline underline-offset-2">NRI property management</Link></li>
            <li><Link href="/pricing" className="text-brand-600 underline underline-offset-2">Landlord pricing plans</Link></li>
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
