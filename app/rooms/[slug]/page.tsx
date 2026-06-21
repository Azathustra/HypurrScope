import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { communityPosts, rooms } from "@/lib/community-data";

export default async function RoomDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = rooms.find((item) => item.slug === slug);

  if (!room) {
    notFound();
  }

  const posts = communityPosts.filter((post) => post.room === room.name);

  return (
    <div className="space-y-7">
      <SectionHeading eyebrow="Room" title={room.name} description={room.description} />
      <div className="premium-card rounded-[22px] p-5">
        <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
          <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{room.access}</span>
          <span className="text-sm text-muted">{room.members} membres</span>
        </div>
        <div className="mt-4 divide-y divide-line">
          {posts.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`} className="flex gap-3 py-4">
              <MessageCircle className="mt-1 shrink-0 text-accent" size={18} />
              <span>
                <span className="block font-semibold text-white">{post.title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted">{post.excerpt}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
