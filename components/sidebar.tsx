import Link from "next/link";
import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Disc3,
  FileText,
  Flame,
  Home,
  LineChart,
  MessageCircle,
  Radio,
  Search,
  Shield,
  UsersRound
} from "lucide-react";

const sections = [
  {
    title: "",
    items: [{ label: "Accueil", href: "/", icon: Home }]
  },
  {
    title: "Données",
    items: [
      { label: "Cryptos", href: "/cryptos", icon: CircleDollarSign },
      { label: "TradFi", href: "/research", icon: LineChart },
      { label: "Projects", href: "/research", icon: Boxes },
      { label: "Hyperliquid", href: "/hyperliquid", icon: Activity },
      { label: "Portefeuilles", href: "/portfolio", icon: BriefcaseBusiness }
    ]
  },
  {
    title: "Recherche",
    items: [{ label: "Voir tout", href: "/research", icon: Search }]
  },
  {
    title: "Fil d'actualité",
    items: [
      { label: "Actualités", href: "/feed", icon: Radio },
      { label: "Alpha Feed", href: "/feed", icon: Flame },
      { label: "Recap", href: "/feed", icon: FileText },
      { label: "Monitoring", href: "/feed", icon: BarChart3 }
    ]
  },
  {
    title: "Premium",
    items: [
      { label: "Rapport annuel", href: "/research", icon: BookOpen },
      { label: "Portefeuille modèle", href: "/portfolio", icon: Shield }
    ]
  }
];

const footerItems = [
  { label: "À propos", href: "/research", icon: Compass },
  { label: "Services", href: "/research", icon: Disc3 },
  { label: "Notre équipe", href: "/research", icon: UsersRound },
  { label: "Twitter", href: "/feed", icon: MessageCircle },
  { label: "Telegram", href: "/feed", icon: MessageCircle },
  { label: "Discord", href: "/feed", icon: MessageCircle },
  { label: "Contact", href: "/research", icon: MessageCircle }
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] overflow-y-auto border-r border-line bg-[#07090D]/95 px-4 py-5 backdrop-blur-xl lg:block">
      <Link href="/" className="mb-7 flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black text-ink">
          IC
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">Insider Crypto</span>
          <span className="text-xs text-muted">Research Terminal</span>
        </span>
      </Link>

      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.title || "main"}>
            {section.title ? (
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/70">
                {section.title}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-muted transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="my-6 rounded-[18px] border border-accent/30 bg-accent/10 p-4">
        <p className="text-sm font-semibold leading-snug text-white">
          Les cryptos en 2026
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Découvre notre rapport annuel complet.
        </p>
        <div className="mt-4 grid gap-2">
          <button className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-ink">
            Version physique
          </button>
          <button className="rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-white">
            Version numérique
          </button>
        </div>
      </div>

      <div className="space-y-1 border-t border-line pt-4">
        {footerItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-muted transition hover:bg-white/[0.04] hover:text-white"
            >
              <Icon size={16} />
              {item.label}
              <ChevronRight className="ml-auto opacity-30" size={14} />
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
