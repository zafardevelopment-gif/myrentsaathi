import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HomePageClient from "@/components/website/HomePageClient";
import Footer from "@/components/website/Footer";
import { supabase } from "@/lib/supabase";
import { SITE, SITE_URL, absoluteUrl } from "@/lib/seo/config";

const BASE_URL = SITE_URL;

// ── Static post data (mirrors DB seed) ───────────────────────
const STATIC_POSTS: Record<string, {
  slug: string; title: string; excerpt: string; content: string;
  author: string; category: string; tags: string[]; published_at: string;
}> = {
  "how-to-collect-rent-online-india": {
    slug: "how-to-collect-rent-online-india",
    title: "How to Collect Rent Online in India: Complete 2026 Guide",
    excerpt: "Step-by-step guide for Indian landlords to collect rent online via UPI and WhatsApp, automate reminders and receipts, and keep tax-ready records. Includes NRI guidance.",
    content: `## How do you collect rent online in India?

To collect rent online in India, a landlord sends the tenant a UPI payment request or link, the tenant pays from any UPI app, and both sides keep a digital receipt. In practice, doing this manually every month — creating the request, following up, saving proof, writing a receipt — is what eats time. Rent-collection software automates the whole cycle so you set it up once and it runs itself.

This guide walks through both the manual method and the automated one, so you can decide what fits your portfolio.

## Why collect rent online instead of cash or bank transfer?

- **Fewer late payments.** Automated reminders on the due date, and again if a tenant is late, cut down the "I forgot" defaults that manual chasing never fully solves.
- **A clean paper trail.** Every payment is dated and logged — essential for income-tax filing, for the tenant's HRA claim, and for settling any dispute about what was paid.
- **No cash handling.** UPI settles directly to your bank account; there is no cash to count, deposit or misplace.
- **Time back.** For a landlord with even three or four flats, automation removes hours of monthly follow-up.

## Step 1: Set up a UPI ID for rent

Every landlord collecting rent online needs a UPI ID linked to the bank account where rent should land. Google Pay, PhonePe, Paytm or your bank's own app all work. Many landlords keep a dedicated account or UPI ID just for rent, so the records stay clean at tax time.

## Step 2: Choose manual or automated collection

**Manual:** each month you create a UPI collect request or send your UPI ID, message the tenant, wait, confirm, and note it down. Workable for a single flat; painful beyond that.

**Automated (software):** platforms such as MyRentSaathi let you set each tenant and rent amount once. On the due date the software sends a UPI payment link to the tenant on WhatsApp, nudges them if they are late, records the payment when it lands, and issues a receipt automatically. You see paid, pending and overdue across every property from one dashboard.

## Step 3: Send reminders that actually get read

The reason WhatsApp-based collection works in India is simple: tenants read WhatsApp, and they already have a UPI app. A payment link delivered on WhatsApp — with no new app to install and no login to remember — removes almost every excuse for a missed payment. This is why WhatsApp-native tools out-collect app-based ones in practice.

## Step 4: Keep tax-ready records

Download monthly or yearly income reports for your CA, and make sure receipts are stored automatically so your tenant can claim HRA without asking you to write slips by hand. Good software keeps this record for you rather than leaving you to assemble screenshots at the last minute.

## How do NRI landlords collect rent in India?

Because the whole flow runs over UPI and WhatsApp, an owner living abroad can collect rent on an Indian property without phone calls or visits — the tenant pays into the Indian account, and the NRI landlord sees the status from any time zone. This remote-first pattern is exactly what NRI-oriented plans are built around.

## Frequently asked questions

**Is it legal to collect rent via UPI in India?**
Yes. UPI is a standard, regulated payment method; collecting rent through it is completely legal and gives you a cleaner record than cash.

**Do tenants need to download an app to pay rent?**
With WhatsApp-native software, no. They pay through the UPI app they already use; the link simply arrives on WhatsApp.

**Can I automatically issue rent receipts?**
Yes. Rent-collection software generates a dated receipt on each payment and stores it, which is what tenants need for HRA claims and you need for tax filing.

**How much does rent-collection software cost?**
Landlord plans typically start in the low hundreds of rupees per month and scale with the number of properties. Check the provider's live pricing page, and use a free trial before paying.`,
    author: "MyRentSaathi Team",
    category: "Rent Collection",
    tags: ["rent collection", "UPI", "landlord", "India"],
    published_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  "society-management-software-india": {
    slug: "society-management-software-india",
    title: "Best Society Management Software in India (2026) — Honest Comparison",
    excerpt: "How to choose society management software in India: the features that matter, honest category comparison, real pricing guidance, and FAQs for RWA committees.",
    content: `## What is society management software?

Society management software is a digital platform that replaces the registers, spreadsheets and WhatsApp groups a housing society's committee uses to run day-to-day operations. In India it typically handles maintenance-fee collection, expense accounting, complaint tracking, notices, visitor entry at the gate, and online voting for AGMs — all in one dashboard the managing committee can see, instead of information living only in the treasurer's head.

For a registered Co-operative Housing Society (CHS), an apartment owners' association, or an RWA, the right software turns a volunteer-run committee into something that behaves like a professionally managed property — without hiring a professional manager.

## What should you look for in society management software in India?

Not every tool that works abroad fits an Indian society. These are the features that actually matter here:

### 1. Online maintenance collection with UPI
The core job. Good software auto-generates each flat's monthly maintenance bill, sends it with a UPI payment link, records payment automatically, and issues a receipt — so the treasurer stops matching bank SMS to a register by hand. Look for automatic **defaulter tracking**, because chasing dues is where committees lose the most time.

### 2. WhatsApp-native communication
This is the single biggest adoption factor in India. If residents have to download and log into an app, most never will, and the committee is back to manual follow-up. Software that delivers bills, reminders, notices and poll links over WhatsApp — with nothing for residents to install — sees far higher participation.

### 3. Transparent expense accounting
Every rupee spent should be logged with a bill photo and, ideally, a committee-approval step. At year-end you want income-and-expense summaries and balance-sheet-style reports your CA and auditor can use, so a handover to the next committee is not a leap of faith.

### 4. Complaint and facility management
Residents should be able to raise plumbing, lift or parking complaints as trackable tickets, and book shared facilities. The committee prioritises and closes them, with a record of what happened.

### 5. Online AGM voting and polls
Physical AGMs struggle for quorum. Secret-ballot online voting for committee elections and rule changes, with an audit trail, lifts turnout and removes disputes about who voted for what.

### 6. Visitor and gate management
For gated societies, visitor pre-approval, entry logs and a guard flow keep the gate accountable and residents safe.

## Which society management software is best in India?

The honest answer is that "best" depends on your society's size and priority. The main categories of tool available in India are:

- **Gate-and-community-first apps** (for example MyGate, ADDA): strongest at visitor management and community features, widely used in large metro complexes. Powerful, but often heavier than a small society needs, and priced for scale.
- **Accounting-first society software**: strong on society books and audit, but frequently weak on resident communication, so adoption suffers.
- **WhatsApp-native, all-in-one platforms** (for example MyRentSaathi): built so residents never install an app, combining maintenance collection, accounting, complaints, polls and visitor management. Best fit for the many Indian societies of 10–300 flats that want everything in one place without a heavy rollout.

Rather than trust any single "top 10" list — most are affiliate rankings — shortlist two or three, run each on a free trial for one billing cycle, and judge them on the metric that actually matters: **what percentage of residents paid maintenance on time, and how little committee effort it took.**

## How much does society management software cost in India?

Pricing is almost always per-society and scales with flat count. Small societies can expect entry plans in the low thousands of rupees per month; larger complexes pay more for higher flat limits and advanced modules. Because prices change, check each vendor's live pricing page rather than a figure quoted in an article. Most reputable tools offer a free trial — use it before paying.

## Why MyRentSaathi

MyRentSaathi is a WhatsApp-native, all-in-one platform for Indian housing societies: automated maintenance collection over UPI, automatic defaulter tracking, transparent expense accounting, complaint tickets, online AGM voting, and visitor management — with nothing for residents to download. It is built by AIVEXA LLP for Indian societies specifically, from 10-flat buildings to 500+-flat complexes. You can start a free trial and run it for one full billing cycle before deciding.

## Frequently asked questions

**Is society management software worth it for a small society?**
Yes, if it is priced by flat count and residents don't need to install an app. A 20-flat society benefits most from automated collection and a clean handover between committees.

**Can residents use it without a smartphone app?**
With WhatsApp-native platforms, yes — residents interact entirely over WhatsApp. Only the committee uses a dashboard.

**Does it replace our CA?**
No. It keeps clean, auditable books that make your CA's and auditor's job faster, but it does not replace professional audit or filing.`,
    author: "MyRentSaathi Team",
    category: "Society Management",
    tags: ["society management", "housing society", "CHS"],
    published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  "rent-agreement-india-guide": {
    slug: "rent-agreement-india-guide",
    title: "Rent Agreement in India: Complete 2026 Guide (Registration, Clauses, Online)",
    excerpt: "Everything Indian landlords and tenants need to know about rent agreements in 2026: 11-month vs registered, mandatory registration rules, stamp duty, key clauses, and making one online.",
    content: `## What is a rent agreement in India?

A rent agreement is a legally binding contract between a landlord and a tenant that sets out the rent, deposit, duration and rules for using a property. In India it is the document you rely on if there is ever a dispute about rent, deposit refund, or eviction — so getting it right matters more than most first-time landlords realise.

Most residential rentals in India use one of two forms: a **leave and licence** agreement (common in Maharashtra) or a standard **rent/lease agreement**. Both do the same job for everyday renting; the legal mechanics differ by state.

## Is a rent agreement registration mandatory in India?

It depends on the term. A rent agreement for **12 months or longer** generally must be registered under the Registration Act, 1908. This is why the vast majority of Indian residential agreements are written for **11 months** — an 11-month term avoids compulsory registration while remaining fully valid, and can be renewed. That said, registration gives you stronger legal standing in a dispute, so for higher-value or longer tenancies many landlords register regardless.

Stamp duty is separate from registration and is always payable. Rates vary by state — for example, Maharashtra charges a small percentage on leave-and-licence agreements, while other states set their own slab. Always confirm the current rate for your city before finalising.

## What clauses should a rent agreement include?

At minimum, a sound Indian rent agreement should cover:

1. **Rent amount, due date and payment method** — including any UPI/online payment arrangement.
2. **Security deposit** — the amount (commonly one to three months' rent, higher in some cities) and the exact conditions for its refund.
3. **Duration and renewal** — the term (usually 11 months) and how renewal or rent revision works.
4. **Maintenance charges** — who pays society maintenance, and whether it is included in rent.
5. **Notice period** — typically one to two months for either party to end the tenancy.
6. **Lock-in period** — if either side is committed for a minimum term.
7. **Permitted use** — residential only, occupancy limits, subletting rules.
8. **Responsibilities** — repairs, utility bills, and condition of the property at handover.

A missing or vague clause — especially on deposit refund and notice — is the most common cause of landlord–tenant disputes.

## How do you make a rent agreement online in India?

You no longer need to visit a lawyer for a standard tenancy. The typical online process is: choose a template suited to your city and state, fill in the parties, rent, deposit and clauses, pay the applicable stamp duty (many states support e-stamping), and — if registering — book a slot on the state's registration portal. Software can generate a ready, city-appropriate draft in minutes.

MyRentSaathi's rent-agreement generator produces India-specific agreements from lawyer-reviewed templates, with clauses adjusted for the city, so a first-time landlord gets a sound document without drafting from scratch. It generates the document; stamp duty and any required registration remain the user's responsibility, because those steps are state-specific and legally significant.

## What is the difference between an 11-month and a longer agreement?

An 11-month agreement avoids the compulsory-registration requirement that kicks in at 12 months, which keeps it cheaper and simpler while staying legally valid — this is why it is the default in India. A longer, registered agreement gives the tenant stronger tenancy rights and the landlord stronger enforceability, and is worth it for premium or long-term lets. Neither is "better" universally; it depends on the tenancy.

## Frequently asked questions

**Is an unregistered rent agreement valid in India?**
An 11-month unregistered agreement is valid and enforceable for most purposes. For 12 months or more, registration is generally mandatory.

**Who pays the stamp duty and registration charges?**
By custom this is usually the tenant, but it is negotiable and should be stated in the agreement itself.

**Can I make a legally valid rent agreement online?**
Yes. A properly drafted, correctly stamped online agreement is as valid as one made through a lawyer, provided the stamp-duty and registration rules for your state are followed.

**How much deposit can a landlord ask for?**
It varies by city and is a matter of agreement, commonly one to three months' rent; some states cap it. Whatever the amount, the refund conditions must be written clearly.`,
    author: "MyRentSaathi Team",
    category: "Legal",
    tags: ["rent agreement", "lease agreement", "legal"],
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },

  "apni-property-ko-rent-par-kaise-de": {
    slug: "apni-property-ko-rent-par-kaise-de",
    title: "Apni Property Ko Rent Par Kaise De — Complete Guide 2026",
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
    title: "Society Maintenance Collection Online: Complete Guide for RWA Committees (2026)",
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

1. Resident gets WhatsApp message: "Maintenance due: ₹3,500 for June 2026"
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
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE.name,
      url: SITE_URL,
      logo: absoluteUrl(SITE.logo),
    },
    image: absoluteUrl(SITE.ogImage),
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: SITE.locale,
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
