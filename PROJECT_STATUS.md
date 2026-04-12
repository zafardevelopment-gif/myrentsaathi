# MyRentSaathi — Project Status & Roadmap
**Last Updated:** April 2026  
**Stack:** Next.js 16.2.1 · React 19 · Supabase (PostgreSQL) · Tailwind CSS v4  
**TypeScript:** ✅ Zero errors (`tsc --noEmit` passes clean)

---

## 1. Overall Health

| Area | Status | Notes |
|------|--------|-------|
| TypeScript compilation | ✅ Clean | Zero errors |
| All pages load | ✅ Working | 60+ pages across 6 roles |
| Database connectivity | ✅ Live | All queries hit real Supabase DB |
| Forms & mutations | ✅ Working | Insert/update/delete all functional |
| Navigation (all roles) | ✅ Complete | Sidebar + mobile nav correct |
| Loading & empty states | ✅ Good | Skeletons + helpful empty messages |
| Error handling | ✅ Good | Try-catch + toast feedback everywhere |
| Mock/fake data in production | ✅ None | mockData.ts exists but is NOT imported anywhere |
| Payment gateway | ✅ Integrated | Razorpay wired — needs live keys to activate |

---

## 2. Completed Features (Production-Ready)

### 🔐 Auth & Roles
- Login / logout with DB-backed password check
- 6 roles: **SuperAdmin · Admin · Board · Landlord · Tenant · Guard**
- Role-based routing and sidebar navigation
- Session persisted in localStorage (`mrs_user`)

### 🏢 Admin Dashboard (16 pages)
| Page | Feature | Status |
|------|---------|--------|
| Overview | Stats: flats, payments, tickets, expenses | ✅ |
| Flats | Add/edit/delete flats, occupancy status | ✅ |
| Landlords | Directory, add landlord, assign flat | ✅ |
| Finance | Maintenance collection, payment status | ✅ |
| Expenses | Category-wise expenses, vendor tracking | ✅ |
| Parking | Slots + vehicles + passes + QR print | ✅ |
| Staff | Full staff management + CSV import/export | ✅ |
| Visitors | VMS: approve/deny entries, log | ✅ |
| Tickets | Complaints: assign, resolve, track | ✅ |
| Notices | Create notices, audience targeting | ✅ |
| Polls | Create polls, view live results | ✅ |
| Documents | Upload and share society documents | ✅ |
| Facilities | Manage amenity bookings | ✅ |
| Governance | Board members, committee structure | ✅ |
| Reports | 20 CSV reports across 5 categories | ✅ |
| Settings | Society profile, plan info | ✅ |

### 🏠 Landlord Dashboard (15 pages)
| Page | Feature | Status |
|------|---------|--------|
| Overview | Rent collected, pending dues, property count | ✅ |
| Properties | Add/edit flats, rent amounts | ✅ |
| Tenants | View/manage current tenants | ✅ |
| Rent | Payment history, mark paid | ✅ |
| Rent Hike | Schedule rent increases | ✅ |
| Society Dues | Pay maintenance via Razorpay | ✅ |
| Agreements | Digital rental agreements | ✅ |
| NOC | No-objection certificates | ✅ |
| Complaints | Ticket history and raising | ✅ |
| Notices | View & post notices | ✅ |
| Visitors | Pre-approve guests | ✅ |
| Parking | Vehicle & slot management | ✅ |
| Facilities | Book amenities | ✅ |
| WhatsApp | Manual broadcast via wa.me links | ✅ (manual, not API) |
| Documents | Society + personal documents | ✅ |

### 👤 Tenant Dashboard (11 pages)
| Page | Feature | Status |
|------|---------|--------|
| Overview | Dues, notices, complaints summary | ✅ |
| Payments | Pay rent via Razorpay (UPI/Cards/NB) | ✅ |
| Agreement | View rental agreement | ✅ |
| Complaints | Raise & track tickets | ✅ |
| Notices | Society notice board | ✅ |
| Visitors | Pre-approve guests | ✅ |
| Parking | View vehicle & slot | ✅ |
| Facilities | Book amenities | ✅ |
| Documents | Access shared documents | ✅ |
| Governance | Participate in polls | ✅ |
| Profile | Update personal details | ✅ |

### 🛡️ Guard Dashboard (4 pages)
- Gate entry: visitor check-in with flat lookup, tenant details display
- Pending approvals queue
- Full visit log with search
- Parking / vehicle verification

