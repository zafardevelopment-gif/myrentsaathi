# MyRentSaathi — Billing & Invoice Management Module

**Technical Design & Implementation Plan**
Status: Draft v3 · No code yet · Author: Solution Architecture
*(v2 adds: Security Deposit Ledger, Late Fee Engine, Credit/Debit Notes, Configurable Common-Meter Allocation, Additional Charge Types, Invoice Template Designer, WhatsApp PDF Delivery, Razorpay Payment Links, GSTR-1/3B support, Recipient Types — see **Part II**, §§19–28. v3 adds: Guided Setup Wizard & Onboarding Dashboard — see **Part III**, §§29–37.)*
Target stack: Next.js 16 (App Router) · Supabase/PostgreSQL · Razorpay · nodemailer SMTP · Meta WhatsApp Cloud API

---

## 0. Grounding: what already exists (verified against the codebase)

This module is **not** greenfield. The plan deliberately reuses live entities.

| Concern | Reality in the repo | Implication for billing |
|---|---|---|
| Building / property | `societies` (name, city, address, is_active) | This **is** the property. No new `properties` table. |
| Unit / cabin / shop / office | `flats` (flat_number, block, flat_type, floor_number, area_sqft, status, monthly_rent, security_deposit, society_id, owner_id, current_tenant_id) | This **is** the unit. No new `units`/`floors` table. |
| Tenant | `tenants` (id, user_id, flat_id, status) + `users` | Reuse as-is. |
| Lease | `agreements` (flat_id, tenant_id, landlord_id, monthly_rent, security_deposit, start/end_date, tier, status) | Source of rent amount & billing period. |
| Rent billing today | `rent_payments` (amount, expected_amount, month_year, status, payment_date, payment_method, tenant_id, flat_id, receipt_url, receipt_status, paid_amount) | A proto-invoice. **Unify into `invoices`.** |
| Maintenance billing today | `maintenance_payments` (+ reminder_sent_at, reminder_count) | Same — proto-invoice. |
| Membership/scoping | `society_members` (user_id, society_id, role); `flats.owner_id`; `flats.current_tenant_id` | Tenant-isolation boundary for SaaS. |
| Money rails | Razorpay fully wired: `/api/payment/{create-order,verify,webhook}`, `/api/razorpay-route` (split payouts), `bank_accounts` (holds `gst_number`, `pan_number`, Razorpay route IDs) | Reuse for online collection. |
| Email | `lib/email.ts` → `/api/email/send` (nodemailer SMTP, super-admin config). **No attachment support yet.** | Extend to support PDF attachments. |
| WhatsApp | `lib/whatsapp.ts` (Meta Cloud API templates incl. `mrs_rent_due`) | Reuse + add invoice/reminder templates. |
| Config | `society_config` (per-society key/value), `platform_settings` (global k/v), `society_integrations` (jsonb per provider) | Store GST %, due-day, numbering config here. |
| Scheduler | **None.** No cron, no Supabase Edge Functions, no `supabase/functions/`. | Must be designed from scratch. |
| RLS | Open (`open_access`/`anon_all`/`service_role`). Auth = MockAuth via `localStorage` (`mrs_user`), **not** Supabase Auth. | Real RLS is a future SaaS step; v1 keeps app-level scoping. |

> ⚠️ `myrentsaathi/AGENTS.md` warns the Next.js version has breaking changes vs. training data. Before implementation, read `node_modules/next/dist/docs/` for route handlers, `cron`, and caching conventions.

---

## 1. Functional Analysis

### 1.1 Actors
- **Super Admin** — platform-wide config (SMTP, GST defaults, plans).
- **Society Admin** — bills tenants/owners of one society; configures rates, GST, schedules.
- **Landlord** — bills their own tenants (independent or society-linked).
- **Tenant** — receives invoices, pays, views ledger.
- **System (scheduler)** — generates invoices, sends reminders, marks overdue.

### 1.2 Core capabilities
1. Maintain rental type per unit (residential / commercial / flat / office / shop / cabin / co-working).
2. Maintain GST identity (company + tenant), an **editable, versioned GST rate** (§3.1), and the **CGST/SGST/IGST split** by place of supply (§3.2).
3. Manage meters (individual + common) and monthly readings → consumption.
4. Configure electricity rates (flat now; slab/fixed/common-area later).
5. Generate three invoice types — **Rent (GST optional), Maintenance (no GST), Electricity (no GST, meter-based)** — manually or on schedule.
6. Produce numbered, branded PDF invoices with company/tenant GST and payment details.
7. Email the invoice (PDF attached) on generation.
8. Record full/partial payments; auto-derive status (Paid / Partially Paid / Unpaid / Overdue) and outstanding.
9. Send reminders (before / on / after due, month-end) across email + WhatsApp.
10. Report: outstanding, collection, property-wise revenue, tenant ledger, electricity consumption, GST.
11. Bill the correct **recipient** per invoice type — Tenant, Owner, or Landlord (§19).
12. Maintain a **Security Deposit Ledger** — collection, deductions, interest, refund (§20).
13. Apply a configurable **Late Fee / Penalty Engine** with grace, caps, and waivers (§21).
14. Issue **Credit & Debit Notes** against invoices (GST-compliant adjustments) (§22).
15. Bill **additional charge types** — parking, water, generator, internet, club, sinking fund… (§23).
16. **Configurable common-meter allocation** — equal / area / occupancy / sub-meter-difference / custom weights (§24).
17. **Invoice Template Designer** — per-biller branding, terms, layout config (§25).
18. **WhatsApp PDF delivery** of invoices (§26) and **Razorpay Payment Links** for one-tap online payment (§27).
19. **GST Returns** — GSTR-1 and GSTR-3B summaries with export (§28).
20. **Guided Setup Wizard & Onboarding Dashboard** — per-role step flow, live Setup Completion %, smart "Continue Setup", alerts, dependency-gated billing, and CSV/Excel bulk import (§§29–37).

### 1.3 Key business rules
- GST applies **only** when the invoice type allows it **and** the unit's rent is GST-eligible **and** a company GST number exists. Maintenance and Electricity are always GST-exempt (per requirement); taxable additional charges (§23) carry their own rate.
- The GST rate is **editable and effective-dated** — changing it affects only future invoices, never issued ones (§3.1).
- GST is split into **CGST+SGST (intra-state)** or **IGST (inter-state)** by place of supply, computed per line and snapshotted (§3.2).
- Electricity amount = `Σ slabs/flat-rate(consumed)` where `consumed = current_reading − previous_reading` (per meter, non-negative; meter-reset handled explicitly).
- Outstanding (invoice) = `total − Σ allocated payments`. Never stored as truth; derived or maintained transactionally.
- Overdue = `status ≠ paid AND now() > due_date`.
- Invoice numbers are **immutable, gapless per series, per organization** (legal requirement for GST invoices in India).

---

## 2. Rental Type — where it lives

**Decision: store rental type at the UNIT (`flats`) level, with an optional default at the SOCIETY level.**

Reasoning:
- Indian buildings are frequently **mixed-use** — shops on the ground floor, flats above; a commercial complex mixes offices, cabins, and co-working desks. A single society-level type cannot express this.
- Billing rules (GST eligibility on rent, default rates) are decided **per unit**, so the authoritative field must be on the unit.
- A society-level default avoids re-entering the type for a wholly-residential society: when a flat is created, it inherits the society default, which the admin can override.

Implementation: add `rental_type` enum to `flats` (authoritative) and `default_rental_type` to `societies` (UI default only). Enum: `residential | flat | commercial | office | shop | cabin | coworking`. (`flat` and `residential` kept distinct only because the brief lists both; treat `flat` as a residential sub-kind in logic.)

---

## 3. GST Design

**Decision: GST identity on master records, GST behaviour driven by invoice-type config + per-unit eligibility flag.**

Where GST numbers live:
- **Company/biller GST** → `billing_profiles` (new, one per biller = society or landlord). Reuses/extends the data already in `bank_accounts` (which has `gst_number`, `pan_number`). A dedicated profile cleanly separates "who is billing" from "where money lands."
- **Tenant GST** → add `gst_number` to `tenants` (nullable; B2B tenants only).

How GST appears & calculates:
- `invoice_type_config` row per (biller, invoice_type) holds `gst_applicable` (bool). Seed: rent → applicable; maintenance → false; electricity → false.
- Per-unit override: `flats.rent_gst_applicable` (bool, default false) lets a residential landlord keep rent GST-free while a commercial unit charges it.
- At generation, GST % is **snapshotted onto the invoice/line** (`gst_percent`, `gst_amount`), never read live at print time — historical invoices must not change if the rate changes later.
- India specifics worth designing in now: CGST/SGST vs IGST split (intra- vs inter-state) and **HSN/SAC code** per line. Store `gst_breakup jsonb` and `hsn_sac` on the line item to stay compliant without a schema change later.

### 3.1 Editable, versioned GST rate (e.g. 18% today → changed by govt tomorrow)

**Requirement:** the GST percentage must be **editable in the system**, not hard-coded. When the government revises a rate (say 18% → 16%), the admin updates it and new invoices use the new rate — **without disturbing any already-issued invoice.**

**Decision: a versioned `gst_rate_config` master (effective-dated), with the rate snapshotted onto each invoice at issue.** This is the same "version, never overwrite" pattern as `charge_rate_config` (§6).

```
gst_rate_config
  id            uuid pk
  society_id    uuid → societies NULL   -- NULL ⇒ platform default (super admin)
  landlord_id   uuid → users NULL
  applies_to    text                    -- 'rent' | a charge_types.code | an HSN/SAC code
  rate_percent  numeric                 -- 18.00 today; editable
  cgst_percent  numeric                 -- derived split (½/½ intra-state); IGST = rate for inter-state
  sgst_percent  numeric
  effective_from date                    -- when this rate starts applying
  effective_to   date NULL               -- set when superseded (NULL = currently active)
  is_active     bool default true
  created_by    uuid → users, created_at
  -- only one active rate per (biller, applies_to) at any date
```

**How a rate change works:**
1. Admin opens **Billing Settings → GST Rates**, edits the rate (or adds a new one). The system does **not** edit the existing row — it **closes** the current row (`effective_to = newDate − 1`) and **inserts** a new row with the new `rate_percent` and `effective_from = newDate`. Full history is preserved and auditable.
2. At invoice generation, the engine selects the rate where `applies_to` matches **and** `effective_from ≤ issue_date ≤ COALESCE(effective_to, ∞)`, then **snapshots** `gst_percent`/`gst_amount`/`gst_breakup` onto the invoice and each line.
3. Past invoices keep their snapshotted rate forever; only invoices issued on/after the change use the new rate. A back-dated invoice automatically picks the rate that was in force for its issue date.
4. Scope precedence: society/landlord-specific row → else platform default row. So the super admin sets a sensible default (rent 18%), and a biller can override.
5. Different rates per HSN/SAC or charge type are supported via `applies_to`, so a future "parking 18%, rent 18%, some service 12%" is just more rows.

