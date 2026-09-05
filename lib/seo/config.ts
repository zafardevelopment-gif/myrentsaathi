/**
 * ── SEO / Discoverability: SINGLE SOURCE OF TRUTH ──────────────────────────
 *
 * Every SEO-facing string (site name, canonical URL, description, legal entity,
 * keywords, theme colour, social handles) lives here. Layout, sitemap, robots,
 * manifest, llms.txt and every page's metadata read from this module.
 *
 * Change the company address, base URL or default description in ONE place
 * and it propagates everywhere.
 *
 * The canonical URL is read from an env var (NEXT_PUBLIC_SITE_URL) with a
 * sensible production fallback, so preview/staging deployments can override it.
 */

// ── Canonical origin (no trailing slash) ───────────────────────────────────
const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://www.myrentsaathi.com";

/** Canonical site origin, guaranteed to have NO trailing slash. */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

/** Build an absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// ── Identity ────────────────────────────────────────────────────────────────
export const SITE = {
  /** Product / brand name. */
  name: "MyRentSaathi",
  /** Short legal-safe tagline (used in titles, OG). */
  tagline: "India's Smartest Society & Rent Management Platform",
  /** Hinglish brand line used on social cards. */
  socialTagline: "Society + Rent + Tenant = Sab Ek Jagah",
  /** 150–160 char default description. */
  description:
    "MyRentSaathi is India's WhatsApp-native platform to manage housing societies, collect rent via UPI, track maintenance and generate rent agreements — all in one place.",
  /** BCP-47 locale + OG locale. */
  locale: "en-IN",
  ogLocale: "en_IN",
  /** Theme / brand colour (matches lib/constants COLORS.brand[500]). */
  themeColor: "#c2660a",
  backgroundColor: "#fffcf7",
  /** Default social share image (relative to SITE_URL). */
  ogImage: "/og-image.png",
  logo: "/logo.png",
  twitterHandle: "@myrentsaathi",
} as const;

// ── Legal entity + contact ──────────────────────────────────────────────────
export const ORG = {
  legalName: "AIVEXA LLP",
  brandName: "MyRentSaathi",
  foundingDate: "2024",
  email: "support@myrentsaathi.com",
  addressLocality: "Darbhanga",
  addressRegion: "Bihar",
  addressCountry: "IN",
  areaServed: "IN",
  languages: ["English", "Hindi"],
  sameAs: [
    "https://twitter.com/myrentsaathi",
    "https://www.linkedin.com/company/myrentsaathi",
  ],
} as const;

// ── Pricing envelope (used in Offer / AggregateOffer schema) ─────────────────
export const PRICING = {
  currency: "INR",
  // Per-unit model: ₹10 per landlord per month. Kept minimal on purpose —
  // marketing copy should link to /pricing rather than hardcode figures.
  unitPrice: "10",
  unit: "per landlord per month",
} as const;

// ── Global keyword pool (page-level keywords extend, not replace, these) ─────
export const KEYWORDS = [
  "rent management software India",
  "society management system India",
  "tenant management app India",
  "rent collection app India",
  "housing society software",
  "online rent collection",
  "property management India",
  "maintenance collection app",
  "landlord software India",
  "NRI property management",
  "WhatsApp rent collection",
  "rental agreement generator India",
] as const;

// ── Google Search Console verification (env-driven) ──────────────────────────
export const GSC_VERIFICATION = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

// ── Bing Webmaster Tools verification (msvalidate.01) ────────────────────────
// Env-overridable, with the current token as fallback so it survives even if
// the env var isn't set on Vercel.
export const BING_VERIFICATION =
  process.env.NEXT_PUBLIC_BING_VERIFICATION ?? "A7434D03CDC8226495DE20286525CB64";

// ── Crawler policy ───────────────────────────────────────────────────────────
/** Paths that must never be indexed (authenticated / API / app surfaces). */
export const DISALLOWED_PATHS = [
  "/api/",
  "/superadmin/",
  "/admin/",
  "/landlord/",
  "/tenant/",
  "/board/",
  "/guard/",
  "/checkout/",
  "/select-plan/",
  "/plan-expired/",
  "/login/",
  "/signup/",
] as const;

/**
 * AI / LLM crawlers we EXPLICITLY allow by name.
 * Many hosts block these by default and lose all AI-assistant visibility.
 * MyRentSaathi is a public commercial product that WANTS to be cited by
 * ChatGPT / Perplexity / Claude / Gemini / Copilot, so we opt in.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "CCBot",
  "Bingbot",
  "Applebot-Extended",
] as const;

// ── Key public pages (source for /llms.txt and internal-link helpers) ────────
// Kept here so /llms.txt links can never drift from real routes.
export const KEY_PAGES: { path: string; title: string; blurb: string }[] = [
  { path: "/", title: "Home", blurb: "Product overview: society + rent + tenant management in one WhatsApp-native platform." },
  { path: "/features", title: "Features", blurb: "Full feature list across rent, maintenance, tenants, agreements and reports." },
  { path: "/pricing", title: "Pricing", blurb: "Plans for landlords and societies, in INR, billed monthly or yearly." },
  { path: "/for-landlords", title: "For Landlords", blurb: "Rent collection, tenant management and agreements for individual landlords and NRIs." },
  { path: "/for-societies", title: "For Housing Societies", blurb: "Maintenance collection, accounting, notices, polls and visitor management for societies." },
  { path: "/for-tenants", title: "For Tenants", blurb: "How tenants pay rent, raise complaints and access documents over WhatsApp." },
  { path: "/for-rwa-committees", title: "For RWA Committees", blurb: "Governance, transparency and financial reporting for RWA / managing committees." },
  { path: "/whatsapp-rent-collection", title: "WhatsApp Rent Collection", blurb: "Collect rent via UPI links sent on WhatsApp, with automatic reminders and receipts." },
  { path: "/rental-agreement-generator", title: "Rental Agreement Generator", blurb: "Generate India-specific rent agreements from lawyer-reviewed templates." },
  { path: "/visitor-management", title: "Visitor Management", blurb: "Gate/guard visitor entry, pre-approvals and logs for gated societies." },
  { path: "/nri-property-management", title: "NRI Property Management", blurb: "Manage Indian property remotely: WhatsApp-only operation, NRI tax reports, PoA support." },
  { path: "/vs-mygate", title: "MyRentSaathi vs MyGate", blurb: "Honest comparison for societies choosing between MyRentSaathi and MyGate." },
  { path: "/blog", title: "Blog", blurb: "Guides on rent, agreements, society accounting and Indian tenancy rules." },
];
