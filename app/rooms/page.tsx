import Link from "next/link";
import { MessageCircle, UsersRound } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { DemoDataBadge } from "@/components/demo-data-badge";
import { rooms } from "@/lib/community-data";

export default function RoomsPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow="Rooms" title="Salons membres" description="Espaces de discussion prepares pour Supabase Realtime, moderation et droits d'acces par plan." />
        <DemoDataBadge />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {rooms.map((room) => (
          <Link key={room.slug} href={`/rooms/${room.slug}`} className="premium-card rounded-[20px] p-5 transition hover:border-white/16">
            <div className="flex items-start justify-between gap-4">
              <MessageCircle className="text-accent" size={22} />
              <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{room.access}</span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">{room.name}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{room.description}</p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted">
              <UsersRound size={16} />
              {room.members} membres
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
