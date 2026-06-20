"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Copy,
  Disc3,
  ExternalLink,
  FileText,
  Flame,
  GraduationCap,
  Home,
  LineChart,
  Mail,
  MessageCircle,
  Radio,
  Search,
  Send,
  UsersRound,
  X
} from "lucide-react";

type InfoModalType = "about" | "services" | "team" | "twitter" | "telegram" | "discord" | "contact";

const sections = [
  {
    title: "",
    items: [{ label: "Accueil", href: "/", icon: Home }]
  },
  {
    title: "Données",
    items: [
      { label: "Cryptos", href: "/cryptos", icon: CircleDollarSign },
      { label: "TradFi", href: "/research?category=tradfi", icon: LineChart },
      { label: "Portefeuilles", href: "/portfolio", icon: BriefcaseBusiness }
    ]
  },
  {
    title: "Recherche",
    items: [
      { label: "Voir tout", href: "/research", icon: Search },
      { label: "Formation", href: "/formation", icon: GraduationCap }
    ]
  },
  {
    title: "Fil d'actualité",
    items: [
      { label: "Actualités", href: "/feed?view=news", icon: Radio },
      { label: "Alpha Feed", href: "/feed?view=alpha", icon: Flame },
      { label: "Recap", href: "/feed?view=recap", icon: FileText },
      { label: "Monitoring", href: "/feed?view=monitoring", icon: BarChart3 }
    ]
  }
];

const footerItems: Array<{ label: string; modal: InfoModalType; icon: typeof Compass }> = [
  { label: "À propos", modal: "about", icon: Compass },
  { label: "Services", modal: "services", icon: Disc3 },
  { label: "Notre équipe", modal: "team", icon: UsersRound },
  { label: "Twitter", modal: "twitter", icon: MessageCircle },
  { label: "Telegram", modal: "telegram", icon: MessageCircle },
  { label: "Discord", modal: "discord", icon: MessageCircle },
  { label: "Contact", modal: "contact", icon: MessageCircle }
];

const modalContent: Record<
  Exclude<InfoModalType, "contact">,
  { title: string; description: string; actions: Array<{ label: string; href: string }> }
> = {
  about: {
    title: "À propos d'Insider Crypto",
    description:
      "Insider Crypto est un terminal privé pour suivre portefeuilles, formations, signaux et recherche crypto avec une approche structurée.",
    actions: [{ label: "Voir la recherche", href: "/research" }]
  },
  services: {
    title: "Services Insider Crypto",
    description:
      "Research crypto & macro, portefeuilles modèles, formations premium, monitoring on-chain et accompagnement investisseurs.",
    actions: [
      { label: "Voir les formations", href: "/formation" },
      { label: "Voir les portefeuilles", href: "/portfolio" }
    ]
  },
  team: {
    title: "Notre équipe",
    description:
      "Une équipe research orientée marché, allocation, données on-chain et pédagogie. Les profils détaillés seront branchés dans une prochaine version.",
    actions: [{ label: "Contacter l'équipe", href: "#contact" }]
  },
  twitter: {
    title: "Twitter Insider Crypto",
    description: "Suivez les publications courtes, alertes et commentaires marché d'Insider Crypto.",
    actions: [{ label: "Ouvrir Twitter", href: "https://twitter.com" }]
  },
  telegram: {
    title: "Telegram Insider Crypto",
    description: "Rejoignez le canal Telegram pour les annonces, alertes et suivis rapides.",
    actions: [{ label: "Ouvrir Telegram", href: "https://t.me" }]
  },
  discord: {
    title: "Discord Insider Crypto",
    description: "Accédez à l'espace communauté, aux discussions privées et aux salons de suivi.",
    actions: [{ label: "Ouvrir Discord", href: "https://discord.com" }]
  }
};

export function Sidebar() {
  const [activeModal, setActiveModal] = useState<InfoModalType | null>(null);

  useEffect(() => {
    const openContact = () => setActiveModal("contact");

    window.addEventListener("open-insider-contact", openContact);
    return () => window.removeEventListener("open-insider-contact", openContact);
  }, []);

  return (
    <>
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

        <div className="mt-6 space-y-1 border-t border-line pt-4">
          {footerItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => setActiveModal(item.modal)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm text-muted transition hover:bg-white/[0.04] hover:text-white"
              >
                <Icon size={16} />
                {item.label}
                <ChevronRight className="ml-auto opacity-30" size={14} />
              </button>
            );
          })}
        </div>
      </aside>

      {activeModal ? <SidebarModal type={activeModal} onClose={() => setActiveModal(null)} /> : null}
    </>
  );
}

function SidebarModal({ type, onClose }: { type: InfoModalType; onClose: () => void }) {
  if (type === "contact") {
    return <ContactModal onClose={onClose} />;
  }

  const content = modalContent[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[22px] border border-white/10 bg-[#080A0F] p-6 shadow-glow">
        <ModalHeader onClose={onClose} />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{content.title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted">{content.description}</p>
        <div className="mt-6 grid gap-3">
          {content.actions.map((action) => {
            const isExternal = action.href.startsWith("http");
            return (
              <Link
                key={action.label}
                href={action.href === "#contact" ? "#" : action.href}
                target={isExternal ? "_blank" : undefined}
                onClick={(event) => {
                  if (action.href === "#contact") {
                    event.preventDefault();
                    onClose();
                    setTimeout(() => window.dispatchEvent(new CustomEvent("open-insider-contact")), 0);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.04]"
              >
                {action.label}
                {isExternal ? <ExternalLink size={15} /> : <ChevronRight size={15} />}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const email = "contact@insidercrypto.io";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[22px] border border-white/10 bg-[#080A0F] p-6 shadow-glow">
        <ModalHeader onClose={onClose} />
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-black text-ink">
            IC
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Contactez Insider Crypto</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Crypto research terminal</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-muted">
          Contactez-nous pour un partenariat, une demande professionnelle ou un accompagnement sur votre projet crypto.
        </p>

        <div className="mt-6 grid grid-cols-[1fr_44px] gap-3">
          <div className="flex h-12 items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 text-accent">
            <span className="truncate">{email}</span>
            <button
              onClick={() => navigator.clipboard.writeText(email)}
              className="ml-3 rounded-lg p-1 text-white/75 transition hover:bg-white/10 hover:text-white"
              title="Copier l'adresse email"
            >
              <Copy size={17} />
            </button>
          </div>
          <a
            href={`mailto:${email}`}
            className="flex h-12 items-center justify-center rounded-xl border border-white/10 text-white transition hover:border-white/20 hover:bg-white/[0.04]"
            title="Envoyer un email"
          >
            <Mail size={18} />
          </a>
        </div>

        <a
          href="https://t.me"
          target="_blank"
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.04]"
        >
          <Send size={17} />
          Contacter sur Telegram
        </a>
      </div>
    </div>
  );
}

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onClose}
        className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white"
      >
        <X size={17} />
      </button>
    </div>
  );
}
