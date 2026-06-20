import { AdminTable } from "@/components/saas/admin-table";
import { SectionHeading } from "@/components/saas/section-heading";

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Admin" title="Abonnements" />
      <AdminTable title="Subscriptions" rows={[{ customer: "cus_mock", status: "active", plan: "member" }, { customer: "cus_desk", status: "trialing", plan: "desk" }]} />
    </div>
  );
}
