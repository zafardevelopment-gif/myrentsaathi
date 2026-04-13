# MyRentSaathi — Manual Testing Guide
**Version:** April 2026  
**Stack:** Next.js · Supabase · Tailwind CSS  
**Tester:** Read this fully before starting. Test in the order listed.

---

## Quick Start

### 1. Run the app locally
```bash
cd myrentsaathi
npm install
npm run dev
# Opens at http://localhost:3000
```

### 2. Test accounts (use real accounts from your Supabase DB)
| Role | What to test |
|------|-------------|
| **Admin** | Full society management — all 16 pages |
| **Landlord** | Properties, rent, dues, agreements |
| **Tenant** | Payments, complaints, notices, visitors |
| **Guard** | Gate entry, visitor approval, parking check |
| **Board** | Tickets, approvals, notices, polls |
| **SuperAdmin** | Multi-society, plans, revenue |

### 3. Browsers to test
- Chrome (primary)
- Firefox
- Mobile: Chrome on Android / Safari on iOS

---

## ROLE 1 — ADMIN (16 pages)

### A1. Login
- [ ] Go to `/login` → enter admin email + password → click Login
- [ ] Should redirect to `/admin`
- [ ] Sidebar should show: Overview, Flats, Landlords, Finance, Expenses, Parking, Staff, Visitors, Tickets, Notices, Polls, Documents, Facilities, Governance, Reports, Settings
- [ ] Wrong password → should show error, NOT redirect
- [ ] Logout → clears session, redirects to login

---

### A2. Admin Overview (`/admin`)
- [ ] Stats cards load: Total Flats, Occupied, Pending Dues, Open Tickets
- [ ] Numbers match actual DB data (not zeros or placeholders)
- [ ] No console errors

---

### A3. Flats (`/admin/flats`)
- [ ] Flat list loads with flat number, type, status (occupied/vacant)
- [ ] **Add flat:** Click Add → fill form → Save → new flat appears in list
- [ ] **Edit flat:** Click edit icon → change rent amount → Save → reflects in list
- [ ] **Delete flat:** Click delete → confirm prompt → flat removed
- [ ] Occupancy status shows correctly (green = occupied, gray = vacant)

---

### A4. Landlords (`/admin/landlords`)
- [ ] Landlord directory loads (name, email, flats owned)
- [ ] **Add landlord:** Fill form → submit → appears in list
- [ ] **Assign flat to landlord:** Select landlord → assign flat dropdown → save
- [ ] Landlord with no flats shows "No flats assigned"

---

### A5. Finance (`/admin/finance`)
- [ ] Maintenance payments table loads: flat, tenant, amount, status
- [ ] Filter by status (paid / pending / overdue) works
- [ ] **Mark as paid (manual):** Click mark paid → status changes to ✅ Paid
- [ ] Summary stats (total collected, total pending) are accurate
- [ ] Month filter changes data correctly

---

### A6. Expenses (`/admin/expenses`)
- [ ] Expense list loads: category, description, amount, date
- [ ] **Add expense:** Fill form (category, vendor, amount) → Save → appears in list
- [ ] Recurring expenses show 🔁 badge
- [ ] Category-wise filter works
- [ ] Total displayed at top matches sum of visible expenses

---

### A7. Parking (`/admin/parking`)

#### Slots tab
- [ ] Slot list loads (slot number, type, status: available/occupied)
- [ ] Filter: Available / Occupied / All — each shows correct subset
- [ ] **Add slot:** Click Add Slot → fill → Save → appears
- [ ] **Occupied slot:** Shows vehicle number, owner name
- [ ] **Print Pass button** on occupied slot → opens print popup with:
  - Slot number (large, left panel)
  - Vehicle number, owner name, flat number
  - QR code (right panel)
  - Society name and date

#### Vehicles tab
- [ ] Vehicle list loads (vehicle number, type, owner, flat)
- [ ] **Add vehicle:** Fill form → Save → appears
- [ ] **Authorize / Unauthorize:** Toggle → status changes immediately
- [ ] Unauthorized vehicle shows red badge

