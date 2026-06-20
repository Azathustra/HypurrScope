import Link from "next/link";
import { Activity, BriefcaseBusiness, CircleDollarSign, Flame, Home, Search } from "lucide-react";

const items = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Crypto", href: "/cryptos", icon: CircleDollarSign },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseBusiness },
  { label: "HYPE", href: "/hyperliquid", icon: Activity },
  { label: "Feed", href: "/feed", icon: Flame },
  { label: "Recherche", href: "/research", icon: Search }
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/92 px-2 py-2 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-6 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-muted transition hover:bg-white/[0.04] hover:text-white"
            >
              <Icon size={17} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
