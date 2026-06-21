"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Flame,
  GraduationCap,
  LineChart,
  LockKeyhole,
  Mail,
  MessageCircle,
  Send,
  Twitter,
  UsersRound,
  X
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/components/auth-provider";

type InfoModalType = "team" | "contact";

const sections = [
  {
    title: "Donnees",
    items: [
      { label: "Cryptos", href: "/cryptos", icon: CircleDollarSign },
      { label: "TradFi", href: "/tradfi", icon: LineChart }
    ]
  },
  {
    title: "Premium",
    premium: true,
    items: [
      { label: "Our Take", href: "/feed", icon: Flame },
      { label: "Portefeuille", href: "/portfolio", icon: BriefcaseBusiness },
      { label: "Formation", href: "/formation", icon: GraduationCap },
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
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { hasSubscription, isLoggedIn } = useAuth();
  const hasPremiumAccess = hasSubscription && isLoggedIn;

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
                <div className="mb-2 flex items-center justify-between px-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/70">
                    {section.title}
                  </p>
                  {section.premium ? (
                    <span className="rounded-full border border-accent/25 bg-accent/10 p-1 text-accent" title="Premium a debloquer">
                      <LockKeyhole size={12} />
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isLocked = Boolean(section.premium && !hasPremiumAccess);

                  if (isLocked) {
                    return (
                      <button
                        key={item.label}
                        onClick={() => setShowPremiumModal(true)}
                        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm text-muted transition hover:bg-white/[0.04] hover:text-white"
                      >
                        <Icon size={17} />
                        <span>{item.label}</span>
                        <LockKeyhole className="ml-auto text-accent/80" size={14} />
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-muted transition hover:bg-white/[0.04] hover:text-white"
                    >
                      <Icon size={17} />
                      <span>{item.label}</span>
                      {section.premium ? <LockKeyhole className="ml-auto text-positive/80" size={14} /> : null}
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
      {showPremiumModal ? <PremiumAccessModal onClose={() => setShowPremiumModal(false)} /> : null}
    </>
  );
}

function PremiumAccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <ModalPanel>
        <ModalHeader onClose={onClose} />
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
          Cette rubrique est reservee aux membres Premium. Connecte-toi si tu as deja un acces, ou choisis un abonnement pour
          debloquer Our Take, Portefeuille, Formation et Watchlist.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-4 text-sm font-semibold text-ink transition hover:bg-white/90"
          >
            Se connecter
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.04]"
          >
            S'abonner
          </Link>
        </div>
      </ModalPanel>
    </div>
  );
}

function SidebarModal({ type, onClose }: { type: InfoModalType; onClose: () => void }) {
  if (type === "contact") {
    return <ContactModal onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <ModalPanel>
        <ModalHeader onClose={onClose} />
        <div className="mt-3 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
            <UsersRound size={24} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Insider Crypto</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Notre equipe</h2>
          </div>
        </div>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
          Une equipe research orientee marche, allocation, donnees on-chain et pedagogie. Les profils detailles seront branches
          dans une prochaine version.
        </p>
        <button
          onClick={() => {
            onClose();
            setTimeout(() => window.dispatchEvent(new CustomEvent("open-insider-contact")), 0);
          }}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.04]"
        >
          Contacter l'equipe
          <ExternalLink size={15} />
        </button>
      </ModalPanel>
    </div>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const email = "contact@insidercrypto.io";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <ModalPanel>
        <ModalHeader onClose={onClose} />
        <div className="mt-3 flex items-center gap-4">
          <img src="/brand/insider-crypto-logo.png" alt="Insider Crypto" className="h-14 w-14 rounded-full object-cover" />
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Contactez Insider Crypto</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Crypto research terminal</p>
          </div>
        </div>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
          Contactez-nous pour un partenariat, une demande professionnelle ou un accompagnement sur votre projet crypto.
        </p>

        <div className="mt-8 grid grid-cols-[1fr_52px] gap-3">
          <div className="flex h-14 items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 text-accent">
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
            className="flex h-14 items-center justify-center rounded-xl border border-white/10 text-white transition hover:border-white/20 hover:bg-white/[0.04]"
            title="Envoyer un email"
          >
            <Mail size={18} />
          </a>
        </div>

        <a
          href="#"
          className="mt-4 flex h-14 items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.04]"
        >
          <Send size={17} />
          Contacter sur Telegram
        </a>
      </ModalPanel>
    </div>
  );
}

function ModalPanel({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-3xl rounded-[26px] border border-white/10 bg-[#080A0F] p-8 shadow-glow lg:p-10">
      {children}
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
