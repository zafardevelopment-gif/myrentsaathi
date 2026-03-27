import HomePageClient from "@/components/website/HomePageClient";
import PageTracker from "@/components/website/PageTracker";
import Hero from "@/components/website/Hero";
import ProblemSolution from "@/components/website/ProblemSolution";
import Features from "@/components/website/Features";
import HowItWorks from "@/components/website/HowItWorks";
import Testimonials from "@/components/website/Testimonials";
import Pricing from "@/components/website/Pricing";
import TopCities from "@/components/website/TopCities";
import FAQ from "@/components/website/FAQ";
import CTA from "@/components/website/CTA";
import Footer from "@/components/website/Footer";

export default function HomePage() {
  return (
    <div className="bg-background text-ink overflow-x-hidden">
      {/* Fire-and-forget analytics — renders nothing */}
      <PageTracker page="/" />
      {/* Client shell: Navbar + LoginModal (needs useState) */}
      <HomePageClient />

      {/* Server-rendered sections */}
      <Hero />
      <ProblemSolution />
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
