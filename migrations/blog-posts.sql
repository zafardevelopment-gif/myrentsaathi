-- ============================================================
-- BLOG SYSTEM — SEO-optimized blog for MyRentSaathi
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  excerpt       text,
  content       text NOT NULL,                  -- Markdown or HTML
  author        text NOT NULL DEFAULT 'MyRentSaathi Team',
  category      text NOT NULL DEFAULT 'General',
  tags          text[] DEFAULT '{}',
  cover_image   text,                           -- URL to cover image
  is_published  boolean NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_slug       ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_published  ON public.blog_posts(is_published, published_at DESC);

DROP TRIGGER IF EXISTS trg_blog_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (is_published = true);

-- ── SEED DATA — Initial blog posts ───────────────────────────
INSERT INTO public.blog_posts (slug, title, excerpt, content, category, tags, is_published, published_at) VALUES
(
  'how-to-collect-rent-online-india',
  'How to Collect Rent Online in India: Complete 2025 Guide',
  'Learn how landlords in India can automate rent collection using UPI, WhatsApp, and property management software. Save hours every month.',
  '## Introduction

Collecting rent manually in India is a major pain point for landlords. Whether you own 1 flat or 50 properties, chasing tenants, tracking payments, and issuing receipts consumes hours every month.

In this guide, we walk through how to set up **online rent collection in India** using modern tools — including UPI, WhatsApp, and dedicated property management software.

## Why Online Rent Collection Matters

- **Reduced defaults**: Automated reminders reduce late payments by 60-70%
- **Digital records**: Every payment is logged — useful for IT returns and disputes
- **Time savings**: Eliminate manual follow-ups and cash handling

## Step 1: Set Up a UPI Account

Every Indian landlord should have a dedicated UPI ID for rent collection. Use Google Pay, PhonePe, or your bank app to create a UPI ID like `yourname@bankname`.

## Step 2: Use Property Management Software

Platforms like MyRentSaathi automate the entire cycle:
- Generate monthly rent bills
- Send WhatsApp reminders with UPI payment links
- Receive payment confirmations
- Issue digital receipts

## Step 3: Track and Report

Download monthly and annual payment reports for your CA. All payments are tax-ready and include payer details for TDS compliance.

## Conclusion

Online rent collection is no longer optional — it is the standard for professional landlords in India. Start your free trial with MyRentSaathi today.',
  'Rent Collection',
  ARRAY['rent collection', 'UPI', 'landlord', 'India'],
  true,
  now() - interval '10 days'
),
(
  'society-management-software-india',
  'Best Society Management Software in India (2025) — Complete Comparison',
  'Compare the top housing society management software available in India. Features, pricing, and which is best for your CHS or apartment complex.',
  '## Introduction

Managing a housing society manually — paper-based maintenance registers, WhatsApp groups for complaints, Excel sheets for accounts — is both error-prone and time-consuming.

**Society management software** solves this by digitizing every operation. In this guide, we compare options available in India and explain what features matter most.

## What to Look for in Society Management Software

### 1. Maintenance Collection
The software should auto-generate bills, send reminders, and collect payments via UPI. Look for defaulter tracking.

### 2. Expense Management
Committee-approved expense logging with bill photos. Monthly and annual financial reports.

### 3. Complaint Management
Residents should be able to raise complaints and track resolution without calling the secretary.

### 4. WhatsApp Integration
Given that 95%+ of Indians use WhatsApp, native WhatsApp support is critical for adoption.

### 5. Transparency
All residents should be able to see notice boards, polls, and financial summaries.

## Our Recommendation

MyRentSaathi ticks every box — WhatsApp-native, automated maintenance collection, expense management, polls, and document vault. Plans start at ₹2,999/month for societies up to 30 flats.

Start your 14-day free trial today — no credit card required.',
  'Society Management',
  ARRAY['society management', 'housing society', 'CHS', 'apartment management'],
  true,
  now() - interval '5 days'
),
(
  'rent-agreement-india-guide',
  'Rent Agreement in India: Everything You Need to Know in 2025',
  'A complete guide to rental agreements in India — clauses to include, registration requirements, notice periods, and how to generate one online.',
  '## What is a Rent Agreement?

A rent agreement (also called a lease agreement or rental deed) is a legally binding contract between a landlord and tenant that defines the terms of property rental in India.

## Is Rent Agreement Mandatory in India?

Yes, for rental periods exceeding 11 months, a registered rent agreement is mandatory under the Registration Act, 1908. Many landlords prefer 11-month agreements specifically to avoid compulsory registration.

## Key Clauses in an Indian Rent Agreement

1. **Rent amount and due date** — Specify monthly rent, due date (usually 1st or 5th of month), and late payment penalty
2. **Security deposit** — Typically 2-3 months rent. Specify refund conditions
3. **Maintenance charges** — Who pays society maintenance? Include in agreement
4. **Notice period** — Standard is 1-2 months for either party
5. **Lock-in period** — Minimum period before either party can exit
6. **Permitted use** — Residential only vs commercial use
7. **Prohibited activities** — Subletting, pets, alterations

## How to Generate a Rent Agreement Online

MyRentSaathi offers an AI-powered agreement generator that:
- Creates legally-vetted templates for 8 Indian cities
- Incorporates state-specific rental laws
- Supports e-signing and WhatsApp delivery

Generate your first agreement free with a 14-day trial.',
  'Legal',
  ARRAY['rent agreement', 'lease agreement', 'rental deed', 'India legal'],
  true,
  now() - interval '2 days'
)
ON CONFLICT (slug) DO NOTHING;
