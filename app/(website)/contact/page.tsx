import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";

export const metadata: Metadata = {
  title: "Contact Us — MyRentSaathi Support & Sales",
  description:
    "Get in touch with MyRentSaathi. Support for landlords, housing societies, and tenants. WhatsApp support, email support, and demo booking available.",
  alternates: { canonical: "https://www.myrentsaathi.com/contact" },
  openGraph: {
    title: "Contact MyRentSaathi",
    description: "Reach our team for support, sales, or demo. WhatsApp & email support available.",
    url: "https://www.myrentsaathi.com/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <HomePageClient />
      <main className="pt-24 pb-20 max-w-[700px] mx-auto px-6">
        <h1 className="font-serif text-[38px] font-extrabold text-ink leading-tight mb-4">
          Contact Us
        </h1>
        <p className="text-[17px] text-ink/70 mb-10">
          Have questions? We&apos;re here to help. Reach us via WhatsApp, email, or book a demo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
          {[
            { icon: "💬", title: "WhatsApp Support", desc: "Chat with our team instantly", cta: "Chat Now" },
            { icon: "📧", title: "Email Support", desc: "support@myrentsaathi.com", cta: "Send Email" },
            { icon: "📅", title: "Book a Demo", desc: "See the platform live in 20 min", cta: "Schedule" },
          ].map((c) => (
            <div key={c.title} className="bg-white rounded-[16px] border border-border-default p-5 text-center">
              <div className="text-3xl mb-3">{c.icon}</div>
              <div className="font-bold text-ink mb-1 text-[14px]">{c.title}</div>
              <div className="text-[12px] text-ink-muted mb-3">{c.desc}</div>
              <button className="px-4 py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold cursor-pointer hover:bg-brand-600">
                {c.cta}
              </button>
            </div>
          ))}
        </div>

        <h2 className="font-serif text-[22px] font-bold text-ink mb-4">Send a Message</h2>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Your name" className="border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input placeholder="Email or phone" className="border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <select className="w-full border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option>I am a...</option>
            <option>Landlord</option>
            <option>Society Committee Member</option>
            <option>Tenant</option>
            <option>Other</option>
          </select>
          <textarea rows={4} placeholder="How can we help?" className="w-full border border-border-default rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          <button type="submit" className="px-8 py-3 rounded-xl bg-brand-500 text-white text-[14px] font-bold cursor-pointer hover:bg-brand-600">
            Send Message
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
