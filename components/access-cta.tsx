"use client";

import Link from "next/link";
import { ArrowRight, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function AccessCta() {
  const { isLoggedIn, login, logout } = useAuth();

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
          className="inline-flex items-center gap-2 rounded-full border border-line bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/16"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={login}
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
      >
        <Sparkles size={16} />
        Accéder au premium
      </button>
      <Link
        href="/formation"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/16"
      >
        Voir les formations
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
