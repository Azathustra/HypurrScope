import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { DemoDataBadge } from "@/components/demo-data-badge";
import { members } from "@/lib/community-data";

export default function MembersPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow="Membres" title="Annuaire membres" description="Profils, roles, badges et contributions pour la communaute." />
        <DemoDataBadge />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {members.map((member) => (
          <Link key={member.username} href={`/members/${member.username}`} className="premium-card rounded-[20px] p-5 transition hover:border-white/16">
            <UserRound className="text-accent" size={22} />
            <h2 className="mt-4 text-xl font-semibold text-white">{member.displayName}</h2>
            <p className="mt-1 text-sm text-muted">@{member.username}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{member.bio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {member.badges.map((badge) => (
                <span key={badge} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-white">{badge}</span>
              ))}
            </div>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              Profil <ArrowRight size={15} />
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
