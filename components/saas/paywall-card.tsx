import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function PaywallCard({ requiredPlan = "member" }: { requiredPlan?: string }) {
  return (
    <section className="premium-card rounded-[20px] p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/12 text-accent">
        <LockKeyhole size={20} />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-white">Analyse réservée aux membres</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted">
        Ce contenu nécessite le plan {requiredPlan}. Le contenu premium n'est jamais exposé côté client sans accès actif.
      </p>
      <Link
        href="/pricing"
        className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink"
      >
        Voir les abonnements
      </Link>
    </section>
  );
}
