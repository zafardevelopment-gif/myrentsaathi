import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import CTA from "@/components/website/CTA";

export const metadata: Metadata = {
  title: "Tenant App India — Pay Rent, Raise Complaints, View Notices via WhatsApp",
  description:
    "MyRentSaathi for tenants — pay rent online via UPI, raise maintenance complaints, access agreements, and receive society notices. All on WhatsApp. No app download needed.",
  keywords: [
    "tenant management app India", "pay rent online India", "rent payment WhatsApp",
    "tenant portal India", "society tenant app", "online rent receipt India",
  ],
  alternates: { canonical: "https://www.myrentsaathi.com/for-tenants" },
  openGraph: {
    title: "Tenant App India — Pay Rent & Manage Everything via WhatsApp",
    description: "Pay rent, raise complaints, view notices. All on WhatsApp. No app download needed.",
    url: "https://www.myrentsaathi.com/for-tenants",
  },
};

const FEATURES = [
  { icon: "💳", title: "Pay Rent via UPI", desc: "Receive monthly payment link on WhatsApp. Pay via any UPI app — GPay, PhonePe, Paytm. Instant receipt." },
  { icon: "🧾", title: "Digital Receipts", desc: "All rent and maintenance receipts automatically stored. Download anytime for IT returns." },
  { icon: "📄", title: "View Your Agreement", desc: "Digital rental agreement always accessible. No more hunting for paper copies." },
  { icon: "🚫", title: "Raise Complaints", desc: "Submit maintenance requests — plumbing, electrical, parking — via WhatsApp. Track resolution status." },
  { icon: "📢", title: "Society Notices", desc: "Receive important notices, meeting announcements, and emergency alerts on WhatsApp instantly." },
  { icon: "🗳️", title: "Participate in Polls", desc: "Vote in society polls and elections from your phone. Your vote is secret, results are transparent." },
];

const FAQS = [
  { q: "Do I need to download an app?", a: "No. MyRentSaathi works entirely via WhatsApp. You receive links and notifications on WhatsApp and pay via your existing UPI app." },
  { q: "How do I pay rent through MyRentSaathi?", a: "Every month, you receive a WhatsApp message with a UPI payment link. Tap to pay via Google Pay, PhonePe, or any UPI app. Receipt is sent automatically." },
  { q: "Can I raise maintenance complaints?", a: "Yes. You can raise tickets for plumbing, electrical, lift, parking, or any issue. Track the status until it's resolved." },
  { q: "Is my payment data secure?", a: "Yes. All payments go through standard UPI infrastructure. We only store payment status and receipt data — no card or bank details." },
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
        <h1 className="font-serif text-[44px] font-extrabold leading-tight tracking-tight max-w-[700px] mx-auto">
          Pay Rent, Raise Complaints &amp; Stay Informed — All on WhatsApp
        </h1>
        <p className="text-[18px] text-white/70 mt-4 max-w-[580px] mx-auto leading-relaxed">
          No app downloads. No logins to remember. Everything you need as a tenant —
          delivered to your WhatsApp every month.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <button className="px-8 py-3.5 rounded-xl bg-blue-500 text-white font-bold text-[15px] hover:bg-blue-600 cursor-pointer">
            Ask Your Landlord to Sign Up
          </button>
          <button className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10 cursor-pointer">
            Learn More
          </button>
        </div>
        <div className="mt-6 text-[13px] text-white/50">No app download · Works on any phone · WhatsApp-native</div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-[1000px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-serif text-[32px] font-extrabold text-ink">
            Everything a Tenant Needs
          </h2>
          <p className="text-[16px] text-ink/60 mt-3 max-w-[480px] mx-auto">
            Manage your rental life without ever downloading another app.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-[16px] border border-border-default p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
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
