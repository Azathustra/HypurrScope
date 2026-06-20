"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  LockKeyhole,
  LogOut,
  Menu,
  ShieldCheck,
  Star,
  UserRoundCheck,
  X
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type Plan = {
  name: string;
  price: string;
  cadence: string;
  detail: string;
  perks: string[];
};

const navItems = [
  { label: "Accueil", href: "#accueil" },
  { label: "Abonnements", href: "#abonnements" },
  { label: "Services", href: "#services" },
  { label: "Liens", href: "#liens" },
  { label: "FAQ", href: "#faq" }
];

const benefits = [
  "Acces illimite aux analyses, signaux et publications privees Insider Crypto.",
  "Portefeuilles modeles, suivi de performance et theses d'investissement detaillees.",
  "Formations crypto structurees pour progresser du debutant au research avance.",
  "Alpha Feed, monitoring et recap pour ne pas manquer les rotations importantes."
];

const plans: Plan[] = [
  {
    name: "Mensuel",
    price: "49 EUR",
    cadence: "par mois",
    detail: "Pour suivre le marche chaque semaine.",
    perks: ["Terminal prive", "Alpha Feed", "Formations", "Support communaute"]
  },
  {
    name: "Annuel",
    price: "399 EUR",
    cadence: "par an",
    detail: "Le meilleur choix pour construire un vrai process.",
    perks: ["Tout le mensuel", "Rapports longs", "Portefeuille modele", "Priorite services"]
  },
  {
    name: "Desk",
    price: "990 EUR",
    cadence: "sur demande",
    detail: "Pour profils avances et accompagnement premium.",
    perks: ["Session strategique", "Watchlist privee", "Review portefeuille", "Acces prioritaire"]
  }
];

const services = [
  "Research crypto & macro",
  "Portefeuilles modeles",
  "Formations premium",
  "Monitoring on-chain",
  "Recaps marche",
  "Services investisseurs"
];

const links = ["Twitter", "Telegram", "Discord", "Newsletter"];

const faqs = [
  ["Faut-il etre abonne pour acceder au terminal ?", "Oui. L'abonnement active ton compte, puis tu peux te connecter au contenu prive."],
  ["Le paiement est-il deja branche ?", "Pas encore dans cette maquette. Le recap et le bouton paiement preparent une future integration Stripe."],
  ["Qu'est-ce qu'on trouve dans le contenu prive ?", "Portefeuilles, formations, Alpha Feed, recherche visuelle, donnees crypto et monitoring."]
];

