import { cn } from "@/lib/utils";

export function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
      {plan}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em]",
        risk === "low" && "bg-positive/10 text-positive",
        risk === "medium" && "bg-bitcoin/10 text-bitcoin",
        risk === "high" && "bg-negative/10 text-negative",
        risk === "extreme" && "bg-red-500/15 text-red-300"
      )}
    >
      {risk}
    </span>
  );
}

export function ConvictionBadge({ conviction }: { conviction: string | number }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-white">
      Conviction {conviction}
    </span>
  );
}

export function SubscriptionBadge({ status }: { status?: string | null }) {
  const active = status === "active" || status === "trialing";
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", active ? "bg-positive/10 text-positive" : "bg-white/8 text-muted")}>
      {active ? "Abonnement actif" : "Accès gratuit"}
    </span>
  );
}
