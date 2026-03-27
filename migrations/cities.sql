-- ============================================================
-- CITIES — Programmatic SEO city pages
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name  text NOT NULL,
  slug       text NOT NULL UNIQUE,           -- URL slug, e.g. "delhi"
  state      text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,     -- controls footer/homepage order
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cities_slug   ON public.cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_active ON public.cities(is_active, sort_order);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cities"
  ON public.cities FOR SELECT
  USING (true);

-- ── SEED — 20 major Indian cities ─────────────────────────────
INSERT INTO public.cities (city_name, slug, state, is_active, sort_order) VALUES
  ('Delhi',           'delhi',           'Delhi',             true,  1),
  ('Mumbai',          'mumbai',          'Maharashtra',       true,  2),
  ('Bangalore',       'bangalore',       'Karnataka',         true,  3),
  ('Hyderabad',       'hyderabad',       'Telangana',         true,  4),
  ('Pune',            'pune',            'Maharashtra',       true,  5),
  ('Chennai',         'chennai',         'Tamil Nadu',        true,  6),
  ('Kolkata',         'kolkata',         'West Bengal',       true,  7),
  ('Ahmedabad',       'ahmedabad',       'Gujarat',           true,  8),
  ('Noida',           'noida',           'Uttar Pradesh',     true,  9),
  ('Gurgaon',         'gurgaon',         'Haryana',           true,  10),
  ('Navi Mumbai',     'navi-mumbai',     'Maharashtra',       true,  11),
  ('Thane',           'thane',           'Maharashtra',       true,  12),
  ('Chandigarh',      'chandigarh',      'Chandigarh',        true,  13),
  ('Jaipur',          'jaipur',          'Rajasthan',         true,  14),
  ('Lucknow',         'lucknow',         'Uttar Pradesh',     true,  15),
  ('Indore',          'indore',          'Madhya Pradesh',    true,  16),
  ('Bhopal',          'bhopal',          'Madhya Pradesh',    true,  17),
  ('Kochi',           'kochi',           'Kerala',            true,  18),
  ('Coimbatore',      'coimbatore',      'Tamil Nadu',        true,  19),
  ('Surat',           'surat',           'Gujarat',           true,  20),
  ('Nagpur',          'nagpur',          'Maharashtra',       true,  21),
  ('Visakhapatnam',   'visakhapatnam',   'Andhra Pradesh',    true,  22),
  ('Bhubaneswar',     'bhubaneswar',     'Odisha',            true,  23),
  ('Ghaziabad',       'ghaziabad',       'Uttar Pradesh',     true,  24),
  ('Faridabad',       'faridabad',       'Haryana',           true,  25)
ON CONFLICT (slug) DO NOTHING;
