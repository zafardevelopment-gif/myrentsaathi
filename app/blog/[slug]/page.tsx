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

  "apni-property-ko-rent-par-kaise-de": {
    slug: "apni-property-ko-rent-par-kaise-de",
    title: "Apni Property Ko Rent Par Kaise De — Complete Guide 2025",
    excerpt: "Ghar ya flat rent par dene ka poora process — tenant dhundhna, rent agreement banana, advance lena, aur payment track karna. Landlords ke liye step-by-step Hindi guide.",
    content: `## Introduction

Agar aap pehli baar apna ghar ya flat rent par de rahe hain — ya phir purane process se pareshan hain — toh yeh guide aapke liye hai.

Yahan hum cover karenge: **tenant kaise dhundhe, agreement kaise banaye, advance aur deposit kaise le, aur rent collection kaise automate kare.**

---

## Step 1: Property Rent-Ready Karein

Tenant dekhne se pehle kuch cheezein fix kar lein:

- **Minor repairs** — leaking taps, broken switches, damp walls
- **Painting** — fresh coat = higher rent, faster tenant
- **Cleaning** — professionally cleaned flat 20-30% jaldi milti hai
- **Photos lein** — good photos se online listing par zyada inquiries aati hain

---

## Step 2: Sahi Rent Amount Decide Karein

Apne area mein similar flats ki rates check karein — MagicBricks, 99acres, NoBroker par search karein.

**Rent set karne ka formula:**
- Market rate check karein (comparable size + locality)
- Maintenance charges alag lein ya rent mein include karein — clearly decide karein
- Annual 5-10% increment clause agreement mein daalein

---

## Step 3: Tenant Kahan Se Dhundhe

**Online platforms:**
- NoBroker (broker-free, sabse popular)
- MagicBricks / 99acres
- Housing.com
- Facebook Groups (locality-specific groups)

**Offline:**
- Society noticeboard
- Neighbours / word of mouth — sabse trusted source
- Local broker (typically 1 month rent commission)

**Tenant verify zaroor karein:**
- Aadhaar card + PAN card copy lein
- Previous landlord ka reference lein (agar possible ho)
- Employment proof (salary slip ya business proof)

---

## Step 4: Rent Agreement Banana — Zaroori Hai

Bina agreement ke koi bhi tenant mat do. Agreement mein yeh cheezein honi chahiye:

1. **Rent amount aur due date** (jaise: har mahine ki 5 tarikh)
2. **Security deposit** (typically 2-3 months rent)
3. **Agreement duration** — usually 11 months (12 months se kam = registration compulsory nahi)
4. **Maintenance charges** — kaun bharta hai?
5. **Notice period** — 1-2 months standard hai
6. **Lock-in period** — minimum stay duration
7. **Permitted use** — residential only
8. **Subletting ban** — tenant kisi aur ko nahi de sakta

**Agreement kaise banayein:**
- MyRentSaathi par AI-generated agreement 2 minute mein ready hota hai
- 8 Indian cities ke liye legal templates available hain
- Lawyer review ₹499 mein, registration support ₹999 mein

---

## Step 5: Security Deposit Aur Advance

Standard practice in India:
- **Security deposit**: 2-3 months rent (refundable)
- **Advance rent**: 1-2 months (sometimes adjusted in last months)

**Important:** Receipt zaroor do — cash bhi lein toh bhi. Disputes mein proof kaam aata hai.

---

## Step 6: Rent Collection Automate Karein

Sabse badi pareshani hai rent time par lena. Iska solution hai automation:

**WhatsApp + UPI se rent collection:**
1. Har mahine automatic reminder jayega tenant ko WhatsApp par
2. UPI payment link attached hoga — tenant seedha pay kare
3. Receipt automatic generate ho jaaye
4. Aapko Excel ya registers maintain nahi karne padte

MyRentSaathi exactly yahi karta hai — **90% rent 3 din mein collect ho jaata hai** without any manual follow-up.

---

## Step 7: Common Mistakes Jo Avoid Karein

❌ **Bina agreement ke tenant dena** — kabhi mat karein
❌ **Cash mein lena without receipt** — tax aur dispute issues
❌ **Deposit cheque lena without clearing** — bounced cheques baar baar hote hain
❌ **Verbal promises** — sab kuch written mein rakhein
❌ **Maintenance responsibility clear na karna** — future fights ki wajah

---

## Conclusion

Apni property rent par dena mushkil nahi hai — bas sahi process follow karo:

1. ✅ Property ready karo
2. ✅ Sahi rent decide karo
3. ✅ Verified tenant lo
4. ✅ Agreement banao
5. ✅ Deposit properly lo
6. ✅ Rent collection automate karo

**MyRentSaathi se shuru karein — 30 din free trial, koi credit card nahi chahiye.**`,
    author: "MyRentSaathi Team",
    category: "Landlord Guide",
    tags: ["property rent par dena", "landlord guide", "rent agreement", "tenant dhundhna"],
    published_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },

  "society-maintenance-collection-online-india": {
    slug: "society-maintenance-collection-online-india",
    title: "Society Maintenance Collection Online: Complete Guide for RWA Committees (2025)",
    excerpt: "How housing society committees in India can collect maintenance online using UPI, WhatsApp, and society management software. Cut collection time from 15 days to 3 days.",
    content: `## Introduction

If you're a society secretary or RWA committee member, you know the pain: maintenance collection takes 15+ days every month, residents ignore reminders, and tracking defaulters in Excel is a nightmare.

In this guide, we'll show you how to **collect society maintenance online in India** — and cut your collection time from 15 days to under 3 days.

---

## Why Online Maintenance Collection Is Better

Traditional methods (cash, cheque, manual follow-up) have major problems:

- **Cash handling risks** — no audit trail, theft possibility
- **Cheque bouncing** — 10-15% of cheques bounce on average
- **Manual tracking** — someone has to update Excel every day
- **No accountability** — residents deny paying, no proof

Online collection solves all of this:

✅ Every payment is recorded automatically
✅ Receipts generated instantly
✅ Defaulter list always up to date
✅ CA-ready financial reports at month end

---

## Step 1: Set Up Online Collection

You need three things:
1. **A society bank account** with UPI enabled (most banks support this)
2. **Society management software** (like MyRentSaathi)
3. **WhatsApp numbers of all residents** (you already have these in your group)

---

## Step 2: Auto-Generate Monthly Maintenance Bills

Good society software automatically:
- Generates bills on the 1st of every month
- Calculates per-flat amounts based on your rules (equal, per sq ft, etc.)
- Includes any arrears from previous months
- Sends bills to residents via WhatsApp

No more manual bill preparation every month.

---

## Step 3: WhatsApp Reminders + UPI Payment Links

The most effective collection method for Indian housing societies:

1. Resident gets WhatsApp message: "Maintenance due: ₹3,500 for June 2025"
2. Message includes a **UPI payment link** — one tap to pay
3. Payment goes directly to society bank account
4. Receipt auto-generated and sent back on WhatsApp

**Result**: Most residents pay within 24-48 hours of the reminder.

---

## Step 4: Track Defaulters Automatically

With online collection, your dashboard shows in real-time:
- Who has paid this month
- Who is overdue (and by how many days)
- Total collected vs total expected
- Month-on-month collection trends

No more calling residents one by one. The system escalates automatically.

---

## Step 5: Expense Management & Financial Reporting

Online collection is only half the picture. Society finances also need:

- **Expense tracking** — every bill uploaded with photo and category
- **Committee approval** — expenses above ₹X require board approval
- **Monthly P&L** — income vs expenses, clearly shown
- **Annual audit report** — CA-ready PDF in one click

This level of transparency builds resident trust and reduces AGM disputes.

---

## How Long Does Setup Take?

With modern society management software, setup takes less than a day:

| Task | Time |
|------|------|
| Register society | 10 min |
| Add flat list | 20 min |
| Add resident WhatsApp numbers | 30 min |
| First maintenance bill generated | Automatic |

---

## Real Results from Indian Societies

Societies using online maintenance collection report:

- **90% collection in 3 days** (vs 15+ days manually)
- **Zero cash handling** — completely contactless
- **50% fewer defaulters** — automatic reminders work
- **Secretary time saved**: 10-15 hours/month

---

## Which Software to Use?

MyRentSaathi is built specifically for Indian housing societies:

- 🏢 WhatsApp-native — works without any app download for residents
- 💰 Online maintenance collection with UPI
- 📋 Expense management + committee approval workflow
- 🗳️ Polls, notices, complaint tickets
- 📊 Financial reports ready for AGM

**Plans start at ₹10/flat/month.** 30-day free trial, no credit card required.

---

## Conclusion

Online maintenance collection is no longer a luxury — it's the standard. If your society is still collecting cash or cheques, you're creating unnecessary work for the committee and frustration for residents.

Start with a free trial today and see the difference in your first collection cycle.`,
    author: "MyRentSaathi Team",
    category: "Society Management",
    tags: ["society maintenance collection", "RWA management", "housing society software", "maintenance online"],
    published_at: new Date().toISOString(),
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
      .select("*, schema_type, updated_at")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();
    if (data) post = data;
  } catch { /* use static */ }

  if (!post) notFound();

  const wordCount = post.content ? post.content.trim().split(/\s+/).length : 0;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "MyRentSaathi", url: BASE_URL },
    datePublished: post.published_at,
    dateModified: (post as unknown as Record<string, string>).updated_at ?? post.published_at,
    wordCount,
    url: `${BASE_URL}/blog/${slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/blog/${slug}` },
    keywords: post.tags?.join(", "),
  };

  // HowTo schema — only for process-type posts (schema_type = 'howto')
  const howToJsonLd = (post as unknown as Record<string, string>).schema_type === "howto" ? (() => {
    const stepHeadings = post.content
      .split("\n")
      .filter((line: string) => /^##\s+Step\s+\d+/i.test(line))
      .map((line: string, i: number) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: line.replace(/^#+\s+/, ""),
      }));
    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: post.title,
      description: post.excerpt,
      step: stepHeadings.length > 0 ? stepHeadings : undefined,
    };
  })() : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.category, item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 4, name: post.title, item: `${BASE_URL}/blog/${slug}` },
    ],
  };

  const aggregateRatingJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MyRentSaathi",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "500",
      bestRating: "5",
      worstRating: "1",
    },
  };

  return (
    <div className="bg-background text-ink overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateRatingJsonLd).replace(/</g, "\\u003c") }}
      />
      {howToJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd).replace(/</g, "\\u003c") }}
        />
      )}
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
