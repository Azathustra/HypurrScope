"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, login } = useAuth();
  const isPublicPage = pathname === "/";

  if (isPublicPage || isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <section className="premium-card overflow-hidden rounded-[24px] p-6 shadow-glow lg:p-10">
      <div className="max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-sm text-white">
          <LockKeyhole size={15} className="text-accent" />
          Accès membre requis
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-5xl">
          Cette zone est réservée aux membres Insider Crypto.
        </h1>
        <p className="mt-5 text-base leading-7 text-muted">
          Les portefeuilles, signaux, données crypto, recherches et formations sont accessibles uniquement après connexion à
          l'espace premium. Le bouton ci-dessous simule l'accès membre en attendant le branchement paiement/authentification.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            onClick={login}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
          >
            <Sparkles size={16} />
            Débloquer l'accès premium
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-line bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/16"
          >
            Retour à l'accueil
          </Link>
        </div>
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
