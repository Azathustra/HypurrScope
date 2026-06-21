"use client";

import { CalendarDays, Search, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { SiteControls } from "@/components/site-controls";
import { useI18n } from "@/components/i18n-provider";

export function Topbar() {
  const { hasSubscription, isLoggedIn, login, logout } = useAuth();
  const { locale } = useI18n();
  const copy =
    locale === "en"
      ? { search: "Search an asset, thesis, signal...", calendar: "Calendar", member: "Member", login: "Login", subscribe: "Subscribe" }
      : { search: "Rechercher un actif, une these, un signal...", calendar: "Calendrier", member: "Membre", login: "Connexion", subscribe: "S'abonner" };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/78 px-4 py-4 backdrop-blur-xl lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full border border-line bg-panel px-4 text-sm text-muted">
          <Search size={17} />
          <input
            className="w-full bg-transparent text-white placeholder:text-muted focus:outline-none"
            placeholder={copy.search}
          />
        </label>
        <button className="hidden h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 text-sm text-white transition hover:border-white/16 sm:flex">
          <CalendarDays size={17} />
          {copy.calendar}
        </button>
        <div className="hidden md:block">
          <SiteControls />
        </div>
        <button
          onClick={isLoggedIn ? logout : login}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-panel px-3 text-white transition hover:border-white/16 sm:px-4"
        >
          <UserRound size={18} />
          <span className="hidden text-sm font-medium sm:inline">
            {isLoggedIn ? copy.member : hasSubscription ? copy.login : copy.subscribe}
          </span>
        </button>
      </div>
    </header>
  );
}
