import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";
import { getActiveCities } from "@/lib/cities-data";
import { supabase } from "@/lib/supabase";

/**
 * XML sitemap.
 * - Static marketing/landing routes are enumerated with per-type priority.
 * - City pages are enumerated from the SAME data source the pages use
 *   (lib/cities-data → Supabase with static fallback), so they can never
 *   drift from what actually renders.
 * - Blog posts are pulled live from Supabase.
 * Authenticated / app / API routes are intentionally excluded (see robots).
 */

type Entry = MetadataRoute.Sitemap[number];
const u = (path: string, rest: Omit<Entry, "url">): Entry => ({
  url: `${SITE_URL}${path}`,
  ...rest,
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static marketing + landing pages ──────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    u("",                              { lastModified: now, changeFrequency: "weekly",  priority: 1.0 }),
    u("/features",                     { lastModified: now, changeFrequency: "monthly", priority: 0.8 }),
    u("/pricing",                      { lastModified: now, changeFrequency: "weekly",  priority: 0.9 }),
    u("/about",                        { lastModified: now, changeFrequency: "monthly", priority: 0.6 }),
    u("/contact",                      { lastModified: now, changeFrequency: "yearly",  priority: 0.5 }),
    u("/blog",                         { lastModified: now, changeFrequency: "weekly",  priority: 0.7 }),
    // Persona landing pages
    u("/for-landlords",                { lastModified: now, changeFrequency: "monthly", priority: 0.9 }),
    u("/for-societies",                { lastModified: now, changeFrequency: "monthly", priority: 0.9 }),
    u("/for-tenants",                  { lastModified: now, changeFrequency: "monthly", priority: 0.8 }),
    u("/for-rwa-committees",           { lastModified: now, changeFrequency: "monthly", priority: 0.75 }),
    // High-intent feature / use-case landing pages
    u("/whatsapp-rent-collection",     { lastModified: now, changeFrequency: "monthly", priority: 0.85 }),
    u("/rental-agreement-generator",   { lastModified: now, changeFrequency: "monthly", priority: 0.9 }),
    u("/visitor-management",           { lastModified: now, changeFrequency: "monthly", priority: 0.8 }),
    u("/nri-property-management",      { lastModified: now, changeFrequency: "monthly", priority: 0.85 }),
    u("/vs-mygate",                    { lastModified: now, changeFrequency: "monthly", priority: 0.8 }),
  ];

  // ── City pages (same source as the rendered pages) ────────────────────────
  let cityEntries: MetadataRoute.Sitemap = [];
  try {
    const cities = await getActiveCities();
    cityEntries = cities.map((c) =>
      u(`/rent-management-software/${c.slug}`, {
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
      }),
    );
  } catch {
    /* getActiveCities already falls back internally; ignore. */
  }

  // ── Blog posts (live from Supabase) ───────────────────────────────────────
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("is_published", true);
    if (posts?.length) {
      blogEntries = posts.map((post) =>
        u(`/blog/${post.slug}`, {
          lastModified: post.updated_at ? new Date(post.updated_at) : now,
          changeFrequency: "monthly",
          priority: 0.6,
        }),
      );
    }
  } catch {
    /* blog_posts table may not exist yet */
  }

  return [...staticPages, ...cityEntries, ...blogEntries];
}