#### Assign tab
- [ ] Unassigned vehicles list on left, available slots on right
- [ ] **Assign:** Select vehicle → select slot → Assign button → both lists update
- [ ] When all slots assigned → "All slots assigned" amber message shows
- [ ] **Print Pass** on assigned row works (same sticker as Slots tab)

#### CSV Import
- [ ] Download template → opens correct CSV format
- [ ] Import valid CSV → success toast → slot count updates
- [ ] After import, slot filter resets to "All" (not stuck on "Available")
- [ ] Import CSV with errors → shows error rows, partial success message

---

### A8. Staff (`/admin/staff`)
- [ ] Staff list loads (name, role, salary, join date)
- [ ] **Add staff:** Fill form → Save → appears
- [ ] **Edit:** Change name or salary → Save → reflects
- [ ] **Delete:** Remove → confirm → gone from list
- [ ] **Attendance:** Mark present/absent for today → saves
- [ ] **Salary:** Record salary payment → appears in salary history
- [ ] **CSV Import:** Download template → fill 3+ rows → import → staff appear
- [ ] **CSV Export:** Click Export → downloads staff.csv with correct headers and data
- [ ] Import with wrong role name → shows error for that row, skips it

---

### A9. Visitors (`/admin/visitors`)
- [ ] Visitor log loads (name, flat, purpose, time, status)
- [ ] **Approve pending:** Pending entry → Approve → status changes to Approved
- [ ] **Deny:** Deny → status changes to Denied
- [ ] Search by visitor name or flat number works
- [ ] Date filter works

---

### A10. Tickets (`/admin/tickets`)
- [ ] Ticket list loads (title, raised by, status, priority)
- [ ] **Assign:** Click ticket → assign to staff member → Save
- [ ] **Change status:** Open → In Progress → Resolved
- [ ] Priority filter (low / medium / high / urgent) works
- [ ] Status filter works
- [ ] Resolved tickets show green badge

---

### A11. Notices (`/admin/notices`)
- [ ] Notice board loads (title, date, audience)
- [ ] **Create notice:** Title + body + audience (all/tenants/landlords) → Post → appears
- [ ] **Delete notice:** Remove → gone from list
- [ ] Audience badge shows correctly (All Residents / Tenants Only / Landlords Only)

---

### A12. Polls (`/admin/polls`)
- [ ] Poll list loads (question, end date, votes count)
- [ ] **Create poll:** Question + 2–4 options + end date → Create → appears
- [ ] **Live results:** Click poll → see vote percentages update (if votes exist)
- [ ] Closed polls (past end date) show final results, no vote button

---

### A13. Documents (`/admin/documents`)
- [ ] Document list loads (name, type, uploaded date)
- [ ] **Upload:** Select file → Upload → appears in list
- [ ] **Download:** Click file → downloads correctly
- [ ] **Delete:** Remove → confirm → gone

---

### A14. Facilities (`/admin/facilities`)
- [ ] Facility list loads (name, type, capacity)
- [ ] **Add facility:** Name + description + capacity → Save
- [ ] **View bookings:** Click facility → shows who booked and when
- [ ] **Cancel booking:** Cancel → booking removed

---

### A15. Governance (`/admin/governance`)
- [ ] Board member list loads (name, role, flat)
- [ ] **Add board member:** Select user → assign role (Chairman/Secretary etc.) → Save
- [ ] **Remove:** Remove from board → gone from list

---

### A16. Reports (`/admin/reports`)
- [ ] Page loads with 5 category tabs: Financial, Members, Parking, Operations, Governance
- [ ] Date range presets work: This Month / Last 3M / This Year / All Time
- [ ] **Download individual report:** Click ⬇ CSV → loading → ✓ Done → file downloads
- [ ] Downloaded CSV opens correctly in Excel (no garbled text — BOM present)
- [ ] **Download All** in a category → downloads all reports sequentially
- [ ] Search box filters report cards by name
- [ ] All 20 reports download without error:

