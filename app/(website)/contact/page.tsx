import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import ContactForm from "@/components/website/ContactForm";

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
          <a
            href="https://wa.me/919204298771"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-[16px] border border-border-default p-5 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">💬</div>
            <div className="font-bold text-ink mb-1 text-[14px]">WhatsApp Support</div>
            <div className="text-[12px] text-ink-muted mb-1">+91 92042 98771</div>
            <div className="text-[11px] text-ink-muted mb-3">Chat with our team instantly</div>
            <span className="px-4 py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold inline-block">
              Chat Now
            </span>
          </a>

          <a
            href="mailto:support@myrentsaathi.com"
            className="bg-white rounded-[16px] border border-border-default p-5 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">📧</div>
            <div className="font-bold text-ink mb-1 text-[14px]">Email Support</div>
            <div className="text-[12px] text-ink-muted mb-3">support@myrentsaathi.com</div>
            <span className="px-4 py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold inline-block">
              Send Email
            </span>
          </a>

          <a
            href="tel:+919204298771"
            className="bg-white rounded-[16px] border border-border-default p-5 text-center hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">📞</div>
            <div className="font-bold text-ink mb-1 text-[14px]">Call Us</div>
            <div className="text-[12px] text-ink-muted mb-3">+91 92042 98771</div>
            <span className="px-4 py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold inline-block">
              Call Now
            </span>
          </a>
        </div>

        <h2 className="font-serif text-[22px] font-bold text-ink mb-4">Send a Message</h2>
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
}
