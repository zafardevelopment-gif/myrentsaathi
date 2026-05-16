import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";

const BASE_URL = "https://www.myrentsaathi.com";

export const metadata: Metadata = {
  title: "WhatsApp Rent Collection India — Collect Rent via UPI on WhatsApp",
  description:
    "Collect rent via WhatsApp UPI payment links. Automated reminders on 1st, 5th, 10th of every month. Instant receipts. No app for tenants. MyRentSaathi — India's WhatsApp-native rent platform.",
  keywords: [
    "whatsapp rent collection india", "collect rent via whatsapp", "whatsapp upi rent payment",
    "rent reminder whatsapp india", "rent collection automation india", "online rent collection whatsapp",
    "landlord rent collection app india", "automated rent reminders india",
    "whatsapp payment rent india", "rent receipt whatsapp",
  ],
  alternates: { canonical: `${BASE_URL}/whatsapp-rent-collection` },
  openGraph: {
    title: "WhatsApp Rent Collection India — Automate Rent via UPI on WhatsApp",
    description: "Send UPI rent links via WhatsApp. Auto-reminders on 1st, 5th, 10th. Instant receipts. No app for tenants.",
    url: `${BASE_URL}/whatsapp-rent-collection`,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does WhatsApp rent collection work in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MyRentSaathi generates a UPI payment link and sends it to your tenant on WhatsApp every month. The tenant clicks, pays via any UPI app (GPay, PhonePe, Paytm, BHIM), and the rent lands in your bank account within T+2 days. An automatic receipt is sent to the tenant on WhatsApp immediately after payment.",
      },
    },
    {
      "@type": "Question",
      name: "Do tenants need to download a new app to pay rent via WhatsApp?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Tenants pay rent entirely on WhatsApp — the app they already use daily. No separate download, no registration, no login. They simply click the UPI link in WhatsApp and complete payment in their existing UPI app.",
      },
    },
    {
      "@type": "Question",
      name: "How are rent reminders sent via WhatsApp?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MyRentSaathi sends automated rent reminders to tenants on the 1st, 5th, and 10th of every month — until rent is paid. Reminders include the UPI payment link. Once paid, reminders stop automatically. Landlords see real-time payment status on their dashboard.",
      },
    },
    {
      "@type": "Question",
      name: "How quickly does rent money reach my bank account?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rent paid via UPI reaches your Indian bank account within T+2 business days (typically next working day for most banks). The payment is processed via Razorpay, India's most trusted payment gateway. NRI landlords receive funds in their Indian bank account, which they can then remit abroad.",
      },
    },
    {
      "@type": "Question",
      name: "Is WhatsApp rent collection secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All UPI transactions are governed by NPCI (National Payments Corporation of India) and processed via Razorpay — a PCI-DSS compliant payment gateway. WhatsApp messages are end-to-end encrypted. MyRentSaathi never stores your bank account details or UPI PIN.",
      },
    },
  ],
};

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: "📅",
    title: "Bill Generated on 1st",
    desc: "Every month on the 1st, MyRentSaathi auto-generates rent bills for each tenant based on their agreement.",
  },
  {
    step: "2",
    icon: "📱",
    title: "UPI Link Sent on WhatsApp",
    desc: "A payment link is sent directly to the tenant's WhatsApp. Tenant clicks, pays via GPay/PhonePe/Paytm — done.",
  },
  {
    step: "3",
    icon: "🔔",
    title: "Auto-Reminders Until Paid",
    desc: "If not paid by 5th, a reminder goes. Again on 10th. Reminders stop the moment payment is confirmed.",
  },
  {
    step: "4",
    icon: "✅",
    title: "Receipt on WhatsApp",
    desc: "Tenant receives an instant WhatsApp receipt. Landlord sees payment confirmed in the dashboard.",
  },
];