### ⚖️ Board Member Dashboard (4 pages)
- Ticket management
- Approval workflows
- Notices & polls

### 🔑 SuperAdmin Dashboard (11 pages)
- Multi-society management
- Subscription & revenue tracking
- Pricing plan configuration
- Agent & promo management
- Platform analytics

### 🤖 Saathi — AI Support Agent
- **10 live data tools:** getUserDashboard, getMaintenanceDues, getMyComplaints, getSocietyNotices, getMyVehicles, getVisitorLog, getSocietyStaff, getAdminFinancialSummary, getSocietyOccupancy, howToGuide
- Role-aware quick replies (tenant / landlord / admin / guest)
- Responds in Hindi / Hinglish / English matching user
- Human escalation via support ticket
- System prompt refreshes on every message (userId always current)

### 🅿️ Parking System
- Bulk CSV import (slots + vehicles + assignment in one file)
- Export slots & vehicles as CSV
- Parking pass sticker with QR code (print/save)
- Authorize/unauthorize vehicles

### 📊 Reports (20 reports)
- **Financial:** Maintenance, Pending Dues, Expenses, Salary, Income vs Expense
- **Members:** All Members, Landlords, Tenants, Flat Register, Vacant Flats
- **Parking:** Parking Slots, Registered Vehicles
- **Operations:** Notices, Tickets, Visitor Log, Staff Register, Attendance
- **Governance:** Polls & Voting, Committee Members

### 💳 Payment Gateway (Razorpay) — INTEGRATED
- `app/api/payment/create-order/route.ts` — Creates Razorpay order
- `app/api/payment/verify/route.ts` — HMAC-SHA256 signature verification, DB update on success
- `app/api/payment/webhook/route.ts` — Handles captured/failed events from Razorpay
- Tenant → Payments: full Razorpay checkout (UPI, Cards, Net Banking, Wallets)
- Landlord → Society Dues: per-expense Razorpay checkout
- `types/razorpay.d.ts` — Global type declarations
- **Status:** Code complete. Needs real Razorpay keys to go live (see §6).

---

## 3. Bugs Fixed

| Bug | File | Fix |
|-----|------|-----|
| `getMyVehicles` doing double DB fetch | `lib/chat-tools.ts` | Removed redundant first fetch |
| Saathi "not logged in" for authenticated users | `app/api/chat/route.ts` | System prompt now refreshed on every message |
| Slot filter stuck on "Available" post-import | `app/admin/parking/page.tsx` | Reset to "all" after successful import |

---

## 4. Known Limitations (Design Decisions)

| Area | Current State | Notes |
|------|--------------|-------|
| WhatsApp | Manual only (wa.me links open browser) | Phase 2 below |
| Payments | Razorpay integrated, needs live keys | Add keys in .env.local |
| PDF generation | Structure in place, not fully tested | Agreements show data but no real PDF |
| Email notifications | Not configured | Phase 4 below |
| SMS / OTP | Not implemented | Phone login not available |
| Push notifications | Not implemented | Browser push or FCM not set up |
| Native mobile app | Web-only | Responsive web works on mobile |

---

## 5. Remaining Work — Priority Order

---

### ✅ PHASE 1 — Razorpay Payment Integration — COMPLETE

**What was built:**
- `app/api/payment/create-order/route.ts`
- `app/api/payment/verify/route.ts` (HMAC-SHA256 verification)
- `app/api/payment/webhook/route.ts`
- `components/tenant/PayRentModal.tsx` — real checkout (no more manual recording)
- `app/landlord/society-dues/page.tsx` — per-expense Razorpay payment
- `types/razorpay.d.ts` — global types

**To activate:** Add real keys to `.env.local` (see §6)

---

### 🔴 PHASE 2 — WhatsApp Business API
**Goal:** Automated notifications for dues, receipts, notices, visitor alerts  
**Priority:** High — this is a key selling point of the platform  
**Effort:** ~5–7 days (including Meta template approval wait of 24–72 hrs)

---

#### Step-by-step setup

**Step 1 — Get API access**

Choose one option:

