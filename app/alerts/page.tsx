import { BellRing } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { DemoDataBadge } from "@/components/demo-data-badge";
import { alerts } from "@/lib/community-data";

export default function AlertsPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow="Alertes" title="Centre d'alertes" description="Prix, flux, portefeuille et notifications membres." />
        <DemoDataBadge />
      </div>
      <div className="premium-card rounded-[22px] p-5">
        <div className="divide-y divide-line">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <BellRing className={alert.status === "active" ? "text-positive" : "text-muted"} size={20} />
                <div>
                  <p className="font-semibold text-white">{alert.asset}</p>
                  <p className="mt-1 text-sm text-muted">{alert.condition}</p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{alert.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
