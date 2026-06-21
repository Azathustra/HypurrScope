import Link from "next/link";
import { ArrowRight, Bell, BriefcaseBusiness, Flame, GraduationCap, LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";
import { PublicNavbar } from "@/components/saas/public-navbar";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { DemoDataBadge } from "@/components/demo-data-badge";
import { PricingCard } from "@/components/saas/cards";
import { BRAND_NAME } from "@/lib/brand";
import { pricingPlans } from "@/lib/plans";

const productBlocks = [
  { title: "Research", text: "Theses, invalidations, niveaux de risque et suivi de narratifs.", icon: Flame },
  { title: "Portefeuilles", text: "Allocations modeles, historique, transactions et benchmark Bitcoin.", icon: BriefcaseBusiness },
  { title: "Alertes", text: "Notifications actionnables pour niveaux, flux et changements de regime.", icon: Bell },
  { title: "Formation", text: "Parcours progressifs pour apprendre la methode et eviter les decisions impulsives.", icon: GraduationCap }
];

export default function HomePage() {
  return (
    <>
      <PublicNavbar />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_10%,rgba(124,109,255,0.20),transparent_32rem),radial-gradient(circle_at_78%_20%,rgba(255,111,97,0.13),transparent_28rem)]" />
          <div className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div>
              <DemoDataBadge />
              <h1 className="mt-6 max-w-4xl text-4xl font-black uppercase leading-[0.96] tracking-[0.04em] text-white lg:text-7xl">
                {BRAND_NAME}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
                Une plateforme membre pour suivre les marches crypto, structurer ses theses, lire nos portefeuilles modeles et progresser
                dans une communaute orientee research.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-semibold text-ink transition hover:bg-white/90">
                  S'abonner
                  <ArrowRight size={16} />
                </Link>
                <Link href="/cryptos" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/30 px-6 py-4 text-sm font-semibold text-white transition hover:border-white/24">
                  Voir le terminal
                </Link>
              </div>
              <div className="mt-8">
                <DisclaimerBanner compact />
              </div>
            </div>

            <div className="premium-card rounded-[26px] p-5 lg:p-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Espace membre</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Terminal prive</h2>
                </div>
                <LockKeyhole className="text-positive" size={22} />
              </div>
              <div className="mt-5 grid gap-3">
                {productBlocks.map((block) => {
                  const Icon = block.icon;
                  return (
                    <div key={block.title} className="rounded-2xl border border-line bg-white/[0.025] p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
                          <Icon size={18} />
                        </span>
                        <div>
                          <h3 className="font-semibold text-white">{block.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-muted">{block.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-7 px-4 py-12 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Abonnements</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-5xl">Choisir son acces</h2>
            </div>
            <Link href="/community" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Voir la communaute
              <MessageCircle size={16} />
            </Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <PricingCard
                key={plan.key}
                name={plan.name}
                price={plan.price}
                cadence={plan.cadence}
                description={plan.description}
                highlight={plan.highlight}
                features={plan.features}
                priceKey={plan.key}
              />
            ))}
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 lg:grid-cols-3 lg:px-8">
            {["Paywall par abonnement", "Donnees sourcees", "RLS Supabase"].map((title, index) => (
              <div key={title} className="premium-card rounded-[22px] p-5">
                <ShieldCheck className={index === 0 ? "text-positive" : index === 1 ? "text-accent" : "text-negative"} size={22} />
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Le socle produit est prepare pour separer contenu public, contenu membre, paiement Stripe et donnees protegees cote Supabase.
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
