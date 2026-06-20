import { AdminTable } from "@/components/saas/admin-table";
import { SectionHeading } from "@/components/saas/section-heading";
import { alphaSignals } from "@/lib/mock-saas-data";

export default function AdminSignalsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Admin" title="Alpha signals" />
      <AdminTable title="Signaux" rows={alphaSignals.map((signal) => ({ title: signal.title, ticker: signal.ticker, conviction: signal.conviction }))} />
    </div>
  );
}
