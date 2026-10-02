import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";

export const metadata: Metadata = {
  title: "Terms of Service — MyRentSaathi",
  description: "Terms for using MyRentSaathi, the rent and housing-society management platform operated by AIVEXA LLP.",
  alternates: { canonical: "https://www.myrentsaathi.com/terms" },
};

export default function Page() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <HomePageClient />
      <main className="pt-24 pb-20 max-w-[860px] mx-auto px-6">
        <h1 className="font-serif text-[36px] font-extrabold text-ink leading-tight mb-2">Terms of Service</h1>
        <p className="text-[13px] text-ink/50 mb-8">Last updated: 2 October 2026</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Agreement</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">By creating an account or using MyRentSaathi (operated by AIVEXA LLP, India), you agree to these terms. If you use it for a society or business, you confirm you are authorised to accept them on its behalf.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">The service</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">MyRentSaathi provides software to manage rent, maintenance, tenants, agreements, complaints, notices, polls, parking, visitors and related records, with messages over WhatsApp, SMS and email. Features may change as we improve the product.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Accounts</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">Keep your login details confidential and make sure the information you add (including details of tenants, landlords and members) is accurate and that you have the right to share it with us for these purposes. You are responsible for activity under your account.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Payments</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">Rent and maintenance paid by tenants/members through payment links go to the landlord&apos;s or society&apos;s account via our payment partner; MyRentSaathi is not a party to the rental or membership arrangement. Subscription fees for MyRentSaathi plans are billed as shown at checkout, after any free trial. Applicable taxes are extra where required.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Free trial and cancellation</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">New accounts get a free trial (currently 30 days, no credit card). You can stop using the service or cancel a paid plan at any time; for billing questions or refund requests contact support@myrentsaathi.com.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">AI-generated content</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">Rental agreement drafts and assistant answers are generated with AI and are provided as a starting point. They are not legal advice; review them (or use the optional lawyer review) before signing or relying on them.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Acceptable use</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">Do not misuse the service: no unlawful, fraudulent or abusive messages, no spam, no attempts to access other users&apos; data, and no interference with the platform.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Liability</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">The service is provided &ldquo;as is&rdquo;. To the extent permitted by law, AIVEXA LLP is not liable for indirect or consequential losses, and our total liability is limited to the fees you paid us in the 12 months before the claim.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Governing law</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">These terms are governed by the laws of India. Courts at Darbhanga, Bihar have jurisdiction, subject to applicable law.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Contact</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">AIVEXA LLP (operator of MyRentSaathi), Darbhanga, Bihar, India · Email: support@myrentsaathi.com</p>
      </main>
    </div>
  );
}
