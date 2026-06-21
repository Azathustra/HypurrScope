"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
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
import { BrandLogo } from "@/components/brand-logo";
import { SiteControls } from "@/components/site-controls";
import { useI18n, type Locale } from "@/components/i18n-provider";

type Plan = {
  name: string;
  price: string;
  cadence: string;
  detail: string;
  perks: string[];
};

const landingCopy: Record<Locale, {
  navItems: Array<{ label: string; href: string }>;
  benefits: string[];
  plans: Plan[];
  services: string[];
  links: string[];
  faqs: string[][];
  heroKicker: string;
  heroTitle: string;
  heroLine: string;
  heroCta: string;
  loginCta: string;
  privateContent: string;
  memberPanelKicker: string;
  memberPanelTitle: string;
  memberSteps: string[];
  memberPanelNote: string;
  subscriptionsCta: string;
  proofLine: string;
  pricingKicker: string;
  pricingTitle: string;
  pricingIntro: string;
  subscribePlan: string;
  servicesKicker: string;
  servicesTitle: string;
  linksKicker: string;
  checkoutTitle: string;
  checkoutHelp: string;
  checkoutTotal: string;
  checkoutNote: string;
  checkoutPay: string;
  cancel: string;
  close: string;
  loginActiveKicker: string;
  loginLockedKicker: string;
  loginActiveTitle: string;
  loginLockedTitle: string;
  loginActiveText: string;
  loginLockedText: string;
}> = {
  fr: {
    navItems: [
      { label: "Accueil", href: "#accueil" },
      { label: "Abonnements", href: "#abonnements" },
      { label: "Services", href: "#services" },
      { label: "Liens", href: "#liens" },
      { label: "FAQ", href: "#faq" }
    ],
    benefits: [
      "Acces illimite aux analyses, signaux et publications privees Insider Crypto.",
      "Portefeuilles modeles, suivi de performance et theses d'investissement detaillees.",
      "Formations crypto structurees pour progresser du debutant au research avance.",
      "Alpha Feed, monitoring et recap pour ne pas manquer les rotations importantes."
    ],
    plans: [
      { name: "Theses", price: "49 EUR", cadence: "par mois", detail: "Acces a nos theses d'investissement.", perks: ["Theses d'investissement", "Notes research", "Our Take", "Archives membres"] },
      { name: "Portefeuille & alertes", price: "99 EUR", cadence: "par mois", detail: "Acces au portefeuille modele et aux alertes.", perks: ["Tout l'acces theses", "Portefeuille modele", "Alertes marche", "Suivi des mouvements"] },
      { name: "Annuel", price: "944 EUR", cadence: "par an", detail: "La meme offre portefeuille & alertes avec 20% de reduction annuelle.", perks: ["Portefeuille & alertes", "12 mois d'acces", "20% de reduction", "Priorite sur les mises a jour"] }
    ],
    services: ["Research crypto & macro", "Portefeuilles modeles", "Formations premium", "Monitoring on-chain", "Recaps marche", "Services investisseurs"],
    links: ["Twitter", "Telegram", "Discord", "Newsletter"],
    faqs: [
      ["Faut-il etre abonne pour acceder au terminal ?", "Oui. L'abonnement active ton compte, puis tu peux te connecter au contenu prive."],
      ["Le paiement est-il deja branche ?", "Pas encore dans cette maquette. Le recap et le bouton paiement preparent une future integration Stripe."],
      ["Qu'est-ce qu'on trouve dans le contenu prive ?", "Portefeuilles, formations, Alpha Feed, recherche visuelle, donnees crypto et monitoring."]
    ],
    heroKicker: "Terminal crypto premium",
    heroTitle: "La communaute privee pour suivre les marches crypto avec methode.",
    heroLine: "Votre acces au terminal, aux formations et a l'alpha feed commence ici.",
    heroCta: "Devenez membre",
    loginCta: "Se connecter",
    privateContent: "Contenu prive",
    memberPanelKicker: "Acces membre",
    memberPanelTitle: "Abonnez-vous, connectez-vous, entrez dans le terminal.",
    memberSteps: ["Choisir une formule", "Verifier le recapitulatif", "Debloquer le terminal prive"],
    memberPanelNote: "Les portefeuilles, formations, signaux et outils research sont accessibles uniquement apres abonnement.",
    subscriptionsCta: "Voir les abonnements",
    proofLine: "Accedez a nos analyses sur les marches financiers, les cryptomonnaies et l'alpha on-chain.",
    pricingKicker: "Abonnements",
    pricingTitle: "Choisir son acces",
    pricingIntro: "Choisis une formule, verifie le recapitulatif, puis continue vers le paiement. Le bouton final simule le paiement en attendant l'integration Stripe.",
    subscribePlan: "S'abonner",
    servicesKicker: "Services",
    servicesTitle: "Un desk crypto dans une interface",
    linksKicker: "Liens",
    checkoutTitle: "Abonnement",
    checkoutHelp: "Verifie ta formule avant de continuer vers le paiement.",
    checkoutTotal: "Total aujourd'hui",
    checkoutNote: "Paiement simule pour la maquette. Le prochain branchement logique sera Stripe Checkout, puis creation de compte et acces membre automatique.",
    checkoutPay: "Continuer vers le paiement",
    cancel: "Annuler",
    close: "Fermer",
    loginActiveKicker: "Connexion membre",
    loginLockedKicker: "Abonnement requis",
    loginActiveTitle: "Ton abonnement est actif.",
    loginLockedTitle: "Il faut d'abord choisir un abonnement.",
    loginActiveText: "Clique sur connexion pour entrer dans le terminal prive Insider Crypto.",
    loginLockedText: "Le login donne acces au terminal seulement apres abonnement. Choisis une formule, valide le recapitulatif, puis connecte-toi."
  },
  en: {
    navItems: [
      { label: "Home", href: "#accueil" },
      { label: "Pricing", href: "#abonnements" },
      { label: "Services", href: "#services" },
      { label: "Links", href: "#liens" },
      { label: "FAQ", href: "#faq" }
    ],
    benefits: [
      "Unlimited access to Insider Crypto private analysis, signals and publications.",
      "Model portfolios, performance tracking and detailed investment theses.",
      "Structured crypto training from beginner level to advanced research.",
      "Alpha Feed, monitoring and recaps so you do not miss important rotations."
    ],
    plans: [
      { name: "Theses", price: "49 EUR", cadence: "per month", detail: "Access to our investment theses.", perks: ["Investment theses", "Research notes", "Our Take", "Member archives"] },
      { name: "Portfolio & alerts", price: "99 EUR", cadence: "per month", detail: "Access to the model portfolio and market alerts.", perks: ["Everything in theses", "Model portfolio", "Market alerts", "Move tracking"] },
      { name: "Yearly", price: "944 EUR", cadence: "per year", detail: "The same portfolio & alerts plan with a 20% yearly discount.", perks: ["Portfolio & alerts", "12 months access", "20% discount", "Priority updates"] }
    ],
    services: ["Crypto & macro research", "Model portfolios", "Premium training", "On-chain monitoring", "Market recaps", "Investor services"],
    links: ["Twitter", "Telegram", "Discord", "Newsletter"],
    faqs: [
      ["Do I need a subscription to access the terminal?", "Yes. Your subscription activates the account, then you can log in to the private content."],
      ["Is payment already connected?", "Not yet in this mockup. The summary and payment button prepare a future Stripe integration."],
      ["What is inside the private content?", "Portfolios, training, Alpha Feed, visual research, crypto data and monitoring."]
    ],
    heroKicker: "Premium crypto terminal",
    heroTitle: "The private community for tracking crypto markets with method.",
    heroLine: "Your access to the terminal, training and Alpha Feed starts here.",
    heroCta: "Become a member",
    loginCta: "Log in",
    privateContent: "Private content",
    memberPanelKicker: "Member access",
    memberPanelTitle: "Subscribe, log in, enter the terminal.",
    memberSteps: ["Choose a plan", "Check the summary", "Unlock the private terminal"],
    memberPanelNote: "Portfolios, training, signals and research tools are available only after subscription.",
    subscriptionsCta: "View pricing",
    proofLine: "Access our analysis on financial markets, cryptocurrencies and on-chain alpha.",
    pricingKicker: "Pricing",
    pricingTitle: "Choose your access",
    pricingIntro: "Choose a plan, check the summary, then continue to payment. The final button simulates payment until Stripe is connected.",
    subscribePlan: "Subscribe",
    servicesKicker: "Services",
    servicesTitle: "A crypto desk in one interface",
    linksKicker: "Links",
    checkoutTitle: "Subscription",
    checkoutHelp: "Check your plan before continuing to payment.",
    checkoutTotal: "Total today",
    checkoutNote: "Payment is simulated for the mockup. The next logical step is Stripe Checkout, then account creation and automatic member access.",
    checkoutPay: "Continue to payment",
    cancel: "Cancel",
    close: "Close",
    loginActiveKicker: "Member login",
    loginLockedKicker: "Subscription required",
    loginActiveTitle: "Your subscription is active.",
    loginLockedTitle: "You need to choose a plan first.",
    loginActiveText: "Click login to enter the private Insider Crypto terminal.",
    loginLockedText: "Login unlocks the terminal only after subscription. Choose a plan, validate the summary, then log in."
  }
};

