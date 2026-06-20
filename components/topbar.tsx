"use client";

import { CalendarDays, Search, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function Topbar() {
  const { hasSubscription, isLoggedIn, login, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/78 px-4 py-4 backdrop-blur-xl lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full border border-line bg-panel px-4 text-sm text-muted">
          <Search size={17} />
          <input
            className="w-full bg-transparent text-white placeholder:text-muted focus:outline-none"
            placeholder="Rechercher un actif, une thèse, un signal..."
          />
        </label>
        <button className="hidden h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 text-sm text-white transition hover:border-white/16 sm:flex">
          <CalendarDays size={17} />
          Calendrier
        </button>
        <button
          onClick={isLoggedIn ? logout : login}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-panel px-3 text-white transition hover:border-white/16 sm:px-4"
        >
          <UserRound size={18} />
          <span className="hidden text-sm font-medium sm:inline">
            {isLoggedIn ? "Membre" : hasSubscription ? "Connexion" : "S'abonner"}
          </span>
        </button>
      </div>
    </header>
  );
}
