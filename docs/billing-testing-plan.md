# Billing & Invoice Module — Testing Plan

A step-by-step plan to verify the whole module. Work top-to-bottom: **Phase 0 (setup) → smoke test → feature-by-feature → edge cases**. Each test has **Action**, **Expected**, and **Verify** (UI / API / SQL).

> Tip: keep the Supabase SQL Editor open in one tab and the app in another. For API tests, use the browser (GET links) or a REST client (Postman/Thunder/curl). Replace `<USER_ID>` / `<ROLE>` with the logged-in user's values (`role` is the MockAuth key: `admin` for society admin, `landlord`, `tenant`).

---

## 0. Prerequisites

### 0.1 Run migrations (Supabase SQL Editor, in order)
```
billing-00-foundations.sql
billing-01-onboarding.sql
billing-02-invoices.sql
billing-03-payments.sql
billing-05-meters.sql
billing-06-charges.sql
billing-08-notifications.sql
billing-09-deposits-notes.sql
billing-10-templates.sql
billing-11-reports.sql
billing-12-backfill.sql   (optional — only to migrate old rent/maintenance)
```
**Verify:** no errors. Then run:
```sql
select table_name from information_schema.tables
where table_name in ('invoices','invoice_line_items','invoice_payments','invoice_series',
 'meters','meter_readings','charge_types','late_fee_rules','deposit_ledger',
 'adjustment_notes','notification_queue','reminder_rules','invoice_templates',
 'onboarding_state','gst_rate_config','billing_profiles');
-- expect 16 rows
```

### 0.2 Env / config
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set.
- `NEXT_PUBLIC_APP_URL` set (for cron/email/reminders self-calls).
- `CRON_SECRET` set (for cron tests).
- SMTP configured in Super Admin settings (for email tests) — optional.
- Restart `npm run dev` after pulling new files.

### 0.3 Test accounts
- One **society admin** (role `admin`, linked in `society_members` role `admin`).
- One **landlord** (role `landlord`).
- A few **flats** with `owner_id`, `monthly_rent`, `maintenance_amount`, and at least one **tenant** + **active agreement**.

---

## 1. Smoke test (happy path — do this first)

| # | Action | Expected |
|---|--------|----------|
| 1 | Log in as society admin → open `/admin` | Setup Progress card shows at top with % |
| 2 | Ensure society has name+address and maintenance amount > 0 | "Society Information" ✓ and "Setup Maintenance Billing" ✓ |
| 3 | Open `/admin/billing` | Stats row + empty invoice list + Generate buttons |
| 4 | Set period to current month, click **Generate maintenance** | Toast "Created N, skipped 0"; invoices appear in list |
| 5 | Click **View** on an invoice | Branded HTML invoice opens with line item + total |
| 6 | (DB) Record a payment, refresh | Status flips unpaid → paid; outstanding → 0 |

If all 6 pass, the core pipeline works. Now test features individually.

---

## 2. Onboarding & dashboard (Phase 1)

| Test | Action | Verify |
|---|---|---|
| Card renders | Login as admin/landlord, open dashboard | Card shows steps + % + "Continue Setup" |
| Smart navigation | Click "Continue Setup" | Jumps to first incomplete step's page |
| Live completion | Add a flat / tenant / bank → refresh | Corresponding step turns ✓, % rises |
| Auto-hide | Complete all required steps | Card disappears at 100% |
| API direct | Open `/api/onboarding/progress?userId=<USER_ID>&role=<ROLE>` | JSON `{percent, steps[], nextStepHref}` |
| Stats | `/api/dashboard/summary?userId=<USER_ID>&role=<ROLE>` | counts + monthlyRevenue + outstanding + setupPercent |

**Readiness gate:** `/api/billing/readiness?userId=<USER_ID>&role=<ROLE>&type=rent`
- With no active agreement → `{ ok:false, missing:[{code:"NO_AGREEMENT",...}] }`
- With everything set → `{ ok:true, missing:[] }`

---

## 3. Invoice core + GST split (Phase 2)

