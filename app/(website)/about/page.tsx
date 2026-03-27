import type { Metadata } from "next";
import Navbar from "@/components/website/Navbar";
import Footer from "@/components/website/Footer";
import HomePageClient from "@/components/website/HomePageClient";

export const metadata: Metadata = {
  title: "About MyRentSaathi — India's Rent & Society Management Platform",
  description:
    "Learn about MyRentSaathi — built for Indian landlords, housing societies, and tenants. Our mission is to simplify property management across India.",
  alternates: { canonical: "https://www.myrentsaathi.com/about" },
  openGraph: {
    title: "About MyRentSaathi",
    description: "India's smartest rent & society management platform — built for landlords, societies, and tenants.",
    url: "https://www.myrentsaathi.com/about",
  },
};

export default function AboutPage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <HomePageClient />
      <main className="pt-24 pb-20 max-w-[860px] mx-auto px-6">
        <h1 className="font-serif text-[38px] font-extrabold text-ink leading-tight mb-6">
          About MyRentSaathi
        </h1>
        <p className="text-[17px] text-ink/80 leading-relaxed mb-5">
          MyRentSaathi is India&apos;s smartest society &amp; rent management platform — designed to
          eliminate paperwork, automate collections, and bring every stakeholder onto one platform.
        </p>
        <h2 className="font-serif text-[24px] font-bold text-ink mt-10 mb-3">Our Mission</h2>
        <p className="text-[16px] text-ink/70 leading-relaxed mb-5">
          We believe every landlord in India — whether they own 1 flat or 100 properties — deserves
          professional property management tools. We are building those tools, natively for India,
          natively on WhatsApp.
        </p>
        <h2 className="font-serif text-[24px] font-bold text-ink mt-10 mb-3">What We Solve</h2>
        <ul className="space-y-3 text-[15px] text-ink/70 list-disc pl-5">
          <li>Manual rent collection via cash or bank transfer — now automated with UPI &amp; WhatsApp</li>
          <li>Maintenance fee chasing — now automatic with reminders and receipts</li>
          <li>Agreement drafting — now AI-powered, legally vetted, 8 cities</li>
          <li>Society expense approvals — now transparent and digital</li>
          <li>Tenant lifecycle management — from onboarding to exit, fully automated</li>
        </ul>
        <h2 className="font-serif text-[24px] font-bold text-ink mt-10 mb-3">Built for India</h2>
        <p className="text-[16px] text-ink/70 leading-relaxed">
          MyRentSaathi is purpose-built for Indian real estate — supporting UPI payments, Indian
          tax reports (Form 26AS, TDS), Aadhaar &amp; PAN verification, and multi-language
          WhatsApp communication. We support landlords from Delhi to Bangalore, Mumbai to Chennai.
        </p>
      </main>
      <Footer />
    </div>
  );
}
