# WhatsApp Templates — MyRentSaathi

Meta Business Manager mein yeh templates create karni hain.
**Category:** UTILITY | **Language:** en (English)

---

## PART 1 — Templates Jo Code Mein Use Ho Rahe Hain

Code mein 7 templates use ho rahe hain. Inhe Meta mein **APPROVED** status mein hona chahiye.

---

### 1. `mrs_welcome1`
**Trigger:** Naya tenant / landlord / guard add karne par  
**Variables:** 4

| # | Variable | Example |
|---|----------|---------|
| {{1}} | User first name | Rahul |
| {{2}} | Society name | Sunshine Apartments |
| {{3}} | Login email | rahul@gmail.com |
| {{4}} | App / login URL | https://myrentsaathi.com/login |

**Template body:**
```
Hi {{1}},

Welcome to {{2}} society on MyRentSaathi.

Your login email: {{3}}

Get started using the app: {{4}}

You can:
✅ Pay & pay rent
📋 Raise complaints
📢 Read notices

Need help? Chat with us anytime.
— MyRentSaathi
```

---

### 2. `mrs_visitor_alert`
**Trigger:** Gate pe visitor aane par resident ko alert  
**Variables:** 8

| # | Variable | Example |
|---|----------|---------|
| {{1}} | Resident first name | Priya |
| {{2}} | Flat number | A-204 |
| {{3}} | Visitor name | Delivery Boy |
| {{4}} | Visitor phone | 9876543210 |
| {{5}} | Visit purpose | Package Delivery |
| {{6}} | Check-in time | 03:45 PM |
| {{7}} | Guard name | Ramesh |
| {{8}} | Society name | Sunshine Apartments |

**Template body:**
```
🚪 Visitor Alert — {{8}}

Hi {{1}} (Flat {{2}}),

A visitor has arrived at the gate.

👤 Name: {{3}}
📞 Phone: {{4}}
📋 Purpose: {{5}}
⏰ Time: {{6}}
💂 Verified by: {{7}}

Please come to the gate or send approval.
— MyRentSaathi
```

---

### 3. `mrs_ticket_update`
**Trigger:** Support ticket ka status change hone par  
**Variables:** 8

| # | Variable | Example |
|---|----------|---------|
| {{1}} | Resident first name | Amit |
| {{2}} | Ticket ID | TKT-00123 |
| {{3}} | Issue title | Water leakage in bathroom |
| {{4}} | New status | ⚙️ In Progress |
| {{5}} | Admin note | Plumber will visit tomorrow |
| {{6}} | Status description | ⚙️ We are working on it. |
| {{7}} | App link | https://myrentsaathi.com/tenant/complaints |
| {{8}} | Society name | Sunshine Apartments |

**Template body:**
```
📋 Ticket Update — {{8}}

Hi {{1}},

Your complaint has been updated.

🎫 Ticket: {{2}}
📝 Issue: {{3}}
📊 Status: {{4}}
💬 Note: {{5}}

{{6}}

View details: {{7}}
— MyRentSaathi
```

---

### 4. `mrs_notice_alert`
**Trigger:** Society mein naya notice post hone par  
**Variables:** 7

| # | Variable | Example |
|---|----------|---------|
| {{1}} | Resident first name | Sneha |
| {{2}} | Society / poster name | Sunshine Apartments |
| {{3}} | Notice title | Water Supply Shutdown |
| {{4}} | Notice snippet (100 chars) | Water supply will be shut from 10am to 2pm on Sunday... |
| {{5}} | Posted date | 15 May 2026 |
| {{6}} | App link | https://myrentsaathi.com/tenant/notices |
| {{7}} | Society name | Sunshine Apartments |

**Template body:**
```
📢 New Notice — {{2}}

Hi {{1}},

A new notice has been posted on {{5}}.

📌 {{3}}

{{4}}

Read full notice: {{6}}
— {{7}}
```

---

### 5. `mrs_maintenance_due`
**Trigger:** Society expense approve hone par landlord ko remind karna  
**Variables:** 8

