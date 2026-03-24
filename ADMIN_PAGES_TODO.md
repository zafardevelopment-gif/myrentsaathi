# Society Admin Pages - Implementation Guide

## Status Summary
✅ Completed:
- ✅ DB schema migrations (add documents, integrations, document_access tables)
- ✅ Data layer functions (admin-data.ts - all CRUD operations)
- ✅ /admin/flats page (complete with create/edit/delete)

🔄 In Progress / Todo:
1. /admin/finance - Month history with filtering
2. /admin/expenses - Create/edit/delete with receipt uploads
3. /admin/tickets - Create/assign/resolve with categories
4. /admin/parking - Allocate/deallocate parking slots
5. /admin/notices - Schedule/archive notices
6. /admin/documents - Upload/share documents with permissions
7. /admin/governance - Member management + audit logs
8. /admin/settings - Integration configs (Razorpay, WhatsApp)
9. /admin/polls - View results and export votes
10. /admin/page.tsx - Enhance dashboard with drill-down links

## Database Setup Instructions

**Step 1: Run SQL Migration**
Execute this in Supabase SQL Editor:

```sql
-- Add documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_access" ON documents FOR ALL USING (true) WITH CHECK (true);

-- Add document_access table
CREATE TABLE IF NOT EXISTS document_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_type text NOT NULL DEFAULT 'view' CHECK (access_type IN ('view', 'download')),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(document_id, user_id)
);
ALTER TABLE document_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_access" ON document_access FOR ALL USING (true) WITH CHECK (true);

-- Add society_integrations table
CREATE TABLE IF NOT EXISTS society_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  config_json jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(society_id, provider)
);
ALTER TABLE society_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_access" ON society_integrations FOR ALL USING (true) WITH CHECK (true);

-- Add expense_receipts table
CREATE TABLE IF NOT EXISTS expense_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES society_expenses(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_access" ON expense_receipts FOR ALL USING (true) WITH CHECK (true);

-- Enhance existing tables
ALTER TABLE notices ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'draft' CHECK (delivery_status IN ('draft', 'scheduled', 'sent', 'archived'));
ALTER TABLE notices ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE flats ADD COLUMN IF NOT EXISTS occupancy_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE flats ADD COLUMN IF NOT EXISTS last_maintenance_date date;

ALTER TABLE maintenance_payments ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
ALTER TABLE maintenance_payments ADD COLUMN IF NOT EXISTS reminder_count integer DEFAULT 0;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_notes text;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changes_json jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address text;
```

## Implementation Order

### Priority 1 (Must Do First)
1. ✅ DB Schema migration
2. ✅ Data layer functions
3. ✅ /admin/flats page

### Priority 2 (Core Operations)
4. /admin/finance - Users need to see rent collection status
5. /admin/expenses - Critical for expense tracking and approvals
6. /admin/tickets - Essential for complaint resolution

### Priority 3 (Supporting)
7. /admin/parking - Nice to have but useful
8. /admin/notices - Communication channel
9. /admin/documents - File storage

### Priority 4 (Nice to Have)
10. /admin/governance - Admin/board management
11. /admin/settings - Integration configuration
12. /admin/polls - Voting/decisions

## Key Features by Page

### Finance Page
- Current month collection status
- Month-by-month toggle (shows "Collect from [count] flats this month")
- Filters: Status (paid/pending/overdue), Flat
- Actions: Send reminder (bulk), Mark paid, Download report
- Analytics: Collection rate %, overdue amount

### Expenses Page
- Create expense with category, description, amount, date
- Edit pending/rejected expenses
- Approve/reject workflow
- Receipt upload (future: image storage)
- View: By category, by date range, by status
- Actions: Bulk approve, bulk reject

### Tickets Page
- Create complaint (admin + tenant-facing)
- Assign to staff member (single or multiple)
- Priority: Low/Normal/Urgent
- Categories: Maintenance, Facilities, Billing, Other
- Status: Open, In Progress, Resolved
- Resolution notes on close
- Filter: By status, priority, category, assignee

### Parking Page
- Add slots in bulk (level A-101 to A-110)
- View: By status (available/occupied), by level
- Allocate: Flat + vehicle details
- Deallocate: Free up slot
- Analytics: Occupancy %, available count

### Documents Page
- Categories: SOA (Society Operations), Governance, Financials, Templates
- Upload with drag-drop
- Share with: Specific members, all members
- Download: With version history
- Delete (soft delete with archive)

### Notices Page
- Schedule notice for later date
- Archive old notices (soft delete)
- Status tracking: Draft, Scheduled, Sent, Archived
- Resend to specific audiences

## Testing Checklist

```
Signup Flow:
[ ] Create society "Test Society"
[ ] Verify admin account created
[ ] Login as admin
[ ] Dashboard loads with 0 stats

Flats:
[ ] Add 5 flats (A-101 to A-105)
[ ] View flats in grid
[ ] Delete one flat
[ ] Verify occupancy status changes

Finance:
[ ] See current month collection status
[ ] Filter by flat
[ ] Filter by status (pending/paid)
[ ] Toggle "All Months" view
[ ] Send reminder to pending

Expenses:
[ ] Create expense ($500 AC repair, pending)
[ ] View in pending list
[ ] Approve expense
[ ] View in approved list
[ ] Delete rejected expense

Tickets:
[ ] Create ticket from admin
[ ] Assign to staff
[ ] Change priority
[ ] Resolve with notes
[ ] View in closed section

Parking:
[ ] Create 10 parking slots
[ ] Allocate slot to flat A-101
[ ] View as occupied
[ ] Deallocate slot
[ ] View as available

Documents:
[ ] Upload PDF document
[ ] Share with member
[ ] Revoke access
[ ] Download document
[ ] Delete document

Governance:
[ ] Add board member
[ ] View audit logs
[ ] Remove member
[ ] View member history

Settings:
[ ] Save Razorpay key
[ ] Save WhatsApp API key
[ ] Verify integrations display
[ ] Update society details
```

## Notes

- All pages use MockAuthProvider (custom DB auth, not Supabase Auth)
- Passwords stored in plaintext ⚠️ (security issue to fix later)
- All data scoped by society via society_members table
- No real-time updates yet (can add WebSockets later)
- File upload requires Supabase Storage bucket "documents"
- RLS policies set to open (FOR ALL USING (true) WITH CHECK (true)) for MVP

## Next Steps

1. Run SQL migration in Supabase
2. Implement pages 4-12 following the patterns established
3. Test end-to-end signup → operations flow
4. Deploy to Vercel
5. Future: Add real-time updates, hashing passwords, better error handling
