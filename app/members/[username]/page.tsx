import { notFound } from "next/navigation";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { communityPosts, members } from "@/lib/community-data";

export default async function MemberProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const member = members.find((item) => item.username === username);

  if (!member) {
    notFound();
  }

  const posts = communityPosts.filter((post) => post.author === member.username);

  return (
    <div className="space-y-7">
      <SectionHeading eyebrow={member.role} title={member.displayName} description={member.bio} />
      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <section className="premium-card rounded-[22px] p-5">
          <ShieldCheck className="text-positive" size={22} />
          <h2 className="mt-4 text-xl font-semibold text-white">Badges</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {member.badges.map((badge) => (
              <span key={badge} className="rounded-full border border-line px-3 py-1 text-sm text-white">{badge}</span>
            ))}
          </div>
        </section>
        <section className="premium-card rounded-[22px] p-5">
          <h2 className="text-xl font-semibold text-white">Contributions recentes</h2>
          <div className="mt-4 divide-y divide-line">
            {posts.map((post) => (
              <div key={post.id} className="flex gap-3 py-4">
                <MessageCircle className="mt-1 text-accent" size={18} />
                <div>
                  <p className="font-semibold text-white">{post.title}</p>
                  <p className="mt-1 text-sm text-muted">{post.excerpt}</p>
                </div>
              </div>
            ))}
            {!posts.length ? <p className="py-4 text-sm text-muted">Aucune contribution demo pour ce profil.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
