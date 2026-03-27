import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CityLandingPage from "@/components/website/CityLandingPage";
import { getCityBySlug, getActiveCities, getAllCitySlugs, type City } from "@/lib/cities-data";

const BASE_URL = "https://www.myrentsaathi.com";

// ── Static params for build-time pre-rendering ────────────────
export async function generateStaticParams() {
  const slugs = await getAllCitySlugs();
  return slugs.map((city) => ({ city }));
}

// ── Dynamic metadata per city ─────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) return { title: "City Not Found" };

  return {
    title: `Rent Management Software in ${city.city_name} | MyRentSaathi`,
    description: `Manage rental properties in ${city.city_name}, ${city.state} with MyRentSaathi. Automate rent collection via UPI, manage tenants, run housing societies. Plans from ₹499/mo.`,
    keywords: [
      `rent management software ${city.city_name}`,
      `landlord software ${city.city_name}`,
      `society management ${city.city_name}`,
      `rent collection app ${city.city_name}`,
      `tenant management ${city.city_name}`,
      `housing society software ${city.state}`,
      `property management ${city.city_name}`,
    ],
    alternates: {
      canonical: `${BASE_URL}/rent-management-software/${slug}`,
    },
    openGraph: {
      title: `Rent Management Software in ${city.city_name} | MyRentSaathi`,
      description: `Automate rent & maintenance for ${city.city_name} properties & societies. Plans from ₹499/mo.`,
      url: `${BASE_URL}/rent-management-software/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Rent Management Software ${city.city_name} — MyRentSaathi`,
      description: `Automate rent collection for ${city.city_name} properties. WhatsApp-native. Plans from ₹499/mo.`,
    },
  };
}

// ── City-specific neighborhood data ──────────────────────────
const CITY_NEIGHBORHOODS: Record<string, string[]> = {
  delhi:         ["Dwarka", "Rohini", "Pitampura", "Greater Kailash", "Lajpat Nagar", "Vasant Kunj", "Saket", "Janakpuri"],
  mumbai:        ["Andheri", "Bandra", "Powai", "Borivali", "Malad", "Goregaon", "Mulund", "Chembur"],
  bangalore:     ["Whitefield", "Koramangala", "HSR Layout", "Indiranagar", "Electronic City", "JP Nagar", "BTM Layout"],
  hyderabad:     ["Madhapur", "Gachibowli", "Banjara Hills", "Jubilee Hills", "Kondapur", "Kukatpally", "Begumpet"],
  pune:          ["Hinjewadi", "Baner", "Kothrud", "Wakad", "Aundh", "Viman Nagar", "Koregaon Park", "Hadapsar"],
  chennai:       ["Anna Nagar", "Adyar", "Velachery", "Porur", "Sholinganallur", "OMR", "Perambur", "Tambaram"],
  kolkata:       ["Salt Lake", "New Town", "Ballygunge", "Park Street", "Rajarhat", "Behala", "Dum Dum"],
  ahmedabad:     ["Prahlad Nagar", "Satellite", "Bopal", "Thaltej", "Navrangpura", "Vastrapur", "Maninagar"],
  noida:         ["Sector 62", "Sector 50", "Sector 137", "Greater Noida West", "Sector 18", "Sector 76"],
  gurgaon:       ["Sector 56", "DLF Phase 1-5", "Sohna Road", "Golf Course Road", "MG Road", "Palam Vihar"],
  "navi-mumbai": ["Vashi", "Kharghar", "Belapur", "Nerul", "Panvel", "Ulwe", "Airoli"],
  thane:         ["Ghodbunder Road", "Majiwada", "Kolshet", "Manpada", "Dombivli", "Kalyan"],
  chandigarh:    ["Sector 17", "Sector 35", "Mohali", "Panchkula", "IT Park", "Manimajra"],
  jaipur:        ["Malviya Nagar", "Vaishali Nagar", "C-Scheme", "Jagatpura", "Mansarovar", "Tonk Road"],
  lucknow:       ["Gomti Nagar", "Hazratganj", "Aliganj", "Indira Nagar", "Vibhuti Khand", "Alambagh"],
  indore:        ["Vijay Nagar", "Palasia", "Bhawarkuan", "Navlakha", "Scheme 140", "AB Road"],
  bhopal:        ["MP Nagar", "Arera Colony", "Kolar Road", "TT Nagar", "Shymla Hills", "Lalghati"],
  kochi:         ["Kakkanad", "Edapally", "Marine Drive", "Vyttila", "Maradu", "Tripunithura"],
  coimbatore:    ["RS Puram", "Gandhipuram", "Peelamedu", "Saibaba Colony", "Singanallur", "Vadavalli"],
  surat:         ["Adajan", "Vesu", "Pal", "Althan", "Katargam", "Citylight", "Rander"],
  nagpur:        ["Dharampeth", "Wardha Road", "Sitabuldi", "Civil Lines", "Manish Nagar", "Trimurti Nagar"],
  visakhapatnam: ["MVP Colony", "Gajuwaka", "Rushikonda", "Srinagar", "Dwaraka Nagar"],
  bhubaneswar:   ["Saheed Nagar", "Patia", "Nayapalli", "Chandrasekharpur", "Khandagiri"],
  ghaziabad:     ["Indirapuram", "Vaishali", "Raj Nagar", "Kaushambi", "Crossings Republik"],
  faridabad:     ["Sector 14", "Sector 21C", "NIT Faridabad", "Old Faridabad", "Neharpar"],
};

