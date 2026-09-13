import BillingDashboard from "@/components/billing/BillingDashboard";
import RentDueReport from "@/components/billing/RentDueReport";
import ReminderRulesCard from "@/components/billing/ReminderRulesCard";

export default function LandlordBillingPage() {
  return (
    <div className="space-y-4">
      <RentDueReport />
      <ReminderRulesCard />
      <BillingDashboard />
    </div>
  );
}
