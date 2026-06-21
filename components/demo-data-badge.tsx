import { DatabaseZap } from "lucide-react";
import { DEMO_DATA_NOTICE } from "@/lib/brand";

export function DemoDataBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
      <DatabaseZap size={14} />
      {DEMO_DATA_NOTICE}
    </span>
  );
}
