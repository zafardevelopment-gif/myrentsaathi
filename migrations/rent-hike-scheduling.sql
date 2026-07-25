-- Allow rent_hike_history rows to represent a future scheduled hike, not just an
-- already-applied one. Existing rows are historical/applied hikes and default accordingly.
ALTER TABLE rent_hike_history ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'applied'
  CHECK (status IN ('scheduled', 'applied', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_rent_hike_history_scheduled
  ON rent_hike_history (effective_date) WHERE status = 'scheduled';