**Financial (5):**
- [ ] Maintenance Collection Report
- [ ] Pending Dues Report
- [ ] Expenses Report
- [ ] Salary Register
- [ ] Income vs Expense

**Members (5):**
- [ ] All Members
- [ ] Landlords Directory
- [ ] Tenants Directory
- [ ] Flat Register
- [ ] Vacant Flats

**Parking (2):**
- [ ] Parking Slots
- [ ] Registered Vehicles

**Operations (5):**
- [ ] Notices Report
- [ ] Tickets / Complaints
- [ ] Visitor Log
- [ ] Staff Register
- [ ] Attendance Register

**Governance (3):**
- [ ] Polls & Voting Results
- [ ] Committee Members
- [ ] *(third report)*

---

### A17. Settings (`/admin/settings`)
- [ ] Society name, address, city load correctly
- [ ] **Edit:** Change phone number → Save → persists on refresh
- [ ] Plan info shows current subscription plan

---

## ROLE 2 — LANDLORD (15 pages)

### L1. Login & Overview (`/landlord`)
- [ ] Login as landlord → redirects to `/landlord`
- [ ] Overview stats: total properties, rent collected this month, pending dues
- [ ] Sidebar shows all 15 landlord pages

---

### L2. Properties (`/landlord/properties`)
- [ ] Flat list loads (flat number, block, type, rent amount)
- [ ] **Add flat:** Fill form → Save → appears
- [ ] **Edit rent amount:** Change → Save → reflects in overview stats
- [ ] Occupancy shown (tenant name or "Vacant")

---

### L3. Tenants (`/landlord/tenants`)
- [ ] Tenant list loads with name, flat, lease dates, rent
- [ ] Click tenant → see full profile (contact, documents, payment history)
- [ ] **Add tenant:** Fill form → assign to flat → Save

---

### L4. Rent (`/landlord/rent`)
- [ ] Payment history table loads (month, amount, status, method)
- [ ] Pending payments highlighted in red/orange
- [ ] **Mark as received (manual):** Click → select method → Confirm

---

### L5. Rent Hike (`/landlord/rent-hike`)
- [ ] Schedule rent increase form loads
- [ ] Select flat + new amount + effective date → Save
- [ ] Scheduled hike appears in list with effective date

---

### L6. Society Dues (`/landlord/society-dues`)
- [ ] "My Dues" tab: per-expense breakdown for each flat
- [ ] Amount per flat calculated correctly (total expense ÷ total flats)
- [ ] **Pay Now (Razorpay):** Click Pay Now → Razorpay checkout opens
  - Select UPI → enter UPI ID → Pay → success toast
  - *(Requires live Razorpay keys — use test keys for testing)*
- [ ] After payment: row changes to ✅ Paid with date
- [ ] **Pay All Pending:** Pays all unpaid expenses for a flat in sequence
- [ ] "Society Expenses" tab: shows all society-level expenses with your share

---

### L7. Agreements (`/landlord/agreements`)
- [ ] Agreement list loads (tenant name, flat, start/end date, status)
- [ ] **Create agreement:** Fill tenant + dates + terms → Save
- [ ] **View agreement:** Opens full agreement with all details
- [ ] **Print/Download:** Opens printable view

---

### L8. NOC (`/landlord/noc`)
- [ ] NOC list loads
- [ ] **Request NOC:** Fill form → Submit
- [ ] Status tracking (pending / approved / rejected)

---

### L9. Complaints (`/landlord/complaints`)
- [ ] Ticket list loads (title, status, date)
- [ ] **Raise ticket:** Title + description + category → Submit → appears with "Open" status
- [ ] Can view admin response/updates on ticket

---

### L10. Notices (`/landlord/notices`)
- [ ] Society notice board loads (all notices visible to landlord)
- [ ] **Post notice:** Create notice → appears
- [ ] Notices sorted by date (newest first)

---

