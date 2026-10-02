import type { Metadata } from "next";
import HomePageClient from "@/components/website/HomePageClient";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — MyRentSaathi",
  description: "MyRentSaathi refund and cancellation policy: 30-day free trial with no card, cancel any time to stop the next renewal, paid subscriptions are non-refundable.",
  alternates: { canonical: "https://www.myrentsaathi.com/refund" },
};

const H2 = "font-serif text-[22px] font-bold text-ink mt-10 mb-3";
const P = "text-[15px] text-ink/75 leading-relaxed mb-4";
const LI = "text-[15px] text-ink/75 leading-relaxed ml-5 list-disc mb-2";

export default function Page() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <HomePageClient />
      <main className="pt-24 pb-20 max-w-[860px] mx-auto px-6">
        <h1 className="font-serif text-[36px] font-extrabold text-ink leading-tight mb-2">Refund &amp; Cancellation Policy</h1>
        <p className="text-[13px] text-ink/50 mb-8">Last updated: 2 October 2026</p>

        <h2 className={H2}>Try before you pay</h2>
        <p className={P}>Every new MyRentSaathi account gets a <strong>30-day free trial</strong> with full access and no credit card. Please use the trial to check that the product fits your property or society before choosing a paid plan.</p>

        <h2 className={H2}>No refunds on paid plans</h2>
        <p className={P}>Because you can evaluate the service free for 30 days, <strong>all payments for paid plans (monthly or yearly) are final and non-refundable</strong>, including partially used billing periods, unused flats/properties, or downgrades in the middle of a period.</p>

        <h2 className={H2}>Cancelling</h2>
        <ul>
          <li className={LI}>You can cancel at any time by emailing support@myrentsaathi.com from your registered email (or from your dashboard, where available).</li>
          <li className={LI}>Cancellation stops the <strong>next renewal</strong>. You keep access to paid features until the end of the period you have already paid for.</li>
          <li className={LI}>After that, paid features stop. You can ask us for an export of your data, as described in our <a href="/privacy" className="text-amber-700 underline">Privacy Policy</a>.</li>
        </ul>

        <h2 className={H2}>Exceptions</h2>
        <ul>
          <li className={LI}><strong>Duplicate or wrong charge:</strong> if you were charged twice for the same period, or charged after a confirmed cancellation, we refund the extra amount in full.</li>
          <li className={LI}><strong>Failed payment debited:</strong> if money left your account but the payment failed on our side, it is normally reversed automatically by the bank/payment partner within 5–7 working days. If not, write to us with the transaction reference.</li>
        </ul>
        <p className={P}>Approved refunds go back to the original payment method within 7–10 working days.</p>

        <h2 className={H2}>Rent and maintenance paid through MyRentSaathi</h2>
        <p className={P}>Rent, maintenance and other dues that tenants or members pay to a landlord or society through MyRentSaathi payment links go to that landlord or society. MyRentSaathi does not hold these funds, so refunds of such payments must be requested from the landlord or society committee.</p>

        <h2 className={H2}>Contact</h2>
        <p className={P}>AIVEXA LLP (operator of MyRentSaathi), Darbhanga, Bihar, India · Email: support@myrentsaathi.com</p>
      </main>
    </div>
  );
}
