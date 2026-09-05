import type { Metadata, Viewport } from "next";
import {
  SITE, SITE_URL, ORG, PRICING, KEYWORDS,
  GSC_VERIFICATION, BING_VERIFICATION, absoluteUrl,
} from "@/lib/seo/config";
import { Outfit, Playfair_Display } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/providers/Providers";
import ChatWidget from "@/components/website/ChatWidget";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [...KEYWORDS],
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE_URL }],
  creator: ORG.legalName,
  publisher: ORG.legalName,
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: SITE.ogLocale,
    url: SITE_URL,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.socialTagline}`,
    description:
      "India's WhatsApp-native platform for housing society management, rent collection, tenant management & agreements. Start a free 14-day trial.",
    images: [
      {
        url: absoluteUrl(SITE.ogImage),
        width: 1200,
        height: 630,
        alt: `${SITE.name} — Rent & Society Management Platform India`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description:
      "Manage housing societies, collect rent, track tenants — all via WhatsApp. Start free trial.",
    images: [absoluteUrl(SITE.ogImage)],
    creator: SITE.twitterHandle,
  },
  alternates: {
    canonical: SITE_URL,
  },
  // GSC verification is env-driven (NEXT_PUBLIC_GSC_VERIFICATION). When unset,
  // the meta tag is simply omitted.
  verification: {
    ...(GSC_VERIFICATION ? { google: GSC_VERIFICATION } : {}),
    // Bing / Microsoft (msvalidate.01)
    other: { "msvalidate.01": BING_VERIFICATION },
  },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  colorScheme: "light",
};

// ── Organization JSON-LD ──────────────────────────────────────
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE.name,
  legalName: ORG.legalName,
  url: SITE_URL,
  logo: absoluteUrl(SITE.logo),
  description: SITE.description,
  foundingDate: ORG.foundingDate,
  areaServed: ORG.areaServed,
  address: {
    "@type": "PostalAddress",
    addressLocality: ORG.addressLocality,
    addressRegion: ORG.addressRegion,
    addressCountry: ORG.addressCountry,
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: ORG.email,
    contactType: "customer support",
    availableLanguage: [...ORG.languages],
  },
  sameAs: [...ORG.sameAs],
};

// ── WebSite JSON-LD (with SearchAction) ───────────────────────
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE.name,
  url: SITE_URL,
  description: SITE.description,
  inLanguage: SITE.locale,
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// ── LocalBusiness JSON-LD ─────────────────────────────────────
const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE.name,
  url: SITE_URL,
  logo: absoluteUrl(SITE.logo),
  description:
    "India's WhatsApp-native rent & society management platform — UPI rent collection, AI-generated agreements, maintenance & visitor management.",
  priceRange: "₹₹",
  address: {
    "@type": "PostalAddress",
    addressLocality: ORG.addressLocality,
    addressRegion: ORG.addressRegion,
    addressCountry: ORG.addressCountry,
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: ORG.email,
    contactType: "customer support",
    availableLanguage: [...ORG.languages],
  },
};

// ── SaaS Product JSON-LD ──────────────────────────────────────
// NOTE: no aggregateRating here. Review/rating markup is only added back once
// there are real, verifiable reviews visible on the page — inventing one is a
// Google structured-data manual-action risk.
const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  url: SITE_URL,
  description:
    "Comprehensive rent management and housing society management SaaS for India: rent collection, maintenance tracking, tenant management, agreement generation and WhatsApp integration.",
  offers: {
    "@type": "Offer",
    priceCurrency: PRICING.currency,
    price: PRICING.unitPrice,
    description: `Pricing is ${PRICING.unitPrice} INR ${PRICING.unit}; see ${SITE_URL}/pricing for current plans.`,
    url: `${SITE_URL}/pricing`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={SITE.locale}
      className={`${outfit.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {/* Google Ads tag (gtag.js) — conversion tracking */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-18230510971"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-18230510971');`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          {children}
          <ChatWidget />
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  );
}
