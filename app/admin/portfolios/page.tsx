import { AdminTable } from "@/components/saas/admin-table";
import { SectionHeading } from "@/components/saas/section-heading";
import { portfolios } from "@/lib/mock-saas-data";

export default function AdminPortfoliosPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Admin" title="Portefeuilles" />
      <AdminTable title="Portefeuilles" rows={portfolios.map((portfolio) => ({ name: portfolio.name, plan: portfolio.requiredPlan, risk: portfolio.riskScore }))} />
    </div>
  );
}