export default function HomePage() {
  const { hasSubscription, isLoggedIn, subscribe, login, logout } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showLoginNotice, setShowLoginNotice] = useState(false);

  const handleLogin = () => {
    if (login()) {
      window.location.href = "/portfolio";
      return;
    }

    setShowLoginNotice(true);
  };

  const handlePaymentSimulation = () => {
    subscribe();
    setSelectedPlan(null);
    setShowLoginNotice(true);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/96 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-8">
          <Link href="#accueil" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-black text-black">
              IC
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.12em]">Insider Crypto</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Crypto research</span>
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-10 xl:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-xs font-black uppercase tracking-[0.34em] text-white transition hover:text-cyan"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-black md:flex">
              EUR
              <ChevronDown size={14} />
            </button>
            {isLoggedIn ? (
              <>
                <Link
                  href="/portfolio"
                  className="hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-black uppercase tracking-[0.18em] text-black md:flex"
                >
                  <LockKeyhole size={14} />
                  Contenu prive
                </Link>
                <button onClick={logout} className="h-10 rounded-full border border-white/15 px-4 text-xs font-bold text-white">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="h-10 rounded-full bg-white px-5 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-white/90"
              >
                Login
              </button>
            )}
            <Bell className="hidden text-white/70 md:block" size={18} />
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white xl:hidden">
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <section
        id="accueil"
        className="relative overflow-hidden bg-[radial-gradient(circle_at_76%_20%,rgba(20,184,166,0.36),transparent_28rem),radial-gradient(circle_at_24%_15%,rgba(124,109,255,0.28),transparent_30rem),linear-gradient(135deg,#080A0F_0%,#171124_46%,#0B2A2A_100%)]"
      >
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.58),rgba(0,0,0,0.12)_58%,rgba(0,0,0,0.38))]" />
        <div className="absolute bottom-16 left-0 right-0 h-44 opacity-35">
          <div className="h-full w-[130%] -translate-x-20 rotate-[-2deg] border-t-[10px] border-teal-300/60" />
          <div className="-mt-24 h-full w-[120%] translate-x-12 rotate-[3deg] border-t-[4px] border-accent/60" />
        </div>

        <div className="relative mx-auto grid min-h-[720px] max-w-[1500px] items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <div className="max-w-4xl">
            <p className="mb-6 text-xs font-black uppercase tracking-[0.36em] text-white/80">Terminal crypto premium</p>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-[1.08] tracking-[0.12em] text-white md:text-6xl">
              La communaute privee pour suivre les marches crypto avec methode.
            </h1>
            <div className="mt-8 max-w-3xl space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex gap-3 text-base font-semibold leading-6 text-white md:text-lg">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-teal-200" size={20} />
                  <p>{benefit}</p>
                </div>
              ))}
            </div>

            <p className="mt-9 max-w-3xl text-xl font-black tracking-[0.2em] text-white">
              Votre acces au terminal, aux formations et a l'alpha feed commence ici.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                onClick={() => document.getElementById("abonnements")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-md bg-black px-8 py-4 text-2xl font-black uppercase tracking-tight text-white shadow-panel transition hover:bg-[#07090D]"
              >
                Devenez membre
              </button>
              {hasSubscription && !isLoggedIn ? (
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-black"
                >
                  <UserRoundCheck size={16} />
                  Se connecter
                </button>
              ) : null}
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-black">
              <span>4.86</span>
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} size={18} className="fill-[#F5B642] text-[#F5B642]" />
              ))}
              <span className="text-black/70">(613 evaluations)</span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[520px]">
            <p className="mb-5 text-center text-2xl font-black uppercase tracking-[0.22em] text-white">Articles recents</p>
            <div className="relative">
              <button className="absolute -left-8 top-1/2 hidden h-14 w-12 -translate-y-1/2 items-center justify-center rounded-md bg-black text-3xl text-white lg:flex">
                ‹
              </button>
              <article className="overflow-hidden rounded-[18px] bg-white text-black shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
                <div className="grid h-56 grid-cols-[1.55fr_0.85fr] bg-[#10141F]">
                  <div className="relative overflow-hidden p-5">
                    <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(20,184,166,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(124,109,255,0.16)_1px,transparent_1px)] [background-size:28px_28px]" />
                    <div className="relative mt-14 h-24 border-l border-b border-white/20">
                      <div className="absolute bottom-6 left-3 h-20 w-[88%] rounded-tl-[80px] border-t-4 border-teal-300" />
                      <div className="absolute bottom-10 left-12 h-16 w-[62%] rotate-[-14deg] border-t-4 border-accent" />
                    </div>
                  </div>
                  <div className="bg-[linear-gradient(180deg,#ECE7FF,#A9D8D2)] p-5">
                    <div className="h-full rounded-2xl bg-black/12" />
                  </div>
                </div>
                <div className="p-5">
                  <span className="rounded-full bg-[#171124] px-3 py-1 text-xs font-bold text-white">Research</span>
                  <p className="mt-4 text-xs font-bold text-black/60">20 juin 2026</p>
                  <h2 className="mt-2 text-xl font-black leading-snug">Points d'entree interessants sur Bitcoin et HYPE</h2>
                  <p className="mt-3 text-sm leading-6 text-black/65">
                    Lecture marche, niveaux cles, flux ETF et signaux protocolaires surveilles par l'equipe.
                  </p>
                </div>
              </article>
              <button className="absolute -right-8 top-1/2 hidden h-14 w-12 -translate-y-1/2 items-center justify-center rounded-md bg-black text-3xl text-white lg:flex">
                ›
              </button>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <span className="h-3 w-3 rounded-full bg-white" />
              <span className="h-3 w-3 rounded-full bg-black" />
              <span className="h-3 w-3 rounded-full bg-black" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-[1300px]">
          <p className="text-center text-2xl font-black tracking-[0.28em] text-white md:text-4xl">
            Accedez a nos analyses sur les marches financiers, les cryptomonnaies et l'alpha on-chain.
          </p>
        </div>
      </section>

      <section id="abonnements" className="border-t border-white/10 bg-[#07090D] px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-[1300px]">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-300">Abonnements</p>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.12em] text-white md:text-5xl">Choisir son acces</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              Choisis une formule, verifie le recapitulatif, puis continue vers le paiement. Le bouton final simule le paiement
              en attendant l'integration Stripe.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-6 transition hover:border-teal-300/45">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-teal-300">{plan.name}</p>
                <p className="mt-5 text-5xl font-black text-white">{plan.price}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">{plan.cadence}</p>
                <p className="mt-3 text-sm leading-6 text-muted">{plan.detail}</p>
                <div className="mt-6 space-y-3">
                  {plan.perks.map((perk) => (
                    <p key={perk} className="flex items-center gap-2 text-sm text-white">
                      <CheckCircle2 size={16} className="text-positive" />
                      {perk}
                    </p>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedPlan(plan)}
                  className="mt-7 w-full rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-white/90"
                >
                  {hasSubscription ? "Changer d'abonnement" : "Choisir l'abonnement"}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="border-t border-white/10 bg-black px-6 py-20 lg:px-10">
        <div className="mx-auto grid max-w-[1300px] gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-300">Services</p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.12em] text-white md:text-5xl">Un desk crypto dans une interface</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {services.map((service) => (
              <div key={service} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-white">
                {service}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="liens" className="border-t border-white/10 bg-[#07090D] px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-[1300px]">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-300">Liens</p>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {links.map((link) => (
              <a key={link} href="#accueil" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 font-black text-white transition hover:border-teal-300/45">
                {link}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-white/10 bg-black px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-[1000px]">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-300">FAQ</p>
          <div className="mt-6 space-y-3">
            {faqs.map(([question, answer]) => (
              <div key={question} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="font-black text-white">{question}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedPlan ? (
        <CheckoutModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onConfirm={handlePaymentSimulation}
        />
      ) : null}

      {showLoginNotice ? (
        <LoginModal
          hasSubscription={hasSubscription}
          onClose={() => setShowLoginNotice(false)}
          onSubscribe={() => {
            setShowLoginNotice(false);
            document.getElementById("abonnements")?.scrollIntoView({ behavior: "smooth" });
          }}
          onLogin={() => {
            if (login()) {
              window.location.href = "/portfolio";
            }
          }}
        />
      ) : null}
    </main>
  );
}

function CheckoutModal({
  plan,
  onClose,
  onConfirm
}: {
  plan: Plan;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[24px] border border-white/10 bg-[#0B0D13] p-6 shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-300">Recapitulatif</p>
            <h2 className="mt-3 text-2xl font-black text-white">Abonnement {plan.name}</h2>
            <p className="mt-2 text-sm text-muted">Verifie ta formule avant de continuer vers le paiement.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white hover:border-white/25">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-muted">Total aujourd'hui</p>
              <p className="mt-1 text-4xl font-black text-white">{plan.price}</p>
            </div>
            <p className="rounded-full bg-teal-300/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-teal-200">
              {plan.cadence}
            </p>
          </div>
          <div className="mt-5 space-y-2">
            {plan.perks.map((perk) => (
              <p key={perk} className="flex items-center gap-2 text-sm text-white">
                <ShieldCheck size={16} className="text-positive" />
                {perk}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-muted">
          Paiement simule pour la maquette. Le prochain branchement logique sera Stripe Checkout, puis creation de compte et
          acces membre automatique.
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onConfirm}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-white/90"
          >
            <CreditCard size={16} />
            Continuer vers le paiement
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/12 px-5 py-3 text-sm font-bold text-white transition hover:border-white/25"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginModal({
  hasSubscription,
  onClose,
  onSubscribe,
  onLogin
}: {
  hasSubscription: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  onLogin: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[24px] border border-white/10 bg-[#0B0D13] p-6 shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-300">
              {hasSubscription ? "Connexion membre" : "Abonnement requis"}
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">
              {hasSubscription ? "Ton abonnement est actif." : "Il faut d'abord choisir un abonnement."}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white hover:border-white/25">
            <X size={18} />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          {hasSubscription
            ? "Clique sur connexion pour entrer dans le terminal prive Insider Crypto."
            : "Le login donne acces au terminal seulement apres abonnement. Choisis une formule, valide le recapitulatif, puis connecte-toi."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {hasSubscription ? (
            <button
              onClick={onLogin}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black"
            >
              <UserRoundCheck size={16} />
              Se connecter
            </button>
          ) : (
            <button
              onClick={onSubscribe}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black"
            >
              <ArrowRight size={16} />
              Voir les abonnements
            </button>
          )}
          <button onClick={onClose} className="rounded-full border border-white/12 px-5 py-3 text-sm font-bold text-white">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
