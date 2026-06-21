import { ShieldAlert } from "lucide-react";
import { RISK_DISCLAIMER } from "@/lib/brand";

export function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "rounded-2xl border border-line bg-white/[0.025] px-4 py-3" : "premium-card rounded-[20px] p-4"}>
      <div className="flex gap-3 text-sm leading-6 text-muted">
        <ShieldAlert className="mt-0.5 shrink-0 text-accent" size={18} />
        <p>{RISK_DISCLAIMER}</p>
      </div>
    </div>
  );
}
