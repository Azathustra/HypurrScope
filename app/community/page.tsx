import Link from "next/link";
import { ArrowRight, MessageCircle, UsersRound } from "lucide-react";
import { PublicNavbar } from "@/components/saas/public-navbar";
import { SectionHeading } from "@/components/saas/section-heading";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { rooms, communityPosts, members } from "@/lib/community-data";

export default function CommunityPage() {
  return (
    <>
      <PublicNavbar />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 lg:px-8">
        <SectionHeading
          eyebrow="Communaute"
          title="Un espace membre oriente research"
          description="Rooms thematiques, posts longs, commentaires, profils membres et notifications sont prepares pour Supabase Realtime."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {rooms.slice(0, 3).map((room) => (
            <Link key={room.slug} href={`/rooms/${room.slug}`} className="premium-card rounded-[20px] p-5 transition hover:border-white/16">
              <MessageCircle className="text-accent" size={20} />
              <h2 className="mt-4 text-xl font-semibold text-white">{room.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{room.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{room.access} access</p>
            </Link>
          ))}
        </div>
        <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="premium-card rounded-[22px] p-5">
            <h2 className="text-xl font-semibold text-white">Posts recents</h2>
            <div className="mt-4 divide-y divide-line">
              {communityPosts.slice(0, 4).map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`} className="block py-4">
                  <p className="text-sm font-semibold text-accent">{post.room}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{post.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
          <div className="premium-card rounded-[22px] p-5">
            <UsersRound className="text-positive" size={22} />
            <h2 className="mt-4 text-xl font-semibold text-white">Membres actifs</h2>
            <div className="mt-4 space-y-3">
              {members.slice(0, 5).map((member) => (
                <Link key={member.username} href={`/members/${member.username}`} className="flex items-center justify-between rounded-2xl border border-line bg-white/[0.025] p-3">
                  <span>
                    <span className="block font-semibold text-white">{member.displayName}</span>
                    <span className="text-sm text-muted">@{member.username}</span>
                  </span>
                  <ArrowRight className="text-muted" size={16} />
                </Link>
              ))}
            </div>
          </div>
        </section>
        <DisclaimerBanner />
      </main>
    </>
  );
}
