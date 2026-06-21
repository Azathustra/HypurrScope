import { notFound } from "next/navigation";
import { BellPlus } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { watchlists } from "@/lib/community-data";

export default async function WatchlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const watchlist = watchlists.find((item) => item.id === id);

  if (!watchlist) {
    notFound();
  }

  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Watchlist" title={watchlist.name} description={watchlist.description} />
      <div className="premium-card rounded-[22px] p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {watchlist.assets.map((asset, index) => (
            <div key={asset} className="rounded-2xl border border-line bg-white/[0.025] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">#{index + 1}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{asset}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">These, niveaux et alertes seront relies aux flux marche.</p>
              <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-white">
                <BellPlus size={15} />
                Creer alerte
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