### L11. Visitors (`/landlord/visitors`)
- [ ] Pre-approved visitor list loads
- [ ] **Add pre-approval:** Name + purpose + date range → Save
- [ ] Guard can see these pre-approvals at gate

---

### L12. Parking (`/landlord/parking`)
- [ ] Vehicle list for landlord's flats
- [ ] Parking slot assignment visible

---

### L13. Facilities (`/landlord/facilities`)
- [ ] Facility list loads
- [ ] **Book facility:** Select date/time → Book → confirmation
- [ ] Can't book if already booked by someone else at same slot

---

### L14. WhatsApp (`/landlord/whatsapp`)
- [ ] Broadcast page loads
- [ ] Select message type (rent reminder, notice etc.)
- [ ] Click send → opens WhatsApp in browser (wa.me link) with pre-filled message
- [ ] *(Manual WhatsApp — no API needed for this page)*

---

### L15. Documents (`/landlord/documents`)
- [ ] Society documents and personal documents tabs load
- [ ] **Upload document:** Select file → Upload → appears
- [ ] **Download:** Works correctly

---

## ROLE 3 — TENANT (11 pages)

### T1. Login & Overview (`/tenant`)
- [ ] Login as tenant → redirects to `/tenant`
- [ ] Overview: pending dues amount, recent notices count, open complaints
- [ ] Correct flat number and society shown

---

### T2. Payments (`/tenant/payments`)
- [ ] Payment history loads (month, amount, status)
- [ ] **Current month pending banner** shows if rent unpaid
- [ ] **Pay Now (Razorpay):** Click Pay Now → Razorpay checkout opens
  - [ ] Name and email pre-filled from account
  - [ ] Select UPI → test payment → success
  - [ ] After success: payment row changes to ✅ Paid
  - [ ] Typing spinner shows during API calls
- [ ] **Pay Early** (next month) option shows if this month is paid
- [ ] **Receipt button** on paid rows → opens receipt modal
  - [ ] Receipt shows: flat, tenant name, amount, month, payment ID
  - [ ] Print button works (opens browser print dialog)
- [ ] Summary stats: Total Paid, On-Time count

---

### T3. Agreement (`/tenant/agreement`)
- [ ] Rental agreement loads with all details
- [ ] Tenant name, landlord name, flat, rent, dates all correct
- [ ] Terms and conditions visible

---

### T4. Complaints (`/tenant/complaints`)
- [ ] Complaint list loads (title, status, date)
- [ ] **Raise complaint:** Title + category + description → Submit → appears as "Open"
- [ ] Can see status updates from admin
- [ ] Filter by status works

---

### T5. Notices (`/tenant/notices`)
- [ ] Society notices load (only notices targeted to "all" or "tenants")
- [ ] Notices sorted newest first
- [ ] Long notice text is readable (no overflow)

---

### T6. Visitors (`/tenant/visitors`)
- [ ] Pre-approved visitor list loads
- [ ] **Add pre-approval:** Visitor name + phone + date → Save
- [ ] Guard can see at gate

---

### T7. Parking (`/tenant/parking`)
- [ ] Vehicle registered to tenant's flat shows
- [ ] Slot assignment visible
- [ ] Authorization status shown

---

### T8. Facilities (`/tenant/facilities`)
- [ ] Available facilities list loads
- [ ] **Book:** Select facility + date/time → Book → confirmation
- [ ] My bookings section shows upcoming bookings

---

### T9. Documents (`/tenant/documents`)
- [ ] Shared society documents visible
- [ ] **Download:** Works correctly

---

### T10. Governance (`/tenant/governance`)
- [ ] Active polls load
- [ ] **Vote:** Select option → Vote → percentage bars update
- [ ] Can't vote twice on same poll
- [ ] Closed polls show final results

---

### T11. Profile (`/tenant/profile`)
- [ ] Profile loads: name, email, phone, flat details
- [ ] **Edit:** Change phone → Save → persists on refresh
- [ ] Flat details (number, block, type) shown but not editable by tenant

