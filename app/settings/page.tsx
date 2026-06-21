import Link from "next/link";
import { CreditCard, ShieldCheck, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";

const settings = [
  { href: "/settings/profile", title: "Profil", text: "Nom, avatar, bio et preferences publiques.", icon: UserRound },
  { href: "/settings/billing", title: "Billing", text: "Plan, portail Stripe, factures et renouvellement.", icon: CreditCard },
  { href: "/settings/security", title: "Securite", text: "Mot de passe, sessions, 2FA et emails.", icon: ShieldCheck }
];

export default function SettingsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Parametres" title="Parametres du compte" description="Base de navigation pour les reglages membre." />
      <div className="grid gap-4 xl:grid-cols-3">
        {settings.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="premium-card rounded-[20px] p-5 transition hover:border-white/16">
              <Icon className="text-accent" size={22} />
              <h2 className="mt-4 text-xl font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
