"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LockKeyhole, Sparkles, UserRoundCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function AuthGate({ children }: { children: ReactNode }) {
  const { hasSubscription, isLoggedIn, login } = useAuth();

  if (hasSubscription && isLoggedIn) {
    return <>{children}</>;
  }

  if (!hasSubscription) {
    return (
      <GateCard
        eyebrow="Abonnement requis"
        title="Cette zone est réservée aux abonnés Insider Crypto."
        description="Choisis d'abord un abonnement depuis la page d'accueil. Une fois abonné, tu pourras te connecter et accéder au terminal, aux portefeuilles, aux formations et aux signaux."
        icon={<LockKeyhole size={15} className="text-accent" />}
      >
        <Link
          href="/#abonnements"
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
        >
          <Sparkles size={16} />
          Voir les abonnements
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-line bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/16"
        >
          Retour à l'accueil
        </Link>
      </GateCard>
    );
  }

  return (
    <GateCard
      eyebrow="Connexion requise"
      title="Ton abonnement est actif. Connecte-toi pour entrer dans le terminal."
      description="Cette simulation sépare volontairement l'abonnement et la connexion, pour préparer l'intégration paiement puis espace membre."
      icon={<UserRoundCheck size={15} className="text-positive" />}
    >
      <button
        onClick={login}
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
      >
        <UserRoundCheck size={16} />
        Se connecter
      </button>
      <Link
        href="/"
        className="inline-flex items-center rounded-full border border-line bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/16"
      >
        Retour à l'accueil
      </Link>
    </GateCard>
  );
}

function GateCard({
  eyebrow,
  title,
  description,
  icon,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="premium-card overflow-hidden rounded-[24px] p-6 shadow-glow lg:p-10">
      <div className="max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-sm text-white">
          {icon}
          {eyebrow}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-7 text-muted">{description}</p>
        <div className="mt-7 flex flex-wrap gap-3">{children}</div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {["Portefeuilles modèles", "Alpha Feed", "Formations premium"].map((item) => (
          <div key={item} className="rounded-2xl border border-line bg-white/[0.025] p-4">
            <p className="text-sm font-semibold text-white">{item}</p>
            <p className="mt-2 text-sm leading-6 text-muted">Inclus dans l'abonnement membre.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
