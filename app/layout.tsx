import type { Metadata } from "next";
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

const BASE_URL = "https://www.myrentsaathi.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "MyRentSaathi — India's Smartest Society & Rent Management Platform",
    template: "%s | MyRentSaathi",
  },
  description:
    "Manage your housing society, collect rent, track maintenance, generate agreements — all in one place. WhatsApp-native. Trusted by landlords & societies across India.",
  keywords: [
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
  ],
  authors: [{ name: "MyRentSaathi", url: BASE_URL }],
  creator: "MyRentSaathi",
  publisher: "MyRentSaathi",
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
    locale: "en_IN",
    url: BASE_URL,
    siteName: "MyRentSaathi",
    title: "MyRentSaathi — Society + Rent + Tenant = Sab Ek Jagah",
    description:
      "India's #1 platform for housing society management, rent collection, tenant management & agreements. WhatsApp-native. Start free 14-day trial.",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "MyRentSaathi — Rent & Society Management Platform India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyRentSaathi — India's Smartest Rent & Society Management Platform",
    description:
      "Manage housing societies, collect rent, track tenants — all via WhatsApp. Start free trial.",
    images: [`${BASE_URL}/og-image.png`],
    creator: "@myrentsaathi",
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    // Add your Google Search Console verification token here
    // google: "YOUR_GSC_VERIFICATION_TOKEN",
  },
  category: "technology",
};

// ── Organization JSON-LD ──────────────────────────────────────
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MyRentSaathi",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    "India's smartest society & rent management platform. Manage housing societies, collect rent, track maintenance, generate agreements — all in one place.",
  foundingDate: "2024",
  areaServed: "IN",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    availableLanguage: ["English", "Hindi"],
  },
  sameAs: [
    "https://twitter.com/myrentsaathi",
    "https://www.linkedin.com/company/myrentsaathi",
  ],
};

// ── SaaS Product JSON-LD ─────────────────────────────────────
const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MyRentSaathi",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  url: BASE_URL,
  description:
    "Comprehensive rent management and housing society management SaaS platform for India. Features include rent collection, maintenance tracking, tenant management, agreement generation, and WhatsApp integration.",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    lowPrice: "499",
    highPrice: "9999",
    offerCount: "6",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "500",
    bestRating: "5",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
            __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
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
