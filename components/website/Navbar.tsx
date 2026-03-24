"use client";

import { useState, useEffect } from "react";

import Link from "next/link";

interface NavbarProps {
  onLoginClick: () => void;
}

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar({ onLoginClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${
        scrolled
          ? "glass border-b border-border-light shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1140px] mx-auto px-6 flex justify-between items-center h-16">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <span className="text-[26px]">🏠</span>
          <span className="font-serif text-[22px] font-extrabold text-ink">
            MyRent<span className="text-brand-500">Saathi</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-semibold text-ink-soft hover:text-brand-500 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/signup"
            className="px-5 py-3 rounded-[14px] border border-brand-500 text-brand-500 text-sm font-bold hover:bg-brand-50 transition-colors"
          >
            Sign Up
          </Link>
          <button
            onClick={onLoginClick}
            className="hover-lift px-7 py-3 rounded-[14px] bg-gradient-to-br from-brand-500 to-brand-600 text-white text-sm font-bold shadow-[0_4px_20px_rgba(194,102,10,0.3)] cursor-pointer"
          >
            Login
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span
            className={`block w-6 h-0.5 bg-ink transition-transform ${
              mobileOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-ink transition-opacity ${
              mobileOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-ink transition-transform ${
              mobileOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-border-light px-6 py-4 animate-fade-in">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-3 text-sm font-semibold text-ink-soft hover:text-brand-500"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => {
              onLoginClick();
              setMobileOpen(false);
            }}
            className="w-full mt-3 px-7 py-3 rounded-[14px] bg-gradient-to-br from-brand-500 to-brand-600 text-white text-sm font-bold cursor-pointer"
          >
            Login
          </button>
        </div>
      )}
    </nav>
  );
}