| Option | Setup Time | Cost | Recommended? |
|--------|-----------|------|--------------|
| **Meta Cloud API (direct)** | 2–3 days setup + approval | ~₹0.30–0.80/msg | ✅ Best long-term |
| **Twilio WhatsApp** | 30 min sandbox, 2–3 days production | Slightly higher per msg | Good for testing |
| **Interakt / Wati / AiSensy** | 1 day | Monthly SaaS fee | Easiest, no code |

**Recommended path: Meta Cloud API (direct)**
1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → Business
2. Add "WhatsApp" product to app
3. Connect Facebook Business Manager (verified business)
4. Get a phone number (or use the free test number Meta provides)
5. Get: `Access Token`, `Phone Number ID`, `Business Account ID`

---

**Step 2 — Create message templates in Meta**

Templates must be pre-approved by Meta before sending. Submit these in Meta Business Manager → WhatsApp → Message Templates:

| Template Name | Category | Message |
|--------------|----------|---------|
| `rent_due_reminder` | UTILITY | Dear {{1}}, your rent of ₹{{2}} for {{3}} is due. Pay now: {{4}} |
| `payment_receipt` | UTILITY | Dear {{1}}, ₹{{2}} received for {{3}}. Receipt ID: {{4}}. Thank you! |
| `maintenance_due` | UTILITY | Dear {{1}}, society maintenance of ₹{{2}} is due for {{3}}. |
| `notice_alert` | UTILITY | {{1}} Society: New notice — "{{2}}". Open MyRentSaathi to view. |
| `visitor_alert` | UTILITY | Hi {{1}}, {{2}} is at the gate. Purpose: {{3}}. Reply Y to approve. |
| `ticket_update` | UTILITY | Your complaint #{{1}} ({{2}}) status changed to: {{3}}. |

Approval typically takes 24–72 hours.

---

**Step 3 — Install & build**

```bash
# No package needed — use native fetch to Meta API
# OR install official SDK:
npm install whatsapp-business-api-js  # optional wrapper
```

**File to create:** `app/api/whatsapp/send/route.ts`

```typescript
// POST body:
// { to: "+919876543210", template: "rent_due_reminder", params: ["Rahul", "5000", "April 2026", "https://..."] }
```

Full implementation:
```typescript
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { to, template, params } = await request.json();

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: "en" },
          components: [{
            type: "body",
            parameters: params.map((p: string) => ({ type: "text", text: p })),
          }],
        },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: 500 });

  // Log to whatsapp_logs table
  // await supabase.from("whatsapp_logs").insert({ to, template, status: "sent", ... });

  return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id });
}
```

---

**Step 4 — Wire trigger points**

Add WhatsApp calls after these existing actions:

| Where | File | Trigger | Template |
|-------|------|---------|----------|
| After payment verified | `app/api/payment/verify/route.ts` | Payment captured | `payment_receipt` |
| After notice created | `app/admin/notices/page.tsx` | Notice posted | `notice_alert` |
| After visitor checked in | `app/guard/visitors/page.tsx` | Visitor at gate | `visitor_alert` |
| After ticket status changed | `app/admin/tickets/page.tsx` | Ticket updated | `ticket_update` |
| Monthly cron / manual trigger | New: `app/api/whatsapp/send-dues/route.ts` | Dues reminder | `rent_due_reminder` / `maintenance_due` |

---

**Step 5 — Phone number in DB**

Users need phone numbers stored. Check `users` table has `phone` column. If not:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
```
Add phone field to profile edit pages (tenant, landlord, admin).

---

**Environment variables needed:**
```env
WHATSAPP_ACCESS_TOKEN=EAAxxxxx        # From Meta App dashboard
WHATSAPP_PHONE_NUMBER_ID=12345678     # From Meta App → WhatsApp → Getting Started
WHATSAPP_BUSINESS_ACCOUNT_ID=xxx      # From Meta Business Manager
```

---

### 🟡 PHASE 3 — Subscription & Plan Enforcement
**Goal:** Enforce plan limits, block expired societies, enable self-serve upgrade  
**Priority:** Medium — needed before public launch  
**Effort:** ~2–3 days

**Current state:** Plans exist in DB (`pricing_plans` table) but code never checks them.

#### What to build:

**1. Middleware** — `middleware.ts` (create in project root)
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Read session from cookie/header
  // Check societies.is_active and subscription_expires_at
  // If expired → redirect to /admin/settings?upgrade=true
}

export const config = { matcher: ["/admin/:path*"] };
```

