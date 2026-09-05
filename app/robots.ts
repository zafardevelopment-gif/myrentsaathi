import type { MetadataRoute } from "next";
import { SITE_URL, DISALLOWED_PATHS, AI_CRAWLERS } from "@/lib/seo/config";

/**
 * robots.txt
 * - Allows general crawling, blocks API + all authenticated app surfaces.
 * - EXPLICITLY allows the major AI crawlers by name (see lib/seo/config
 *   AI_CRAWLERS) so MyRentSaathi stays visible to ChatGPT / Perplexity /
 *   Claude / Gemini / Copilot. Remove those entries only if there is a
 *   business reason NOT to be in AI retrieval/training.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [...DISALLOWED_PATHS];

  return {
    rules: [
      // Default policy for every crawler.
      { userAgent: "*", allow: "/", disallow },
      // Named AI crawlers — same allow/disallow, but named so they are never
      // caught by a future blanket block and so intent is explicit.
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
