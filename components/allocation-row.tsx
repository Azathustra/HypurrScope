import { Allocation } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { AssetIcon } from "@/components/asset-icon";

export function AllocationRow({ allocation }: { allocation: Allocation }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-line bg-white/[0.025] p-3 transition hover:border-white/14 hover:bg-white/[0.04] sm:grid-cols-[1fr_110px_90px]">
      <div className="flex min-w-0 items-center gap-3">
        <AssetIcon ticker={allocation.ticker} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{allocation.name}</p>
          <p className="text-xs text-muted">{allocation.ticker}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-white">{formatCurrency(allocation.value)}</p>
        <p className={allocation.performance >= 0 ? "text-xs text-positive" : "text-xs text-negative"}>
          {allocation.performance >= 0 ? "+" : ""}
          {allocation.performance}%
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold text-white">{allocation.weight}%</p>
        <p className="text-xs text-muted">poids</p>
      </div>
    </div>
  );
}