| # | Variable | Example |
|---|----------|---------|
| {{1}} | Resident first name | Vikram |
| {{2}} | Month | May 2026 |
| {{3}} | Share amount | 2,500 |
| {{4}} | Flat number | B-101 |
| {{5}} | Due date | 15th May 2026 |
| {{6}} | Description | Society maintenance charges |
| {{7}} | App link | https://myrentsaathi.com/landlord/society-dues |
| {{8}} | Society name | Sunshine Apartments |

**Template body:**
```
💰 Maintenance Due — {{8}}

Hi {{1}} (Flat {{4}}),

Society maintenance is due for {{2}}.

Amount: ₹{{3}}
Due by: {{5}}
For: {{6}}

Pay online: {{7}}

Please pay on time to avoid late fees.
— MyRentSaathi
```

---

### 6. `mrs_rent_due`
**Trigger:** Monthly rent reminder tenant ko  
**Variables:** 6

| # | Variable | Example |
|---|----------|---------|
| {{1}} | Tenant first name | Rohit |
| {{2}} | Month + Year | May 2026 |
| {{3}} | Rent amount | 12,000 |
| {{4}} | Due date | 5th May 2026 |
| {{5}} | Flat number | C-305 |
| {{6}} | App link | https://myrentsaathi.com/tenant/payments |

**Template body:**
```
🏠 Rent Reminder

Hi {{1}},

Your rent for {{2}} is due.

💳 Amount: ₹{{3}}
📅 Due by: {{4}}
🏡 Flat: {{5}}

Pay online: {{6}}

Pay on time to maintain a good record.
— MyRentSaathi
```

---

### 7. `mrs_payment_receipt`
**Trigger:** Subscription / rent payment successful hone par  
**Variables:** 6

| # | Variable | Example |
|---|----------|---------|
| {{1}} | User first name | Zafar |
| {{2}} | Amount paid | ₹99 |
| {{3}} | Plan / description | Pro Plan |
| {{4}} | Due date / valid till | 15 Jun 2026 |
| {{5}} | Payment ID | pay_ABC123xyz |
| {{6}} | App link | https://myrentsaathi.com/landlord |

**Template body:**
```
✅ Payment Received!

Hi {{1}},

Your payment has been successfully received.

💰 Amount: {{2}}
📦 Plan: {{3}}
📅 Due Date: {{4}}
🧾 Payment ID: {{5}}

Thank you for paying on time! 🙏

myrentsaathi — {{6}} Society
```

---

### 8. `mrs_rent_hike_notice`
**Trigger:** Landlord ne tenant ka rent badha diya  
**Variables:** 6

| # | Variable | Example |
|---|----------|---------|
| {{1}} | Tenant first name | Rohit |
| {{2}} | Flat number | C-305 |
| {{3}} | Current rent | 12,000 |
| {{4}} | New rent | 13,500 |
| {{5}} | Effective from date | 1 Jun 2026 |
| {{6}} | App link | https://myrentsaathi.com/tenant/payments |

**Template body:**
```
🏠 Rent Revision Notice

Hi {{1}}!

Your landlord has scheduled a rent revision for your flat.

🏠 Flat: {{2}}
💰 Current Rent: ₹{{3}}
📈 New Rent: ₹{{4}}
📅 Effective From: {{5}}

Please plan accordingly. For any queries, contact your landlord or raise a complaint on the app.

{{6}}
```

---

## PART 2 — Important Missing Templates (Create Karne Chahiye)

Yeh templates abhi code mein nahi hain lekin zaruri hain:

---

### 8. `mrs_rent_received` ⭐ HIGH PRIORITY
**Trigger:** Tenant ne rent pay kar diya — landlord ko confirmation  
**Variables:** 6

| # | Variable | Example |
|---|----------|---------|
| {{1}} | Landlord first name | Suresh |
| {{2}} | Tenant name | Rohit Sharma |
| {{3}} | Flat number | C-305 |
| {{4}} | Amount | 12,000 |
| {{5}} | Month | May 2026 |
| {{6}} | Payment ID | pay_ABC123xyz |

**Template body:**
```
💰 Rent Received — MyRentSaathi

Hi {{1}},

Rent payment received for your flat!

👤 Tenant: {{2}}
🏡 Flat: {{3}}
💳 Amount: ₹{{4}}
📅 Month: {{5}}
🧾 Payment ID: {{6}}

Amount will be transferred to your bank account within 2 working days.
— MyRentSaathi
```