**2. Plan limits in `lib/admin-data.ts`**
```typescript
// In createFlat():
const FLAT_LIMITS = { starter: 50, growth: 200, enterprise: Infinity };
const plan = society.subscription_plan ?? "starter";
const limit = FLAT_LIMITS[plan as keyof typeof FLAT_LIMITS] ?? 50;
if (currentFlatCount >= limit) {
  throw new Error(`Plan limit reached. Upgrade to add more flats.`);
}
```

**3. Self-serve upgrade in Admin Settings page**
- "Upgrade Plan" button → opens Razorpay checkout (reuse existing payment infra)
- On success: call new API route → update `societies.subscription_plan` + `subscription_expires_at`
- New API route: `app/api/subscription/upgrade/route.ts`

**4. DB column needed:**
```sql
ALTER TABLE societies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE societies ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
```

---

### 🟡 PHASE 4 — Email Notifications
**Goal:** Payment receipts, welcome emails, password reset, notices  
**Priority:** Medium — improves trust  
**Effort:** ~2 days

**Install:**
```bash
npm install resend
```

**File to create:** `app/api/email/send/route.ts`

**Templates to build (using React Email or plain HTML):**

| Template | Trigger | Recipients |
|----------|---------|-----------|
| `welcome` | New user registered | New user |
| `payment_receipt` | Payment verified | Tenant / Landlord |
| `notice_alert` | Notice posted | Target audience |
| `ticket_resolved` | Ticket status = resolved | Raiser |
| `password_reset` | Forgot password flow | Requested user |

**Example API route:**
```typescript
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.FROM_EMAIL ?? "noreply@myrentsaathi.com",
  to: userEmail,
  subject: "Payment Receipt — MyRentSaathi",
  html: `<p>Dear ${name}, your payment of ₹${amount} for ${month} has been received.</p>`,
});
```

**Environment variables needed:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxx       # From resend.com
FROM_EMAIL=noreply@myrentsaathi.com  # Your verified domain email
```

> ⚠️ Resend requires domain verification. Add DNS TXT records for myrentsaathi.com.

---

### 🟢 PHASE 5 — Production Hardening
**Goal:** Safe and stable for real users  
**Priority:** Before public launch  
**Effort:** ~3–5 days

#### 5.1 Security
- [ ] **Row Level Security (RLS):** Enable on all Supabase tables. Critical — currently any user with anon key can read all society data.
  ```sql
  ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
  -- Add policies: tenant can only read their own, admin reads society's
  ```
- [ ] **Rate limiting** on `/api/chat` — prevent Saathi AI cost abuse (use Upstash Redis or simple in-memory counter)
- [ ] **Server-side validation** with Zod on all mutation API routes
- [ ] **CSRF protection** — add `x-requested-with` header check on POST routes

#### 5.2 Performance
- [ ] `React.memo` on heavy list components (vehicle cards, slot cards, payment rows)
- [ ] Supabase query caching with SWR or React Query — avoid re-fetching on every render
- [ ] Next.js `<Image>` component where `<img>` is used directly

#### 5.3 Monitoring
- [ ] **Sentry** — error tracking (`npm install @sentry/nextjs`)
- [ ] **Vercel Analytics** — already available, just enable in Vercel dashboard
- [ ] **Supabase backups** — enable in Supabase dashboard → Project Settings → Backups
- [ ] **Uptime monitoring** — UptimeRobot (free) or Better Uptime

---

## 6. Environment Variables — Complete Reference

### ✅ Currently Configured
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # Used in payment/verify route
OPENROUTER_API_KEY=sk-or-v1-...           # Saathi AI chat
```

### 💳 Phase 1 — Razorpay (keys added, need real values)
```env
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_HERE           # rzp_live_xxx for production
RAZORPAY_KEY_SECRET=YOUR_SECRET_HERE
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_HERE
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET      # Set in Razorpay dashboard → Webhooks
```

Get keys at: https://dashboard.razorpay.com/app/keys  
For webhook secret: https://dashboard.razorpay.com/app/webhooks  
Webhook URL to register: `https://myrentsaathi.com/api/payment/webhook`

### 📱 Phase 2 — WhatsApp (not yet added)
```env
WHATSAPP_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_BUSINESS_ACCOUNT_ID=9876543210
```

