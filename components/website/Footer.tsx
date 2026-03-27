import Link from "next/link";
import { getActiveCities } from "@/lib/cities-data";

const PRODUCT_LINKS = [
  { label: "Society Management",   href: "/for-societies" },
  { label: "Rent Collection",      href: "/for-landlords" },
  { label: "Tenant Management",    href: "/for-tenants" },
  { label: "Agreement Generator",  href: "/features" },
  { label: "Pricing",              href: "/pricing" },
];

const COMPANY_LINKS = [
  { label: "About Us",  href: "/about" },
  { label: "Blog",      href: "/blog" },
  { label: "Features",  href: "/features" },
  { label: "Contact",   href: "/contact" },
  { label: "Careers",   href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy",   href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Refund Policy",    href: "/contact" },
  { label: "Data Security",    href: "/about" },
];

const SEO_KEYWORDS = [
  { label: "Rent Management Software India", href: "/" },
  { label: "Society Management System",      href: "/for-societies" },
  { label: "Tenant Management App",          href: "/for-tenants" },
  { label: "Rent Collection App India",      href: "/for-landlords" },
  { label: "Housing Society Software",       href: "/for-societies" },
  { label: "Landlord Software India",        href: "/for-landlords" },
  { label: "NRI Property Management",        href: "/for-landlords" },
  { label: "Online Rent Collection India",   href: "/for-landlords" },
];

export default async function Footer() {
  // Fetch top 8 cities for footer; fallback is handled inside getActiveCities
  const cities = await getActiveCities();
  const footerCities = cities.slice(0, 8);

  return (
    <footer className="bg-brand-900 pt-14 pb-8 text-white/60">
      <div className="max-w-[1140px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[22px]">🏠</span>
              <Link href="/" className="font-serif text-xl font-extrabold text-white">
                MyRent<span className="text-brand-500">Saathi</span>
              </Link>
            </div>
            <p className="text-[13px] leading-relaxed max-w-[280px] mb-4">
              India&apos;s smartest society & rent management platform. Property
              management without the hassle.
            </p>
            <div className="text-[12px] space-y-1">
              <div>📧 support@myrentsaathi.com</div>
              <div>💬 WhatsApp Support</div>
            </div>
          </div>

          {/* Product */}
          <div>
            <div className="text-[13px] font-bold text-white mb-3.5 uppercase tracking-wider">
              Product
            </div>
            {PRODUCT_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block text-[13px] mb-2 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <div className="text-[13px] font-bold text-white mb-3.5 uppercase tracking-wider">
              Company
            </div>
            {COMPANY_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="block text-[13px] mb-2 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Cities — dynamic from DB */}
          <div>
            <div className="text-[13px] font-bold text-white mb-3.5 uppercase tracking-wider">
              Top Cities
            </div>
            {footerCities.map((c) => (
              <Link
                key={c.slug}
                href={`/rent-management-software/${c.slug}`}
                className="block text-[13px] mb-2 hover:text-white transition-colors"
              >
                {c.city_name}
              </Link>
            ))}
            <Link
              href="/rent-management-software/delhi"
              className="block text-[12px] mt-1 text-brand-400 hover:text-brand-300 transition-colors"
            >
              All cities →
            </Link>
          </div>

          {/* Legal */}
          <div>
            <div className="text-[13px] font-bold text-white mb-3.5 uppercase tracking-wider">
              Legal
            </div>
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="block text-[13px] mb-2 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* SEO keyword links */}
        <div className="border-t border-white/[0.06] pt-6 pb-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/40">
            {SEO_KEYWORDS.map((l) => (
              <Link key={l.label} href={l.href} className="hover:text-white/70 transition-colors">
                {l.label}
              </Link>
            ))}
            {/* Dynamic city keyword links */}
            {cities.slice(0, 6).map((c) => (
              <Link
                key={c.slug}
                href={`/rent-management-software/${c.slug}`}
                className="hover:text-white/70 transition-colors"
              >
                Rent Software {c.city_name}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.08] pt-5 flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="text-xs">
            © 2026 MyRentSaathi.com — All Rights Reserved
          </div>
          <div className="text-xs">Made with ❤️ in India</div>
        </div>
      </div>
    </footer>
  );
}