---

## ROLE 4 — GUARD (4 pages)

### G1. Login & Gate Entry (`/guard`)
- [ ] Login as guard → redirects to `/guard`
- [ ] Gate entry form: Visitor name, phone, flat number, purpose
- [ ] **Flat lookup:** Type flat number → shows tenant name (guard can verify)
- [ ] **Check-in:** Submit → entry added to log

---

### G2. Pending Approvals (`/guard/pending`)
- [ ] List of visitors waiting for resident approval
- [ ] **Approve:** Approve button → status changes → visitor can enter
- [ ] **Deny:** Deny → entry logged as denied

---

### G3. Visit Log (`/guard/log`)
- [ ] Full visitor log loads (name, flat, purpose, time, status)
- [ ] Search by visitor name or flat number works
- [ ] Date filter works

---

### G4. Parking Check (`/guard/parking`)
- [ ] Vehicle lookup: enter vehicle number → shows owner, flat, authorization status
- [ ] Unauthorized vehicle → red warning shown
- [ ] Authorized vehicle → green badge

---

## ROLE 5 — BOARD MEMBER (4 pages)

### B1. Login & Overview (`/board`)
- [ ] Login as board member → redirects to `/board`
- [ ] Summary of pending approvals and open tickets

---

### B2. Approvals (`/board/approvals`)
- [ ] Pending approvals list (expenses, NOCs etc. awaiting board sign-off)
- [ ] **Approve:** Approve → status changes
- [ ] **Reject with reason:** Reject → enter reason → submitted

---

### B3. Notices (`/board/notices`)
- [ ] Notice board with all society notices
- [ ] Board member can post notices

---

### B4. Polls (`/board/polls`)
- [ ] Active polls visible
- [ ] Board member can vote
- [ ] Results visible

---

## ROLE 6 — SUPERADMIN (11 pages)

### S1. Login (`/superadmin/login`)
- [ ] Separate login page for SuperAdmin
- [ ] Redirects to `/superadmin` on success

---

### S2. Societies (`/superadmin/societies`)
- [ ] All registered societies load
- [ ] Can view per-society: flat count, plan, status (active/inactive)
- [ ] **Deactivate society:** Toggle → society admin can't login

---

### S3. Users (`/superadmin/users`)
- [ ] All users across all societies
- [ ] Filter by role

---

### S4. Revenue (`/superadmin/revenue`)
- [ ] Revenue stats: MRR, active subscriptions, churn
- [ ] Per-plan breakdown

---

### S5. Subscriptions (`/superadmin/subscriptions`)
- [ ] All society subscriptions with plan and expiry date
- [ ] Can manually extend or change plan

---

### S6. Pricing (`/superadmin/pricing`)
- [ ] Plan list: Starter / Growth / Enterprise (society) + landlord plans
- [ ] **Edit price:** Change amount → Save

---

### S7. Analytics (`/superadmin/analytics`)
- [ ] Platform-wide stats: total flats, total users, active societies

---

### S8–S11. Agents, Promos, Support, Settings
- [ ] Agent management: add/remove platform agents
- [ ] Promo codes: create discount codes
- [ ] Support tickets from all societies
- [ ] Platform settings

---

## 🤖 SAATHI AI CHAT (all roles)

### Chat widget (bottom-right floating button on all pages)
- [ ] Click 💬 button → chat window opens
- [ ] Role-specific greeting shows (tenant sees dues-focused, admin sees society-focused)
- [ ] Role-specific quick reply buttons show

### As Tenant:
- [ ] Click "Mera kitna due hai?" → Saathi fetches real DB data and shows pending dues amount
- [ ] Click "Mere complaints dikhao" → shows real complaint list
- [ ] Click "Society notices kya hain?" → shows real notices
- [ ] Click "Meri vehicle details" → shows real vehicle info
- [ ] Ask in Hindi → responds in Hindi
- [ ] Ask in English → responds in English

