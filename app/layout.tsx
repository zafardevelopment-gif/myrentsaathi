import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
  title: "MyRentSaathi — India's Smartest Society & Rent Management Platform",
  description:
    "Manage your housing society, collect rent, track maintenance, generate agreements — all in one place. WhatsApp-native. Start free trial.",
  openGraph: {
    title: "MyRentSaathi — Society + Rent + Tenant = Sab Ek Jagah",
    description:
      "Manage your housing society, collect rent, track maintenance, generate agreements — all in one place.",
    type: "website",
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
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
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
