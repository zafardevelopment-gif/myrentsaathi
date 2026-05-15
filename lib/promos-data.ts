// Single source of truth for promo codes
// Both checkout page and superadmin/promos page import from here
// When DB is ready, replace PROMO_LIST with a fetch call

export type PromoType = "percentage" | "fixed";
export type PromoStatus = "active" | "expired" | "disabled";

export type Promo = {
  code: string;
  type: PromoType;
  value: number;
  maxUses: number;
  used: number;
  minPlan: string;
  validTill: string;
  status: PromoStatus;
  savings: number;
  createdBy: string;
  revenue: number;
};

export const PROMO_LIST: Promo[] = [
  { code: "LAUNCH50",   type: "percentage", value: 50,   maxUses: 500,  used: 234, minPlan: "any",          validTill: "2026-04-30", status: "active",  savings: 356000, createdBy: "System",               revenue: 0 },
  { code: "SOCIETY20",  type: "percentage", value: 20,   maxUses: 200,  used: 89,  minPlan: "professional", validTill: "2026-06-30", status: "active",  savings: 120000, createdBy: "Admin",                revenue: 0 },
  { code: "FLAT1000",   type: "fixed",      value: 1000, maxUses: 1000, used: 445, minPlan: "any",          validTill: "2026-12-31", status: "active",  savings: 445000, createdBy: "System",               revenue: 0 },
  { code: "AGENTRAHUL", type: "percentage", value: 10,   maxUses: 100,  used: 45,  minPlan: "any",          validTill: "2026-12-31", status: "active",  savings: 45000,  createdBy: "Agent: Rahul Verma",   revenue: 185000 },
  { code: "AGENTSNEHA", type: "percentage", value: 10,   maxUses: 100,  used: 28,  minPlan: "any",          validTill: "2026-12-31", status: "active",  savings: 28000,  createdBy: "Agent: Sneha Kulkarni", revenue: 100000 },
  { code: "NRI30",      type: "percentage", value: 30,   maxUses: 100,  used: 28,  minPlan: "nri",          validTill: "2026-09-30", status: "active",  savings: 42000,  createdBy: "Admin",                revenue: 0 },
  { code: "DIWALI25",   type: "percentage", value: 25,   maxUses: 300,  used: 300, minPlan: "any",          validTill: "2025-11-30", status: "expired", savings: 225000, createdBy: "System",               revenue: 0 },
  { code: "SUMMER10",   type: "percentage", value: 10,   maxUses: 400,  used: 145, minPlan: "any",          validTill: "2026-08-31", status: "active",  savings: 65000,  createdBy: "Admin",                revenue: 0 },
  { code: "TEST95",     type: "percentage", value: 95,   maxUses: 500,  used: 0,   minPlan: "any",          validTill: "2026-06-30", status: "active",  savings: 0,      createdBy: "Admin",                revenue: 0 },
];

export type PromoResult = { type: "percent" | "flat"; value: number; label: string };

export function validatePromo(
  code: string,
  allPromos: Promo[] = PROMO_LIST
): { valid: true; promo: PromoResult } | { valid: false; error: string } {
  const found = allPromos.find((p) => p.code === code.trim().toUpperCase());
  if (!found) return { valid: false, error: "Invalid promo code." };
  if (found.status === "expired") return { valid: false, error: "Yeh promo code expire ho chuka hai." };
  if (found.status === "disabled") return { valid: false, error: "Yeh promo code abhi active nahi hai." };
  if (new Date() > new Date(found.validTill)) return { valid: false, error: "Yeh promo code expire ho chuka hai." };
  if (found.used >= found.maxUses) return { valid: false, error: "Yeh promo code ki limit khatam ho gayi hai." };
  const type: "percent" | "flat" = found.type === "percentage" ? "percent" : "flat";
  const label = type === "percent" ? `${found.value}% off` : `₹${found.value} flat discount`;
  return { valid: true, promo: { type, value: found.value, label } };
}

export function applyPromo(price: number, promo: PromoResult | null): number {
  if (!promo) return price;
  if (promo.type === "percent") return Math.round(price * (1 - promo.value / 100));
  return Math.max(0, price - promo.value);
}