---

### 9. `mrs_agreement_expiry` ⭐ HIGH PRIORITY
**Trigger:** Rent agreement expire hone se 30 din pehle  
**Variables:** 6

| # | Variable | Example |
|---|----------|---------|
| {{1}} | Landlord first name | Suresh |
| {{2}} | Tenant name | Rohit Sharma |
| {{3}} | Flat number | C-305 |
| {{4}} | Expiry date | 30 Jun 2026 |
| {{5}} | Days remaining | 30 |
| {{6}} | App link | https://myrentsaathi.com/landlord/agreements |

**Template body:**
```
📋 Agreement Expiry Alert — MyRentSaathi

Hi {{1}},

Your rent agreement is expiring soon!

👤 Tenant: {{2}}
🏡 Flat: {{3}}
📅 Expires: {{4}}
⏳ Days left: {{5}}

Renew or terminate: {{6}}

Act before expiry to avoid complications.
— MyRentSaathi
```

---

### 10. `mrs_subscription_expiry` ⭐ HIGH PRIORITY
**Trigger:** MyRentSaathi subscription expire hone se 7 din pehle  
**Variables:** 5

| # | Variable | Example |
|---|----------|---------|
| {{1}} | User first name | Zafar |
| {{2}} | Plan name | Pro |
| {{3}} | Expiry date | 22 May 2026 |
| {{4}} | Days remaining | 7 |
| {{5}} | Renew link | https://myrentsaathi.com/select-plan |

**Template body:**
```
⚠️ Subscription Expiring — MyRentSaathi

Hi {{1}},

Your {{2}} plan is expiring soon!

📅 Expires: {{3}}
⏳ Days left: {{4}}

Renew now to avoid service interruption: {{5}}

All your data will be safe even after expiry.
— MyRentSaathi
```

---

### 11. `mrs_otp_verification`
**Trigger:** Login / sensitive action OTP  
**Variables:** 2

| # | Variable | Example |
|---|----------|---------|
| {{1}} | OTP code | 483921 |
| {{2}} | Validity minutes | 10 |

**Template body:**
```
🔐 MyRentSaathi Verification

Your OTP is: *{{1}}*

Valid for {{2}} minutes. Do not share this with anyone.

— MyRentSaathi Security Team
```

---

### 12. `mrs_tenant_moved_in`
**Trigger:** New tenant flat mein move in kare  
**Variables:** 5

| # | Variable | Example |
|---|----------|---------|
| {{1}} | Tenant first name | Rohit |
| {{2}} | Flat number | C-305 |
| {{3}} | Society name | Sunshine Apartments |
| {{4}} | Move-in date | 15 May 2026 |
| {{5}} | App link | https://myrentsaathi.com/tenant |

**Template body:**
```
🏠 Welcome to {{3}}!

Hi {{1}},

You have been assigned Flat {{2}}.

📅 Move-in date: {{4}}

Access your tenant portal: {{5}}

Pay rent, raise complaints, and more — all in one place.
— MyRentSaathi
```

---

## Meta Business Manager Mein Template Kaise Banayein

1. **business.facebook.com** → WhatsApp Accounts → apna account select karo
2. **Message Templates** → **Create Template**
3. **Category:** Utility
4. **Language:** English
5. Template name, body paste karo — `{{1}}` format mein variables
6. Submit for review — approval 24-48 hours mein aati hai

---

## Status Summary

| Template | Meta Status | Code Status |
|----------|------------|-------------|
| `mrs_welcome1` | ✅ Active | ✅ Implemented |
| `mrs_visitor_alert` | ✅ Active | ✅ Implemented |
| `mrs_ticket_update` | ✅ Active | ✅ Implemented |
| `mrs_notice_alert` | ✅ Active | ✅ Implemented |
| `mrs_maintenance_due` | ✅ Active | ✅ Implemented |
| `mrs_payment_receipt` | ✅ Active | ✅ Implemented |
| `mrs_rent_due` | ✅ Active | ✅ Implemented |
| `mrs_rent_hike_notice` | ✅ Active | ✅ Implemented |
