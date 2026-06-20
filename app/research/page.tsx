import { SlidersHorizontal, Search } from "lucide-react";
import { researchResults } from "@/lib/mock-data";

export default function ResearchPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Recherche</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">Moteur de recherche visuel</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
          Explore les dossiers, signaux, notes d'analyse et actifs suivis par Insider Crypto.
        </p>
      </div>

      <section className="premium-card rounded-[20px] p-5 lg:p-6">
        <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-black/20 px-4 text-muted">
          <Search size={20} />
          <input
            className="w-full bg-transparent text-lg text-white placeholder:text-muted focus:outline-none"
            placeholder="Rechercher Bitcoin, Hyperliquid, ETF, AI, portefeuille..."
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Tous", "Notes", "Portefeuilles", "Protocoles", "Macro", "On-chain"].map((filter) => (
            <button
              key={filter}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-white/16 hover:text-white"
            >
              {filter === "Tous" ? <SlidersHorizontal size={15} /> : null}
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {researchResults.map((result) => (
          <article key={result.title} className="premium-card rounded-[20px] p-5 transition hover:border-white/16 hover:bg-panelSoft">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent/14 px-3 py-1 text-xs font-semibold text-white">{result.type}</span>
              <span className="text-xs text-muted">{result.date}</span>
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">{result.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{result.excerpt}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
