import DashboardShell from "@/components/dashboard/DashboardShell";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell role="landlord">{children}</DashboardShell>;
}
