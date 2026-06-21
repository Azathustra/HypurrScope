import { SectionHeading } from "@/components/saas/section-heading";

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Profil" title="Profil membre" description="Formulaire prepare pour Supabase profiles et Storage." />
      <form className="premium-card grid gap-4 rounded-[22px] p-5">
        <input className="rounded-xl border border-line bg-black/20 px-4 py-3 text-white" placeholder="Nom affiche" />
        <textarea className="min-h-32 rounded-xl border border-line bg-black/20 px-4 py-3 text-white" placeholder="Bio courte" />
        <button className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">Enregistrer</button>
      </form>
    </div>
  );
}
