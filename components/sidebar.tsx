"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Copy,
  ExternalLink,
  GraduationCap,
  Home,
  LineChart,
  Mail,
  MessageCircle,
  Send,
  Twitter,
  UsersRound,
  X
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

type InfoModalType = "team" | "contact";

const sections = [
  {
    title: "",
    items: [{ label: "Accueil", href: "/", icon: Home }]
  },
  {
    title: "Donnees",
    items: [
      { label: "Cryptos", href: "/cryptos", icon: CircleDollarSign },
      { label: "TradFi", href: "/tradfi", icon: LineChart },
      { label: "Portefeuilles", href: "/portfolio", icon: BriefcaseBusiness }
    ]
  },
  {
    title: "Formation",
    items: [{ label: "Formation", href: "/formation", icon: GraduationCap }]
  },
  {
    title: "Our Take",
    items: [
      { label: "Convictions", href: "/feed?view=convictions", icon: MessageCircle },
      { label: "Market notes", href: "/feed?view=notes", icon: LineChart },
      { label: "Watchlist", href: "/feed?view=watchlist", icon: CircleDollarSign }
    ]
  }
];

const footerItems: Array<{ label: string; modal: InfoModalType; icon: typeof UsersRound }> = [
  { label: "Notre equipe", modal: "team", icon: UsersRound },
  { label: "Contact", modal: "contact", icon: MessageCircle }
];

const socialLinks = [
  { label: "Twitter", href: "#", icon: Twitter },
  { label: "Telegram", href: "#", icon: Send },
  { label: "Discord", href: "#", icon: MessageCircle }
];

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
        <div className="mb-7 px-2">
          <BrandLogo />
        </div>

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

        <div className="mt-5 flex items-center gap-2 px-2">
          {socialLinks.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                aria-label={item.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:border-white/20 hover:text-white"
              >
                <Icon size={16} />
              </a>
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[22px] border border-white/10 bg-[#080A0F] p-6 shadow-glow">
        <ModalHeader onClose={onClose} />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Notre equipe</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Une equipe research orientee marche, allocation, donnees on-chain et pedagogie. Les profils detailles seront branches
          dans une prochaine version.
        </p>
        <button
          onClick={() => {
            onClose();
            setTimeout(() => window.dispatchEvent(new CustomEvent("open-insider-contact")), 0);
          }}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.04]"
        >
          Contacter l'equipe
          <ExternalLink size={15} />
        </button>
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
          <img src="/brand/insider-crypto-logo.png" alt="Insider Crypto" className="h-11 w-11 rounded-full object-cover" />
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
          href="#"
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
