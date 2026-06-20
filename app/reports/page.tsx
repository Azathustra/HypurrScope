import { SectionHeading } from "@/components/saas/section-heading";
import { PlanBadge } from "@/components/saas/badges";
import { reports } from "@/lib/mock-saas-data";

export default function ReportsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Rapports" title="Rapports longs" description="PDFs et notes longues prêtes pour stockage Supabase." />
      <div className="grid gap-4">
        {reports.map((report) => (
          <article key={report.id} className="premium-card rounded-[20px] p-5">
            <PlanBadge plan={report.requiredPlan} />
            <h2 className="mt-4 text-xl font-semibold text-white">{report.title}</h2>
            <p className="mt-2 text-sm text-muted">{report.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
