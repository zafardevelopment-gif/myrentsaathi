import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://www.myrentsaathi.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static pages ──────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                       lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/about`,            lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/features`,         lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/pricing`,          lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE_URL}/contact`,          lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
    { url: `${BASE_URL}/privacy`,          lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE_URL}/terms`,            lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE_URL}/for-landlords`,    lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/for-societies`,    lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/for-tenants`,      lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/blog`,             lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
  ];

  // ── Dynamic city pages ────────────────────────────────────
  let cityEntries: MetadataRoute.Sitemap = [];
  try {
    const { data: cities } = await supabase
      .from("cities")
      .select("slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (cities && cities.length > 0) {
      cityEntries = cities.map((c) => ({
        url: `${BASE_URL}/rent-management-software/${c.slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Fallback: include known cities statically
    const KNOWN_SLUGS = [
      "delhi", "mumbai", "bangalore", "hyderabad", "pune", "chennai",
      "kolkata", "ahmedabad", "noida", "gurgaon",
    ];
    cityEntries = KNOWN_SLUGS.map((slug) => ({
      url: `${BASE_URL}/rent-management-software/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  }

  // ── Dynamic blog posts ────────────────────────────────────
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("is_published", true);

    if (posts && posts.length > 0) {
      blogEntries = posts.map((post) => ({
        url: `${BASE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.updated_at),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
    }
  } catch {
    // blog_posts table may not exist yet
  }

  return [...staticPages, ...cityEntries, ...blogEntries];
}
