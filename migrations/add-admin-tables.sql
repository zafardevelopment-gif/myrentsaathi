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

-- Add document_access table for permissions
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

-- Add society_integrations table for API configs
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

-- Enhance notices table with new columns
ALTER TABLE notices ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'draft' CHECK (delivery_status IN ('draft', 'scheduled', 'sent', 'archived'));
ALTER TABLE notices ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Enhance flats table
ALTER TABLE flats ADD COLUMN IF NOT EXISTS occupancy_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE flats ADD COLUMN IF NOT EXISTS last_maintenance_date date;

-- Enhance maintenance_payments
ALTER TABLE maintenance_payments ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
ALTER TABLE maintenance_payments ADD COLUMN IF NOT EXISTS reminder_count integer DEFAULT 0;

-- Enhance tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_notes text;

-- Enhance audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changes_json jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address text;
