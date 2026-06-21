"use client";

import Link from "next/link";
import { useState } from "react";
import { BriefcaseBusiness, CircleDollarSign, Flame, GraduationCap, Landmark, LineChart, LockKeyhole, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const items = [
  { label: "Crypto", href: "/cryptos", icon: CircleDollarSign },
  { label: "TradFi", href: "/tradfi", icon: LineChart },
  { label: "Treasuries", href: "/crypto-treasuries", icon: Landmark },
  { label: "Research", href: "/feed", icon: Flame, premium: true },
  { label: "Portfolio", href: "/portfolios", icon: BriefcaseBusiness, premium: true },
  { label: "Formation", href: "/formations", icon: GraduationCap, premium: true },
  { label: "Watchlist", href: "/watchlists", icon: CircleDollarSign, premium: true }
];

export function MobileNav() {
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { hasSubscription, isLoggedIn } = useAuth();
  const hasPremiumAccess = hasSubscription && isLoggedIn;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/92 px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isLocked = Boolean(item.premium && !hasPremiumAccess);

            if (isLocked) {
              return (
                <button
                  key={item.label}
                  onClick={() => setShowPremiumModal(true)}
                  className="relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-muted transition hover:bg-white/[0.04] hover:text-white"
                >
                  <Icon size={17} />
                  <LockKeyhole className="absolute right-1 top-1 text-accent" size={10} />
                  <span className="max-w-full truncate">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-muted transition hover:bg-white/[0.04] hover:text-white"
              >
                <Icon size={17} />
                {item.premium ? <LockKeyhole className="absolute right-1 top-1 text-positive" size={10} /> : null}
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {showPremiumModal ? <PremiumAccessModal onClose={() => setShowPremiumModal(false)} /> : null}
    </>
  );
}

function PremiumAccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[26px] border border-white/10 bg-[#080A0F] p-8 shadow-glow lg:p-10">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
            <LockKeyhole size={24} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Premium verrouille</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Se connecter ou s'abonner</h2>
          </div>
        </div>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
          Cette rubrique est reservee aux membres Premium. Connecte-toi si tu as deja un acces, ou choisis un abonnement.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/login" className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-4 text-sm font-semibold text-ink">
            Se connecter
          </Link>
          <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-4 text-sm font-semibold text-white">
            S'abonner
          </Link>
        </div>
      </div>
    </div>
  );
}
