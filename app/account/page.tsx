import Link from "next/link";
import { SectionHeading } from "@/components/saas/section-heading";
import { getViewer } from "@/lib/auth";

export default async function AccountPage() {
  const viewer = await getViewer();

  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Compte" title="Mon compte" description="Profil, plan et accès abonnement." />
      <div className="premium-card rounded-[20px] p-5">
        <p className="text-white">Email : {viewer.email ?? "Mode mock / non connecté"}</p>
        <p className="mt-2 text-muted">Plan : {viewer.plan}</p>
        <Link href="/account/billing" className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink">
          Gérer mon abonnement
        </Link>
      </div>
    </div>
  );
}
