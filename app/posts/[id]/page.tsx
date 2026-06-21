import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { SectionHeading } from "@/components/saas/section-heading";
import { communityPosts, members } from "@/lib/community-data";

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = communityPosts.find((item) => item.id === id);

  if (!post) {
    notFound();
  }

  const author = members.find((member) => member.username === post.author);

  return (
    <article className="space-y-7">
      <SectionHeading eyebrow={post.room} title={post.title} description={post.excerpt} />
      <div className="premium-card rounded-[22px] p-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <Link href={`/members/${post.author}`} className="text-accent">@{author?.displayName ?? post.author}</Link>
          <span>{new Date(post.publishedAt).toLocaleDateString("fr-FR")}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle size={14} /> {post.comments}</span>
        </div>
        <p className="mt-6 text-base leading-8 text-white">{post.body}</p>
        <div className="mt-8 rounded-2xl border border-line bg-white/[0.025] p-4">
          <p className="text-sm font-semibold text-white">Commentaires</p>
          <p className="mt-2 text-sm leading-6 text-muted">Les commentaires seront branches a Supabase Realtime avec moderation et reactions.</p>
          <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-white">
            <ThumbsUp size={15} />
            Reaction demo
          </button>
        </div>
      </div>
    </article>
  );
}
