// Brand colors
export const COLORS = {
  brand: {
    50: "#fefbf3",
    100: "#fdf4e3",
    200: "#f9e4bf",
    300: "#f2cc8a",
    400: "#e5a94a",
    500: "#c2660a",
    600: "#8c4a06",
    700: "#6b3504",
    800: "#4a2503",
    900: "#1a1612",
  },
  forest: { 50: "#ecfdf3", 100: "#d1fae5", 500: "#1b5e3b" },
  ink: { DEFAULT: "#1c1917", soft: "#44403c", muted: "#78716c" },
  warm: { 50: "#fefbf3", 100: "#fdf4e3", 200: "#f9e4bf", 300: "#f2cc8a" },
  border: { DEFAULT: "#e7e2dc", light: "#f5f0ea" },
  bg: { DEFAULT: "#fffcf7", dark: "#1a1612", card: "#ffffff" },
};

// User roles
export const ROLES = {
  SUPERADMIN: "superadmin",
  SOCIETY_ADMIN: "society_admin",
  BOARD_MEMBER: "board_member",
  LANDLORD: "landlord",
  TENANT: "tenant",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// Dashboard roles (simplified)
export const DASHBOARD_ROLES = ["admin", "board", "landlord", "tenant"] as const;
export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

// Flat types
export const FLAT_TYPES = [
  "1BHK",
  "2BHK",
  "3BHK",
  "4BHK",
  "Studio",
  "Penthouse",
] as const;

// Flat status
export const FLAT_STATUS = [
  "occupied",
  "vacant",
  "under_maintenance",
  "locked",
] as const;

// Payment status
export const PAYMENT_STATUS = [
  "pending",
  "paid",
  "partial",
  "overdue",
  "waived",
] as const;

// Ticket categories
export const TICKET_CATEGORIES = [
  "plumbing",
  "electrical",
  "lift",
  "parking",
  "noise",
  "security",
  "cleaning",
  "water_supply",
  "structural",
  "pest",
  "garden",
  "other",
] as const;

// Ticket priorities
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

// Ticket status
export const TICKET_STATUS = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
] as const;

// Expense categories
export const EXPENSE_CATEGORIES = [
  "electricity",
  "water",
  "cleaning",
  "security",
  "lift_maintenance",
  "garden",
  "painting",
  "plumbing",
  "electrical_repair",
  "pest_control",
  "insurance",
  "legal",
  "audit",
  "festival",
  "general",
  "other",
] as const;

// Notice types
export const NOTICE_TYPES = [
  "general",
  "urgent",
  "maintenance",
  "event",
  "financial",
  "rule_change",
] as const;

// Status color mapping
export const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  paid: { text: "text-green-700", bg: "bg-green-100" },
  completed: { text: "text-green-700", bg: "bg-green-100" },
  resolved: { text: "text-green-700", bg: "bg-green-100" },
  active: { text: "text-green-700", bg: "bg-green-100" },
  approved: { text: "text-green-700", bg: "bg-green-100" },
  occupied: { text: "text-green-700", bg: "bg-green-100" },
  pending: { text: "text-yellow-700", bg: "bg-yellow-100" },
  assigned: { text: "text-yellow-700", bg: "bg-yellow-100" },
  in_progress: { text: "text-yellow-700", bg: "bg-yellow-100" },
  draft: { text: "text-yellow-700", bg: "bg-yellow-100" },
  overdue: { text: "text-red-700", bg: "bg-red-100" },
  open: { text: "text-red-700", bg: "bg-red-100" },
  urgent: { text: "text-red-700", bg: "bg-red-100" },
  rejected: { text: "text-red-700", bg: "bg-red-100" },
  vacant: { text: "text-gray-600", bg: "bg-gray-100" },
  available: { text: "text-cyan-700", bg: "bg-cyan-100" },
};

// Subscription plans
export const SUBSCRIPTION_PLANS = ["free", "basic", "pro", "enterprise"] as const;
