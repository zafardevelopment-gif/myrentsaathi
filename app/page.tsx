import HomePageClient from "@/components/website/HomePageClient";
import PageTracker from "@/components/website/PageTracker";
import Hero from "@/components/website/Hero";
import ProblemSolution from "@/components/website/ProblemSolution";
import Personas from "@/components/website/Personas";
import Features from "@/components/website/Features";
import HowItWorks from "@/components/website/HowItWorks";
import Testimonials from "@/components/website/Testimonials";
import Pricing from "@/components/website/Pricing";
import TopCities from "@/components/website/TopCities";
import FAQ from "@/components/website/FAQ";
import CTA from "@/components/website/CTA";
import Footer from "@/components/website/Footer";
import { WEBSITE_FAQS } from "@/lib/mockData";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: WEBSITE_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function HomePage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      {/* Fire-and-forget analytics — renders nothing */}
      <PageTracker page="/" />
      {/* Client shell: Navbar + LoginModal (needs useState) */}
      <HomePageClient />

      {/* Server-rendered sections */}
      <Hero />
      <ProblemSolution />
      <Personas />
      <Features />
      <HowItWorks />
      <Testimonials />

      {/* Server component — fetches pricing from Supabase */}
      <Pricing />

      {/* Server component — dynamic cities grid */}
      <TopCities />

      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