### 3.1 Generation & numbering
- **Action:** `POST /api/invoices/generate` body `{ "user":{"id":"<USER_ID>","role":"<ROLE>"}, "invoice_type":"rent", "billing_period":"2026-06" }`
- **Expected:** `{ created, skipped, errors:[] }`
- **Verify (SQL):**
```sql
select invoice_number, invoice_type, total_amount, status from invoices order by created_at desc limit 10;
-- numbers like RENT/2026-27/0001, 0002 … gapless, no gaps
```
- **Idempotency:** run the same generate again → `created:0, skipped:N` (no duplicates). Confirm:
```sql
select flat_id, invoice_type, billing_period, count(*) from invoices
where status<>'cancelled' group by 1,2,3 having count(*)>1;  -- expect 0 rows
```

### 3.2 GST CGST/SGST vs IGST  (the key tax test)
Setup a GST rate + a GST-eligible rent flat first:
```sql
-- platform default 18% already seeded by billing-00; set society state + a GST flat:
update societies set state_code='27' where id='<SOCIETY_ID>';     -- Maharashtra
update flats set rent_gst_applicable=true where id='<FLAT_ID>';
-- mark rent GST-applicable for this biller:
insert into invoice_type_config(society_id,invoice_type,gst_applicable,default_recipient_type)
values('<SOCIETY_ID>','rent',true,'tenant')
on conflict do nothing;
-- biller needs a GST number → add a billing profile with same state (intra-state):
insert into billing_profiles(entity_type,entity_id,society_id,legal_name,gst_number,state_code)
values('society','<SOCIETY_ID>','<SOCIETY_ID>','Test Society','27ABCDE1234F1Z5','27')
on conflict (entity_type,entity_id) do update set gst_number=excluded.gst_number, state_code=excluded.state_code;
```
- **Intra-state test:** society state_code = property state_code → generate rent → invoice should have **CGST 9% + SGST 9%, IGST 0**.
```sql
select gst_percent,cgst_total,sgst_total,igst_total,total_amount from invoices where invoice_type='rent' order by created_at desc limit 1;
```
- **Inter-state test:** set `update flats set ... ` so place-of-supply differs, OR set society state_code different from billing_profiles.state_code, regenerate (new period) → invoice should have **IGST = full %, CGST/SGST = 0**.
- **Maintenance/electricity:** confirm `gst_amount = 0` always (GST-exempt by design).

### 3.3 Editable GST rate (versioning)
- **Action:** `POST /api/billing/gst-rates` body `{ "user":{...}, "applies_to":"rent", "rate_percent":12, "effective_from":"2026-07-01" }`
- **Verify (SQL):**
```sql
select rate_percent, effective_from, effective_to, is_active from gst_rate_config where applies_to='rent' order by effective_from;
-- old 18% row now has effective_to set; new 12% row active
```
- **Critical:** an invoice generated for **June** still shows 18% (snapshot); a **July** invoice shows 12%. Old invoices never change.

---

## 4. Payments & status engine (Phase 3)

| Test | Action | Verify |
|---|---|---|
| Partial | `POST /api/invoices/<ID>/payments` `{ "amount": 5000 }` (invoice total > 5000) | status → `partially_paid`; outstanding = total−5000 |
| Full | record remaining amount | status → `paid`; outstanding = 0 |
| Overpay guard | record amount on cancelled invoice | 400 error "cancelled" |
| Trigger | check after each payment | `select status, amount_paid from invoices where id='<ID>'` matches |
| Mark overdue | set an invoice `due_date` in the past, run `select mark_overdue_invoices();` | returns count; that invoice → `overdue` |

---

## 5. Meters & electricity (Phase 5)

| Test | Action | Verify |
|---|---|---|
| Create unit meter | `POST /api/meters` `{ "user":{...}, "flat_id":"<FLAT>", "scope":"unit", "meter_number":"M1" }` | meter row created |
| Reading sheet | `GET /api/meters/readings?userId=&role=&period=2026-06` | meter listed with prefilled previous reading |
| Enter reading | `POST /api/meters/readings` `{ "meter_id":"<M>", "billing_period":"2026-06", "current_reading":150 }` | `units_consumed` computed (150 − previous) |
| Set rate | `insert into charge_rate_config(society_id,charge_kind,rate_type,flat_rate) values('<SOC>','electricity','flat',8);` | — |
| Generate electricity | `POST /api/invoices/generate` `{ ..., "invoice_type":"electricity", "billing_period":"2026-06" }` | invoice with line "Electricity — 150 kWh …", amount = units×rate, **GST 0** |
| Provenance | check `meter_readings.invoice_id` | stamped to the created invoice (no double-billing on re-run) |
| Meter reset | enter reading with `is_meter_reset:true` | `units_consumed = current` (not negative) |
| Common meter | create a `scope:"common"` meter + reading + `common_meter_config` (method `equal`) | each flat gets a "Common Area Electricity — equal share" line; shares sum to total |

