import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { DemoDataBadge } from "@/components/demo-data-badge";
import { watchlists } from "@/lib/community-data";

export default function WatchlistsPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow="Watchlists" title="Listes de suivi" description="Actifs surveilles, theses, seuils d'alerte et changements de regime." />
        <DemoDataBadge />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {watchlists.map((watchlist) => (
          <Link key={watchlist.id} href={`/watchlists/${watchlist.id}`} className="premium-card rounded-[20px] p-5 transition hover:border-white/16">
            <Eye className="text-accent" size={22} />
            <h2 className="mt-4 text-xl font-semibold text-white">{watchlist.name}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{watchlist.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {watchlist.assets.map((asset) => (
                <span key={asset} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-white">{asset}</span>
              ))}
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Ouvrir <ArrowRight size={15} />
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
