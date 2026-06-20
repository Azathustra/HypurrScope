"use client";

import Link from "next/link";
import { ArrowRight, LogOut, Sparkles, UserRoundCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function AccessCta() {
  const { hasSubscription, isLoggedIn, subscribe, login, logout } = useAuth();

  if (isLoggedIn) {
    return (
      <div className="flex flex-wrap gap-3">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
        >
          Entrer dans le terminal
          <ArrowRight size={16} />
        </Link>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/40 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/32"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </div>
    );
  }

  if (hasSubscription) {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={login}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
        >
          <UserRoundCheck size={16} />
          Se connecter
        </button>
        <Link
          href="/formation"
          className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/40 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/32"
        >
          Voir les formations
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={subscribe}
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
      >
        <Sparkles size={16} />
        Devenir membre
      </button>
      <a
        href="#abonnements"
        className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/40 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/32"
      >
        Voir les abonnements
        <ArrowRight size={16} />
      </a>
    </div>
  );
}