---

## 6. Additional charges + late fees (Phase 6)

**Charges:**
1. `POST /api/billing/charge-types` `{ "user":{...}, "code":"parking", "name":"Parking", "default_amount":500, "gst_applicable":false }`
2. `POST /api/billing/unit-charges` `{ "flat_id":"<FLAT>", "charge_type_id":"<CT>", "start_period":"2026-06" }`
3. `POST /api/invoices/generate` `{ ..., "invoice_type":"charges", "billing_period":"2026-06" }`
4. **Verify:** a `charges` invoice with a "Parking — 2026-06" line of ₹500.

**Late fees:**
1. Create rule: `POST /api/billing/late-fee-rules` `{ "user":{...}, "invoice_type":"all", "grace_days":0, "fee_type":"flat", "fee_value":100 }`
2. Make an invoice overdue (`update invoices set due_date='2026-01-01' where id='<ID>';`)
3. Run cron: `GET /api/cron/apply-late-fees` with header `Authorization: Bearer <CRON_SECRET>`
4. **Verify:** invoice has a `late_fee` line of ₹100; `late_fee_total=100`; `total_amount` increased by 100.
5. **Idempotency:** run again → still one late-fee line (updated, not duplicated).

---

## 7. Cron automation (Phase 7)

All require header `Authorization: Bearer <CRON_SECRET>` (else 401).

| Endpoint | Verify |
|---|---|
| `GET /api/cron/generate-rent` | `{ scopes, created, skipped }` for current month across all billers |
| `GET /api/cron/generate-maintenance` | same for maintenance |
| `GET /api/cron/mark-overdue` | `{ updated: N }` |
| `GET /api/cron/apply-late-fees` | `{ applied: N }` |
| `GET /api/cron/process-reminders` | `{ queued, sent, failed }` |
| Without secret | any cron URL → **401 Unauthorized** |

---

## 8. Reminders (Phase 8)

1. Create a rule: `POST /api/billing/reminder-rules` `{ "user":{...}, "invoice_type":"all", "days_after":[1], "channels":["email"] }`
2. Make an unpaid invoice with `due_date = yesterday` and a recipient that has an email.
3. `GET /api/cron/process-reminders` (with secret).
4. **Verify (SQL):**
```sql
select channel, template, status, scheduled_day from notification_queue order by created_at desc limit 5;
-- a 'reminder_after' row, status 'sent' (if SMTP configured) or 'failed'
```
5. **Idempotency:** run again same day → no duplicate queue row (unique on invoice+template+channel+day).

---

## 9. Deposits + credit/debit notes (Phase 9)

**Deposit ledger:**
1. `POST /api/deposits` `{ "agreement_id":"<AGR>" }` → seeds "collected" from agreement's security_deposit.
2. `POST /api/deposits/<AGR>/entries` `{ "entry_type":"deduction", "amount":-2000, "reason":"Damage" }`
3. `GET /api/deposits?agreement=<AGR>` → ledger + balance = deposit − 2000.

**Credit note:**
1. `POST /api/invoices/<ID>/notes` `{ "note_type":"credit", "reason":"Overbilling", "lines":[{"description":"Adjustment","unit_rate":500,"quantity":1}] }`
2. **Verify:** `select note_number, note_type, total_amount from adjustment_notes;` → `CRN/2026-27/0001`.
3. **Full cancel:** `POST /api/invoices/<ID>/notes` `{ "cancel_invoice":true, "reason":"Cancelled" }` → invoice status `cancelled` + a full-value credit note.
4. **Party ledger:** `GET /api/reports/ledger?userId=&role=&recipient=<USER>` → invoices (+), payments (−), notes (−/+) with running balance.

---

## 10. Templates + payment links (Phase 10)

**Template:** `POST /api/billing/templates` `{ "user":{...}, "name":"Default", "is_default":true, "config":{"theme_color":"#0a7","footer_note":"Thank you"} }` → open an invoice PDF → theme color + footer applied.

