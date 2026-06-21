import { ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Securite" title="Securite du compte" description="Mot de passe, sessions et futures options 2FA." />
      <section className="premium-card rounded-[22px] p-5">
        <ShieldCheck className="text-positive" size={22} />
        <h2 className="mt-4 text-xl font-semibold text-white">Actions securite</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button className="rounded-xl border border-line px-5 py-4 text-left text-sm font-semibold text-white">Changer le mot de passe</button>
          <button className="rounded-xl border border-line px-5 py-4 text-left text-sm font-semibold text-white">Deconnecter les autres sessions</button>
        </div>
      </section>
    </div>
  );
}