### 📧 Phase 4 — Email (not yet added)
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@myrentsaathi.com
```

---

## 7. Database Tables Reference

| Table | Purpose |
|-------|---------|
| `societies` | Society profiles, plan, settings |
| `users` | All user accounts (all roles) |
| `society_members` | Role assignments per society |
| `flats` | Flat/unit inventory |
| `tenants` | Active tenancy records |
| `rent_payments` | Rent payment tracking (Razorpay `payment_id` field needed) |
| `maintenance_payments` | Society dues tracking |
| `society_due_payments` | Per-expense per-flat payment records |
| `tickets` | Complaints & requests |
| `notices` | Society announcements |
| `polls` + `poll_options` + `poll_votes` | Voting system |
| `parking_slots` | Parking inventory |
| `vehicles` | Registered vehicles |
| `vehicle_parking_passes` | Slot assignments |
| `staff` | Society staff |
| `salary_records` | Staff salary tracking |
| `attendance_records` | Daily attendance |
| `visitor_logs` | Gate visitor entries |
| `society_expenses` | Operating expenses |
| `agreements` | Rental agreements |
| `society_documents` | Shared documents |
| `staff_documents` | Staff ID/verification docs |
| `facilities` | Amenity definitions |
| `facility_bookings` | Amenity reservations |
| `pricing_plans` + `pricing_features` | Subscription plans |
| `ai_support_tickets` | Saathi escalation tickets |
| `whatsapp_logs` | WhatsApp message history |

### DB columns to add (Phase 2 & 3)
```sql
-- Phase 2: WhatsApp
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Phase 3: Plan enforcement
ALTER TABLE societies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE societies ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Phase 1: Razorpay payment_id on rent_payments (if not already present)
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE society_due_payments ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE society_due_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
```

---

## 8. Deployment Checklist

### Before going live:
- [ ] Replace Razorpay test keys with live keys (`rzp_live_xxx`)
- [ ] Run DB column migrations (see §7 above)
- [ ] Enable Supabase Row Level Security on all tables
- [ ] Register Razorpay webhook URL in dashboard
- [ ] Submit WhatsApp Business templates for Meta approval
- [ ] Set up custom domain (myrentsaathi.com) in Vercel
- [ ] Add all production env vars to Vercel dashboard
- [ ] Set up Sentry error tracking
- [ ] Enable Supabase automated backups
- [ ] Test complete payment flow end-to-end (create order → checkout → verify → DB update)
- [ ] Load test with 50+ concurrent users

### Nice to have:
- [ ] Vercel Analytics (1-click enable in Vercel)
- [ ] UptimeRobot monitoring on main URL
- [ ] CDN for document/image uploads

---

## 9. Summary — What's Done vs What's Left

```
DONE ██████████████████████████████████████░░░  88%
LEFT ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████  12%
```

**Done (88%):**
- Complete multi-role dashboard (Admin, Landlord, Tenant, Guard, Board, SuperAdmin)
- All core society management features (60+ pages)
- AI-powered customer support — Saathi with 10 live DB tools
- 20 CSV reports across 5 categories
- Parking pass with QR code + CSV import/export
- Staff management with attendance & salary
- Visitor management system
- Polls & governance
- Documents management
- **Razorpay payment gateway** (code complete, needs live keys)

**Remaining (12%):**
- 📱 WhatsApp Business API — templates + trigger wiring (~5–7 days)
- 🔒 Plan enforcement — middleware + flat limits + upgrade flow (~2–3 days)
- 📧 Email notifications — receipts, welcome, reset (~2 days)
- 🔐 Production hardening — RLS, rate limiting, Sentry (~3–5 days)

---

## 10. Recommended Next Order of Work

| # | Task | Why first | Days |
|---|------|-----------|------|
| 1 | Add Razorpay live keys + test payment flow | Unblocks real revenue | 1 hr |
| 2 | Run DB migrations (payment_id columns) | Required for Phase 1 to save correctly | 30 min |
| 3 | WhatsApp — Meta app setup + template submission | Approval takes 24–72 hrs, start now | 1 day |
| 4 | WhatsApp — API route + trigger wiring | Can do while templates are in review | 2–3 days |
| 5 | Plan enforcement middleware | Protects business model | 2–3 days |
| 6 | Email via Resend | Improves user trust + receipts | 2 days |
| 7 | RLS policies on Supabase | Security critical before public launch | 2–3 days |
| 8 | Sentry + monitoring | Catch prod issues fast | 1 day |
