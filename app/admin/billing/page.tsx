import BillingDashboard from "@/components/billing/BillingDashboard";
import RentDueReport from "@/components/billing/RentDueReport";
import ReminderRulesCard from "@/components/billing/ReminderRulesCard";
import LateFeeRulesCard from "@/components/billing/LateFeeRulesCard";

export default function AdminBillingPage() {
  return (
    <div className="space-y-4">
      <RentDueReport />
      <div className="grid gap-4 lg:grid-cols-2">
        <ReminderRulesCard />
        <LateFeeRulesCard />
      </div>
      <BillingDashboard />
    </div>
  );
}