This makes the rate **fully editable going forward, immutable for the past** — the legally correct behaviour for GST.

### 3.2 CGST + SGST vs IGST (the tax split)

**Requirement:** GST billing must implement the three components — **CGST, SGST, and IGST** — not a single lumped tax. Indian GST splits one rate into two or one component depending on **place of supply**:

| Transaction | Components | Example at 18% |
|---|---|---|
| **Intra-state** (biller state == place of supply) | **CGST + SGST**, each = rate ÷ 2 | CGST 9% + SGST 9% |
| **Inter-state** (biller state ≠ place of supply) | **IGST** = full rate | IGST 18% |

**Place of supply for our use case:** renting/maintenance/electricity of immovable property → **place of supply = the property's state** (the society/flat location). So almost all rows are intra-state (CGST+SGST). IGST appears when the biller is registered in a different state than the property — e.g. an NRI/out-of-state landlord billing through a GSTIN in another state. We never hard-code "always CGST+SGST"; we always derive.

**How it's derived & stored:**
- `societies.state_code` (origin / biller state) and `invoices.place_of_supply` (destination state) are both snapshotted at issue. Biller state also comes from `billing_profiles`.
- A pure helper `splitGst(taxableAmount, ratePercent, billerState, placeOfSupply)` returns `{ cgst, sgst, igst }`:
  - if `billerState === placeOfSupply` → `cgst = sgst = taxable × rate/2`, `igst = 0`
  - else → `igst = taxable × rate`, `cgst = sgst = 0`
- The result is written **per line item** and summed into the **invoice header**, and stored in `gst_breakup jsonb = {cgst, sgst, igst}` for backward-compatible reads. Explicit numeric columns (below) make reporting and the PDF straightforward.

**Schema additions for the split** (extends §7 — already reflected there):
- `invoice_line_items`: `cgst_percent, cgst_amount, sgst_percent, sgst_amount, igst_percent, igst_amount`.
- `invoices` (header totals): `cgst_total, sgst_total, igst_total` (= Σ of the line components); `gst_amount = cgst_total + sgst_total + igst_total`.
- `gst_rate_config` already carries `cgst_percent`/`sgst_percent`; `igst_percent` is simply `rate_percent` when inter-state (derived, not a separate row).

**Where it shows up:**
- **PDF (§9):** the tax block renders *either* "CGST @9% … / SGST @9% …" *or* "IGST @18% …" depending on the split — never both.
- **GSTR-1 / 3B (§28):** B2B/B2CS rows and the 3B summary already total CGST/SGST/IGST separately — they read these exact columns.
- Each line can in principle carry a different rate (different HSN/SAC), so the split is computed per line, then aggregated.

Resulting rule table:

| Invoice type | GST applicable | % source |
|---|---|---|
| Rent | If `invoice_type_config.gst_applicable` AND `flats.rent_gst_applicable` AND company GST present | active `gst_rate_config` row for the issue date (§3.1), snapshotted; overridable at generation |
| Maintenance | Never | — |
| Electricity | Never | — |
| Additional charges (§23) | Per `charge_types.gst_applicable` | active `gst_rate_config` row for that charge code/HSN, snapshotted |

---

## 4. Property / Floor / Unit Structure

**Decision: reuse `societies → flats`; model floors as data, not as a table.**

The brief's `Property → Floor → Unit/Cabin → Tenant` maps to:
```
societies (Property/Building)
  └── flats (Unit / Cabin / Shop / Office), grouped by .block + .floor_number
        └── tenants (current_tenant_id → users), via tenants.flat_id
```
- "Floor" is already `flats.floor_number` (+ `block` for wings/towers). A `floors` table adds joins and migration cost with near-zero functional gain. **Do not add it for v1.**
- Multiple floors/units/tenants are naturally supported (many flats per society; tenant history via `flats.occupancy_history` jsonb that already exists).
- Co-working "desks" = treat each billable desk/seat as a `flat` row with `rental_type = coworking`, or bill at the cabin level — admin's choice; the schema supports both.

Only meters require new structure (next section).

---

## 5. Meter Management

New tables: `meters` (master) + `meter_readings` (history). Consumption is derived, never hand-entered.

```
meters
  id              uuid pk
  society_id      uuid → societies        -- tenant-isolation boundary
  flat_id         uuid → flats  NULL      -- NULL ⇒ common/property meter
  scope           text  check (scope in ('unit','common'))
  meter_number    text                    -- physical/serial label
  meter_type      text default 'electricity'  -- future: water, gas
  unit_label      text default 'kWh'
  initial_reading numeric default 0
  is_active       bool default true
  created_at, updated_at

meter_readings
  id              uuid pk
  meter_id        uuid → meters
  reading_date    date
  billing_period  text                    -- 'YYYY-MM' for reconciliation
  previous_reading numeric                -- snapshot of last current_reading
  current_reading numeric                 -- the only value the user enters
  units_consumed  numeric                 -- generated: current − previous (or meter-reset handling)
  is_meter_reset  bool default false       -- true ⇒ consumed = current (rollover/replacement)
  reading_by      uuid → users
  invoice_id      uuid → invoices NULL     -- set once billed (prevents double-billing)
  created_at
  unique (meter_id, billing_period)        -- one reading per meter per month
```

**Workflow (reading → bill):**
1. Admin opens "Meter Readings" for a period; system pre-fills `previous_reading` = last period's `current_reading` (or `initial_reading`).
2. Admin enters only `current_reading`. `units_consumed` is computed (a DB generated column or trigger; trigger needed because of reset handling).
3. On electricity invoice generation, the unbilled reading for that unit+period is picked up, priced via rate config, written as a line item, and `meter_readings.invoice_id` is stamped.
4. **Common meter** consumption is apportioned to units as a separate "Common Area" line — the allocation method is fully configurable (equal / area / occupancy / sub-meter-difference / custom weights); see **§24**.

`meter_type` already supports `water`, `gas`, `generator` etc., so any **metered** additional charge (§23) reuses this exact reading→consumption→billing pipeline — only the rate config and line description differ.

Edge cases designed in: meter reset (`is_meter_reset`), meter replacement (new `meters` row, old deactivated), missed month (gap detection in reading screen), negative consumption blocked.

---

## 6. Rate Configuration (scalable)

One config table that starts flat and grows into slabs/fixed/common — without a schema change.

```
charge_rate_config
  id            uuid pk
  society_id    uuid → societies
  charge_kind   text   -- 'electricity' | 'water' | 'common_area' | 'fixed'
  rate_type     text   -- 'flat' | 'slab' | 'fixed'
  flat_rate     numeric NULL          -- ₹/unit when rate_type='flat'
  fixed_amount  numeric NULL          -- ₹/month when rate_type='fixed'
  slabs         jsonb  NULL           -- [{from:0,to:100,rate:7},{from:101,to:null,rate:9}]
  common_alloc  text   NULL           -- 'equal' | 'area' | 'occupancy' (common-area apportioning)
  effective_from date
  effective_to   date NULL            -- versioned: never edit history, supersede instead
  is_active     bool default true
```

- **Today**: insert one `electricity/flat` row with `flat_rate`. Done.
- **Slab later**: switch `rate_type='slab'`, fill `slabs` jsonb; pricing function reads slabs.
- **Fixed charges / common-area**: add rows with `charge_kind='fixed'` / `'common_area'`; these become extra invoice lines.
- **Versioned by `effective_from/to`** so a mid-year rate change doesn't rewrite past bills.

> **v2 generalization:** `charge_kind` is no longer a hard-coded enum — it references `charge_types.code` (§23), so *any* charge (parking, water, generator, internet…) can carry a flat/slab/fixed rate through this same table. Metered charges additionally link to a `meter_type` (§5).

A single pure pricing function `priceConsumption(charge_rate_config, units) → amount` keeps the math in one place and unit-testable.

---

## 7. Invoice Model

**Decision: one unified `invoices` header + `invoice_line_items` + `payments`, replacing the role of `rent_payments`/`maintenance_payments` (with a migration bridge — §12).** This avoids three parallel billing tables and makes the ledger/GST reports trivial.

