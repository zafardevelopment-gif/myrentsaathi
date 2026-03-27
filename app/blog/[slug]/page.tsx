import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://www.myrentsaathi.com";

// ── Static post data (mirrors DB seed) ───────────────────────
const STATIC_POSTS: Record<string, {
  slug: string; title: string; excerpt: string; content: string;
  author: string; category: string; tags: string[]; published_at: string;
}> = {
  "how-to-collect-rent-online-india": {
    slug: "how-to-collect-rent-online-india",
    title: "How to Collect Rent Online in India: Complete 2025 Guide",
    excerpt: "Learn how landlords in India can automate rent collection using UPI, WhatsApp, and property management software. Save hours every month.",
    content: `## Introduction

Collecting rent manually in India is a major pain point for landlords. Whether you own 1 flat or 50 properties, chasing tenants, tracking payments, and issuing receipts consumes hours every month.

In this guide, we walk through how to set up **online rent collection in India** using modern tools — including UPI, WhatsApp, and dedicated property management software.

## Why Online Rent Collection Matters

- **Reduced defaults**: Automated reminders reduce late payments by 60-70%
- **Digital records**: Every payment is logged — useful for IT returns and disputes
- **Time savings**: Eliminate manual follow-ups and cash handling

## Step 1: Set Up a UPI Account

Every Indian landlord should have a dedicated UPI ID for rent collection. Use Google Pay, PhonePe, or your bank app.

## Step 2: Use Property Management Software

Platforms like MyRentSaathi automate the entire cycle — bills, reminders, UPI links, receipts.

## Step 3: Track and Report

Download monthly reports for your CA. All payments are tax-ready.`,
    author: "MyRentSaathi Team",
    category: "Rent Collection",
    tags: ["rent collection", "UPI", "landlord", "India"],
    published_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  "society-management-software-india": {
    slug: "society-management-software-india",
    title: "Best Society Management Software in India (2025) — Complete Comparison",
    excerpt: "Compare the top housing society management software available in India.",
    content: `## Introduction

Managing a housing society manually is error-prone and time-consuming. **Society management software** solves this by digitizing every operation.

## What to Look for

### 1. Maintenance Collection
Auto-generate bills, send reminders, collect UPI payments.

### 2. Expense Management
Committee-approved expense logging with financial reports.

### 3. Complaint Management
Residents raise complaints and track resolution.

### 4. WhatsApp Integration
Native WhatsApp support is critical for adoption in India.

## Our Recommendation

MyRentSaathi — WhatsApp-native, automated maintenance, expense management, polls. Plans from ₹2,999/month.`,
    author: "MyRentSaathi Team",
    category: "Society Management",
    tags: ["society management", "housing society", "CHS"],
    published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  "rent-agreement-india-guide": {
    slug: "rent-agreement-india-guide",
    title: "Rent Agreement in India: Everything You Need to Know in 2025",
    excerpt: "A complete guide to rental agreements in India — clauses, registration, and how to generate one online.",
    content: `## What is a Rent Agreement?

A rent agreement is a legally binding contract between a landlord and tenant in India.

## Is Registration Mandatory?

For rentals exceeding 11 months — yes, registration is mandatory under the Registration Act, 1908.

## Key Clauses to Include

1. **Rent amount and due date**
2. **Security deposit** — typically 2-3 months
3. **Maintenance charges**
4. **Notice period** — standard 1-2 months
5. **Lock-in period**
6. **Permitted use**

## Generate Online

MyRentSaathi's AI agreement generator creates legally-vetted templates for 8 Indian cities.`,
    author: "MyRentSaathi Team",
    category: "Legal",
    tags: ["rent agreement", "lease agreement", "legal"],
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
};

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  let post = STATIC_POSTS[slug];

  try {
    const { data } = await supabase
      .from("blog_posts")
      .select("title, excerpt, author, published_at")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();
    if (data) post = { ...post, ...data };
  } catch { /* use static */ }

  if (!post) return { title: "Blog Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.author }],
    alternates: { canonical: `${BASE_URL}/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${BASE_URL}/blog/${slug}`,
      type: "article",
      publishedTime: post.published_at,
      authors: [post.author],
    },
  };
}

function renderMarkdown(content: string) {
  // Simple markdown→HTML for server rendering (no external dep needed for basic headings/lists)
  return content
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("## ")) return `<h2 class="font-serif text-[24px] font-bold text-ink mt-10 mb-4">${block.slice(3)}</h2>`;
      if (block.startsWith("### ")) return `<h3 class="font-bold text-ink text-[18px] mt-6 mb-3">${block.slice(4)}</h3>`;
      if (block.startsWith("- ")) {
        const items = block.split("\n").map((l) => `<li>${l.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>`).join("");
        return `<ul class="list-disc pl-6 space-y-2 text-[15px] text-ink/70">${items}</ul>`;
      }
      if (/^\d+\. /.test(block)) {
        const items = block.split("\n").map((l) => `<li>${l.replace(/^\d+\. /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>`).join("");
        return `<ol class="list-decimal pl-6 space-y-2 text-[15px] text-ink/70">${items}</ol>`;
      }
      const para = block.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return `<p class="text-[16px] text-ink/75 leading-relaxed">${para}</p>`;
    })
    .join("\n");
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  let post = STATIC_POSTS[slug] ?? null;

  try {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();
    if (data) post = data;
  } catch { /* use static */ }

  if (!post) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "MyRentSaathi", url: BASE_URL },
    datePublished: post.published_at,
    url: `${BASE_URL}/blog/${slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/blog/${slug}` },
    keywords: post.tags?.join(", "),
  };

  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }}
      />
      <HomePageClient />

      <main className="pt-24 pb-20 max-w-[760px] mx-auto px-6">
        {/* Breadcrumb */}
        <nav className="text-[12px] text-ink-muted mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-brand-500">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-brand-500">Blog</Link>
          <span>/</span>
          <span className="text-ink">{post.category}</span>
        </nav>

        {/* Category */}
        <span className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-600 text-[11px] font-bold mb-4">
          {post.category}
        </span>

        {/* Title */}
        <h1 className="font-serif text-[36px] font-extrabold text-ink leading-tight mb-4">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-[12px] text-ink-muted mb-8 pb-6 border-b border-border-default">
          <span>By {post.author}</span>
          {post.published_at && (
            <span>
              {new Date(post.published_at).toLocaleDateString("en-IN", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-1.5">
              {post.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-warm-100 rounded-lg text-[10px]">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <article
          className="prose-custom space-y-4"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        {/* CTA */}
        <div className="mt-14 p-6 bg-gradient-to-br from-brand-900 to-brand-800 rounded-[20px] text-white text-center">
          <div className="text-[22px] font-extrabold font-serif mb-2">
            Ready to try MyRentSaathi?
          </div>
          <p className="text-[14px] text-white/70 mb-5">
            14-day free trial. No credit card. Cancel anytime.
          </p>
          <button className="px-7 py-3 rounded-xl bg-brand-500 text-white font-bold text-[14px] hover:bg-brand-600 cursor-pointer">
            Start Free Trial
          </button>
        </div>

        {/* Back to blog */}
        <div className="mt-8 text-center">
          <Link href="/blog" className="text-[13px] text-brand-500 font-bold hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
