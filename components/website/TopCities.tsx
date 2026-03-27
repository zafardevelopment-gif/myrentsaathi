import Link from "next/link";
import { getActiveCities } from "@/lib/cities-data";

export default async function TopCities() {
  const cities = await getActiveCities();

  return (
    <section className="py-16 bg-warm-50 border-y border-border-default">
      <div className="max-w-[1140px] mx-auto px-6">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-3xl text-xs font-bold text-brand-500 bg-brand-100 tracking-wider mb-3">
            ALL INDIA
          </span>
          <h2 className="font-serif text-[30px] font-extrabold text-ink leading-tight">
            Available Across India
          </h2>
          <p className="text-[15px] text-ink/60 mt-2 max-w-[500px] mx-auto">
            Rent management software for landlords and housing societies in every major Indian city.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5">
          {cities.map((city) => (
            <Link
              key={city.slug}
              href={`/rent-management-software/${city.slug}`}
              className="px-4 py-2 bg-white rounded-xl border border-border-default text-[13px] font-semibold text-ink hover:border-brand-400 hover:text-brand-600 hover:shadow-sm transition-all"
            >
              {city.city_name}
              <span className="text-[11px] text-ink-muted ml-1.5 font-normal">
                {city.state}
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-6 text-[12px] text-ink-muted">
          {cities.length}+ cities · More being added
        </div>
      </div>
    </section>
  );
}