### As Admin:
- [ ] "Society ka financial summary" → fetches real financial data
- [ ] "Occupancy status dikhao" → shows real flat occupancy numbers
- [ ] "Staff directory" → lists actual staff

### As Guest (not logged in):
- [ ] Shows generic greeting
- [ ] Quick replies: pricing, signup, free trial, talk to human
- [ ] Asking "my dues" → politely says please log in
- [ ] "Talk to a human" → creates support ticket

### General:
- [ ] Typing indicator (3 dots) shows while AI is thinking
- [ ] Long responses render with bullet points and bold text correctly
- [ ] Chat history persists within the session (scroll up to see earlier messages)
- [ ] Close → reopen → history preserved in same session
- [ ] "Talk to human" → ticket created confirmation shown

---

## 💳 PAYMENT FLOW (End-to-End)

> ⚠️ Requires Razorpay test keys in `.env.local`

### Tenant rent payment:
1. [ ] Login as tenant
2. [ ] Go to `/tenant/payments`
3. [ ] Click "Pay Now" on a pending payment
4. [ ] Razorpay modal opens with correct amount and pre-filled name/email
5. [ ] Select "UPI" → enter test UPI: `success@razorpay`
6. [ ] Click Pay → loading spinner shows
7. [ ] Success → modal closes → toast "Payment successful! ✓"
8. [ ] Payment row changes to ✅ Paid with today's date
9. [ ] Receipt button appears → click → receipt shows Razorpay payment ID

### Failed payment:
1. [ ] Use UPI: `failure@razorpay` in Razorpay modal
2. [ ] Payment fails → toast error shown
3. [ ] DB record NOT marked as paid
4. [ ] Can retry payment immediately

### Landlord maintenance payment:
1. [ ] Login as landlord
2. [ ] Go to `/landlord/society-dues`
3. [ ] Click "Pay Now" on any expense row
4. [ ] Razorpay opens with correct share amount
5. [ ] Complete payment → ✅ Paid shown

---

## 📱 RESPONSIVE / MOBILE TESTING

Open DevTools → toggle device toolbar → test at:
- **Mobile:** 375×667 (iPhone SE)
- **Tablet:** 768×1024 (iPad)

For each role's main pages:
- [ ] Sidebar collapses to hamburger/bottom nav on mobile
- [ ] Stats cards stack vertically (not cut off)
- [ ] Tables scroll horizontally (not broken)
- [ ] Buttons are tappable (min 44px height)
- [ ] Chat widget doesn't overlap important content
- [ ] Modals fill screen on mobile correctly

---

## 🔴 Known Limitations (Not Bugs)
Tell your tester these are **by design**:

| What you'll see | Why |
|----------------|-----|
| WhatsApp "Send" opens browser, no auto-send | WhatsApp Business API not yet integrated |
| Payment needs test Razorpay keys to work | Live keys not in `.env.local` yet — use `rzp_test_xxx` |
| PDF download on agreements may not fully work | PDF generation not fully implemented |
| No email sent after payment | Email (Resend) not yet integrated |
| No SMS/OTP login | Phone auth not implemented |

---

## 🐛 Bug Reporting Template

When you find a bug, report it with:

```
Page: /admin/parking
Role: Admin
Browser: Chrome 123
Steps:
  1. Go to Parking → Slots tab
  2. Filter: Available
  3. Import CSV with 5 slots
  4. After import, filter still shows "Available" instead of resetting
Expected: Filter resets to "All" after import
Actual: Filter stays on "Available" (shows blank list)
Screenshot: [attach]
```

---

## ✅ Sign-off Checklist

Tester signs off when:
- [ ] All 6 roles tested end-to-end
- [ ] All 20 reports download without error
- [ ] Payment flow works (test keys) — success + failure
- [ ] Saathi responds correctly in all 3 languages with real data
- [ ] Mobile layout passes on 375px width
- [ ] No console errors on any page (F12 → Console)
- [ ] No TypeScript/build errors (`npm run build` passes)
