# Meta WhatsApp Template — User Credentials Notification

## Template Name
`user_credentials_sent`

## Category
**UTILITY** (marketing nahi — credential notification utility hai)

## Language
English (`en`)

## Template Body Text (exact)

```
Dear {{1}}, your MyRentSaathi login credentials have been sent to your email {{2}}. Please check your inbox (and spam folder) and change your password after your first login. Login: https://myrentsaathi.com/login
```

## Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `{{1}}` | Recipient's full name | Rajesh Kumar |
| `{{2}}` | Login email address | rajesh@gmail.com |

## How to create in Meta Business Manager

1. Go to **Meta Business Manager** → **WhatsApp Manager** → **Message Templates**
2. Click **Create Template**
3. Select Category: **Utility**
4. Template Name: `user_credentials_sent` (exact, lowercase, underscores only)
5. Language: **English**
6. Body: paste the text above exactly
7. Add sample values:
   - `{{1}}` → `Rajesh Kumar`
   - `{{2}}` → `rajesh@gmail.com`
8. Submit for review — approval usually takes a few minutes for Utility templates

## How it is used in code

API endpoint: `POST /api/whatsapp/notify-credentials`

Payload:
```json
{
  "phone": "9876543210",
  "name": "Rajesh Kumar",
  "email": "rajesh@gmail.com"
}
```

This is called automatically whenever:
- Society Admin creates a new Landlord (`/admin/landlords`)
- Society Admin adds a Flat with Landlord/Tenant (`/admin/flats`)
- Landlord creates a new Tenant (`/landlord/tenants`)
