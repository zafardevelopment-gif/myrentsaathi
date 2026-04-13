# MyRentSaathi — WhatsApp Message Templates
**Total Templates: 8** (covers all major events in the platform)  
**Language:** English (submit English versions to Meta — users can reply in any language)  
**Format:** Meta Cloud API / Twilio WhatsApp Business

---

## How to submit templates to Meta

1. Go to [Meta Business Manager](https://business.facebook.com) → WhatsApp Manager → Message Templates
2. Click "Create Template"
3. Fill: Name (lowercase, underscores only), Category, Language = English
4. Paste the message body — use `{{1}}`, `{{2}}` etc. for variables
5. Submit → approval takes 24–72 hours
6. Status will show: Pending → Approved / Rejected

> ⚠️ Template names must be unique across your account. Rejected templates can be edited and resubmitted.

---

## Variable reference

When sending via API, variables are passed in order:
```
{{1}} = first variable
{{2}} = second variable
... and so on
```

---

## Template 1 — Rent Due Reminder
**Name:** `mrs_rent_due`  
**Category:** UTILITY  
**When to send:** 5 days before rent due date (monthly cron) OR when admin manually triggers

```
🏠 *MyRentSaathi*

Hi {{1}}! 👋

Your rent for *{{2}}* is due.

💰 Amount: *₹{{3}}*
📅 Due Date: *{{4}}*
🏢 Flat: *{{5}}*

Pay now on the app to avoid late fees. 

🔗 {{6}}

Need help? Chat with Saathi 🤖 on the app.
```

**Variables:**
| # | Value | Example |
|---|-------|---------|
| `{{1}}` | Tenant first name | `Rahul` |
| `{{2}}` | Month + Year | `May 2026` |
| `{{3}}` | Rent amount | `12,000` |
| `{{4}}` | Due date | `5th May 2026` |
| `{{5}}` | Flat number | `B-204` |
| `{{6}}` | App link | `https://myrentsaathi.com/tenant/payments` |

**Trigger point in code:** Monthly cron job or admin Finance page → "Send Reminders" button  
**Recipients:** All tenants with pending rent for current month

---

## Template 2 — Payment Received Receipt
**Name:** `mrs_payment_receipt`  
**Category:** UTILITY  
**When to send:** Immediately after Razorpay `payment.captured` (inside `/api/payment/verify`)

```
✅ *Payment Received!*

Hi {{1}}! 🙏

Your payment has been successfully recorded.

💰 Amount Paid: *₹{{2}}*
📅 Month: *{{3}}*
🏢 Flat: *{{4}}*
🧾 Payment ID: `{{5}}`
📆 Date: {{6}}

Thank you for paying on time! 😊

_MyRentSaathi — {{7}} Society_
```

**Variables:**
| # | Value | Example |
|---|-------|---------|
| `{{1}}` | Payer first name | `Rahul` |
| `{{2}}` | Amount paid | `12,000` |
| `{{3}}` | Month paid for | `April 2026` |
| `{{4}}` | Flat number | `B-204` |
| `{{5}}` | Razorpay Payment ID | `pay_QxYz123` |
| `{{6}}` | Payment date | `12 Apr 2026` |
| `{{7}}` | Society name | `Green Valley CHS` |

**Trigger point in code:** `app/api/payment/verify/route.ts` — after DB update, call WhatsApp API  
**Recipients:** The user who just paid (tenant or landlord)

---

## Template 3 — Society Maintenance Due
**Name:** `mrs_maintenance_due`  
**Category:** UTILITY  
**When to send:** When admin generates monthly maintenance or society expense is approved

```
🏢 *Society Maintenance Due*

Hi {{1}}! 👋

Your society maintenance for *{{2}}* is ready.

💳 Your Share: *₹{{3}}*
🏠 Flat: *{{4}}*
📅 Pay Before: *{{5}}*

This covers: {{6}}

Pay flat-wise on the app 👇
🔗 {{7}}

_{{8}} Society_
```

**Variables:**
| # | Value | Example |
|---|-------|---------|
| `{{1}}` | Resident first name | `Priya` |
| `{{2}}` | Month | `May 2026` |
| `{{3}}` | Their share amount | `3,200` |
| `{{4}}` | Flat number | `A-101` |
| `{{5}}` | Due date | `15th May 2026` |
| `{{6}}` | What it covers (brief) | `Security, Cleaning, Lift` |
| `{{7}}` | App link | `https://myrentsaathi.com/landlord/society-dues` |
| `{{8}}` | Society name | `Sunshine Heights` |

**Trigger point in code:** Admin Expenses page → "Notify Residents" button → send to all flat owners  
**Recipients:** All landlords (and tenants for their flat)

---

## Template 4 — New Society Notice
**Name:** `mrs_notice_alert`  
**Category:** UTILITY  
**When to send:** When admin or board posts a new notice

```
📢 *New Society Notice*

Hi {{1}}! 

*{{2}}* has posted a new notice:

📋 *{{3}}*

{{4}}

📅 Posted: {{5}}

Open the app to read the full notice and share your thoughts.
🔗 {{6}}

_{{7}} Society_
```

**Variables:**
| # | Value | Example |
|---|-------|---------|
| `{{1}}` | Resident first name | `Amit` |
| `{{2}}` | Society name or "Management" | `Green Valley CHS` |
| `{{3}}` | Notice title | `Water Supply Shutdown — 14 Apr` |
| `{{4}}` | First 100 chars of notice body | `Water will be unavailable on 14th Apr 10am–2pm for tank cleaning.` |
| `{{5}}` | Posted date | `12 Apr 2026` |
| `{{6}}` | App link | `https://myrentsaathi.com/tenant/notices` |
| `{{7}}` | Society name | `Green Valley CHS` |

**Trigger point in code:** `app/admin/notices/page.tsx` → after notice insert → call WhatsApp API  
**Recipients:** Based on notice audience (all / tenants only / landlords only)

---

## Template 5 — Visitor at Gate
**Name:** `mrs_visitor_alert`  
**Category:** UTILITY  
**When to send:** When guard checks in a visitor and flat resident hasn't pre-approved them

```
🔔 *Visitor at Gate*

Hi {{1}}! 

Someone is waiting at the gate for you.

👤 Name: *{{2}}*
📞 Phone: {{3}}
🎯 Purpose: *{{4}}*
🕐 Time: {{5}}

Open the app to Approve or Deny entry 👇
🔗 {{6}}

_Guard: {{7}} | {{8}} Society_
```

**Variables:**
| # | Value | Example |
|---|-------|---------|
| `{{1}}` | Resident first name | `Sneha` |
| `{{2}}` | Visitor name | `Ramesh Kumar` |
| `{{3}}` | Visitor phone | `+91 98765 43210` |
| `{{4}}` | Visit purpose | `Delivery` |
| `{{5}}` | Check-in time | `3:45 PM` |
| `{{6}}` | Approval link | `https://myrentsaathi.com/tenant/visitors` |
| `{{7}}` | Guard name | `Suresh` |
| `{{8}}` | Society name | `Sunshine Heights` |

**Trigger point in code:** `app/guard/page.tsx` → after visitor check-in form submit  
**Recipients:** Tenant or landlord of the flat being visited

---

## Template 6 — Complaint / Ticket Update
**Name:** `mrs_ticket_update`  
**Category:** UTILITY  
**When to send:** When admin changes ticket status (Open → In Progress → Resolved)

```
🛠️ *Complaint Update*

Hi {{1}}! 

Your complaint has been updated.

🎫 Ticket: *#{{2}}*
📝 Issue: {{3}}
🔄 New Status: *{{4}}*
💬 Note: {{5}}

{{6}}

Track your complaint on the app 👇
🔗 {{7}}

_{{8}} Society_
```

**Variables:**
| # | Value | Example |
|---|-------|---------|
| `{{1}}` | Resident first name | `Vikram` |
| `{{2}}` | Ticket ID | `TKT-0042` |
| `{{3}}` | Ticket title | `Lift not working in B block` |
| `{{4}}` | New status | `In Progress ⚙️` |
| `{{5}}` | Admin note | `Engineer has been called, will visit by 3 PM today.` |
| `{{6}}` | Status emoji line | `✅ Resolved — Thank you for your patience!` OR `⚙️ We are working on it.` |
| `{{7}}` | App link | `https://myrentsaathi.com/tenant/complaints` |
| `{{8}}` | Society name | `Green Valley CHS` |

**Status emoji mapping (use in `{{4}}` and `{{6}}`):**
- Open → `🟡 Open`
- In Progress → `⚙️ In Progress`
- Resolved → `✅ Resolved`
- Closed → `🔒 Closed`

**Trigger point in code:** `app/admin/tickets/page.tsx` → after status update  
**Recipients:** User who raised the ticket

---

## Template 7 — Welcome / Onboarding
**Name:** `mrs_welcome`  
**Category:** UTILITY  
**When to send:** When admin adds a new user (tenant or landlord)

```
🎉 *Welcome to {{1}}!*

Hi {{2}}! 👋

You've been added to *{{1}}* society on MyRentSaathi.

Here's how to get started:

🔑 Login at: {{3}}
📧 Email: {{4}}
🔐 Password: {{5}}

*What you can do on the app:*
{{6}}

Need help? Chat with *Saathi AI* 🤖 — available 24/7 on the app!

_Team MyRentSaathi_ 🏠
```

**Variables:**
| # | Value | Example |
|---|-------|---------|
| `{{1}}` | Society name | `Green Valley CHS` |
| `{{2}}` | User first name | `Pooja` |
| `{{3}}` | Login URL | `https://myrentsaathi.com/login` |
| `{{4}}` | Their email | `pooja@gmail.com` |
| `{{5}}` | Temporary password | `Welcome@123` |
| `{{6}}` | Role-based description | `✅ View & pay rent · 📋 Raise complaints · 📢 Read society notices · 🚗 Track your vehicle` |

**Role-based `{{6}}` values:**
- **Tenant:** `✅ Pay rent online · 📋 Raise complaints · 📢 Read notices · 🚗 Parking details`
- **Landlord:** `✅ Manage properties · 💰 Track rent · 🏢 Pay society dues · 📜 Digital agreements`
- **Guard:** `🚪 Gate entry · ✅ Approve visitors · 🅿️ Verify vehicles`

**Trigger point in code:** Admin → Staff/Landlords/Tenants page → after adding new user  
**Recipients:** The newly added user

---

## Template 8 — Rent Hike Advance Notice
**Name:** `mrs_rent_hike_notice`  
**Category:** UTILITY  
**When to send:** 30 days before rent hike effective date

```
📣 *Rent Revision Notice*

Hi {{1}}! 

Your landlord has scheduled a rent revision for your flat.

🏠 Flat: *{{2}}*
💰 Current Rent: *₹{{3}}*
💰 New Rent: *₹{{4}}*
📅 Effective From: *{{5}}*

Please plan accordingly. For any queries, contact your landlord or raise a complaint on the app.

🔗 {{6}}

_{{7}} Society_
```

**Variables:**
| # | Value | Example |
|---|-------|---------|
| `{{1}}` | Tenant first name | `Deepak` |
| `{{2}}` | Flat number | `C-302` |
| `{{3}}` | Current rent | `15,000` |
| `{{4}}` | New rent | `16,500` |
| `{{5}}` | Effective date | `1st June 2026` |
| `{{6}}` | App link | `https://myrentsaathi.com/tenant/agreement` |
| `{{7}}` | Society name | `Sunrise Towers` |

**Trigger point in code:** `app/landlord/rent-hike/page.tsx` → after saving rent hike → auto-schedule WhatsApp 30 days before effective date  
**Recipients:** Tenant of the flat

---

## Summary Table

| # | Template Name | Event | Sender | Recipients |
|---|--------------|-------|--------|-----------|
| 1 | `mrs_rent_due` | Rent due reminder | System / Admin | Tenants |
| 2 | `mrs_payment_receipt` | Payment received | System (auto) | Payer (tenant/landlord) |
| 3 | `mrs_maintenance_due` | Society maintenance generated | Admin | All flat owners/tenants |
| 4 | `mrs_notice_alert` | New notice posted | Admin / Board | All / Tenants / Landlords |
| 5 | `mrs_visitor_alert` | Visitor at gate | Guard (auto) | Flat resident |
| 6 | `mrs_ticket_update` | Complaint status changed | Admin | Ticket raiser |
| 7 | `mrs_welcome` | New user added | Admin | New user |
| 8 | `mrs_rent_hike_notice` | Rent hike scheduled | Landlord | Tenant |

---

## API Call Format (for implementation)

After getting Meta API access, call your `app/api/whatsapp/send/route.ts`:

```typescript
// Template 2 — Payment receipt example
await fetch("/api/whatsapp/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    to: "+919876543210",           // E.164 format — must have country code
    template: "mrs_payment_receipt",
    params: [
      "Rahul",                     // {{1}} name
      "12,000",                    // {{2}} amount
      "April 2026",                // {{3}} month
      "B-204",                     // {{4}} flat
      "pay_QxYz123",               // {{5}} payment ID
      "12 Apr 2026",               // {{6}} date
      "Green Valley CHS",          // {{7}} society
    ],
  }),
});
```

```typescript
// Template 5 — Visitor alert example
await fetch("/api/whatsapp/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    to: "+919876543210",
    template: "mrs_visitor_alert",
    params: [
      "Sneha",                     // {{1}} resident name
      "Ramesh Kumar",              // {{2}} visitor name
      "+91 98765 43210",           // {{3}} visitor phone
      "Delivery",                  // {{4}} purpose
      "3:45 PM",                   // {{5}} time
      "https://myrentsaathi.com/tenant/visitors",  // {{6}} link
      "Suresh",                    // {{7}} guard name
      "Sunshine Heights",          // {{8}} society
    ],
  }),
});
```

---

## Phone number format requirement

WhatsApp API requires E.164 format — always include country code:

```typescript
// Helper function — add to lib/utils.ts
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

// Usage
toE164("9876543210")   // → "+919876543210"
toE164("09876543210")  // → "+919876543210" (won't work, need fix)
```

---

## What to add to DB — `users.phone` column

```sql
-- Run in Supabase SQL Editor
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Optional: add index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
```

Then add phone field to:
- `app/admin/staff/page.tsx` — staff add/edit form (already has phone?)
- `app/landlord/tenants/page.tsx` — add tenant form
- `app/tenant/profile/page.tsx` — tenant self-edit profile
- `app/admin/landlords/page.tsx` — add landlord form