export default function HomePage() {
  const { hasSubscription, isLoggedIn, subscribe, login, logout } = useAuth();
  const { locale } = useI18n();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showLoginNotice, setShowLoginNotice] = useState(false);
  const copy = landingCopy[locale];

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
          <BrandLogo />

          <nav className="hidden flex-1 items-center justify-center gap-10 xl:flex">
            {copy.navItems.map((item) => (
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
            <SiteControls />
            {isLoggedIn ? (
              <>
                <Link
                  href="/portfolio"
                  className="hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-black uppercase tracking-[0.18em] text-black md:flex"
                >
                  <LockKeyhole size={14} />
                  {copy.privateContent}
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
                {copy.loginCta}
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
            <p className="mb-6 text-xs font-black uppercase tracking-[0.36em] text-white/80">{copy.heroKicker}</p>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-[1.08] tracking-[0.12em] text-white md:text-6xl">
              {copy.heroTitle}
            </h1>
            <div className="mt-8 max-w-3xl space-y-3">
              {copy.benefits.map((benefit) => (
                <div key={benefit} className="flex gap-3 text-base font-semibold leading-6 text-white md:text-lg">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-teal-200" size={20} />
                  <p>{benefit}</p>
                </div>
              ))}
            </div>

            <p className="mt-9 max-w-3xl text-xl font-black tracking-[0.2em] text-white">
              {copy.heroLine}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                onClick={() => document.getElementById("abonnements")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-md bg-black px-8 py-4 text-2xl font-black uppercase tracking-tight text-white shadow-panel transition hover:bg-[#07090D]"
              >
                {copy.heroCta}
              </button>
              {hasSubscription && !isLoggedIn ? (
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-black"
                >
                  <UserRoundCheck size={16} />
                  {copy.loginCta}
                </button>
              ) : null}
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-black">
              <span>4.86</span>
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} size={18} className="fill-[#F5B642] text-[#F5B642]" />
              ))}
              <span className="text-black/70">(613 reviews)</span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[520px]">
            <div className="rounded-[24px] border border-white/12 bg-black/36 p-6 shadow-glow backdrop-blur-md">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-200">{copy.memberPanelKicker}</p>
              <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-[0.08em] text-white">
                {copy.memberPanelTitle}
              </h2>
              <div className="mt-6 space-y-3">
                {copy.memberSteps.map((label, index) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-black">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-white">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-teal-300/20 bg-teal-300/10 p-4">
                <p className="text-sm font-semibold leading-6 text-teal-100">
                  {copy.memberPanelNote}
                </p>
              </div>
              <button
                onClick={() => document.getElementById("abonnements")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-white/90"
              >
                {copy.subscriptionsCta}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-[1300px]">
          <p className="text-center text-2xl font-black tracking-[0.28em] text-white md:text-4xl">
            {copy.proofLine}
          </p>
        </div>
      </section>

      <section id="abonnements" className="border-t border-white/10 bg-[#07090D] px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-[1300px]">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-300">{copy.pricingKicker}</p>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.12em] text-white md:text-5xl">{copy.pricingTitle}</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              {copy.pricingIntro}
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {copy.plans.map((plan) => (
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
                  {copy.subscribePlan}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="border-t border-white/10 bg-black px-6 py-20 lg:px-10">
        <div className="mx-auto grid max-w-[1300px] gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-300">{copy.servicesKicker}</p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.12em] text-white md:text-5xl">{copy.servicesTitle}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {copy.services.map((service) => (
              <div key={service} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-white">
                {service}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="liens" className="border-t border-white/10 bg-[#07090D] px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-[1300px]">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-300">{copy.linksKicker}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {copy.links.map((link) => (
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
            {copy.faqs.map(([question, answer]) => (
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
          copy={copy}
          onClose={() => setSelectedPlan(null)}
          onConfirm={handlePaymentSimulation}
        />
      ) : null}

      {showLoginNotice ? (
        <LoginModal
          hasSubscription={hasSubscription}
          copy={copy}
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
  copy,
  onClose,
  onConfirm
}: {
  plan: Plan;
  copy: (typeof landingCopy)["fr"];
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[24px] border border-white/10 bg-[#0B0D13] p-6 shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-300">Recapitulatif</p>
            <h2 className="mt-3 text-2xl font-black text-white">{copy.checkoutTitle} {plan.name}</h2>
            <p className="mt-2 text-sm text-muted">{copy.checkoutHelp}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white hover:border-white/25">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-muted">{copy.checkoutTotal}</p>
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
          {copy.checkoutNote}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onConfirm}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-white/90"
          >
            <CreditCard size={16} />
            {copy.checkoutPay}
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/12 px-5 py-3 text-sm font-bold text-white transition hover:border-white/25"
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginModal({
  hasSubscription,
  copy,
  onClose,
  onSubscribe,
  onLogin
}: {
  hasSubscription: boolean;
  copy: (typeof landingCopy)["fr"];
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
              {hasSubscription ? copy.loginActiveKicker : copy.loginLockedKicker}
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">
              {hasSubscription ? copy.loginActiveTitle : copy.loginLockedTitle}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white hover:border-white/25">
            <X size={18} />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          {hasSubscription ? copy.loginActiveText : copy.loginLockedText}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {hasSubscription ? (
            <button
              onClick={onLogin}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black"
            >
              <UserRoundCheck size={16} />
              {copy.loginCta}
            </button>
          ) : (
            <button
              onClick={onSubscribe}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black"
            >
              <ArrowRight size={16} />
              {copy.subscriptionsCta}
            </button>
          )}
          <button onClick={onClose} className="rounded-full border border-white/12 px-5 py-3 text-sm font-bold text-white">
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  );
}