const BENEFITS = [
  {
    icon: "⚡",
    title: "Collect in 3 Days, Not 15",
    desc: "Manual collection takes 2 weeks of chasing. With automated WhatsApp reminders + UPI links, 90% of tenants pay within 3 days of the 1st.",
  },
  {
    icon: "📵",
    title: "No New App for Tenants",
    desc: "The #1 reason tenants don't use rent apps: they don't want to download one more app. WhatsApp already has 500M+ users in India. Zero friction.",
  },
  {
    icon: "🌍",
    title: "Works for NRI Landlords",
    desc: "Rent goes directly to your Indian bank account. No need to be in India, no calls across time zones. WhatsApp works globally.",
  },
  {
    icon: "📊",
    title: "Real-Time Dashboard",
    desc: "See who paid and who hasn't — at any moment. Filter by property, month, or tenant. Export rent history as PDF for tax filing.",
  },
  {
    icon: "🔒",
    title: "Bank-Level Security",
    desc: "All payments via Razorpay (PCI-DSS compliant). NPCI-governed UPI transactions. End-to-end encrypted WhatsApp messages.",
  },
  {
    icon: "🧾",
    title: "Auto Receipts & Tax Reports",
    desc: "Every payment generates an automatic receipt sent to the tenant. Year-end tax reports (income statement, TDS-ready) downloadable in one click.",
  },
];

const FAQS = [
  { q: "How does WhatsApp rent collection work?", a: "MyRentSaathi sends a UPI payment link to the tenant on WhatsApp monthly. Tenant pays via GPay/PhonePe/Paytm. Rent reaches your bank in T+2 days. Auto receipt sent on WhatsApp." },
  { q: "Do tenants need to download an app?", a: "No. Tenants pay entirely on WhatsApp — no downloads, no registration. They just click the UPI link in WhatsApp and pay in their existing UPI app." },
  { q: "How are rent reminders sent?", a: "Automated reminders go on the 1st, 5th, and 10th of every month — with the UPI payment link. Reminders stop automatically once rent is paid." },
  { q: "How quickly does rent reach my bank account?", a: "T+2 business days via Razorpay. Typically next working day for most Indian banks. NRI landlords receive funds in their Indian bank account." },
  { q: "Is WhatsApp rent collection secure?", a: "Yes — all UPI transactions via Razorpay (PCI-DSS compliant), governed by NPCI. WhatsApp messages are end-to-end encrypted. We never store your bank details or UPI PIN." },
];

