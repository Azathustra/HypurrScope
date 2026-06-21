"use client";

import { UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { SiteControls } from "@/components/site-controls";
import { useI18n } from "@/components/i18n-provider";

export function Topbar() {
  const { isLoggedIn, login, logout } = useAuth();
  const { locale } = useI18n();
  const copy =
    locale === "en"
      ? { member: "Member", login: "Login" }
      : { member: "Membre", login: "Connexion" };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/78 px-4 py-3 backdrop-blur-xl lg:px-8">
      <div className="mx-auto flex max-w-[1680px] items-center justify-end gap-3">
        <div className="hidden md:block">
          <SiteControls />
        </div>
        <button
          onClick={isLoggedIn ? logout : login}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-panel px-3 text-white transition hover:border-white/16 sm:px-4"
        >
          <UserRound size={18} />
          <span className="hidden text-sm font-medium sm:inline">
            {isLoggedIn ? copy.member : copy.login}
          </span>
        </button>
      </div>
    </header>
  );
}
