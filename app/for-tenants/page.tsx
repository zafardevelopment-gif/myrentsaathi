import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";
import { absoluteUrl } from "@/lib/seo/config";

export const metadata: Metadata = {
  title: "Pay Rent Online via UPI on WhatsApp — For Tenants",
  description:
    "Pay rent online via UPI straight from WhatsApp, get an instant rent receipt for your HRA claim, raise maintenance complaints and view your agreement. No app download needed.",
  keywords: [
    "pay rent online via UPI",
    "pay rent on WhatsApp",
    "online rent receipt for HRA",
    "is it safe to pay rent through an app",
    "tenant rent payment India",
    "digital rent receipt India",
  ],
  alternates: { canonical: absoluteUrl("/for-tenants") },
  openGraph: {
    title: "Pay Rent Online via UPI on WhatsApp — MyRentSaathi for Tenants",
    description:
      "Pay rent via UPI on WhatsApp, get an instant receipt for HRA, raise complaints. No app download.",
    url: absoluteUrl("/for-tenants"),
  },
};

const FEATURES = [
  { icon: "💳", title: "Pay Rent via UPI", desc: "Get a payment link on WhatsApp. Pay via GPay, PhonePe or Paytm. Instant receipt." },
  { icon: "🧾", title: "Digital Receipts", desc: "Every rent and maintenance receipt stored automatically. Download anytime for your IT return." },
  { icon: "📄", title: "View Your Agreement", desc: "Your rental agreement is always accessible — no hunting for a paper copy." },
  { icon: "🚫", title: "Raise Complaints", desc: "Submit plumbing, electrical or parking issues via WhatsApp and track resolution." },
  { icon: "📢", title: "Society Notices", desc: "Get notices, meeting announcements and emergency alerts on WhatsApp instantly." },
  { icon: "🗳️", title: "Participate in Polls", desc: "Vote in society polls from your phone — secret ballot, transparent results." },
];

const FAQS = [
  { q: "Do I need to download an app to pay rent?", a: "No. MyRentSaathi works entirely over WhatsApp. You receive a payment link and reminders on WhatsApp and pay through the UPI app you already use. There is nothing new to install or log into." },
  { q: "How do I pay my rent through MyRentSaathi?", a: "Each month you get a WhatsApp message with a UPI payment link. Tap it, pay with Google Pay, PhonePe, Paytm or any UPI app, and a receipt is sent back to you automatically. That's the whole process." },
  { q: "Will I get a rent receipt I can use for my HRA claim?", a: "Yes. Every payment generates a dated digital receipt that's stored for you, so you can download the year's receipts when you file your income tax return and claim HRA. You no longer have to ask your landlord to write one out." },
  { q: "Is it safe to pay my rent this way?", a: "Yes. Payments go over standard UPI infrastructure through a regulated payment gateway — the same rails you already use for everyday UPI payments. MyRentSaathi does not see or store your card or bank-account details; it only records that the rent was paid and issues the receipt." },
  { q: "Can I raise a maintenance complaint here?", a: "Yes. You can raise a ticket for plumbing, electrical, lift, parking or any issue and follow its status until it's resolved, so nothing gets lost in a group chat." },
  { q: "What if I pay late or the link expires?", a: "You'll get a reminder if rent is pending, and you can request a fresh payment link at any time — you're never locked out of paying because a message scrolled away." },
  { q: "Can I see my rental agreement and past payments?", a: "Yes. Your current agreement and your full payment history stay available to you, so you always have proof of what you've paid and the terms you agreed to." },
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

export default function ForTenantsPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-[#0d1f3c] to-[#1a3a6b] text-white text-center">
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-blue-300 bg-blue-900/60 border border-blue-700 tracking-wider mb-4">
          FOR TENANTS
        </span>
        <h1 className="font-serif text-[42px] font-extrabold leading-tight tracking-tight max-w-[720px] mx-auto">
          Pay Rent Online via UPI — Right From WhatsApp
        </h1>
        <p className="text-[18px] text-white/70 mt-4 max-w-[600px] mx-auto leading-relaxed">
          Pay rent in a tap, get an instant receipt for your HRA claim, raise complaints and stay
          informed — with no app to download and no login to remember.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-blue-500 text-white font-bold text-[15px] hover:bg-blue-600">
            Ask Your Landlord to Sign Up
          </Link>
          <Link href="/for-landlords" className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10">
            How It Works for Landlords
          </Link>
        </div>
        <div className="mt-6 text-[13px] text-white/50">No app download · Works on any phone · WhatsApp-native</div>
      </section>

      {/* Intro prose */}
      <section className="py-16 px-6">
        <div className="max-w-[760px] mx-auto text-[15px] leading-[1.85] text-ink/80 space-y-5">
          <h2 className="font-serif text-[30px] font-extrabold text-ink leading-tight">
            Paying rent, without the monthly hassle
          </h2>
          <p>
            As a tenant, paying rent should be the easy part — but often it isn&apos;t. You transfer
            the money, then screenshot the confirmation, then message your landlord to confirm, and
            then, months later at tax time, you&apos;re asking them to write out receipts you should
            have had all along. If your landlord uses MyRentSaathi, all of that disappears.
          </p>
          <p>
            On your rent due date, a UPI payment link arrives on WhatsApp. You tap it and pay with
            whichever UPI app you already use — Google Pay, PhonePe, Paytm — and a dated receipt is
            generated and sent straight back to you. There is no separate app to download, no
            account to create, and no password to forget. It uses the same UPI payment you make for
            everything else; MyRentSaathi simply organises it and keeps the paperwork for you.
          </p>
          <h3 className="font-serif text-[22px] font-bold text-ink pt-2">
            Receipts ready for your HRA claim
          </h3>
          <p>
            Every payment you make is stored as a digital receipt, so when you file your income tax
            return you can download a clean record of the year&apos;s rent for your House Rent
            Allowance (HRA) claim — no last-minute chasing, no hand-written slips. Your rental
            agreement and full payment history stay available to you too, which means you always
            have proof of what you paid and the terms you signed up to.
          </p>
          <h3 className="font-serif text-[22px] font-bold text-ink pt-2">
            More than just rent
          </h3>
          <p>
            The same WhatsApp thread is where you raise maintenance complaints — plumbing,
            electrical, lift, parking — and track them until they&apos;re fixed, instead of watching
            them vanish in a building group chat. Society notices, meeting announcements and
            emergency alerts reach you there instantly, and if your society runs a poll or election
            you can vote from your phone. Is any of this safe? Yes: payments run on standard,
            regulated UPI rails and MyRentSaathi never stores your card or bank details. If you want
            to understand the landlord&apos;s side of the flow, our{" "}
            <Link href="/for-landlords" className="text-brand-600 underline underline-offset-2">
              landlord page
            </Link>{" "}
            walks through it.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 max-w-[1000px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-[32px] font-extrabold text-ink">Everything a Tenant Needs</h2>
          <p className="text-[16px] text-ink/60 mt-3 max-w-[480px] mx-auto">
            Manage your rental life without ever downloading another app.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-[16px] border border-border-default p-6">
              <div className="text-3xl mb-3" aria-hidden="true">{f.icon}</div>
              <h3 className="font-bold text-ink text-[15px] mb-2">{f.title}</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed">{f.desc}</p>
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

      <CTA />
      <Footer />
    </div>
  );
}
