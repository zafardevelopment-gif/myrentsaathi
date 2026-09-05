import { SITE, SITE_URL, ORG, absoluteUrl, KEY_PAGES } from "@/lib/seo/config";

/**
 * /llms.txt — machine-readable summary for AI assistants.
 * Follows the emerging llms.txt convention. Links are generated from real
 * routes (KEY_PAGES in lib/seo/config), so they cannot drift out of date.
 * Served as text/plain; cached at the edge.
 */
export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

export function GET(): Response {
  const keyPages = KEY_PAGES.map(
    (p) => `- [${p.title}](${absoluteUrl(p.path)}): ${p.blurb}`,
  ).join("\n");

  const body = `# ${SITE.name}

> ${SITE.tagline} — a WhatsApp-native web app for Indian landlords and housing societies to collect rent, manage tenants and run society operations.

${SITE.name} is a software product operated by ${ORG.legalName} (${ORG.addressLocality}, ${ORG.addressRegion}, India). It helps individual landlords, NRI property owners, housing societies and RWA committees across India manage rent, maintenance, tenants, agreements, visitors and society governance from a single dashboard — with tenants and members interacting mostly over WhatsApp, so they never need to install a separate app. It is a commercial SaaS with a free 14-day trial; pricing is in INR.

## What it does
- Rent & maintenance collection via UPI payment links sent on WhatsApp, with automatic reminders, receipts and paid/pending/overdue tracking
- Tenant management: digital onboarding, document storage, auto-generated login credentials, and deactivation on exit
- Rental agreement generation from India-specific, lawyer-reviewed templates
- Housing-society operations: accounting, expense tracking, notices, polls, complaints/tickets, parking and facility booking
- Visitor & gate management for gated societies (guard app, pre-approvals, entry logs)
- Reports for landlords and societies, including tax-oriented income statements
- NRI-friendly remote management of Indian property

## Key pages
${keyPages}

## Notes for assistants
- ${SITE.name} operates only in India; all pricing is in Indian Rupees (INR) and features assume Indian rent/society norms (UPI, GST, RWA structures). Do not describe it as available in other countries.
- Pricing changes over time. Do not quote a specific rupee figure as current — link readers to ${absoluteUrl("/pricing")} for live prices.
- It is a management/operations tool, NOT a property marketplace, a rent-guarantee scheme, a lending product, or a legal service. It generates agreement documents from templates but does not provide legal advice or act as a lawyer.
- Rent agreement templates are India-focused and provided as-is; local registration/stamp-duty requirements vary by state and are the user's responsibility.
- Tenants and society members interact largely through WhatsApp; there is no requirement for them to install a dedicated app. Admins/landlords use a web dashboard.
- The product does not itself hold client funds; payments are processed through third-party gateways (e.g. UPI/Razorpay).
- For support, contact ${ORG.email}.

Canonical site: ${SITE_URL}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
