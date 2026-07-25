-- Allow rent_hike_history rows to represent a future scheduled hike, not just an
-- already-applied one. Existing rows are historical/applied hikes and default accordingly.
ALTER TABLE rent_hike_history ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'applied'
  CHECK (status IN ('scheduled', 'applied', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_rent_hike_history_scheduled
  ON rent_hike_history (effective_date) WHERE status = 'scheduled';

-- Recurring hikes: a scheduled row can repeat on a fixed cadence. When a recurring
-- hike is applied, the cron spawns the next occurrence as a new 'scheduled' row
-- linked back via recurrence_parent_id, so each row still represents one hike event.
ALTER TABLE rent_hike_history ADD COLUMN IF NOT EXISTS recurrence_frequency text
  CHECK (recurrence_frequency IN ('monthly', 'quarterly', 'half_yearly', 'yearly'));
ALTER TABLE rent_hike_history ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid
  REFERENCES rent_hike_history(id) ON DELETE SET NULL;
