/**
 * Cities Data Layer
 * Fetches city data from Supabase for programmatic SEO.
 * Falls back to a static list if DB is unavailable.
 */

import { supabase } from './supabase'

export type City = {
  id: string
  city_name: string
  slug: string
  state: string
  is_active: boolean
  sort_order: number
}

// ── Static fallback (mirrors DB seed) ──────────────────────────
export const FALLBACK_CITIES: City[] = [
  { id: '1',  city_name: 'Delhi',         slug: 'delhi',         state: 'Delhi',           is_active: true, sort_order: 1  },
  { id: '2',  city_name: 'Mumbai',        slug: 'mumbai',        state: 'Maharashtra',     is_active: true, sort_order: 2  },
  { id: '3',  city_name: 'Bangalore',     slug: 'bangalore',     state: 'Karnataka',       is_active: true, sort_order: 3  },
  { id: '4',  city_name: 'Hyderabad',     slug: 'hyderabad',     state: 'Telangana',       is_active: true, sort_order: 4  },
  { id: '5',  city_name: 'Pune',          slug: 'pune',          state: 'Maharashtra',     is_active: true, sort_order: 5  },
  { id: '6',  city_name: 'Chennai',       slug: 'chennai',       state: 'Tamil Nadu',      is_active: true, sort_order: 6  },
  { id: '7',  city_name: 'Kolkata',       slug: 'kolkata',       state: 'West Bengal',     is_active: true, sort_order: 7  },
  { id: '8',  city_name: 'Ahmedabad',     slug: 'ahmedabad',     state: 'Gujarat',         is_active: true, sort_order: 8  },
  { id: '9',  city_name: 'Noida',         slug: 'noida',         state: 'Uttar Pradesh',   is_active: true, sort_order: 9  },
  { id: '10', city_name: 'Gurgaon',       slug: 'gurgaon',       state: 'Haryana',         is_active: true, sort_order: 10 },
  { id: '11', city_name: 'Navi Mumbai',   slug: 'navi-mumbai',   state: 'Maharashtra',     is_active: true, sort_order: 11 },
  { id: '12', city_name: 'Thane',         slug: 'thane',         state: 'Maharashtra',     is_active: true, sort_order: 12 },
  { id: '13', city_name: 'Chandigarh',    slug: 'chandigarh',    state: 'Chandigarh',      is_active: true, sort_order: 13 },
  { id: '14', city_name: 'Jaipur',        slug: 'jaipur',        state: 'Rajasthan',       is_active: true, sort_order: 14 },
  { id: '15', city_name: 'Lucknow',       slug: 'lucknow',       state: 'Uttar Pradesh',   is_active: true, sort_order: 15 },
  { id: '16', city_name: 'Indore',        slug: 'indore',        state: 'Madhya Pradesh',  is_active: true, sort_order: 16 },
  { id: '17', city_name: 'Bhopal',        slug: 'bhopal',        state: 'Madhya Pradesh',  is_active: true, sort_order: 17 },
  { id: '18', city_name: 'Kochi',         slug: 'kochi',         state: 'Kerala',          is_active: true, sort_order: 18 },
  { id: '19', city_name: 'Coimbatore',    slug: 'coimbatore',    state: 'Tamil Nadu',      is_active: true, sort_order: 19 },
  { id: '20', city_name: 'Surat',         slug: 'surat',         state: 'Gujarat',         is_active: true, sort_order: 20 },
  { id: '21', city_name: 'Nagpur',        slug: 'nagpur',        state: 'Maharashtra',     is_active: true, sort_order: 21 },
  { id: '22', city_name: 'Visakhapatnam', slug: 'visakhapatnam', state: 'Andhra Pradesh',  is_active: true, sort_order: 22 },
  { id: '23', city_name: 'Bhubaneswar',   slug: 'bhubaneswar',   state: 'Odisha',          is_active: true, sort_order: 23 },
  { id: '24', city_name: 'Ghaziabad',     slug: 'ghaziabad',     state: 'Uttar Pradesh',   is_active: true, sort_order: 24 },
  { id: '25', city_name: 'Faridabad',     slug: 'faridabad',     state: 'Haryana',         is_active: true, sort_order: 25 },
]

// ── Public reads ────────────────────────────────────────────────

/** Fetch all active cities ordered by sort_order. */
export async function getActiveCities(): Promise<City[]> {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    if (data && data.length > 0) return data as City[]
  } catch {
    // DB not ready yet — use static fallback
  }
  return FALLBACK_CITIES.filter((c) => c.is_active)
}

/** Fetch a single city by slug. Returns null if not found or inactive. */
export async function getCityBySlug(slug: string): Promise<City | null> {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) throw error
    if (data) return data as City
  } catch {
    // Fallback to static list
  }
  return FALLBACK_CITIES.find((c) => c.slug === slug && c.is_active) ?? null
}

/** Fetch all slugs (used by generateStaticParams). */
export async function getAllCitySlugs(): Promise<string[]> {
  const cities = await getActiveCities()
  return cities.map((c) => c.slug)
}