export default function WhatsappRentCollectionPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-[#064e3b] to-[#1a0f00] text-white text-center">
        <nav className="text-[12px] text-white/50 mb-6 flex items-center justify-center gap-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <span>WhatsApp Rent Collection</span>
        </nav>
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-green-300 bg-green-900/50 border border-green-700 tracking-wider mb-4">
          500M+ INDIANS ALREADY USE WHATSAPP — WHY NOT COLLECT RENT THERE?
        </span>
        <h1 className="font-serif text-[42px] font-extrabold leading-tight tracking-tight max-w-[820px] mx-auto">
          Collect Rent via WhatsApp UPI — Automated Reminders, Instant Receipts
        </h1>
        <p className="text-[17px] text-white/70 mt-4 max-w-[640px] mx-auto leading-relaxed">
          Send UPI payment links on WhatsApp. Automated reminders on 1st, 5th, 10th of every month. No new app for tenants. 90% of rent collected within 3 days.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] hover:bg-brand-600">
            Start Free Trial →
          </Link>
          <Link href="/pricing" className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10">
            View Pricing
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-[13px] text-white/60">
          {["📱 WhatsApp UPI links", "🔔 Auto-reminders 1st, 5th, 10th", "✅ Instant receipts", "🌍 Works for NRIs"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 max-w-[960px] mx-auto">
        <h2 className="font-serif text-[30px] font-extrabold text-ink text-center mb-10">
          How WhatsApp Rent Collection Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="bg-white rounded-[16px] border border-border-default p-5 text-center">
              <div className="w-9 h-9 rounded-full bg-brand-500 text-white font-extrabold text-[15px] flex items-center justify-center mx-auto mb-3">
                {s.step}
              </div>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-bold text-ink text-[14px] mb-2">{s.title}</h3>
              <p className="text-[12px] text-ink/60 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 bg-warm-50 px-6">
        <div className="max-w-[960px] mx-auto">
          <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-10">
            Why WhatsApp Is the Best Way to Collect Rent in India
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-white rounded-[16px] border border-border-default p-5">
                <div className="text-3xl mb-3">{b.icon}</div>
                <h3 className="font-bold text-ink text-[14px] mb-2">{b.title}</h3>
                <p className="text-[12px] text-ink/60 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* vs manual */}
      <section className="py-14 px-6 max-w-[900px] mx-auto">
        <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-8">
          Manual Collection vs WhatsApp Automation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-red-50 border border-red-100 rounded-[16px] p-6">
            <div className="font-bold text-red-700 text-[14px] mb-3">❌ Manual Collection (Old Way)</div>
            <ul className="space-y-2 text-[13px] text-red-600">
              {[
                "Call/message tenant individually every month",
                "Chase defaulters for 2 weeks",
                "Track cash payments in register or Excel",
                "Manually send WhatsApp receipt messages",
                "Forget to follow up — lose ₹1,000s in delays",
                "No dashboard — can't see who paid at a glance",
              ].map((p) => <li key={p}>• {p}</li>)}
            </ul>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-[16px] p-6">
            <div className="font-bold text-green-700 text-[14px] mb-3">✅ MyRentSaathi WhatsApp (New Way)</div>
            <ul className="space-y-2 text-[13px] text-green-600">
              {[
                "UPI link sent automatically on 1st of every month",
                "Reminders go on 5th and 10th — zero effort",
                "Every payment tracked in real-time dashboard",
                "Instant WhatsApp receipt on payment",
                "Never forget a follow-up — system handles it",
                "One-click rent history PDF for tax filing",
              ].map((p) => <li key={p}>• {p}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* Who uses it */}
      <section className="py-14 bg-warm-50 px-6">
        <div className="max-w-[860px] mx-auto text-center">
          <h2 className="font-serif text-[26px] font-extrabold text-ink mb-8">
            Built for Every Type of Landlord
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: "🏠", title: "Single-Property Landlord", desc: "One flat, one tenant. Automate everything — stop chasing rent every month." },
              { icon: "🏢", title: "Multi-Property Portfolio", desc: "5–50 properties across cities. One dashboard. Reminders run automatically for all tenants." },
              { icon: "🌍", title: "NRI Landlord", desc: "Manage from USA, UK, UAE, Canada. Rent to your Indian bank account. Full WhatsApp operation." },
            ].map((c) => (
              <div key={c.title} className="bg-white rounded-[16px] border border-border-default p-5">
                <div className="text-3xl mb-3">{c.icon}</div>
                <h3 className="font-bold text-ink text-[14px] mb-2">{c.title}</h3>
                <p className="text-[12px] text-ink/60 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
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
      <section className="py-8 px-6 max-w-[900px] mx-auto">
        <div className="bg-warm-50 rounded-[16px] p-5 border border-border-default flex flex-wrap gap-3 text-[13px]">
          {[
            { label: "For Landlords", href: "/for-landlords" },
            { label: "NRI Property Management", href: "/nri-property-management" },
            { label: "Rental Agreement Generator", href: "/rental-agreement-generator" },
            { label: "Rent Management Delhi", href: "/rent-management-software/delhi" },
            { label: "Rent Management Mumbai", href: "/rent-management-software/mumbai" },
            { label: "Rent Management Bangalore", href: "/rent-management-software/bangalore" },
            { label: "vs MyGate", href: "/vs-mygate" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-brand-500 font-semibold hover:underline">
              {l.label}
            </Link>
          ))}
        </div>
      </section>

      <CTA />
      <Footer />
    </div>
  );
}
