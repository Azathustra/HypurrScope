"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SiteControls } from "@/components/site-controls";
import { useI18n } from "@/components/i18n-provider";

export function PublicNavbar() {
  const { locale } = useI18n();
  const copy =
    locale === "en"
      ? { home: "Home", pricing: "Pricing", research: "Research", community: "Community", methodology: "Methodology", faq: "FAQ", login: "Login", member: "Become a member" }
      : { home: "Accueil", pricing: "Abonnements", research: "Research", community: "Communaute", methodology: "Methode", faq: "FAQ", login: "Login", member: "Devenir membre" };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-black/92 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 lg:px-8">
        <BrandLogo />
        <nav className="hidden items-center gap-7 text-xs font-bold uppercase tracking-[0.18em] text-muted md:flex">
          <Link href="/" className="hover:text-white">{copy.home}</Link>
          <Link href="/pricing" className="hover:text-white">{copy.pricing}</Link>
          <Link href="/research" className="hover:text-white">{copy.research}</Link>
          <Link href="/community" className="hover:text-white">{copy.community}</Link>
          <Link href="/methodologie" className="hover:text-white">{copy.methodology}</Link>
          <Link href="/faq" className="hover:text-white">{copy.faq}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <SiteControls />
          <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white">{copy.login}</Link>
          <Link href="/pricing" className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink sm:inline-flex">
            <LockKeyhole size={15} className="mr-2" /> {copy.member}
          </Link>
        </div>
      </div>
    </header>
  );
}
