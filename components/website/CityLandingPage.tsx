import HomePageClient from "./HomePageClient";
import Footer from "./Footer";
import CTA from "./CTA";
import Link from "next/link";

interface CityLandingProps {
  city: string;
  state: string;
  slug: string;
  neighborhoods: string[];
  faqs: { q: string; a: string }[];
  /** Other active cities for internal linking — passed from server component */
  otherCities?: { city_name: string; slug: string }[];
}

export default function CityLandingPage({ city, state, slug, neighborhoods, faqs, otherCities }: CityLandingProps) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const localBizJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `MyRentSaathi ${city}`,
    description: `Rent management software for landlords and housing societies in ${city}, ${state}. Automate rent collection, manage tenants, and run societies digitally.`,
    applicationCategory: "BusinessApplication",
    areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "State", name: state } },
    url: `https://www.myrentsaathi.com/rent-management-software-${slug}`,
  };

  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBizJsonLd).replace(/</g, "\\u003c") }}
      />
      <HomePageClient />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 bg-gradient-to-br from-brand-900 to-[#1a0f00] text-white text-center">
        <nav className="text-[12px] text-white/50 mb-6 flex items-center justify-center gap-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <span>Rent Management Software {city}</span>
        </nav>
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-400 bg-brand-900/80 border border-brand-700 tracking-wider mb-4">
          {city.toUpperCase()}, {state.toUpperCase()}
        </span>
        <h1 className="font-serif text-[42px] font-extrabold leading-tight tracking-tight max-w-[760px] mx-auto">
          Best Rent Management Software in {city} — Automate Collections & Manage Societies
        </h1>
        <p className="text-[17px] text-white/70 mt-4 max-w-[620px] mx-auto leading-relaxed">
          Trusted by landlords and housing societies across {city}. Collect rent via UPI,
          automate WhatsApp reminders, manage tenants, and run your society digitally.
          Starting at ₹499/month.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <button className="px-8 py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] hover:bg-brand-600 cursor-pointer">
            Start Free Trial
          </button>
          <button className="px-8 py-3.5 rounded-xl border border-white/30 text-white font-bold text-[15px] hover:bg-white/10 cursor-pointer">
            View Pricing
          </button>
        </div>
      </section>

      {/* Features for City */}
      <section className="py-16 px-6 max-w-[1000px] mx-auto">
        <h2 className="font-serif text-[30px] font-extrabold text-ink text-center mb-10">
          Why {city} Landlords & Societies Choose MyRentSaathi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: "💸", title: "UPI Rent Collection", desc: `Send UPI links via WhatsApp to tenants across ${city}. Track paid, pending, overdue — in real time.` },
            { icon: "🏢", title: "Society Management", desc: `Complete maintenance billing, expense tracking, and complaint management for ${city} societies.` },
            { icon: "📄", title: `${city} Rent Agreements`, desc: `Legally-vetted agreement templates for ${city}, ${state}. AI-powered generator, lawyer-reviewed.` },
            { icon: "📱", title: "WhatsApp-Native", desc: `No new app downloads. Every tenant in ${city} already uses WhatsApp — we work within it.` },
            { icon: "📊", title: "Tax Reports", desc: `${state}-specific tax-ready reports for your CA. TDS compliance, income statements, Form 26AS prep.` },
            { icon: "🌍", title: "NRI Landlords", desc: `Manage your ${city} properties from anywhere in the world. Full remote operation via WhatsApp.` },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-[16px] border border-border-default p-5">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-ink text-[14px] mb-2">{f.title}</h3>
              <p className="text-[12px] text-ink/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Neighborhoods */}
      {neighborhoods.length > 0 && (
        <section className="py-12 bg-warm-50 px-6">
          <div className="max-w-[900px] mx-auto text-center">
            <h2 className="font-serif text-[26px] font-extrabold text-ink mb-6">
              Popular Areas in {city} We Serve
            </h2>
            <div className="flex flex-wrap justify-center gap-2.5">
              {neighborhoods.map((n) => (
                <span key={n} className="px-4 py-2 bg-white rounded-xl border border-border-default text-[13px] font-semibold text-ink">
                  {n}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing CTA */}
      <section className="py-14 px-6 max-w-[700px] mx-auto text-center">
        <h2 className="font-serif text-[28px] font-extrabold text-ink mb-4">
          Pricing for {city} Landlords & Societies
        </h2>
        <p className="text-[15px] text-ink/60 mb-6">
          Landlord plans from <strong>₹499/month</strong>. Society plans from <strong>₹2,999/month</strong>.
          All plans include a 14-day free trial.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/for-landlords" className="px-6 py-3 rounded-xl bg-brand-500 text-white font-bold text-[14px] hover:bg-brand-600">
            Landlord Plans
          </Link>
          <Link href="/for-societies" className="px-6 py-3 rounded-xl border-2 border-brand-500 text-brand-500 font-bold text-[14px] hover:bg-brand-50">
            Society Plans
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 max-w-[800px] mx-auto">
        <h2 className="font-serif text-[28px] font-extrabold text-ink text-center mb-8">
          FAQs — Rent Management Software in {city}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="bg-white rounded-[14px] border border-border-default p-5">
              <h3 className="font-bold text-ink text-[14px] mb-2">{faq.q}</h3>
              <p className="text-[13px] text-ink/70 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Internal links */}
      <section className="py-10 px-6 max-w-[900px] mx-auto">
        <div className="bg-warm-50 rounded-[16px] p-6 border border-border-default">
          <div className="text-[13px] font-bold text-ink mb-3">Also Available In:</div>
          <div className="flex flex-wrap gap-3 text-[13px]">
            {/* Dynamic city links from DB */}
            {(otherCities ?? [])
              .filter((c) => c.slug !== slug)
              .slice(0, 10)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/rent-management-software/${c.slug}`}
                  className="text-brand-500 font-semibold hover:underline"
                >
                  {c.city_name}
                </Link>
              ))}
            {/* Static links */}
            {[
              { label: "For Landlords", href: "/for-landlords" },
              { label: "For Societies", href: "/for-societies" },
              { label: "Pricing", href: "/pricing" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="text-brand-500 font-semibold hover:underline">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTA />
      <Footer />
    </div>
  );
}
