import type { Metadata } from "next";
import Link from "next/link";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Blog — Rent Management, Society Tips & Property Guides for India",
  description:
    "Expert guides on rent management, housing society management, tenant rights, and property law in India. Updated monthly by the MyRentSaathi team.",
  alternates: { canonical: "https://www.myrentsaathi.com/blog" },
  openGraph: {
    title: "MyRentSaathi Blog — Property & Society Management Guides India",
    description: "Expert guides on rent management, society management, and property law in India.",
    url: "https://www.myrentsaathi.com/blog",
  },
};

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  published_at: string | null;
  author: string;
};

// Static fallback for when DB has no posts yet
const STATIC_POSTS: BlogPost[] = [
  {
    id: "1", slug: "how-to-collect-rent-online-india",
    title: "How to Collect Rent Online in India: Complete 2025 Guide",
    excerpt: "Learn how landlords in India can automate rent collection using UPI, WhatsApp, and property management software.",
    category: "Rent Collection", tags: ["rent collection", "UPI", "landlord"],
    published_at: new Date(Date.now() - 10 * 86400000).toISOString(), author: "MyRentSaathi Team",
  },
  {
    id: "2", slug: "society-management-software-india",
    title: "Best Society Management Software in India (2025) — Complete Comparison",
    excerpt: "Compare the top housing society management software available in India.",
    category: "Society Management", tags: ["society management", "CHS"],
    published_at: new Date(Date.now() - 5 * 86400000).toISOString(), author: "MyRentSaathi Team",
  },
  {
    id: "3", slug: "rent-agreement-india-guide",
    title: "Rent Agreement in India: Everything You Need to Know in 2025",
    excerpt: "A complete guide to rental agreements in India — clauses, registration, and how to generate one online.",
    category: "Legal", tags: ["rent agreement", "legal"],
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(), author: "MyRentSaathi Team",
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogIndexPage() {
  let posts: BlogPost[] = STATIC_POSTS;

  try {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, category, tags, published_at, author")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (data && data.length > 0) posts = data as BlogPost[];
  } catch {
    // Use static fallback
  }

  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <HomePageClient />

      {/* Header */}
      <section className="pt-28 pb-12 px-6 text-center bg-warm-50 border-b border-border-default">
        <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-4">
          BLOG
        </span>
        <h1 className="font-serif text-[40px] font-extrabold text-ink leading-tight">
          Property & Society Management Guides
        </h1>
        <p className="text-[16px] text-ink/60 mt-3 max-w-[540px] mx-auto">
          Expert articles on rent management, society management, tenant rights, and property law in India.
        </p>
      </section>

      {/* Posts Grid */}
      <section className="py-16 px-6 max-w-[1000px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="bg-white rounded-[16px] border border-border-default p-6 hover:shadow-lg hover:border-brand-300 transition-all group"
            >
              <div className="mb-3">
                <span className="px-3 py-1 rounded-full bg-brand-100 text-brand-600 text-[11px] font-bold">
                  {post.category}
                </span>
              </div>
              <h2 className="font-bold text-ink text-[15px] leading-snug mb-3 group-hover:text-brand-600 transition-colors">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="text-[13px] text-ink/60 leading-relaxed mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
              )}
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[11px] text-ink-muted">{post.author}</span>
                {post.published_at && (
                  <span className="text-[11px] text-ink-muted">{formatDate(post.published_at)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