```
invoice_series                       -- gapless numbering, per biller+type+FY
  id            uuid pk
  society_id    uuid NULL
  landlord_id   uuid NULL            -- one of society/landlord identifies the biller
  doc_type      text                 -- 'rent'|'maintenance'|'electricity'|'charges'|'credit_note'|'debit_note'
  financial_year text                -- '2026-27'
  prefix        text                 -- e.g. 'RENT','MNT','ELEC','CHG','CRN','DBN'
  next_seq      integer default 1
  unique (society_id, landlord_id, doc_type, financial_year)
  -- Same gapless counter serves invoices AND credit/debit notes (§22).

invoices                             -- HEADER
  id            uuid pk
  invoice_number text unique          -- e.g. 'RENT/2026-27/0042' (assembled atomically)
  invoice_type  text
  society_id    uuid → societies NULL
  landlord_id   uuid → users NULL
  flat_id       uuid → flats
  tenant_id     uuid → tenants NULL    -- nullable: some bills go to owner/landlord, not a tenant
  agreement_id  uuid → agreements NULL
  -- recipient (§19): who is billed — may differ from the occupant
  recipient_type text default 'tenant' -- 'tenant'|'owner'|'landlord'
  recipient_user_id uuid → users
  billing_period text                 -- 'YYYY-MM'
  issue_date    date
  due_date      date
  -- money (all snapshots)
  sub_total     numeric
  gst_percent   numeric default 0     -- effective rate applied (e.g. 18)
  gst_amount    numeric default 0     -- = cgst_total + sgst_total + igst_total
  cgst_total    numeric default 0     -- §3.2 split (intra-state)
  sgst_total    numeric default 0
  igst_total    numeric default 0     -- §3.2 split (inter-state)
  gst_breakup   jsonb NULL            -- {cgst, sgst, igst} — mirror for convenient reads
  total_amount  numeric
  amount_paid   numeric default 0     -- maintained transactionally on payment
  status        text default 'unpaid' -- 'draft'|'unpaid'|'partially_paid'|'paid'|'overdue'|'cancelled'
  -- GST identity snapshot (so re-print is stable)
  biller_gst    text NULL
  recipient_gst text NULL             -- recipient's GSTIN (tenant/owner/landlord); drives B2B in GSTR-1
  place_of_supply text NULL           -- state code; intra vs inter-state ⇒ CGST/SGST vs IGST
  biller_snapshot jsonb               -- name/address/logo at issue time
  -- presentation & collection (v2)
  template_id   uuid → invoice_templates NULL   -- §25 (snapshot of layout used)
  payment_link_id   text NULL          -- Razorpay payment link id (§27)
  payment_link_url  text NULL          -- short_url embedded in PDF/email/WhatsApp
  payment_link_status text NULL        -- 'created'|'paid'|'cancelled'|'expired'
  late_fee_total numeric default 0     -- Σ late-fee line items applied (§21)
  pdf_url       text NULL             -- generated PDF in Supabase Storage
  legacy_ref    text NULL             -- original rent_payments/maintenance_payments id (§12)
  notes         text NULL
  created_by    uuid → users
  created_at, updated_at

invoice_line_items
  id            uuid pk
  invoice_id    uuid → invoices ON DELETE CASCADE
  line_kind     text default 'base'   -- 'base'|'charge'|'late_fee'|'common_area'|'adjustment'
  charge_type_id uuid → charge_types NULL  -- provenance for additional charges (§23)
  description   text                  -- 'Monthly Rent — Aug 2026', 'Electricity 142 kWh @ ₹8'
  hsn_sac       text NULL
  quantity      numeric default 1
  unit_rate     numeric
  line_total    numeric
  gst_applicable bool default false
  gst_percent   numeric default 0     -- effective rate for this line (HSN/SAC may differ)
  gst_amount    numeric default 0     -- = cgst_amount + sgst_amount + igst_amount
  -- §3.2 CGST/SGST/IGST split (one branch is zero depending on place of supply)
  cgst_percent  numeric default 0
  cgst_amount   numeric default 0
  sgst_percent  numeric default 0
  sgst_amount   numeric default 0
  igst_percent  numeric default 0
  igst_amount   numeric default 0
  meter_reading_id uuid → meter_readings NULL  -- electricity provenance
  sort_order    integer

payments                             -- one row per money event; supports partials
  id            uuid pk
  invoice_id    uuid → invoices
  amount        numeric
  payment_date  date
  method        text                  -- 'cash'|'upi'|'bank'|'razorpay'|'payment_link'|'cheque'
  reference     text NULL             -- razorpay_payment_id / UTR / cheque no
  razorpay_order_id text NULL
  payment_link_id   text NULL          -- set when paid via a Razorpay Payment Link (§27)
  receipt_url   text NULL
  status        text default 'confirmed' -- 'pending_verification'|'confirmed'|'rejected'
  recorded_by   uuid → users
  created_at
```

**Status engine** (trigger on `payments` insert/update, or a transactional service function):
```
amount_paid = Σ confirmed payments for invoice
status = paid               if amount_paid >= total_amount
       = partially_paid     if 0 < amount_paid < total_amount
       = unpaid             if amount_paid = 0 and now() <= due_date
       = overdue            if amount_paid < total_amount and now() > due_date
outstanding = total_amount − amount_paid   (derived, exposed via view)
```

**Numbering**: assemble `prefix/FY/zero-padded(next_seq)` inside a transaction that `UPDATE invoice_series SET next_seq = next_seq + 1 ... RETURNING` to guarantee gapless, race-free numbers. Never compute from `count(*)`.

**Invoice statuses** also include `draft` (generated but not issued/sent) and `cancelled` (GST credit-note style — never delete an issued invoice).

---

## 8. Auto Invoice Generation (Scheduler)

### Options evaluated

| Option | Pros | Cons | Fit here |
|---|---|---|---|
| **Vercel Cron → Next route handler** (`/api/cron/*`) | Lives with the app; reuses existing Razorpay/email/WhatsApp Next routes & `lib/*`; one deploy; easy local test | Vercel-hosting-specific; serverless time limits on big batches | **Recommended** |
| Supabase `pg_cron` + Edge Function | DB-native; runs even if web app down; close to data | New runtime (Deno); duplicate notification logic outside `lib/`; no `supabase/functions/` exists today | Good fallback / DB-side jobs |
| External worker (Render/Railway cron) | No platform lock-in; long-running batches | Extra infra to run & pay for | Overkill for v1 |

**Recommendation: Vercel Cron hitting secured Next route handlers**, because every downstream dependency (Razorpay, nodemailer, WhatsApp helpers, Supabase client) already lives in the Next app. Move to `pg_cron` only if/when batches outgrow serverless limits.

### Design
```
vercel.json:
  crons:
    - { path: "/api/cron/generate-rent",        schedule: "0 2 1 * *" }   # 1st, 02:00 UTC
    - { path: "/api/cron/generate-maintenance",  schedule: "0 2 1 * *" }
    - { path: "/api/cron/generate-electricity",  schedule: "0 2 5 * *" }   # 5th
    - { path: "/api/cron/process-reminders",     schedule: "0 3 * * *" }   # daily
    - { path: "/api/cron/mark-overdue",          schedule: "30 0 * * *" }  # daily
```
- Every cron route checks `Authorization: Bearer ${CRON_SECRET}` (Vercel injects this) before doing work — prevents public triggering.
- **Idempotency is mandatory** (cron may fire twice): unique constraint on `(flat_id, invoice_type, billing_period)` for auto-generated invoices; the generator upserts/skips existing.
- **Per-society schedule overrides**: due-day and "auto-generate on/off" stored in `society_config` (`billing.rent_due_day`, `billing.maintenance_due_day`, etc.); the cron iterates eligible societies and respects their config.
- **Batching**: process societies in chunks; each invoice generation writes a row in `invoice_runs` (audit: started_at, type, period, count_created, count_skipped, errors jsonb) so a partial failure is resumable.
- Electricity generation only bills units that have an **unbilled reading** for the period; missing readings are reported (not silently zero-billed).

---

## 9. PDF Generation

**Recommendation: `@react-pdf/renderer`** generated inside a Next route handler (`/api/invoices/[id]/pdf`), output streamed to the client and persisted to Supabase Storage (`invoice_pdfs/{society}/{invoice_number}.pdf`).

| Library | Verdict |
|---|---|
| **@react-pdf/renderer** | ✅ Recommended — pure JS, no headless browser, deploys cleanly on Vercel serverless, React component model fits the codebase, supports images (logo) & custom fonts. |
| Puppeteer / headless Chrome (HTML→PDF) | ❌ Heavy cold starts, exceeds serverless size/time limits on Vercel without special config. |
| pdfmake / jsPDF | △ Workable but imperative; weaker layout control for branded invoices. |

Invoice template includes: company logo (`biller_snapshot`), company GST, recipient GST + place of supply, billing period, line items with HSN/SAC, the **CGST+SGST or IGST breakup** (§3.2 — only the applicable branch is shown), totals, due date, bank/UPI payment details (from `bank_accounts`), and a **QR placeholder** — generate later with `qrcode` (UPI intent string `upi://pay?...` or GST e-invoice IRN QR) and embed as an image; the layout reserves the box now so it's "future ready."

---

## 10. Email & Reminder Notifications

### Provider recommendation
The app already sends via **nodemailer over admin-configured SMTP** (`/api/email/send`). It works and is free, but the route **does not yet support attachments**.

| Option | Pros | Cons |
|---|---|---|
| **Extend existing nodemailer SMTP** (add `attachments[]`) | Zero new dependency/cost; reuses super-admin SMTP config & `lib/email.ts`; nodemailer supports attachments natively | Deliverability depends on the configured SMTP; no built-in analytics |
| **Resend** | Excellent deliverability & DX, React Email templates, attachment support, generous free tier | New dependency + API key; another bill at scale |
| SendGrid | Mature, high volume | Heavier API, more config, weaker DX than Resend |