**Payment link** (needs Razorpay keys; Route NOT required):
1. `POST /api/payment/create-link` `{ "invoice_id":"<ID>" }` → `{ short_url }`.
2. Open the link → Razorpay hosted page for the outstanding amount.
3. Pay (test mode) → webhook `payment_link.paid` → **Verify:** an `invoice_payments` row appears, invoice status recomputes, `payment_link_status='paid'`.

---

## 11. PDF + email (Phase 4)

| Test | Action | Verify |
|---|---|---|
| PDF/HTML | `GET /api/invoices/<ID>/pdf` | branded invoice; CGST+SGST **or** IGST block (only the applicable one); totals correct |
| Send email | `POST /api/invoices/<ID>/send` | `{ success:true, to }`; recipient receives the invoice (needs SMTP + recipient email) |
| Attachments | extend later | `/api/email/send` now accepts `attachments[]` |

---

## 12. Reports + GST returns (Phase 11)

| Report | URL | Verify |
|---|---|---|
| Outstanding | `/api/reports/outstanding?userId=&role=` | total + rows of unpaid/partial/overdue |
| Collection | `/api/reports/collection?userId=&role=&period=2026-06` | total + byMethod |
| Revenue | `/api/reports/revenue?userId=&role=` | billed/collected by period |
| Consumption | `/api/reports/consumption?userId=&role=&period=2026-06` | meter readings |
| **GSTR-1** | `/api/reports/gstr1?userId=&role=&period=2026-06` | B2B / B2CS / HSN / CDNR sections |
| **GSTR-3B** | `/api/reports/gstr3b?userId=&role=&period=2026-06` | taxable + CGST/SGST/IGST totals (net of notes) |

**Cross-check:** GSTR-3B `cgst+sgst+igst` should equal the sum of `gst_amount` on GST-applicable invoices for that month (minus credit notes).

---

## 13. Legacy backfill (Phase 12)

1. Run `billing-12-backfill.sql`.
2. **Verify:**
```sql
select count(*) from invoices where legacy_ref like 'rent:%';   -- = paid+unpaid historical rents
select count(*) from invoices where legacy_ref like 'mnt:%';
```
3. Paid legacy rows → invoice status `paid` (a confirmed `invoice_payments` row exists).
4. **Idempotency:** run again → no new rows (guarded by legacy_ref).

---

## 14. Edge cases & negative tests

- **No biller scope:** call any API as a `tenant` → 403 "No billing scope".
- **Vacant flat:** generate rent for a flat with no tenant → skipped (not errored).
- **Missing reading:** generate electricity for a flat with no meter reading → that flat skipped; reported in `invoice_runs.errors`.
- **Per-biller numbering:** two different societies/landlords can both have `RENT/2026-27/0001` (allowed). Same biller cannot repeat a number.
- **Cron double-fire:** run a generate cron twice → second is all skips.
- **Late fee cap:** set `max_fee` → fee never exceeds it; `per_day` accrues but capped.
- **Rounding:** multi-line GST invoice → `cgst_total + sgst_total + igst_total == gst_amount` exactly; `sub_total + gst_amount + late_fee_total == total_amount`.

---

## 15. Quick verification queries (keep handy)

```sql
-- Invoice + payments + status snapshot
select i.invoice_number, i.invoice_type, i.total_amount, i.amount_paid, i.status,
       (i.total_amount-i.amount_paid) as outstanding
from invoices i order by i.created_at desc limit 20;

-- GST split sanity
select invoice_number, gst_percent, cgst_total, sgst_total, igst_total,
       (cgst_total+sgst_total+igst_total) as gst_sum, gst_amount
from invoices where gst_amount > 0;

-- Series counters (gapless numbering)
select doc_type, financial_year, next_seq, coalesce(society_id,landlord_id) as biller
from invoice_series order by 4,1;

-- Cron run audit
select invoice_type, billing_period, trigger, count_created, count_skipped, errors
from invoice_runs order by started_at desc limit 10;
```

---

## Suggested order to test in one sitting
0 (migrations) → 1 (smoke) → 2 (onboarding) → 3 (invoices+GST) → 4 (payments) → 6 (charges/late fee) → 5 (meters) → 9 (deposits/notes) → 11/12 (reports/PDF) → 7/8 (cron/reminders) → 10 (links) → 14 (edge). Phase 13 (backfill) only if migrating old data.