// ── City-specific FAQs ────────────────────────────────────────
function getCityFaqs(city: City): { q: string; a: string }[] {
  return [
    {
      q: `How can I collect rent online from tenants in ${city.city_name}?`,
      a: `MyRentSaathi sends UPI payment links via WhatsApp to your ${city.city_name} tenants every month. Once paid, receipts are automatically issued and stored. Supports GPay, PhonePe, and all UPI apps.`,
    },
    {
      q: `Is MyRentSaathi available for housing societies in ${city.city_name}?`,
      a: `Yes. We support housing societies and apartment associations in ${city.city_name}, ${city.state}. Features include maintenance billing, expense management, polls, complaint tickets, and WhatsApp notices.`,
    },
    {
      q: `Does MyRentSaathi generate rent agreements for ${city.city_name}?`,
      a: `Yes. Our AI agreement generator creates ${city.state}-compliant rent agreements with city-specific clauses, stamp duty guidance, and registration guidance for ${city.city_name} properties.`,
    },
    {
      q: `What is the pricing for ${city.city_name} landlords?`,
      a: `Landlord plans start at ₹499/month (up to 3 properties) and ₹999/month (up to 10 properties). Society plans from ₹2,999/month. All plans include a 14-day free trial — no credit card needed.`,
    },
    {
      q: `Can NRI landlords manage ${city.city_name} properties remotely?`,
      a: `Yes. The NRI plan (₹1,999/month) is built for remote management — WhatsApp-only operation, NRI tax reports, Power of Attorney support, and a multi-city dashboard for all your ${city.city_name} properties.`,
    },
  ];
}

// ── Page Component ────────────────────────────────────────────
export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;

  // Fetch city from DB (or fallback)
  const city = await getCityBySlug(slug);
  if (!city) notFound();

  // Fetch sibling cities for internal linking (parallel with city fetch above)
  const allCities = await getActiveCities();
  const otherCities = allCities
    .filter((c) => c.slug !== slug)
    .slice(0, 12)
    .map((c) => ({ city_name: c.city_name, slug: c.slug }));

  const neighborhoods = CITY_NEIGHBORHOODS[slug] ?? [];
  const faqs = getCityFaqs(city);

  return (
    <CityLandingPage
      city={city.city_name}
      state={city.state}
      slug={slug}
      neighborhoods={neighborhoods}
      faqs={faqs}
      otherCities={otherCities}
    />
  );
}
