# MyRentSaathi — Full Project Testing Plan

End-to-end test plan for the **entire** application across all roles and modules. Work role-by-role. Each test is **Action → Expected**. Mark Pass/Fail as you go.

> Billing & Invoice module has its own deep plan: see **[billing-testing-plan.md](./billing-testing-plan.md)**. This document covers the whole project (auth, website, society, landlord, tenant, guard, board, super admin) and links to billing where relevant.

---

## 0. Pre-test setup

- [ ] All migrations in `migrations/` run in Supabase (incl. `fix-*.sql`, billing-00…12). See billing plan §0.
- [ ] Env vars set: Supabase URL/anon/service keys, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`.
- [ ] Super Admin: SMTP, Razorpay keys, WhatsApp keys configured (for notification/payment tests). Optional but needed for those sections.
- [ ] `npm run dev` running; `npm run build` passes with no type errors.
- [ ] Seed data: at least 1 society, 1 society admin, 1 board member, 2 landlords, 2 tenants, 4 flats, 1 guard. (`create-new-society.sql` can seed a full set.)

**Roles & login** (MockAuth, localStorage `mrs_user`): society admin (`admin`), board (`board`), landlord (`landlord`), tenant (`tenant`), guard (`guard`), super admin (`superadmin`). Test each role logs in and lands on the right dashboard.

---

## 1. Public website & SEO pages (logged out)

| Page | Check |
|---|---|
| `/` home | Loads, hero, CTAs work, nav links |
| `/(website)/about`, `/features`, `/pricing`, `/contact` | Render, no broken links, contact form submits |
| `/for-landlords`, `/for-societies`, `/for-tenants`, `/for-rwa-committees` | Render |
| `/nri-property-management`, `/visitor-management`, `/rental-agreement-generator`, `/whatsapp-rent-collection`, `/vs-mygate` | SEO landing pages render |
| `/rent-management-software/[city]` | City pages render for a few cities |
| `/blog`, `/blog/[slug]` | List + article render |
| Pricing toggle | Society / Landlord plans switch; per-unit price calculates |
| Mobile | All above responsive on a phone width |

---

## 2. Auth, signup, subscription, access gating

| Test | Action | Expected |
|---|---|---|
| Society signup | `/signup` as society → fill society details | Society + admin created; toast "Now choose your plan" → `/select-plan` |
| Landlord signup | `/signup` as landlord | User created; → `/select-plan` |
| Select plan | `/select-plan` → choose qty + plan → Start Free Trial / Buy | Goes to dashboard (trial) or `/checkout` |
| Checkout | `/checkout` → choose months → pay (Razorpay test) | Plan activated; subscription row created |
| Promo code | Enter a valid promo at checkout | Discount applied; invalid → error |
| Login | `/login` (or login modal) email+password, and User-ID login | Correct dashboard per role |
| Wrong password | — | "Incorrect password" error |
| Plan expired | Expire a subscription (DB) → open dashboard | Redirect to `/plan-expired`; "Renew Plan / Choose a New Plan" works; data preserved |
| Access gating | Tenant tries `/admin/*` URL | Blocked / redirected (no cross-role access) |
| Logout | — | Session cleared, back to public |

---

## 3. Super Admin module (`/superadmin/*`)

| Page | Tests |
|---|---|
| `/superadmin/login` | User-ID + password login; wrong → error |
| `/superadmin` dashboard | KPIs load |
| `/superadmin/societies` | List, search, view/activate/deactivate a society |
| `/superadmin/users` | List users, filter by role, search |
| `/superadmin/subscriptions` | View/edit subscriptions, expiry |
| `/superadmin/revenue` | Revenue figures render |
| `/superadmin/analytics` | Charts/metrics load |
| `/superadmin/pricing` | Edit society/landlord plan prices → reflected on `/select-plan` & website pricing |
| `/superadmin/promos` | Create promo (validation: letters/numbers only, %≤100, future date); edit; deactivate |
| `/superadmin/settings` | Save Razorpay keys, WhatsApp keys, SMTP, free-trial duration; **Send test email** works |
| `/superadmin/support` | View/respond to support chats |
| `/superadmin/agents` | (chat agents) loads |

---

## 4. Society Admin module (`/admin/*`)

| Page | Tests |
|---|---|
| `/admin` dashboard | Society card, stats, **Setup Progress card** (Phase 1), open tickets count |
| `/admin/flats` | Add/edit/delete flat; assign block/floor; assign owner; bulk view |
| `/admin/landlords` | Add landlord (auto-generates login ID/password); link to flat; list |
| `/admin/staff` | Add staff, attendance, salary; edit/remove |
| `/admin/visitors` | Visitor logs; approve/deny; pre-approve |
| `/admin/parking` | Add/assign parking slots; vehicle details; availability |
| `/admin/facilities` | Add facility; bookings; approve/reject |
| `/admin/expenses` | Add expense; approval workflow; receipts; split mode |
| `/admin/finance` | Income/expense summary; balance |
| `/admin/notices` | Create notice (target audience); schedule; WhatsApp/email push; archive |
| `/admin/polls` | Create poll + options; view results; close |
| `/admin/tickets` | View complaints; assign; change status (triggers email/WhatsApp to raiser) |
| `/admin/documents` | Upload doc; set access; download |
| `/admin/governance` | Governance/board items render |
| `/admin/reports` | Reports render/export |
| `/admin/settings` | Society profile edit; expense split mode; **Bank Account** (saves without Razorpay Route — Route disabled); WhatsApp card; **Subscription** info + Upgrade |
| `/admin/billing` | **See billing-testing-plan.md** — generate rent/maintenance/electricity/charges, payments, reports |

---

## 5. Board Member module (`/board/*`)

| Page | Tests |
|---|---|
| `/board` | Dashboard loads |
| `/board/approvals` | Pending approvals (expenses etc.); approve/reject |
| `/board/notices` | View/create notices |
| `/board/polls` | Vote / view results |

---

## 6. Landlord module (`/landlord/*`)

| Page | Tests |
|---|---|
| `/landlord` dashboard | Stats (flats/rent/overdue), **Setup Progress card**, society notices/polls/dues, flat detail modal |
| `/landlord/properties` | Add/edit/delete flat; set rent, deposit, area |
| `/landlord/tenants` | Add tenant (auto login ID/password, welcome WhatsApp/email); list; vacate |
| `/landlord/agreements` | Create agreement (tier: free/lawyer-verified); custom doc upload; download |
| `/landlord/rent` | Rent payments list; record payment; verify uploaded receipts; current vs all months |
| `/landlord/rent-hike` | Apply rent hike (%/fixed); effective date; tenant gets notice (email/WhatsApp) |
| `/landlord/noc` | Generate/issue NOC |
| `/landlord/society-dues` | View maintenance dues from society; pay |
| `/landlord/expenses` | View society expense shares |
| `/landlord/parking` | View/assign parking for owned flats |
| `/landlord/visitors` | Visitor logs for owned flats |
| `/landlord/facilities` | Facility bookings |
| `/landlord/complaints` | Raise complaint to society; view tenant complaints in owned flats |
| `/landlord/notices` | View society notices |
| `/landlord/polls` | Vote |
| `/landlord/documents` | Upload/view docs |
| `/landlord/governance` | Render |
| `/landlord/whatsapp` | WhatsApp tools/templates |
| `/landlord/reports` | Reports/export |
| `/landlord/settings` | Profile; **Bank Account** (saves, Route disabled); WhatsApp note |
| `/landlord/billing` | **See billing-testing-plan.md** |

---

## 7. Tenant module (`/tenant/*`)

| Page | Tests |
|---|---|
| `/tenant` dashboard | Rent due, notices, quick actions |
| `/tenant/payments` | View invoices/rent; pay online (Razorpay); upload offline receipt → landlord verifies |
| `/tenant/agreement` | View/download agreement |
| `/tenant/parking` | View assigned parking; request |
| `/tenant/visitors` | Pre-approve visitor; view log; visitor alert received |
| `/tenant/facilities` | Book facility; view status |
| `/tenant/complaints` | Raise complaint; track status updates |
| `/tenant/notices` | View society notices |
| `/tenant/polls` | Vote |
| `/tenant/documents` | View shared docs |
| `/tenant/governance` | Render |
| `/tenant/profile` | View/edit profile |

---

## 8. Guard module (`/guard/*`)

| Page | Tests |
|---|---|
| `/guard` | Dashboard / quick check-in |
| `/guard/log` | Log a visitor → resident gets **WhatsApp/email visitor alert** |
| `/guard/pending` | Pending approvals; approve/deny |
| `/guard/parking` | Parking view |

---

## 9. Notifications (cross-cutting)

| Event | Channel | Verify |
|---|---|---|
| New tenant/landlord created | WhatsApp `mrs_welcome1` + email | Recipient gets welcome with login |
| Visitor logged at gate | WhatsApp `mrs_visitor_alert` + email | Resident alerted |
| Ticket status change | WhatsApp `mrs_ticket_update` + email | Raiser notified |
| Notice published | WhatsApp `mrs_notice_alert` + email | Residents notified |
| Rent hike | WhatsApp `mrs_rent_hike_notice` + email | Tenant notified |
| Maintenance due | WhatsApp `mrs_maintenance_due` + email | Owner notified |
| Subscription paid | WhatsApp + email confirmation | User notified |
| Rent reminder | WhatsApp `mrs_rent_due` | Tenant reminded |
| Billing reminders | email/WhatsApp via queue (cron) | See billing plan §8 |

If SMTP/WhatsApp not configured → calls **no-op silently** (must NOT break the main flow). Verify the main action still succeeds.

---

## 10. Billing & Invoice module

Covered in full in **[billing-testing-plan.md](./billing-testing-plan.md)** — invoices, GST CGST/SGST/IGST, payments, meters/electricity, charges, late fees, deposits, credit/debit notes, cron, reminders, payment links, PDF, reports/GSTR, legacy backfill.

---

## 11. Data isolation & security

- [ ] Landlord A cannot see Landlord B's flats/tenants/payments.
- [ ] Society admin sees only their society's data.
- [ ] Tenant sees only their own flat/payments/agreement.
- [ ] Direct URL access to another role's pages is blocked.
- [ ] API calls with another user's id/scope return 403 / empty (billing APIs resolve scope server-side).
- [ ] Bank account numbers shown masked; full number never exposed.
- [ ] Cron endpoints require `CRON_SECRET` (401 without).

---

## 12. Cross-cutting quality

- [ ] **Mobile responsive:** every dashboard + key forms usable at phone width (bottom nav, stacked cards).
- [ ] **Empty states:** new account with no data shows friendly empty states, not errors.
- [ ] **Loading states:** lists show loaders, not blank flashes.
- [ ] **Error handling:** failed API → toast error, no white screen.
- [ ] **Language:** all UI in English (Hinglish removed). Spot-check pages.
- [ ] **Build:** `npm run build` succeeds; no console errors on key pages.

---

## 13. Suggested test order (one full pass)

1. Pre-setup (§0) → migrations + seed.
2. Public site (§1).
3. Auth/signup/checkout/plan-expired (§2).
4. Super Admin config (§3) — set keys/SMTP first so notifications work later.
5. Society Admin (§4) — build out flats/landlords/etc.
6. Landlord (§6) → Tenant (§7) → Guard (§8) → Board (§5).
7. Notifications (§9) as you trigger events above.
8. Billing module (§10 → billing-testing-plan.md).
9. Data isolation (§11) + cross-cutting quality (§12).

---

## 14. Bug log template

| # | Module/Page | Steps | Expected | Actual | Severity | Status |
|---|---|---|---|---|---|---|
| 1 | | | | | High/Med/Low | Open/Fixed |
