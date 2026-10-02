import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How MyRentSaathi (operated by AIVEXA LLP) collects, uses and protects the personal data of landlords, society members and tenants.",
  alternates: { canonical: "https://www.myrentsaathi.com/privacy" },
};

export default function Page() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <HomePageClient />
      <main className="pt-24 pb-20 max-w-[860px] mx-auto px-6">
        <h1 className="font-serif text-[36px] font-extrabold text-ink leading-tight mb-2">Privacy Policy</h1>
        <p className="text-[13px] text-ink/50 mb-8">Last updated: 2 October 2026</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Who we are</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">MyRentSaathi is a rent and housing-society management platform operated by AIVEXA LLP, India (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what personal data we process when you use myrentsaathi.com, our dashboards and our WhatsApp messages, and the choices you have.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Data we collect</h2>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2"><strong>Account data:</strong> name, phone number, email address and password (stored only as a secure hash).</li>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2"><strong>Property & society data:</strong> society/property names and addresses, flats, landlords and tenants added by an admin or landlord, rent and maintenance amounts, lease dates, parking, visitors, notices, polls and complaints.</li>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2"><strong>Payment data:</strong> payment amounts, status and references. Card/UPI/bank details are entered on our payment partner&apos;s page; we do not store full card or bank credentials.</li>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2"><strong>Documents:</strong> rental agreements, KYC documents, bills and other files you choose to upload.</li>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2"><strong>Usage data:</strong> pages visited, device and browser type, approximate location from IP address, and log data used for security and analytics.</li>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">How we use it</h2>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2">To provide the service: reminders, payment links, receipts, ticket updates, notices, reports and agreements.</li>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2">To send messages on WhatsApp, SMS or email that relate to your account, payments and society activity.</li>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2">To generate AI drafts (for example rental agreements) and answer questions in the in-app assistant.</li>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2">To secure the platform, prevent fraud, provide support and improve the product.</li>
        <li className="text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2">To meet legal, tax and accounting obligations.</li>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">We do <strong>not</strong> sell your personal data.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Service providers we share data with</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">We share only the data needed for each purpose with providers who process it on our behalf: cloud database and hosting (Supabase, Vercel), payment processing (Razorpay), WhatsApp Business messaging (Meta), email delivery, AI text generation (OpenAI) for drafts and the assistant, and analytics/advertising measurement (Google). Data visible to other users is limited by role — for example, a tenant sees their own rent records, and a society admin sees their society&apos;s records.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Retention</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">We keep account data while your account is active and for as long as needed for legal, tax and dispute-resolution purposes afterwards. You can ask us to delete your account at any time (see below).</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Your rights</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">You can access, correct or delete your personal data, withdraw consent for optional messages, and ask questions about how your data is used, by writing to support@myrentsaathi.com. We respond within 30 days. Where Indian data-protection law (including the Digital Personal Data Protection Act, 2023) gives you additional rights, we honour them.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Security</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">Data is encrypted in transit (HTTPS) and access is restricted by role. No system is perfectly secure, so please use a strong password and keep your login private.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Children</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">MyRentSaathi is meant for adults managing property and is not directed at children under 18.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Changes</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">We may update this policy; the date at the top shows the latest version. Significant changes will be notified in the app or by email.</p>
        <h2 className="font-serif text-[22px] font-bold text-ink mt-10 mb-3">Contact</h2>
        <p className="text-[15px] text-ink/75 leading-relaxed mb-4">AIVEXA LLP (operator of MyRentSaathi), Darbhanga, Bihar, India · Email: support@myrentsaathi.com</p>
      </main>
    </div>
  );
}
