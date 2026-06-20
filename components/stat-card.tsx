import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "positive" | "negative";
};

export function StatCard({ label, value, detail, tone = "default" }: StatCardProps) {
  return (
    <div className="premium-card rounded-[18px] p-5 transition hover:border-white/15 hover:bg-panelSoft">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted">{label}</p>
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10",
            tone === "positive" && "text-positive",
            tone === "negative" && "text-negative",
            tone === "default" && "text-accent"
          )}
        >
          <ArrowUpRight size={16} />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-muted">{detail}</p> : null}
    </div>
  );
}