**Recommendation:** v1 — **extend the existing SMTP route to accept `attachments`** and send the PDF (lowest friction, reuses what's there). Offer **Resend** as a one-flag upgrade for societies needing deliverability/analytics, configured per-platform via `platform_settings`. Either way the call site (`lib/email.ts`) stays the same.

### Notification queue + reminders
```
notification_queue
  id            uuid pk
  channel       text   -- 'email' | 'whatsapp'
  template      text   -- 'invoice_generated' | 'reminder_before' | 'reminder_due' | 'reminder_after' | 'month_end'
  recipient_user_id uuid → users
  invoice_id    uuid → invoices NULL
  payload       jsonb              -- rendered params / attachment refs
  scheduled_for timestamptz
  status        text default 'pending'  -- 'pending'|'sent'|'failed'|'cancelled'
  attempts      integer default 0
  last_error    text NULL
  sent_at       timestamptz NULL
  created_at
  index (status, scheduled_for)

reminder_rules                     -- per biller, configurable cadence
  id, society_id/landlord_id, invoice_type
  days_before   int[]   -- e.g. {3,1}
  on_due_date   bool
  days_after    int[]   -- e.g. {1,3,7}
  month_end_followup bool
  channels      text[]  -- {'email','whatsapp'}
```
- **On invoice generation**: enqueue an `invoice_generated` email (PDF attached) for immediate send.
- **`/api/cron/process-reminders`** (daily): for each unpaid/partially_paid/overdue invoice, materialize due reminder rows per `reminder_rules`, then drain `notification_queue` rows whose `scheduled_for <= now()`, sending via `lib/email.ts` / `lib/whatsapp.ts`. Mark `sent`/`failed` with retry/backoff (cap `attempts`).
- **Idempotency**: unique `(invoice_id, template, scheduled_date)` so a reminder isn't sent twice.
- **WhatsApp**: reuse `lib/whatsapp.ts`; add templates `mrs_invoice_generated`, `mrs_invoice_reminder`, `mrs_invoice_overdue` (Meta-approved). The queue abstraction makes WhatsApp ↔ email symmetric, so **future WhatsApp expansion is just another channel row**, not new plumbing.

---

## 11. Payment Management

- **Online**: reuse Razorpay. Tenant pays → `/api/payment/create-order` (store `razorpay_order_id` against a *pending* `payments` row) → `/api/payment/verify` + `/api/payment/webhook` confirm → insert/confirm `payments` row → status trigger recomputes invoice. Split payout to landlord/society via existing `/api/razorpay-route`.
- **Offline**: admin/landlord records cash/UPI/cheque/bank as a `payments` row (full or partial). Tenant-uploaded proof reuses the existing `receipt_url` + `pending_verification` pattern (already proven in `rent_payments`).
- **Partial payments**: multiple `payments` rows per invoice; status auto-moves to `partially_paid`; outstanding = `total − Σ`.
- **Audit trail**: `payments` is append-only (corrections via reversing entries, not edits); plus existing `audit_logs` (has `changes_json`, `ip_address`) records who/what/when on invoice & payment mutations.

Workflow:
```
Invoice issued (unpaid)
  → tenant pays online  → webhook confirms payment → status recompute
  → or admin records offline payment → status recompute
  → partial → partially_paid (reminders continue on remaining)
  → full → paid (reminders cancelled)
  → past due & unpaid → overdue (cron)
```

---

## 12. Migration Strategy (existing rent/maintenance → invoices)

The riskiest part: `rent_payments` & `maintenance_payments` are live and read by `lib/landlord-data.ts`, dashboards, and reports.

**Phased, non-breaking cutover:**
1. **Add, don't replace.** Create all new tables alongside the old ones. No drops.
2. **Backfill.** One-time script: map each historical `rent_payments`/`maintenance_payments` row → an `invoices` header + single line item + (if paid) a `payments` row. Preserve original ids in `invoices.legacy_ref` for traceability.
3. **Dual-write window.** New code writes to `invoices`; a thin compatibility shim keeps old reads working (or update `lib/landlord-data.ts` to read from a `v_rent_payments`-shaped view over `invoices`).
4. **Cutover reads** page-by-page (landlord rent, tenant payments, admin finance) to the new model behind a feature flag in `society_config` (`billing.invoices_enabled`).
5. **Deprecate** old tables only after a full billing cycle of parity verification; keep them read-only as archive.

All new tables ship with `IF NOT EXISTS` + idempotent SQL in `migrations/` (matches repo convention) and open RLS policies consistent with existing tables — to be tightened in the SaaS phase (§14).

---

## 13. API Design (route handlers)

Mutations run **server-side** in Next route handlers using the service-role Supabase client (`lib/supabase-admin.ts`) so money logic isn't in the browser. Read-heavy listing can stay in `lib/*-data.ts` like the rest of the app.

```
# Config
GET/PUT  /api/billing/profile                 # billing_profiles (company GST, logo, address)
GET/PUT  /api/billing/gst-config              # invoice_type_config (applicable + recipient defaults)
GET/POST /api/billing/gst-rates               # gst_rate_config — list + add-new-version (§3.1, never edits history)
GET/PUT  /api/billing/rates                   # charge_rate_config (versioned)
GET/POST/PATCH/DELETE /api/billing/charge-types        # charge_types catalog (§23)
GET/POST/PATCH         /api/billing/unit-charges       # unit_recurring_charges (§23)
GET/POST/PATCH/DELETE /api/billing/late-fee-rules      # late_fee_rules (§21)
GET/POST/PATCH         /api/billing/reminder-rules      # reminder_rules (§10)
GET/POST/PATCH/DELETE /api/billing/templates           # invoice_templates designer (§25)

# Meters
GET/POST/PATCH/DELETE /api/meters
GET/POST              /api/meters/[id]/readings       # enter current reading
GET                   /api/meters/readings?period=YYYY-MM   # reading sheet (pre-filled prev)
GET/PUT               /api/meters/[id]/common-config   # common_meter_config + weights (§24)

# Invoices
POST  /api/invoices                           # manual create (any type)
POST  /api/invoices/generate                  # manual run of a type for a period (society/flat scope)
GET   /api/invoices?filters...                # list (status, type, period, flat, recipient)
GET   /api/invoices/[id]
PATCH /api/invoices/[id]                       # draft edits / cancel (→ credit note)
GET   /api/invoices/[id]/pdf                   # render + cache PDF (template-driven, §25)
POST  /api/invoices/[id]/send                  # (re)send — channels: email (PDF attached) and/or WhatsApp (§26)

# Credit / Debit notes (§22)
POST  /api/invoices/[id]/notes                 # issue credit/debit note against an invoice
GET   /api/notes/[id] | /api/notes/[id]/pdf

# Security deposit ledger (§20)
GET   /api/deposits?agreement=…                # ledger + current balance
POST  /api/deposits/[agreement]/entries        # deduction / interest / refund / adjustment

# Payments
POST  /api/invoices/[id]/payments              # record offline / confirm
POST  /api/payment/create-order                # (exists) extend for invoice context
POST  /api/payment/create-link                 # Razorpay Payment Link for an invoice (§27)
# webhook/verify (exist) → handle payment_link.paid → confirm payments → status recompute

# Cron (secured by CRON_SECRET)
POST  /api/cron/generate-rent | generate-maintenance | generate-electricity | generate-charges
POST  /api/cron/apply-late-fees                # daily penalty accrual (§21)
POST  /api/cron/process-reminders | mark-overdue

# Reports
GET   /api/reports/outstanding | collection | revenue | ledger | consumption | gst
GET   /api/reports/gstr1?period=&format=json|csv     # GSTR-1 sections (§28)
GET   /api/reports/gstr3b?period=&format=json|csv    # GSTR-3B summary (§28)
```

---

## 14. UI Screens

**Society Admin / Landlord**
- Billing Settings: company GST & logo, applicable-GST per type, default recipient per type, due-days, auto-gen toggles.
- **GST Rates** (§3.1): current rate(s) with a clear "Change rate" action that creates a new effective-dated version; history list showing every past rate and its date range (read-only).
- Rate Config: electricity rate (flat now; slab editor later); **Charge Types catalog** + per-unit recurring-charge assignment (parking/water/generator/internet…) (§23).
- **Late Fee Rules** (§21): grace days, flat/%/per-day, cap, waive action.
- Meters: meter master (per unit + common); Reading Sheet (period grid, enter current reading, see consumption); **Common-meter allocation config** (method + scope + custom weights) (§24).
- **Invoice Template Designer** (§25): form-based branding (logo, colours, terms, footer, toggles) with live PDF preview; set default per type.
- Reminder Rules (§10): cadence + channels (email/WhatsApp).
- Invoices: list (filters by type/status/period/flat/**recipient**), detail + PDF preview, "Generate now", manual invoice, record payment, **send via WhatsApp**, **create payment link**, cancel (→ credit note).
- **Credit/Debit Notes** (§22): issue against an invoice, list, PDF.
- **Security Deposit Ledger** (§20): per-agreement balance, add deduction/interest/refund, statement.
- Payments: collection inbox (verify uploaded receipts), payment history.
- Reports: outstanding/collection/revenue/ledger/consumption/GST + **GSTR-1 & GSTR-3B** screens with period selector and CSV/JSON export (§28).

**Tenant / Owner / Landlord (recipient)** (extend existing `/tenant/payments`)
- My Invoices (all types), invoice detail, download PDF, **pay via Razorpay or one-tap payment link**, upload offline proof, my **party ledger** (§22) incl. credit/debit notes, my deposit balance.

**Super Admin**
- Platform billing defaults (SMTP/Resend, **default GST rate version**, plan-gated feature flags).

---

## 15. Reporting Architecture

Implement as **PostgreSQL views** (and a couple of SQL functions for parameterized ranges) over `invoices`/`payments`/`meter_readings`, queried by `lib/billing-reports.ts`. Views keep logic in the DB, are cheap to add, and reuse the unified model.

| Report | Source |
|---|---|
| Outstanding | `invoices` where status ∈ (unpaid, partially_paid, overdue): `Σ outstanding` by tenant/flat/property |
| Collection | `payments` grouped by period/method/property |
| Property-wise revenue | `invoices` joined `flats→societies`, grouped by society & month |
| Party ledger | per **recipient** (tenant/owner/landlord) chronological invoices + payments + credit/debit notes + running balance (§22) |
| Electricity consumption | `meter_readings` units_consumed by meter/flat/period |
| GST report | `invoice_line_items` where `gst_applicable`, grouped by period with CGST/SGST/IGST + HSN/SAC |
| **GSTR-1** (§28) | B2B / B2CS / HSN-summary / CDNR sections from invoices + `adjustment_notes` |
| **GSTR-3B summary** (§28) | period aggregate of taxable value + CGST/SGST/IGST payable, net of notes |

Heavy reports can be materialized + refreshed by a nightly cron if volume grows.

---

## 16. SaaS / Multi-Tenant & Security

**Current state:** isolation is **app-level** (`society_id` / `owner_id` filters); RLS is effectively open; auth is MockAuth (`localStorage`), not Supabase Auth. This is fine for the current trusted-admin model but is **not** true tenant isolation.

**Design for the future, ship pragmatically now:**
1. **v1 (this module):** every new table carries `society_id` (and/or `landlord_id`) and all access goes through scoping helpers (mirroring `getLandlordUserId`/`getLandlordSocietyId`). Mutations run server-side with the service-role key, never trusting client-supplied scope. Keep open RLS to match existing tables — but **centralize scope enforcement** so it's one place to harden.
2. **SaaS hardening (separate initiative, design-compatible):**
   - Introduce an `organizations` table; `society_id`/`landlord_id` already serve as the tenant key, so add `org_id` as the umbrella and backfill.
   - Migrate auth to **Supabase Auth** so RLS can use `auth.uid()` / JWT `org_id` claim.
   - Replace `open_access` policies with **real RLS**: `USING (society_id IN (SELECT society_id FROM society_members WHERE user_id = auth.uid()))` etc. Billing tables are the highest-value target for this (money + GST + PII).
   - Plan-gate billing features via existing `subscriptions` / `subscription-limits`.

**Security specifics for billing:**
- Cron routes gated by `CRON_SECRET`.
- Razorpay webhook signature already verified — extend to invoice-payment confirmation.
- Invoice numbers immutable & gapless; issued invoices never deleted (cancel via status + credit note) — GST audit requirement.
- PDF files in a non-public Storage bucket, served via signed URLs.
- All money mutations server-side + written to `audit_logs` (who/IP/changes).
- GST numbers/PAN are PII → restrict in reports/exports by role.

---

## 17. Development Phases

| Phase | Scope | Exit criteria |
|---|---|---|
| **P0 — Foundations** | `billing_profiles`, GST config, `invoice_type_config`, `flats.rental_type` + `tenants.gst_number`; migrations + scoping helpers | Config screens save; no billing yet |
| **P0.5 — Onboarding & setup wizard** (§§29–37) | `getSetupProgress()` engine + `onboarding_state`; Setup Progress Card, alerts, stats row on `/landlord` & `/admin`; smart Continue; `validateBillingReadiness()`; CSV/Excel import (flats/tenants/owners) + `import_jobs`; `societies.registration_number`, optional `society_blocks` | New user is guided to 100%; billing hard-gated on dependencies; bulk import works |
| **P1 — Invoices core** | `invoice_series`, `invoices`, `invoice_line_items`, `payments`, status engine, numbering, manual rent invoice + record payment | Create a rent invoice end-to-end, record full/partial, status correct |
| **P2 — PDF + Email** | `@react-pdf/renderer` template, Storage, extend SMTP route for attachments, send-on-generate | Branded GST PDF emailed with attachment |
| **P3 — Meters & Electricity** | `meters`, `meter_readings`, `charge_rate_config` (flat), electricity invoice generation | Reading → priced electricity invoice with provenance |
| **P4 — Automation** | Vercel Cron routes, `invoice_runs`, idempotent monthly generation, `mark-overdue` | Rent/maint on 1st, electricity on 5th, auto + idempotent |
| **P5 — Reminders** | `notification_queue`, `reminder_rules`, `process-reminders` cron, WhatsApp templates | Before/on/after/month-end reminders fire across email+WhatsApp |
| **P6 — Reports** | 6 report views + UI + export | All six reports accurate vs. raw data |
| **P7 — Migration & cutover** | Backfill legacy rent/maintenance, dual-write, flag-gated read cutover | Parity verified one full cycle; legacy archived |
| **P8 — SaaS hardening** *(optional/parallel)* | org model, Supabase Auth, real RLS on billing | Cross-tenant access provably blocked |

### v2 enhancement phases (build on P1–P6; can interleave)

| Phase | Scope | Exit criteria |
|---|---|---|
| **P1.5 — Recipient types, editable GST rates & CGST/SGST/IGST split** | `recipient_type`/`recipient_user_id` resolution (§19); versioned `gst_rate_config` + "change rate" UI (§3.1); `splitGst()` + per-line CGST/SGST/IGST columns + `state_code`/`place_of_supply` (§3.2) | Maintenance bills the owner; admin changes 18%→x affecting only new invoices; intra-state invoice shows CGST+SGST, inter-state shows IGST |
| **P3.5 — Additional charges & common-meter allocation** | `charge_types`, `unit_recurring_charges` (§23); `common_meter_config`/weights + 5 methods (§24) | Parking/water/etc. on invoices; common load apportioned per chosen method |
| **P4.5 — Late fee engine** | `late_fee_rules`, `apply-late-fees` cron, waiver (§21) | Overdue invoices accrue capped, idempotent penalties; waiver leaves audit trail |
| **P5.5 — Template designer, WhatsApp PDF, payment links** | `invoice_templates` + designer UI (§25); WhatsApp document delivery (§26); Razorpay Payment Links (§27) | Branded PDF; invoice delivered on WhatsApp; one-tap link payment reconciled via webhook |
| **P6.5 — Deposit ledger & credit/debit notes** | `deposit_ledger` + statements (§20); `adjustment_notes`/items + party-ledger view (§22) | Deposit collect→deduct→refund tracked; credit/debit notes adjust ledger |
| **P6.6 — GST returns** | `gstr1`/`gstr3b` views + report UI + export (§28) | GSTR-1 sections & GSTR-3B summary match raw data; CSV/JSON export |

---

## 18. Risks & Recommendations

| Risk | Impact | Mitigation |
|---|---|---|
| Duplicate billing tables (`rent_payments` vs `invoices`) drift | Data inconsistency, double reporting | **Unify into `invoices`** + phased migration (§12); never run both as sources of truth |
| Cron double-firing / serverless timeout | Duplicate or partial invoices | Idempotent unique keys + `invoice_runs` audit + chunked batches; fall back to `pg_cron` if batches grow |
| Non-gapless / mutable invoice numbers | GST non-compliance | Atomic `invoice_series` counter; immutable issued invoices; cancel via credit note |
| GST rate changes rewriting old invoices | Legal/audit failure | Snapshot `gst_percent`/`gst_amount`/biller identity onto invoice at issue |
| Open RLS + MockAuth in a SaaS | Cross-tenant data leak | Centralize scope now; real RLS + Supabase Auth in P8 before true multi-tenant launch |
| SMTP deliverability for invoices | Tenants miss bills | Extend SMTP now; offer Resend; reminders via WhatsApp as backstop |
| Meter reset / missed readings | Wrong electricity bills | `is_meter_reset` flag, gap detection, block negative consumption, never zero-bill silently |
| Common-meter apportioning disputes | Tenant trust | Configurable `common_meter_config` method (§24), shown as its own labelled line; rounding reconciled to total |
| PDF lib choice (Puppeteer) breaking on Vercel | Generation failures | Use `@react-pdf/renderer` (no headless browser) |
| Next.js 16 API differences | Build/runtime breakage | Read `node_modules/next/dist/docs/` before coding route handlers/cron (per AGENTS.md) |
| Wrong CGST/SGST vs IGST split | GST mis-filing, ITC mismatch for B2B tenants | Derive from `place_of_supply` vs biller state at issue; snapshot the split per line (§3.2); validate in GSTR-1 |
| Editing a GST rate in place | Past invoices silently change → audit failure | `gst_rate_config` is effective-dated & append-only; never UPDATE a live row, always supersede (§3.1) |
| Late-fee double-charging on cron re-run | Tenant over-billed | Idempotent keys per (invoice, accrual date); per-day upsert not insert (§21) |
| Credit/debit notes missing from GST return | Under/over-reported tax | CDNR section sourced from `adjustment_notes`; 3B summary nets notes (§28) |
| Deposit ledger balance drift | Refund disputes | Append-only entries + derived balance cross-checked against `balance_after`; reversing adjustments only (§20) |
| Payment-link / webhook double-credit | Inflated collection | Match by `notes.invoice_id`, dedupe on `payment_link_id`; verify Razorpay signature (§27) |
| Template free-text injection | Malformed/abusive PDFs | Sanitize `header/footer/terms` on save; rendered by `@react-pdf/renderer`, not a browser (§25) |

### Top recommendations
1. **Unify billing into `invoices`/`payments`** — do not extend `rent_payments`/`maintenance_payments` further; migrate them in.
2. **Rental type on the unit**, society-level default only.
3. **Snapshot GST & biller identity** onto every invoice; drive GST from `invoice_type_config` + per-unit flag.
4. **Vercel Cron + idempotent generators + `invoice_runs`** for scheduling.
5. **`@react-pdf/renderer`** for PDFs; **extend existing SMTP** for attachments (Resend optional).
6. **Notification queue** abstraction so WhatsApp is just another channel.
7. **Design multi-tenant keys now, enforce real RLS in a dedicated SaaS phase.**

---

# Part II — v2 Enhancements

These ten features extend Part I **without breaking it**: they reuse the unified `invoices`/`payments` core, the existing meter/rate pipeline, the notification queue, and the live Razorpay/email/WhatsApp infra. New tables are additive; touched core columns were already introduced above (§7).

---

## 19. Recipient Types (Tenant / Owner / Landlord)

**Problem:** invoices today implicitly target the tenant. In reality maintenance is often billed to the **owner**, society dues to the **landlord**, and rent/electricity to the **tenant/consumer**.

**Design:** the invoice already carries `recipient_type` + `recipient_user_id` + `recipient_gst` (§7). Resolution is config-driven, not hard-coded:
- Add `default_recipient_type` to `invoice_type_config` (§3). Seed: rent → `tenant`, electricity → `tenant`, maintenance → `owner`, charges → `tenant` (overridable per society/charge).
- At generation, the recipient is resolved: `owner` ⇒ `flats.owner_id`; `tenant` ⇒ `flats.current_tenant_id`; `landlord` ⇒ `agreements.landlord_id`. The resolved user's name/GST is **snapshotted** onto the invoice.
- GSTIN for GSTR-1 B2B classification (§28) comes from `recipient_gst` regardless of recipient type — owners and landlords can be B2B too.
- Tenant ledger (§15) generalizes to a **party ledger** keyed on `recipient_user_id`, so owners/landlords get statements too.

No new table; only the seed rows in `invoice_type_config` and the resolution helper.

---

## 20. Security Deposit Ledger

**Decision: a dedicated append-only `deposit_ledger` (one ledger per agreement), seeded from `agreements.security_deposit`.** Deposits are not invoices (no GST, not "income"), so they live in their own ledger but can *settle against* invoices.

```
deposit_ledger
  id            uuid pk
  society_id    uuid → societies NULL
  landlord_id   uuid → users NULL
  flat_id       uuid → flats
  tenant_id     uuid → tenants
  agreement_id  uuid → agreements
  entry_type    text  -- 'collected'|'deduction'|'interest'|'refund'|'adjustment'|'forfeit'
  amount        numeric            -- signed: +collected/+interest, −deduction/−refund/−forfeit
  balance_after numeric            -- running balance, maintained transactionally
  reason        text
  linked_invoice_id uuid → invoices NULL   -- deduction applied to an unpaid invoice
  linked_payment_id uuid → payments NULL   -- refund disbursement record
  entry_date    date
  created_by    uuid → users
  created_at
  index (agreement_id, entry_date)
```

**Workflow & rules:**
- On agreement activation, seed a `collected` entry = `agreements.security_deposit`.
- **Deduction against unpaid dues at move-out:** create a `deduction` entry `linked_invoice_id` and mark that invoice settled-by-deposit (a `payments` row with `method='deposit_adjustment'`). Keeps the invoice ledger truthful.
- **Interest** (some states mandate it) added as periodic `interest` entries.
- **Refund** at exit = `refund` entry + a `payments`-style disbursement (or Razorpay payout via existing route).
- Balance is derived (`Σ amount`) and also written to `balance_after` for fast display; a `v_deposit_balance` view exposes current balance per agreement/flat.
- Append-only; corrections via reversing `adjustment` entries (never edit) — full audit trail.

---

## 21. Late Fee & Penalty Engine

**Decision: rule-based, applied by a daily cron as `late_fee` line items on the overdue invoice (idempotent), with waiver support.**

```
late_fee_rules
  id            uuid pk
  society_id    uuid → societies NULL
  landlord_id   uuid → users NULL
  invoice_type  text                 -- specific type or 'all'
  grace_days    integer default 0    -- days after due_date before any fee
  fee_type      text                 -- 'flat'|'percent_outstanding'|'per_day'
  fee_value     numeric              -- ₹ (flat/per_day) or % (percent_outstanding)
  max_fee       numeric NULL         -- cap per invoice
  compounding   bool default false   -- per_day: charge each overdue day
  is_active     bool default true
  effective_from date, effective_to date NULL
```

**Application (`/api/cron/apply-late-fees`, daily):**
1. Find invoices `status='overdue'` past `due_date + grace_days`.
2. Compute fee from the matching active rule (snapshot the rule onto the line).
3. Insert/extend a `line_kind='late_fee'` line item; recompute totals; update `invoices.late_fee_total`.
4. **Idempotency:** for `flat`/`percent` apply once (unique `(invoice_id,'late_fee')`); for `per_day` upsert one accruing line keyed by `(invoice_id, accrual_through_date)` so re-runs don't double-charge.
5. **Late fees are GST-exempt by default** (penalty, not supply) — configurable, but seeded off.
6. **Waiver:** admin action writes a reversing `adjustment` line (or a credit note, §22) and logs to `audit_logs`; the rule snapshot proves what was waived.

Reminders (§10) and the engine cooperate: a fresh late fee re-triggers an `reminder_after` notification noting the penalty.

---

## 22. Credit & Debit Note Management

**Decision: a single `adjustment_notes` table (+ `adjustment_note_items`) that references the original invoice; numbered via the shared `invoice_series` (`CRN`/`DBN`).** GST-compliant: notes adjust an already-issued invoice instead of editing it.

```
adjustment_notes
  id            uuid pk
  note_number   text unique           -- 'CRN/2026-27/0007'
  note_type     text                  -- 'credit'|'debit'
  invoice_id    uuid → invoices        -- original document
  society_id/landlord_id, flat_id, recipient_type, recipient_user_id
  reason        text                   -- 'overbilling'|'waiver'|'vacancy'|'rate_correction'|'damage'…
  sub_total, gst_percent, gst_amount, gst_breakup jsonb, total_amount numeric
  biller_gst, recipient_gst text
  status        text default 'issued'  -- 'draft'|'issued'|'cancelled'
  pdf_url       text NULL
  created_by    uuid → users, created_at

adjustment_note_items   -- mirrors invoice_line_items (description, hsn_sac, qty, rate, gst…)
```

**Semantics:**
- **Credit note** ↓ receivable: overbilling, post-billing waiver, mid-month vacancy, GST rate correction downward. Reduces the party ledger and feeds GSTR-1 **CDNR**.
- **Debit note** ↑ receivable: undercharge, extra consumption found later.
- **Cancelling an issued invoice** (which must never be deleted, §7/§16) is implemented as a **full-value credit note** — preserving the gapless invoice series.
- Notes carry their own GST breakup so GST returns net them correctly.
- A `v_party_ledger` view unions invoices (+), payments (−), credit notes (−), debit notes (+) into a running balance.

---

## 23. Additional Charge Types (Parking, Water, Generator, Internet…)

**Decision: a `charge_types` master (catalog) + `unit_recurring_charges` (per-unit assignment); these flow into invoices as `line_kind='charge'` line items.** No new invoice type is forced — charges can ride on the maintenance invoice or a dedicated `charges` invoice (society's choice).

```
charge_types                          -- catalog per biller
  id            uuid pk
  society_id/landlord_id
  code          text                  -- 'parking'|'water'|'generator'|'internet'|'club'|'sinking_fund'|…
  name          text
  default_amount numeric NULL
  billing_frequency text              -- 'monthly'|'quarterly'|'one_time'
  is_metered    bool default false    -- true ⇒ priced via meter reading + charge_rate_config
  meter_type    text NULL             -- links to meters.meter_type when metered (water/generator…)
  gst_applicable bool default false
  default_gst_percent numeric default 0
  hsn_sac       text NULL
  default_recipient_type text default 'tenant'
  is_active     bool default true

unit_recurring_charges                -- assign a charge to a unit (and optionally a tenant)
  id            uuid pk
  flat_id       uuid → flats
  tenant_id     uuid → tenants NULL
  charge_type_id uuid → charge_types
  amount_override numeric NULL        -- overrides charge_types.default_amount for this unit
  start_period  text                  -- 'YYYY-MM'
  end_period    text NULL
  is_active     bool default true
  unique (flat_id, charge_type_id, start_period)
```

**Behaviour:**
- **Fixed charges** (parking, internet, club): generator picks active `unit_recurring_charges` for the period → one line item each, with that charge's GST flag.
- **Metered charges** (sub-metered water/generator): reuse the §5 pipeline — a `meters` row with the matching `meter_type`, priced via `charge_rate_config` (§6) keyed by `charge_kind = charge_types.code`.
- GST is per charge type (e.g. parking may be taxable, water exempt) — fully independent of the rent/maintenance/electricity rules, satisfying the original "maintenance & electricity no GST" while allowing taxable add-ons.
- Seed common Indian catalog: parking, water, generator/DG, internet, club/amenity, sinking fund, common-area maintenance (CAM).

---

## 24. Configurable Common-Meter Allocation

**Decision: per-common-meter allocation config with five methods, producing one apportioned `line_kind='common_area'` line per beneficiary unit.**

```
common_meter_config
  id            uuid pk
  meter_id      uuid → meters          -- the common/property meter
  allocation_method text              -- 'equal'|'area_sqft'|'occupancy'|'submeter_diff'|'custom_weight'
  scope         text                  -- 'society'|'block'|'floor'|'custom' (which units share it)
  scope_value   text NULL             -- block/floor identifier when scoped
  is_active     bool default true

common_meter_weights                  -- only for 'custom_weight'
  id, common_meter_config_id → common_meter_config, flat_id → flats, weight numeric
```

**Methods:**
| Method | Per-unit share |
|---|---|
| `equal` | total ÷ number of included units |
| `area_sqft` | proportional to `flats.area_sqft` |
| `occupancy` | proportional to resident headcount (from tenant/occupancy data) |
| `submeter_diff` | common load = common reading − Σ unit sub-meter consumption, then apportioned by a chosen base (equal/area) — captures true shared loss/usage |
| `custom_weight` | proportional to admin-set `common_meter_weights` |

- `scope` controls **who shares** a common meter — whole society, a block/wing, or a floor (e.g. one DG per tower), or a hand-picked custom set.
- The allocation engine is a pure function `allocateCommon(config, commonConsumption, units) → {flat_id, share}[]`, unit-testable, with rounding reconciliation so shares sum exactly to the total.
- Each share appears as its own labelled line ("Common Area Electricity — equal share") for tenant transparency (mitigates disputes, §18).

---

## 25. Invoice Template Designer

**Decision: per-biller `invoice_templates` holding a JSON layout config; the `@react-pdf/renderer` template (§9) is config-driven; admin UI is a form-based designer with live preview (not free-form drag-drop in v1).**

```
invoice_templates
  id            uuid pk
  society_id/landlord_id
  name          text
  is_default    bool default false
  applies_to    text default 'all'    -- 'all' or a specific invoice_type
  config        jsonb                  -- see below
  created_at, updated_at

config = {
  theme_color, accent_color,
  logo_url, signature_url,
  show_qr, show_hsn, show_bank_details, show_upi,
  header_note, footer_note, terms_and_conditions,
  number_format,                       -- prefix/series display
  columns: [ ...which line columns to show ],
  font, paper_size
}
```

- `invoices.template_id` snapshots the template used, so re-printing an old invoice is stable even after the template changes (consistent with the §7 snapshot philosophy).
- Resolution: invoice → its `template_id` → else the biller's `applies_to=invoice_type` default → else `is_default` → else system default.
- **Security:** `header_note`/`footer_note`/`terms` are rendered by `@react-pdf/renderer` (not a browser), so HTML injection isn't executed; still sanitize/strip tags on save (§18).
- v2-later: a true drag-drop designer can populate the same `config` jsonb — no schema change.

---

## 26. WhatsApp PDF Invoice Delivery

**Decision: send the invoice PDF as a WhatsApp *document message* via the existing Meta Cloud API route, using a signed Supabase Storage URL.** This is a new **channel behaviour**, not new plumbing — the `notification_queue` (§10) already abstracts channels.

- Extend `lib/whatsapp.ts` with `sendInvoiceDocument({ phone, pdfUrl, fileName, caption })` and add an approved template `mrs_invoice_doc` with a **document header** (Meta requires media in template headers, or a free-form document message inside the 24-hour service window).
- Extend `/api/whatsapp/send` to accept `type: 'document'` with `{ link, filename, caption }`. Two delivery modes:
  1. **Link mode** (recommended): pass a **signed Storage URL** (short TTL) to the PDF — no media upload step.
  2. **Media-id mode**: upload PDF to Meta `/media` first, then reference `media_id` (needed if templates require uploaded media).
- The queue row carries `payload.attachment_url`; `process-reminders`/send routes the `whatsapp`+document template to `sendInvoiceDocument`.
- Falls back silently (like all WhatsApp helpers today) if not configured; email remains the guaranteed channel.

---

## 27. Razorpay Payment Link Integration

**Decision: generate a Razorpay **Payment Link** per invoice via a new `/api/payment/create-link`, store `payment_link_url` on the invoice, embed it in PDF/email/WhatsApp, and confirm via the existing webhook.** Reuses current Razorpay keys, signature verification, and (for splits) the `/api/razorpay-route` transfer flow.

**Flow:**
1. On issue (or on demand), `POST /api/payment/create-link` calls Razorpay Payment Links API with `amount = outstanding`, `description`, customer (recipient name/phone/email), and `notes: { invoice_id }`. Store `payment_link_id`, `payment_link_url`, `payment_link_status='created'` on the invoice.
2. The link's `short_url` is rendered into the invoice PDF (next to the QR box, §9), the email CTA, and the WhatsApp message.
3. Tenant pays via the hosted link (UPI/card/netbanking) — no in-app checkout needed.
4. **Razorpay webhook** (`payment_link.paid`) → match by `notes.invoice_id` → insert a confirmed `payments` row (`method='payment_link'`, `payment_link_id`) → status engine recomputes → reminders cancelled, receipt sent. Signature verification reuses existing webhook security (§16).
5. Partial-friendly: on partial outstanding, a fresh link is generated for the remaining balance.
6. Settlement to landlord/society via existing Razorpay Route transfers.

This complements (doesn't replace) the existing in-app `create-order` checkout — links are for "pay from the invoice/WhatsApp" without logging in.

---

## 28. GST Return Support (GSTR-1 & GSTR-3B Summary)

**Decision: PostgreSQL views over `invoices` + `invoice_line_items` + `adjustment_notes`, exposed as report endpoints, producing GSTR-1 sections and a GSTR-3B summary with CSV/JSON export.** We provide **return-ready summaries and exports**; actual filing happens via the government portal / a GSP (out of scope, but the export matches their shapes).

**GSTR-1 (outward supplies)** — built only from GST-applicable lines (rent with GST, taxable additional charges):
| Section | Definition |
|---|---|
| **B2B** | invoices where `recipient_gst` present — grouped by recipient GSTIN, rate, taxable value, CGST/SGST/IGST |
| **B2CS** | recipient without GSTIN — grouped by place-of-supply + rate |
| **HSN Summary** | grouped by `hsn_sac` + rate: qty, taxable value, tax |
| **CDNR** | credit/debit notes (§22) against B2B invoices |
| **Docs issued** | invoice & note number ranges from `invoice_series` (gapless proof) |

**GSTR-3B summary** — aggregate for the period: total taxable outward supply, and total CGST / SGST / IGST payable (net of credit/debit notes). Output as a one-screen summary plus downloadable file.

- **Place of supply** (`invoices.place_of_supply`) decides intra-state (CGST+SGST) vs inter-state (IGST) — derived from biller state vs recipient state at issue, snapshotted.
- Period selector supports monthly and quarterly (QRMP) filing.
- Routes: `GET /api/reports/gstr1?period=`, `GET /api/reports/gstr3b?period=`, each with `?format=json|csv`.
- Reuses the GST snapshots on invoices/lines (§3) so returns are reproducible and never shift if rates change later.

---

# Part III — Guided Setup Wizard & Onboarding Dashboard

A new account is useless until it has a property, units, people, a bank account and billing config. This part turns that cold start into a **guided, percentage-tracked workflow** that lives on the dashboard and feeds the billing dependency checks. It reuses existing entities (`societies`, `flats`, `tenants`, `agreements`, `bank_accounts`, `society_members`, `society_config`) — no parallel data is introduced for "what exists."

---

## 29. Onboarding — Functional Design

**Goal:** after signup the dashboard shows a **Setup Progress Card** that tells the user, at a glance, what's done, what's pending, and the single next action — with a **Continue Setup** button that jumps straight to the next incomplete step. A **Setup Completion %** is shown everywhere onboarding is surfaced.

Two distinct flows (different entities, roles, vocabulary):
- **Landlord** — profile → property → unit → tenant → agreement → bank → billing.
- **Society / Apartment management** — society → blocks → flats → owners → assign owners → bank → maintenance billing.

The flow is **resumable** (close the browser, come back, continue), **skippable** for optional steps, and **non-blocking** (the user can explore the app; required actions are nudged, not forced) — except that **invoice generation is hard-gated** by the dependency check (§35).

Onboarding integrates with what already exists: signup (`app/signup`, `select-plan`, `checkout`), the `subscriptions` trial, the landlord (`/landlord/*`) and society-admin (`/admin/*`) modules, and MockAuth (`mrs_user`). The wizard simply orchestrates the existing create-flows.

---

## 30. Setup Status Engine — recommended approach

**Decision: a *hybrid* — derive each step's completion LIVE from the real data (single source of truth); persist only the small amount of UX state that can't be derived.** A purely stored `setup_status` table would drift (it could say "Tenant added ✓" after the tenant row was deleted). A purely computed model can't remember "user dismissed this alert" or "skipped the optional meter step." So:

- **Derived (not stored):** every step's `completed` flag comes from cheap `EXISTS`/`COUNT` checks against existing tables (e.g. *flats exist for this owner*, *an active agreement exists*). Always accurate, no migration of truth.
- **Persisted (new, tiny table):** wizard markers, dismissed alerts, skipped optional steps, and a **cached percentage** for instant dashboard paint.

```
onboarding_state
  user_id       uuid pk → users
  user_type     text          -- 'landlord' | 'society'
  society_id    uuid → societies NULL   -- for society admins
  started_at    timestamptz default now()
  completed_at  timestamptz NULL         -- set when % first hits 100
  last_step     text NULL                -- where "Continue" resumes
  skipped_steps text[] default '{}'      -- optional steps user chose to skip
  dismissed_alerts text[] default '{}'   -- alert keys the user closed
  cached_percent integer default 0       -- fast paint; recomputed on load/mutation
  cached_steps  jsonb NULL               -- snapshot of step states for the widget
  updated_at    timestamptz default now()
```

**Three states per step**, exactly as required:
- `not_started` — the underlying check is false and no sub-data exists.
- `in_progress` — partial (e.g. flats exist but none has an owner assigned; profile half-filled).
- `completed` — the check passes.

**Server function** `getSetupProgress(user) → { percent, nextStepHref, steps[] }`, where each `step = { key, title, status, required, href, hint }`. Percentage = `completed_required_steps / total_required_steps` (optional/skipped steps excluded from the denominator). The function reads `onboarding_state` for skips/dismissals, runs the EXISTS checks, recomputes `cached_percent`, and returns the list. This single function powers the card, the alerts, the Continue button, and the stats `Setup Completion %`.

---

## 31. Landlord Setup Flow

Each step maps to an existing create-flow; "completed" is a live check. (`property` for a landlord reuses a `societies` row as the building — consistent with §0/§4 where *societies = property*; `property_type` uses `societies.default_rental_type`.)

| # | Step | Completion check (live) | Route | Required |
|---|---|---|---|---|
| 1 | Profile Information (name, mobile, email) | `users` row has name + phone + email | `/landlord/settings` | ✓ |
| 2 | Add Property (name, type, address) | ≥1 `societies` building linked to landlord (or ≥1 flat with a property) | `/landlord/properties` | ✓ |
| 3 | Add Unit / Flat / Shop | ≥1 `flats` where `owner_id = landlord` | `/landlord/properties` (add flat) | ✓ |
| 4 | Add Tenant | ≥1 `tenants` on an owned flat | `/landlord/tenants` | ✓ |
| 5 | Create Agreement | ≥1 `agreements` with `landlord_id` (status active) | `/landlord/agreements` | ✓ |
| 6 | Add Bank Account | `bank_accounts` row `entity_type='landlord'` for this user | `/landlord/settings` (bank) | ✓ |
| 7 | Setup Billing (rent due date, GST, invoice number format) | `billing_profiles` row + `society_config`/profile billing keys set (`billing.rent_due_day`, GST applicability, series prefix) | `/landlord/settings` (billing) | ✓ |
| 8 | Complete | all required steps done → `onboarding_state.completed_at` set | dashboard | — |

Bank fields reuse the existing `bank_accounts` table exactly: Account Holder Name, Account Number, IFSC, GST Number (optional), PAN Number.

---

## 32. Society / Apartment Setup Flow

| # | Step | Completion check (live) | Route | Required |
|---|---|---|---|---|
| 1 | Society Information (name, address, registration no., GST) | `societies` row complete + `societies.registration_number` set + GST on `billing_profiles` | `/admin/settings` | ✓ |
| 2 | Add Blocks / Wings | ≥1 distinct `flats.block` (or ≥1 `society_blocks` row, see below) | `/admin/flats` (blocks) | optional |
| 3 | Add Flats (A-101, A-102…) | ≥1 `flats` for the society | `/admin/flats` | ✓ |
| 4 | Add Landlords / Owners | ≥1 `society_members` with `role='landlord'` (or owner users) | `/admin/landlords` | ✓ |
| 5 | Assign Owners to Flats | every (or ≥1) flat has `owner_id` set → `in_progress` until all assigned | `/admin/flats` (assign) | ✓ |
| 6 | Add Society Bank Account | `bank_accounts` row `entity_type='society'` for this society | `/admin/settings` (bank) | ✓ |
| 7 | Setup Maintenance Billing (due date, invoice series, reminders) | `billing_profiles` + `invoice_type_config(maintenance)` + `society_config` (`billing.maintenance_due_day`, series) + `reminder_rules` | `/admin/settings` (billing) | ✓ |
| 8 | Complete | all required done | dashboard | — |

**Blocks/Wings:** today blocks are just `flats.block` (free text). To give society admins a *managed* list (and the "Add Blocks" step a home), add an **optional** lightweight table — non-breaking, `flats.block` still works:
```
society_blocks
  id uuid pk, society_id uuid → societies, name text, sort_order int, created_at
  unique (society_id, name)
```
If a society skips this step, `flats.block` free-text continues to work; the step is marked optional.

---

## 33. Dashboard Widgets

Three additive widgets on the existing `/landlord` and `/admin` dashboards (no layout rewrite):

**A. Setup Progress Card**
```
┌──────────────────────────────────────────┐
│  Setup Progress                     75%    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░                       │
│  ✓ Society Created                         │
│  ✓ Flats Added                             │
│  ✓ Owners Added                            │
│  ✓ Bank Account Added                      │
│  ✗ Billing Configured                      │
│            [ Continue Setup → ]            │
└──────────────────────────────────────────┘
```
- Auto-hides (or collapses to a slim "Setup 100% ✓") once `completed_at` is set.
- Each checklist row is itself a link to that step; the primary button uses smart navigation (§34).

**B. Setup Alerts** — contextual warnings for missing *required* data, dismissible (persisted in `dismissed_alerts`) but re-surfaced if still blocking billing. Examples: "No Bank Account Configured", "No Tenant Added", "No Flat Assigned", "No Active Agreement", "No Meter Added", "No Billing Profile Configured". Each alert has a **Fix →** link to the relevant page.

**C. Stats Row** (the reporting requirement): Total Properties · Total Units · Total Tenants · Total Owners · Monthly Revenue · Outstanding Amount · **Setup Completion %**. Revenue/outstanding come from the §15 views; counts from the same EXISTS/COUNT queries that drive the engine (one round-trip, cached).

---

## 34. Smart Navigation

`Continue Setup` calls `getSetupProgress()` and routes to **the first step whose status ≠ completed and that isn't skipped**, using that step's `href`. Example: property ✓, flats ✓, owners ✗ → button goes straight to **Add Owner** (`/admin/landlords`). After the user completes a step and returns, the engine recomputes and the button advances to the next gap automatically. `onboarding_state.last_step` is updated so a fresh login resumes in the same place.

---

## 35. Billing Dependency Check (hard gate) & Validation Rules

Before any invoice is generated (manual `/api/invoices/generate` or any `/api/cron/generate-*`), a **readiness check** runs and returns actionable errors instead of producing a broken invoice.

`validateBillingReadiness({ scope, invoice_type }) → { ok, missing[] }`, each `missing = { code, message, href }`:

| Requirement | Applies to | Failure message |
|---|---|---|
| Property/society exists | all | "Add a property before billing." → property page |
| Unit/flat exists | all | "No flat found. Add a flat first." |
| Recipient exists (tenant/owner per §19) | rent→tenant, maintenance→owner | "Cannot generate invoice because no tenant is assigned to this flat." |
| Active agreement exists | rent | **"Cannot generate invoice because no active agreement exists."** |
| Bank account exists | all (for payment details on PDF) | "Add a bank account so payment details appear on invoices." |
| Billing profile + GST rate configured | all | "No billing profile configured. Complete billing setup." |
| Meter + reading exists | electricity | "No meter reading found for this period. Add a meter / enter readings." |

The check reuses the same EXISTS queries as the setup engine, so "setup complete" and "can bill" never disagree. Cron generators log skipped units with the failing `code` into `invoice_runs.errors` (§8) rather than erroring the whole batch.

---

## 36. Bulk Setup (CSV / Excel Import)

Recommended in onboarding to avoid one-by-one entry. Three importers — **Flats, Tenants, Owners** — sharing one pipeline:

1. **Download template** (CSV with the exact columns + an example row).
2. **Upload** (CSV via `papaparse`, or `.xlsx` via SheetJS) → server **parses + validates** row-by-row (required fields, duplicates against existing rows, FK resolution e.g. flat number → flat id) and returns a **preview** with per-row OK/error.
3. **Commit** only valid rows (server-side, service-role, scoped to the user's society/ownership); errors are downloadable for correction.

Optional audit table (additive):
```
import_jobs
  id uuid pk, user_id, society_id NULL, kind text ('flats'|'tenants'|'owners'),
  file_name text, total int, succeeded int, failed int, errors jsonb,
  status text ('previewed'|'committed'|'failed'), created_at
```
Importing flats/tenants/owners immediately advances the corresponding setup steps (they're live-checked).

---

## 37. Onboarding API & Mobile-Responsive Design

**API (route handlers, server-side scope):**
```
GET   /api/onboarding/progress            # steps[] + percent + nextStepHref (per user type)
PATCH /api/onboarding/state               # set last_step / skip step / dismiss alert
GET   /api/billing/readiness?type=&scope= # §35 dependency check (also called pre-generate)
GET   /api/dashboard/summary              # stats row: counts + revenue + outstanding + setup %
# Bulk import
GET   /api/import/[kind]/template         # CSV template (kind = flats|tenants|owners)
POST  /api/import/[kind]/preview          # multipart upload → validated preview
POST  /api/import/[kind]/commit           # persist valid rows
```

**Mobile-responsive (the app is phone-first for many Indian users):**
- Setup Progress Card spans full width, checklist stacks vertically, progress bar + big touch-target **Continue** button pinned at the card bottom.
- The wizard is a **single-column stepper** on mobile (one step per screen, back/next), expanding to a side-rail stepper on desktop.
- Stats row becomes a 2-up grid of cards on mobile, single row on desktop.
- Alerts are full-width banners with a clear **Fix →** tap target; dismiss is a large ✕.
- Import uses the native mobile file picker; the preview table scrolls horizontally with sticky first column.
- All built with the existing TailwindCSS 4 responsive utilities already used across the app — no new UI framework.

---

## Appendix A — ER Diagram (text)

```
                         ┌────────────┐
                         │  societies  │ (Property/Building; +default_rental_type)
                         └─────┬──────┘
        ┌──────────────────────┼───────────────────────────┐
        │                      │                            │
  ┌─────┴─────┐         ┌──────┴──────┐              ┌───────┴────────┐
  │   flats    │         │billing_     │              │ charge_rate_    │
  │ (Unit/     │         │profiles     │              │ config          │
  │  Shop/     │         │(company GST,│              │(electricity/    │
  │  Office/   │         │ logo)       │              │ slab/fixed/     │
  │  Cabin)    │         └─────────────┘              │ common)         │
  │+rental_type│                                       └────────────────┘
  └──┬───┬────┘
     │   │
     │   └────────────────────────────┐
     │                                 │
┌────┴─────┐   ┌──────────┐      ┌─────┴──────┐        ┌───────────────┐
│ tenants   │   │  meters   │      │  agreements │        │invoice_type_   │
│(+gst_no)  │   │(unit/     │      │ (rent src)  │        │config(GST per  │
└────┬─────┘   │ common)   │      └─────┬──────┘        │type)           │
     │          └────┬─────┘            │                └───────────────┘
     │               │                  │
     │          ┌────┴────────┐         │
     │          │meter_readings│         │
     │          │(prev,current,│         │
     │          │ consumed)    │         │
     │          └────┬────────┘         │
     │               │ (electricity src) │
     │               ▼                   ▼
     │        ┌──────────────────────────────┐      ┌────────────────┐
     └───────▶│           invoices            │◀─────│ invoice_series  │
              │ (header; type, period, GST     │      │(gapless numbers)│
              │  snapshot, totals, status)     │      └────────────────┘
              └───────┬───────────────┬───────┘
                      │               │
            ┌─────────┴───┐     ┌─────┴──────┐
            │invoice_line_ │     │  payments   │ (full/partial; razorpay/cash/…)
            │items(+HSN,   │     └─────┬──────┘
            │ GST per line)│           │
            └──────────────┘           ▼
                                 ┌──────────────┐
                                 │status engine  │→ amount_paid/outstanding/overdue
                                 └──────────────┘

  notification_queue ──(email|whatsapp)──▶ tenants/landlords     reminder_rules ─┐
  invoice_runs (cron audit)                                                       └─▶ feeds queue
  audit_logs (who/IP/changes on invoice & payment mutations)
```

**v2 additions (attach to the core above):**
```
  gst_rate_config (versioned %; §3.1)  ──rate snapshot──▶ invoices / invoice_line_items
        └─ cgst_percent / sgst_percent / igst (intra vs inter-state, §3.2)

  charge_types (catalog) ──▶ unit_recurring_charges ──(line_kind='charge')──▶ invoice_line_items
                          └──(is_metered → meter_type)──▶ meters

  common_meter_config ──(method: equal|area|occupancy|submeter_diff|custom)──▶ allocates common meter
        └─ common_meter_weights (custom)        ──(line_kind='common_area')──▶ invoice_line_items

  late_fee_rules ──(apply-late-fees cron)──(line_kind='late_fee')──▶ invoice_line_items

  agreements ──▶ deposit_ledger (collected/deduction/interest/refund) ──▶ v_deposit_balance
                        └─ linked_invoice_id / linked_payment_id

  invoices ◀──(original)── adjustment_notes (credit/debit) ──▶ adjustment_note_items
        │                         └─ numbered via invoice_series (CRN/DBN)
        └──────────────┬──────────────┬──────────────┐
            v_party_ledger      payment_link        invoice_templates
            (inv + pay +        (Razorpay, §27)     (config jsonb, §25)
             notes balance)     ──webhook──▶ payments

  GST returns (§28): invoices + invoice_line_items + adjustment_notes
        └─▶ v_gstr1_b2b / b2cs / hsn / cdnr      └─▶ v_gstr3b_summary
```

**Onboarding (Part III) — reads existing data, stores only UX state:**
```
  getSetupProgress(user)  ──EXISTS/COUNT──▶ societies / flats / tenants / agreements /
        │                                    bank_accounts / billing_profiles / meters
        ├─ reads ──▶ onboarding_state (last_step, skipped, dismissed, cached_percent)
        ├─ feeds ──▶ Setup Progress Card · Alerts · Stats row (Setup %)
        └─ Continue Setup ──▶ first incomplete step's href

  validateBillingReadiness() ──(same EXISTS checks)──▶ HARD-GATES /api/invoices/generate + cron

  import_jobs ──(CSV/Excel: flats|tenants|owners)──▶ flats / tenants / owners (advances steps)
  society_blocks (optional managed wing list) ──▶ flats.block
```

## Appendix B — New vs. Modified vs. Reused

**Reused as-is:** `users`, `societies`, `tenants`, `agreements`, `society_members`, `bank_accounts`, `society_config`, `platform_settings`, `subscriptions`, `audit_logs`, `documents`, Razorpay routes, `lib/email.ts`, `lib/whatsapp.ts`.

**Modified:**
- `flats` → add `rental_type`, `rent_gst_applicable`.
- `societies` → add `default_rental_type`, `state_code` (2-digit GST place-of-supply code, §3.2). *(`registration_number` and `state` (full name) already exist — reused as-is for §32.)*
- `tenants` → add `gst_number`, `state_code`.
- `/api/email/send` → accept `attachments[]`.
- `/api/whatsapp/send` + `lib/whatsapp.ts` → support `type:'document'` (PDF delivery, §26).
- `/api/payment/webhook` → handle `payment_link.paid` (§27).
- `lib/landlord-data.ts` (+ tenant/admin data layers) → read from `invoices` (post-migration).

**New tables (Part I):** `billing_profiles`, `invoice_type_config`, `gst_rate_config` (§3.1, versioned), `charge_rate_config`, `meters`, `meter_readings`, `invoice_series`, `invoices`, `invoice_line_items`, `payments`, `notification_queue`, `reminder_rules`, `invoice_runs`.

**New tables (Part II / v2):** `deposit_ledger` (§20), `late_fee_rules` (§21), `adjustment_notes` + `adjustment_note_items` (§22), `charge_types` + `unit_recurring_charges` (§23), `common_meter_config` + `common_meter_weights` (§24), `invoice_templates` (§25). *(SaaS phase: `organizations`.)*

**New tables (Part III / onboarding):** `onboarding_state` (§30), `import_jobs` (§36), optional `society_blocks` (§32). *(Setup completion itself is **derived live** from existing data — not stored.)*

**New views:** `v_outstanding`, `v_party_ledger` (§22), `v_deposit_balance` (§20), `v_gstr1_*`, `v_gstr3b_summary` (§28).

**New routes:** `/api/billing/*` (profile, gst-config, gst-rates, rates, charge-types, unit-charges, late-fee-rules, reminder-rules, templates, readiness), `/api/meters/*`, `/api/invoices/*` (incl. `/notes`), `/api/notes/*`, `/api/deposits/*`, `/api/payment/create-link`, `/api/cron/*`, `/api/reports/*` (incl. `gstr1`, `gstr3b`), `/api/onboarding/*` (progress, state), `/api/dashboard/summary`, `/api/import/[kind]/*` (template, preview, commit).
```
```
