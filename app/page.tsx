"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/website/Navbar";
import Hero from "@/components/website/Hero";
import ProblemSolution from "@/components/website/ProblemSolution";
import Features from "@/components/website/Features";
import HowItWorks from "@/components/website/HowItWorks";
import Testimonials from "@/components/website/Testimonials";
import Pricing from "@/components/website/Pricing";
import FAQ from "@/components/website/FAQ";
import CTA from "@/components/website/CTA";
import Footer from "@/components/website/Footer";
import LoginModal from "@/components/website/LoginModal";

export default function HomePage() {
  const [showLogin, setShowLogin] = useState(false);
  const router = useRouter();

  const handleLogin = (role: string) => {
    setShowLogin(false);
    router.push(`/${role}`);
  };

  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <Navbar onLoginClick={() => setShowLogin(true)} />
      <Hero />
      <ProblemSolution />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}
